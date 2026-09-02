import { Link, Route, Routes } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { DocValidation } from './pages/DocValidation'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          QA Platform
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/doc-validation" element={<DocValidation />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
