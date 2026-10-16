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

Nightshift 1.0.11 and later recolors interface backgrounds, text, and borders without inverting the whole page. Background photos, image elements, videos, and ordinary canvas pixels keep their original appearance. Google Docs and Sheets use a narrowly scoped screen-only treatment for editor tiles, giving text and cells light-on-gray contrast without rewriting saved formatting. If a background photo still looks inverted, check the installed extension version in Safari Settings → Extensions and reload the page after updating.

Unsigned testing betas require **Safari Settings → Developer → Allow unsigned extensions** after every Safari restart. If Nightshift is absent after enabling that setting, keep Safari open and run `Repair Nightshift Safari Registration.command` from the beta ZIP. Replace the entire app bundle in Applications when updating. See [beta installation instructions](beta-installation.txt); a normal public release requires Developer ID signing, notarization, and stapling.

Nightshift requires macOS 13.7.7 or later and Safari 18.6 or later. Enable the extension and website permissions in each Safari profile you use. Appearance and site preferences are saved on this Mac and shared across enabled profiles. An already-open page refreshes when you return to it, or within 15 seconds while visible. If the native service is temporarily unavailable, changes remain saved in that profile and the popup reports that sharing will retry.
