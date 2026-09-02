import type { ComparisonResult } from '../api/docValidation'
import { SeverityBadge } from './SeverityBadge'

export function ComparisonReport({ result }: { result: ComparisonResult }) {
  const { structural, semantic, visual, summary } = result

  return (
    <div className="report">
      <section className={`summary summary-${summary.status.toLowerCase()}`}>
        <h2>{summary.status === 'PASSED' ? 'Aprobado' : 'Con discrepancias'}</h2>
        <p>
          {summary.total_discrepancies} discrepancia(s) — {summary.critical} crítica(s),{' '}
          {summary.warning} aviso(s), {summary.info} info
        </p>
      </section>

      <section>
        <h3>Estructura</h3>
        <p>
          Puntaje: {structural.score.toFixed(1)} · Descubierto por: {structural.discovery_method}
        </p>
        {structural.missing_sections.length > 0 && (
          <p>Secciones faltantes: {structural.missing_sections.join(', ')}</p>
        )}
      </section>

      <section>
        <h3>Discrepancias semánticas</h3>
        {semantic.discrepancies.length === 0 ? (
          <p>Sin discrepancias.</p>
        ) : (
          <ul className="discrepancy-list">
            {semantic.discrepancies.map((d, i) => (
              <li key={i} className="discrepancy">
                <div className="discrepancy-header">
                  <SeverityBadge severity={d.severity} />
                  <span>
                    {d.change_type} — página/párrafo {d.location}
                  </span>
                </div>
                {d.severity_reasoning && <p className="reasoning">{d.severity_reasoning}</p>}
                <ul className="internal-changes">
                  {d.internal_changes.map((c, j) => (
                    <li key={j}>{c.description}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {visual && (
        <section>
          <h3>Análisis visual</h3>
          {visual.available ? (
            <>
              <p>Estado: {visual.status}</p>
              <pre className="findings">{visual.findings}</pre>
            </>
          ) : (
            <p className="unavailable">No disponible: {visual.error}</p>
          )}
        </section>
      )}
    </div>
  )
}
