"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const policy = require("../Nightshift Extension/Resources/theme-policy.js");
const resources = path.join(__dirname, "..", "Nightshift Extension", "Resources");

function store(sendMessage, local = {}, globals = {}) {
    let writes = 0;
    const context = vm.createContext({ URL, console, ...globals, browser: {
        runtime: { sendMessage },
        storage: { local: { get: async () => local, set: async () => { writes++; } } },
    } });
    for (const name of ["theme-policy.js", "settings-store.js"]) {
        vm.runInContext(fs.readFileSync(path.join(resources, name), "utf8"), context);
    }
    return { ...context.NightshiftSettingsStore, writes: () => writes };
}

test("settings store sends individual intents instead of stale settings snapshots", async () => {
    const messages = [];
    let saved = policy.normalizeSettings({ globalMode: "dark", disabledSites: ["instagram.com"] });
    const service = store(async (message) => {
        messages.push(structuredClone(message));
        if (message.type === "updateSettings") saved = policy.applyChange(saved, message.change);
        return saved;
    });
    await service.load();
    const result = await service.update({ type: "setSiteEnabled", host: "www.theverge.com", enabled: false });
    assert.deepEqual([...result.disabledSites], ["instagram.com", "www.theverge.com"]);
    assert.deepEqual(messages[1], { type: "updateSettings", change: { type: "setSiteEnabled", host: "www.theverge.com", enabled: false } });
});

test("visible pages refresh across profiles on focus, restore, visibility, and a coalesced timer", async () => {
    const windowEvents = new Map();
    const documentEvents = new Map();
    let interval;
    let cleared = false;
    let finish;
    let calls = 0;
    const document = {
        visibilityState: "visible",
        addEventListener: (name, callback) => documentEvents.set(name, callback),
        removeEventListener: (name) => documentEvents.delete(name),
    };
    const window = {
        addEventListener: (name, callback) => windowEvents.set(name, callback),
        removeEventListener: (name) => windowEvents.delete(name),
        setInterval(callback, milliseconds) { assert.equal(milliseconds, 15000); interval = callback; return 1; },
        clearInterval(id) { assert.equal(id, 1); cleared = true; },
    };
    const service = store(() => {
        calls++;
        return new Promise((resolve) => { finish = () => resolve({ globalMode: "dark", disabledSites: ["shared.example"] }); });
    }, {}, { window, document });
    const values = [];
    const stop = service.watch((settings) => values.push(settings));
    const focus = windowEvents.get("focus")();
    await windowEvents.get("pageshow")();
    await documentEvents.get("visibilitychange")();
    await interval();
    assert.equal(calls, 1, "Concurrent events must share one read");
    finish();
    await focus;
    assert.deepEqual([...values[0].disabledSites], ["shared.example"]);
    document.visibilityState = "hidden";
    await interval();
    assert.equal(calls, 1, "Background pages must not poll");
    document.visibilityState = "visible";
    const restored = windowEvents.get("pageshow")();
    stop();
    finish();
    await restored;
    assert.equal(values.length, 1, "An unsubscribed page must ignore a late read");
    assert.equal(cleared, true);
    assert.equal(windowEvents.size + documentEvents.size, 0);
});

test("an unavailable background service cannot report a successful save", async () => {
    const service = store(async () => undefined);
    await assert.rejects(service.update({ type: "setSiteEnabled", host: "github.com", enabled: false }), /returned no settings/);
    assert.equal(service.writes(), 0);
});

test("an empty background response loads the existing profile cache instead of resetting exclusions", async () => {
    const service = store(async () => undefined, { disabledSites: ["github.com"] });
    assert.deepEqual([...(await service.load()).disabledSites], ["github.com"]);
});
