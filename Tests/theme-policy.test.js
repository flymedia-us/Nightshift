"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../Nightshift Extension/Resources/theme-policy.js");

test("normalizes invalid settings to System with no disabled sites", () => {
    assert.deepEqual(policy.normalizeSettings({ globalMode: "sepia", disabledSites: "example.com" }), {
        globalMode: "system",
        disabledSites: [],
        autoDisabledSites: [],
        enabledSites: [],
    });
    assert.deepEqual(policy.normalizeSettings(null), {
        globalMode: "system",
        disabledSites: [],
        autoDisabledSites: [],
        enabledSites: [],
    });
});

test("normalizes, deduplicates, and sorts host names", () => {
    assert.deepEqual(
        policy.normalizeDisabledSites(["Example.COM", "https://example.com/path", "localhost:8080", "bad host"]),
        ["example.com", "localhost:8080"],
    );
});

test("Always Light never applies Nightshift", () => {
    assert.equal(policy.shouldApply({ globalMode: "light" }, "example.com", false), false);
    assert.equal(policy.shouldApply({ globalMode: "light" }, "example.com", true), false);
});

test("Always Dark applies Nightshift in either system appearance", () => {
    assert.equal(policy.shouldApply({ globalMode: "dark" }, "example.com", false), true);
    assert.equal(policy.shouldApply({ globalMode: "dark" }, "example.com", true), true);
});

test("System follows the current system appearance", () => {
    assert.equal(policy.shouldApply({ globalMode: "system" }, "example.com", false), false);
    assert.equal(policy.shouldApply({ globalMode: "system" }, "example.com", true), true);
});

test("a per-site exclusion wins over Dark and System", () => {
    const settings = { globalMode: "dark", disabledSites: ["example.com"] };
    assert.equal(policy.shouldApply(settings, "EXAMPLE.com", true), false);
    assert.equal(policy.shouldApply(settings, "other.example.com", true), true);
});

test("host exclusions retain explicit ports", () => {
    const settings = { globalMode: "dark", disabledSites: ["localhost:3000"] };
    assert.equal(policy.shouldApply(settings, "localhost:3000", false), false);
    assert.equal(policy.shouldApply(settings, "localhost:4000", false), true);
});

test("native-dark-mode exclusions apply unless the user explicitly re-enables the site", () => {
    const settings = { autoDisabledSites: ["example.com"] };
    assert.equal(policy.shouldApply(settings, "example.com", true), false);
    assert.equal(policy.shouldApply({ ...settings, enabledSites: ["example.com"] }, "example.com", true), true);
});

test("targeted detector changes preserve manual exclusions and explicit enables", () => {
    const original = { globalMode: "dark", disabledSites: ["github.com"], enabledSites: ["photopea.com"] };
    const next = policy.applyChange(original, { type: "setAutoDisabled", host: "photopea.com", excluded: true });
    assert.deepEqual(next.disabledSites, ["github.com"]);
    assert.deepEqual(next.autoDisabledSites, []);
    assert.equal(next.globalMode, "dark");
});

test("removing an excluded registry site persists an explicit override", () => {
    const next = policy.applyChange({ disabledSites: ["github.com"], autoDisabledSites: ["github.com"] }, { type: "removeExcludedSite", host: "github.com" });
    assert.deepEqual(next.disabledSites, []);
    assert.deepEqual(next.autoDisabledSites, []);
    assert.deepEqual(next.enabledSites, ["github.com"]);
});
