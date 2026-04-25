import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    var deviceToken: String?

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
        self.deviceToken = token
        print("[APNs] Token: \(token.prefix(20))...")
        UserDefaults.standard.set(token, forKey: "apns_device_token")

        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)

        // Inject token into WebView so JavaScript can read it
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            self.injectTokenToWebView()
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[APNs] Failed: \(error.localizedDescription)")
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    private func injectTokenToWebView() {
        guard let token = self.deviceToken else { return }
        guard let vc = window?.rootViewController as? CAPBridgeViewController else { return }

        let js = """
        (function() {
            window.__APNS_TOKEN__ = '\(token)';
            console.log('[APNs] Token injected into WebView');
            // Auto-register if auth token exists
            var authToken = localStorage.getItem('actledger_token');
            if (authToken && authToken.length > 10) {
                var apiBase = 'https://api.actledger.com/api/v1';
                fetch(apiBase + '/notifications/device-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + authToken
                    },
                    body: JSON.stringify({ token: '\(token)', platform: 'apns' })
                }).then(function(r) {
                    console.log('[APNs] Token registered:', r.status);
                }).catch(function(e) {
                    console.log('[APNs] Token registration failed:', e);
                });
            } else {
                console.log('[APNs] No auth token yet, will register on login');
            }
        })();
        """
        vc.webView?.evaluateJavaScript(js, completionHandler: { _, error in
            if let error = error {
                print("[APNs] JS injection error: \(error)")
            } else {
                print("[APNs] Token injected successfully")
            }
        })
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Re-inject token when app comes to foreground
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.injectTokenToWebView()
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
