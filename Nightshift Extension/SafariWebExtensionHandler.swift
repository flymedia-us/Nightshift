import SafariServices

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        guard let item = context.inputItems.first as? NSExtensionItem,
              let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
              message["type"] as? String == "loadSettings" else {
            context.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }

        let response = NSExtensionItem()
        do {
            let library = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            let store = SharedSettings(directory: library.appendingPathComponent("Nightshift", isDirectory: true))
            let settings = try store.load(
                fallback: message["fallback"] as? [String: Any] ?? [:],
                mergeFallback: message["mergeFallback"] as? Bool == true,
                changes: message["changes"] as? [[String: Any]] ?? [],
                clientID: message["clientID"] as? String ?? "legacy"
            )
            response.userInfo = [SFExtensionMessageKey: ["settings": settings]]
        } catch {
            // Do not acknowledge an unsuccessful write: JavaScript keeps the
            // durable pending changes and retries on its next request.
            response.userInfo = [SFExtensionMessageKey: ["error": "Unable to persist shared settings"]]
            NSLog("Nightshift shared settings failed: %@", String(describing: error))
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
