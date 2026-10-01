(function (globalScope) {
    "use strict";

    const extensionAPI = globalScope.browser ?? globalScope.chrome;
    const policy = globalScope.NightshiftThemePolicy;

    function checkedSettings(value) {
        if (!value || typeof value !== "object" || !Array.isArray(value.disabledSites)) {
            throw new Error("The settings service returned no settings");
        }
        return policy.normalizeSettings(value);
    }

    async function load() {
        if (extensionAPI.runtime?.sendMessage) {
            try {
                return checkedSettings(await extensionAPI.runtime.sendMessage({ type: "loadSettings" }));
            } catch (error) {
                console.warn("Nightshift couldn't load shared settings; using this profile's cache.", error);
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
