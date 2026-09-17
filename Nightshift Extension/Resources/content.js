(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const nativeDarkModeDetector = globalThis.NightshiftNativeDarkModeDetector;
    const systemAppearance = window.matchMedia("(prefers-color-scheme: dark)");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);
    let settingsLoaded = false;
    let isSavingAutoExclusion = false;

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
        settingsLoaded = true;
        applyTheme();
        autoDisableNativeDarkMode();
    }

    function handleStorageChange(changes, areaName) {
        if (areaName !== "local") {
            return;
        }

        updateSettings({
            globalMode: changes.globalMode?.newValue ?? settings.globalMode,
            disabledSites: changes.disabledSites?.newValue ?? settings.disabledSites,
            autoDisabledSites: changes.autoDisabledSites?.newValue ?? settings.autoDisabledSites,
            enabledSites: changes.enabledSites?.newValue ?? settings.enabledSites,
        });
    }

    function autoDisableNativeDarkMode() {
        const host = policy.normalizeHost(window.location.host);
        if (!settingsLoaded || document.readyState === "loading" || !host || isSavingAutoExclusion || settings.enabledSites.includes(host) || settings.autoDisabledSites.includes(host)) return;
        if (!policy.shouldApply(settings, host, systemAppearance.matches) || !nativeDarkModeDetector?.hasNativeDarkMode(document)) return;

        isSavingAutoExclusion = true;
        extensionAPI.storage.local.set({
            ...settings,
            autoDisabledSites: [...settings.autoDisabledSites, host],
        }).catch((error) => console.error("Nightshift couldn't save its native-dark-mode exclusion.", error))
            .finally(() => { isSavingAutoExclusion = false; });
    }

    applyTheme();

    extensionAPI.storage.local
        .get(policy.DEFAULT_SETTINGS)
        .then(updateSettings)
        .catch((error) => console.error("Nightshift couldn't load its settings.", error));

    extensionAPI.storage.onChanged.addListener(handleStorageChange);

    // Check after page CSS is available. The detector observes computed colors,
    // so Nightshift's filter never needs to be removed or flashed off.
    window.addEventListener("DOMContentLoaded", autoDisableNativeDarkMode, { once: true });
    window.addEventListener("load", autoDisableNativeDarkMode, { once: true });

    if (typeof systemAppearance.addEventListener === "function") {
        systemAppearance.addEventListener("change", applyTheme);
    } else {
        systemAppearance.addListener(applyTheme);
    }
}());
