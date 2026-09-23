"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const knownSites = require("../Nightshift Extension/Resources/known-dark-sites.js");
const manualDarkSites = require("../Nightshift Extension/Resources/manual-dark-sites.js");

function createDocument(selectors = []) {
    return {
        querySelector(selector) {
            return selectors.includes(selector) ? {} : null;
        },
    };
}

test("known dark-by-default entries exclude a listed site", () => {
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "photopea.com", pathname: "/editor" }, createDocument()), true);
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "photopea.com.evil.example", pathname: "/" }, createDocument()), false);
});

test("imported and manual registries remain separate", () => {
    assert.equal(knownSites.IMPORTED_DARK_SITE_PATTERNS.includes("darkreader.org"), true);
    assert.deepEqual(knownSites.MANUAL_DARK_SITE_PATTERNS, ["drive.google.com"]);
    assert.equal(knownSites.DARK_SITE_PATTERNS.includes("drive.google.com"), true);
});

test("manual Google Drive entry excludes Google Drive", () => {
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "drive.google.com", pathname: "/drive/my-drive" }, createDocument()), true);
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "drive.google.com.evil.example", pathname: "/" }, createDocument()), false);
    assert.equal(manualDarkSites.matches(new URL("https://drive.google.com/drive/my-drive")), true);
    assert.equal(manualDarkSites.matches(new URL("https://docs.google.com/document/d/example")), false);
});

test("known selector rules require the listed site marker", () => {
    const lightYoutube = createDocument();
    const darkYoutube = createDocument(["html[dark]"]);
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "www.youtube.com", pathname: "/" }, lightYoutube), false);
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "www.youtube.com", pathname: "/" }, darkYoutube), true);
});

test("unlisted dark-looking pages are not auto-detected", () => {
    assert.equal(knownSites.hasKnownDarkAppearance({ hostname: "example.com", pathname: "/" }, createDocument()), false);
});

test("Dark Reader site patterns preserve wildcard subdomains and paths", () => {
    assert.equal(knownSites.patternMatches("*.wikipedia.org", { hostname: "en.wikipedia.org", pathname: "/wiki/Dark_mode" }), true);
    assert.equal(knownSites.patternMatches("discord.com/app", { hostname: "discord.com", pathname: "/app" }), true);
    assert.equal(knownSites.patternMatches("discord.com/app", { hostname: "discord.com", pathname: "/login" }), false);
});
