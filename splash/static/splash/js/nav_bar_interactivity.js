console.log("✅ nav_bar_interactivity.js loaded");
document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('mobile-menu-open');
    const closeBtn = document.getElementById('mobile-menu-close');
    const menu = document.getElementById('mobile-menu');

    openBtn?.addEventListener('click', () => {
        menu.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
        menu.classList.add('hidden');
    });
});