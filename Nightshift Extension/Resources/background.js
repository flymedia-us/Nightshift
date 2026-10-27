(function () {
    "use strict";

    importScripts("theme-policy.js");

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    let pendingRequest = Promise.resolve();

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

    async function storedSettings(change, isRead) {
        // Safari owns this persistent storage area, separately for each profile.
        // Existing preference keys are already here; legacy sync metadata is ignored.
        const settings = policy.normalizeSettings(await extensionAPI.storage.local.get(policy.DEFAULT_SETTINGS));
        if (isRead) return settings;
        const next = policy.applyChange(settings, change);
        const changed = Object.fromEntries(Object.entries(next).filter(([key, value]) =>
            JSON.stringify(value) !== JSON.stringify(settings[key])));
        if (Object.keys(changed).length) await extensionAPI.storage.local.set(changed);
        return next;
    }

    extensionAPI.runtime.onMessage.addListener((message, sender) => {
        if (message?.type === "loadThemeStylesheet") return loadThemeStylesheet(message.url);
        if (message?.type !== "loadSettings" && message?.type !== "updateSettings") return undefined;
        const isRead = message.type === "loadSettings";
        const request = pendingRequest.then(() => storedSettings(message.change, isRead));
        // Serialize changes within this one profile so concurrent tabs/frames
        // apply intents to the latest stored state instead of overwriting lists.
        pendingRequest = request.catch(() => {});
        return request.then((settings) => {
            // Frame scripts use their embedding tab's host so disabling a site
            // also disables Nightshift in third-party embedded documents.
            const tabHost = policy.normalizeHost(sender?.tab?.url);
            return tabHost ? { ...settings, tabHost, tabURL: sender.tab.url } : settings;
        });
    });
}());
