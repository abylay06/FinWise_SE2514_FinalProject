
const mainPages = [
    ['index.html', 'Home'], ['services.html', 'Services'],
    ['markets.html', 'Markets'], ['about.html', 'About'], ['testimonials.html', 'Testimonials']
];
const currentPage = location.pathname.split('/').pop() || 'index.html';
const siteHeader = document.querySelector('[data-site-header]');
const siteFooter = document.querySelector('[data-site-footer]');
const mainContent = document.querySelector('main');
if (!mainContent.id) mainContent.id = 'main-content';

const brand = '<a class="brand" href="index.html" aria-label="FinWise home"><span class="brand-icon" aria-hidden="true"><i></i><i></i><i></i></span>FinWise</a>';
function pageLink(file, title) {
    const active = currentPage === file ? ' aria-current="page"' : '';
    return '<a href="' + file + '"' + active + '>' + title + '</a>';
}

function readSetting(key) {
    try { return localStorage.getItem(key); }
    catch { return null; }
}
siteHeader.classList.add('site-header');
siteHeader.innerHTML = `
    <a href="#${mainContent.id}" class="skip-link">Skip to content</a>
    <div class="site-progress" aria-hidden="true"></div>
    <div class="wrap site-bar">
        ${brand}
        <nav id="site-nav" class="site-nav" aria-label="Main menu">
            ${mainPages.map(([file, title]) => pageLink(file, title)).join('')}
        </nav>
        <div class="site-actions">
            <button type="button" class="theme-toggle" id="theme-toggle"><span aria-hidden="true"></span><span></span></button>
            <a class="button" id="account-link" href="account.html">Account</a>
            <button type="button" class="menu-toggle" aria-controls="site-nav" aria-expanded="false">Menu</button>
        </div>
    </div>`;
siteFooter.classList.add('site-footer');
siteFooter.innerHTML = `
    <div class="wrap foot-bar">
        ${brand}
        <nav class="foot-nav" aria-label="Footer">
            ${[...mainPages, ['account.html', 'Account'], ['profile.html', 'Profile']].map(([file, title]) => pageLink(file, title)).join('')}
        </nav>
        <button class="button secondary" id="open-newsletter" type="button">Subscribe to newsletter</button>
    </div>
    <div class="wrap foot-meta"><span>FinWise · Student project</span><time id="local-time" aria-label="Local date and time"></time></div>
    <dialog class="newsletter-dialog" id="newsletter-dialog" aria-labelledby="newsletter-heading">
        <button type="button" class="dialog-close" aria-label="Close newsletter">×</button>
        <h2 id="newsletter-heading">FinWise newsletter</h2>
        <p>This demo saves your subscription in this browser.</p>
        <form id="newsletter-form" novalidate>
            <label for="newsletter-email">Email address</label>
            <input type="text" inputmode="email" autocomplete="email" id="newsletter-email" data-rule="email" data-label="Email" placeholder="you@example.com">
            <button class="button" type="submit">Subscribe</button>
            <p class="newsletter-status" role="status"></p>
        </form>
    </dialog>`;

const themeButton = document.querySelector('#theme-toggle');
function applyTheme(theme) {
    const dark = theme === 'dark';
    const previous = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    themeButton.firstElementChild.textContent = dark ? '☀' : '☾';
    themeButton.lastElementChild.textContent = dark ? 'Light' : 'Dark';
    themeButton.setAttribute('aria-label', dark ? 'Use light theme' : 'Use dark theme');
    if (previous !== document.documentElement.dataset.theme) {
        document.dispatchEvent(new Event('finwise-theme-change'));
    }
}
function restoreHeader() {
    applyTheme(readSetting('finwise.theme'));
    const signedIn = Boolean(readSetting('finwise.activeEmail'));
    const link = document.querySelector('#account-link');
    link.href = signedIn ? 'profile.html' : 'account.html';
    link.textContent = signedIn ? 'My profile' : 'Account';
}
restoreHeader();
window.addEventListener('pageshow', restoreHeader);
themeButton.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    try { localStorage.setItem('finwise.theme', nextTheme); } catch {  }
});
window.addEventListener('storage', event => {
    if (!event.key || event.key === 'finwise.theme' || event.key === 'finwise.activeEmail') restoreHeader();
});

const menuButton = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
function setMenu(open) {
    siteNav.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
}
menuButton.addEventListener('click', () => setMenu(!siteNav.classList.contains('open')));
siteHeader.addEventListener('keydown', event => {
    if (event.key === 'Escape' && siteNav.classList.contains('open')) {
        setMenu(false);
        menuButton.focus();
    }
    const links = [...siteNav.querySelectorAll('a')];
    const index = links.indexOf(event.target);
    if (index === -1 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    links[(index + step + links.length) % links.length].focus();
});

const newsletter = document.querySelector('#newsletter-dialog');
const newsletterForm = document.querySelector('#newsletter-form');
const newsletterStatus = newsletterForm.querySelector('[role="status"]');
document.querySelector('#open-newsletter').addEventListener('click', () => {
    newsletterForm.reset();
    FinWiseValidation.clear(newsletterForm);
    newsletterStatus.textContent = '';
    newsletter.showModal();
    document.querySelector('#newsletter-email').focus();
});
newsletter.querySelector('.dialog-close').addEventListener('click', () => newsletter.close());
newsletter.addEventListener('click', event => {
    if (event.target !== newsletter) return;
    const box = newsletter.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) newsletter.close();
});
newsletterForm.addEventListener('submit', event => {
    event.preventDefault();
    newsletterStatus.textContent = '';
    if (!FinWiseValidation.validate(newsletterForm)) return;
    const email = document.querySelector('#newsletter-email').value.trim().toLowerCase();
    try {
        const emails = JSON.parse(localStorage.getItem('finwise.newsletter') || '[]');
        if (emails.includes(email)) {
            newsletterStatus.textContent = 'This email is already on your local list.';
            return;
        }
        emails.push(email);
        localStorage.setItem('finwise.newsletter', JSON.stringify(emails));
        newsletterForm.reset();
        newsletterStatus.textContent = 'Thank you for subscribing!';
    } catch {
        newsletterStatus.textContent = 'This browser could not save your subscription.';
    }
});

const progressBar = document.querySelector('.site-progress');
function updateProgress() {
    const scrollDistance = document.documentElement.scrollHeight - innerHeight;
    const percent = scrollDistance > 0 ? scrollY / scrollDistance * 100 : 100;
    progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
window.addEventListener('load', updateProgress);
updateProgress();

function showLocalTime() {
    const now = new Date();
    const clock = document.querySelector('#local-time');
    clock.dateTime = now.toISOString();
    clock.textContent = now.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}
showLocalTime();
setInterval(showLocalTime, 10000);
