"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const resources = path.join(__dirname, "..", "Nightshift Extension", "Resources");
const policySource = fs.readFileSync(path.join(resources, "theme-policy.js"), "utf8");
const backgroundSource = fs.readFileSync(path.join(resources, "background.js"), "utf8");

test("background falls back to per-profile settings when native messaging stalls", async () => {
    const localSettings = {
        globalMode: "dark",
        disabledSites: ["example.com"],
        autoDisabledSites: [],
        enabledSites: [],
        sharedSettingsMigrated: false,
    };
    const storedValues = [];
    let messageListener;
    const browser = {
        storage: {
            local: {
                async get() { return structuredClone(localSettings); },
                async set(value) { storedValues.push(structuredClone(value)); },
            },
        },
        runtime: {
            sendNativeMessage() { return new Promise(() => {}); },
            onMessage: {
                addListener(listener) { messageListener = listener; },
            },
        },
    };
    const context = vm.createContext({
        URL,
        browser,
        clearTimeout,
        console,
        importScripts() {},
        setTimeout,
    });

    vm.runInContext(policySource, context);
    vm.runInContext(backgroundSource, context);

    const [loaded, saved] = await Promise.all([
        messageListener({ type: "loadSettings" }),
        messageListener({ type: "saveSettings", settings: { globalMode: "light" } }),
    ]);

    assert.equal(loaded.globalMode, "dark");
    assert.deepEqual([...loaded.disabledSites], ["example.com"]);
    assert.equal(saved.globalMode, "light");
    assert.equal(storedValues.length, 2);
    assert.equal(storedValues.every((value) => value.sharedSettingsMigrated === false), true);
});
