import UIKit
import Capacitor
import OneSignalFramework

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        // OneSignal initialization
        OneSignal.initialize("9c0628c7-c1a5-475c-8647-541d3eb21bd1", withLaunchOptions: launchOptions)
        OneSignal.Notifications.requestPermission({ accepted in
            print("[OneSignal] Permission accepted: \(accepted)")
        }, fallbackToSettings: true)

        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Set external user ID when web page loads and user logs in
        setExternalUserId()
    }

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    private func setExternalUserId() {
        // Read user ID from the WebView's localStorage
        guard let rootVC = window?.rootViewController else { return }

        func findWebView(in view: UIView) -> WKWebView? {
            if let wk = view as? WKWebView { return wk }
            for sub in view.subviews {
                if let found = findWebView(in: sub) { return found }
            }
            return nil
        }

        guard let webView = findWebView(in: rootVC.view) else { return }

        // Get user ID from localStorage to link OneSignal with ActLedger user
        webView.evaluateJavaScript("localStorage.getItem('actledger_user_id')") { result, _ in
            if let userId = result as? String, !userId.isEmpty {
                OneSignal.login(userId)
                print("[OneSignal] External ID set: \(userId.prefix(12))...")
            }
        }
    }
}
