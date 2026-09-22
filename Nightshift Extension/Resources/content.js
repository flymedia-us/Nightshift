(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const settingsStore = globalThis.NightshiftSettingsStore;
    const nativeDarkModeDetector = globalThis.NightshiftNativeDarkModeDetector;
    const systemAppearance = window.matchMedia("(prefers-color-scheme: dark)");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);
    let settingsLoaded = false;
    let isSavingAutoExclusion = false;
    let pendingAppearanceCheck = false;
    const GOOGLE_DOCS_HOST = "docs.google.com";

    function isGoogleDocsHost() {
        return policy.normalizeHost(window.location.host) === GOOGLE_DOCS_HOST;
    }

    function applyTheme() {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        // Docs paints document pages into canvas tiles. The normal canvas media
        // correction below intentionally cancels Nightshift's page filter, which
        // would make Docs' dark canvas and dark text equally low-contrast. Keep
        // this marker separate from the active state so the CSS stays host-scoped.
        root.toggleAttribute("data-nightshift-google-docs", isGoogleDocsHost());
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
        if (!settingsLoaded || document.readyState === "loading" || !host || isSavingAutoExclusion || settings.enabledSites.includes(host)) return;
        const settingsWithoutCurrentAutoExclusion = {
            ...settings,
            autoDisabledSites: settings.autoDisabledSites.filter((site) => site !== host),
        };
        if (!policy.shouldApply(settingsWithoutCurrentAutoExclusion, host, systemAppearance.matches)) return;
        const hasNativeDarkAppearance = nativeDarkModeDetector?.hasNativeDarkAppearance(document, host) === true;
        const isAutoDisabled = settings.autoDisabledSites.includes(host);
        if (hasNativeDarkAppearance === isAutoDisabled) return;

        isSavingAutoExclusion = true;
        settingsStore.save({
            ...settings,
            autoDisabledSites: hasNativeDarkAppearance
                ? [...settings.autoDisabledSites, host]
                : settings.autoDisabledSites.filter((site) => site !== host),
        }).catch((error) => console.error("Nightshift couldn't save its native-dark-mode exclusion.", error))
            .finally(() => { isSavingAutoExclusion = false; });
    }

    applyTheme();

    settingsStore
        .load()
        .then(updateSettings)
        .catch((error) => console.error("Nightshift couldn't load its settings.", error));

    extensionAPI.storage.onChanged.addListener(handleStorageChange);

    // Check after page CSS is available. The detector observes computed colors,
    // so Nightshift's filter never needs to be removed or flashed off.
    window.addEventListener("DOMContentLoaded", autoDisableNativeDarkMode, { once: true });
    window.addEventListener("load", autoDisableNativeDarkMode, { once: true });

    // Single-page apps commonly apply their saved theme after load. Re-evaluate
    // once per mutation burst without permanently excluding a merely capable site.
    if (typeof MutationObserver === "function" && document.documentElement) {
        new MutationObserver(() => {
            if (pendingAppearanceCheck) return;
            pendingAppearanceCheck = true;
            queueMicrotask(() => {
                pendingAppearanceCheck = false;
                autoDisableNativeDarkMode();
            });
        }).observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    }

    if (typeof systemAppearance.addEventListener === "function") {
        systemAppearance.addEventListener("change", applyTheme);
    } else {
        systemAppearance.addListener(applyTheme);
    }
}());
