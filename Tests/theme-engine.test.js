"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../Nightshift Extension/Resources/theme-engine.js"), "utf8");

function harness() {
    let active = false;
    let fetchMethod;
    const calls = [];
    const context = vm.createContext({
        URL, Response, window: { location: { href: "https://example.com/" } },
        browser: { runtime: { async sendMessage(message) {
            calls.push(message);
            return { css: "body { color: black; }" };
        } } },
        DarkReader: {
            setFetchMethod(value) { fetchMethod = value; },
            isEnabled: () => active,
            enable(theme, fixes) { active = true; calls.push({ theme, fixes }); },
            disable() { active = false; calls.push("disabled"); },
        },
    });
    vm.runInContext(source, context);
    return { engine: context.NightshiftThemeEngine, calls, fetch: (url) => fetchMethod(url) };
}

test("dynamic darkening preserves all images and avoids restarting on repeated settings", () => {
    const { engine, calls } = harness();
    engine.setActive(false);
    assert.equal(calls.length, 0);
    engine.setActive(true);
    engine.setActive(true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].theme.mode, 1);
    assert.deepEqual([...calls[0].fixes.invert], []);
    assert.deepEqual([...calls[0].fixes.ignoreImageAnalysis], ["*"]);
    engine.setActive(false);
    assert.equal(calls.at(-1), "disabled");
});

test("cross-origin CSS uses extension transport and rejects unsupported schemes", async () => {
    const { fetch, calls } = harness();
    assert.equal(await (await fetch("/theme.css")).text(), "body { color: black; }");
    assert.equal(calls[0].url, "https://example.com/theme.css");
    await assert.rejects(fetch("file:///etc/hosts"), /web stylesheets/);
    assert.equal(calls.length, 1);
});
