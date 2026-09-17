(function () {
    "use strict";

    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const policy = globalThis.NightshiftThemePolicy;
    const form = document.querySelector("#add-excluded-site");
    const hostInput = document.querySelector("#excluded-site-host");
    const status = document.querySelector("#form-status");
    const list = document.querySelector("#excluded-sites");
    let settings = policy.normalizeSettings(policy.DEFAULT_SETTINGS);

    function setStatus(message) { status.textContent = message; }

    function excludedSites() {
        const manual = new Set(settings.disabledSites);
        const detected = new Set(settings.autoDisabledSites.filter((host) => !settings.enabledSites.includes(host)));
        return [...new Set([...manual, ...detected])].sort().map((host) => ({
            host,
            kind: manual.has(host) ? "Manual" : "Detected",
        }));
    }

    function save(nextSettings, message = "Saved") {
        settings = policy.normalizeSettings(nextSettings);
        return extensionAPI.storage.local.set(settings).then(() => {
            render();
            setStatus(message);
        });
    }

    function remove(host) {
        save({
            ...settings,
            disabledSites: settings.disabledSites.filter((site) => site !== host),
            autoDisabledSites: settings.autoDisabledSites.filter((site) => site !== host),
            enabledSites: settings.enabledSites.filter((site) => site !== host),
        }, "Website removed").catch((error) => setStatus(`Couldn't save: ${error.message}`));
    }

    function render() {
        list.replaceChildren();
        const sites = excludedSites();
        if (sites.length === 0) {
            const empty = document.createElement("li");
            empty.className = "empty";
            empty.textContent = "No excluded websites";
            list.append(empty);
            return;
        }
        for (const site of sites) {
            const item = document.createElement("li");
            item.className = "site";
            const name = document.createElement("span");
            name.className = "site-name";
            name.textContent = site.host;
            name.title = site.host;
            const kind = document.createElement("span");
            kind.className = "site-kind";
            kind.textContent = site.kind;
            const button = document.createElement("button");
            button.className = "secondary";
            button.type = "button";
            button.textContent = "Remove";
            button.setAttribute("aria-label", `Remove ${site.host} from excluded websites`);
            button.addEventListener("click", () => remove(site.host));
            item.append(name, kind, button);
            list.append(item);
        }
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const host = policy.normalizeHost(hostInput.value);
        if (!host) {
            setStatus("Enter a valid website address");
            hostInput.focus();
            return;
        }
        hostInput.value = "";
        save({
            ...settings,
            disabledSites: [...settings.disabledSites, host],
            enabledSites: settings.enabledSites.filter((site) => site !== host),
        }, "Website excluded").catch((error) => setStatus(`Couldn't save: ${error.message}`));
    });

    extensionAPI.storage.local.get(policy.DEFAULT_SETTINGS)
        .then((storedSettings) => {
            settings = policy.normalizeSettings(storedSettings);
            render();
        })
        .catch((error) => setStatus(`Couldn't load settings: ${error.message}`));

    extensionAPI.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        settings = policy.normalizeSettings({
            globalMode: changes.globalMode?.newValue ?? settings.globalMode,
            disabledSites: changes.disabledSites?.newValue ?? settings.disabledSites,
            autoDisabledSites: changes.autoDisabledSites?.newValue ?? settings.autoDisabledSites,
            enabledSites: changes.enabledSites?.newValue ?? settings.enabledSites,
        });
        render();
    });
}());
