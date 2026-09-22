"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
require("../Nightshift Extension/Resources/known-dark-sites.js");
const detector = require("../Nightshift Extension/Resources/native-dark-mode-detector.js");

function createDocument({ color = "rgb(20, 20, 20)", meta = "", colorScheme = "normal", rules = [], controls = [], selectors = [] } = {}) {
    const root = {};
    const body = {};
    const view = {
        innerWidth: 100,
        innerHeight: 100,
        getComputedStyle(element) {
            return { backgroundColor: element === root || element === body ? color : "rgb(255, 255, 255)", colorScheme };
        },
    };
    return {
        documentElement: root,
        body,
        defaultView: view,
        styleSheets: [{ cssRules: rules }],
        querySelector(selector) {
            if (selector.includes("meta") && meta) return { getAttribute: () => meta };
            return selectors.includes(selector) ? {} : null;
        },
        querySelectorAll() { return controls; },
        elementFromPoint() { return null; },
    };
}

test("does not treat dark-mode capability as an active dark appearance", () => {
    const cornellLikePage = createDocument({
        color: "rgb(255, 255, 255)",
        meta: "light dark",
        colorScheme: "light dark",
        rules: [{ conditionText: "(prefers-color-scheme: dark)", cssRules: [] }],
    });
    assert.equal(detector.hasNativeDarkAppearance(cornellLikePage, "news.cornell.edu"), false);
});

test("detects a currently dark rendered surface without requiring inspectable CSS", () => {
    assert.equal(detector.hasNativeDarkAppearance(createDocument(), "example.com"), true);
});

test("known-site rules identify active YouTube dark mode", () => {
    const youtube = createDocument({ color: "rgb(255, 255, 255)", selectors: ["html[dark]"] });
    assert.equal(detector.hasNativeDarkAppearance(youtube, "www.youtube.com"), true);
});

test("dark color parsing remains conservative", () => {
    assert.equal(detector.isDarkColor("rgb(20, 20, 20)"), true);
    assert.equal(detector.isDarkColor("rgb(240, 240, 240)"), false);
});

test("a dark-mode control alone does not auto-exclude a light page", () => {
    const control = {
        textContent: "Dark",
        value: "",
        getAttribute() { return null; },
    };
    assert.equal(detector.hasNativeDarkAppearance(createDocument({ color: "rgb(255, 255, 255)", controls: [control] }), "example.com"), false);
});
