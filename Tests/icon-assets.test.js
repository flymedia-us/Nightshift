"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.join(__dirname, "..");

function pngDimensions(file) {
    const data = fs.readFileSync(file);
    assert.equal(data.subarray(1, 4).toString("ascii"), "PNG", `${file} is not a PNG`);
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test("Safari extension icons have every manifest size", () => {
    const resourceDirectory = path.join(repositoryRoot, "Nightshift Extension", "Resources");
    const manifest = JSON.parse(fs.readFileSync(path.join(resourceDirectory, "manifest.json"), "utf8"));
    const icons = { ...manifest.icons, ...manifest.action.default_icon };

    for (const [size, filename] of Object.entries(icons)) {
        assert.deepEqual(pngDimensions(path.join(resourceDirectory, filename)), [Number(size), Number(size)]);
    }
});

test("the macOS app icon is an Icon Composer document", () => {
    const iconDirectory = path.join(repositoryRoot, "Nightshift", "Nightshift.icon");
    const icon = JSON.parse(fs.readFileSync(path.join(iconDirectory, "icon.json"), "utf8"));
    const project = fs.readFileSync(path.join(repositoryRoot, "project.yml"), "utf8");

    assert.match(project, /ASSETCATALOG_COMPILER_APPICON_NAME: Nightshift/);
    assert.equal(icon.groups.length, 1);
    assert.equal(icon.groups[0].layers.length, 1);
    assert.equal(icon.groups[0].layers[0]["image-name"], "IconComposer-Crescent-1024.png");
    assert.deepEqual(
        pngDimensions(path.join(iconDirectory, "Assets", "IconComposer-Crescent-1024.png")),
        [1024, 1024],
    );
});
