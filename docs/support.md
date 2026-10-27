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

Official Nightshift installations and updates are distributed exclusively through the Mac App Store. The source code remains public for developers who want to build it themselves. Historical private testing builds are not a public download channel.

Nightshift requires macOS 13.7.7 or later and Safari 18.6 or later. Enable the extension and website permissions in each Safari profile you use. Appearance and manual exclusions are saved in Safari’s persistent extension storage, separately for each profile. Changes update open pages within that profile through Safari storage events. Preferences survive restarting Safari and normal app updates; Nightshift does not sync them between profiles or devices.

Click the **settings icon** at the top right of the Nightshift toolbar popup to control the global appearance, followed by four sections under Excluded websites: your manual exclusions, auto-detected exclusions, Nightshift's bundled list, and Dark Reader's bundled list. Auto-detection uses known site-specific theme markers and rechecks them on each page. If a detection is incorrect, click **Override**. To override a bundled entry, enable Nightshift on that site in the popup. Under **Websites you explicitly enabled**, **Use automatic rules** restores normal list/detection behavior. Manual exclusions always take priority.

The Nightshift popup and settings page follow Nightshift’s own appearance selection. **Always Dark** makes both dark even on a light Mac, **Always Light** makes both light, and **System** follows changes to the Mac’s appearance.
