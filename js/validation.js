
window.FinWiseValidation = (function () {
    function labelFor(field) {
        if (field.dataset.label) return field.dataset.label;
        if (field.labels && field.labels.length) return field.labels[0].textContent.trim();
        return "This field";
    }

    function messageFor(field) {
        const value = field.value.trim();
        const rule = field.dataset.rule;
        if (!value && field.hasAttribute("data-optional")) return "";
        if (!value) return labelFor(field) + " is required.";

        if (rule === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return "Enter an email address such as alex@example.com.";
        }
        if (rule === "phone") {
            const digits = value.replace(/\D/g, "");
            if (!/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
                return "Enter 7 to 15 digits. You can include a country code, spaces or dashes.";
            }
        }
        if (rule === "password") {
            const password = field.value;
            if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
                return "Use at least 8 characters with an uppercase letter, a lowercase letter and a number.";
            }
        }
        if (rule === "confirm") {
            const original = document.getElementById(field.dataset.match);
            if (!original || field.value !== original.value) return "The passwords do not match.";
        }
        return "";
    }

    function clearField(field) {
        const errorId = field.id + "-error";
        const message = document.getElementById(errorId);
        if (message) message.remove();
        field.removeAttribute("aria-invalid");
        const descriptions = (field.getAttribute("aria-describedby") || "").split(/\s+/);
        const remaining = descriptions.filter(id => id && id !== errorId);
        if (remaining.length) field.setAttribute("aria-describedby", remaining.join(" "));
        else field.removeAttribute("aria-describedby");
    }

    function error(field, text) {
        clearField(field);
        const message = document.createElement("small");
        message.id = field.id + "-error";
        message.className = "field-error";
        message.textContent = text;
        field.insertAdjacentElement("afterend", message);
        field.setAttribute("aria-invalid", "true");
        const description = field.getAttribute("aria-describedby") || "";
        field.setAttribute("aria-describedby", (description + " " + message.id).trim());
    }

    function clear(form) {
        form.querySelectorAll("[data-rule]").forEach(clearField);
    }

    function validate(form) {
        clear(form);
        let firstInvalid = null;
        form.querySelectorAll("[data-rule]").forEach(function (field) {
            if (field.disabled) return;
            const message = messageFor(field);
            if (message) {
                error(field, message);
                if (!firstInvalid) firstInvalid = field;
            }
        });
        if (firstInvalid) firstInvalid.focus();
        return firstInvalid === null;
    }

    document.addEventListener("reset", function (event) {
        clear(event.target);
    });
    return { validate, clear, error };
})();
