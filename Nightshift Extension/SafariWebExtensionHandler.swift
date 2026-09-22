import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private let settingsKey = "nightshift.settings"

    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any] else {
            context.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }

        // Safari sends each profile through a distinct JavaScript extension
        // instance, but this native extension container is shared. Deliberately
        // keep site settings here so exclusions apply to every profile.
        let defaults = UserDefaults.standard

        let fallback = message["fallback"] as? [String: Any] ?? [:]
        let settings: [String: Any]
        switch message["type"] as? String {
        case "loadSettings":
            if let storedSettings = defaults.dictionary(forKey: settingsKey) {
                settings = message["mergeFallback"] as? Bool == true
                    ? mergedSettings(storedSettings, fallback)
                    : storedSettings
                defaults.set(settings, forKey: settingsKey)
            } else {
                settings = fallback
                defaults.set(settings, forKey: settingsKey)
            }
        case "saveSettings":
            settings = message["settings"] as? [String: Any] ?? fallback
            defaults.set(settings, forKey: settingsKey)
        default:
            context.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }

        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: ["settings": settings]]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

    private func mergedSettings(_ storedSettings: [String: Any], _ fallback: [String: Any]) -> [String: Any] {
        var merged = storedSettings
        for key in ["disabledSites", "autoDisabledSites", "enabledSites"] {
            let storedSites = Set(storedSettings[key] as? [String] ?? [])
            let fallbackSites = Set(fallback[key] as? [String] ?? [])
            merged[key] = Array(storedSites.union(fallbackSites)).sorted()
        }
        return merged
    }
}
