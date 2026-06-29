// js/theme.js — Tema
export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  themeIconMoon.classList.toggle('hidden', theme === 'dark');
  themeIconSun.classList.toggle('hidden', theme === 'light');
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'light' ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
else setTheme('light');
themeToggle.addEventListener('click', toggleTheme);

// Expõe globalmente
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;
