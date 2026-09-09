import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/themes/context'

import { WakeIndicatorApp } from './wake-indicator-app'

export function mountWakeIndicator(): void {
  const style = document.createElement('style')
  style.textContent = 'html,body,#root{background:transparent !important;overflow:hidden;}'
  document.head.appendChild(style)

  const root = document.getElementById('root')

  if (!root) {
    return
  }

  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary label="wake-indicator">
        <ThemeProvider auxiliary>
          <WakeIndicatorApp />
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )
}
