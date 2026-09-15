let bills = [];
let editingRow = null;
let bankOpeningManuallyEdited = false;


/* =========================================================
   ELEMENTS
   ========================================================= */

const form =
  document.getElementById("billForm");

const billMonth =
  document.getElementById("billMonth");

const billYear =
  document.getElementById("billYear");

const billNumber =
  document.getElementById("billNumber");

const billAmount =
  document.getElementById("billAmount");

const solarGeneration =
  document.getElementById("solarGeneration");

const solarExported =
  document.getElementById("solarExported");

const ksebImport =
  document.getElementById("ksebImport");

const bankBalance =
  document.getElementById("bankBalance");

const bankOpeningInput =
  document.getElementById(
    "bankOpeningInput"
  );

const solarUsed =
  document.getElementById(
    "solarUsed"
  );

const totalUsage =
  document.getElementById(
    "totalUsage"
  );

const bankOpening =
  document.getElementById(
    "bankOpening"
  );

const bankChange =
  document.getElementById(
    "bankChange"
  );

const existingBills =
  document.getElementById(
    "existingBills"
  );

const message =
  document.getElementById(
    "message"
  );


/* =========================================================
   TOKEN
   ========================================================= */

function getToken() {

  return localStorage.getItem(
    "kseb_admin_token"
  );
}


/* =========================================================
   API REQUEST
   ========================================================= */

async function apiRequest(data) {

  const response =
    await fetch(
      GOOGLE_SCRIPT_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify(data)
      }
    );


  const result =
    await response.json();


  return result;
}


/* =========================================================
   AUTH CHECK
   ========================================================= */

async function requireLogin() {

  const token =
    getToken();


  if (!token) {

    window.location.href =
      "index.html";

    return false;
  }


  try {

    const result =
      await apiRequest({

        action: "authCheck",

        token: token

      });


    if (!result.success) {

      localStorage.removeItem(
        "kseb_admin_token"
      );

      window.location.href =
        "index.html";

      return false;
    }


    return true;


  } catch (error) {

    console.error(error);

    message.textContent =
      "Unable to verify login.";

    return false;
  }
}


/* =========================================================
   DASHBOARD
   ========================================================= */

document
  .getElementById("dashboardBtn")
  .addEventListener(
    "click",
    () => {

      window.location.href =
        "index.html";
    }
  );


/* =========================================================
   SIGN OUT
   ========================================================= */

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        "kseb_admin_token"
      );

      window.location.href =
        "index.html";
    }
  );


/* =========================================================
   CLEAR
   ========================================================= */

document
  .getElementById("clearBtn")
  .addEventListener(
    "click",
    clearForm
  );


/* =========================================================
   FORM CALCULATIONS
   ========================================================= */

[
  solarGeneration,
  solarExported,
  ksebImport,
  bankBalance,
  billMonth,
  billYear
]
.forEach(element => {

  element.addEventListener(
    "input",
    updateCalculations
  );

  element.addEventListener(
    "change",
    updateCalculations
  );
});


bankOpeningInput.addEventListener(
  "input",
  () => {

    bankOpeningManuallyEdited =
      true;

    updateCalculations();
  }
);


bankOpeningInput.addEventListener(
  "change",
  () => {

    bankOpeningManuallyEdited =
      true;

    updateCalculations();
  }
);


/* =========================================================
   FORM DATE
   ========================================================= */

function getFormDate() {

  if (
    !billYear.value ||
    !billMonth.value
  ) {
    return null;
  }


  return (
    billYear.value +
    "-" +
    billMonth.value +
    "-01"
  );
}


/* =========================================================
   NORMALIZE DATE
   ========================================================= */

function normalizeDate(value) {

  return String(value || "")
    .substring(0, 10);
}


/* =========================================================
   MONTH KEY
   ========================================================= */

function monthKey(value) {

  const date =
    normalizeDate(value);


  if (!date) return 0;


  const parts =
    date.split("-");


  if (parts.length < 2) {
    return 0;
  }


  return (
    Number(parts[0]) * 100 +
    Number(parts[1])
  );
}


/* =========================================================
   PREVIOUS BILL
   ========================================================= */

function getPreviousBill(
  date,
  ignoreRow = null
) {

  const target =
    monthKey(date);


  return bills

    .filter(bill => {

      if (
        ignoreRow !== null &&
        Number(bill._row) ===
          Number(ignoreRow)
      ) {
        return false;
      }


      return (
        monthKey(
          bill.bill_month
        ) < target
      );
    })

    .sort(
      (a, b) =>
        monthKey(b.bill_month) -
        monthKey(a.bill_month)
    )[0] || null;
}


/* =========================================================
   CALCULATIONS
   ========================================================= */

function updateCalculations() {

  const generation =
    Number(
      solarGeneration.value
    ) || 0;


  const exported =
    Number(
      solarExported.value
    ) || 0;


  const imported =
    Number(
      ksebImport.value
    ) || 0;


  const closing =
    Number(
      bankBalance.value
    ) || 0;


  const used =
    generation - exported;


  solarUsed.textContent =
    used;


  totalUsage.textContent =
    used + imported;


  const date =
    getFormDate();


  const previous =
    date
      ? getPreviousBill(
          date,
          editingRow
        )
      : null;


  /*
   * Automatically fill opening balance
   * only when adding a new bill and the
   * user hasn't manually changed it.
   */

  if (
    !editingRow &&
    !bankOpeningManuallyEdited
  ) {

    bankOpeningInput.value =
      previous
        ? Number(
            previous.bank_balance
          )
        : 0;
  }


  const opening =
    Number(
      bankOpeningInput.value
    ) || 0;


  bankOpening.textContent =
    opening;


  bankChange.textContent =
    closing - opening;
}


