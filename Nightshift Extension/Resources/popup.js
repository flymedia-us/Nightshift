(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const modeInputs = [...document.querySelectorAll('input[name="global-mode"]')];
    const siteEnabledInput = document.querySelector("#site-enabled");
    const siteName = document.querySelector("#site-name");
    const siteDetail = document.querySelector("#site-detail");
    const status = document.querySelector("#status");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);
    let currentHost = "";

    function setStatus(message) {
        status.textContent = message;
    }

    function render() {
        for (const input of modeInputs) {
            input.checked = input.value === settings.globalMode;
        }

        if (currentHost === "") {
            siteName.textContent = "This Safari page isn't available to extensions";
            siteDetail.textContent = "Open a website to change its setting";
            siteEnabledInput.checked = false;
            siteEnabledInput.disabled = true;
            return;
        }

        siteName.textContent = currentHost;
        const automaticallyDisabled = settings.autoDisabledSites.includes(currentHost) && !settings.enabledSites.includes(currentHost);
        siteDetail.textContent = automaticallyDisabled
            ? "Disabled because this site provides its own dark appearance"
            : "Uses the global appearance setting";
        siteEnabledInput.disabled = false;
        siteEnabledInput.checked = !policy.isSiteDisabled(settings, currentHost);
    }

    async function saveSettings(nextSettings) {
        settings = policy.normalizeSettings(nextSettings);
        await extensionAPI.storage.local.set(settings);
        render();
        setStatus("Saved");
    }

    async function loadCurrentHost() {
        const [tab] = await extensionAPI.tabs.query({ active: true, currentWindow: true });
        currentHost = policy.normalizeHost(tab?.url ?? "");
    }

    for (const input of modeInputs) {
        input.addEventListener("change", () => {
            if (!input.checked) {
                return;
            }

            saveSettings({ ...settings, globalMode: input.value })
                .catch((error) => setStatus(`Couldn't save: ${error.message}`));
        });
    }

    siteEnabledInput.addEventListener("change", () => {
        if (currentHost === "") {
            return;
        }

        const disabledSites = new Set(settings.disabledSites);
        const enabledSites = new Set(settings.enabledSites);
        if (siteEnabledInput.checked) {
            disabledSites.delete(currentHost);
            enabledSites.add(currentHost);
        } else {
            disabledSites.add(currentHost);
            enabledSites.delete(currentHost);
        }

        saveSettings({ ...settings, disabledSites: [...disabledSites], enabledSites: [...enabledSites] })
            .catch((error) => setStatus(`Couldn't save: ${error.message}`));
    });

    Promise.all([
        extensionAPI.storage.local.get(policy.DEFAULT_SETTINGS),
        loadCurrentHost(),
    ])
        .then(([storedSettings]) => {
            settings = policy.normalizeSettings(storedSettings);
            render();
        })
        .catch((error) => {
            render();
            setStatus(`Couldn't load settings: ${error.message}`);
        });
}());
