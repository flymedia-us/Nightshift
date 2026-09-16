(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const systemAppearance = window.matchMedia("(prefers-color-scheme: dark)");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);

    function applyTheme() {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        const active = policy.shouldApply(settings, window.location.host, systemAppearance.matches);
        root.toggleAttribute("data-nightshift-active", active);
    }

    function updateSettings(value) {
        settings = policy.normalizeSettings(value);
        applyTheme();
    }

    function handleStorageChange(changes, areaName) {
        if (areaName !== "local") {
            return;
        }

        updateSettings({
            globalMode: changes.globalMode?.newValue ?? settings.globalMode,
            disabledSites: changes.disabledSites?.newValue ?? settings.disabledSites,
        });
    }

    applyTheme();

    extensionAPI.storage.local
        .get(policy.DEFAULT_SETTINGS)
        .then(updateSettings)
        .catch((error) => console.error("Nightshift couldn't load its settings.", error));

    extensionAPI.storage.onChanged.addListener(handleStorageChange);

    if (typeof systemAppearance.addEventListener === "function") {
        systemAppearance.addEventListener("change", applyTheme);
    } else {
        systemAppearance.addListener(applyTheme);
    }
}());
