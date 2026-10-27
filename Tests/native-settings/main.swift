import Foundation
import Darwin

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() { fatalError(message) }
}
func change(_ type: String, _ host: String, _ client: String, _ sequence: Int, _ extra: [String: Any] = [:]) -> [String: Any] {
    ["type": type, "host": host, "clientID": client, "sequence": sequence].merging(extra) { _, new in new }
}

// Test the production JavaScript/native protocol across independent processes.
if CommandLine.arguments.count == 3 && CommandLine.arguments[1] == "--request" {
    let message = try JSONSerialization.jsonObject(with: FileHandle.standardInput.readDataToEndOfFile()) as! [String: Any]
    let store = SharedSettings(directory: URL(fileURLWithPath: CommandLine.arguments[2]), legacyDefaults: UserDefaults(suiteName: "NightshiftNativeBridgeTests")!)
    let settings = try store.load(fallback: message["fallback"] as? [String: Any] ?? [:],
                                  mergeFallback: message["mergeFallback"] as? Bool == true,
                                  changes: message["changes"] as? [[String: Any]] ?? [],
                                  clientID: message["clientID"] as? String ?? "legacy")
    let response = try JSONSerialization.data(withJSONObject: ["settings": settings])
    FileHandle.standardOutput.write(response)
    exit(0)
}

if CommandLine.arguments.count == 5 && CommandLine.arguments[1] == "--writer" {
    let directory = URL(fileURLWithPath: CommandLine.arguments[2])
    let independent = SharedSettings(directory: directory, legacyDefaults: UserDefaults(suiteName: CommandLine.arguments[3])!)
    let index = CommandLine.arguments[4]
    _ = try independent.load(fallback: [:], mergeFallback: false, changes: [change("setSiteEnabled", "site\(index).example", "child\(index)", 1, ["enabled": false])])
    exit(0)
}

let temporary = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
defer { try? FileManager.default.removeItem(at: temporary) }
let suite = "NightshiftTests-\(UUID().uuidString)"
let defaults = UserDefaults(suiteName: suite)!
defer { defaults.removePersistentDomain(forName: suite) }
defaults.set(["globalMode": "dark", "disabledSites": ["legacy.example"]], forKey: "nightshift.settings")
let store = SharedSettings(directory: temporary, legacyDefaults: defaults)
let migrated = try store.load(fallback: ["disabledSites": ["profile.example"]], mergeFallback: true, changes: [])
expect(migrated["disabledSites"] as? [String] == ["legacy.example", "profile.example"], "Legacy and profile exclusions must migrate")

let disable = change("setSiteEnabled", "github.com", "A", 1, ["enabled": false])
_ = try store.load(fallback: [:], mergeFallback: false, changes: [disable])
_ = try store.load(fallback: [:], mergeFallback: false, changes: [change("setSiteEnabled", "github.com", "B", 1, ["enabled": true])])
let restarted = SharedSettings(directory: temporary, legacyDefaults: defaults)
let replayed = try restarted.load(fallback: [:], mergeFallback: false, changes: [disable])
expect(!(replayed["disabledSites"] as! [String]).contains("github.com"), "Retry must not undo another profile's newer override")
let detected = try restarted.load(fallback: [:], mergeFallback: false, changes: [change("setAutoDisabled", "github.com", "A", 2, ["excluded": true])])
expect(!(detected["autoDisabledSites"] as! [String]).contains("github.com"), "Delayed detection must respect user enable")
let automatic = try restarted.load(fallback: [:], mergeFallback: false, changes: [change("resetSiteOverride", "github.com", "A", 3)])
expect(!(automatic["enabledSites"] as! [String]).contains("github.com"), "Restoring automatic rules must clear explicit enable")

// A lost acknowledgement during first migration must not re-import the old
// profile snapshot when a newer profile has already re-enabled that host.
let retryStore = SharedSettings(directory: temporary.appendingPathComponent("retry"), legacyDefaults: defaults)
_ = try retryStore.load(fallback: ["disabledSites": ["github.com"]], mergeFallback: true, changes: [disable], clientID: "A")
_ = try retryStore.load(fallback: [:], mergeFallback: true, changes: [change("setSiteEnabled", "github.com", "B", 1, ["enabled": true])], clientID: "B")
let retriedMigration = try retryStore.load(fallback: ["disabledSites": ["github.com"]], mergeFallback: true, changes: [disable], clientID: "A")
expect(!(retriedMigration["disabledSites"] as! [String]).contains("github.com"), "Retry must not repeat a completed profile migration")

let staleProfile = try retryStore.load(fallback: ["disabledSites": ["github.com", "new.example"]], mergeFallback: true, changes: [], clientID: "old-profile")
expect(!(staleProfile["disabledSites"] as! [String]).contains("github.com"), "A newly migrated stale profile must not undo a shared enable")
expect((staleProfile["disabledSites"] as! [String]).contains("new.example"), "Migration must retain previously unknown exclusions")
_ = try retryStore.load(fallback: [:], mergeFallback: false, changes: [change("setSiteEnabled", "blocked.example", "B", 2, ["enabled": false])], clientID: "B")
let staleEnable = try retryStore.load(fallback: ["enabledSites": ["blocked.example"]], mergeFallback: true, changes: [], clientID: "another-old-profile")
expect(!(staleEnable["enabledSites"] as! [String]).contains("blocked.example"), "Migration must not undo a shared disable")

// Launch independent processes so this exercises the file lock, not a JS queue.
var children: [Process] = []
for index in 0..<12 {
    let child = Process()
    child.executableURL = URL(fileURLWithPath: CommandLine.arguments[0])
    child.arguments = ["--writer", temporary.path, suite, String(index)]
    try child.run()
    children.append(child)
}
for child in children {
    child.waitUntilExit()
    expect(child.terminationStatus == 0, "Concurrent native write failed")
}
let persisted = try restarted.load(fallback: [:], mergeFallback: false, changes: [])
for index in 0..<12 {
    expect((persisted["disabledSites"] as! [String]).contains("site\(index).example"), "Concurrent profile exclusion was lost")
}
expect(persisted["globalMode"] as? String == "dark", "Auto exclusions must not reset global mode")

let removed = try restarted.load(fallback: [:], mergeFallback: false, changes: [change("removeExcludedSite", "site0.example", "A", 4)])
expect(!(removed["disabledSites"] as! [String]).contains("site0.example"), "Removal must clear the manual exclusion")
expect((removed["enabledSites"] as! [String]).contains("site0.example"), "Removal must persist an override against re-detection")
let before = try Data(contentsOf: temporary.appendingPathComponent("settings.json"))
do {
    _ = try restarted.load(fallback: [:], mergeFallback: false, changes: [change("invalid", "github.com", "A", 5)])
    fatalError("Invalid change was accepted")
} catch {}
let after = try Data(contentsOf: temporary.appendingPathComponent("settings.json"))
expect(after == before, "Failed write must leave committed settings intact")
print("Native settings tests passed: migration, restart, retry, overrides, concurrent processes, and failed writes")
