"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const resourceDirectory = path.join(__dirname, "..", "Nightshift Extension", "Resources");
const policySource = fs.readFileSync(path.join(resourceDirectory, "theme-policy.js"), "utf8");
const settingsStoreSource = fs.readFileSync(path.join(resourceDirectory, "settings-store.js"), "utf8");
const contentSource = fs.readFileSync(path.join(resourceDirectory, "content.js"), "utf8");

function createHarness({ host = "example.com", systemIsDark = false, storedSettings = {}, nativeDarkMode = false } = {}) {
    const attributes = new Set();
    let systemListener;
    let storageListener;
    const pageListeners = new Map();
    const savedSettings = [];

    const root = {
        toggleAttribute(name, force) {
            if (force) {
                attributes.add(name);
            } else {
                attributes.delete(name);
            }
        },
    };

    const mediaQuery = {
        matches: systemIsDark,
        addEventListener(_event, listener) {
            systemListener = listener;
        },
    };

    const browser = {
        storage: {
            local: {
                get: async () => storedSettings,
                set: async (value) => { savedSettings.push(structuredClone(value)); },
            },
            onChanged: {
                addListener(listener) {
                    storageListener = listener;
                },
            },
        },
    };

    const context = vm.createContext({
        URL,
        browser,
        console,
        document: { documentElement: root, readyState: "complete" },
        NightshiftNativeDarkModeDetector: { hasNativeDarkAppearance: () => nativeDarkMode },
        window: {
            location: { host },
            matchMedia: () => mediaQuery,
            addEventListener(event, listener) {
                pageListeners.set(event, listener);
            },
        },
    });

    vm.runInContext(policySource, context);
    vm.runInContext(settingsStoreSource, context);
    vm.runInContext(contentSource, context);

    return {
        isActive: () => attributes.has("data-nightshift-active"),
        hasGoogleDocsMarker: () => attributes.has("data-nightshift-google-docs"),
        async settle() {
            await new Promise((resolve) => setImmediate(resolve));
        },
        setSystemAppearance(isDark) {
            mediaQuery.matches = isDark;
            systemListener({ matches: isDark });
        },
        updateStorage(changes) {
            storageListener(changes, "local");
        },
        savedSettings,
    };
}

test("content script applies the default System mode before async storage loads", () => {
    assert.equal(createHarness({ systemIsDark: true }).isActive(), true);
    assert.equal(createHarness({ systemIsDark: false }).isActive(), false);
});

test("Google Docs gets a rendering marker without changing the activation policy", () => {
    const docs = createHarness({ host: "docs.google.com", systemIsDark: false });
    const otherSite = createHarness({ host: "docs.google.com.evil.example", systemIsDark: false });
    assert.equal(docs.hasGoogleDocsMarker(), true);
    assert.equal(otherSite.hasGoogleDocsMarker(), false);
    assert.equal(docs.isActive(), false);
});

test("stored Always Dark activates Nightshift on a light system", async () => {
    const harness = createHarness({ storedSettings: { globalMode: "dark" } });
    assert.equal(harness.isActive(), false);
    await harness.settle();
    assert.equal(harness.isActive(), true);
});

test("storage changes update an already-open page", async () => {
    const harness = createHarness({ systemIsDark: true });
    await harness.settle();
    assert.equal(harness.isActive(), true);

    harness.updateStorage({ globalMode: { newValue: "light" } });
    assert.equal(harness.isActive(), false);
});

test("System mode responds to live appearance changes", async () => {
    const harness = createHarness({ systemIsDark: false });
    await harness.settle();
    harness.setSystemAppearance(true);
    assert.equal(harness.isActive(), true);
    harness.setSystemAppearance(false);
    assert.equal(harness.isActive(), false);
});

test("site exclusions deactivate an already-open page", async () => {
    const harness = createHarness({ storedSettings: { globalMode: "dark" } });
    await harness.settle();
    assert.equal(harness.isActive(), true);

    harness.updateStorage({ disabledSites: { newValue: ["example.com"] } });
    assert.equal(harness.isActive(), false);
});

test("native dark-mode pages are automatically excluded after settings load", async () => {
    const harness = createHarness({ storedSettings: { globalMode: "dark" }, nativeDarkMode: true });
    await harness.settle();
    assert.deepEqual(harness.savedSettings.at(-1).autoDisabledSites, ["example.com"]);
});

test("a stale automatic exclusion is removed when the page is currently light", async () => {
    const harness = createHarness({
        storedSettings: { globalMode: "dark", autoDisabledSites: ["example.com"] },
        nativeDarkMode: false,
    });
    await harness.settle();
    assert.deepEqual(harness.savedSettings.at(-1).autoDisabledSites, []);
});
