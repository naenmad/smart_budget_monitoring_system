import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Prevent native browser full-window drag takeover in macOS Safari/Chrome
if (typeof window !== 'undefined') {
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    window.addEventListener(eventName, (e) => e.preventDefault(), false)
    document.addEventListener(eventName, (e) => e.preventDefault(), false)
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
