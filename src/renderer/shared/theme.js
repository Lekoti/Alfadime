const THEME_KEY = "alfadime.theme";

const VALID_THEMES = ["light", "dark", "system"];

let systemMediaQuery = null;

export function getStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    return VALID_THEMES.includes(stored) ? stored : "light";
}

function resolveEffectiveTheme(theme) {
    if (theme !== "system") {
        return theme;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

export function applyTheme(theme) {
    const effectiveTheme = resolveEffectiveTheme(theme);
    document.documentElement.setAttribute("data-theme", effectiveTheme);

    if (theme === "system" && !systemMediaQuery) {
        systemMediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
        systemMediaQuery?.addEventListener("change", () => {
            if (getStoredTheme() === "system") {
                applyTheme("system");
            }
        });
    }
}

export function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
}

export function initTheme() {
    applyTheme(getStoredTheme());
}
