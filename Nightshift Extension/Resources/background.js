(function () {
    "use strict";

    importScripts("theme-policy.js");

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;

    async function loadSettings() {
        const localValues = await extensionAPI.storage.local.get({ ...policy.DEFAULT_SETTINGS, sharedSettingsMigrated: false });
        const localSettings = policy.normalizeSettings(localValues);
        const response = await extensionAPI.runtime.sendNativeMessage({
            type: "loadSettings",
            fallback: localSettings,
            mergeFallback: localValues.sharedSettingsMigrated !== true,
        });
        const settings = policy.normalizeSettings(response?.settings);
        await extensionAPI.storage.local.set({ ...settings, sharedSettingsMigrated: true });
        return settings;
    }

    async function saveSettings(value) {
        const settings = policy.normalizeSettings(value);
        const response = await extensionAPI.runtime.sendNativeMessage({ type: "saveSettings", settings });
        const savedSettings = policy.normalizeSettings(response?.settings ?? settings);
        await extensionAPI.storage.local.set({ ...savedSettings, sharedSettingsMigrated: true });
        return savedSettings;
    }

    extensionAPI.runtime.onMessage.addListener((message) => {
        if (message?.type === "loadSettings") return loadSettings();
        if (message?.type === "saveSettings") return saveSettings(message.settings);
        return undefined;
    });
}());
