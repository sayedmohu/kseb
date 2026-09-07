let bills = [];
let editingId = null;
let bankOpeningManuallyEdited = false;

const form = document.getElementById("billForm");
const billMonth = document.getElementById("billMonth");
const billYear = document.getElementById("billYear");
const billNumber = document.getElementById("billNumber");
const billAmount = document.getElementById("billAmount");
const solarGeneration = document.getElementById("solarGeneration");
const solarExported = document.getElementById("solarExported");
const ksebImport = document.getElementById("ksebImport");
const bankBalance = document.getElementById("bankBalance");
const bankOpeningInput = document.getElementById("bankOpeningInput");
const solarUsed = document.getElementById("solarUsed");
const totalUsage = document.getElementById("totalUsage");
const bankOpening = document.getElementById("bankOpening");
const bankChange = document.getElementById("bankChange");
const existingBills = document.getElementById("existingBills");
const message = document.getElementById("message");

document.getElementById("dashboardBtn").addEventListener("click", () => {
  window.location.href = "index.html";
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

document.getElementById("clearBtn").addEventListener("click", clearForm);

[solarGeneration, solarExported, ksebImport, bankBalance, billMonth, billYear]
  .forEach(el => {
    el.addEventListener("input", updateCalculations);
    el.addEventListener("change", updateCalculations);
  });

bankOpeningInput.addEventListener("input", () => {
  bankOpeningManuallyEdited = true;
  updateCalculations();
});
bankOpeningInput.addEventListener("change", () => {
  bankOpeningManuallyEdited = true;
  updateCalculations();
});

function getFormDate() {
  if (!billYear.value || !billMonth.value) return null;
  return `${billYear.value}-${billMonth.value}-01`;
}

function getPreviousBill(date, ignoreId = null) {
  return bills
    .filter(b => b.monthly_bills !== ignoreId && b.bill_month < date)
    .sort((a, b) => b.bill_month.localeCompare(a.bill_month))[0] || null;
}

function updateCalculations() {
  const gen = Number(solarGeneration.value) || 0;
  const exp = Number(solarExported.value) || 0;
  const imp = Number(ksebImport.value) || 0;
  const close = Number(bankBalance.value) || 0;
  const used = gen - exp;

  solarUsed.textContent = used;
  totalUsage.textContent = used + imp;

  const date = getFormDate();
  const previous = date ? getPreviousBill(date, editingId) : null;

  if (!editingId && !bankOpeningManuallyEdited) {
    bankOpeningInput.value = previous ? Number(previous.bank_balance) : 0;
  }

  const enteredOpening = Number(bankOpeningInput.value) || 0;
  bankOpening.textContent = enteredOpening;
  bankChange.textContent = close - enteredOpening;
}

async function loadBills() {
  const { data, error } = await supabaseClient
    .from("monthly_bills")
    .select("*")
    .order("bill_month", { ascending: false });

  if (error) {
    message.textContent = "Unable to load bills. Check Supabase configuration and RLS.";
    console.error(error);
    return;
  }

  bills = data || [];
  renderExistingBills();
  updateCalculations();
}

function renderExistingBills() {
  existingBills.innerHTML = bills.map(b => `
    <div class="bill-row">
      <div>
        <strong>${formatMonth(b.bill_month)}</strong>
        <span>Bill ${b.bill_number} · ₹${Number(b.bill_amount).toLocaleString("en-IN")}</span>
      </div>
      <button onclick="editBill('${b.monthly_bills}')">Edit</button>
    </div>
  `).join("");
}

function formatMonth(dateString) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

window.editBill = function(id) {
  const b = bills.find(x => String(x.monthly_bills) === String(id));
  if (!b) return;

  editingId = id;
  bankOpeningManuallyEdited = true;
  billMonth.value = b.bill_month.substring(5, 7);
  billYear.value = b.bill_month.substring(0, 4);
  billNumber.value = b.bill_number;
  billAmount.value = b.bill_amount;
  solarGeneration.value = b.solar_generation;
  solarExported.value = b.solar_exported;
  ksebImport.value = b.kseb_import;
  bankOpeningInput.value = b.bank_opening ?? 0;
  bankBalance.value = b.bank_balance;

  updateCalculations();
  message.textContent = "Editing existing bill.";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

form.addEventListener("submit", async function(e) {
  e.preventDefault();
  message.textContent = "Saving...";

  const date = getFormDate();
  const gen = Number(solarGeneration.value);
  const exp = Number(solarExported.value);
  const imp = Number(ksebImport.value);
  const opening = Number(bankOpeningInput.value);
  const closing = Number(bankBalance.value);

  if (!date) {
    message.textContent = "Please select month and year.";
    return;
  }

  const record = {
    bill_month: date,
    bill_number: billNumber.value.trim(),
    usage: (gen - exp) + imp,
    bill_amount: Number(billAmount.value),
    solar_generation: gen,
    solar_exported: exp,
    kseb_import: imp,
    bank_opening: opening,
    bank_balance: closing
  };

  const duplicate = bills.find(b => b.bill_month === date && String(b.monthly_bills) !== String(editingId));
  if (!editingId && duplicate) {
    message.textContent = "A bill for this month already exists. Use Edit instead.";
    return;
  }

  let result;

if (editingId) {
  const oldBill = bills.find(
    b => String(b.monthly_bills) === String(editingId)
  );

  const oldClosing = oldBill ? Number(oldBill.bank_balance) : 0;

  // Update the bill being edited
  result = await supabaseClient
    .from("monthly_bills")
    .update(record)
    .eq("monthly_bills", editingId);

  if (!result.error) {
    // Difference between old and new bank closing
    const bankDifference = Number(record.bank_balance) - oldClosing;

    if (bankDifference !== 0) {
      // Find all bills after the edited month
      const laterBills = bills
        .filter(b => b.bill_month > date)
        .sort((a, b) => a.bill_month.localeCompare(b.bill_month));

      let previousClosing = Number(record.bank_balance);

      for (const laterBill of laterBills) {
        const oldOpening = Number(laterBill.bank_opening);
        const oldLaterClosing = Number(laterBill.bank_balance);

        // Preserve that month's bank addition/usage
        const bankChange = oldLaterClosing - oldOpening;

        const newOpening = previousClosing;
        const newClosing = newOpening + bankChange;

        const updateResult = await supabaseClient
          .from("monthly_bills")
          .update({
            bank_opening: newOpening,
            bank_balance: newClosing
          })
          .eq("monthly_bills", laterBill.monthly_bills);

        if (updateResult.error) {
          console.error(updateResult.error);
          message.textContent =
            "Bill saved, but a later month's bank balance could not be updated.";
          return;
        }

        previousClosing = newClosing;
      }
    }
  }
} else {
  result = await supabaseClient
    .from("monthly_bills")
    .insert(record);
}

  if (result.error) {
    console.error(result.error);
    message.textContent = "Save failed: " + result.error.message;
    return;
  }

  message.textContent = "Bill saved successfully.";
  alert("Bill saved successfully!");
  await loadBills();
  clearForm();
});

function clearForm() {
  editingId = null;
  bankOpeningManuallyEdited = false;
  form.reset();
  const today = new Date();
  billYear.value = today.getFullYear();
  billMonth.value = String(today.getMonth() + 1).padStart(2, "0");
  bankOpeningInput.value = 0;
  updateCalculations();
}

async function requireLogin() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

(async function init() {
  if (await requireLogin()) {
    const today = new Date();
    billYear.value = today.getFullYear();
    billMonth.value = String(today.getMonth() + 1).padStart(2, "0");
    bankOpeningInput.value = 0;
    await loadBills();
  }
})();
