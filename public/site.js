const RATES = {
  folding_chairs: 2.5,
  chiavari_chairs: 6,
  table_6ft: 12,
  table_8ft: 12,
  round_48: 14,
  round_60: 15,
};

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

function estimateText(total, pieces) {
  if (!pieces) {
    return "Add chair and table quantities to see a starting estimate.";
  }
  let message =
    "Starting rental estimate: $" +
    money(total) +
    ". White resin folding chairs are $2.50, Chiavari chairs are $6, 6 ft and 8 ft tables are $12, 48 inch rounds are $14, and 60 inch rounds are $15.";
  if (total > 500) {
    message += " This rental total qualifies for free delivery.";
  } else {
    message += " Delivery is $50 to $150 by distance, and free on orders over $500.";
  }
  message += " Setup is quoted on request. Your quote confirms the final total.";
  return message;
}

function orderTotal(form) {
  let total = 0;
  let pieces = 0;
  for (const [name, rate] of Object.entries(RATES)) {
    const qty = readQty(form, name);
    total += qty * rate;
    pieces += qty;
  }
  return { total, pieces };
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
    const order = orderTotal(form);
    if (output) output.textContent = estimateText(order.total, order.pieces);
    return order;
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
    const order = refresh();
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.starting_estimate = order.pieces ? money(order.total) : "";

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
