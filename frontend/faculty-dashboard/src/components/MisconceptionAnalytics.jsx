import React from 'react'
import { AlertTriangle, TrendingUp, Award, BarChart3 } from 'lucide-react'

export default function MisconceptionAnalytics({ facultyIntelligence, assignmentId }) {
  if (!facultyIntelligence) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
        Select or author an assignment to inspect class misconception analytics and student performance metrics.
      </p>
    )
  }

  const topGrade = Object.keys(facultyIntelligence.grade_distribution || {}).length > 0
    ? Object.keys(facultyIntelligence.grade_distribution || {}).reduce((a, b) =>
        ((facultyIntelligence.grade_distribution[a] || 0) > (facultyIntelligence.grade_distribution[b] || 0) ? a : b), 'good')
    : 'N/A'

  return (
    <div>
      {/* 5 Class Averages Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Class Avg Correctness</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 4 }}>
            {facultyIntelligence.class_averages?.correctness || 0}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Class Avg Quality</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 4 }}>
            {facultyIntelligence.class_averages?.standards || 0}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Class Avg Efficiency</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: 4 }}>
            {facultyIntelligence.class_averages?.efficiency || 0}%
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Submissions</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 4 }}>
            {facultyIntelligence.total_submissions || 0}
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Dominant Grade Band</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: 8 }}>
            {topGrade.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Left: Misconceptions & Error Clusters */}
        <div style={{ background: 'var(--bg-input)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} /> Top Class Misconceptions & Error Clusters
          </h3>

          {facultyIntelligence.top_misconceptions && facultyIntelligence.top_misconceptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {facultyIntelligence.top_misconceptions.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(244, 63, 94, 0.08)',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#fff' }}>{item.misconception}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Affected: {item.affected_students_count} student(s)
                    </div>
                  </div>
                  <span className="tag tag-rose" style={{ fontSize: '0.78rem' }}>
                    {item.percentage_of_class}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              No common misconceptions flagged yet for Assignment #{assignmentId}.
            </p>
          )}
        </div>

        {/* Right: Grade Performance Distribution */}
        <div style={{ background: 'var(--bg-input)', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 size={16} /> Grade Performance Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(facultyIntelligence.grade_distribution || {}).map(([band, count], idx) => {
              const total = Math.max(1, facultyIntelligence.total_submissions)
              const pct = Math.round((count / total) * 100)
              const barColor =
                band === 'excellent' ? 'var(--accent-emerald)' :
                band === 'good' ? 'var(--accent-blue)' :
                band === 'fair' ? 'var(--accent-amber)' : 'var(--accent-rose)'

              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{band.toUpperCase()}</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{count} student(s) ({pct}%)</span>
                  </div>
                  <div style={{ background: '#1e293b', height: 10, borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
