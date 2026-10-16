"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const resources = path.join(__dirname, "..", "..", "Nightshift Extension", "Resources");
function createHarness({ local = {}, native, fetchStylesheet, timeout = 10 } = {}) {
    const cache = structuredClone(local);
    let listener;
    const messages = [];
    const writes = [];
    const context = vm.createContext({
        URL, console, AbortController, fetch: fetchStylesheet, crypto: { randomUUID }, importScripts() {}, clearTimeout,
        // Exercise the timeout branch without waiting five seconds per test.
        setTimeout(callback) { return setTimeout(callback, timeout); },
        browser: {
            storage: { local: {
                async get(defaults) { return { ...structuredClone(defaults), ...structuredClone(cache) }; },
                async set(value) { writes.push(structuredClone(value)); Object.assign(cache, structuredClone(value)); },
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
    return { cache, messages, writes, load: (sender) => listener({ type: "loadSettings" }, sender),
        update: (change) => listener({ type: "updateSettings", change }),
        loadStylesheet: (url) => listener({ type: "loadThemeStylesheet", url }) };
}

module.exports = { createHarness };
