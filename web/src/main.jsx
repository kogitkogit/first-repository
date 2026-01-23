import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Dialog } from '@capacitor/dialog'
import App from './App.jsx'
import './index.css'

const setupAndroidBackHandler = () => {
  if (!Capacitor.isNativePlatform()) return

  CapApp.addListener('backButton', async ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
      return
    }
    const { value } = await Dialog.confirm({
      title: '앱 종료',
      message: '앱을 종료하시겠습니까?',
      okButtonTitle: '종료',
      cancelButtonTitle: '취소',
    })
    if (value) {
      CapApp.exitApp()
    }
  })
}

setupAndroidBackHandler()

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
