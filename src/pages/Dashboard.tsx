import { Link } from 'react-router-dom'

const MODULES = [
  {
    name: 'Validación de documentos',
    description: 'Compara documentos generados (PDF/DOCX) contra su plantilla esperada.',
    path: '/doc-validation',
    available: true,
  },
  {
    name: 'Validación de API',
    description: 'Pruebas de respuestas de API y cálculos financieros (api-qa-framework).',
    path: '#',
    available: false,
  },
  {
    name: 'Automatización E2E',
    description: 'Suite de pruebas end-to-end con Cucumber sobre la plataforma.',
    path: '#',
    available: false,
  },
]

export function Dashboard() {
  return (
    <div className="page">
      <h1>Plataforma de QA</h1>
      <div className="module-grid">
        {MODULES.map((m) => (
          <div key={m.name} className={`module-card ${m.available ? '' : 'module-disabled'}`}>
            <h2>{m.name}</h2>
            <p>{m.description}</p>
            {m.available ? (
              <Link to={m.path}>Abrir →</Link>
            ) : (
              <span className="soon">Próximamente</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
