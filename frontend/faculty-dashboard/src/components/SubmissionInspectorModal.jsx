import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { X, Code2, Shield, CheckCircle2, Award, Edit3, Save, Mic, AlertCircle, Sparkles, Check, CheckCheck, FileText, Activity, AlertTriangle } from 'lucide-react'

export default function SubmissionInspectorModal({
  submission,
  isOpen,
  onClose,
  onSaveOverride,
  theme = 'vs-dark'
}) {
  if (!isOpen || !submission) return null

  const [overrideScore, setOverrideScore] = useState(submission.faculty_score ?? submission.correctness_score ?? 85)
  const [overrideGrade, setOverrideGrade] = useState(submission.final_grade || submission.overall_recommendation || 'good')
  const [overrideNotes, setOverrideNotes] = useState(submission.faculty_notes || 'Verified understanding in laboratory viva.')
  const [vivaScore, setVivaScore] = useState(submission.viva_score ?? 85)
  const [vivaVerified, setVivaVerified] = useState(submission.viva_verified || false)
  const [vivaFeedback, setVivaFeedback] = useState(submission.viva_feedback || '')
  const [localVivaAnswers, setLocalVivaAnswers] = useState(submission.viva_answers || [])
  const [saving, setSaving] = useState(false)

  // Synchronize state whenever submission prop updates
  useEffect(() => {
    if (submission) {
      setOverrideScore(submission.faculty_score ?? submission.correctness_score ?? 85)
      setOverrideGrade(submission.final_grade || submission.overall_recommendation || 'good')
      setOverrideNotes(submission.faculty_notes || 'Verified understanding in laboratory viva.')
      setVivaScore(submission.viva_score ?? 85)
      setVivaVerified(submission.viva_verified || false)
      setVivaFeedback(submission.viva_feedback || '')
      setLocalVivaAnswers(submission.viva_answers || [])
    }
  }, [submission])

  const handleVerifyAnswer = (idx, status) => {
    setLocalVivaAnswers(prev => {
      const updated = [...prev]
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], faculty_verification: status }
      }
      return updated
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSaveOverride(submission.id, {
        faculty_score: parseInt(overrideScore, 10) || null,
        final_grade: overrideGrade,
        faculty_notes: overrideNotes,
        viva_score: parseInt(vivaScore, 10) || null,
        viva_verified: vivaVerified,
        viva_feedback: vivaFeedback,
        viva_answers: localVivaAnswers
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <Code2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                Submission #{submission.id} • Student #{submission.student_id}
                {submission.is_resubmission && (
                  <span className="tag tag-purple" style={{ fontSize: '0.72rem' }}>
                    🔄 Resubmission ({submission.attempt_number ? `Attempt #${submission.attempt_number}` : 'Re-attempt'})
                  </span>
                )}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Language: {submission.language?.toUpperCase()} • Status: {submission.status}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>
          {/* Metadata Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Correctness</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: 2 }}>
                {submission.correctness_score !== null ? `${submission.correctness_score}%` : 'N/A'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Code Standards</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                {submission.standards_score !== null && submission.standards_score !== undefined ? `${submission.standards_score}%` : 'N/A'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Efficiency</span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: 2 }}>
                {submission.efficiency_score !== null && submission.efficiency_score !== undefined ? `${submission.efficiency_score}%` : 'N/A'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Integrity Risk</span>
              <div style={{ marginTop: 6 }}>
                <span className={`tag ${submission.integrity_risk === 'high' ? 'tag-rose' : submission.integrity_risk === 'moderate' ? 'tag-amber' : 'tag-emerald'}`}>
                  🛡️ {(submission.integrity_risk || 'low').toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>AI Recommendation</span>
              <div style={{ marginTop: 6 }}>
                <span className="tag tag-blue">
                  {(submission.overall_recommendation || 'good').toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Oral Viva Status</span>
              <div style={{ marginTop: 6 }}>
                {vivaVerified ? (
                  <span className="tag tag-emerald">
                    ✅ VERIFIED ({vivaScore}%)
                  </span>
                ) : localVivaAnswers.length > 0 ? (
                  <span className="tag tag-amber">
                    ⏳ VERIFY ({vivaScore}%)
                  </span>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Not Submitted</span>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Final Grade</span>
              <div style={{ marginTop: 6 }}>
                {submission.final_grade ? (
                  <span className="tag tag-emerald">
                    ✅ {submission.final_grade.toUpperCase()} ({submission.faculty_score ?? ''})
                  </span>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Pending Override</span>
                )}
              </div>
            </div>
          </div>

          {/* Student Submitted Source Code (Monaco Read-Only) */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Code2 size={16} color="var(--accent-blue)" /> Submitted Source Code
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read-Only Code View</span>
            </div>

            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)', height: 240 }}>
              <Editor
                height="240px"
                language={submission.language === 'c' ? 'c' : submission.language === 'java' ? 'java' : 'python'}
                theme={theme === 'light' ? 'light' : 'vs-dark'}
                value={submission.source_code || '# No source code recorded for this submission.'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  folding: true
                }}
              />
            </div>
          </div>

          {/* AI Assessment Justification & Rubric Findings */}
          {submission.justification_text && (
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-blue)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} /> AI Assessment Rubric Analysis & Justification
              </h4>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {submission.justification_text}
              </p>
            </div>
          )}

          {/* Test Case Execution Suite Results */}
          {submission.all_test_results && submission.all_test_results.length > 0 && (
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-emerald)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={16} /> Sandbox Test Suite ({submission.all_test_results.filter(t => t.passed).length}/{submission.all_test_results.length} Passed)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {submission.all_test_results.map((tr, tidx) => (
                  <div key={tidx} style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`tag ${tr.passed ? 'tag-emerald' : 'tag-rose'}`} style={{ fontSize: '0.7rem' }}>
                          {tr.passed ? '✓ PASSED' : '✗ FAILED'}
                        </span>
                        <strong style={{ color: 'var(--text-main)' }}>Case #{tidx + 1} ({tr.test_id})</strong>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                        {tr.execution_time_ms ? `${tr.execution_time_ms.toFixed(1)} ms` : '< 1 ms'}
                      </span>
                    </div>
                    {tr.input_data && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>
                        Input: <code style={{ color: 'var(--accent-blue)' }}>{tr.input_data}</code>
                      </div>
                    )}
                    {tr.expected_output && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>
                        Expected: <code style={{ color: 'var(--accent-emerald)' }}>{tr.expected_output}</code>
                      </div>
                    )}
                    {tr.actual_output && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 2 }}>
                        Actual: <code style={{ color: tr.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>{tr.actual_output}</code>
                      </div>
                    )}
                    {tr.failure_reason && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.76rem', marginTop: 2 }}>
                        Reason: {tr.failure_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flagged Code Quality & Complexity Issues */}
          {submission.flagged_issues && submission.flagged_issues.length > 0 && (
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-amber)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} /> Flagged Code Quality & Complexity Warnings ({submission.flagged_issues.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {submission.flagged_issues.map((fi, fidx) => (
                  <div key={fidx} style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    <span className={`tag ${fi.severity === 'error' ? 'tag-rose' : fi.severity === 'warning' ? 'tag-amber' : 'tag-blue'}`} style={{ fontSize: '0.68rem' }}>
                      {fi.severity?.toUpperCase()}
                    </span>
                    <span style={{ color: 'var(--text-main)', flex: 1 }}>{fi.description}</span>
                    {fi.line_number > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Line {fi.line_number}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Academic Integrity Analysis Box */}
          {submission.integrity_details && (
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-purple)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={16} /> Academic Integrity Analysis (AST Similarity: {submission.integrity_details.max_similarity_score ?? 0}%)
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', margin: 0 }}>
                {submission.integrity_details.explainable_summary}
              </p>
            </div>
          )}

          {/* SECTION: Student Oral Viva Q&A & Correctness Verification */}
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            borderRadius: 12,
            padding: 18,
            marginBottom: 20
          }}>
            {/* Viva Section Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(251, 191, 36, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-amber)'
                }}>
                  <Mic size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Oral Viva Questions & Student Answers
                    {vivaVerified ? (
                      <span className="tag tag-emerald" style={{ fontSize: '0.7rem' }}>
                        ✅ Verified by Faculty
                      </span>
                    ) : (
                      <span className="tag tag-amber" style={{ fontSize: '0.7rem' }}>
                        ⏳ Verification Pending
                      </span>
                    )}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Verify the conceptual correctness of answers provided by the student at submission
                  </span>
                </div>
              </div>

              {localVivaAnswers.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => {
                      const next = !vivaVerified
                      setVivaVerified(next)
                      if (next) {
                        setLocalVivaAnswers(prev => prev.map(a => ({ ...a, faculty_verification: 'correct' })))
                      }
                    }}
                    style={{ fontSize: '0.76rem', padding: '5px 10px', color: vivaVerified ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}
                  >
                    {vivaVerified ? '✓ Verified (Click to Revoke)' : '⚡ Mark All Verified'}
                  </button>
                </div>
              )}
            </div>

            {/* Questions & Answers List */}
            {localVivaAnswers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {localVivaAnswers.map((item, idx) => {
                  const status = item.faculty_verification || 'pending'
                  const score = item.correctness_score ?? 0
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1px solid ${status === 'correct' ? 'rgba(52, 211, 153, 0.35)' : status === 'incorrect' ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-color)'}`,
                        borderRadius: 10,
                        padding: 14
                      }}
                    >
                      {/* Question Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <span className="tag tag-amber" style={{ fontSize: '0.7rem' }}>
                          Viva Question #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI Concept Score:</span>
                          <span className={`tag ${score >= 70 ? 'tag-emerald' : score >= 40 ? 'tag-amber' : 'tag-rose'}`} style={{ fontSize: '0.7rem' }}>
                            {score}%
                          </span>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>
                        {item.prompt}
                      </div>

                      {/* Expected Concepts */}
                      {item.expected_concepts && item.expected_concepts.length > 0 && (
                        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Expected Concepts:</span>
                          {item.expected_concepts.map((c, ci) => (
                            <span key={ci} style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 7px', borderRadius: 4 }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Student Submitted Answer Callout */}
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.05)',
                        borderLeft: '3px solid var(--accent-blue)',
                        padding: '10px 14px',
                        borderRadius: '0 8px 8px 0',
                        marginBottom: 12
                      }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          🗣️ Student Answer at Submission:
                        </span>
                        <p style={{ fontSize: '0.86rem', color: '#e2e8f0', margin: 0, fontStyle: item.student_answer ? 'normal' : 'italic' }}>
                          {item.student_answer ? `"${item.student_answer}"` : '(No verbal answer submitted by student)'}
                        </p>
                      </div>

                      {/* AI Conceptual Analysis (Detected vs Missing) */}
                      {item.student_answer && (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.5)',
                          borderRadius: 8,
                          padding: '8px 12px',
                          marginBottom: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6
                        }}>
                          {item.detected_concepts && item.detected_concepts.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>✓ Covered Concepts:</span>
                              {item.detected_concepts.map((dc, dci) => (
                                <span key={dci} className="tag tag-emerald" style={{ fontSize: '0.66rem', padding: '1px 5px' }}>
                                  {dc}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.missing_concepts && item.missing_concepts.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', fontWeight: 600 }}>⚠️ Missing Concepts:</span>
                              {item.missing_concepts.map((mc, mci) => (
                                <span key={mci} className="tag tag-amber" style={{ fontSize: '0.66rem', padding: '1px 5px' }}>
                                  {mc}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reference Answer if Available */}
                      {item.sample_answer && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                          📖 <strong>Reference / Sample Answer:</strong> {item.sample_answer}
                        </div>
                      )}

                      {/* Faculty Verification Action Controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Examiner Verification:
                          <strong style={{ marginLeft: 6, color: status === 'correct' ? 'var(--accent-emerald)' : status === 'partially_correct' ? 'var(--accent-amber)' : status === 'incorrect' ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                            {status === 'correct' ? 'Verified Correct ✅' : status === 'partially_correct' ? 'Partially Correct ⚡' : status === 'incorrect' ? 'Incorrect ❌' : 'Pending Verification ⏳'}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => handleVerifyAnswer(idx, 'correct')}
                            style={{
                              background: status === 'correct' ? 'rgba(52, 211, 153, 0.25)' : 'transparent',
                              color: status === 'correct' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                              border: `1px solid ${status === 'correct' ? 'var(--accent-emerald)' : 'var(--border-color)'}`,
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            ✅ Correct
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyAnswer(idx, 'partially_correct')}
                            style={{
                              background: status === 'partially_correct' ? 'rgba(251, 191, 36, 0.25)' : 'transparent',
                              color: status === 'partially_correct' ? 'var(--accent-amber)' : 'var(--text-muted)',
                              border: `1px solid ${status === 'partially_correct' ? 'var(--accent-amber)' : 'var(--border-color)'}`,
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            ⚡ Partial
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyAnswer(idx, 'incorrect')}
                            style={{
                              background: status === 'incorrect' ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
                              color: status === 'incorrect' ? 'var(--accent-rose)' : 'var(--text-muted)',
                              border: `1px solid ${status === 'incorrect' ? 'var(--accent-rose)' : 'var(--border-color)'}`,
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            ❌ Incorrect
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No oral viva defense questions or student answers recorded for this submission.
              </div>
            )}
          </div>

          {/* Instructor Grade Override Form */}
          <form onSubmit={handleSave} style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--accent-purple)',
            borderRadius: 12,
            padding: 16
          }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={16} /> Instructor Grade Override & Viva Evaluation
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Overall Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(e.target.value)}
                  className="form-input"
                  style={{ padding: '7px 10px', fontSize: '0.86rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Viva Defense Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={vivaScore}
                  onChange={(e) => setVivaScore(e.target.value)}
                  className="form-input"
                  style={{ padding: '7px 10px', fontSize: '0.86rem' }}
                  placeholder="e.g. 90"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Final Grade Band
                </label>
                <select
                  value={overrideGrade}
                  onChange={(e) => setOverrideGrade(e.target.value)}
                  className="form-input"
                  style={{ padding: '7px 10px', fontSize: '0.86rem' }}
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="needs_improvement">Needs Improvement</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={vivaVerified}
                  onChange={(e) => setVivaVerified(e.target.checked)}
                  style={{ accentColor: 'var(--accent-emerald)', width: 16, height: 16 }}
                />
                <span>Confirm Oral Viva Questions & Answers Verified by Examiner ✅</span>
              </label>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Viva Defense Examiner Feedback
              </label>
              <input
                type="text"
                value={vivaFeedback}
                onChange={(e) => setVivaFeedback(e.target.value)}
                placeholder="e.g. Student clearly articulated hash map invariants and time complexity."
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Instructor Feedback Notes / Viva Justification
              </label>
              <input
                type="text"
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="e.g. Student demonstrated clear understanding of hash table complexity in viva examination."
                className="form-input"
                style={{ padding: '7px 10px', fontSize: '0.86rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn-outline" onClick={onClose} style={{ fontSize: '0.8rem' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ fontSize: '0.8rem' }}>
                <Save size={14} />
                <span>{saving ? 'Saving Override...' : 'Save Grade Override & Viva Verification ✅'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
