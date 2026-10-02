(function () {
    "use strict";

    const engine = globalThis.DarkReader;
    const extensionAPI = globalThis.browser ?? globalThis.chrome;
    const theme = {
        mode: 1,
        brightness: 100,
        contrast: 100,
        sepia: 0,
        grayscale: 0,
        darkSchemeBackgroundColor: "#202124",
        darkSchemeTextColor: "#e8eaed",
    };
    const fixes = {
        invert: [],
        // Preserve photographs and sprites, including inline images and CSS
        // variables. Ordinary CSS surface and text colors are recolored.
        ignoreImageAnalysis: ["*"],
        ignoreInlineStyle: ["svg", "svg *"],
        // Content scripts run in an isolated world; use DOM observers instead
        // of patching page APIs through an injected inline script.
        disableStyleSheetsProxy: true,
        disableCustomElementRegistryProxy: true,
    };

    engine.setFetchMethod(async (value) => {
        const url = new URL(value, window.location.href);
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("Nightshift only loads web stylesheets.");
        }
        const result = await extensionAPI.runtime.sendMessage({ type: "loadThemeStylesheet", url: url.href });
        if (typeof result?.css !== "string") {
            throw new Error(result?.error ?? "Nightshift couldn't load a stylesheet.");
        }
        return new Response(result.css, { headers: { "Content-Type": "text/css" } });
    });

    globalThis.NightshiftThemeEngine = {
        setActive(active) {
            // Settings acknowledgements can repeat. Do not rebuild observers
            // and styles when the requested state has not changed.
            if (active === engine.isEnabled()) return;
            if (active) engine.enable(theme, fixes);
            else engine.disable();
        },
    };
}());
