"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const policy = require("../Nightshift Extension/Resources/theme-policy.js");
const resources = path.join(__dirname, "..", "Nightshift Extension", "Resources");

const { createHarness } = require("./helpers/background-harness.cjs");

test("frame settings carry the embedding tab host from Safari's trusted sender", async () => {
    const harness = createHarness();
    const frameSettings = await harness.load({ tab: { url: "https://EXAMPLE.com/page" }, url: "https://embed.example/frame" });
    assert.equal(frameSettings.tabHost, "example.com");
    assert.equal(frameSettings.tabURL, "https://EXAMPLE.com/page");
    assert.equal(harness.cache.tabHost, undefined, "Tab context must not be persisted across unrelated tabs");
    assert.equal(harness.cache.tabURL, undefined);
});

test("the theme can read CDN stylesheets without sending cookies or queuing behind settings", async () => {
    const harness = createHarness({ fetchStylesheet: async (url, options) => {
        assert.equal(url, "https://cdn.example.com/theme.css");
        assert.equal(options.credentials, "omit");
        return new Response("body { color: black; }", { headers: { "Content-Type": "text/css; charset=utf-8" } });
    } });
    const result = await harness.loadStylesheet("https://cdn.example.com/theme.css");
    assert.equal(result.css, "body { color: black; }");
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

test("concurrent same-profile tabs preserve every exclusion and the global mode", async () => {
    const harness = createHarness({ local: { globalMode: "dark" } });
    await Promise.all([
        ...Array.from({ length: 40 }, (_, index) => harness.update({ type: "setSiteEnabled", host: `site${index}.example`, enabled: false })),
        harness.update({ type: "setAutoDisabled", host: "detected.example", excluded: true }),
        harness.update({ type: "setGlobalMode", mode: "system" }),
        harness.load(),
    ]);
    assert.equal(harness.cache.disabledSites.length, 40);
    assert.deepEqual(harness.cache.autoDisabledSites, ["detected.example"]);
    assert.equal(harness.cache.globalMode, "system");
    assert.deepEqual(Object.keys(harness.cache).sort(), Object.keys(policy.DEFAULT_SETTINGS).filter((key) => key !== "enabledSites").sort());
});

test("saved Safari storage survives a background-worker restart without native services", async () => {
    const first = createHarness({ local: { globalMode: "dark", disabledSites: ["saved.example"] } });
    await first.update({ type: "setSiteEnabled", host: "second.example", enabled: false });
    const restarted = createHarness({ local: first.cache });
    const settings = await restarted.load();
    assert.deepEqual([...settings.disabledSites], ["saved.example", "second.example"]);
    assert.equal(settings.globalMode, "dark");
    assert.equal(restarted.writes.length, 0, "Reading persisted preferences must not rewrite them");
});

test("profiles have independent Safari storage even when their original snapshots match", async () => {
    const initial = { globalMode: "dark", disabledSites: ["saved.example"] };
    const personal = createHarness({ local: initial });
    const work = createHarness({ local: initial });
    await personal.update({ type: "setSiteEnabled", host: "personal.example", enabled: false });
    await work.update({ type: "setGlobalMode", mode: "light" });
    assert.deepEqual([...(await personal.load()).disabledSites], ["personal.example", "saved.example"]);
    assert.equal((await personal.load()).globalMode, "dark");
    assert.deepEqual([...(await work.load()).disabledSites], ["saved.example"]);
    assert.equal((await work.load()).globalMode, "light");
});

test("upgrade retains profile preferences while ignoring the old sync journal", async () => {
    const legacy = { globalMode: "dark", disabledSites: ["localhost:3000", "saved.example"],
        enabledSites: ["explicit.example"], autoDisabledSites: ["detected.example"],
        sharedSettingsMigrated: true, settingsClientID: "old-client", settingsSequence: 9,
        pendingSettingsChanges: [{ type: "setGlobalMode", mode: "light", sequence: 9, clientID: "old-client" }] };
    const harness = createHarness({ local: legacy });
    assert.deepEqual(JSON.parse(JSON.stringify(await harness.load())), policy.normalizeSettings(legacy));
    assert.deepEqual(harness.cache, legacy, "An upgrade read must not mutate or replay old data");
    assert.equal(harness.writes.length, 0);
});

test("failed storage writes reject, preserve committed values, and don't poison later requests", async () => {
    const harness = createHarness({ local: { globalMode: "dark", disabledSites: ["saved.example"] } });
    harness.failWrites(true);
    await assert.rejects(harness.update({ type: "setGlobalMode", mode: "light" }), /Storage unavailable/);
    assert.equal((await harness.load()).globalMode, "dark");
    assert.deepEqual(harness.cache.disabledSites, ["saved.example"]);
    harness.failWrites(false);
    await harness.update({ type: "setGlobalMode", mode: "light" });
    assert.equal((await harness.load()).globalMode, "light");
    await assert.rejects(harness.update({ type: "unknown", host: "saved.example" }), /Unknown settings change/);
    await assert.rejects(harness.update(undefined), /Invalid website address/);
    await harness.update({ type: "setGlobalMode", mode: "system" });
    assert.equal((await harness.load()).globalMode, "system");
});

test("storage reads surface failures and no-op changes avoid writes", async () => {
    const harness = createHarness();
    harness.failReads(true);
    await assert.rejects(harness.load(), /Storage unavailable/);
    harness.failReads(false);
    await harness.update({ type: "setGlobalMode", mode: "system" });
    assert.equal(harness.writes.length, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(await harness.load())), policy.normalizeSettings());
});
