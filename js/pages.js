(() => {
    function loadSaved(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    
    async function saveWithFeedback(form, action) {
        const button = form.querySelector('button[type="submit"]');
        const original = button.textContent;
        form.inert = true;
        form.setAttribute("aria-busy", "true");
        button.disabled = true;
        button.textContent = "Saving…";
        try {
            await new Promise(resolve => setTimeout(resolve, 250));
            return action();
        } finally {
            button.textContent = original;
            button.disabled = false;
            form.removeAttribute("aria-busy");
            form.inert = false;
        }
    }

    
    function highlight(element, text, query) {
        element.textContent = text;
        if (!query) return;
        const lower = text.toLowerCase();
        let start = 0;
        let index = lower.indexOf(query);
        if (index < 0) return;
        element.replaceChildren();
        while (index >= 0) {
            element.append(text.slice(start, index));
            const mark = document.createElement("mark");
            mark.textContent = text.slice(index, index + query.length);
            element.append(mark);
            start = index + query.length;
            index = lower.indexOf(query, start);
        }
        element.append(text.slice(start));
    }

    function setupSearch() {
        const search = document.querySelector("#fw-search");
        const cards = document.querySelectorAll(".service-card");
        const params = new URLSearchParams(location.search);
        const key = "finwise.serviceSearch";
        const savedSearch = loadSaved(key, {});
        search.value = params.get("q") ?? savedSearch?.query ?? "";
        if (params.has("q") && ["http:", "https:"].includes(location.protocol)) {
            
            const url = new URL(location.href);
            url.searchParams.delete("q");
            history.replaceState(null, "", url);
        }

        function filter() {
            const query = search.value.trim().toLowerCase();
            const results = [];
            cards.forEach(card => {
                const heading = card.querySelector("h2");
                const description = card.querySelector("p");
                const title = heading.textContent;
                const text = description.textContent;
                card.hidden = !(title + " " + text).toLowerCase().includes(query);
                if (!card.hidden) results.push(title);
                highlight(heading, title, query);
                highlight(description, text, query);
            });
            let message = "No matching services. Try a shorter search or clear the search.";
            if (results.length === 1) message = "1 service found.";
            if (results.length > 1) message = results.length + " services found.";
            document.querySelector("#fw-results").textContent = message;
            save(key, { query: search.value, results: results });
        }

        filter();
        search.addEventListener("input", filter);
        document.querySelector("#clear-search").addEventListener("click", () => {
            search.value = "";
            filter();
            search.focus();
        });
        cards.forEach(card => {
            card.querySelector("button").addEventListener("click", () => {
                document.querySelector("#service").value = card.querySelector("h2").textContent;
                document.querySelector("#services-form").scrollIntoView({ block: "start" });
                document.querySelector("#contact-name").focus({ preventScroll: true });
            });
        });
    }

    function setupConsultation() {
        const form = document.querySelector("#services-form");
        const adviser = document.querySelector("#adviser");
        const method = document.querySelector("#contact-method");
        const phone = document.querySelector("#contact-phone");
        const lastRequest = document.querySelector("#last-request");
        const key = "finwise.lastRequest";
        const requestedAdviser = new URLSearchParams(location.search).get("adviser");
        if (["Amir", "Abylay", "Money"].includes(requestedAdviser)) {
            adviser.value = requestedAdviser;
        }

        function updatePhone() {
            const isOptional = method.value !== "Phone";
            phone.toggleAttribute("data-optional", isOptional);
            document.querySelector("#phone-optional").textContent = isOptional ? "(optional)" : "(required)";
        }
        function showLastRequest(request) {
            if (!request || typeof request.service !== "string") return;
            document.querySelector("#request-service").textContent = request.service + " · " + request.adviser;
            const contact = request.method === "Phone" ? request.phone : request.email;
            document.querySelector("#request-contact").textContent = request.name + " · " + request.method + ": " + contact;
            document.querySelector("#request-message").textContent = request.message;
            lastRequest.hidden = false;
        }
        showLastRequest(loadSaved(key, null));
        method.addEventListener("change", updatePhone);
        form.addEventListener("reset", () => {
            FinWiseValidation.clear(form);
            form.querySelector(".form-result").textContent = "";
            
            setTimeout(updatePhone, 0);
        });
        form.addEventListener("submit", async event => {
            event.preventDefault();
            if (form.inert) return;
            const status = form.querySelector(".form-result");
            status.textContent = "";
            updatePhone();
            if (!FinWiseValidation.validate(form)) return;
            const request = {
                service: document.querySelector("#service").value,
                adviser: adviser.selectedOptions[0].textContent,
                method: method.value,
                name: document.querySelector("#contact-name").value.trim(),
                email: document.querySelector("#contact-email").value.trim(),
                phone: phone.value.trim(),
                message: document.querySelector("#contact-message").value.trim()
            };
            if (!await saveWithFeedback(form, () => save(key, request))) {
                status.textContent = "Your browser could not save this request. Allow site storage and try again.";
                return;
            }
            form.reset();
            showLastRequest(request);
            status.textContent = "Your consultation request was saved in this browser.";
        });
    }

    if (document.querySelector("#fw-search")) {
        setupSearch();
        setupConsultation();
    }
})();
