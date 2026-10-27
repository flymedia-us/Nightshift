> Follow-up: the user subsequently requested a private MacBook beta and approved App Store upload/draft updates. See [October 27 launch preparation](app-store-preparation-2026-10-27.md) for the resulting handoff and current draft status. The no-upload/no-beta statements below describe the earlier storage-verification task.

# Safari-owned preference storage — October 27, 2026

Current source and installed development app: **1.0.20 (35)**. Official public binaries remain Mac App Store only. Nothing from this session was uploaded or submitted to App Store Connect, and no private beta was produced.

## Storage decision

Nightshift now persists its four preference keys in `browser.storage.local`: global appearance, manual exclusions, explicit enables, and site-marker detections. Safari owns the storage separately for each profile. Standard `storage.onChanged` events update other open pages in the same profile. A background queue applies concurrent changes to the latest stored state; it does not coordinate profiles.

Apple describes local extension storage as persistent on-disk storage for preferences/blocklists in [Create web extensions for Safari](https://developer.apple.com/videos/play/wwdc2026/216/). WebKit explains that each Safari profile has a separate extension instance and storage in [WebKit features in Safari 17.0](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/).

Removed the Swift shared-file/UserDefaults store, native preference messaging and permission, shared sequence/retry journal, and cross-profile polling. Existing preference keys already stored by Safari remain in place. Legacy sync metadata is ignored rather than replayed or erased; the old native file is left untouched for rollback. Its size and modification time were unchanged throughout the storage tests. There is no cloud preference synchronization or automatic maintainer collection.

## Automated and artifact verification

- 69 Node tests passed: concurrent writes, worker restart, independent profile stores, existing-key retention, ignored legacy metadata, rejected writes, truthful error UI, exclusion precedence, trusted parent-frame context, and stylesheet fetch constraints.
- All 28 WebKit tests passed on final source: live Google/Wikipedia/GitHub/Stack Overflow/YouTube checks, production background and settings scripts, profile isolation, same-profile events, persistence, keyboard controls, export, error recovery, Docs/Sheets contrast, embedded frames, and image pixel preservation. These use Playwright WebKit and are distinct from installed Safari testing.
- Three packaging regressions, JavaScript syntax checks, pinned theme-engine reproducibility, and dependency audit passed (zero known advisories).
- Xcode static analysis passed for the storage refactor. The final universal development build and App Store archive/export passed.
- App Store verifier passed for `.build/AppStoreStorage35/Export/Nightshift.pkg`: installer/app signatures, Fly Media team, sandbox, absence of debugger entitlements, matching versions, arm64/x86_64, minimum OS, privacy declarations, and exact workspace resources.
- `/Applications/Nightshift.app` is development signed, sandboxed, version 1.0.20 (35), and every bundled extension resource matches current source. Signature verification passed outside the filesystem sandbox. PlugInKit lists only the installed copy.

## Installed Safari observations

Test host: macOS 27 / Safari 27, Apple silicon. No unsigned-extension, cross-origin, or remote-automation bypass was enabled.

On the storage-refactor build 1.0.19 (34):

- Safari displayed the upgraded version. All three existing profiles retained System, their two manual exclusions, their three explicit enables, and the existing site detection.
- Saved Personal as Always Dark with a temporary `news.cornell.edu` manual exclusion; School as Always Light without that exclusion; Cornellians remained System. Each profile retained its independent state after a full normal Safari quit/relaunch. Reopened profile settings through Safari's settings chooser rather than reusing stale extension origins.
- The actual toolbar popup showed the current host and manual exclusion reason. Its website checkbox successfully enabled Cornell News; the live page darkened immediately while its photo retained its colors. The popup's appearance controls changed the live page and its settings cog opened this profile's settings page.
- Temporary Cornell exclusions/overrides were removed, restoring the original two manual exclusions and three explicit enables. Final appearance restoration is recorded below.
- Gmail's starfield retained its colors. In the dedicated Docs regression document, existing and newly typed synthetic text was light on gray in Dark mode and black on white in Light mode. Synthetic edits were undone.
- Real-site review identified a dark-on-dark Cornell masthead and a white Google AI-overview fade; these are site rendering compatibility findings, not evidence of storage failure. They remain follow-up visual checks before launch sign-off.

Found an actual toolbar-popover appearance problem: Safari retained dark system Canvas colors while the saved mode changed to Light. Final 1.0.20 adds explicit popup palette variables keyed to the saved Nightshift mode, retaining live system appearance behavior in System mode. A regression test forces a stale native color scheme and checks rendered colors in both directions.

During the final build, Xcode registered its workspace/archive app copies with Safari. Those registrations invalidated older development extension-page origins and interrupted the live Sheets check. A stale dialog prevented a normal quit; Safari was stopped through Activity Monitor after its normal Quit request failed. After clean replacement, all build/archive registrations were removed and only `/Applications/Nightshift.app` remains registered. Do not attribute that interrupted Sheets check to a verified product regression.

## Final installed Safari verification after user re-enablement

The registration cleanup reset extension enablement. Safari blocked automated re-enabling with its click-protection warning; the user enabled it manually. Completed these checks against installed **1.0.20 (35)** with no further builds or registration changes:

- Safari displayed 1.0.20. The actual toolbar popup switched live from Dark to Light and back to Dark while remaining open; its page also changed immediately. The filled cog and current domain were visible. This confirms the popup palette correction in Safari itself.
- The dedicated Sheets fixture rendered a gray grid and formula bar with light text. Entered synthetic text in previously empty C10 while Dark was selected, committed it, and switched to Light: the saved cell text was black on white. Undid that entry and verified C10 was empty and the document saved to Drive.
- Saved Personal as Light, School as Dark, and kept Cornellians as System. A normal Command-Q completed; Safari was confirmed absent from the running-app inventory. After relaunch and restoring all windows from the last session, each profile retained its separate appearance and both original manual exclusions.
- Restored the baseline recorded at the start of this storage task: System in Personal, School, and Cornellians, with the original manual exclusions and three explicit enables. Diller was enabled incidentally by the global checkbox during manual re-enablement; restored its original disabled state. Safari confirmed Nightshift active only in Personal, School, and Cornellians, with private browsing off.
- Safari's Developer settings showed unsigned extensions, disabled cross-origin restrictions, JavaScript from Apple Events, and remote automation all off. The old native settings file still has its original size and modification time.
- Left Safari running on the final installed build, with Personal's current settings page showing System. Final restart required no registration repair or further activation.

## App Store release gates

The package is locally prepared and verified; that is not App Review approval or complete release sign-off. Address/review the two visual findings, perform the supported macOS/Safari matrix and Intel hardware testing, complete human VoiceOver QA, prepare final screenshots, update the public listing/support copy to describe independent profile preferences, and run TestFlight distribution QA before authorizing submission. The October 15 App Store Connect status in `launch-readiness.md` is historical and was not revalidated remotely in this session.

Artifacts and private logs are under `.build/storage34-*`, `.build/storage35-*`, `.build/AppStoreStorage35/`, and `.build/InstalledBackups/`. Keep them out of Git. Previous app versions were preserved; historical Drop Box artifacts were not changed.
