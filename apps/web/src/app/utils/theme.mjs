export const THEME_KEY = 'tingting-theme';

export function readTheme(browser) {
  try {
    return browser?.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme, root, browser) {
  root.dataset.theme = theme;
  try {
    browser?.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // The theme still applies for this session if storage is unavailable.
  }
}
