# Nightshift

Nightshift is a completely free, open-source Safari Web Extension for macOS that gives websites a dark appearance. There are no ads, accounts, subscriptions, trials, or in-app purchases. This Fly Media edition modernizes the original [unmade/Nightshift](https://github.com/unmade/Nightshift) project while retaining its MIT license and commit history.

- Product page: <https://apps.flymedia.us/nightshift/>
- Support: <https://apps.flymedia.us/nightshift/support/>
- Privacy policy: <https://apps.flymedia.us/nightshift/privacy/>
- Report a bug or suggest a feature: <https://github.com/flymedia-us/Nightshift/issues>

## Appearance modes

- **Always Light** leaves websites unchanged. It does not override a website's own dark theme.
- **Always Dark** applies Nightshift's dark filter at all times.
- **System** applies Nightshift whenever macOS is using Dark Mode.

Nightshift can also be disabled for individual sites from its Safari toolbar popup. Mode and site changes update open tabs immediately.

When active, Nightshift excludes sites listed in its repo-owned compatibility registry, generated from the vendored Dark Reader snapshot plus the developer-maintained `Config/manual-dark-sites.config` additions. It does not infer native dark mode from arbitrary rendered colors, `color-scheme`, media rules, or controls. You can re-enable any listed site from the toolbar popup.

Manage all excluded websites—including known-list and manually added sites—in Nightshift's browser settings page. Open Safari’s extension settings and choose Nightshift’s settings page to add or remove exclusions.

## Architecture

- A Manifest V3 Safari Web Extension implements the toolbar popup, saved preferences, per-site policy, and page styling.
- A small SwiftUI container app explains the extension and opens Safari's extension settings.
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
make verify
```

Or run individual steps:

```sh
make check          # JavaScript syntax checks
make test           # Policy, content-script, and popup tests
make smoke          # Live WebKit smoke tests for representative popular sites
make build          # Regenerate and build the app without signing
make analyze        # Run Xcode's static analyzer
npm run update:dark-reader  # Import the latest official Dark Reader data, then regenerate
npm run generate:dark-sites  # Regenerate after editing either source list directly
```

To run Nightshift in Safari:

1. Run `make open`.
2. Select the **Nightshift** scheme and a development team in Xcode.
3. Build and run the app.
4. In Safari, open **Settings → Extensions**, enable Nightshift, and grant website access.
5. Use the Nightshift toolbar item to choose an appearance mode or disable Nightshift for the current site.

If Safari still shows a generic extension icon after rebuilding, quit Safari and run the newly built
container app once. Safari caches registered extension bundles; each Nightshift build uses an incremented
bundle version so the current toolbar artwork replaces any previously registered copy.

## Website smoke tests

The opt-in smoke suite opens representative public pages in Playwright's WebKit engine, injects the same
stylesheet shipped by Nightshift, checks that the theme and media correction filters are active, and writes
screenshots to `.build/smoke/` for visual review. It intentionally does not run as part of `npm test` because
public websites and network access are not deterministic CI dependencies.

Install the WebKit runtime once, then run the suite:

```sh
npm run smoke:install
npm run icons       # Regenerate Safari extension and toolbar PNGs from SVG masters
make smoke
```

Use `NIGHTSHIFT_SMOKE_SITE=github` to run one case, or `NIGHTSHIFT_SMOKE_HEADED=1` to watch the browser.

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
Embedded Dark Reader compatibility data and its attribution are documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
