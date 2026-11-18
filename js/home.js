const amount = document.getElementById("exchange-amount");
const fromCurrency = document.getElementById("exchange-from");
const toCurrency = document.getElementById("exchange-to");
const exchangeResult = document.getElementById("exchange-result");
const amountError = document.getElementById("amount-error");
const rateStatus = document.getElementById("exchange-status");
const retryButton = document.getElementById("exchange-retry");
const cacheKey = "finwise.exchange.v1";
let rateTable = null;

function readMoney(text) {
    const input = text.trim().replace(",", ".");
    const value = Number(input);
    if (!/^\d+(\.\d{1,2})?$/.test(input) || value <= 0 || value > 1000000000000) return null;
    return value;
}

function showConversion() {
    const value = readMoney(amount.value);
    const valid = value !== null;
    amountError.hidden = valid;
    amountError.textContent = valid ? "" : "Enter an amount above zero, up to one trillion, with up to two decimal places.";
    amount.setAttribute("aria-invalid", String(!valid));
    if (!valid || !rateTable) {
        exchangeResult.textContent = "—";
        return;
    }

    // All rates use USD as their base: convert to USD first, then to the target
    const rates = rateTable.rates;
    const total = value / rates[fromCurrency.value] * rates[toCurrency.value];
    exchangeResult.textContent = total.toLocaleString("en-US", {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }) + " " + toCurrency.value;
}

function hasUsableRates(data) {
    if (!data || data.result !== "success" || data.base_code !== "USD" || !data.rates) {
        return false;
    }
    const currencies = ["USD", "KZT", "EUR", "GBP"];
    return currencies.every(code => Number.isFinite(data.rates[code]) && data.rates[code] > 0)
        && Number.isFinite(data.time_last_update_unix) && Number.isFinite(data.time_next_update_unix);
}

function readSavedRates() {
    try {
        const data = JSON.parse(localStorage.getItem(cacheKey));
        return hasUsableRates(data) ? data : null;
    } catch {
        return null;
    }
}

function rateDate(data) {
    const date = new Date(data.time_last_update_unix * 1000);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function loadRates() {
    retryButton.hidden = true;
    const saved = readSavedRates();
    // Reuse saved rates until the provider's next update time
    if (saved && saved.time_next_update_unix * 1000 > Date.now()) {
        rateTable = saved;
        rateStatus.textContent = "Daily rates dated " + rateDate(saved) + ".";
        showConversion();
        return;
    }

    rateStatus.textContent = "Loading exchange rates…";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: controller.signal });
        if (!response.ok) throw new Error("The rate service is unavailable.");
        const data = await response.json();
        if (!hasUsableRates(data)) throw new Error("The rate table is incomplete.");

        rateTable = data;
        try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {
            
        }
        rateStatus.textContent = "Daily rates dated " + rateDate(data) + ".";
    } catch {
        rateTable = saved;
        rateStatus.textContent = saved
            ? "The service is unavailable. Showing saved rates dated " + rateDate(saved) + "."
            : "Exchange rates are unavailable. Check your connection and try again.";
        retryButton.hidden = false;
    } finally {
        clearTimeout(timer);
        showConversion();
    }
}

amount.addEventListener("input", showConversion);
fromCurrency.addEventListener("change", showConversion);
toCurrency.addEventListener("change", showConversion);
retryButton.addEventListener("click", loadRates);
loadRates();

const tipText = document.getElementById("finance-tip");
const copyStatus = document.getElementById("copy-status");
const tips = [
    tipText.textContent,
    "Save regularly. Choose an amount that fits your budget and set a reminder for the day after payday.",
    "Plan before buying. Keep a short list of larger purchases and check it against your savings goal."
];
let tipIndex = 0;

document.getElementById("tip-next").addEventListener("click", () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    tipIndex = (tipIndex + 1) % tips.length;
    tipText.textContent = tips[tipIndex];
    document.getElementById("tip-count").textContent = "Tip " + (tipIndex + 1) + " of " + tips.length;
    copyStatus.textContent = "";
});

document.getElementById("tip-copy").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(tipText.textContent);
        copyStatus.textContent = "Tip copied.";
    } catch {
        const range = document.createRange();
        range.selectNodeContents(tipText);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copyStatus.textContent = "Tip selected. Use your browser’s Copy command.";
    }
});

const goalForm = document.getElementById("goal-planner");
const goalInput = document.getElementById("savings-goal");
const monthlyInput = document.getElementById("monthly-saving");
const goalStep = document.getElementById("goal-step-one");
const monthlyStep = document.getElementById("goal-step-two");
const goalBack = document.getElementById("goal-back");
const goalSubmit = document.getElementById("goal-submit");
const goalResult = document.getElementById("goal-result");

function showMonthlyStep(showMonthly) {
    goalStep.hidden = showMonthly;
    monthlyStep.hidden = !showMonthly;
    goalBack.hidden = !showMonthly;
    goalSubmit.textContent = showMonthly ? "Calculate months" : "Next";
    goalResult.textContent = "";
    FinWiseValidation.clear(goalForm);
    (showMonthly ? monthlyInput : goalInput).focus();
}

goalBack.addEventListener("click", () => showMonthlyStep(false));
goalForm.addEventListener("input", () => {
    goalResult.textContent = "";
    FinWiseValidation.clear(goalForm);
});
goalForm.addEventListener("submit", event => {
    event.preventDefault();
    const field = goalStep.hidden ? monthlyInput : goalInput;
    const value = readMoney(field.value);
    if (value === null) {
        FinWiseValidation.error(field, "Enter a positive amount up to one trillion, with up to two decimal places.");
        field.focus();
        return;
    }
    if (!goalStep.hidden) {
        showMonthlyStep(true);
        return;
    }
    // Use whole minor units to avoid an extra month caused by decimal rounding
    const goal = Math.round(readMoney(goalInput.value) * 100);
    const months = Math.ceil(goal / Math.round(value * 100));
    goalResult.textContent = "You will reach your goal in " + months.toLocaleString("en-US") +
        (months === 1 ? " month." : " months.");
});


const listenButton = document.getElementById("tip-listen");
if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    listenButton.hidden = false;
    listenButton.addEventListener("click", () => {
        window.speechSynthesis.cancel();
        const spokenTip = new SpeechSynthesisUtterance(tipText.textContent);
        spokenTip.lang = "en-US";
        spokenTip.onerror = event => {
            if (event.error !== "interrupted" && event.error !== "canceled") {
                copyStatus.textContent = "Your browser could not read this tip aloud.";
            }
        };
        window.speechSynthesis.speak(spokenTip);
    });
    window.addEventListener("pagehide", () => window.speechSynthesis.cancel());
}
