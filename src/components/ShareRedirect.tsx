import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Handles Web Share Target API redirects.
 * The manifest routes shares to /share?title=...&text=...&url=...
 * We combine them and redirect to /verify with the text as location state.
 */
export default function ShareRedirect() {
  const [params] = useSearchParams()
  const title = params.get('title') ?? ''
  const text = params.get('text') ?? ''
  const url = params.get('url') ?? ''

  // Combine shared content into a single string
  const parts = [title, text, url].filter(Boolean)
  const combined = parts.join('\n\n') || ''

  // Navigate to /verify with the shared text
  return <Navigate to="/verify" replace state={{ query: combined, shared: true }} />
}