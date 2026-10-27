# App Store launch preparation — October 27, 2026

**Nightshift 1.0.20 (35) is uploaded, processed, and selected in the existing App Store draft. Apple's current completeness check reports only: “You must upload at least one screenshot.”** The user owns screenshot production/upload. The app remains **Prepare for Submission** and **manual release** is selected; it was not submitted or released.

Draft: https://appstoreconnect.apple.com/apps/6823064390/distribution/macos/version/inflight

## Completed preparation

- The user explicitly approved uploading 1.0.20 (35) and replacing the draft's build/metadata. Xcode reported upload success; TestFlight shows the processed build as Ready to Submit.
- Changed the existing draft's version from 1.0.13 to 1.0.20, detached 1.0.13 (28), attached 1.0.20 (35), and saved. The older build remains in Apple's history; no historical archive was deleted.
- Saved the current English description and review notes from `AppStore/metadata/en-US/`. Verified the description has 1,385 characters and notes have 1,239 characters, including profile independence, the settings cog, and persisted Safari storage. Existing keywords, URLs, contact details, no-sign-in setting, and manual release were retained.
- Saved build-specific TestFlight instructions from `testing_notes.txt`. No tester invitations, external beta-review submission, or public testing link was created.
- Verified the existing App Store record: Fly Media bundle ID and Apple ID 6823064390, Utilities, Apple's 4+ rating, standard Apple EULA, trader status, published Data Not Collected declaration, and canonical privacy-policy URL.
- Verified public distribution, 175 available territories, a $0.00 current price schedule, and App Store software tax category. Free/Paid Apps agreements, business banking, tax forms, and compliance showed Active. No agreements or financial details were changed.
- Published website commit `bb49dc1` in `flymedia-us/apps`: version 1.0.20, current popup settings instructions, independent profile storage, public-only manual export, and the updated privacy policy dated October 27. Cloudflare Pages deployment succeeded. Verified the new copy on the actual live marketing, support, and privacy pages in the browser; the coming-soon state remains and no App Store badge/direct binary download was added.
- Updated the public source repository's obsolete cross-profile-sync description. The final application source commit `850f6dc` passed all five hosted CI jobs: JavaScript, WebKit, macOS 15, macOS 26, and Xcode 27. Build/CI evidence does not replace direct Safari runtime testing on other Macs.

## Private MacBook handoff

The user explicitly requested a private test copy in the local public Drop Box. Ran `make beta` on the same final 1.0.20 (35) source, using universal ad-hoc app/extension signatures, sandbox entitlements, and no development provisioning profiles. Official public binaries remain Mac App Store only.

Delivered beside one another in `/Users/samfriedman/Public/Drop Box`:

- `Nightshift.app`
- `Nightshift.zip`
- `Repair Nightshift Safari Registration.command`
- `Nightshift Beta Instructions.txt`

Verified the app, the ZIP-extracted app, and every extension resource against the current workspace. The ZIP contains the app, repair command, and instructions. Previous `OLD Nightshift.app`, the previous current app, ZIPs, scripts, and instructions were preserved with unique backup names rather than overwritten. The packaging instructions now state the official App Store distribution policy.

On the MacBook, **Allow unsigned extensions must be enabled after each Safari restart**. If Nightshift is missing, run the packaged repair command after enabling that setting. Replace the app bundle cleanly. MacBook runtime activation was not directly tested from this server.

The local development-signed `/Applications/Nightshift.app` was preserved. After beta packaging, PlugInKit still listed only that current 1.0.20 installation, and the user's Safari session was restored. No unsigned-extension/security bypass was enabled on this Mac.

## Artifacts and source recovery

- Store archive: `.build/AppStoreStorage35/Nightshift.xcarchive`.
- Verified store export: `.build/AppStoreStorage35/Export/Nightshift.pkg`.
- Upload evidence: `.build/launch35-app-store-upload.log`.
- Private handoff evidence: `.build/launch35-beta-package.log` and `.build/launch35-dropbox-verification.log`.
- Website build evidence: `.build/launch35-website-build.log`.
- App Store completeness evidence: `.build/launch35-app-store-screenshots-only.png` (QA evidence, not an App Store marketing screenshot).
- Source release notes: `AppStore/source-release-notes.md`; source tag/release draft `v1.0.20`, with no official app/ZIP/DMG assets.

Keep credentials, distributions, account evidence, and screenshots out of Git. Prior app installations remain under `.build/InstalledBackups/`.

## Screenshots and release

Apple's UI currently accepts Mac screenshots at 2880 × 1800, 2560 × 1600, 1440 × 900, or 1280 × 800, up to ten screenshots. The manual plan remains in `AppStore/screenshots/README.md`. Upload final screenshots to the existing **1.0.20** draft, then rerun completeness validation before submission. No further binary replacement is needed unless the MacBook test reveals an app regression.

Screenshots are the only outstanding item reported by Apple's submission check. This is not App Review approval or a guarantee that every website is styled perfectly. Detailed runtime coverage and the two site-rendering compatibility findings remain in `safari-storage-verification-2026-10-27.md`; Intel hardware, the other supported macOS/Safari combinations, and a complete human VoiceOver audit were not directly tested here. Accessibility labels remain unclaimed. Once screenshots and final release approval are in place, submit for review and retain manual release until approval and availability checks are complete.
