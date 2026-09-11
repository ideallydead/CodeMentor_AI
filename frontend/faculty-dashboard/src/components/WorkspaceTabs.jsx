import React from 'react'
import { BookOpen, CheckSquare, BarChart3 } from 'lucide-react'

export default function WorkspaceTabs({
  activeView,
  onChangeView,
  assignmentsCount = 0,
  pendingCount = 0
}) {
  const tabs = [
    {
      id: 'assignments',
      label: 'Assignments & Curriculum',
      icon: BookOpen,
      badge: assignmentsCount > 0 ? assignmentsCount : null
    },
    {
      id: 'submissions',
      label: 'Submissions & Grading',
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'amber'
    },
    {
      id: 'insights',
      label: 'Class Insights & Analytics',
      icon: BarChart3
    }
  ]

  return (
    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
      <nav className="workspace-nav" aria-label="Faculty Navigation">
        {tabs.map(t => {
          const Icon = t.icon
          const isActive = activeView === t.id
          return (
            <button
              key={t.id}
              type="button"
              className={`workspace-tab ${isActive ? 'active' : ''}`}
              onClick={() => onChangeView(t.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {t.badge !== null && (
                <span
                  className={`tag ${t.badgeColor === 'amber' ? 'tag-amber' : 'tag-blue'}`}
                  style={{ fontSize: '0.7rem', padding: '1px 7px', marginLeft: 4 }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
