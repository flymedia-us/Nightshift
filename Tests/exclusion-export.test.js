"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const exporter = require("../Nightshift Extension/Resources/exclusion-export.js");

test("maintainer exports public domains, preserving exact subdomains and stripping ports", () => {
    assert.deepEqual(exporter.publicManualSites({
        disabledSites: ["https://APP.ClickUp.com:8443/path?q=private", "www\\.samfriedman.art\\", "app.clickup.com", "bücher.de", "example.com.evil.org"],
        autoDisabledSites: ["youtube.com"], enabledSites: ["github.com"],
    }), ["app.clickup.com", "example.com.evil.org", "www.samfriedman.art", "xn--bcher-kva.de"]);
});

test("maintainer exports reject IPs, local namespaces, invalid addresses, and credentials", () => {
    for (const host of ["192.168.50.249:8000", "127.1", "2130706433", "0x7f000001", "8.8.8.8", "[::1]:3000", "[2001:db8::1]", "localhost", "foo.localhost:8000", "nas.local", "host.internal", "host.home.arpa", "router.lan", "sample.test", "example.org", "foo.example.com", "private.invalid", "printer", "file:///private/local", "https://user:password@github.com", "*.google.com", "bad_host.org", "<script>", null]) {
        assert.equal(exporter.publicHost(host), "", String(host));
    }
});

test("maintainer import previews, applies, and regenerates idempotently in an isolated repository", () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "nightshift-maintainer-"));
    const root = path.join(__dirname, "..");
    try {
        for (const file of ["Scripts/import-maintainer-exclusions.mjs", "Scripts/generate-dark-site-registry.mjs", "Config/manual-dark-sites.config", "Vendor/DarkReader/dark-sites.config", "Vendor/DarkReader/detector-hints.config", "Nightshift Extension/Resources/known-dark-sites.js", "Nightshift Extension/Resources/exclusion-export.js"]) {
            fs.mkdirSync(path.dirname(path.join(temporary, file)), { recursive: true });
            fs.copyFileSync(path.join(root, file), path.join(temporary, file));
        }
        const config = path.join(temporary, "Config/manual-dark-sites.config");
        const original = fs.readFileSync(config, "utf8");
        const input = path.join(temporary, "personal.json");
        fs.writeFileSync(input, JSON.stringify({ disabledSites: ["https://new.publicdomain.org:8443/private", "192.168.50.249:8000", "new.publicdomain.org"], autoDisabledSites: ["never-promote.org"] }));
        const run = (...args) => spawnSync(process.execPath, [path.join(temporary, "Scripts/import-maintainer-exclusions.mjs"), "--file", input, ...args], { encoding: "utf8" });
        const preview = run();
        assert.equal(preview.status, 0, preview.stderr);
        assert.match(preview.stdout, /Preview: 1 new public hosts; 1 local/);
        assert.equal(fs.readFileSync(config, "utf8"), original);
        const imported = run("--apply");
        assert.equal(imported.status, 0, imported.stderr);
        assert.equal(fs.readFileSync(config, "utf8"), `${original.trimEnd()}\nnew.publicdomain.org\n`);
        const generated = require(path.join(temporary, "Nightshift Extension/Resources/manual-dark-sites.js"));
        assert.ok(generated.PATTERNS.includes("new.publicdomain.org"));
        assert.ok(!generated.PATTERNS.includes("192.168.50.249:8000"));
        assert.ok(!generated.PATTERNS.includes("never-promote.org"));
        assert.match(run("--apply").stdout, /0 new public hosts/);
        fs.writeFileSync(input, '{"autoDisabledSites":["never-promote.org"]}');
        assert.equal(run("--apply").status, 1);
        assert.equal(fs.readFileSync(config, "utf8"), `${original.trimEnd()}\nnew.publicdomain.org\n`);
    } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
    }
});
