"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const policy = require("../Nightshift Extension/Resources/theme-policy.js");
const resources = path.join(__dirname, "..", "Nightshift Extension", "Resources");

function store(sendMessage, local = {}) {
    let writes = 0;
    const context = vm.createContext({ URL, console, browser: {
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

test("an unavailable background service cannot report a successful save", async () => {
    const service = store(async () => undefined);
    await assert.rejects(service.update({ type: "setSiteEnabled", host: "github.com", enabled: false }), /returned no settings/);
    assert.equal(service.writes(), 0);
});

test("an empty background response loads the existing profile cache instead of resetting exclusions", async () => {
    const service = store(async () => undefined, { disabledSites: ["github.com"] });
    assert.deepEqual([...(await service.load()).disabledSites], ["github.com"]);
});
