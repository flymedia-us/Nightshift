(function (globalScope) {
    "use strict";

    // Capability is not appearance: a light page may advertise a dark theme. The
    // decision to exclude Nightshift must be based on the current rendering.
    const MAX_DARK_LUMINANCE = 0.35;
    const MIN_DARK_SAMPLE_RATIO = 0.6;

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

    function hasDarkModeControl(document) {
        const controls = document.querySelectorAll?.('button, input[type="checkbox"], input[type="radio"], [role="switch"], [role="menuitemradio"]') ?? [];
        return [...controls].some((control) => {
            const label = [
                control.textContent,
                control.value,
                control.getAttribute?.("aria-label"),
                control.getAttribute?.("title"),
            ].filter(Boolean).join(" ");
            return /\bdark\b/i.test(label);
        });
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

    function backgroundColorFor(element, document) {
        let candidate = element;
        while (candidate) {
            const color = document.defaultView?.getComputedStyle?.(candidate).backgroundColor;
            if (parseColor(color)) return color;
            candidate = candidate.parentElement;
        }
        return "";
    }

    function hasDarkSurface(document) {
        const width = document.defaultView?.innerWidth ?? 0;
        const height = document.defaultView?.innerHeight ?? 0;
        const points = [
            [1, 1],
            [Math.floor(width * 0.2), Math.floor(height * 0.2)],
            [Math.floor(width * 0.8), Math.floor(height * 0.2)],
            [Math.floor(width / 2), Math.floor(height / 2)],
            [Math.floor(width / 2), Math.floor(height * 0.8)],
        ];
        const samples = [];
        for (const point of points) {
            const element = document.elementFromPoint?.(...point);
            if (element) samples.push(backgroundColorFor(element, document));
        }
        if (samples.length === 0) {
            samples.push(backgroundColorFor(document.body, document), backgroundColorFor(document.documentElement, document));
        }
        const usableSamples = samples.filter((color) => parseColor(color));
        return usableSamples.length > 0 && usableSamples.filter(isDarkColor).length / usableSamples.length >= MIN_DARK_SAMPLE_RATIO;
    }

    function hasNativeDarkAppearance(document, host) {
        if (globalScope.NightshiftKnownDarkSites?.activeRuleFor(host, document)) return true;
        return hasDarkSurface(document);
    }

    const api = Object.freeze({ hasNativeDarkAppearance, hasDarkColorScheme, hasDarkModeControl, hasDarkSchemeRule, hasDarkSurface, isDarkColor });
    globalScope.NightshiftNativeDarkModeDetector = api;
    if (typeof module === "object" && module.exports) module.exports = api;
}(typeof globalThis === "undefined" ? this : globalThis));
