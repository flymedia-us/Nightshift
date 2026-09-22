(function (globalScope) {
    "use strict";

    const extensionAPI = globalScope.browser ?? globalScope.chrome;
    const policy = globalScope.NightshiftThemePolicy;

    async function load() {
        if (extensionAPI.runtime?.sendMessage) {
            try {
                return policy.normalizeSettings(await extensionAPI.runtime.sendMessage({ type: "loadSettings" }));
            } catch (error) {
                console.warn("Nightshift couldn't load shared settings; using this profile's cache.", error);
            }
        }
        return policy.normalizeSettings(await extensionAPI.storage.local.get(policy.DEFAULT_SETTINGS));
    }

    async function save(value) {
        const settings = policy.normalizeSettings(value);
        if (extensionAPI.runtime?.sendMessage) {
            try {
                return policy.normalizeSettings(await extensionAPI.runtime.sendMessage({ type: "saveSettings", settings }));
            } catch (error) {
                console.warn("Nightshift couldn't save shared settings; saving this profile's cache.", error);
            }
        }
        await extensionAPI.storage.local.set(settings);
        return settings;
    }

    globalScope.NightshiftSettingsStore = Object.freeze({ load, save });
}(typeof globalThis === "undefined" ? this : globalThis));
