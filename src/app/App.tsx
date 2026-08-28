import { RouterProvider } from '@tanstack/react-router'
import { AppProviders } from './providers/AppProviders'
import { router } from './router'
import { AppErrorBoundary } from './AppErrorBoundary'

export function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  )
}
