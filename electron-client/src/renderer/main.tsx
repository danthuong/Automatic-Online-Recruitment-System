import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

document.querySelectorAll('video').forEach(v => {
  v.srcObject = null
  if (v.parentNode) v.parentNode.removeChild(v)
})
console.log('[Startup] Cleaned up stale videos')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
