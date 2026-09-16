# Nightshift 1.0 — App Store Connect handoff

This is the source of truth for the first public Mac App Store submission. It intentionally excludes screenshots; see [`screenshots/README.md`](screenshots/README.md) for the manual capture plan.

## App record

- **Platform:** macOS
- **App name:** Nightshift for Safari
- **Bundle ID:** `com.FlyMedia.Nightshift`
- **SKU:** `FM-NIGHTSHIFT-MAC`
- **Primary language:** English (U.S.)
- **Primary category:** Utilities
- **Secondary category:** None
- **Copyright:** `© 2026 Fly Media LLC. Original work © 2020 Aleksei Maslakov.`
- **Content rights:** Nightshift does not bundle, redistribute, or present third-party website content in its own interface. It applies local appearance styling to pages the user opens in Safari. Review this declaration against the final App Store Connect prompt before saving it.
- **License agreement:** Apple standard EULA; do not add a custom EULA.

## Version 1.0 metadata — English (U.S.)

The exact field values are the text files in [`metadata/en-US/`](metadata/en-US/):

- [`name.txt`](metadata/en-US/name.txt)
- [`subtitle.txt`](metadata/en-US/subtitle.txt)
- [`promotional_text.txt`](metadata/en-US/promotional_text.txt)
- [`description.txt`](metadata/en-US/description.txt)
- [`keywords.txt`](metadata/en-US/keywords.txt)
- [`release_notes.txt`](metadata/en-US/release_notes.txt)
- [`review_notes.txt`](metadata/en-US/review_notes.txt)
- [`urls.txt`](metadata/en-US/urls.txt)

Set version to `1.0.0` and select the uploaded build whose short version and build number match the archive. Use the attached release notes only for a later update; Apple does not require “What’s New” copy for the first version.

## Price, availability, and release

- **Price:** Free in every storefront.
- **In-app purchases and subscriptions:** None.
- **Advertising:** None.
- **Distribution:** Public App Store distribution, not unlisted or private distribution.
- **Availability:** All territories where Fly Media LLC is permitted to distribute.
- **Tax category:** App Store software.
- **Release setting:** Manually release this version after approval.
- **Pre-order:** Do not enable unless a launch date and App Store product URL are finalized.

## App privacy and age rating

- **App Privacy:** Select “No, we do not collect data from this app.” This matches both privacy manifests, the source audit, and the published policy. Re-evaluate before every update if a dependency, diagnostic service, or network feature is added.
- **Privacy policy:** `https://apps.flymedia.us/nightshift/privacy/`
- **Age-rating questionnaire:** Answer every content descriptor and in-app control as “None.” Nightshift has no advertising, account, messaging, social feed, user-generated content, purchases, parental controls, or embedded browser. For **Unrestricted Web Access**, answer **No**: users navigate in Safari, not inside Nightshift; the app and extension provide no browser or navigation surface. Do not override Apple’s resulting rating.
- **Made for Kids:** No.
- **Accessibility Nutrition Labels:** Do not publish a support claim until the companion app and Safari popup have passed a complete VoiceOver, keyboard, contrast, and text-size audit. An accurate “not indicated” label is safer than an unverified claim.

## Review information

- **Review contact email:** `contact@flymedia.us`
- **Demo account:** Not required.
- **Review contact name and phone:** Enter the monitored Fly Media App Review contact at submission time.
- **Notes for review:** Paste [`metadata/en-US/review_notes.txt`](metadata/en-US/review_notes.txt) exactly. It explains the Safari permission flow, toolbar placement, modes, and protected-page limitation.
- **Attachment:** None required.
- **Export compliance:** Select no non-exempt encryption. `ITSAppUsesNonExemptEncryption` is `false` in the app bundle.

## Pre-submit confirmations

- The product page, support page, and privacy policy return successfully without login.
- The App Store badge remains absent from the marketing page until an actual product URL exists. At that point, use only Apple-provided, unmodified badge art and link it directly to the product page.
- The repository is public and the product page links to the MIT-licensed source.
- The signed Release archive was tested on the current supported macOS matrix and contains no development-only copy, credentials, analytics, advertising, or in-app purchase code.
- The App Review contact, legal agreements, tax status, Digital Services Act status, and availability territories are complete in App Store Connect.
