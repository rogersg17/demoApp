import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Temporary minimal app for testing
function TestApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🧪 React Test App</h1>
      <p>If you see this, React is working!</p>
      <p>Current URL: {window.location.href}</p>
      <button onClick={() => console.log('Button clicked!')}>
        Test Button
      </button>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestApp />
  </StrictMode>,
)
