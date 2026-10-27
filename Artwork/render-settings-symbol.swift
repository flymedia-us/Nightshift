// Render Apple's unmodified SF Symbol for this macOS Safari extension's UI.
// Regenerate on macOS: npm run icons:settings
// https://developer.apple.com/documentation/appkit/nsimage/init(systemsymbolname:accessibilitydescription:)
import AppKit

let output = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first
    ?? "Nightshift Extension/Resources/settings-gear-fill.png")
guard let symbol = NSImage(systemSymbolName: "gearshape.fill", accessibilityDescription: nil)?
    .withSymbolConfiguration(NSImage.SymbolConfiguration(pointSize: 24, weight: .regular)) else {
    fatalError("Apple's gearshape.fill SF Symbol is unavailable")
}

// Three pixels per point; CSS uses this alpha mask at 24 x 24 points and
// supplies currentColor so the same official symbol works in either appearance.
let pixels = 72
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels,
                                  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
                                  isPlanar: false, colorSpaceName: .deviceRGB,
                                  bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("Unable to create the symbol drawing context")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: pixels, height: pixels).fill(using: .copy)
let scale = min(CGFloat(pixels) / symbol.size.width, CGFloat(pixels) / symbol.size.height)
let size = NSSize(width: symbol.size.width * scale, height: symbol.size.height * scale)
symbol.draw(in: NSRect(x: (CGFloat(pixels) - size.width) / 2,
                       y: (CGFloat(pixels) - size.height) / 2,
                       width: size.width, height: size.height))
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Unable to encode the symbol PNG")
}
try png.write(to: output, options: .atomic)
print("Rendered Apple's gearshape.fill SF Symbol: \(output.path)")
