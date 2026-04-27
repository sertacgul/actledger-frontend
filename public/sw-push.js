// Custom push notification handler for ActLedger PWA
// This file is loaded alongside Workbox SW

self.addEventListener('push', function(event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'ActLedger', body: event.data.text() }
  }

  const title = data.title || 'ActLedger'
  const options = {
    body: data.body || '',
    icon: '/images/icon-192.png',
    badge: '/images/icon-192.png',
    tag: data.tag || 'actledger-notification',
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/m/bildirimler' },
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const url = event.notification.data?.url || '/m/bildirimler'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing window if found
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
