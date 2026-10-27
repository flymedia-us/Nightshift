(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const settingsStore = globalThis.NightshiftSettingsStore;
    const knownDarkSites = globalThis.NightshiftKnownDarkSites;
    const manualDarkSites = globalThis.NightshiftManualDarkSites;
    const themeEngine = globalThis.NightshiftThemeEngine;
    const systemAppearance = window.matchMedia("(prefers-color-scheme: dark)");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);
    let settingsLoaded = false;
    let tabHost = "";
    let tabURL = "";
    let isSavingAutoExclusion = false;
    let pendingAppearanceCheck = false;
    const GOOGLE_DOCS_HOST = "docs.google.com";

    function isGoogleDocsHost() {
        return policy.normalizeHost(window.location.host) === GOOGLE_DOCS_HOST;
    }
    function hasDetectedDarkAppearance() {
        if (isGoogleDocsHost()) {
            return false;
        }
        return knownDarkSites?.activeRuleFor(window.location, document) === true;
    }

    function hasStaticExclusion() {
        return !isGoogleDocsHost() && (manualDarkSites?.matches(window.location) === true ||
            Boolean(knownDarkSites?.staticSourceFor(window.location)));
    }

    function effectiveSettings() {
        const host = policy.normalizeHost(window.location.host);
        // Stored detections describe the last visit. Re-evaluate this page's
        // exact path and theme marker so stale caches cannot exclude light pages.
        const autoDisabledSites = settings.autoDisabledSites.filter((site) => site !== host && site !== GOOGLE_DOCS_HOST);
        if (!host || isGoogleDocsHost() || settings.enabledSites.includes(host) || !(hasStaticExclusion() || hasDetectedDarkAppearance())) {
            return { ...settings, autoDisabledSites };
        }

        return {
            ...settings,
            autoDisabledSites: [...new Set([...autoDisabledSites, host])],
        };
    }

    function applyTheme() {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        // Scope the Docs/Sheets canvas contrast fix to this exact host. Other
        // media and background images retain the dynamic engine's preservation.
        root.toggleAttribute("data-nightshift-google-docs", isGoogleDocsHost());
        let parentExcluded = policy.isSiteDisabled(settings, tabHost);
        if (tabHost && tabHost !== GOOGLE_DOCS_HOST && !settings.enabledSites.includes(tabHost)) {
            try {
                const parentLocation = new URL(tabURL || `https://${tabHost}/`);
                parentExcluded ||= manualDarkSites?.matches(parentLocation) === true || Boolean(knownDarkSites?.staticSourceFor(parentLocation));
            } catch { /* Ignore an unavailable embedding tab URL. */ }
        }
        const active = !(tabHost !== policy.normalizeHost(window.location.host) && parentExcluded) &&
            policy.shouldApply(effectiveSettings(), window.location.host, systemAppearance.matches);
        root.toggleAttribute("data-nightshift-active", active);
        themeEngine.setActive(active);
    }

    function updateSettings(value) {
        if (value.tabHost) tabHost = value.tabHost;
        if (value.tabURL) tabURL = value.tabURL;
        settings = policy.normalizeSettings(value);
        settingsLoaded = true;
        applyTheme();
        applyKnownDarkSiteExclusion();
    }

    function handleStorageChange(changes, areaName) {
        if (areaName !== "local") {
            return;
        }
        if (!Object.keys(policy.DEFAULT_SETTINGS).some((key) => key in changes)) return;

        updateSettings({
            globalMode: changes.globalMode?.newValue ?? settings.globalMode,
            disabledSites: changes.disabledSites?.newValue ?? settings.disabledSites,
            autoDisabledSites: changes.autoDisabledSites?.newValue ?? settings.autoDisabledSites,
            enabledSites: changes.enabledSites?.newValue ?? settings.enabledSites,
        });
    }

    function applyKnownDarkSiteExclusion() {
        const host = policy.normalizeHost(window.location.host);
        if (!settingsLoaded || document.readyState === "loading" || !host) return;
        applyTheme();
        if (isSavingAutoExclusion) return;
        const detected = !hasStaticExclusion() && !settings.enabledSites.includes(host) && hasDetectedDarkAppearance();
        if (detected === settings.autoDisabledSites.includes(host)) return;

        isSavingAutoExclusion = true;
        let succeeded = false;
        settingsStore.update({ type: "setAutoDisabled", host, excluded: detected })
            .then((saved) => { settings = policy.normalizeSettings(saved); succeeded = true; applyTheme(); })
            .catch((error) => console.error("Nightshift couldn't save its detected exclusion.", error))
            .finally(() => {
                isSavingAutoExclusion = false;
                // A theme marker can change while the native write is in flight.
                // Reconcile after a successful write; failures retry on a later event.
                if (succeeded) applyKnownDarkSiteExclusion();
            });
    }

    applyTheme();

    settingsStore
        .load()
        .then(updateSettings)
        .catch((error) => console.error("Nightshift couldn't load its settings.", error));

    extensionAPI.storage.onChanged.addListener(handleStorageChange);
    settingsStore.watch(updateSettings);

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
