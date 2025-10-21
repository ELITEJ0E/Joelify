// Service Worker for background playback state persistence
const CACHE_NAME = "joelify-v1"
const PLAYBACK_STATE_KEY = "joelify-playback-state"

// Install event
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install")
  self.skipWaiting()
})

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate")
  event.waitUntil(self.clients.claim())
})

// Message event for saving playback state
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SAVE_PLAYBACK_STATE") {
    console.log("[ServiceWorker] Saving playback state:", event.data.state)
    // Store in IndexedDB or Cache API
    caches.open(CACHE_NAME).then((cache) => {
      const response = new Response(JSON.stringify(event.data.state))
      cache.put(PLAYBACK_STATE_KEY, response)
    })
  }

  if (event.data && event.data.type === "GET_PLAYBACK_STATE") {
    console.log("[ServiceWorker] Getting playback state")
    caches.open(CACHE_NAME).then((cache) => {
      cache.match(PLAYBACK_STATE_KEY).then((response) => {
        if (response) {
          response.json().then((state) => {
            event.ports[0].postMessage({ type: "PLAYBACK_STATE", state })
          })
        } else {
          event.ports[0].postMessage({ type: "PLAYBACK_STATE", state: null })
        }
      })
    })
  }
})

// Fetch event - pass through all requests
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request))
})
