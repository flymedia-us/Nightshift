# Nightshift launch checklist

## Product identity

- [x] Fly Media app and extension bundle identifiers
- [x] Marketing version and build number configured
- [x] App icon authored in Icon Composer and Safari extension icon assets
- [x] Utilities category configured in the app
- [x] Select Utilities in App Store Connect
- [x] New Fly Media App Store record: Nightshift for Safari (`6823064390`), bundle `com.FlyMedia.Nightshift`

> The current bundle ID is `com.FlyMedia.Nightshift`. Apple treats a different bundle ID as a different app. Preserving an earlier App Store listing requires control or transfer of that listing and its existing identifier.

## Product and quality

See `docs/launch-readiness.md` for exact coverage and remaining gates. Automated WebKit results are separate from signed Safari checks and do not certify other Macs.

- [x] Manifest V3 Safari Web Extension
- [x] Always Light, Always Dark, and System modes
- [x] Per-site enable/disable control
- [x] Swift 6 strict-concurrency build
- [x] Apple silicon and Intel Release build
- [x] Automated policy, content-script, popup, and manifest tests
- [x] Dynamic dark theme without whole-page or background-image inversion
- [x] Deterministic WebKit image-preservation and theme restoration checks
- [x] Development-signed 1.0.11 (24) verified in local Safari 27, including Gmail's background image
- [x] Universal unsigned-beta packaging, registration repair, and release notarization gates
- [ ] Run signed website smoke tests on macOS 15, 26, and 27
- [x] Deterministic WebKit coverage for video, SVG, canvas, sticky positioning, native dark themes, and cross-origin frames
- [ ] Run VoiceOver and keyboard-only checks for the companion app and popup
- [x] Verify local upgrade from 1.0.12 (27) preserves existing exclusions (original third-party bundle IDs are separate apps)

## App Store Connect

- [x] English name, subtitle, promotional text, description, keywords, release notes, and review notes drafted
- [x] App Store Connect handoff prepared in `AppStore/app-store-connect.md`
- [x] Privacy manifests declare no tracking or data collection
- [x] Reserve Nightshift for Safari and create the App Store record
- [x] Confirm bundle ID, SKU, English (U.S.), Utilities, free pricing, and all 175 territories
- [x] Complete the age-rating questionnaire: Apple calculated 4+, no Kids category or rating override; no in-app web navigation
- [x] Publish “Data Not Collected” in App Privacy and save the verified privacy-policy URL
- [x] App declares no non-exempt encryption; App Store upload accepted
- [x] App Store Connect reports the developer as a trader for this app
- [x] Free and Paid Apps agreements Active; business banking Active; existing tax setup present
- [x] Publish the marketing, support, and privacy URLs from `flymedia-us/apps`
- [ ] Produce and upload the Mac screenshot set
- [x] Universal 1.0.13 (28) archive, verified store export, and successful App Store Connect upload
- [ ] Distribute a TestFlight build to internal testers
- [x] Manual release selected; draft readiness validation reports only missing screenshots
- [ ] Submit for review after final screenshots and release QA approval

## Open-source and operations

- [x] Publish the source repository under the MIT License
- [x] Add issue templates, a security policy, and contribution guidance before opening the repository
- [ ] Tag the final source commit and publish release notes
- [ ] Keep credentials and internal launch material outside the source repository
- [x] Prepare a rollback/support plan for the first 48 hours in `docs/launch-readiness.md`
