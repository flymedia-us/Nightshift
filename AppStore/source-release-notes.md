# Nightshift 1.0.20 — App Store launch preparation

Pre-launch source snapshot for the upcoming Mac App Store release. Official public binaries will be distributed exclusively through the Mac App Store. This source release has no official app, ZIP, or DMG downloads.

- Always Light, Always Dark, and System appearance controls in both the toolbar popup and settings.
- Popup and settings appearance follow the saved Nightshift mode, with Apple's filled settings cog and a shortcut to the same settings page.
- Four distinct exclusion sources: Dark Reader compatibility patterns, maintainer-reviewed Nightshift sites, known site-theme markers, and each user's manual exclusions.
- Explicit public-domain export for optional maintainer review; local addresses and IPs stay out of exports and bundled master imports.
- Safari-owned persistent extension storage, separately for each profile. Native cross-profile sync, polling, messaging, and retry journals have been removed.
- CSS surface/text/border themes preserve ordinary photos and media. Google Docs/Sheets use narrowly scoped screen-only contrast treatment without rewriting saved document formatting.

Requires macOS 13.7.7 or later and Safari 18.6 or later, on Apple silicon or Intel.

Validation: 69 Node tests, 28 WebKit tests, three packaging regressions, universal build/archive/export, package/signature/resource verification, and installed Safari 27 upgrade/profile/restart/popup/Docs/Sheets checks. Hosted CI passed all five jobs for the final app source. Coverage limits and site compatibility findings are recorded in the repository's verification report.

App Store preparation is complete except for the owner's screenshots. The app is not yet submitted or publicly released. Marketing: https://apps.flymedia.us/nightshift/
