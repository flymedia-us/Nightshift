(function () {
    "use strict";

    importScripts("theme-policy.js");

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const NATIVE_MESSAGE_TIMEOUT_MS = 5000;
    let pendingRequest = Promise.resolve();

    async function sendNativeMessage(message) {
        let timeoutID;
        try {
            return await Promise.race([
                // Use the two-argument API supported by Safari 15.4 and later.
                extensionAPI.runtime.sendNativeMessage("com.FlyMedia.Nightshift", message),
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

    async function syncSettings(change) {
        const localValues = await extensionAPI.storage.local.get({
            ...policy.DEFAULT_SETTINGS,
            sharedSettingsMigrated: false,
            pendingSettingsChanges: [],
            settingsClientID: "",
            settingsSequence: 0,
        });
        let settings = policy.normalizeSettings(localValues);
        const clientID = localValues.settingsClientID || crypto.randomUUID();
        if (!localValues.settingsClientID) {
            await extensionAPI.storage.local.set({ settingsClientID: clientID });
        }
        const pendingChanges = [...localValues.pendingSettingsChanges];
        if (change) {
            settings = policy.applyChange(settings, change);
            const sequence = localValues.settingsSequence + 1;
            pendingChanges.push({ ...change, clientID, sequence });
            // Persist the intent before contacting native storage. A timeout or
            // worker restart leaves it available for replay on the next request.
            await extensionAPI.storage.local.set({
                ...settings,
                settingsClientID: clientID,
                settingsSequence: sequence,
                pendingSettingsChanges: pendingChanges,
            });
        }
        const response = await sendNativeMessage({
            type: "loadSettings",
            clientID,
            fallback: settings,
            mergeFallback: localValues.sharedSettingsMigrated !== true,
            changes: pendingChanges,
        });
        if (response?.settings && Array.isArray(response.settings.disabledSites)) {
            settings = policy.normalizeSettings(response.settings);
            await extensionAPI.storage.local.set({
                ...settings,
                sharedSettingsMigrated: true,
                pendingSettingsChanges: [],
            });
        }
        // Never replace the cache with an older shared snapshot after a failed
        // write, nor mark an already migrated profile as unmigrated on timeout.
        return settings;
    }

    extensionAPI.runtime.onMessage.addListener((message) => {
        if (message?.type !== "loadSettings" && message?.type !== "updateSettings") return undefined;
        const request = pendingRequest.then(() => syncSettings(message.type === "updateSettings" ? message.change : null));
        // Reads and writes share the queue so a slow load cannot undo a save.
        pendingRequest = request.catch(() => {});
        return request;
    });
}());
