(function () {
    "use strict";

    importScripts("theme-policy.js");

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const NATIVE_MESSAGE_TIMEOUT_MS = 5000;
    const NATIVE_RETRY_DELAY_MS = 15000;
    let pendingRequest = Promise.resolve();
    let pendingRead = null;
    let retryNativeAfter = 0;

    async function loadThemeStylesheet(value) {
        const controller = new AbortController();
        const timeoutID = setTimeout(() => controller.abort(), 10000);
        try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported stylesheet URL.");
            const response = await fetch(url.href, { credentials: "omit", signal: controller.signal });
            if (!response.ok) throw new Error(`Stylesheet request failed (${response.status}).`);
            if (!/^(text\/(css|plain)|application\/x-css)(;|$)/i.test(response.headers.get("Content-Type") ?? "")) {
                throw new Error("The resource is not a CSS stylesheet.");
            }
            return { css: await response.text() };
        } catch (error) {
            return { error: error.message };
        } finally {
            clearTimeout(timeoutID);
        }
    }

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
        async function saveLocal(values) {
            const changed = Object.fromEntries(Object.entries(values).filter(([key, value]) =>
                JSON.stringify(localValues[key]) !== JSON.stringify(value)));
            if (Object.keys(changed).length === 0) return;
            await extensionAPI.storage.local.set(changed);
            Object.assign(localValues, changed);
        }
        let settings = policy.normalizeSettings(localValues);
        const clientID = localValues.settingsClientID || crypto.randomUUID();
        if (!localValues.settingsClientID) {
            await saveLocal({ settingsClientID: clientID });
        }
        const pendingChanges = [...localValues.pendingSettingsChanges];
        if (change) {
            settings = policy.applyChange(settings, change);
            const sequence = localValues.settingsSequence + 1;
            pendingChanges.push({ ...change, clientID, sequence });
            // Persist the intent before contacting native storage. A timeout or
            // worker restart leaves it available for replay on the next request.
            await saveLocal({
                ...settings,
                settingsClientID: clientID,
                settingsSequence: sequence,
                pendingSettingsChanges: pendingChanges,
            });
        }
        const response = Date.now() < retryNativeAfter ? null : await sendNativeMessage({
            type: "loadSettings",
            clientID,
            fallback: settings,
            mergeFallback: localValues.sharedSettingsMigrated !== true,
            changes: pendingChanges,
        });
        const synchronized = response?.settings && Array.isArray(response.settings.disabledSites);
        if (synchronized) {
            retryNativeAfter = 0;
            settings = policy.normalizeSettings(response.settings);
            await saveLocal({
                ...settings,
                sharedSettingsMigrated: true,
                pendingSettingsChanges: [],
            });
        } else if (Date.now() >= retryNativeAfter) {
            // An unavailable native service must not make each frame and tab
            // wait another timeout before a toolbar save can reach the queue.
            retryNativeAfter = Date.now() + NATIVE_RETRY_DELAY_MS;
        }
        // Never replace the cache with an older shared snapshot after a failed
        // write, nor mark an already migrated profile as unmigrated on timeout.
        return synchronized ? settings : { ...settings, syncPending: pendingChanges.length > 0 };
    }

    extensionAPI.runtime.onMessage.addListener((message, sender) => {
        if (message?.type === "loadThemeStylesheet") return loadThemeStylesheet(message.url);
        if (message?.type !== "loadSettings" && message?.type !== "updateSettings") return undefined;
        const isRead = message.type === "loadSettings";
        const request = isRead && pendingRead ? pendingRead :
            pendingRequest.then(() => syncSettings(isRead ? null : message.change));
        // Reads and writes share the queue so a slow load cannot undo a save.
        pendingRequest = request.catch(() => {});
        pendingRead = isRead ? request : null;
        request.finally(() => { if (pendingRead === request) pendingRead = null; }).catch(() => {});
        return request.then((settings) => {
            // Frame scripts use their embedding tab's host so disabling a site
            // also disables Nightshift in third-party embedded documents.
            const tabHost = policy.normalizeHost(sender?.tab?.url);
            return tabHost ? { ...settings, tabHost } : settings;
        });
    });
}());
