import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ThemeProvider } from './hooks/useTheme'
import { Ajustes } from './pages/Ajustes'
import { Dashboard } from './pages/Dashboard'
import { DocValidation } from './pages/DocValidation'
import { Reportes } from './pages/Reportes'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-surface text-on-surface">
        <Header />
        <main className="w-full pt-16">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/doc-validation" element={<DocValidation />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  )
}

export default App
