import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const initialState = window.__INITIAL_STATE__

if (!initialState) {
  throw new Error('Missing initial state')
}

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App initialData={initialState.initialData} initialTicker={initialState.initialTicker} />
  </StrictMode>,
)
