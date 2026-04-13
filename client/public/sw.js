// Service Worker — Guillon AP
// Maneja push notifications y caché básica

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Push: muestra la notificación
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data.json() } catch {}

  const title   = data.title || 'Guillon AP'
  const options = {
    body:  data.body  || '',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    data:  { url: data.url || '/' },
    vibrate: [200, 100, 200],
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

// Click en notificación: abre/foca la pestaña correspondiente
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/'

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const match = clients.find(c => c.url.includes(self.location.origin))
      if (match) {
        match.focus()
        match.navigate(url)
      } else {
        self.clients.openWindow(url)
      }
    })
  )
})
