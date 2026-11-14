import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './app/App'
import './app/register'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
