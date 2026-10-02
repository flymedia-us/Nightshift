# Nightshift

Nightshift is a completely free, open-source Safari Web Extension for macOS that gives websites a dark appearance. There are no ads, accounts, subscriptions, trials, or in-app purchases. This Fly Media edition modernizes the original [unmade/Nightshift](https://github.com/unmade/Nightshift) project while retaining its MIT license and commit history.

- Product page: <https://apps.flymedia.us/nightshift/>
- Support: <https://apps.flymedia.us/nightshift/support/>
- Privacy policy: <https://apps.flymedia.us/nightshift/privacy/>
- Report a bug or suggest a feature: <https://github.com/flymedia-us/Nightshift/issues>

The current development and unsigned beta version is **1.0.11 (24)**. Its dynamic theme replaces whole-page inversion, preserving background photos such as Gmail's theme image. This beta is not a notarized public release.

## Appearance modes

- **Always Light** leaves websites unchanged. It does not override a website's own dark theme.
- **Always Dark** applies Nightshift's dynamic dark theme at all times.
- **System** applies Nightshift whenever macOS is using Dark Mode.

Nightshift can also be disabled for individual sites from its Safari toolbar popup. Mode and site changes update open tabs immediately.

When active, Nightshift excludes sites listed in its repo-owned compatibility registry, generated from the vendored Dark Reader snapshot plus the developer-maintained `Config/manual-dark-sites.config` additions. It does not infer native dark mode from arbitrary rendered colors, `color-scheme`, media rules, or controls. You can re-enable any listed site from the toolbar popup.

Manage all excluded websites—including known-list and manually added sites—in Nightshift's browser settings page. Open Safari’s extension settings and choose Nightshift’s settings page to add or remove exclusions.

## Architecture

- A bundled, pinned Dark Reader dynamic engine recolors CSS surfaces, text, and borders without page inversion. Background images and media keep their pixels; canvas-rendered document pages retain their original appearance.
- A Manifest V3 Safari Web Extension implements the toolbar popup, saved preferences, per-site policy, and page styling.
- A small SwiftUI container app explains the extension and opens Safari's extension settings.
- Each preference change is applied to the latest settings by a shared native store, protected by a file lock and atomic writes. Profile caches keep pending changes through native-service failures and worker restarts; sequence numbers prevent delayed retries from undoing newer edits. Existing exclusions migrate from previous builds.
- Native dark-site registries regenerate during every Xcode build, and tests verify that the shipped lists match the imported and manually maintained source files.
- Shared, framework-free JavaScript policy code is covered by Node's built-in test runner.
- The Xcode project is generated from `project.yml` with XcodeGen and remains checked in for CI and contributors who do not have XcodeGen installed.

The deployment target is macOS 12.3, the first macOS release with Safari 15.4's Manifest V3 support. Compatibility below the release-test matrix is best effort. macOS 15, 26, and 27 are the required release targets.

## Local development

Requirements:

- macOS 15 or later for supported local development
- Xcode 26 or later
- Node.js 20 or later
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)

Run the full local verification suite:

```sh
npm ci --ignore-scripts
npm run check:theme-engine
make verify
```

Or run individual steps:

```sh
make check          # JavaScript syntax checks
make test           # JavaScript behavior and native persistence regression tests
make smoke          # Live WebKit smoke tests for representative popular sites
make build          # Regenerate and build the app without signing
make analyze        # Run Xcode's static analyzer
npm run update:dark-reader  # Import the latest official Dark Reader data, then regenerate
npm run generate:dark-sites  # Regenerate after editing either source list directly
npm run bundle:theme-engine # Regenerate the bundled engine after changing its pinned dependency or patches
npm run check:theme-engine  # Verify the committed engine matches the pinned dependency and patches
```

`Nightshift Extension/Resources/darkreader.js` is a committed build input, generated from the pinned npm package. Do not edit it directly. The bundler isolates its messaging shim and applies guarded patches for inline background images, relative image URLs, and page API isolation. CI checks the generated resource against that source. Updating the compatibility lists with `npm run update:dark-reader` does not update the engine; those are separate inputs.

To run Nightshift in Safari:

1. Run `make open`.
2. Select the **Nightshift** scheme and a development team in Xcode.
3. Build and run the app.
4. In Safari, open **Settings → Extensions**, enable Nightshift, and grant website access.
5. Use the Nightshift toolbar item to choose an appearance mode or disable Nightshift for the current site.

When testing a change, install the freshly built app in `/Applications/Nightshift.app` and verify the version in Safari’s extension settings. Quit Safari before replacing the entire app bundle (copying over an old Debug bundle can leave extra binaries that invalidate the signature). Use Apple Development signing for local development. Developer ID distribution requires signing, notarization, and stapling before Safari verification. Keep unsigned analyzer builds out of the active app/extension registration.

