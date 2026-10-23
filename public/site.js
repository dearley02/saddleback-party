function money(amount) {
  return amount.toFixed(2);
}

function readQty(form, name) {
  const field = form.elements.namedItem(name);
  if (!field) return 0;
  const value = parseInt(String(field.value), 10);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function estimateText(chairs, tables) {
  if (!chairs && !tables) {
    return "Add chair and table quantities to see a starting estimate.";
  }
  const total = chairs * 2.5 + tables * 12;
  const chairLabel = chairs === 1 ? "1 chair" : chairs + " chairs";
  const tableLabel = tables === 1 ? "1 table" : tables + " tables";
  return (
    "Starting estimate: $" +
    money(total) +
    " for " +
    chairLabel +
    " and " +
    tableLabel +
    ". Chairs are $2.50 each and tables are $12 each at the published starting rates. Delivery, setup, and pickup are included inside the service area. Your quote confirms the final total."
  );
}

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function bindQuoteForm(form) {
  const output = form.querySelector("[data-estimate]");
  const dateField = form.elements.namedItem("event_date");
  if (dateField && !dateField.min) dateField.min = localToday();

  const refresh = () => {
    const chairs = readQty(form, "folding_chairs");
    const tables =
      readQty(form, "table_6ft") +
      readQty(form, "table_8ft") +
      readQty(form, "round_48") +
      readQty(form, "round_60");
    if (output) output.textContent = estimateText(chairs, tables);
    return chairs * 2.5 + tables * 12;
  };

  form.addEventListener("input", refresh);
  refresh();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = form.querySelector("[data-form-error]");
    if (error) error.hidden = true;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    const total = refresh();
    const payload = Object.fromEntries(new FormData(form).entries());
    const chairs = readQty(form, "folding_chairs");
    const tables =
      readQty(form, "table_6ft") +
      readQty(form, "table_8ft") +
      readQty(form, "round_48") +
      readQty(form, "round_60");
    payload.starting_estimate = chairs || tables ? money(total) : "";

    try {
      const response = await fetch("https://formspree.io/f/xojnwlyj", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Request failed");
      if (typeof window.gtag_report_conversion === "function") {
        window.gtag_report_conversion();
      }
      if (typeof window.gtag === "function") {
        window.gtag("event", "generate_lead", { form_name: "contact" });
      }
      form.hidden = true;
      const success = document.getElementById("form-success");
      if (success) {
        success.hidden = false;
        success.focus();
      }
    } catch {
      if (error) error.hidden = false;
      if (button) button.disabled = false;
    }
  });
}

function bindMenu() {
  const button = document.querySelector(".menu-btn");
  const nav = document.getElementById("site-nav");
  if (!button || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.textContent = open ? "Close" : "Menu";
  };

  button.addEventListener("click", () => {
    setOpen(!nav.classList.contains("is-open"));
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      button.focus();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindMenu();
  document.querySelectorAll("form.quote-form").forEach(bindQuoteForm);
});
