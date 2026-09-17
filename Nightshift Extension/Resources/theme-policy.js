(function (globalScope) {
    "use strict";

    const MODES = Object.freeze({
        LIGHT: "light",
        DARK: "dark",
        SYSTEM: "system",
    });

    const DEFAULT_SETTINGS = Object.freeze({
        globalMode: MODES.SYSTEM,
        disabledSites: Object.freeze([]),
        autoDisabledSites: Object.freeze([]),
        enabledSites: Object.freeze([]),
    });

    function normalizeMode(value) {
        return Object.values(MODES).includes(value) ? value : DEFAULT_SETTINGS.globalMode;
    }

    function normalizeHost(value) {
        if (typeof value !== "string" || value.trim() === "") {
            return "";
        }

        const trimmed = value.trim();
        const candidate = trimmed.includes("://") ? trimmed : `https://${trimmed}`;

        try {
            const url = new URL(candidate);
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                return "";
            }
            return url.host.toLowerCase();
        } catch {
            return "";
        }
    }

    function normalizeDisabledSites(value) {
        if (!Array.isArray(value)) {
            return [];
        }

        return [...new Set(value.map(normalizeHost).filter(Boolean))].sort();
    }

    function normalizeSettings(value = {}) {
        const candidate = value && typeof value === "object" ? value : {};

        return {
            globalMode: normalizeMode(candidate.globalMode),
            disabledSites: normalizeDisabledSites(candidate.disabledSites),
            autoDisabledSites: normalizeDisabledSites(candidate.autoDisabledSites),
            enabledSites: normalizeDisabledSites(candidate.enabledSites),
        };
    }

    function isSiteDisabled(settings, host) {
        const normalizedSettings = normalizeSettings(settings);
        const normalizedHost = normalizeHost(host);
        return normalizedHost !== "" && (
            normalizedSettings.disabledSites.includes(normalizedHost) ||
            (normalizedSettings.autoDisabledSites.includes(normalizedHost) && !normalizedSettings.enabledSites.includes(normalizedHost))
        );
    }

    function shouldApply(settings, host, systemIsDark) {
        const normalizedSettings = normalizeSettings(settings);

        if (isSiteDisabled(normalizedSettings, host)) {
            return false;
        }

        switch (normalizedSettings.globalMode) {
        case MODES.DARK:
            return true;
        case MODES.SYSTEM:
            return systemIsDark === true;
        case MODES.LIGHT:
        default:
            return false;
        }
    }

    const api = Object.freeze({
        DEFAULT_SETTINGS,
        MODES,
        isSiteDisabled,
        normalizeDisabledSites,
        normalizeHost,
        normalizeMode,
        normalizeSettings,
        shouldApply,
    });

    globalScope.NightshiftThemePolicy = api;

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }
}(typeof globalThis === "undefined" ? this : globalThis));
