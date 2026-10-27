(function (globalScope) {
    "use strict";

    const extensionAPI = globalScope.browser ?? globalScope.chrome;
    const policy = globalScope.NightshiftThemePolicy;

    function checkedSettings(value) {
        if (!value || typeof value !== "object" || !Array.isArray(value.disabledSites)) {
            throw new Error("The settings service returned no settings");
        }
        const settings = policy.normalizeSettings(value);
        const tabHost = policy.normalizeHost(value.tabHost);
        if (tabHost) settings.tabHost = tabHost;
        if (tabHost && typeof value.tabURL === "string" && policy.normalizeHost(value.tabURL) === tabHost) settings.tabURL = value.tabURL;
        return settings;
    }

    async function load() {
        if (extensionAPI.runtime?.sendMessage) {
            try {
                return checkedSettings(await extensionAPI.runtime.sendMessage({ type: "loadSettings" }));
            } catch (error) {
                console.warn("Nightshift couldn't reach its background; reading Safari's stored preferences.", error);
            }
        }
        return policy.normalizeSettings(await extensionAPI.storage.local.get(policy.DEFAULT_SETTINGS));
    }

    async function update(change) {
        if (extensionAPI.runtime?.sendMessage) {
            return checkedSettings(await extensionAPI.runtime.sendMessage({ type: "updateSettings", change }));
        }
        const settings = policy.applyChange(await load(), change);
        await extensionAPI.storage.local.set(settings);
        return settings;
    }

    globalScope.NightshiftSettingsStore = Object.freeze({ load, update });
}(typeof globalThis === "undefined" ? this : globalThis));