If Safari still shows a generic extension icon after rebuilding, quit Safari and run the newly built
container app once. Safari caches registered extension bundles; each Nightshift build uses an incremented
bundle version so the current toolbar artwork replaces any previously registered copy.

## Builds for another Mac

Use `make beta` for an explicitly requested unsigned Safari testing build. The output is `.build/Beta/Nightshift.app`, with a matching `Nightshift.zip` for transfer. The ZIP contains a `Nightshift Beta` folder with the app, installation instructions, and `Repair Nightshift Safari Registration.command`. Both the app and extension are ad-hoc signed, sandboxed, and built for Apple Silicon and Intel. On the receiving Mac, extract the ZIP, replace the entire app in Applications, launch it, then enable **Safari → Settings → Developer → Allow unsigned extensions** and enable Nightshift under Extensions. Safari resets the unsigned permission every time it quits; enable it again after restarting Safari. An unnotarized Developer ID build is not the unsigned beta.

If the beta remains absent after allowing unsigned extensions, keep Safari open and double-click the included registration repair. Safari 27 can cache a failed signing lookup from before the unsigned setting was enabled; refreshing Nightshift's Launch Services and PlugInKit registration makes it discover the beta. The repair validates both ad-hoc signatures and touches only `/Applications/Nightshift.app` registration. It does not change Safari security settings. The sandboxed app cannot perform that refresh itself, so the repair remains a separate, inspectable script. Safari may also require you to click the extension's activation checkbox yourself when it detects automation.

For a public release, configure a keychain credential profile with `xcrun notarytool store-credentials`, then run `NIGHTSHIFT_NOTARY_PROFILE=<profile-name> make release`. This signs with Fly Media's Developer ID identity, submits to Apple's notary service, staples the accepted ticket, and verifies both the signature and Gatekeeper acceptance. It refuses to produce a release without notarization access. The output is `.build/Distribution/Nightshift.app` and its transfer ZIP.

Verify a deliverable with `python3 Scripts/package-nightshift.py --verify <app>`; add `--beta` when checking an unsigned beta. Persistent handoff requirements are recorded in `AGENTS.md`.

## Website smoke tests

The opt-in smoke suite opens representative public pages in Playwright's WebKit engine, injects the same
theme engine shipped by Nightshift, checks that colors darken without filtering images, and writes
screenshots to `.build/smoke/` for visual review. It intentionally does not run as part of `npm test` because
public websites and network access are not deterministic CI dependencies.

Install the WebKit runtime once, then run the suite:

```sh
npm run smoke:install
npm run icons       # Regenerate Safari extension and toolbar PNGs from SVG masters
make smoke
```

Use `NIGHTSHIFT_SMOKE_SITE=github` to run one case, or `NIGHTSHIFT_SMOKE_HEADED=1` to watch the browser.

Run the deterministic image-preservation checks without contacting public websites:

```sh
npx playwright test --config Tests/smoke/playwright.config.js image-preservation.spec.js google-docs-rendering.spec.js
```

These checks compare rendered image pixels with Nightshift on and off, cover CSS and inline backgrounds, CSS variables, pseudo-elements, external stylesheet image paths, images, and canvases, and verify dynamic content and restoration of the original colors. They exercise the bundled scripts in WebKit; installation and activation must also be checked in Safari. On October 2, 2026, the development-signed 1.0.11 (24) was verified in local Safari 27, including Gmail's starfield background, its popup, mode switching, and all three existing profiles. That verification does not establish installation or runtime activation of the unsigned beta on another Mac.

## Project structure

- `Nightshift/` — SwiftUI macOS container app
- `Nightshift Extension/` — native Web Extension host and Manifest V3 resources
- `Tests/` — Node tests for extension behavior
- `Config/manual-dark-sites.config` — developer-owned additions to the imported compatibility list
- `Artwork/` — source SVGs and deterministic Safari PNG renderer
- `Icon/Nightshift Icon.icon` — source-of-truth macOS app icon authored in Apple Icon Composer with Liquid Glass layers
- `AppStore/` — versioned listing copy, App Store Connect handoff, review notes, and screenshot production guidance
- `project.yml` — source of truth for Xcode targets and build settings
- `.github/workflows/ci.yml` — JavaScript tests plus unsigned builds on macOS 15, 26, and 27 runners

## Repository setup

- `origin` — public Fly Media repository: `git@github.com:flymedia-us/Nightshift.git`
- `upstream` — original project: `https://github.com/unmade/Nightshift.git`

Fetch future upstream changes with `git fetch upstream`.

## Release preparation

See [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) for the remaining App Store, compatibility, accessibility, and release gates. The ready-to-enter listing handoff is in [`AppStore/app-store-connect.md`](AppStore/app-store-connect.md). Large screenshot binaries and all credentials intentionally live outside this repository.

## License

Nightshift is available under the MIT License. See [`LICENSE`](LICENSE). The original copyright and license notice are retained.
The bundled Dark Reader engine, compatibility data, local patches, and their attribution are documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
