import { useEffect, useState } from 'react'
import axios from 'axios'

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [status, setStatus] = useState('idle') // idle | asking | granted | denied | unsupported

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    setStatus('asking')
    try {
      const { data } = await axios.get('/api/push/key')
      if (!data.publicKey) { setStatus('idle'); return }

      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setStatus('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(data.publicKey),
      })

      await axios.post('/api/push/subscribe', sub.toJSON())
      setStatus('granted')
    } catch (err) {
      console.error('Push subscription error:', err)
      setStatus('idle')
    }
  }

  return { status, subscribe }
}
