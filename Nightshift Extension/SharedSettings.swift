import Foundation
import Darwin

// A file lock covers native requests from every Safari profile/process. The
// atomic JSON write commits preferences and replay sequence numbers together.
final class SharedSettings {
    private let directory: URL
    private let legacyDefaults: UserDefaults

    init(directory: URL, legacyDefaults: UserDefaults = .standard) {
        self.directory = directory
        self.legacyDefaults = legacyDefaults
    }

    func load(fallback: [String: Any], mergeFallback: Bool, changes: [[String: Any]], clientID: String = "legacy") throws -> [String: Any] {
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let descriptor = open(directory.appendingPathComponent("settings.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else { throw POSIXError(.EIO) }
        defer { close(descriptor) }
        guard flock(descriptor, LOCK_EX) == 0 else { throw POSIXError(.EIO) }
        defer { flock(descriptor, LOCK_UN) }

        let file = directory.appendingPathComponent("settings.json")
        var state: [String: Any]
        if FileManager.default.fileExists(atPath: file.path) {
            guard let saved = try JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [String: Any] else {
                throw CocoaError(.fileReadCorruptFile)
            }
            state = saved
        } else {
            // Preserve exclusions saved by older installed builds.
            state = ["settings": legacyDefaults.dictionary(forKey: "nightshift.settings") ?? fallback]
        }
        var settings = state["settings"] as? [String: Any] ?? fallback
        var migratedClients = Set(state["migratedClients"] as? [String] ?? [])
        if mergeFallback && !migratedClients.contains(clientID) {
            for key in ["disabledSites", "autoDisabledSites", "enabledSites"] {
                settings[key] = Array(Set(sites(settings, key)).union(sites(fallback, key))).sorted()
            }
            // Migration must favor a manual exclusion over a stale enable.
            settings["enabledSites"] = sites(settings, "enabledSites").filter { !sites(settings, "disabledSites").contains($0) }
        }
        migratedClients.insert(clientID)
        var sequences = state["sequences"] as? [String: Int] ?? [:]
        for change in changes {
            guard let clientID = change["clientID"] as? String,
                  let sequence = change["sequence"] as? Int, sequence > 0 else {
                throw CocoaError(.coderInvalidValue)
            }
            if sequence <= sequences[clientID, default: 0] { continue }
            settings = try Self.applying(change, to: settings)
            sequences[clientID] = sequence
        }
        settings = Self.normalized(settings)
        state = ["settings": settings, "sequences": sequences, "migratedClients": Array(migratedClients).sorted()]
        try JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]).write(to: file, options: .atomic)
        return settings
    }

    private static func normalized(_ settings: [String: Any]) -> [String: Any] {
        let mode = settings["globalMode"] as? String ?? "system"
        var result: [String: Any] = ["globalMode": ["light", "dark", "system"].contains(mode) ? mode : "system"]
        for key in ["disabledSites", "autoDisabledSites", "enabledSites"] {
            result[key] = Array(Set(settings[key] as? [String] ?? [])).sorted()
        }
        return result
    }

    static func applying(_ change: [String: Any], to value: [String: Any]) throws -> [String: Any] {
        var settings = normalized(value)
        if change["type"] as? String == "setGlobalMode" {
            guard let mode = change["mode"] as? String, ["light", "dark", "system"].contains(mode) else {
                throw CocoaError(.coderInvalidValue)
            }
            settings["globalMode"] = mode
            return settings
        }
        guard let host = change["host"] as? String, !host.isEmpty else { throw CocoaError(.coderInvalidValue) }
        func membership(_ key: String, _ included: Bool) {
            var values = Set(settings[key] as? [String] ?? [])
            if included { values.insert(host) } else { values.remove(host) }
            settings[key] = Array(values).sorted()
        }
        switch change["type"] as? String {
        case "setSiteEnabled":
            let enabled = change["enabled"] as? Bool == true
            membership("disabledSites", !enabled)
            membership("enabledSites", enabled)
        case "setAutoDisabled":
            let overridden = (settings["enabledSites"] as? [String] ?? []).contains(host)
            membership("autoDisabledSites", change["excluded"] as? Bool == true && !overridden)
        case "removeExcludedSite":
            membership("disabledSites", false)
            membership("autoDisabledSites", false)
            membership("enabledSites", true)
        default:
            throw CocoaError(.coderInvalidValue)
        }
        return settings
    }

    private func sites(_ settings: [String: Any], _ key: String) -> [String] {
        settings[key] as? [String] ?? []
    }
}
