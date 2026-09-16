"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const resourceDirectory = path.join(__dirname, "..", "Nightshift Extension", "Resources");
const policySource = fs.readFileSync(path.join(resourceDirectory, "theme-policy.js"), "utf8");
const contentSource = fs.readFileSync(path.join(resourceDirectory, "content.js"), "utf8");

function createHarness({ host = "example.com", systemIsDark = false, storedSettings = {} } = {}) {
    const attributes = new Set();
    let systemListener;
    let storageListener;

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
        document: { documentElement: root },
        window: {
            location: { host },
            matchMedia: () => mediaQuery,
        },
    });

    vm.runInContext(policySource, context);
    vm.runInContext(contentSource, context);

    return {
        isActive: () => attributes.has("data-nightshift-active"),
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
    };
}

test("content script applies the default System mode before async storage loads", () => {
    assert.equal(createHarness({ systemIsDark: true }).isActive(), true);
    assert.equal(createHarness({ systemIsDark: false }).isActive(), false);
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
