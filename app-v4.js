let bills = [];

const tableBody = document.getElementById("billTableBody");
const yearFilter = document.getElementById("yearFilter");
const currentBankBalance = document.getElementById("currentBankBalance");
const manageBtn = document.getElementById("manageBtn");

function formatMonth(dateString) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

async function loadBills() {
  const { data, error } = await supabaseClient
    .from("monthly_bills")
    .select("*")
    .order("bill_month", { ascending: false });

  if (error) {
    console.error(error);
    tableBody.innerHTML = `<tr><td colspan="9">Unable to load bill data. Check Supabase configuration and RLS.</td></tr>`;
    currentBankBalance.textContent = "—";
    return;
  }

  bills = data || [];
  renderYears();
  yearFilter.value = "all";
  renderTable();
}

function renderYears() {
  const years = [...new Set(bills.map(b => b.bill_month.substring(0, 4)))].sort().reverse();
  yearFilter.innerHTML = '<option value="all">All Years</option>' +
    years.map(y => `<option value="${y}">${y}</option>`).join("");
}

function renderTable() {
  const selectedYear = yearFilter.value;
  const filtered = bills.filter(
    b => selectedYear === "all" || b.bill_month.startsWith(selectedYear)
  );

  tableBody.innerHTML = filtered.map(b => {
    const solarUsed = Number(b.solar_generation) - Number(b.solar_exported);
    const usage = solarUsed + Number(b.kseb_import);

    return `
      <tr>
        <td class="sticky c1">${formatMonth(b.bill_month)}</td>
        <td class="sticky c2">${usage}</td>
        <td class="sticky c3">₹${Number(b.bill_amount).toLocaleString("en-IN")}</td>
        <td>${b.solar_generation}</td>
        <td>${solarUsed}</td>
        <td>${b.solar_exported}</td>
        <td>${b.kseb_import}</td>
        <td>${b.bank_balance}</td>
        <td>${b.bill_number}</td>
      </tr>
    `;
  }).join("");

  const latest = bills[0];
  currentBankBalance.textContent = latest ? latest.bank_balance : "—";
}

yearFilter.addEventListener("change", renderTable);
const loginModal = document.getElementById("loginModal");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");

function openLogin() {
  loginMessage.textContent = "";
  loginForm.reset();
  loginModal.hidden = false;
  loginEmail.focus();
}

function closeLogin() {
  loginModal.hidden = true;
}

manageBtn.addEventListener("click", async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    window.location.href = "manage.html";
  } else {
    openLogin();
  }
});

closeLoginBtn.addEventListener("click", closeLogin);
loginModal.addEventListener("click", (event) => {
  if (event.target === loginModal) closeLogin();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !loginModal.hidden) closeLogin();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value
  });

  if (error) {
    loginMessage.textContent = error.message;
    return;
  }

  window.location.href = "manage.html";
});

loadBills();
