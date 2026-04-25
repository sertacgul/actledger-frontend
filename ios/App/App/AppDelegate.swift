import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[APNs] Token: \(token.prefix(20))...")
        UserDefaults.standard.set(token, forKey: "apns_device_token")
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        // Inject token via JavaScript into the WKWebView
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            self.injectToken(token)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNs] Failed: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    private func injectToken(_ token: String) {
        // Find the WKWebView in the view hierarchy
        guard let rootVC = window?.rootViewController else {
            print("[APNs] No root VC")
            return
        }

        func findWebView(in view: UIView) -> WKWebView? {
            if let wk = view as? WKWebView { return wk }
            for sub in view.subviews {
                if let found = findWebView(in: sub) { return found }
            }
            return nil
        }

        guard let webView = findWebView(in: rootVC.view) else {
            print("[APNs] No WKWebView found, retrying in 3s...")
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                self.injectToken(token)
            }
            return
        }

        let js = "window.__APNS_TOKEN__ = '\(token)'; localStorage.setItem('apns_device_token', '\(token)'); console.log('[APNs] Token stored');"
        webView.evaluateJavaScript(js) { _, error in
            if let error = error {
                print("[APNs] JS error: \(error.localizedDescription)")
            } else {
                print("[APNs] Token injected OK")
            }
        }
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        if let token = UserDefaults.standard.string(forKey: "apns_device_token") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.injectToken(token)
            }
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.badge, .sound, .banner])
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }
}
