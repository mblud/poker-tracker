import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// 🔥 FIXED SERVICE WORKER with better error handling and cache clearing
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First unregister any existing service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Unregistered old service worker');
      }
      
      // Clear all caches
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
        console.log('Deleted cache:', cacheName);
      }
      
      // Register new service worker with cache busting
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`);
      console.log('Service Worker: Registered successfully', registration);
      
      // Force immediate activation
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Reload page to ensure fresh start
      if (registration.installing) {
        registration.installing.addEventListener('statechange', () => {
          if (registration.installing.state === 'activated') {
            console.log('New service worker activated, reloading...');
            window.location.reload();
          }
        });
      }
      
    } catch (error) {
      console.log('Service Worker: Registration failed', error);
    }
  });
}