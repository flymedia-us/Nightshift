// Repository-only, explicit promotion of the maintainer's personal exclusions.
// No extension build can call this script or publish preferences automatically.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import exporter from "../Nightshift Extension/Resources/exclusion-export.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileIndex = args.indexOf("--file");
if (fileIndex === -1 || !args[fileIndex + 1] || args.some((arg, index) => !["--apply", "--file"].includes(arg) && index !== fileIndex + 1)) {
    console.error("Usage: node Scripts/import-maintainer-exclusions.mjs --file <personal-export.txt> [--apply]\nWithout --apply, previews additions without writing files.");
    process.exit(1);
}

try {
    const source = fs.readFileSync(args[fileIndex + 1], "utf8").trim();
    let values;
    if (source.startsWith("{") || source.startsWith("[")) {
        const parsed = JSON.parse(source);
        values = Array.isArray(parsed) ? parsed : parsed.disabledSites;
        if (!Array.isArray(values)) throw new Error("JSON must contain a disabledSites array (manual exclusions only)");
    } else {
        values = source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
    }
    const sites = exporter.publicManualSites({ disabledSites: values });
    const configPath = path.join(root, "Config/manual-dark-sites.config");
    const config = fs.readFileSync(configPath, "utf8");
    const existing = new Set(config.split(/\r?\n/).map((line) => line.trim()));
    const additions = sites.filter((site) => !existing.has(site));
    console.log(`${apply ? "Import" : "Preview"}: ${additions.length} new public hosts; ${values.filter((value) => !exporter.publicHost(value)).length} local/IP/invalid entries omitted.`);
    for (const host of additions) console.log(`+ ${host}`);
    if (apply && additions.length) {
        fs.writeFileSync(configPath, `${config.trimEnd()}\n${additions.join("\n")}\n`);
        const generated = spawnSync(process.execPath, ["Scripts/generate-dark-site-registry.mjs"], { cwd: root, stdio: "inherit" });
        if (generated.status !== 0) {
            fs.writeFileSync(configPath, config);
            throw new Error("Registry generation failed; source config restored. Run npm run generate:dark-sites before packaging.");
        }
    }
    if (!apply) console.log("Review these hosts, then rerun with --apply to update the master list and generated registries.");
} catch (error) {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
}
