"use strict";

const accountsKey = "finwise.accounts";
const sessionKey = "finwise.activeEmail";

function readAccounts() {
    const saved = localStorage.getItem(accountsKey);
    return saved ? JSON.parse(saved) : [];
}
// Create a password hash with PBKDF2 and a separate salt for each account.
// During login, reuse the saved salt to check the entered password.
async function passwordHash(password, salt) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
        name: "PBKDF2", salt: encoder.encode(salt), iterations: 600000, hash: "SHA-256"
    }, key, 256);
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}

function showAccountStatus(text, isError = false) {
    const status = document.getElementById("account-status");
    status.textContent = text;
    status.classList.toggle("is-error", isError);
    status.hidden = !text;
}

function showAccountForm() {
    const signingUp = location.hash === "#signup";
    document.getElementById("login").hidden = signingUp;
    document.getElementById("signup").hidden = !signingUp;
    const activeLink = document.getElementById(signingUp ? "signup-link" : "login-link");
    const otherLink = document.getElementById(signingUp ? "login-link" : "signup-link");
    activeLink.setAttribute("aria-current", "location");
    otherLink.removeAttribute("aria-current");
    showAccountStatus("");
}

function reportAccountProblem() {
    if (!window.crypto || !window.crypto.subtle) {
        showAccountStatus("Open FinWise on HTTPS or localhost to use a practice account.", true);
    } else {
        showAccountStatus("This browser could not read or save your practice account. Check its site storage settings and try again.", true);
    }
}

async function signUp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    if (button.disabled) return;
    showAccountStatus("");
    if (!FinWiseValidation.validate(form)) return;

    const emailField = form.elements.email;
    const email = emailField.value.trim().toLowerCase();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const password = form.elements.password.value;
    button.disabled = true;
    try {
        const salt = crypto.randomUUID();
        const hash = await passwordHash(password, salt);
        const accounts = readAccounts();
        if (accounts.some(account => account.email === email)) {
            FinWiseValidation.error(emailField, "An account already uses this email. Log in or enter another address.");
            emailField.focus();
            return;
        }
        accounts.push({ name, email, phone, salt, passwordHash: hash });
        localStorage.setItem(accountsKey, JSON.stringify(accounts));
        form.reset();
        history.replaceState(null, "", "#login");
        showAccountForm();
        document.getElementById("login-email").value = email;
        showAccountStatus("Your account is ready. Enter your password to log in.");
        document.getElementById("login-password").focus();
    } catch {
        reportAccountProblem();
    } finally {
        button.disabled = false;
    }
}

async function logIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button");
    if (button.disabled) return;
    showAccountStatus("");
    if (!FinWiseValidation.validate(form)) return;

    const email = form.elements.email.value.trim().toLowerCase();
    button.disabled = true;
    try {
        const account = readAccounts().find(person => person.email === email);
        if (!account || await passwordHash(form.elements.password.value, account.salt) !== account.passwordHash) {
            FinWiseValidation.error(form.elements.password, "The email and password do not match an account on this device.");
            form.elements.password.focus();
            return;
        }
        localStorage.setItem(sessionKey, account.email);
        location.assign("profile.html");
    } catch {
        reportAccountProblem();
    } finally {
        button.disabled = false;
    }
}

function openProfile() {
    const panel = document.getElementById("profile-panel");
    const errorPanel = document.getElementById("profile-error");
    panel.hidden = true;
    errorPanel.hidden = true;
    try {
        const email = localStorage.getItem(sessionKey);
        const account = readAccounts().find(person => person.email === email);
        if (!account) {
            localStorage.removeItem(sessionKey);
            location.replace("account.html?next=profile#login");
            return;
        }
        document.getElementById("profile-name").textContent = account.name;
        document.getElementById("profile-email").textContent = account.email;
        document.getElementById("profile-phone").textContent = account.phone;
        const initials = account.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("");
        document.getElementById("profile-initials").textContent = initials.toUpperCase();
        panel.hidden = false;
    } catch {
        errorPanel.hidden = false;
    }
}

if (document.getElementById("login-form")) {
    showAccountForm();
    const params = new URLSearchParams(location.search);
    if (params.get("next") === "profile") showAccountStatus("Log in to view your profile.");
    if (params.has("signedout")) showAccountStatus("You have logged out.");
    window.addEventListener("hashchange", showAccountForm);
    document.getElementById("signup-form").addEventListener("submit", signUp);
    document.getElementById("login-form").addEventListener("submit", logIn);
}

if (document.getElementById("profile-panel")) {
    
    window.addEventListener("pageshow", openProfile);
    window.addEventListener("storage", function (event) {
        if (!event.key || event.key === sessionKey || event.key === accountsKey) openProfile();
    });
    document.getElementById("logout").addEventListener("click", function () {
        try {
            localStorage.removeItem(sessionKey);
            location.replace("account.html?signedout=1#login");
        } catch {
            document.getElementById("profile-panel").hidden = true;
            document.getElementById("profile-error").hidden = false;
        }
    });
}
