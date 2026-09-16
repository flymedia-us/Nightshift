import SafariServices
import SwiftUI

struct ContentView: View {
    @StateObject private var model = ExtensionSettingsModel()

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "moon.stars.fill")
                .font(.system(size: 64, weight: .medium))
                .symbolRenderingMode(.hierarchical)
                .foregroundStyle(.indigo)
                .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text("Nightshift")
                    .font(.largeTitle.bold())

                Text("Choose when websites use Nightshift from the Safari toolbar.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 10) {
                Label("Always Light leaves websites unchanged.", systemImage: "sun.max")
                Label("Always Dark applies Nightshift at all times.", systemImage: "moon")
                Label("System follows your Mac's appearance.", systemImage: "circle.lefthalf.filled")
            }
            .font(.callout)

            Label(
                "Website access is used only to apply the appearance you choose. Nightshift doesn't send your browsing data anywhere.",
                systemImage: "hand.raised.fill"
            )
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: 390, alignment: .leading)

            Button("Open Safari Extension Settings") {
                model.openSafariExtensionSettings()
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(36)
        .alert("Couldn't Open Safari Settings", isPresented: $model.isShowingError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.errorMessage)
        }
    }
}

@MainActor
private final class ExtensionSettingsModel: ObservableObject {
    private static let extensionIdentifier = "com.FlyMedia.Nightshift.Extension"

    @Published var isShowingError = false
    @Published var errorMessage = "An unknown error occurred."

    func openSafariExtensionSettings() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: Self.extensionIdentifier) { [weak self] error in
            guard let message = error?.localizedDescription else { return }

            Task { @MainActor in
                self?.errorMessage = message
                self?.isShowingError = true
            }
        }
    }
}
