import React from 'react'
import { School, ExternalLink, LogOut, Trash2, Sun, Moon, UserCheck } from 'lucide-react'

export default function Navbar({ currentUser, onLogout, theme, onToggleTheme, onResetData, isLoading }) {
  const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
  const isDockerPort = typeof window !== 'undefined' && window.location.port === '4174'
  const studentPort = isDockerPort ? '4173' : '5173'
  const studentUrl = `http://${hostname}:${studentPort}`

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.name = 'codementor_faculty_window'
    }
  }, [])

  const handleOpenStudentPortal = (e) => {
    if (typeof window !== 'undefined') {
      const win = window.open(studentUrl, 'codementor_student_window')
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
          background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2), rgba(56, 189, 248, 0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(192, 132, 252, 0.3)'
        }}>
          <School size={24} color="var(--accent-purple)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              CodeMentor <span className="gradient-text">AI</span>
            </h1>
            <span className="tag tag-purple" style={{ fontSize: '0.7rem' }}>
              Faculty Intelligence
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
            Question Authoring, Class Misconceptions & Pedagogical Grade Overrides
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
          <UserCheck size={16} color="var(--accent-purple)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser?.name || 'Prof. Alan Turing'}</span>
          <span className="tag tag-purple" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            FACULTY
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          className="btn-outline"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          style={{ padding: '7px 10px' }}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Link to Student Portal - Reuses existing open tab if available */}
        <a
          href={studentUrl}
          target="codementor_student_window"
          rel="noopener"
          className="btn-outline"
          style={{ textDecoration: 'none' }}
          onClick={handleOpenStudentPortal}
          title="Switch to Student Portal tab"
        >
          <span>Student Portal</span>
          <ExternalLink size={14} />
        </a>

        {/* Reset All Data Button */}
        <button
          type="button"
          className="btn-outline"
          onClick={onResetData}
          disabled={isLoading}
          style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.08)' }}
          title="Delete all submissions, assignments, and evaluation reports"
        >
          <Trash2 size={14} />
          <span>Reset All Data</span>
        </button>

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
