import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.dirname(scriptDirectory);
const vendorDirectory = path.join(repositoryDirectory, "Vendor", "DarkReader");
const manualConfigPath = path.join(repositoryDirectory, "Config", "manual-dark-sites.config");
const outputPath = path.join(repositoryDirectory, "Nightshift Extension", "Resources", "known-dark-sites.js");
const manualOutputPath = path.join(repositoryDirectory, "Nightshift Extension", "Resources", "manual-dark-sites.js");

function readSource(fileName) {
    return fs.readFileSync(path.join(vendorDirectory, fileName), "utf8");
}

function readLines(filePath) {
    return fs.readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));
}

function readBlocks(fileName) {
    return readSource(fileName)
        .split(/^={8,}$/m)
        .map((block) => block
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean))
        .filter((block) => block.length > 0);
}

function combineSelector(target, match) {
    if (match === "*") return target;
    if (/^[.#[:*]/.test(match)) return `${target}${match}`;
    if (/^[\w-]+="[^\"]+"$/.test(match)) return `${target}[${match}]`;
    return `${target} ${match}`;
}

function parseDetectorHints() {
    const activeRules = [];
    const systemThemePatterns = [];
    const noDarkThemePatterns = [];

    for (const block of readBlocks("detector-hints.config")) {
        const directiveIndex = block.findIndex((line) => ["TARGET", "SYSTEM THEME", "NO DARK THEME"].includes(line));
        const patterns = directiveIndex === -1 ? block : block.slice(0, directiveIndex);
        const directive = block[directiveIndex];

        if (directive === "SYSTEM THEME") {
            systemThemePatterns.push(...patterns);
            continue;
        }
        if (directive === "NO DARK THEME") {
            noDarkThemePatterns.push(...patterns);
            continue;
        }
        if (directive !== "TARGET") continue;

        const target = block[directiveIndex + 1];
        const matchIndex = block.indexOf("MATCH", directiveIndex + 2);
        if (!target || matchIndex === -1) continue;

        const matches = block.slice(matchIndex + 1).filter((line) => line !== "IFRAME");
        activeRules.push({
            patterns,
            selectors: matches.map((match) => combineSelector(target, match)),
        });
    }

    return { activeRules, systemThemePatterns, noDarkThemePatterns };
}

function replaceConstant(source, name, value) {
    const pattern = new RegExp(`const ${name} = Object\\.freeze\\([\\s\\S]*?\\);`);
    const replacement = `const ${name} = Object.freeze(${JSON.stringify(value, null, 4)});`;
    if (!pattern.test(source)) throw new Error(`Could not find ${name} in generated registry`);
    return source.replace(pattern, replacement);
}

const detectorHints = parseDetectorHints();
const importedDarkSitePatterns = readLines(path.join(vendorDirectory, "dark-sites.config"));
const manualDarkSitePatterns = readLines(manualConfigPath);
const darkSitePatterns = [...new Set([...importedDarkSitePatterns, ...manualDarkSitePatterns])];
const manualModule = [
    "(function (globalScope) {",
    '    "use strict";',
    "",
    "    // GENERATED DATA: run npm run generate:dark-sites after updating",
    "    // Config/manual-dark-sites.config.",
    `    const patterns = Object.freeze(${JSON.stringify(manualDarkSitePatterns, null, 4)});`,
    "    const api = Object.freeze({",
    "        PATTERNS: patterns,",
    "        matches(value) {",
    '            const host = String(value?.hostname || value?.host || value || "")',
    "                .toLowerCase()",
    "                .replace(/^https?:\\/\\//, \"\")",
    "                .split(/[/?#]/, 1)[0]",
    "                .replace(/:\\d+$/, \"\")",
    "                .replace(/\\.$/, \"\");",
    '            return patterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`));',
    "        },",
    "    });",
    "    globalScope.NightshiftManualDarkSites = api;",
    '    if (typeof module === "object" && module.exports) module.exports = api;',
    "}(typeof globalThis === \"undefined\" ? this : globalThis));",
    "",
].join("\n");
fs.writeFileSync(manualOutputPath, manualModule);
let generated = fs.readFileSync(outputPath, "utf8");
generated = replaceConstant(generated, "IMPORTED_DARK_SITE_PATTERNS", importedDarkSitePatterns);
generated = replaceConstant(generated, "MANUAL_DARK_SITE_PATTERNS", manualDarkSitePatterns);
generated = replaceConstant(generated, "DARK_SITE_PATTERNS", darkSitePatterns);
generated = replaceConstant(generated, "ACTIVE_RULES", detectorHints.activeRules);
generated = replaceConstant(generated, "SYSTEM_THEME_PATTERNS", detectorHints.systemThemePatterns);
generated = replaceConstant(generated, "NO_DARK_THEME_PATTERNS", detectorHints.noDarkThemePatterns);
fs.writeFileSync(outputPath, generated);

console.log(`Generated ${outputPath}`);
console.log(`Generated ${manualOutputPath}`);
console.log(`Imported Dark Reader patterns: ${importedDarkSitePatterns.length}`);
console.log(`Manual Nightshift patterns: ${manualDarkSitePatterns.length}`);
console.log(`Combined dark-by-default patterns: ${darkSitePatterns.length}`);
console.log(`Active detector rules: ${detectorHints.activeRules.length}`);
console.log(`System-theme patterns: ${detectorHints.systemThemePatterns.length}`);
console.log(`No-dark-theme patterns: ${detectorHints.noDarkThemePatterns.length}`);
