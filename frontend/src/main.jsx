import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// KEEP SERVICE WORKER ACTIVE (now with better caching)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=v2025-08-06')
      .then((registration) => {
        console.log('Service Worker: Registered successfully', registration);
      })
      .catch((error) => {
        console.log('Service Worker: Registration failed', error);
      });
  });
}