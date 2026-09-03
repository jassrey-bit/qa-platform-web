import { Link } from 'react-router-dom'

const MODULES = [
  {
    name: 'Validación de documentos',
    description: 'Compara documentos generados (PDF/DOCX) contra su plantilla esperada.',
    path: '/doc-validation',
    icon: 'description',
    available: true,
  },
  {
    name: 'Validación de API',
    description: 'Pruebas de respuestas de API y cálculos financieros (api-qa-framework).',
    path: '#',
    icon: 'api',
    available: false,
  },
  {
    name: 'Automatización E2E',
    description: 'Suite de pruebas end-to-end con Cucumber sobre la plataforma.',
    path: '#',
    icon: 'smart_toy',
    available: false,
  },
]

export function Dashboard() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-gutter-xl p-layout-margin">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="font-code text-xs uppercase tracking-wider text-primary">Test</span>
        </div>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">
          Plataforma de QA
        </h1>
        <p className="max-w-2xl text-on-surface-variant">
          Elige un módulo de validación activo o consulta los que están en desarrollo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-gutter-lg md:grid-cols-3">
        {MODULES.map((m) =>
          m.available ? (
            <div
              key={m.name}
              className="glow-border group flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container/80 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[24px]">{m.icon}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Activo
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="font-headline text-xl text-on-surface transition-colors group-hover:text-primary">
                    {m.name}
                  </h2>
                  <p className="leading-relaxed text-on-surface-variant">{m.description}</p>
                </div>
              </div>
              <Link
                to={m.path}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-on-primary shadow-lg shadow-primary/25 transition-all hover:opacity-90"
              >
                <span>Abrir</span>
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>
          ) : (
            <div
              key={m.name}
              className="flex flex-col justify-between rounded-xl border border-outline-variant/20 bg-surface-container/40 p-6 opacity-60 backdrop-blur-md transition-all duration-300 hover:opacity-80"
            >
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-outline-variant/30 bg-surface-bright/50 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[24px]">{m.icon}</span>
                  </div>
                  <span className="rounded-full border border-outline-variant/30 bg-surface-bright/60 px-3 py-1 text-xs text-on-surface-variant">
                    Próximamente
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="font-headline text-xl text-on-surface">{m.name}</h2>
                  <p className="leading-relaxed text-on-surface-variant">{m.description}</p>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-bright/40 px-4 py-3 font-medium text-on-surface-variant"
              >
                <span>Próximamente</span>
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
