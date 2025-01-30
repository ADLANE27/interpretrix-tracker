self.addEventListener('push', event => {
  console.log('Push message received:', event)
  
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
      data: data.data || {},
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Ouvrir'
        },
        {
          action: 'close',
          title: 'Fermer'
        }
      ]
    }

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  }
})

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event)
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0]
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i]
          }
        }
        return client.focus()
      }
      return clients.openWindow('/')
    })
  )
})