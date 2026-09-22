"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const resourceDirectory = path.join(__dirname, "..", "Nightshift Extension", "Resources");
const policySource = fs.readFileSync(path.join(resourceDirectory, "theme-policy.js"), "utf8");
const storeSource = fs.readFileSync(path.join(resourceDirectory, "settings-store.js"), "utf8");

test("settings store routes every profile through the shared native-settings service", async () => {
    const messages = [];
    const context = vm.createContext({
        URL,
        console,
        browser: {
            runtime: {
                sendMessage: async (message) => {
                    messages.push(structuredClone(message));
                    return message.type === "loadSettings"
                        ? { globalMode: "dark", disabledSites: ["instagram.com"] }
                        : message.settings;
                },
            },
            storage: { local: { get: async () => ({}), set: async () => {} } },
        },
    });
    vm.runInContext(policySource, context);
    vm.runInContext(storeSource, context);

    const loaded = await context.NightshiftSettingsStore.load();
    const saved = await context.NightshiftSettingsStore.save({ ...loaded, disabledSites: ["instagram.com", "www.theverge.com"] });

    assert.deepEqual(structuredClone(loaded), { globalMode: "dark", disabledSites: ["instagram.com"], autoDisabledSites: [], enabledSites: [] });
    assert.deepEqual(messages.map(({ type }) => type), ["loadSettings", "saveSettings"]);
    assert.deepEqual(structuredClone(saved).disabledSites, ["instagram.com", "www.theverge.com"]);
});
