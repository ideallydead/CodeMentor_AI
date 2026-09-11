import React from 'react'

/**
 * Parses raw justification text from assessment into discrete pillars:
 * Correctness, Code Standards, Efficiency, and Overall Recommendation.
 * Handles markdown headings (###), bold tags (**), and standard colons (:).
 */
export const parseAssessmentFeedback = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null

  const sectionDefs = [
    { key: 'correctness', title: 'Correctness Analysis', icon: '🎯', badgeColor: 'emerald', regex: /(?:\*\*|###?\s*|##\s*)Correctness(?:\*\*|:)?/i },
    { key: 'standards', title: 'Code Standards & Style', icon: '📐', badgeColor: 'purple', regex: /(?:\*\*|###?\s*|##\s*)Code Standards(?:\*\*|:)?/i },
    { key: 'efficiency', title: 'Efficiency & Performance', icon: '⚡', badgeColor: 'blue', regex: /(?:\*\*|###?\s*|##\s*)Efficiency(?:\*\*|:)?/i },
    { key: 'recommendation', title: 'Overall Recommendation', icon: '🌟', badgeColor: 'amber', regex: /(?:\*\*|###?\s*|##\s*)Overall Recommendation(?:\*\*|:)?/i }
  ]

  const found = []
  sectionDefs.forEach(sec => {
    const match = sec.regex.exec(rawText)
    if (match) {
      found.push({
        ...sec,
        index: match.index,
        matchLength: match[0].length
      })
    }
  })

  // Require at least 2 detected sections to treat as structured pillars
  if (found.length < 2) return null

  found.sort((a, b) => a.index - b.index)

  return found.map((item, idx) => {
    const startIndex = item.index + item.matchLength
    const endIndex = idx + 1 < found.length ? found[idx + 1].index : rawText.length
    let content = rawText.slice(startIndex, endIndex).trim().replace(/^[:\-\s]+/, '').trim()
    return {
      key: item.key,
      title: item.title,
      icon: item.icon,
      badgeColor: item.badgeColor,
      content
    }
  })
}

/**
 * Renders text with inline markdown formatting (bold, code, multiple paragraphs)
 */
export const renderFormattedInlineText = (text) => {
  if (!text) return null

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  if (paragraphs.length === 0) paragraphs.push(text)

  return paragraphs.map((paragraph, pIdx) => {
    const tokens = paragraph.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    return (
      <p
        key={pIdx}
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-main)',
          lineHeight: 1.6,
          marginBottom: pIdx < paragraphs.length - 1 ? 10 : 0
        }}
      >
        {tokens.map((token, tIdx) => {
          if (token.startsWith('`') && token.endsWith('`')) {
            return (
              <code
                key={tIdx}
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--accent-blue)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontSize: '0.85em'
                }}
              >
                {token.slice(1, -1)}
              </code>
            )
          }
          if (token.startsWith('**') && token.endsWith('**')) {
            return (
              <strong key={tIdx} style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {token.slice(2, -2)}
              </strong>
            )
          }
          return token
        })}
      </p>
    )
  })
}

export default function AssessmentFeedbackView({ assessmentDetails, summary }) {
  const details = assessmentDetails || {}
  const rawText = details.justification_text || summary || ''
  const parsedSections = parseAssessmentFeedback(rawText)

  const getSectionScore = (key) => {
    if (key === 'correctness') return details.correctness_score != null ? `${details.correctness_score}%` : null
    if (key === 'standards') return details.standards_score != null ? `${details.standards_score}%` : null
    if (key === 'efficiency') return details.efficiency_score != null ? `${details.efficiency_score}%` : null
    return null
  }

  const recBand = details.overall_recommendation || 'good'
  const recBadgeClass =
    recBand === 'excellent' ? 'tag-emerald' :
    recBand === 'good' ? 'tag-blue' :
    recBand === 'fair' ? 'tag-amber' : 'tag-rose'

  const recBadgeIcon =
    recBand === 'excellent' ? '🌟' :
    recBand === 'good' ? '👍' :
    recBand === 'fair' ? '⚡' : '⚠️'

  const metricSections = parsedSections ? parsedSections.filter(s => s.key !== 'recommendation') : []
  const recommendationSection = parsedSections ? parsedSections.find(s => s.key === 'recommendation') : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Top Banner: Recommendation Status & Snapshot */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: 'var(--bg-input)',
          padding: '14px 18px',
          borderRadius: 12,
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.25rem' }}>📋</span>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Submission Assessment & Evaluation
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Deterministic rubric evaluation & qualitative mentor feedback
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Recommendation Band:</span>
          <span className={`tag ${recBadgeClass}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
            {recBadgeIcon} {recBand.toUpperCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Structured Sections Grid */}
      {parsedSections ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {metricSections.map(sec => {
              const score = getSectionScore(sec.key)
              const borderColor =
                sec.key === 'correctness' ? 'rgba(52, 211, 153, 0.3)' :
                sec.key === 'standards' ? 'rgba(192, 132, 252, 0.3)' :
                'rgba(56, 189, 248, 0.3)'

              return (
                <div
                  key={sec.key}
                  style={{
                    background: 'var(--bg-input)',
                    padding: 16,
                    borderRadius: 12,
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.15rem' }}>{sec.icon}</span>
                        <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{sec.title}</strong>
                      </div>
                      {score && (
                        <span className={`tag tag-${sec.badgeColor}`} style={{ fontSize: '0.78rem' }}>
                          {score}
                        </span>
                      )}
                    </div>
                    <div>{renderFormattedInlineText(sec.content)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Overall Recommendation Full-Width Card */}
          {recommendationSection && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.95))',
                padding: '18px 20px',
                borderRadius: 12,
                border: '1px solid rgba(192, 132, 252, 0.35)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.2rem' }}>🌟</span>
                  <strong style={{ fontSize: '0.98rem', color: '#fff' }}>Overall Recommendation & Guidance</strong>
                </div>
                <span className={`tag ${recBadgeClass}`} style={{ fontSize: '0.8rem' }}>
                  {recBand.toUpperCase().replace('_', ' ')}
                </span>
              </div>
              <div style={{ paddingLeft: 4 }}>
                {renderFormattedInlineText(recommendationSection.content)}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Fallback when raw text is unsegmented */
        <div
          style={{
            background: 'var(--bg-input)',
            padding: 18,
            borderRadius: 12,
            border: '1px solid var(--border-color)'
          }}
        >
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}>
            <span>📝</span> Assessment Summary:
          </h4>
          <div>{renderFormattedInlineText(rawText || 'No assessment narrative available.')}</div>
        </div>
      )}

      {/* Flagged Code Quality Issues (Diagnostics / Complexity Warnings) */}
      {details.flagged_issues && details.flagged_issues.length > 0 ? (
        <div style={{ marginTop: 6 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}>
            <span>🔍</span> Flagged Code Quality Issues ({details.flagged_issues.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {details.flagged_issues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-input)',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      className={`tag ${issue.severity === 'error' ? 'tag-rose' : issue.severity === 'warning' ? 'tag-amber' : 'tag-blue'}`}
                      style={{ fontSize: '0.75rem' }}
                    >
                      {issue.severity.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                      {issue.line_number > 0 ? `Line ${issue.line_number}` : 'Whole File'} • {issue.category}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    {issue.description}
                  </p>
                </div>
                {issue.source_evidence && (
                  <code
                    style={{
                      fontSize: '0.75rem',
                      background: '#111827',
                      padding: '4px 8px',
                      borderRadius: 4,
                      color: '#94a3b8',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {issue.source_evidence}
                  </code>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(52, 211, 153, 0.08)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            padding: '12px 16px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>✨</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 500 }}>
            Clean Codebase: No static analysis violations or complexity bottlenecks flagged.
          </span>
        </div>
      )}
    </div>
  )
}
