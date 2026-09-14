let bills = [];

const tableBody =
  document.getElementById("billTableBody");

const yearFilter =
  document.getElementById("yearFilter");

const currentBankBalance =
  document.getElementById("currentBankBalance");

const manageBtn =
  document.getElementById("manageBtn");


/* =========================================================
   FORMAT MONTH
   ========================================================= */

function formatMonth(value) {

  const dateString =
    String(value || "").substring(0, 10);

  if (!dateString) return "—";

  return new Date(
    dateString + "T00:00:00"
  ).toLocaleDateString(
    "en-IN",
    {
      month: "short",
      year: "numeric"
    }
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
   LOAD BILLS
   ========================================================= */

async function loadBills() {

  try {

    tableBody.innerHTML =
      `<tr>
        <td colspan="9">Loading bills...</td>
      </tr>`;


    const response =
      await fetch(
        GOOGLE_SCRIPT_URL
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );
    }


    const data =
      await response.json();


    if (!Array.isArray(data)) {

      throw new Error(
        "Invalid data received."
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
            normalizeDate(
              b.bill_month
            ).localeCompare(
              normalizeDate(
                a.bill_month
              )
            )
        );


    renderYears();

    yearFilter.value = "all";

    renderTable();


  } catch (error) {

    console.error(error);

    tableBody.innerHTML =
      `<tr>
        <td colspan="9">
          Unable to load bill data.
        </td>
      </tr>`;

    currentBankBalance.textContent =
      "—";
  }
}


/* =========================================================
   YEAR FILTER
   ========================================================= */

function renderYears() {

  const years =
    [
      ...new Set(
        bills.map(
          bill =>
            normalizeDate(
              bill.bill_month
            ).substring(0, 4)
        )
      )
    ]
      .filter(Boolean)
      .sort()
      .reverse();


  yearFilter.innerHTML =
    '<option value="all">All Years</option>' +

    years
      .map(
        year =>
          `<option value="${year}">
            ${year}
          </option>`
      )
      .join("");
}


/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderTable() {

  const selectedYear =
    yearFilter.value;


  const filtered =
    bills.filter(bill => {

      const year =
        normalizeDate(
          bill.bill_month
        ).substring(0, 4);

      return (
        selectedYear === "all" ||
        year === selectedYear
      );
    });


  if (!filtered.length) {

    tableBody.innerHTML =
      `<tr>
        <td colspan="9">
          No bills found.
        </td>
      </tr>`;

    currentBankBalance.textContent =
      "—";

    return;
  }


  tableBody.innerHTML =
    filtered
      .map(bill => {

        const generation =
          Number(
            bill.solar_generation
          ) || 0;


        const exported =
          Number(
            bill.solar_exported
          ) || 0;


        const imported =
          Number(
            bill.kseb_import
          ) || 0;


        const solarUsed =
          generation - exported;


        const usage =
          solarUsed + imported;


        return `
          <tr>

            <td class="sticky c1">
              ${formatMonth(
                bill.bill_month
              )}
            </td>

            <td class="c2">
              ${usage}
            </td>

            <td class="c3">
              ₹${Number(
                bill.bill_amount || 0
              ).toLocaleString("en-IN")}
            </td>

            <td>
              ${generation}
            </td>

            <td>
              ${solarUsed}
            </td>

            <td>
              ${exported}
            </td>

            <td>
              ${imported}
            </td>

            <td>
              ${Number(
                bill.bank_balance || 0
              )}
            </td>

            <td>
              ${bill.bill_number || ""}
            </td>

          </tr>
        `;

      })
      .join("");


  const latest =
    bills[0];


  currentBankBalance.textContent =
    latest
      ? Number(
          latest.bank_balance || 0
        )
      : "—";
}


/* =========================================================
   YEAR FILTER
   ========================================================= */

yearFilter.addEventListener(
  "change",
  renderTable
);


/* =========================================================
   LOGIN MODAL
   ========================================================= */

const loginModal =
  document.getElementById(
    "loginModal"
  );

const closeLoginBtn =
  document.getElementById(
    "closeLoginBtn"
  );

const loginForm =
  document.getElementById(
    "loginForm"
  );

const loginEmail =
  document.getElementById(
    "loginEmail"
  );

const loginPassword =
  document.getElementById(
    "loginPassword"
  );

const loginMessage =
  document.getElementById(
    "loginMessage"
  );


/* =========================================================
   OPEN LOGIN
   ========================================================= */

function openLogin() {

  loginMessage.textContent = "";

  loginForm.reset();

  loginModal.hidden = false;

  loginEmail.focus();
}


/* =========================================================
   CLOSE LOGIN
   ========================================================= */

function closeLogin() {

  loginModal.hidden = true;
}


/* =========================================================
   MANAGE BUTTON
   ========================================================= */

manageBtn.addEventListener(
  "click",
  openLogin
);


/* =========================================================
   CLOSE BUTTON
   ========================================================= */

closeLoginBtn.addEventListener(
  "click",
  closeLogin
);


/* =========================================================
   CLICK OUTSIDE
   ========================================================= */

loginModal.addEventListener(
  "click",
  event => {

    if (
      event.target === loginModal
    ) {
      closeLogin();
    }
  }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      !loginModal.hidden
    ) {
      closeLogin();
    }

  }
);


/* =========================================================
   LOGIN
   ========================================================= */

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    loginMessage.textContent =
      "Signing in...";


    try {

      const response =
        await fetch(
          GOOGLE_SCRIPT_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

              action: "login",

              email:
                loginEmail.value.trim(),

              password:
                loginPassword.value

            })
          }
        );


      const result =
        await response.json();


      if (
        !result.success
      ) {

        loginMessage.textContent =
          result.message ||
          "Invalid email or password.";

        return;
      }


      /* -------------------------------------------------
         Store authentication token
         ------------------------------------------------- */

      localStorage.setItem(
        "kseb_admin_token",
        result.token
      );


      loginMessage.textContent =
        "Login successful.";


      window.location.href =
        "manage.html";


    } catch (error) {

      console.error(error);

      loginMessage.textContent =
        "Unable to connect to the server.";
    }

  }
);


/* =========================================================
   LOAD DASHBOARD
   ========================================================= */

loadBills();
