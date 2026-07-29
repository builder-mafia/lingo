export type Theme = "light" | "dark";

export const themeStorageKey = "lingo:theme:v1";

const isTheme = (value: string | undefined | null): value is Theme =>
  value === "light" || value === "dark";

export const resolveTheme = (
  storedTheme: string | null,
  prefersDark: boolean,
): Theme => {
  if (isTheme(storedTheme)) return storedTheme;
  return prefersDark ? "dark" : "light";
};

export const readAppliedTheme = (): Theme => {
  const appliedTheme = document.documentElement.dataset.theme;
  if (isTheme(appliedTheme)) return appliedTheme;

  let storedTheme: string | null = null;
  try {
    storedTheme = window.localStorage.getItem(themeStorageKey);
  } catch {
    // The operating-system preference remains available when storage is blocked.
  }

  return resolveTheme(
    storedTheme,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#121318" : "#f7f7f8");
};

export const persistTheme = (theme: Theme) => {
  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Theme switching still works for the current page when storage is blocked.
  }
};
