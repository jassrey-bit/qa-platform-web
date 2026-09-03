import { NavLink } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

const NAV_ITEMS = [
  { label: 'Test', path: '/' },
  { label: 'Reportes', path: '/reportes' },
  { label: 'Ajustes', path: '/ajustes' },
]

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/40 bg-surface/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-gutter-lg">
        <NavLink to="/" className="font-headline text-lg font-bold tracking-tight text-on-surface">
          QA Platform
        </NavLink>

        <nav className="hidden items-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-low p-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `rounded-lg px-4 py-1.5 text-sm transition-all ${
                  isActive
                    ? 'bg-primary font-semibold text-on-primary shadow-sm shadow-primary/30'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container text-on-surface-variant transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </header>
  )
}
