(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const settingsStore = globalThis.NightshiftSettingsStore;
    const registry = globalThis.NightshiftKnownDarkSites;
    const exporter = globalThis.NightshiftExclusionExport;
    const form = document.querySelector("#add-excluded-site");
    const hostInput = document.querySelector("#excluded-site-host");
    const status = document.querySelector("#form-status");
    const appearanceStatus = document.querySelector("#appearance-status");
    const modeInputs = [...document.querySelectorAll('input[name="global-mode"]')];
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);

    function setStatus(message, target = status) { target.textContent = message; }

    settingsStore.watch((storedSettings) => {
        if (JSON.stringify(settings) === JSON.stringify(storedSettings)) return;
        settings = storedSettings;
        render();
    });

    function save(change, message = "Saved", target = status) {
        return settingsStore.update(change).then((savedSettings) => {
            settings = savedSettings;
            render();
            setStatus(savedSettings.syncPending ? "Saved in this profile; sharing with other profiles will retry." : message, target);
        });
    }

    function remove(host) {
        save({ type: "removeExcludedSite", host }, "Website removed").catch((error) => setStatus(`Couldn't save: ${error.message}`));
    }

    function renderSites(selector, sites, emptyText, action) {
        const list = document.querySelector(selector);
        list.replaceChildren();
        if (sites.length === 0) {
            const empty = document.createElement("li");
            empty.className = "empty";
            empty.textContent = emptyText;
            list.append(empty);
            return;
        }
        for (const host of sites) {
            const item = document.createElement("li");
            item.className = "site";
            const name = document.createElement("span");
            name.className = "site-name";
            name.textContent = host;
            name.title = host;
            item.append(name);
            if (action) {
                const button = document.createElement("button");
                button.className = action.className ?? "secondary";
                button.type = "button";
                button.textContent = action.label;
                button.setAttribute("aria-label", action.description(host));
                button.addEventListener("click", () => action.run(host));
                item.append(button);
            }
            list.append(item);
        }
    }

    function render() {
        // This page is extension UI, so website content scripts never theme it.
        // Explicit modes must override macOS; System keeps the live OS scheme.
        document.documentElement.style.colorScheme = settings.globalMode === policy.MODES.SYSTEM
            ? "light dark" : settings.globalMode === policy.MODES.DARK ? "dark" : "light";
        for (const input of modeInputs) input.checked = input.value === settings.globalMode;
        renderSites("#excluded-sites", settings.disabledSites, "No manual exclusions", {
            label: "Remove", description: (host) => `Remove ${host} from excluded websites`, run: remove,
        });
        const detected = settings.autoDisabledSites.filter((host) => host !== "docs.google.com" &&
            !settings.disabledSites.includes(host) && !settings.enabledSites.includes(host) && !registry.isRegistryHost(host));
        document.querySelector("#detected-count").textContent = `(${detected.length})`;
        renderSites("#detected-sites", detected, "No auto-detected exclusions", {
            label: "Override", description: (host) => `Override exclusion for ${host}`, className: "quiet", run: remove,
        });
        document.querySelector("#override-count").textContent = `(${settings.enabledSites.length})`;
        renderSites("#enabled-sites", settings.enabledSites, "No enabled overrides", {
            label: "Use automatic rules", description: (host) => `Use automatic rules for ${host}`,
            run: (host) => save({ type: "resetSiteOverride", host }, "Automatic rules restored")
                .catch((error) => setStatus(`Couldn't save: ${error.message}`)),
        });
        document.querySelector("#exclusion-export").value = exporter.publicManualSites(settings).join("\n");
    }

    function setupRegistry(prefix, patterns) {
        const sorted = [...patterns].sort();
        const details = document.querySelector(`#${prefix}-registry`);
        const search = document.querySelector(`#${prefix}-search`);
        document.querySelector(`#${prefix}-count`).textContent = `(${sorted.length})`;
        const refresh = () => renderSites(`#${prefix}-sites`, sorted.filter((host) => host.includes(search.value.trim().toLowerCase())), "No matching entries");
        details.addEventListener("toggle", () => { if (details.open) refresh(); });
        search.addEventListener("input", refresh);
    }
    setupRegistry("nightshift", registry.MANUAL_DARK_SITE_PATTERNS);
    setupRegistry("dark-reader", registry.IMPORTED_DARK_SITE_PATTERNS);

    for (const input of modeInputs) {
        input.addEventListener("change", () => {
            if (!input.checked) return;
            save({ type: "setGlobalMode", mode: input.value }, "Saved", appearanceStatus)
                .catch((error) => {
                    for (const mode of modeInputs) mode.checked = mode.value === settings.globalMode;
                    setStatus(`Couldn't save: ${error.message}`, appearanceStatus);
                });
        });
    }

    document.querySelector("#copy-exclusions").addEventListener("click", async () => {
        const output = document.querySelector("#exclusion-export");
        try {
            await navigator.clipboard.writeText(output.value);
            setStatus("Public manual exclusions copied. Nothing was submitted.");
        } catch {
            output.focus();
            output.select();
            setStatus("Select and copy the public exclusions above.");
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const host = policy.normalizeHost(hostInput.value);
        if (!host) {
            setStatus("Enter a valid website address");
            hostInput.focus();
            return;
        }
        const entered = hostInput.value;
        save({ type: "setSiteEnabled", host, enabled: false }, "Website excluded")
            .then(() => { if (hostInput.value === entered) hostInput.value = ""; })
            .catch((error) => setStatus(`Couldn't save: ${error.message}`));
    });

    settingsStore.load()
        .then((storedSettings) => {
            settings = policy.normalizeSettings(storedSettings);
            render();
        })
        .catch((error) => setStatus(`Couldn't load settings: ${error.message}`));

    extensionAPI.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        if (!Object.keys(policy.DEFAULT_SETTINGS).some((key) => key in changes)) return;
        settings = policy.normalizeSettings({
            globalMode: changes.globalMode?.newValue ?? settings.globalMode,
            disabledSites: changes.disabledSites?.newValue ?? settings.disabledSites,
            autoDisabledSites: changes.autoDisabledSites?.newValue ?? settings.autoDisabledSites,
            enabledSites: changes.enabledSites?.newValue ?? settings.enabledSites,
        });
        render();
    });
}());