/* =========================================================
   LOAD BILLS
   ========================================================= */

async function loadBills() {

  try {

    message.textContent =
      "Loading bills...";


    const response =
      await fetch(
        GOOGLE_SCRIPT_URL
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );
    }


    const data =
      await response.json();


    if (!Array.isArray(data)) {

      throw new Error(
        "Invalid bill data."
      );
    }


    bills =
      data
        .filter(
          bill =>
            bill &&
            bill.bill_month
        )
        .sort(
          (a, b) =>
            monthKey(
              b.bill_month
            ) -
            monthKey(
              a.bill_month
            )
        );


    renderExistingBills();

    updateCalculations();

    message.textContent = "";


  } catch (error) {

    console.error(error);

    message.textContent =
      "Unable to load bills.";
  }
}


/* =========================================================
   RENDER EXISTING BILLS
   ========================================================= */

function renderExistingBills() {

  existingBills.innerHTML =
    bills
      .map(bill => {

        return `
          <div class="bill-row">

            <div>

              <strong>
                ${formatMonth(
                  bill.bill_month
                )}
              </strong>

              <span>
                Bill ${bill.bill_number || ""}
                · ₹${Number(
                  bill.bill_amount || 0
                ).toLocaleString("en-IN")}
              </span>

            </div>

            <button onclick="editBill(${bill._row})">
  Edit
</button>

<button onclick="deleteBill(${bill._row})">
  Delete
</button>

          </div>
        `;

      })
      .join("");
}


/* =========================================================
   FORMAT MONTH
   ========================================================= */

function formatMonth(value) {

  const dateString =
    normalizeDate(value);


  return new Date(
    dateString +
    "T00:00:00"
  ).toLocaleDateString(
    "en-IN",
    {
      month: "short",
      year: "numeric"
    }
  );
}


/* =========================================================
   EDIT BILL
   ========================================================= */

window.editBill =
  function(row) {

    const bill =
      bills.find(
        b =>
          Number(b._row) ===
          Number(row)
      );


    if (!bill) return;


    editingRow =
      Number(row);


    /*
     * When editing, keep the existing
     * opening balance.
     */

    bankOpeningManuallyEdited =
      true;


    const date =
      normalizeDate(
        bill.bill_month
      );


    billMonth.value =
      date.substring(5, 7);


    billYear.value =
      date.substring(0, 4);


    billNumber.value =
      bill.bill_number || "";


    billAmount.value =
      bill.bill_amount || 0;


    solarGeneration.value =
      bill.solar_generation || 0;


    solarExported.value =
      bill.solar_exported || 0;


    ksebImport.value =
      bill.kseb_import || 0;


    bankOpeningInput.value =
      bill.bank_opening || 0;


    bankBalance.value =
      bill.bank_balance || 0;


    updateCalculations();


    message.textContent =
      "Editing existing bill.";


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


/* =========================================================
   SAVE BILL
   ========================================================= */

form.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    message.textContent =
      "Saving...";


    const date =
      getFormDate();


    if (!date) {

      message.textContent =
        "Please select month and year.";

      return;
    }


    const generation =
      Number(
        solarGeneration.value
      );


    const exported =
      Number(
        solarExported.value
      );


    const imported =
      Number(
        ksebImport.value
      );


    const opening =
      Number(
        bankOpeningInput.value
      );


    const closing =
      Number(
        bankBalance.value
      );


    const record = {

      bill_month:
        date,

      bill_number:
        billNumber.value.trim(),

      usage:
        (generation - exported) +
        imported,

      bill_amount:
        Number(
          billAmount.value
        ),

      solar_generation:
        generation,

      solar_exported:
        exported,

      kseb_import:
        imported,

      bank_opening:
        opening,

      bank_balance:
        closing
    };


    try {

      let result;


      /* =================================================
         EDIT
         ================================================= */

      if (editingRow) {

        result =
          await apiRequest({

            action: "edit",

            token:
              getToken(),

            row:
              editingRow,

            ...record
          });

      }


      /* =================================================
         ADD
         ================================================= */

      else {

        result =
          await apiRequest({

            action: "add",

            token:
              getToken(),

            ...record
          });
      }


      /* =================================================
         CHECK RESULT
         ================================================= */

      if (!result.success) {

        message.textContent =
          result.message ||
          "Save failed.";

        return;
      }


      message.textContent =
        "Bill saved successfully.";


      alert(
        "Bill saved successfully!"
      );


      await loadBills();


      clearForm();


    } catch (error) {

      console.error(error);

      message.textContent =
        "Unable to save bill.";
    }

  }
);


/* =========================================================
   CLEAR FORM
   ========================================================= */

function clearForm() {

  editingRow = null;

  bankOpeningManuallyEdited =
    false;


  form.reset();


  const today =
    new Date();


  billYear.value =
    today.getFullYear();


  billMonth.value =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");


  bankOpeningInput.value =
    0;


  updateCalculations();


  message.textContent = "";
}


/* =========================================================
   INITIALIZE
   ========================================================= */

(async function init() {

  if (
    await requireLogin()
  ) {

    const today =
      new Date();


    billYear.value =
      today.getFullYear();


    billMonth.value =
      String(
        today.getMonth() + 1
      ).padStart(2, "0");


    bankOpeningInput.value =
      0;


    await loadBills();
  }

})();
