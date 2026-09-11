import React from 'react'
import { GraduationCap, ExternalLink, LogOut, Sun, Moon, User } from 'lucide-react'

export default function Navbar({ currentUser, onLogout, theme, onToggleTheme }) {
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
  // Detect if running in docker (port 4174) or local vite (port 5174)
  const isDockerPort = typeof window !== 'undefined' && window.location.port === '4173'
  const facultyPort = isDockerPort ? '4174' : '5174'
  const facultyUrl = `http://${hostname}:${facultyPort}`

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.name = 'codementor_student_window'
    }
  }, [])

  const handleOpenFacultyPortal = (e) => {
    if (typeof window !== 'undefined') {
      const win = window.open(facultyUrl, 'codementor_faculty_window')
      if (win) {
        win.focus()
        e.preventDefault()
      }
    }
  }

  return (
    <header className="glass-card" style={{ padding: '16px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(192, 132, 252, 0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(56, 189, 248, 0.3)'
        }}>
          <GraduationCap size={24} color="var(--accent-blue)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              CodeMentor <span className="gradient-text">AI</span>
            </h1>
            <span className="tag tag-blue" style={{ fontSize: '0.7rem' }}>
              Student Portal
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            Socratic Automated Programming Assessment & AI Guidance
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* User Identity Pill */}
        <div style={{
          background: 'var(--bg-input)',
          padding: '6px 14px',
          borderRadius: 20,
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <User size={15} color="var(--accent-blue)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser?.name || 'Student #101'}</span>
          <span className="tag tag-blue" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            ID #{currentUser?.id || '101'}
          </span>
        </div>

        {/* Dark / Light Theme Toggle */}
        <button
          type="button"
          className="btn-outline"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{ padding: '7px 10px' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Dedicated Faculty Portal Link - Reuses existing open tab if available */}
        <a
          href={facultyUrl}
          target="codementor_faculty_window"
          rel="noopener"
          className="btn-outline"
          style={{ textDecoration: 'none' }}
          onClick={handleOpenFacultyPortal}
          title="Switch to Faculty Dashboard tab"
        >
          <span>Faculty Dashboard</span>
          <ExternalLink size={14} />
        </a>

        {/* Logout */}
        <button
          type="button"
          className="btn-outline"
          onClick={onLogout}
          style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  )
}
