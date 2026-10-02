"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const policy = require("../Nightshift Extension/Resources/theme-policy.js");
const resources = path.join(__dirname, "..", "Nightshift Extension", "Resources");

function createHarness({ local = {}, native, fetchStylesheet } = {}) {
    const cache = structuredClone(local);
    let listener;
    const messages = [];
    const context = vm.createContext({
        URL, console, AbortController, fetch: fetchStylesheet, crypto: { randomUUID }, importScripts() {}, clearTimeout,
        // Exercise the timeout branch without waiting five seconds per test.
        setTimeout(callback) { return setTimeout(callback, 10); },
        browser: {
            storage: { local: {
                async get(defaults) { return { ...structuredClone(defaults), ...structuredClone(cache) }; },
                async set(value) { Object.assign(cache, structuredClone(value)); },
            } },
            runtime: {
                async sendNativeMessage(applicationID, message) {
                    assert.equal(applicationID, "com.FlyMedia.Nightshift");
                    messages.push(structuredClone(message));
                    return native ? native(message) : new Promise(() => {});
                },
                onMessage: { addListener(value) { listener = value; } },
            },
        },
    });
    vm.runInContext(fs.readFileSync(path.join(resources, "theme-policy.js"), "utf8"), context);
    vm.runInContext(fs.readFileSync(path.join(resources, "background.js"), "utf8"), context);
    return { cache, messages, load: () => listener({ type: "loadSettings" }),
        update: (change) => listener({ type: "updateSettings", change }),
        loadStylesheet: (url) => listener({ type: "loadThemeStylesheet", url }) };
}

test("the theme can read CDN stylesheets without sending cookies or queuing behind settings", async () => {
    const harness = createHarness({ fetchStylesheet: async (url, options) => {
        assert.equal(url, "https://cdn.example.com/theme.css");
        assert.equal(options.credentials, "omit");
        return new Response("body { color: black; }", { headers: { "Content-Type": "text/css; charset=utf-8" } });
    } });
    const result = await harness.loadStylesheet("https://cdn.example.com/theme.css");
    assert.equal(result.css, "body { color: black; }");
    assert.equal(harness.messages.length, 0);
});

test("theme requests reject non-web URLs, non-CSS responses, and failed requests", async () => {
    let calls = 0;
    const harness = createHarness({ fetchStylesheet: async () => {
        calls++;
        return new Response("<html>private document</html>", { headers: { "Content-Type": "text/html" } });
    } });
    assert.match((await harness.loadStylesheet("file:///etc/hosts")).error, /Unsupported/);
    assert.equal(calls, 0);
    assert.match((await harness.loadStylesheet("https://example.com/")).error, /not a CSS/);
    const offline = createHarness({ fetchStylesheet: async () => { throw new Error("offline"); } });
    assert.equal((await offline.loadStylesheet("https://example.com/theme.css")).error, "offline");
});

function sharedService(initial = {}) {
    let settings = policy.normalizeSettings(initial);
    const sequences = new Map();
    const migratedClients = new Set();
    return (message) => {
        if (message.mergeFallback && !migratedClients.has(message.clientID)) {
            for (const key of ["disabledSites", "autoDisabledSites", "enabledSites"]) {
                settings[key] = [...new Set([...settings[key], ...message.fallback[key]])].sort();
            }
        }
        migratedClients.add(message.clientID);
        for (const change of message.changes) {
            if (change.sequence <= (sequences.get(change.clientID) ?? 0)) continue;
            settings = policy.applyChange(settings, change);
            sequences.set(change.clientID, change.sequence);
        }
        return { settings: structuredClone(settings) };
    };
}

test("concurrent tab changes preserve every manual exclusion and the global mode", async () => {
    const harness = createHarness({ native: sharedService({ globalMode: "dark" }) });
    await harness.load();
    await Promise.all([
        harness.update({ type: "setSiteEnabled", host: "github.com", enabled: false }),
        harness.update({ type: "setAutoDisabled", host: "photopea.com", excluded: true }),
        harness.update({ type: "setSiteEnabled", host: "macrumors.com", enabled: false }),
        harness.update({ type: "setGlobalMode", mode: "system" }),
        harness.load(),
    ]);
    assert.deepEqual(harness.cache.disabledSites, ["github.com", "macrumors.com"]);
    assert.deepEqual(harness.cache.autoDisabledSites, ["photopea.com"]);
    assert.equal(harness.cache.globalMode, "system");
    assert.deepEqual(harness.cache.pendingSettingsChanges, []);
});

test("native timeout preserves migrated status and a durable change across worker restart", async () => {
    const offline = createHarness({ local: { globalMode: "dark", sharedSettingsMigrated: true } });
    const result = await offline.update({ type: "setSiteEnabled", host: "github.com", enabled: false });
    assert.deepEqual([...result.disabledSites], ["github.com"]);
    assert.equal(offline.cache.sharedSettingsMigrated, true);
    assert.equal(offline.cache.pendingSettingsChanges.length, 1);

    const restarted = createHarness({ local: offline.cache, native: sharedService({ disabledSites: ["example.org"] }) });
    await restarted.load();
    assert.deepEqual(restarted.cache.disabledSites, ["example.org", "github.com"]);
    assert.deepEqual(restarted.cache.pendingSettingsChanges, []);
    assert.equal(restarted.messages[0].mergeFallback, false);
});

test("a late native acknowledgement cannot replay an old disable after another profile re-enables it", async () => {
    const native = sharedService();
    const timedOut = createHarness({ native: (message) => {
        native(message); // Native commits, but its acknowledgement is lost.
        return new Promise(() => {});
    } });
    await timedOut.update({ type: "setSiteEnabled", host: "github.com", enabled: false });
    const otherProfile = createHarness({ native });
    await otherProfile.load();
    await otherProfile.update({ type: "setSiteEnabled", host: "github.com", enabled: true });
    const restarted = createHarness({ local: timedOut.cache, native });
    await restarted.load();
    assert.deepEqual(restarted.cache.disabledSites, []);
    assert.deepEqual(restarted.cache.enabledSites, ["github.com"]);
});

test("different Safari profiles update shared settings without overwriting each other", async () => {
    const native = sharedService({ globalMode: "dark" });
    const a = createHarness({ native });
    const b = createHarness({ native });
    await Promise.all([a.load(), b.load()]);
    await Promise.all([
        a.update({ type: "setSiteEnabled", host: "github.com", enabled: false }),
        b.update({ type: "setSiteEnabled", host: "macrumors.com", enabled: false }),
    ]);
    const restarted = createHarness({ local: a.cache, native });
    await restarted.load();
    assert.deepEqual(restarted.cache.disabledSites, ["github.com", "macrumors.com"]);
});

test("failed native writes keep pending changes rather than accepting an empty response", async () => {
    const harness = createHarness({ native: () => ({ error: "Unable to persist shared settings" }) });
    await harness.update({ type: "setSiteEnabled", host: "github.com", enabled: false });
    assert.deepEqual(harness.cache.disabledSites, ["github.com"]);
    assert.equal(harness.cache.pendingSettingsChanges.length, 1);
    assert.equal(harness.cache.sharedSettingsMigrated, undefined);
});
