import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { AppIntlProvider } from './i18n/provider'
import { router } from './router'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppIntlProvider>
      <RouterProvider router={router} />
    </AppIntlProvider>
  </StrictMode>,
)
