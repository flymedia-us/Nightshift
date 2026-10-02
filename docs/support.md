# Nightshift support

**Canonical support page:** <https://apps.flymedia.us/nightshift/support/>

For questions, bugs, or feature requests, email `contact@flymedia.us` or use [GitHub Issues](https://github.com/flymedia-us/Nightshift/issues).

Useful details for a bug report:

- macOS and Safari versions
- Nightshift version
- Website where the issue occurred
- Selected Nightshift mode
- What you expected and what happened

Nightshift cannot modify Safari's internal pages or other browser-protected pages. Some sites with complex graphics or an existing dark theme may look better with Nightshift disabled for that site.

Nightshift 1.0.11 and later recolors interface backgrounds, text, and borders without inverting the whole page. Background photos, image elements, videos, and canvas pixels keep their original appearance. Canvas-rendered document pages can remain light while the surrounding interface darkens. If a background photo still looks inverted, check the installed extension version in Safari Settings → Extensions and reload the page after updating.

Unsigned testing betas require **Safari Settings → Developer → Allow unsigned extensions** after every Safari restart. If Nightshift is absent after enabling that setting, keep Safari open and run `Repair Nightshift Safari Registration.command` from the beta ZIP. Replace the entire app bundle in Applications when updating. See [beta installation instructions](beta-installation.txt); a normal public release requires Developer ID signing, notarization, and stapling.
