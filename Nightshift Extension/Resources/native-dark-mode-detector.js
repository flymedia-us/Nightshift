(function (globalScope) {
    "use strict";

    // A site must provide both a native-dark-mode declaration and a dark rendered
    // surface. Either signal alone is too noisy to use as an automatic exclusion.
    const MAX_DARK_LUMINANCE = 0.35;

    function hasDarkToken(value) {
        return typeof value === "string" && /(^|\s)dark(\s|$)/i.test(value);
    }

    function hasDarkColorScheme(document) {
        const meta = document.querySelector?.('meta[name="color-scheme" i]');
        if (hasDarkToken(meta?.getAttribute("content"))) return true;
        return hasDarkToken(document.defaultView?.getComputedStyle?.(document.documentElement).colorScheme);
    }

    function ruleTreeHasDarkScheme(rules) {
        for (const rule of rules) {
            if (typeof rule.conditionText === "string" && /prefers-color-scheme\s*:\s*dark/i.test(rule.conditionText)) return true;
            if (rule.cssRules && ruleTreeHasDarkScheme(rule.cssRules)) return true;
        }
        return false;
    }

    function hasDarkSchemeRule(document) {
        for (const stylesheet of [...(document.styleSheets ?? [])]) {
            try {
                if (ruleTreeHasDarkScheme(stylesheet.cssRules)) return true;
            } catch {
                // Cross-origin stylesheets are intentionally unreadable. Their
                // presence alone is not enough evidence to auto-exclude a site.
            }
        }
        return false;
    }

    function parseColor(color) {
        const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(color);
        if (rgb) return rgb.slice(1).map(Number);
        const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color);
        if (!hex) return null;
        return hex[1].length === 3
            ? [...hex[1]].map((part) => Number.parseInt(part + part, 16))
            : [hex[1].slice(0, 2), hex[1].slice(2, 4), hex[1].slice(4, 6)].map((part) => Number.parseInt(part, 16));
    }

    function isDarkColor(color) {
        const rgb = parseColor(color);
        if (!rgb) return false;
        const [red, green, blue] = rgb.map((channel) => channel / 255);
        const linear = [red, green, blue].map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
        return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]) <= MAX_DARK_LUMINANCE;
    }

    function hasDarkSurface(document) {
        const candidates = [document.documentElement, document.body];
        const width = document.defaultView?.innerWidth ?? 0;
        const height = document.defaultView?.innerHeight ?? 0;
        for (const point of [[1, 1], [Math.floor(width / 2), Math.floor(height / 2)]]) {
            const element = document.elementFromPoint?.(...point);
            if (element) candidates.push(element);
        }
        return candidates.some((element) => isDarkColor(document.defaultView?.getComputedStyle?.(element).backgroundColor));
    }

    function hasNativeDarkMode(document) {
        return hasDarkSurface(document) && (hasDarkColorScheme(document) || hasDarkSchemeRule(document));
    }

    const api = Object.freeze({ hasNativeDarkMode, hasDarkColorScheme, hasDarkSchemeRule, hasDarkSurface, isDarkColor });
    globalScope.NightshiftNativeDarkModeDetector = api;
    if (typeof module === "object" && module.exports) module.exports = api;
}(typeof globalThis === "undefined" ? this : globalThis));
