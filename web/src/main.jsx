import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from "./components/ui/ToastProvider.jsx";
import AdMobBootstrap from "./components/ads/AdMobBootstrap.jsx";

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AdMobBootstrap />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ToastProvider>
  </React.StrictMode>
)
