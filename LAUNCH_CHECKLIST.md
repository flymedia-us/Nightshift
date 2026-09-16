# Nightshift launch checklist

## Product identity

- [x] Fly Media app and extension bundle identifiers
- [x] Marketing version and build number configured
- [x] App icon authored in Icon Composer and Safari extension icon assets
- [x] Utilities category configured in the app
- [ ] Select Utilities in App Store Connect
- [ ] Confirm whether this is a new App Store record or an update/transfer of the original listing

> The current bundle ID is `com.FlyMedia.Nightshift`. Apple treats a different bundle ID as a different app. Preserving an earlier App Store listing requires control or transfer of that listing and its existing identifier.

## Product and quality

- [x] Manifest V3 Safari Web Extension
- [x] Always Light, Always Dark, and System modes
- [x] Per-site enable/disable control
- [x] Swift 6 strict-concurrency build
- [x] Apple silicon and Intel Release build
- [x] Automated policy, content-script, popup, and manifest tests
- [ ] Run signed website smoke tests on macOS 15, 26, and 27
- [ ] Test websites with video, SVG, canvas, sticky positioning, native dark themes, and cross-origin frames
- [ ] Run VoiceOver and keyboard-only checks for the companion app and popup
- [ ] Test upgrade behavior from any previously shipped Nightshift build

## App Store Connect

- [x] English name, subtitle, promotional text, description, keywords, release notes, and review notes drafted
- [x] App Store Connect handoff prepared in `AppStore/app-store-connect.md`
- [x] Privacy manifests declare no tracking or data collection
- [ ] Reserve or confirm app name and create/confirm the App Store record
- [ ] Confirm bundle ID, SKU, primary language, category, price, and availability
- [ ] Complete the age-rating questionnaire using the rationale in `AppStore/app-store-connect.md`; do not claim unrestricted web access because Nightshift does not provide a browser or navigation surface
- [ ] Declare “No, we do not collect data from this app” in App Privacy
- [ ] Confirm export compliance; the app declares no non-exempt encryption
- [ ] Confirm Digital Services Act trader status and required contact details
- [ ] Verify agreements, tax, and banking status in App Store Connect
- [x] Publish the marketing, support, and privacy URLs from `flymedia-us/apps`
- [ ] Produce and upload the Mac screenshot set
- [ ] Archive, validate, and upload the signed App Store build
- [ ] Distribute a TestFlight build to internal testers
- [ ] Submit with manual release selected so launch timing remains controlled

## Open-source and operations

- [x] Publish the source repository under the MIT License
- [x] Add issue templates, a security policy, and contribution guidance before opening the repository
- [ ] Tag the final source commit and publish release notes
- [ ] Keep credentials and internal launch material outside the source repository
- [ ] Prepare a rollback/support plan for the first 48 hours
