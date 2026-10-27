# Exclusions update — October 27, 2026

Version: **1.0.14 (29)**. This is a development/beta update; no App Store upload or public release was performed.

Implemented four separately presented exclusion sources, searchable bundled lists, a top-left popup Settings button, explicit enable overrides with a return-to-automatic action, and the manual personal-MacBook export/repository-import workflow. All 22 supplied public hosts are in the Nightshift master list; 21 were new. The supplied local IP was omitted. See [maintainer instructions](maintainer-exclusions.md).

Validation:

- 68 Node tests passed, including import preview/apply/idempotence in an isolated repository, public-host filtering, four-layer behavior, legacy-cache cleanup, override precedence, and exact-path parent-frame exclusions.
- Native Swift settings regressions and JavaScript/Swift cross-profile integration passed, including the new restore-automatic intent, migration, persistence, concurrency, and retries.
- Three Python packaging guard tests passed.
- All 13 deterministic WebKit tests passed: settings separation/search, keyboard discovery, export clipboard success/fallback, persistence, false-positive overrides, live marker changes, stale caches, image preservation, embedded content, and Docs/Sheets rendering/formatting protection.
- JavaScript syntax, pinned theme-engine reproducibility, and whitespace checks passed. The universal development-signed Xcode Release build succeeded.
- Safari displayed 1.0.14. Its installed settings showed all four sections and exported only `github.com` from the existing manual list, omitting its local IP exclusion. A temporary `.invalid` exclusion persisted through reload; removal and restoring automatic rules returned preferences to their original state.
- The top-left control in the production popup extension page opened that profile's `options.html` using Safari's actual APIs. The toolbar popover displayed the control, but computer-use clicks dismissed the popover; direct activation inside the toolbar popover was not established.
- Safari retained the existing Personal/School/Cornellians enablement. System mode remained selected. Unsigned extensions, cross-origin restriction bypasses, JavaScript from Apple Events, and remote automation remained off.
- Safari was restarted for installation and duplicate-registration cleanup. Its prior 20-tab browsing window was not fully restored; the available last-session command restored the later settings window. Safari was left on the new Nightshift settings page.
- A separately registered 1.0.5 app was preserved under `.build/InstalledBackups/` and unregistered. Final PlugInKit inventory contained only `/Applications/Nightshift.app` at 1.0.14.
- `make beta` produced universal, sandboxed ad-hoc app/extension bundles with matching versions and no development profiles. The Drop Box app and the app extracted from its ZIP both passed `Scripts/package-nightshift.py --verify … --beta`. Every extension resource in both artifacts and the installed development app matched the workspace byte-for-byte. The repair and instructions matched the ZIP contents. Previous app/ZIP backups were preserved.

The MacBook beta requires **Allow unsigned extensions after every Safari restart**. If Nightshift is missing after enabling it, run the packaged registration repair with Safari open. The remote MacBook was not tested; packaging and local development checks do not establish remote activation. A normal Developer ID public release still requires notarization and stapling.

Logs and transient build/install helpers are under ignored `.build/exclusions-*` and `.build/Exclusions*` paths. The maintainer import is a source-only repository tool and is not included in the app.

## Popup refinements — 1.0.15 (30)

The auto-detected exclusion action is now **Override**, rendered as a smaller, transparent secondary action. The popup footer link was removed. An icon-only gear with an accessible name and tooltip sits at the header's right edge, and the exact host (including any explicit port) appears beneath **Enable on this website**. Long hostnames wrap within the available width.

All 68 Node tests and 13 deterministic WebKit tests passed after adapting existing popup/settings coverage. The universal development-signed build succeeded and replaced `/Applications/Nightshift.app` cleanly, with the prior app preserved. Every installed resource matched the workspace. Safari's toolbar popup was visually checked on `example.com`: the gear is right-aligned, the exact domain appears beneath the switch, System mode is selected, and the footer link is absent. The installed settings page showed **Override**. Direct toolbar-popover activation remains subject to the previously documented computer-use limitation; the navigation handler passed WebKit coverage. The existing three-profile enablement and unsigned extensions off were observed. UI verification stopped when Safari reported concurrent user interaction.

`make beta` produced the matching 1.0.15 (30) universal ad-hoc beta. The Drop Box app and ZIP-extracted app passed beta verification and byte-for-byte resource comparison; repair/instructions were included and prior apps/ZIPs preserved. Logs are in `.build/popup30-*`. The same beta restart/repair requirements and remote-testing limits apply.

## Appearance settings and layout — 1.0.16 (31)

Added a top-level **Appearance** section to settings with the popup's Always Light, Always Dark, and System choices, using the same settings intents and shared store. The four exclusion layers now sit beneath **Excluded websites**, with the old header subtitle removed. Override buttons keep their gray button background in all pointer states. The popup drops its lower separator and empty status space; its cog is a centered 24px SVG inside the 36px hover target. Secondary text now maintains readable contrast in both light and dark appearances.

