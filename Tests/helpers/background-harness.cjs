"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const resources = path.join(__dirname, "..", "..", "Nightshift Extension", "Resources");

function createHarness({ local = {}, fetchStylesheet } = {}) {
    const cache = structuredClone(local);
    const writes = [];
    const listeners = new Set();
    let listener;
    let failRead = false;
    let failWrite = false;
    const storage = {
        async get(defaults) {
            if (failRead) throw new Error("Storage unavailable");
            return Object.fromEntries(Object.entries(defaults).map(([key, value]) =>
                [key, structuredClone(key in cache ? cache[key] : value)]));
        },
        async set(value) {
            if (failWrite) throw new Error("Storage unavailable");
            const changes = Object.fromEntries(Object.entries(value).map(([key, newValue]) =>
                [key, { oldValue: structuredClone(cache[key]), newValue: structuredClone(newValue) }]));
            writes.push(structuredClone(value));
            Object.assign(cache, structuredClone(value));
            for (const receive of listeners) await receive(changes, "local");
        },
        async remove(keys) {
            const changes = {};
            for (const key of keys) {
                if (key in cache) changes[key] = { oldValue: cache[key] };
                delete cache[key];
            }
            for (const receive of listeners) await receive(changes, "local");
        },
    };
    const context = vm.createContext({
        URL, console, AbortController, fetch: fetchStylesheet, importScripts() {}, clearTimeout, setTimeout,
        browser: { storage: { local: storage }, runtime: { onMessage: { addListener(value) { listener = value; } } } },
    });
    for (const name of ["theme-policy.js", "background.js"]) {
        vm.runInContext(fs.readFileSync(path.join(resources, name), "utf8"), context);
    }
    return { cache, writes, storage,
        load: (sender) => listener({ type: "loadSettings" }, sender),
        update: (change) => listener({ type: "updateSettings", change }),
        loadStylesheet: (url) => listener({ type: "loadThemeStylesheet", url }),
        subscribe(receive) { listeners.add(receive); return () => listeners.delete(receive); },
        failReads(value) { failRead = value; }, failWrites(value) { failWrite = value; },
    };
}
module.exports = { createHarness };
