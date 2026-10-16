"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const metadataDirectory = path.join(__dirname, "..", "AppStore", "metadata", "en-US");

function read(name) {
    return fs.readFileSync(path.join(metadataDirectory, name), "utf8").trim();
}

test("App Store text fits Apple's field limits", () => {
    assert.ok(read("name.txt").length <= 30);
    assert.ok(read("subtitle.txt").length <= 30);
    assert.ok(read("promotional_text.txt").length <= 170);
    assert.ok(read("description.txt").length <= 4_000);
    assert.ok(Buffer.byteLength(read("keywords.txt"), "utf8") <= 100);
    assert.ok(read("release_notes.txt").length <= 4_000);
    assert.ok(Buffer.byteLength(read("review_notes.txt"), "utf8") <= 4_000);
});

test("keywords are relevant, unique, and formatted for App Store Connect", () => {
    const keywords = read("keywords.txt").split(",");
    assert.ok(keywords.every((keyword) => keyword.length > 2));
    assert.equal(new Set(keywords).size, keywords.length);
    assert.equal(keywords.includes("Nightshift"), false);
    assert.equal(keywords.includes("Fly Media"), false);
});

test("planned public listing URLs are HTTPS Fly Media URLs", () => {
    const urls = [...read("urls.txt").matchAll(/https:\/\/\S+/g)].map(([url]) => url);
    assert.equal(urls.length, 3);
    assert.ok(urls.every((url) => new URL(url).hostname === "apps.flymedia.us"));
});

test("submission metadata, generated project, and web manifest agree on the delivered version", () => {
    const root = path.join(__dirname, "..");
    const project = fs.readFileSync(path.join(root, "project.yml"), "utf8");
    const version = project.match(/MARKETING_VERSION: "([^"]+)"/)[1];
    const build = project.match(/CURRENT_PROJECT_VERSION: "([^"]+)"/)[1];
    const generated = fs.readFileSync(path.join(root, "Nightshift.xcodeproj/project.pbxproj"), "utf8");
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "Nightshift Extension/Resources/manifest.json"), "utf8"));
    assert.equal(manifest.version, version);
    assert.ok(generated.includes(`MARKETING_VERSION = ${version};`));
    assert.ok(generated.includes(`CURRENT_PROJECT_VERSION = ${build};`));
    const handoff = fs.readFileSync(path.join(root, "AppStore/app-store-connect.md"), "utf8");
    assert.ok(handoff.includes(`currently \`${version}\`, build \`${build}\``));
});
