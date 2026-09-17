"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const detector = require("../Nightshift Extension/Resources/native-dark-mode-detector.js");

function createDocument({ color = "rgb(20, 20, 20)", meta = "", colorScheme = "normal", rules = [] } = {}) {
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
            return selector.includes("meta") && meta ? { getAttribute: () => meta } : null;
        },
        elementFromPoint() { return null; },
    };
}

test("detects a dark surface with an explicit color-scheme declaration", () => {
    assert.equal(detector.hasNativeDarkMode(createDocument({ meta: "light dark" })), true);
    assert.equal(detector.hasNativeDarkMode(createDocument({ color: "rgb(255, 255, 255)", meta: "dark" })), false);
});

test("detects a dark surface with an accessible prefers-color-scheme rule", () => {
    const rules = [{ conditionText: "(prefers-color-scheme: dark)", cssRules: [] }];
    assert.equal(detector.hasNativeDarkMode(createDocument({ rules })), true);
});

test("does not infer native support from a dark surface alone", () => {
    assert.equal(detector.hasNativeDarkMode(createDocument()), false);
    assert.equal(detector.isDarkColor("rgb(20, 20, 20)"), true);
    assert.equal(detector.isDarkColor("rgb(240, 240, 240)"), false);
});