All 68 Node tests and 15 deterministic WebKit tests passed. New coverage verifies settings-to-popup mode sharing, cross-page refresh, mode persistence without losing exclusions, pending sharing, and failed-save rollback. Light/dark settings and the hovered popup were rendered and visually inspected; previews are in `.build/*31*preview.png`. Syntax, theme-engine reproducibility, and whitespace checks passed.

The universal development-signed build was installed cleanly at `/Applications/Nightshift.app`, preserving its predecessor. Safari displayed 1.0.16 and the existing three-profile enablement. Its toolbar popup showed the compact bottom and centered SVG; the native Safari settings entry opened the new appearance/exclusions layout. Selecting Always Dark saved successfully through the installed settings page, and System was restored. The eight-tab session from before this update was reopened, and the obsolete settings tab used during verification was replaced with the working new settings page. This does not undo the earlier 20-tab-session limitation documented above.

The matching universal ad-hoc app and ZIP were delivered in Drop Box with repair/instructions. Both the app and ZIP-extracted app passed beta verification, and all installed/beta extension resources matched workspace bytes. Previous apps and archives were preserved. Logs are in `.build/ui31-*`; the beta restart/repair requirements and remote-testing limits remain unchanged. No App Store upload or public distribution release was performed.

## Official settings symbol and appearance policy — 1.0.17 (32)

The popup now uses Apple's **gearshape.fill** SF Symbol, rendered directly with AppKit's `NSImage(systemSymbolName:accessibilityDescription:)` into a 72px alpha mask and displayed at 24px. This replaces the custom outline SVG while keeping the centered 36px button target. `Artwork/render-settings-symbol.swift` and `npm run icons:settings` provide the native regeneration path; the generated PNG is explicitly included in the Xcode resource phase. See the Apple artwork attribution in [third-party notices](../THIRD_PARTY_NOTICES.md).

Settings now sets its document color scheme from the saved Nightshift mode: Dark → `dark`, Light → `light`, System → `light dark`. Previously the settings page followed only macOS, so Always Dark could leave it white. Applying a mode, loading saved settings, storage events, and cross-profile refresh all use the same rendering path. Failed saves retain the previous page appearance. Native Canvas colors, text, fields, and scrollbars follow the selected scheme without content-script filters or inversion.

All 68 Node tests and 17 deterministic WebKit tests passed. Added tests check actual background, foreground, and input colors with both light and dark system appearances, explicit mode changes, live System changes, reopen persistence, updates from the popup, and save failure recovery. The light-system/Always Dark preview and the filled cog were visually checked (`.build/settings32-nightshift-dark.png`, `.build/popup32-hover-preview.png`). Syntax, whitespace, and pinned theme-engine reproducibility checks passed.

The universal development-signed build was cleanly installed and all resources matched the workspace. Safari displayed **1.0.17**, retained the existing three-profile enablement, and opened the installed settings page through its native settings entry. Selecting Always Dark visibly darkened the actual settings page and saved successfully; the prior System selection was restored. The filled cog was visible in the actual toolbar popup. Safari's nine-tab session was reopened after installation; a fresh working settings tab was also opened. The earlier 20-tab-session limitation remains documented above.

`make beta` produced the matching universal ad-hoc app/ZIP, delivered in Drop Box with repair/instructions and unique backups. Both the delivered app and ZIP-extracted app passed beta verification and byte-for-byte resource comparisons against all workspace resources, including the new symbol. Logs are in `.build/ui32-*`. Remote-Mac activation remains untested; the existing unsigned-extension restart/repair instructions apply. No App Store upload or public release was performed.

## Synchronized popup appearance — 1.0.18 (33)

The popup now applies the same saved-mode color-scheme policy as settings before rendering any page controls, including on Safari-protected pages. Explicit Dark/Light overrides macOS; System follows its appearance live. Loads, mode saves, storage events, and profile refreshes update the popup colors. Failed saves retain the last saved appearance. The Apple symbol's currentColor mask stays readable in either scheme.

All 68 Node tests and 19 deterministic WebKit tests passed. The appearance matrix now covers both extension pages on light/dark systems, live System changes, reopen persistence, rendered colors after changes from settings to an already-open popup, and failed-save appearance preservation. The dark popup and white symbol were also visually checked in a light-system preview (`.build/popup33-hover-preview.png`). Syntax, whitespace, and pinned engine reproducibility checks passed.

The universal development build and matching ad-hoc beta were packaged and verified. `/Applications/Nightshift.app`, the Drop Box app, and the app extracted from the delivered ZIP matched every workspace resource byte-for-byte. Previous apps/archives were preserved. Safari displayed 1.0.18, retained the existing three-profile enablement, and showed the actual toolbar popup with dark surfaces, light text, and a white filled cog. The user's pre-existing Always Dark setting was retained, and the ten-tab session was reopened. Logs are in `.build/ui33-*`. Beta restart/repair requirements and remote-Mac testing limits remain unchanged; no App Store upload/public release occurred.
