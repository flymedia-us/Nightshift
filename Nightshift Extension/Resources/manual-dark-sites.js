(function (globalScope) {
    "use strict";

    // GENERATED DATA: run npm run generate:dark-sites after updating
    // Config/manual-dark-sites.config.
    const patterns = Object.freeze([
    "drive.google.com",
    "facebook.com",
    "flymedia.us",
    "github.com",
    "macrumors.com",
    "tasks.google.com",
    "x.com",
    "4khdhub.one",
    "acermovies.fun",
    "app.clickup.com",
    "beta.keeweb.info",
    "bsky.app",
    "calendar.google.com",
    "chatgpt.com",
    "console.tailscale.com",
    "cornellseven.com",
    "en.wikipedia.org",
    "fmhy.net",
    "grok.com",
    "grokipedia.com",
    "instapaper.com",
    "photos.google.com",
    "robinhood.com",
    "teams.cloud.microsoft",
    "vault.bitwarden.com",
    "www.facebook.com",
    "www.instagram.com",
    "www.samfriedman.art"
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
