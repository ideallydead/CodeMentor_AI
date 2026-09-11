import React from 'react'
import { BookOpen, CheckCircle2, Users, Clock } from 'lucide-react'

export default function AnalyticsCards({ analytics }) {
  if (!analytics) return null

  const cards = [
    {
      label: 'Total Assignments',
      value: analytics.assignments_total ?? 0,
      color: 'var(--accent-purple)',
      bg: 'rgba(192, 132, 252, 0.12)',
      icon: BookOpen
    },
    {
      label: 'Approved Questions',
      value: analytics.approved_assignments ?? 0,
      color: 'var(--accent-emerald)',
      bg: 'rgba(52, 211, 153, 0.12)',
      icon: CheckCircle2
    },
    {
      label: 'Student Submissions',
      value: analytics.submissions_total ?? 0,
      color: 'var(--accent-blue)',
      bg: 'rgba(56, 189, 248, 0.12)',
      icon: Users
    },
    {
      label: 'Pending Evaluation',
      value: analytics.pending_submissions ?? 0,
      color: 'var(--accent-amber)',
      bg: 'rgba(251, 191, 36, 0.12)',
      icon: Clock
    }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <div
            key={i}
            className="glass-card"
            style={{
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: c.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: c.color,
              flexShrink: 0
            }}>
              <Icon size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>
                {c.label}
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: c.color, marginTop: 2, letterSpacing: '-0.02em' }}>
                {c.value}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
