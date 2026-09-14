let bills = [];

const tableBody = document.getElementById("billTableBody");
const yearFilter = document.getElementById("yearFilter");
const currentBankBalance = document.getElementById("currentBankBalance");
const manageBtn = document.getElementById("manageBtn");


/* =========================================================
   FORMAT MONTH
   ========================================================= */

function formatMonth(dateValue) {

  const dateString = String(dateValue || "").substring(0, 10);

  if (!dateString) return "—";

  return new Date(dateString + "T00:00:00").toLocaleDateString(
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

  if (!value) return "";

  // Apps Script may return:
  // 2026-08-01T00:00:00.000Z

  return String(value).substring(0, 10);
}


/* =========================================================
   LOAD BILLS FROM GOOGLE SHEET
   ========================================================= */

async function loadBills() {

  try {

    tableBody.innerHTML =
      `<tr><td colspan="9">Loading bills...</td></tr>`;

    const response = await fetch(GOOGLE_SCRIPT_URL);

    if (!response.ok) {
      throw new Error(
        "Server returned HTTP " + response.status
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid data received from Google Sheets.");
    }

    bills = data
      .filter(b => b && b.bill_month)
      .sort((a, b) =>
        normalizeDate(b.bill_month)
          .localeCompare(normalizeDate(a.bill_month))
      );


    renderYears();

    yearFilter.value = "all";

    renderTable();

  } catch (error) {

    console.error("Load error:", error);

    tableBody.innerHTML =
      `<tr>
        <td colspan="9">
          Unable to load bill data.
          Please try again later.
        </td>
      </tr>`;

    currentBankBalance.textContent = "—";
  }
}


/* =========================================================
   YEAR FILTER
   ========================================================= */

function renderYears() {

  const years = [
    ...new Set(
      bills.map(b =>
        normalizeDate(b.bill_month).substring(0, 4)
      )
    )
  ]
    .filter(Boolean)
    .sort()
    .reverse();


  yearFilter.innerHTML =
    '<option value="all">All Years</option>' +

    years
      .map(year =>
        `<option value="${year}">${year}</option>`
      )
      .join("");
}


/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderTable() {

  const selectedYear = yearFilter.value;


  const filtered = bills.filter(b => {

    const year =
      normalizeDate(b.bill_month).substring(0, 4);

    return (
      selectedYear === "all" ||
      year === selectedYear
    );
  });


  if (filtered.length === 0) {

    tableBody.innerHTML =
      `<tr>
        <td colspan="9">No bills found.</td>
      </tr>`;

    currentBankBalance.textContent = "—";

    return;
  }


  tableBody.innerHTML = filtered.map(b => {

    const generation =
      Number(b.solar_generation) || 0;

    const exported =
      Number(b.solar_exported) || 0;

    const ksebImport =
      Number(b.kseb_import) || 0;


    // Solar Used = Solar Generation - Solar Exported
    const solarUsed =
      generation - exported;


    // Usage = Solar Used + KSEB Import
    const usage =
      solarUsed + ksebImport;


    return `
      <tr>

        <td class="sticky c1">
          ${formatMonth(b.bill_month)}
        </td>

        <td class="c2">
          ${usage}
        </td>

        <td class="c3">
          ₹${Number(b.bill_amount || 0)
            .toLocaleString("en-IN")}
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
          ${ksebImport}
        </td>

        <td>
          ${Number(b.bank_balance || 0)}
        </td>

        <td>
          ${b.bill_number || ""}
        </td>

      </tr>
    `;

  }).join("");


  /* =======================================================
     CURRENT BANK BALANCE
     The bills are already sorted newest first.
     ======================================================= */

  const latest = bills[0];

  currentBankBalance.textContent =
    latest
      ? Number(latest.bank_balance || 0)
      : "—";
}


/* =========================================================
   YEAR FILTER EVENT
   ========================================================= */

yearFilter.addEventListener(
  "change",
  renderTable
);


/* =========================================================
   LOGIN MODAL
   ========================================================= */

const loginModal =
  document.getElementById("loginModal");

const closeLoginBtn =
  document.getElementById("closeLoginBtn");

const loginForm =
  document.getElementById("loginForm");

const loginEmail =
  document.getElementById("loginEmail");

const loginPassword =
  document.getElementById("loginPassword");

const loginMessage =
  document.getElementById("loginMessage");


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
   =========================================================

   IMPORTANT:
   Login still uses Supabase for now.

   We are only changing the PUBLIC DASHBOARD
   to Google Sheets in this step.
   ========================================================= */

manageBtn.addEventListener(
  "click",
  () => {

    openLogin();

  }
);


/* =========================================================
   CLOSE LOGIN BUTTON
   ========================================================= */

closeLoginBtn.addEventListener(
  "click",
  closeLogin
);


/* =========================================================
   CLOSE WHEN CLICKING OUTSIDE MODAL
   ========================================================= */

loginModal.addEventListener(
  "click",
  (event) => {

    if (event.target === loginModal) {
      closeLogin();
    }

  }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {

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
   =========================================================

   Supabase authentication is temporarily kept here.

   We will replace this later when we move the
   management page to Google Sheets.
   ========================================================= */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    loginMessage.textContent =
      "Signing in...";


    /*
     * The current login system still requires
     * Supabase.
     *
     * This section will be replaced in Step 2.
     */

    if (
      typeof supabaseClient === "undefined"
    ) {

      loginMessage.textContent =
        "Management login will be connected in the next step.";

      return;
    }


    const { error } =
      await supabaseClient.auth
        .signInWithPassword({

          email:
            loginEmail.value.trim(),

          password:
            loginPassword.value

        });


    if (error) {

      loginMessage.textContent =
        error.message;

      return;
    }


    window.location.href =
      "manage.html";
  }
);


/* =========================================================
   START
   ========================================================= */

loadBills();
