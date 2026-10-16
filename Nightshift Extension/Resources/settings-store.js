(function (globalScope) {
    "use strict";

    const extensionAPI = globalScope.browser ?? globalScope.chrome;
    const policy = globalScope.NightshiftThemePolicy;

    function checkedSettings(value) {
        if (!value || typeof value !== "object" || !Array.isArray(value.disabledSites)) {
            throw new Error("The settings service returned no settings");
        }
        const settings = policy.normalizeSettings(value);
        if (value.syncPending === true) settings.syncPending = true;
        const tabHost = policy.normalizeHost(value.tabHost);
        if (tabHost) settings.tabHost = tabHost;
        return settings;
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

    // Safari profiles have separate WebExtension storage events. Read the
    // native store on return to a page and periodically while it is visible so
    // an already-open page also picks up another profile's changes and retries
    // durable pending writes. Coalesce focus/visibility/pageshow bursts.
    function watch(onSettings) {
        const page = globalScope.window;
        const document = globalScope.document;
        if (!page?.addEventListener || !document?.addEventListener) return () => {};
        let refreshing = false;
        let stopped = false;
        async function refresh() {
            if (stopped || refreshing || document.visibilityState === "hidden") return;
            refreshing = true;
            try {
                const settings = await load();
                if (!stopped) onSettings(settings);
            } catch (error) {
                console.warn("Nightshift couldn't refresh shared settings.", error);
            } finally {
                refreshing = false;
            }
        }
        page.addEventListener("focus", refresh);
        page.addEventListener("pageshow", refresh);
        document.addEventListener("visibilitychange", refresh);
        const timer = page.setInterval(refresh, 15000);
        return () => {
            stopped = true;
            page.clearInterval(timer);
            page.removeEventListener("focus", refresh);
            page.removeEventListener("pageshow", refresh);
            document.removeEventListener("visibilitychange", refresh);
        };
    }

    globalScope.NightshiftSettingsStore = Object.freeze({ load, update, watch });
}(typeof globalThis === "undefined" ? this : globalThis));
