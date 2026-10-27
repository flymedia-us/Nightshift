import SafariServices

// Safari's native extension entry point. Preferences use browser.storage.local;
// the extension does not request native messaging or access a shared settings file.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        context.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
