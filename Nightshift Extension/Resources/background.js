(function () {
    "use strict";

    importScripts("theme-policy.js");

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const NATIVE_MESSAGE_TIMEOUT_MS = 1000;

    async function sendNativeMessage(message) {
        let timeoutID;
        try {
            return await Promise.race([
                extensionAPI.runtime.sendNativeMessage(message),
                new Promise((resolve) => {
                    timeoutID = setTimeout(() => resolve(null), NATIVE_MESSAGE_TIMEOUT_MS);
                }),
            ]);
        } catch (error) {
            console.warn("Nightshift couldn't reach its shared settings service; using this profile's cache.", error);
            return null;
        } finally {
            clearTimeout(timeoutID);
        }
    }

    async function loadSettings() {
        const localValues = await extensionAPI.storage.local.get({ ...policy.DEFAULT_SETTINGS, sharedSettingsMigrated: false });
        const localSettings = policy.normalizeSettings(localValues);
        const response = await sendNativeMessage({
            type: "loadSettings",
            fallback: localSettings,
            mergeFallback: localValues.sharedSettingsMigrated !== true,
        });
        const hasSharedSettings = response?.settings != null;
        const settings = policy.normalizeSettings(response?.settings ?? localSettings);
        await extensionAPI.storage.local.set({ ...settings, sharedSettingsMigrated: hasSharedSettings });
        return settings;
    }

    async function saveSettings(value) {
        const settings = policy.normalizeSettings(value);
        const response = await sendNativeMessage({ type: "saveSettings", settings });
        const hasSharedSettings = response?.settings != null;
        const savedSettings = policy.normalizeSettings(response?.settings ?? settings);
        await extensionAPI.storage.local.set({ ...savedSettings, sharedSettingsMigrated: hasSharedSettings });
        return savedSettings;
    }

    extensionAPI.runtime.onMessage.addListener((message) => {
        if (message?.type === "loadSettings") return loadSettings();
        if (message?.type === "saveSettings") return saveSettings(message.settings);
        return undefined;
    });
}());
