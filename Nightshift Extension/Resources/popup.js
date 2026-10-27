(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const settingsStore = globalThis.NightshiftSettingsStore;
    const knownDarkSites = globalThis.NightshiftKnownDarkSites;
    const manualDarkSites = globalThis.NightshiftManualDarkSites;
    const modeInputs = [...document.querySelectorAll('input[name="global-mode"]')];
    const siteEnabledInput = document.querySelector("#site-enabled");
    const siteName = document.querySelector("#site-name");
    const siteDomain = document.querySelector("#site-domain");
    const siteDetail = document.querySelector("#site-detail");
    const status = document.querySelector("#status");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);
    let currentHost = "";
    let currentURL = "";

    function setStatus(message) {
        status.textContent = message;
    }

    function render() {
        // Safari's toolbar popover can retain its opening native Canvas palette
        // after color-scheme changes. Keep the visible palette explicit as well.
        document.documentElement.dataset.nightshiftMode = settings.globalMode;
        // Match settings: explicit Nightshift modes override macOS, while
        // System lets native Canvas colors follow appearance changes live.
        document.documentElement.style.colorScheme = settings.globalMode === policy.MODES.SYSTEM
            ? "light dark" : settings.globalMode === policy.MODES.DARK ? "dark" : "light";
        for (const input of modeInputs) {
            input.checked = input.value === settings.globalMode;
        }
        siteDomain.textContent = currentHost || "No website available";

        if (currentHost === "") {
            siteName.textContent = "This Safari page isn't available to extensions";
            siteDetail.textContent = "Open a website to change its setting";
            siteEnabledInput.checked = false;
            siteEnabledInput.disabled = true;
            return;
        }

        siteName.textContent = currentHost;
        const isGoogleDocs = currentHost === "docs.google.com";
        const isManuallyDisabled = settings.disabledSites.includes(currentHost);
        if (isGoogleDocs) {
            siteDetail.textContent = isManuallyDisabled
                ? "Disabled for this website"
                : "Google Docs custom rendering is enabled";
            siteEnabledInput.disabled = false;
            siteEnabledInput.checked = !isManuallyDisabled;
            return;
        }
        let staticSource = "";
        try {
            const location = new URL(currentURL);
            staticSource = manualDarkSites?.matches(location) === true ? "Nightshift" : knownDarkSites?.staticSourceFor(location) ?? "";
        } catch {
            // Safari-internal and malformed URLs are handled by the host check below.
        }
        const automaticallyDisabled = !settings.enabledSites.includes(currentHost) &&
            (settings.autoDisabledSites.includes(currentHost) || Boolean(staticSource));
        siteDetail.textContent = isManuallyDisabled
            ? "Manually excluded by you"
            : automaticallyDisabled
            ? staticSource ? `Excluded by the ${staticSource} list` : "Auto-detected: a known site theme marker was found"
            : "Uses the global appearance setting";
        siteEnabledInput.disabled = false;
        siteEnabledInput.checked = !policy.isSiteDisabled(settings, currentHost) && !automaticallyDisabled;
    }

    async function saveSettings(change) {
        settings = await settingsStore.update(change);
        render();
        setStatus("Saved");
    }

    async function loadCurrentHost() {
        const [tab] = await extensionAPI.tabs.query({ active: true, currentWindow: true });
        currentURL = tab?.url ?? "";
        currentHost = policy.normalizeHost(currentURL);
    }

    for (const input of modeInputs) {
        input.addEventListener("change", () => {
            if (!input.checked) {
                return;
            }

            saveSettings({ type: "setGlobalMode", mode: input.value })
                .catch((error) => { render(); setStatus(`Couldn't save: ${error.message}`); });
        });
    }

    siteEnabledInput.addEventListener("change", () => {
        if (currentHost === "") {
            return;
        }

        saveSettings({ type: "setSiteEnabled", host: currentHost, enabled: siteEnabledInput.checked })
            .catch((error) => { render(); setStatus(`Couldn't save: ${error.message}`); });
    });

    function openSettings() {
        // Safari can reuse an options tab belonging to another profile (or an
        // outdated extension origin). Create this profile's own settings tab.
        extensionAPI.tabs.create({ url: extensionAPI.runtime.getURL("options.html") })
            .catch((error) => setStatus(`Couldn't open settings: ${error.message}`));
    }
    document.querySelector("#open-settings").addEventListener("click", openSettings);

    extensionAPI.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !Object.keys(policy.DEFAULT_SETTINGS).some((key) => key in changes)) return;
        settings = policy.normalizeSettings(Object.fromEntries(Object.keys(policy.DEFAULT_SETTINGS).map((key) =>
            [key, key in changes ? changes[key].newValue : settings[key]])));
        render();
    });

    Promise.all([
        settingsStore.load().then((storedSettings) => { settings = storedSettings; render(); }),
        loadCurrentHost().then(render),
    ])
        .catch((error) => {
            render();
            setStatus(`Couldn't load settings: ${error.message}`);
        });
}());
