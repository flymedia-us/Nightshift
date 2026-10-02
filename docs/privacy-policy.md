# Privacy Policy — Nightshift

**Canonical policy:** <https://apps.flymedia.us/nightshift/privacy/>

This file is a technical summary and pointer rather than a second legally operative copy.

## Technical summary

Nightshift does not create accounts, collect personal data, include analytics or advertising SDKs, or transmit browsing history to Fly Media or any third party.

The Safari extension requires access to ordinary HTTP and HTTPS webpages so it can recolor interface backgrounds, text, and borders. Safari controls that permission, and the user can limit or revoke it in Safari Settings at any time. The extension reads the current website's host name to support its per-site enable/disable setting. Native-dark exclusions use the bundled compatibility registry and its known theme selectors, rather than arbitrary rendered-color detection.

Nightshift bundles its theme engine locally. It does not download or execute remote JavaScript. The engine reads webpage styles and can retrieve stylesheets from the website or its stylesheet providers to recolor cross-origin CSS. Those cross-origin stylesheet requests omit cookies; they do not send browsing history or preferences to Fly Media. Background-image analysis and image inversion are disabled.

Appearance mode and site preferences are stored on the Mac in a shared native settings store, with Safari extension storage caches for each profile. They are not sent to Fly Media.

The companion app uses SafariServices only to open Safari's extension settings. It makes no network requests.
