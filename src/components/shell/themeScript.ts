/**
 * Blocking theme-detection script, inlined into <head> by RootLayout so
 * it runs before first paint (no flash of the wrong theme). Resolves:
 * explicit localStorage choice ("dark"/"light") if one exists, else the
 * OS preference at load time. Wrapped in try/catch since localStorage
 * can throw in some privacy modes (see artifact/browser-storage
 * conventions already used elsewhere in this app's client code).
 */
export const THEME_STORAGE_KEY = "rise-theme";

export const themeScriptSource = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;
