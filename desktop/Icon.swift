import AppKit
let output = CommandLine.arguments[1]
let icon = NSImage(size: NSSize(width: 1024, height: 1024))
icon.lockFocus()
NSColor(calibratedRed: 0.98, green: 0.98, blue: 0.94, alpha: 1).setFill()
NSBezierPath(roundedRect: NSRect(x: 65, y: 65, width: 894, height: 894), xRadius: 195, yRadius: 195).fill()
NSColor(calibratedRed: 0.88, green: 0.90, blue: 0.83, alpha: 0.8).setFill()
for x in stride(from: 170, through: 854, by: 76) { for y in stride(from: 170, through: 854, by: 76) { NSBezierPath(ovalIn: NSRect(x: x, y: y, width: 7, height: 7)).fill() } }
let shadow = NSShadow(); shadow.shadowColor = NSColor(calibratedWhite: 0.3, alpha: 0.08); shadow.shadowBlurRadius = 16; shadow.shadowOffset = NSSize(width: 0, height: -7); shadow.set()
NSColor.white.setFill(); NSBezierPath(roundedRect: NSRect(x: 238, y: 238, width: 548, height: 548), xRadius: 105, yRadius: 105).fill()
NSShadow().set()
NSColor(calibratedRed: 0.91, green: 0.52, blue: 0.35, alpha: 1).setStroke()
for angle in [0.0, 45.0, 90.0, 135.0] { let rad = angle * .pi / 180, dx = cos(rad) * 190, dy = sin(rad) * 190; let line = NSBezierPath(); line.lineWidth = 21; line.lineCapStyle = .round; line.move(to: NSPoint(x: 512-dx, y: 512-dy)); line.line(to: NSPoint(x: 512+dx, y: 512+dy)); line.stroke() }
icon.unlockFocus()
let data = NSBitmapImageRep(data: icon.tiffRepresentation!)!.representation(using: .png, properties: [:])!
try data.write(to: URL(fileURLWithPath: output))
