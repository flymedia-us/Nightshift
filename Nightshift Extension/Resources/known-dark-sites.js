(function (globalScope) {
    "use strict";

    // Compatibility rules are deliberately small. A host is never excluded merely
    // because it is listed here: every rule must prove that its dark appearance is
    // active in the current document.
    const RULES = Object.freeze([
        Object.freeze({
            hosts: Object.freeze(["www.youtube.com", "m.youtube.com"]),
            activeSelectors: Object.freeze(["html[dark]", "ytd-app[dark]", "body[dark]"]),
        }),
        Object.freeze({
            hosts: Object.freeze(["en.wikipedia.org", "www.wikipedia.org"]),
            activeSelectors: Object.freeze(["html.skin-theme-clientpref-night", "body.skin-theme-clientpref-night", "html[data-theme='dark']"]),
        }),
        Object.freeze({
            hosts: Object.freeze(["www.instagram.com"]),
            activeSelectors: Object.freeze(["html[data-theme='dark']", "body[data-theme='dark']"]),
        }),
        Object.freeze({
            hosts: Object.freeze(["www.theverge.com"]),
            activeSelectors: Object.freeze(["html[data-theme='dark']", "html.dark", "body.dark"]),
        }),
    ]);

    function activeRuleFor(host, document) {
        const normalizedHost = String(host ?? "").toLowerCase();
        const rule = RULES.find((candidate) => candidate.hosts.includes(normalizedHost));
        if (!rule) return false;
        return rule.activeSelectors.some((selector) => {
            try {
                return document.querySelector?.(selector) != null;
            } catch {
                return false;
            }
        });
    }

    const api = Object.freeze({ RULES, activeRuleFor });
    globalScope.NightshiftKnownDarkSites = api;
    if (typeof module === "object" && module.exports) module.exports = api;
}(typeof globalThis === "undefined" ? this : globalThis));
