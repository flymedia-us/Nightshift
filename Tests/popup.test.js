"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const resourceDirectory = path.join(__dirname, "..", "Nightshift Extension", "Resources");
const policySource = fs.readFileSync(path.join(resourceDirectory, "theme-policy.js"), "utf8");
const settingsStoreSource = fs.readFileSync(path.join(resourceDirectory, "settings-store.js"), "utf8");
const popupSource = fs.readFileSync(path.join(resourceDirectory, "popup.js"), "utf8");
const knownDarkSites = require(path.join(resourceDirectory, "known-dark-sites.js"));
const manualDarkSites = require(path.join(resourceDirectory, "manual-dark-sites.js"));

function createInput(value = "") {
    const listeners = new Map();
    return {
        checked: false,
        disabled: false,
        value,
        addEventListener(event, listener) {
            listeners.set(event, listener);
        },
        dispatch(event) {
            listeners.get(event)?.();
        },
    };
}

function createHarness({ tabURL = "https://example.com/page", storedSettings = {} } = {}) {
    const modeInputs = [createInput("light"), createInput("dark"), createInput("system")];
    const siteEnabledInput = createInput();
    const siteName = { textContent: "" };
    const siteDetail = { textContent: "" };
    const status = { textContent: "" };
    const savedSettings = [];

    const browser = {
        storage: {
            local: {
                get: async () => storedSettings,
                set: async (settings) => {
                    savedSettings.push(structuredClone(settings));
                },
            },
        },
        tabs: {
            query: async () => [{ url: tabURL }],
        },
    };

    const elements = {
        "#site-enabled": siteEnabledInput,
        "#site-name": siteName,
        "#site-detail": siteDetail,
        "#status": status,
    };
    const document = {
        querySelectorAll: () => modeInputs,
        querySelector: (selector) => elements[selector],
    };
    const context = vm.createContext({ URL, browser, console, document, structuredClone, NightshiftKnownDarkSites: knownDarkSites, NightshiftManualDarkSites: manualDarkSites });

    vm.runInContext(policySource, context);
    vm.runInContext(settingsStoreSource, context);
    vm.runInContext(popupSource, context);

    return {
        modeInputs,
        savedSettings,
        siteEnabledInput,
        siteName,
        siteDetail,
        status,
        async settle() {
            await new Promise((resolve) => setImmediate(resolve));
        },
    };
}

test("popup renders stored mode and the active site", async () => {
    const harness = createHarness({ storedSettings: { globalMode: "dark" } });
    await harness.settle();

    assert.equal(harness.modeInputs.find((input) => input.value === "dark").checked, true);
    assert.equal(harness.siteName.textContent, "example.com");
    assert.equal(harness.siteEnabledInput.checked, true);
});

test("popup saves a new global mode", async () => {
    const harness = createHarness();
    await harness.settle();

    const darkInput = harness.modeInputs.find((input) => input.value === "dark");
    darkInput.checked = true;
    darkInput.dispatch("change");
    await harness.settle();

    assert.deepEqual(harness.savedSettings.at(-1), {
        globalMode: "dark", disabledSites: [], autoDisabledSites: [], enabledSites: [],
    });
    assert.equal(harness.status.textContent, "Saved");
});

test("popup can disable and re-enable Nightshift for the active site", async () => {
    const harness = createHarness({ storedSettings: { globalMode: "dark" } });
    await harness.settle();

    harness.siteEnabledInput.checked = false;
    harness.siteEnabledInput.dispatch("change");
    await harness.settle();
    assert.deepEqual(harness.savedSettings.at(-1).disabledSites, ["example.com"]);
    assert.deepEqual(harness.savedSettings.at(-1).enabledSites, []);

    harness.siteEnabledInput.checked = true;
    harness.siteEnabledInput.dispatch("change");
    await harness.settle();
    assert.deepEqual(harness.savedSettings.at(-1).disabledSites, []);
    assert.deepEqual(harness.savedSettings.at(-1).enabledSites, ["example.com"]);
});

test("popup explains known-site exclusions and lets the user override one", async () => {
    const harness = createHarness({ storedSettings: { globalMode: "dark", autoDisabledSites: ["example.com"] } });
    await harness.settle();
    assert.equal(harness.siteEnabledInput.checked, false);
    assert.match(harness.siteDetail.textContent, /native dark-mode registry/);

    harness.siteEnabledInput.checked = true;
    harness.siteEnabledInput.dispatch("change");
    await harness.settle();
    assert.deepEqual(harness.savedSettings.at(-1).enabledSites, ["example.com"]);
});

test("popup excludes a registry site before its cached exclusion is saved", async () => {
    const harness = createHarness({ tabURL: "https://drive.google.com/drive/my-drive" });
    await harness.settle();
    assert.equal(harness.siteEnabledInput.checked, false);
    assert.match(harness.siteDetail.textContent, /native dark-mode registry/);
});

test("popup disables site controls on Safari-internal pages", async () => {
    const harness = createHarness({ tabURL: "safari://settings" });
    await harness.settle();

    assert.equal(harness.siteEnabledInput.disabled, true);
    assert.match(harness.siteName.textContent, /isn't available/);
});
