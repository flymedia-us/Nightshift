"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm, readFile } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createHarness } = require("../helpers/background-harness.cjs");

function nativeRequest(directory, message) {
    return new Promise((resolve, reject) => {
        const child = spawn(path.resolve(".build/native-tests/settings-tests"), ["--request", directory]);
        let output = "";
        let errors = "";
        child.stdout.on("data", (data) => { output += data; });
        child.stderr.on("data", (data) => { errors += data; });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code !== 0) reject(new Error(`Native store failed (${code}): ${errors}`));
            else {
                try { resolve(JSON.parse(output)); } catch (error) { reject(error); }
            }
        });
        child.stdin.end(JSON.stringify(message));
    });
}

test("Safari profile workers persist, merge, migrate, and retry through the real Swift store", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "nightshift-bridge-"));
    try {
        const native = (message) => nativeRequest(directory, message);
        const first = createHarness({ timeout: 5000, native });
        const second = createHarness({ timeout: 5000, native });
        await Promise.all([first.load(), second.load()]);
        await Promise.all([
            first.update({ type: "setSiteEnabled", host: "one.example", enabled: false }),
            second.update({ type: "setSiteEnabled", host: "two.example", enabled: false }),
        ]);
        await second.update({ type: "setGlobalMode", mode: "dark" });
        await first.load();
        assert.deepEqual(first.cache.disabledSites, ["one.example", "two.example"]);
        assert.equal(first.cache.globalMode, "dark");

        // Process and background-worker restarts must recover from disk, even
        // with no WebExtension cache at all.
        const cold = createHarness({ timeout: 5000, native });
        await cold.load();
        assert.deepEqual(cold.cache.disabledSites, ["one.example", "two.example"]);
        assert.equal(cold.cache.globalMode, "dark");
        await cold.update({ type: "removeExcludedSite", host: "one.example" });

        const stale = createHarness({ timeout: 5000, native, local: { disabledSites: ["one.example", "old.example"] } });
        await stale.load();
        assert.deepEqual(stale.cache.disabledSites, ["old.example", "two.example"]);
        assert.ok(stale.cache.enabledSites.includes("one.example"));

        // Simulate a lost acknowledgement AFTER native persistence. Replaying
        // the durable intent must not undo a newer edit from another profile.
        const lostAck = createHarness({ timeout: 5000, local: first.cache, native: async (message) => {
            await native(message);
            return null;
        } });
        const pending = await lostAck.update({ type: "setSiteEnabled", host: "retry.example", enabled: false });
        assert.equal(pending.syncPending, true);
        assert.equal(lostAck.cache.pendingSettingsChanges.length, 1);
        await second.update({ type: "setSiteEnabled", host: "retry.example", enabled: true });
        const restarted = createHarness({ timeout: 5000, local: lostAck.cache, native });
        await restarted.load();
        assert.deepEqual(restarted.cache.pendingSettingsChanges, []);
        assert.ok(!restarted.cache.disabledSites.includes("retry.example"));
        assert.ok(restarted.cache.enabledSites.includes("retry.example"));

        const before = await readFile(path.join(directory, "settings.json"), "utf8");
        const writes = restarted.writes.length;
        await restarted.load();
        assert.equal(await readFile(path.join(directory, "settings.json"), "utf8"), before);
        assert.equal(restarted.writes.length, writes, "An unchanged refresh must not rewrite profile storage");
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
