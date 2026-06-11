type HeaderProps = {
  theme?: 'light' | 'dark'
  onToggleTheme?: () => void
  toggleId?: string
}

export default function Header({ theme, onToggleTheme, toggleId }: HeaderProps) {
  return (
    <header className="site-header">
      <a href="/" className="site-brand" aria-label="Qualeno homepage">
        <QualenoLogo />
      </a>
      <button
        id={toggleId}
        type="button"
        className="site-theme-toggle"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        onClick={onToggleTheme}
      >
        <SunIcon />
        <MoonIcon />
      </button>
    </header>
  )
}

function QualenoLogo() {
  return (
    <svg className="site-logo" viewBox="0 0 1200 320" fill="none" aria-hidden="true">
      <g transform="translate(110 86)">
        <circle cx="74" cy="74" r="68" stroke="currentColor" strokeWidth="12" />
        <path
          d="M42 92L67 67L88 82L108 52"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="108" cy="52" r="7" fill="currentColor" />
      </g>
      <text
        x="290"
        y="193"
        fontFamily="Inter, Avenir, Helvetica, Arial, sans-serif"
        fontSize="116"
        fontWeight="600"
        letterSpacing="-3"
        fill="currentColor"
      >
        qualeno
      </text>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="site-theme-sun" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4V2M12 22v-2M4.93 4.93 3.52 3.52M20.48 20.48l-1.41-1.41M4 12H2M22 12h-2M4.93 19.07l-1.41 1.41M20.48 3.52l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="site-theme-moon" viewBox="0 0 24 24" fill="none">
      <path
        d="M20.4 14.5A8 8 0 0 1 9.5 3.6 8.5 8.5 0 1 0 20.4 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
