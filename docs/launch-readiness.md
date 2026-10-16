# Nightshift launch preparation — October 15, 2026

Version **1.0.13 (28)** is built, signed for the Mac App Store, uploaded, processed, and attached to the new **Nightshift for Safari** record, Apple ID **6823064390**. Apple's **Add for Review** validation reports exactly one remaining submission requirement: **“You must upload at least one screenshot.”** The app remains **Prepare for Submission**, with **manual release** selected. No final screenshots were produced or uploaded, and the app was not submitted or released.

Record: https://appstoreconnect.apple.com/apps/6823064390/distribution/macos/version/inflight

## Fixed and reviewed

- Visible pages refresh the native shared store when focused, restored, or made visible, and every 15 seconds while visible. This bridges Safari's separate profile storage events. Hidden pages do not poll.
- A stale profile's first migration cannot restore an old exclusion or enable over a newer manual decision in shared storage.
- Native reads and JavaScript cache refreshes avoid rewriting unchanged settings. Concurrent frame reads coalesce; native-service failure backs off so toolbar saves remain responsive and durable.
- Pending changes survive service failures and worker restarts. Native sequence numbers prevent a lost acknowledgement from replaying an old change over a newer profile's edit. The UI distinguishes a local save awaiting sharing from a completed shared save.
- Content scripts run in embedded HTTP/HTTPS frames, using Safari's trusted sender tab URL to honor the embedding site's exclusion. Forms, sticky positioning, SVG colors, and ordinary media retain their behavior in the fixtures.
- The popup exposes excluded-site management using the current profile's extension origin. Failed saves restore the popup's saved selection; the settings form retains an address after a failed save.
- The extension declares its UserDefaults migration API usage with the approved `CA92.1` privacy reason. Both privacy manifests continue to declare no tracking or data collection.
- The companion app explains profile enablement and shared settings. The minimum OS is macOS 13.7.7 with Safari 18.6 or later, avoiding a Monterey installation whose Safari cannot load the extension. [Apple's Safari 18.6 compatibility information](https://support.apple.com/124152).
- The Xcode project, manifest, package metadata, listing handoff, and bundle versions agree. The pinned theme engine remains reproducible; earlier Docs/Sheets and image-preservation patches are retained.

## Verification completed

- **61 Node tests passed**, including metadata consistency, settings behavior, popup policy, content scripts, theme preservation, and native-service failures.
- **Native Swift regression suite passed**, including legacy migration, restart/retry behavior, invalid-write atomicity, stale migrations, and 12 independent concurrent writer processes.
- **JavaScript-to-Swift integration test passed** using independent profile workers and real native processes/files. Covers cold caches, concurrent profile edits, global mode, stale migration, lost acknowledgements, retry deduplication, and unchanged reads.
- **15 full WebKit smoke tests passed**: Google, Wikipedia, GitHub, Stack Overflow, YouTube, registry behavior, Docs/Sheets, image pixels, settings UI, and embedded content. After the last popup change, all **8 deterministic WebKit tests** passed again. These inject the production scripts into WebKit; they are separate from signed Safari verification.
- JavaScript syntax, `npm run check:theme-engine`, Xcode static analysis, universal archive, App Store export, and 3 packaging regression tests passed. `npm audit` reported **zero known vulnerabilities**.
- `Scripts/verify-app-store.py` verified the exported package's installer/app signatures, Fly Media team, sandbox and absence of debugger entitlements, matching versions, both architectures, OS requirements, privacy declaration, and byte-for-byte agreement with every current extension resource.
- Apple accepted the upload; build **1.0.13 (28)** completed processing and was selectable in the App Store draft.

## Signed Safari verification on this Mac

Tested on **macOS 27.0 / Safari 27.0**. The final development-signed app is installed at `/Applications/Nightshift.app`. Every bundled extension resource matches the workspace, and PlugInKit's active registration points only to that installation.

- Safari displays **Nightshift 1.0.13**. The pre-existing three enabled profiles remain enabled; the fourth profile was not granted access.
- An exclusion saved in Personal appeared in School. Changes made in School reached the already-open Personal settings page when returning to it.
- Existing exclusions survived the upgrade from 1.0.12 (27). A temporary exclusion created in School survived a full Safari restart and the final clean app replacement, then was removed through the installed settings page.
- The installed popup opened. Its production script successfully saved Dark mode, restored System mode, and opened its profile-specific settings page using Safari's real APIs. Those actions were exercised in the popup's extension page because automated clicks into the toolbar popover dismissed the popover rather than activating its HTML controls.
- The final companion app's settings button successfully opened Safari's Nightshift extension settings.
- System mode was restored. **Allow unsigned extensions**, cross-origin security bypasses, and remote automation remained off. The user's previous Safari session was reopened after restart testing.

## App Store and public materials

- New record: **Nightshift for Safari**, `com.FlyMedia.Nightshift`, SKU `FM-NIGHTSHIFT-MAC`, English (U.S.), Utilities.
- Description, subtitle, promotional text, keywords, URLs, copyright, App Review business contact/instructions, no-sign-in setting, and manual release are saved.
- Apple's questionnaire calculated **4+**, with no Kids category or higher-rating override. No in-app browser/navigation surface is declared.
- **Data Not Collected** is published, with the verified public privacy-policy URL. The developer is identified as a trader for the app.
- Free pricing is configured across **175 countries or regions**; availability is on release, with no pre-order. Tax category is App Store software.
- Free and Paid Apps agreements show Active. The Account Holder accepted the agreements directly; the agent did not accept them.
- The issue tracker was enabled so the public bug-report link works.
- The approved support, privacy, and marketing corrections were published in `flymedia-us/apps` at commit **2633e40** and verified live. The coming-soon state and hidden App Store badge remain in place.

## Artifacts and recovery

- Store archive: `.build/AppStore/Nightshift.xcarchive`.
- Verified store package: `.build/AppStore/Export/Nightshift.pkg`.
- Build/upload/analyzer/test evidence: `.build/launch-*.log` and `.build/launch-dependency-audit.json`.
- Development install: `/Applications/Nightshift.app`; prior installations preserved under `.build/InstalledBackups/`.
- Matching universal ad-hoc beta: `~/Public/Drop Box/Nightshift.app` and `Nightshift.zip`, with the repair command and instructions beside the app and inside the ZIP. Earlier apps/ZIPs were preserved, including `OLD Nightshift.app` and uniquely named older backups.

The beta requires **Allow unsigned extensions after every Safari restart**. If it is missing after enabling that setting, run the included **Repair Nightshift Safari Registration.command**. Local registration and packaging do not prove activation on another Mac. The beta is separate from the store-signed package.

## Coverage limits and remaining release work

Apple's draft validation is a submission completeness check, not a guarantee of App Review approval or bug-free behavior. Final screenshots remain deliberately outstanding.

This session did **not** directly run the signed app on macOS 15 or 26, test Intel hardware, perform a complete human VoiceOver audit, or activate the beta on the other Mac. Universal compilation, automated WebKit/native coverage, and the existing Safari 27 checks do not replace those checks. CI includes deterministic WebKit tests. Hosted verification of the synchronized source is recorded in the October 16 maintenance entry below. No unsupported accessibility nutrition claims were published and no tester invitations were sent. The verified source and release notes are being synchronized with public GitHub; App Store distribution remains gated on screenshots and submission.

## First 48 hours and rollback

Keep manual release until screenshots and final release QA are approved. Retain this archive/package and the previous builds. Use `contact@flymedia.us` and GitHub Issues for opt-in reports; request the Safari/macOS/Nightshift versions, selected mode, affected site, and reproduction steps, avoiding private page contents.

For a pre-release regression, keep the draft unsubmitted and ship a corrected higher build number. For a serious post-release regression, stop further rollout or new availability as appropriate and submit a corrected higher version/build; an old development or ad-hoc beta is not an App Store rollback. Do not replace the active `/Applications` installation with analyzer, beta, or archive inspection copies.

## Repository and website maintenance — October 16, 2026

- Public repository description and homepage now describe the current product. Dependabot security updates, secret scanning, and push protection are enabled.
- CI uses read-only repository permissions, immutable official Action revisions, job timeouts, redundant-run cancellation, and monthly dependency/Action update PRs. GitHub enforces Action SHA pinning, and an active main-branch ruleset prevents deletion and rewritten history. The macOS 15 job explicitly selects Xcode 26 because its default Xcode 16 cannot compile the Icon Composer source.
- Contributor requirements and the Node 24 version file agree with current development/CI. Local secrets, signing material, and distribution artifacts are excluded from Git. The already-deployed website patch is retained locally under `.build/`.
- The website checkout is synchronized with `flymedia-us/apps` main. A clean lockfile install and production build passed, all 16 built pages have valid local page/asset links, and both repositories' dependency audits report zero known vulnerabilities.
- The live Nightshift marketing, support, privacy, robots, and sitemap endpoints respond successfully. Marketing displays 1.0.13, macOS 13.7.7, the public source link, and the coming-soon state with no App Store badge. Cloudflare's deployment check for the website commit is successful.
- Repeated local verification passed: 61 Node tests, native Swift regressions and real-process integration, three packaging tests, and all eight deterministic WebKit cases. The installed extension and exported App Store package still match the committed resources exactly.
- Hosted CI on `d0896f0` passed JavaScript, WebKit, macOS 26, and Xcode 27. The macOS 15 job exposed a crash in Xcode 26.3’s asset compiler while loading system media frameworks; its native regression tests had passed. That job now selects the installed Xcode 26.2 toolchain and is being reverified.
