// Service Worker for handling background notifications
// This file runs in the background to handle notifications

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'schedule-notification') {
    const { title, body, timestamp } = event.data.payload;
    const delay = timestamp - Date.now();

    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(title, {
          body: body,
          icon: '/movie-icon.svg',
          badge: '/movie-icon.svg',
          vibrate: [500, 100, 500], // Vibrate pattern for alarm-like feel
          requireInteraction: true, // Keep notification visible until user interacts
          tag: 'movie-night-reminder', // Prevent duplicate notifications
          actions: [
            {
              action: 'view',
              title: 'View Dashboard'
            }
          ]
        });
      }, delay);
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Open or focus the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If app is not open, open it
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim()); // Take control of all pages immediately
});