import AppKit
import UniformTypeIdentifiers
import WebKit

private let appPort = 43871
private let homeURL = URL(string: "http://localhost:\(appPort)/")!

final class Backend {
  let process = Process()
  let token = UUID().uuidString
  let support: URL
  let resources: URL
  var log: FileHandle?

  init(support: URL? = nil) throws {
    self.resources = Bundle.main.resourceURL!
    self.support =
      support
      ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("Sparkboard", isDirectory: true)
    try FileManager.default.createDirectory(at: self.support, withIntermediateDirectories: true)
    let logURL = self.support.appendingPathComponent("server.log")
    if !FileManager.default.fileExists(atPath: logURL.path) {
      FileManager.default.createFile(atPath: logURL.path, contents: nil)
    }
    log = try FileHandle(forWritingTo: logURL)
    try log?.seekToEnd()
    process.executableURL = resources.appendingPathComponent("runtime/node")
    process.arguments = [
      resources.appendingPathComponent("web/desktop/run-desktop.cjs").path,
      self.support.appendingPathComponent("updates", isDirectory: true).path, token,
      String(appPort),
    ]
    var env = ProcessInfo.processInfo.environment
    for name in ["NODE_OPTIONS", "NODE_PATH", "DYLD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES"] {
      env.removeValue(forKey: name)
    }
    env["SPARKBOARD_PARENT_PID"] = String(ProcessInfo.processInfo.processIdentifier)
    process.environment = env
    process.currentDirectoryURL = self.support
    process.standardOutput = log
    process.standardError = log
  }
  func start() throws { try process.run() }
  func stop() { if process.isRunning { process.terminate() } }
  func ready(completion: @escaping (Bool) -> Void) {
    var request = URLRequest(url: homeURL.appendingPathComponent("_desktop/health"))
    request.timeoutInterval = 1
    URLSession.shared.dataTask(with: request) { data, _, _ in
      let result = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
      completion(
        result?["app"] as? String == "sparkboard" && result?["token"] as? String == self.token)
    }.resume()
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate,
  WKScriptMessageHandler, WKDownloadDelegate
{
  var window: NSWindow!
  var webView: WKWebView!
  var backend: Backend?
  var timer: Timer?
  var attempts = 0
  var extraWindows: [NSWindow] = []
  var indicator: NSProgressIndicator?

  func applicationDidFinishLaunching(_ notification: Notification) {
    makeMenus()
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .default()
    configure(configuration)
    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    webView.uiDelegate = self
    webView.allowsBackForwardNavigationGestures = false
    window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1280, height: 840),
      styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false
    )
    window.title = "Sparkboard"
    window.minSize = NSSize(width: 720, height: 540)
    window.isReleasedWhenClosed = false
    window.contentView = webView
    window.center()
    window.makeKeyAndOrderFront(nil)
    NSApplication.shared.activate(ignoringOtherApps: true)
    let spinner = NSProgressIndicator(frame: NSRect(x: 0, y: 0, width: 32, height: 32))
    spinner.style = .spinning
    spinner.translatesAutoresizingMaskIntoConstraints = false
    webView.addSubview(spinner)
    NSLayoutConstraint.activate([
      spinner.centerXAnchor.constraint(equalTo: webView.centerXAnchor),
      spinner.centerYAnchor.constraint(equalTo: webView.centerYAnchor),
    ])
    spinner.startAnimation(nil)
    indicator = spinner
    do {
      backend = try Backend()
      try backend!.start()
      timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
        self?.checkReady()
      }
    } catch { showError(error.localizedDescription) }
  }
  func configure(_ config: WKWebViewConfiguration) {
    config.preferences.javaScriptCanOpenWindowsAutomatically = true
    config.userContentController.removeScriptMessageHandler(forName: "sparkboardNative")
    config.userContentController.add(self, name: "sparkboardNative")
    config.userContentController.addUserScript(
      WKUserScript(
        source:
          "window.print = () => window.webkit.messageHandlers.sparkboardNative.postMessage({action:'print'});",
        injectionTime: .atDocumentStart, forMainFrameOnly: true))
  }
  func checkReady() {
    attempts += 1
    if attempts > 75 || backend?.process.isRunning == false {
      timer?.invalidate()
      showError(
        "Sparkboard’s local service could not start. Quit any other Sparkboard instance and try again. Details are in ~/Library/Application Support/Sparkboard/server.log."
      )
      return
    }
    backend?.ready { [weak self] ready in
      DispatchQueue.main.async {
        guard let self, ready, self.timer?.isValid == true else { return }
        self.timer?.invalidate()
        self.webView.load(URLRequest(url: homeURL))
      }
    }
  }
  func showError(_ message: String) {
    indicator?.stopAnimation(nil)
    let alert = NSAlert()
    alert.messageText = "Sparkboard could not start"
    alert.informativeText = message
    alert.addButton(withTitle: "Quit")
    alert.runModal()
    NSApplication.shared.terminate(nil)
  }
  // A debounced edit must reach IndexedDB before the WebKit process is stopped.
  func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
    guard let view = webView, backend?.process.isRunning == true else { return .terminateNow }
    view.callAsyncJavaScript(
      "if (window.sparkboardBeforeUpdate) await window.sparkboardBeforeUpdate();",
      arguments: [:], in: nil, in: .page
    ) { [weak self] result in
      switch result {
      case .success:
        sender.reply(toApplicationShouldTerminate: true)
      case .failure(let error):
        let alert = NSAlert()
        alert.messageText = "Your latest changes could not be saved"
        alert.informativeText =
          "Keep Sparkboard open to export a backup. " + error.localizedDescription
        alert.addButton(withTitle: "Keep Open")
        alert.addButton(withTitle: "Quit Without Saving")
        let quit = alert.runModal() == .alertSecondButtonReturn
        if !quit { self?.window.makeKeyAndOrderFront(nil) }
        sender.reply(toApplicationShouldTerminate: quit)
      }
    }
    return .terminateLater
  }
  func applicationWillTerminate(_ notification: Notification) {
    timer?.invalidate()
    backend?.stop()
  }
  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
  func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool
  {
    window?.makeKeyAndOrderFront(nil)
    return true
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    if webView == self.webView {
      indicator?.removeFromSuperview()
      indicator = nil
    }
  }
  func webView(
    _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard let url = navigationAction.request.url else {
      decisionHandler(.allow)
      return
    }
    if navigationAction.shouldPerformDownload {
      decisionHandler(.download)
      return
    }
    if url.scheme == "blob" || url.scheme == "data" || url.absoluteString == "about:blank" {
      decisionHandler(.allow)
      return
    }
    if url.host == "localhost" && url.port == appPort {
      decisionHandler(.allow)
      return
    }
    // Embedded videos/maps must navigate inside their own frame. Only external
    // top-level navigations are handed off to the system browser.
    if navigationAction.targetFrame?.isMainFrame == false,
      ["https", "http"].contains(url.scheme ?? "") {
      decisionHandler(.allow)
      return
    }
    if ["https", "http"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }
    decisionHandler(.cancel)
  }
  func webView(
    _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
    for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    if let url = navigationAction.request.url, ["https", "http"].contains(url.scheme ?? ""),
      url.host != "localhost"
    {
      NSWorkspace.shared.open(url)
      return nil
    }
    configure(configuration)
    let child = WKWebView(frame: .zero, configuration: configuration)
    child.uiDelegate = self
    child.navigationDelegate = self
    let extra = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1080, height: 760),
      styleMask: [.titled, .closable, .resizable], backing: .buffered, defer: false)
    extra.title = "Sparkboard — Print"
    extra.contentView = child
    extra.isReleasedWhenClosed = false
    extra.center()
    extra.makeKeyAndOrderFront(nil)
    extraWindows.append(extra)
    return child
  }
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard message.name == "sparkboardNative", let body = message.body as? [String: Any],
      body["action"] as? String == "print", let source = message.webView
    else { return }
    let operation = source.printOperation(with: NSPrintInfo.shared)
    operation.showsPrintPanel = true
    operation.showsProgressPanel = true
    operation.run()
  }
  func webView(
    _ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
    initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void
  ) {
    let alert = NSAlert()
    alert.messageText = "Sparkboard"
    alert.informativeText = message
    alert.addButton(withTitle: "OK")
    alert.runModal()
    completionHandler()
  }
  func webView(
    _ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
    initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void
  ) {
    let alert = NSAlert()
    alert.messageText = "Sparkboard"
    alert.informativeText = message
    alert.addButton(withTitle: "Continue")
    alert.addButton(withTitle: "Cancel")
    completionHandler(alert.runModal() == .alertFirstButtonReturn)
  }
  func webView(
    _ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
    defaultText: String?, initiatedByFrame frame: WKFrameInfo,
    completionHandler: @escaping (String?) -> Void
  ) {
    let alert = NSAlert()
    alert.messageText = "Sparkboard"
    alert.informativeText = prompt
    let field = NSTextField(string: defaultText ?? "")
    field.frame = NSRect(x: 0, y: 0, width: 300, height: 24)
    alert.accessoryView = field
    alert.addButton(withTitle: "Save")
    alert.addButton(withTitle: "Cancel")
    completionHandler(alert.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
  }
  func webView(
    _ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters,
    initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void
  ) {
    let panel = NSOpenPanel()
    panel.allowsMultipleSelection = parameters.allowsMultipleSelection
    panel.canChooseDirectories = parameters.allowsDirectories
    panel.canChooseFiles = true
    panel.beginSheetModal(for: webView.window ?? window) { result in
      completionHandler(result == .OK ? panel.urls : nil)
    }
  }
  func webView(
    _ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload
  ) { download.delegate = self }
  func webView(
    _ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload
  ) { download.delegate = self }
  func download(
    _ download: WKDownload, decideDestinationUsing response: URLResponse, suggestedFilename: String,
    completionHandler: @escaping (URL?) -> Void
  ) {
    let panel = NSSavePanel()
    panel.nameFieldStringValue = suggestedFilename
    panel.canCreateDirectories = true
    panel.beginSheetModal(for: window) { result in
      completionHandler(result == .OK ? panel.url : nil)
    }
  }
  func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
    let alert = NSAlert()
    alert.messageText = "The export could not be saved"
    alert.informativeText = error.localizedDescription
    alert.runModal()
  }
  @objc func undoBoard() {
    webView.evaluateJavaScript(
      "if (document.activeElement?.matches('input,textarea,[contenteditable]')) { document.execCommand('undo'); } else { document.getElementById('undo')?.click(); }",
      completionHandler: nil)
  }
  @objc func redoBoard() {
    webView.evaluateJavaScript(
      "if (document.activeElement?.matches('input,textarea,[contenteditable]')) { document.execCommand('redo'); } else { document.getElementById('redo')?.click(); }",
      completionHandler: nil)
  }
  @objc func selectAllItems() {
    webView.evaluateJavaScript(
      "if (document.activeElement?.matches('input,textarea,[contenteditable]')) { document.execCommand('selectAll'); } else { window.dispatchEvent(new KeyboardEvent('keydown', { key:'a', metaKey:true, bubbles:true, cancelable:true })); }",
      completionHandler: nil)
  }
  @objc func reloadBoard() { webView.reload() }
  @objc func showUpdates() {
    webView.evaluateJavaScript(
      "document.getElementById('updates')?.click()", completionHandler: nil)
  }
  @objc func printBoard() {
    webView.evaluateJavaScript("document.getElementById('export')?.click()", completionHandler: nil)
  }
  @objc func importBoard() {
    webView.evaluateJavaScript(
      "document.getElementById('import-file')?.click()", completionHandler: nil)
  }
  func makeMenus() {
    let bar = NSMenu()
    NSApp.mainMenu = bar
    let appItem = NSMenuItem()
    bar.addItem(appItem)
    let app = NSMenu()
    appItem.submenu = app
    app.addItem(
      withTitle: "About Sparkboard",
      action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
    app.addItem(NSMenuItem.separator())
    let updates = app.addItem(
      withTitle: "App Updates…", action: #selector(showUpdates), keyEquivalent: "")
    updates.target = self
    app.addItem(NSMenuItem.separator())
    app.addItem(
      withTitle: "Hide Sparkboard", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
    app.addItem(NSMenuItem.separator())
    app.addItem(
      withTitle: "Quit Sparkboard", action: #selector(NSApplication.terminate(_:)),
      keyEquivalent: "q")
    let fileItem = NSMenuItem()
    fileItem.title = "File"
    bar.addItem(fileItem)
    let file = NSMenu(title: "File")
    fileItem.submenu = file
    let importItem = file.addItem(
      withTitle: "Import Board…", action: #selector(importBoard), keyEquivalent: "o")
    importItem.target = self
    let exportItem = file.addItem(
      withTitle: "Export Board…", action: #selector(printBoard), keyEquivalent: "p")
    exportItem.target = self
    file.addItem(NSMenuItem.separator())
    file.addItem(
      withTitle: "Close Window", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
    let editItem = NSMenuItem()
    editItem.title = "Edit"
    bar.addItem(editItem)
    let edit = NSMenu(title: "Edit")
    editItem.submenu = edit
    let undo = edit.addItem(withTitle: "Undo", action: #selector(undoBoard), keyEquivalent: "z")
    undo.target = self
    let redo = edit.addItem(withTitle: "Redo", action: #selector(redoBoard), keyEquivalent: "Z")
    redo.target = self
    redo.keyEquivalentModifierMask = [.command, .shift]
    edit.addItem(NSMenuItem.separator())
    for (title, action, key) in [
      ("Cut", "cut:", "x"), ("Copy", "copy:", "c"), ("Paste", "paste:", "v"),
    ] { edit.addItem(withTitle: title, action: Selector(action), keyEquivalent: key) }
    let selectAll = edit.addItem(
      withTitle: "Select All", action: #selector(selectAllItems), keyEquivalent: "a")
    selectAll.target = self
    let viewItem = NSMenuItem()
    viewItem.title = "View"
    bar.addItem(viewItem)
    let view = NSMenu(title: "View")
    viewItem.submenu = view
    let reload = view.addItem(
      withTitle: "Reload Board", action: #selector(reloadBoard), keyEquivalent: "r")
    reload.target = self
    let windowItem = NSMenuItem()
    windowItem.title = "Window"
    bar.addItem(windowItem)
    let windows = NSMenu(title: "Window")
    windowItem.submenu = windows
    NSApp.windowsMenu = windows
    windows.addItem(
      withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
    windows.addItem(
      withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
  }
}

if let index = CommandLine.arguments.firstIndex(of: "--smoke-test"),
  CommandLine.arguments.count > index + 1
{
  do {
    let backend = try Backend(
      support: URL(fileURLWithPath: CommandLine.arguments[index + 1], isDirectory: true))
    try backend.start()
    defer { backend.stop() }
    var success = false
    for _ in 0..<50 {
      let semaphore = DispatchSemaphore(value: 0)
      backend.ready { ready in
        success = ready
        semaphore.signal()
      }
      _ = semaphore.wait(timeout: .now() + 2)
      if success { break }
      if !backend.process.isRunning { break }
      Thread.sleep(forTimeInterval: 0.1)
    }
    backend.stop()
    backend.process.waitUntilExit()
    if success {
      print("Sparkboard packaged runtime and local service: OK")
      exit(0)
    } else {
      fputs("Sparkboard desktop smoke test failed.\n", stderr)
      exit(1)
    }
  } catch {
    fputs("\(error)\n", stderr)
    exit(1)
  }
}
let application = NSApplication.shared
let appDelegate = AppDelegate()
application.delegate = appDelegate
application.setActivationPolicy(.regular)
application.run()
