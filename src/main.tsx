import './global.css'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const el = document.getElementById('app')
if (!el) throw new Error('Missing #app element')

createRoot(el).render(<App />)
