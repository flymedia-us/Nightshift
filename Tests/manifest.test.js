"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const resourceDirectory = path.join(__dirname, "..", "Nightshift Extension", "Resources");
const manifest = JSON.parse(fs.readFileSync(path.join(resourceDirectory, "manifest.json"), "utf8"));

test("manifest declares the expected Safari Web Extension entry points", () => {
    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.action.default_popup, "popup.html");
    assert.equal(manifest.icons["512"], "icon-512.png");
    assert.equal(manifest.action.default_icon["16"], "toolbar-16.png");
    assert.deepEqual(manifest.permissions.sort(), ["activeTab", "storage"]);
    assert.deepEqual(manifest.host_permissions.sort(), ["http://*/*", "https://*/*"]);
});

test("every local resource referenced by the manifest exists", () => {
    const referencedResources = [
        manifest.action.default_popup,
        ...Object.values(manifest.icons),
        ...Object.values(manifest.action.default_icon),
        ...manifest.content_scripts.flatMap((script) => [...script.js, ...script.css]),
    ];

    for (const resource of referencedResources) {
        assert.equal(fs.existsSync(path.join(resourceDirectory, resource)), true, `${resource} is missing`);
    }
});
