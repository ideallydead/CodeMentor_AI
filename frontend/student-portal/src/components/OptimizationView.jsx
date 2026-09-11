import React, { useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
import { Zap, Clock, HardDrive, AlertTriangle, ArrowRightLeft, Code2 } from 'lucide-react'

export default function OptimizationView({
  optDetails,
  optSummary,
  optRecommendations = [],
  originalCode = '',
  language = 'python',
  theme = 'vs-dark'
}) {
  const [showDiff, setShowDiff] = useState(false)

  const timeComp = optDetails?.estimated_time_complexity || 'O(n)'
  const spaceComp = optDetails?.estimated_space_complexity || 'O(1)'
  const findings = optDetails?.findings || []
  const suggestedCode = optDetails?.suggested_code || optDetails?.optimized_code || ''

  return (
    <div>
      {/* Complexity Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div style={{
          background: 'var(--bg-input)',
          padding: 14,
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(52, 211, 153, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald)'
          }}>
            <Clock size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block' }}>Time Complexity</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {timeComp}
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-input)',
          padding: 14,
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-blue)'
          }}>
            <HardDrive size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block' }}>Space Complexity</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
              {spaceComp}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {optSummary && (
        <div style={{
          background: 'rgba(52, 211, 153, 0.08)',
          borderLeft: '4px solid var(--accent-emerald)',
          padding: 14,
          borderRadius: '0 8px 8px 0',
          marginBottom: 18,
          fontSize: '0.88rem',
          color: '#e2e8f0',
          lineHeight: 1.6
        }}>
          {optSummary}
        </div>
      )}

      {/* Recommendations */}
      {optRecommendations && optRecommendations.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>
            ⚡ Algorithmic Recommendations:
          </h4>
          <ul style={{ paddingLeft: 20, fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.6 }}>
            {optRecommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Algorithmic Bottlenecks */}
      {findings && findings.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} /> Detected Bottlenecks & Optimization Strategies:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {findings.map((f, i) => (
              <div key={i} style={{
                background: 'var(--bg-input)',
                padding: 14,
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="tag tag-amber" style={{ fontSize: '0.72rem' }}>
                    {f.issue_type || 'Bottleneck'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                    {f.line_number > 0 ? `Line ${f.line_number}` : 'Global Scope'}
                  </span>
                </div>
                <p style={{ color: '#e2e8f0', margin: '4px 0 8px 0' }}>{f.description}</p>
                {f.suggested_optimization && (
                  <div style={{
                    color: 'var(--accent-emerald)',
                    background: 'rgba(52, 211, 153, 0.08)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: '0.8rem'
                  }}>
                    💡 <strong>Suggested Approach:</strong> {f.suggested_optimization}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-Side Diff View Toggle if suggested code exists */}
      {suggestedCode && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Code2 size={16} /> Side-by-Side Refactoring Diff
            </h4>
            <button
              type="button"
              className="btn-outline"
              onClick={() => setShowDiff(!showDiff)}
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
            >
              <ArrowRightLeft size={13} /> {showDiff ? 'Hide Diff Viewer' : 'View Code Diff'}
            </button>
          </div>

          {showDiff && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)', height: 350 }}>
              <DiffEditor
                height="350px"
                language={language === 'c' ? 'c' : language === 'java' ? 'java' : 'python'}
                theme={theme}
                original={originalCode}
                modified={suggestedCode}
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
