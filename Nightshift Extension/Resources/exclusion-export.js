(function (globalScope) {
    "use strict";

    // Shared by the settings export and the repository-only maintainer import.
    // Never resolve DNS or transmit the user's exclusions.
    function publicHost(value) {
        if (typeof value !== "string") return "";
        const input = value.trim().replace(/\\\./g, ".").replace(/\\$/, "");
        if (!input) return "";
        try {
            const url = new URL(input.includes("://") ? input : `https://${input}`);
            if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return "";
            const host = url.hostname.toLowerCase().replace(/\.$/, "");
            // Omit all IP literals (including numeric/hex IPv4 normalized by URL),
            // single-label LAN names, and reserved/local DNS namespaces.
            if (host.length > 253 || /^[\d.]+$/.test(host) || host.includes(":")) return "";
            const labels = host.split(".");
            if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return "";
            if (["localhost", "local", "lan", "home", "internal", "invalid", "test", "example", "onion", "arpa"].includes(labels.at(-1))) return "";
            if (/^(?:.+\.)?(?:example\.(?:com|net|org)|home\.arpa)$/.test(host)) return "";
            return host;
        } catch {
            return "";
        }
    }

    function publicManualSites(settings) {
        return [...new Set((settings.disabledSites ?? []).map(publicHost).filter(Boolean))].sort();
    }

    const api = Object.freeze({ publicHost, publicManualSites });
    globalScope.NightshiftExclusionExport = api;
    if (typeof module === "object" && module.exports) module.exports = api;
}(typeof globalThis === "undefined" ? this : globalThis));
