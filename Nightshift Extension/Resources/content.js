(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const settingsStore = globalThis.NightshiftSettingsStore;
    const knownDarkSites = globalThis.NightshiftKnownDarkSites;
    const manualDarkSites = globalThis.NightshiftManualDarkSites;
    const systemAppearance = window.matchMedia("(prefers-color-scheme: dark)");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);
    let settingsLoaded = false;
    let isSavingAutoExclusion = false;
    let pendingAppearanceCheck = false;
    const GOOGLE_DOCS_HOST = "docs.google.com";

    function isGoogleDocsHost() {
        return policy.normalizeHost(window.location.host) === GOOGLE_DOCS_HOST;
    }
    function hasKnownDarkAppearance() {
        return manualDarkSites?.matches(window.location) === true ||
            knownDarkSites?.hasKnownDarkAppearance(window.location, document) === true;
    }

    function effectiveSettings() {
        const host = policy.normalizeHost(window.location.host);
        if (!host || settings.enabledSites.includes(host) || !hasKnownDarkAppearance()) {
            return settings;
        }

        return {
            ...settings,
            autoDisabledSites: [...new Set([...settings.autoDisabledSites, host])],
        };
    }

    function applyTheme() {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        // Docs paints document pages into canvas tiles. Keep this marker
        // separate from the active state so the canvas-safe correction stays
        // scoped to Docs while Nightshift remains enabled there.
        root.toggleAttribute("data-nightshift-google-docs", isGoogleDocsHost());
        const active = policy.shouldApply(effectiveSettings(), window.location.host, systemAppearance.matches);
        root.toggleAttribute("data-nightshift-active", active);
    }

    function updateSettings(value) {
        settings = policy.normalizeSettings(value);
        settingsLoaded = true;
        applyTheme();
        applyKnownDarkSiteExclusion();
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

    function applyKnownDarkSiteExclusion() {
        const host = policy.normalizeHost(window.location.host);
        if (!settingsLoaded || document.readyState === "loading" || !host || isSavingAutoExclusion || settings.enabledSites.includes(host)) return;
        const hasKnownDarkSite = hasKnownDarkAppearance();
        const isAutoDisabled = settings.autoDisabledSites.includes(host);
        if (hasKnownDarkSite === isAutoDisabled) return;

        isSavingAutoExclusion = true;
        settingsStore.save({
            ...settings,
            autoDisabledSites: hasKnownDarkSite
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

    // Check after page CSS is available so known selector rules can observe the
    // site's active theme marker without inspecting arbitrary rendered colors.
    window.addEventListener("DOMContentLoaded", applyKnownDarkSiteExclusion, { once: true });
    window.addEventListener("load", applyKnownDarkSiteExclusion, { once: true });

    // Single-page apps commonly apply their saved theme after load. Re-evaluate
    // known selector rules once per mutation burst.
    if (typeof MutationObserver === "function" && document.documentElement) {
        new MutationObserver(() => {
            if (pendingAppearanceCheck) return;
            pendingAppearanceCheck = true;
            queueMicrotask(() => {
                pendingAppearanceCheck = false;
                applyKnownDarkSiteExclusion();
            });
        }).observe(document.documentElement, { attributes: true, childList: true, subtree: true });
    }

    if (typeof systemAppearance.addEventListener === "function") {
        systemAppearance.addEventListener("change", applyTheme);
    } else {
        systemAppearance.addListener(applyTheme);
    }
}());
