(function (globalScope) {
    "use strict";

    // GENERATED DATA: run npm run generate:dark-sites after updating
    // Config/manual-dark-sites.config.
    const patterns = Object.freeze([
    "drive.google.com"
]);
    const api = Object.freeze({
        PATTERNS: patterns,
        matches(value) {
            const host = String(value?.hostname || value?.host || value || "")
                .toLowerCase()
                .replace(/^https?:\/\//, "")
                .split(/[/?#]/, 1)[0]
                .replace(/:\d+$/, "")
                .replace(/\.$/, "");
            return patterns.some((pattern) => host === pattern || host.endsWith(`.${pattern}`));
        },
    });
    globalScope.NightshiftManualDarkSites = api;
    if (typeof module === "object" && module.exports) module.exports = api;
}(typeof globalThis === "undefined" ? this : globalThis));
