import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { X, Code2, Shield, CheckCircle2, Award, Edit3, Save, CheckSquare, AlertCircle, Sparkles, Check, CheckCheck, FileText, Activity, AlertTriangle, HelpCircle } from 'lucide-react'

// Automated rubric evaluation based on assignment statistics
export function computeRubricStatistics(sub, currentVivaScore, vivaCount) {
  if (!sub) {
    return {
      recommendedScore: 85,
      recommendedGrade: 'good',
      metrics: { corr: 85, std: 85, eff: 80, viva: 85 },
      weights: { corr: 40, std: 20, eff: 20, viva: 20 },
      hasViva: false
    }
  }

  const corr = sub.correctness_score ?? (
    sub.all_test_results && sub.all_test_results.length > 0
      ? Math.round((sub.all_test_results.filter(t => t.passed).length / sub.all_test_results.length) * 100)
      : 85
  )
  const std = sub.standards_score ?? (
    sub.flagged_issues && sub.flagged_issues.length > 0
      ? Math.max(0, 100 - sub.flagged_issues.length * 5)
      : 90
  )
  const eff = sub.efficiency_score ?? 85

  const hasViva = Boolean(vivaCount && vivaCount > 0)
  const viva = currentVivaScore !== null && currentVivaScore !== undefined ? currentVivaScore : 85

  let score = 0
  let weights = {}
  if (hasViva) {
    // Rubric Weighting with Viva: 40% Correctness, 20% Standards, 20% Efficiency, 20% Viva Defense
    score = Math.round(corr * 0.40 + std * 0.20 + eff * 0.20 + viva * 0.20)
    weights = { corr: 40, std: 20, eff: 20, viva: 20 }
  } else {
    // Rubric Weighting without Viva: 50% Correctness, 25% Standards, 25% Efficiency
    score = Math.round(corr * 0.50 + std * 0.25 + eff * 0.25)
    weights = { corr: 50, std: 25, eff: 25, viva: 0 }
  }

  score = Math.max(0, Math.min(100, score))

  let grade = 'needs_improvement'
  if (score >= 90) grade = 'excellent'
  else if (score >= 75) grade = 'good'
  else if (score >= 60) grade = 'fair'

  return {
    recommendedScore: score,
    recommendedGrade: grade,
    metrics: { corr, std, eff, viva },
    weights,
    hasViva
  }
}

// Calculate viva defense score dynamically from verified answers
export function calculateDynamicVivaScore(answers) {
  if (!answers || answers.length === 0) return 85

  const scores = answers.map(item => {
    const ver = item.faculty_verification
    if (ver === 'correct') return 100
    if (ver === 'partially_correct') return 50
    if (ver === 'incorrect') return 0

    // Auto-check MCQ
    if (item.question_type === 'mcq' && item.student_answer && item.correct_answer) {
      const ca = item.correct_answer.trim().toLowerCase()
      const sa = item.student_answer.trim().toLowerCase()
      const cLetter = ca[0] && 'abcd'.includes(ca[0]) ? ca[0] : ''
      const sLetter = sa[0] && 'abcd'.includes(sa[0]) ? sa[0] : ''
      if (sa === ca || ca.includes(sa) || sa.includes(ca) || (cLetter && cLetter === sLetter)) {
        return 100
      }
      return 0
    }

    // Auto-check Fill in the blanks
    if ((item.question_type === 'fill_in_the_blank' || item.question_type === 'fill_in_blank') && item.student_answer && item.correct_answer) {
      const ca = item.correct_answer.trim().toLowerCase()
      const sa = item.student_answer.trim().toLowerCase()
      const synonyms = ca.split(',').map(s => s.trim()).filter(Boolean)
      if (synonyms.some(syn => syn === sa || sa.includes(syn) || syn.includes(sa))) {
        return 100
      }
      return 0
    }

    return item.correctness_score ?? (item.student_answer ? 75 : 0)
  })

  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export default function SubmissionInspectorModal({
  submission,
  isOpen,
  onClose,
  onSaveOverride,
  theme = 'vs-dark'
}) {
  if (!isOpen || !submission) return null

  const initialAnswers = submission.viva_answers || []
  const initialVivaScore = submission.viva_score ?? calculateDynamicVivaScore(initialAnswers)
  const initialStats = computeRubricStatistics(submission, initialVivaScore, initialAnswers.length)

  const [overrideScore, setOverrideScore] = useState(submission.faculty_score ?? initialStats.recommendedScore)
  const [overrideGrade, setOverrideGrade] = useState(submission.final_grade || initialStats.recommendedGrade)
  const [overrideNotes, setOverrideNotes] = useState(submission.faculty_notes || 'Verified conceptual understanding in laboratory viva.')
  const [vivaScore, setVivaScore] = useState(initialVivaScore)
  const [vivaVerified, setVivaVerified] = useState(submission.viva_verified || false)
  const [vivaFeedback, setVivaFeedback] = useState(submission.viva_feedback || '')
  const [localVivaAnswers, setLocalVivaAnswers] = useState(initialAnswers)
  const [dynamicNotice, setDynamicNotice] = useState(null)
  const [saving, setSaving] = useState(false)

  // Synchronize state whenever submission prop updates
  useEffect(() => {
    if (submission) {
      const answers = submission.viva_answers || []
      const vScore = submission.viva_score ?? calculateDynamicVivaScore(answers)
      const stats = computeRubricStatistics(submission, vScore, answers.length)

      setOverrideScore(submission.faculty_score ?? stats.recommendedScore)
      setOverrideGrade(submission.final_grade || stats.recommendedGrade)
      setOverrideNotes(submission.faculty_notes || 'Verified conceptual understanding in laboratory viva.')
      setVivaScore(vScore)
      setVivaVerified(submission.viva_verified || false)
      setVivaFeedback(submission.viva_feedback || '')
      setLocalVivaAnswers(answers)
      setDynamicNotice(null)
    }
  }, [submission])

  // Dynamically change score when faculty verifies viva questions
  const handleVerifyAnswer = (idx, status) => {
    const updated = [...localVivaAnswers]
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], faculty_verification: status }
    }
    setLocalVivaAnswers(updated)

    // Recalculate viva score dynamically
    const newVivaScore = calculateDynamicVivaScore(updated)
    setVivaScore(newVivaScore)

    // Update verification state
    const anyVerified = updated.some(a => a.faculty_verification && a.faculty_verification !== 'pending')
    setVivaVerified(anyVerified)

    // DYNAMICALLY RECALCULATE OVERALL SCORE AND GRADE BASED ON RUBRIC STATISTICS!
    const stats = computeRubricStatistics(submission, newVivaScore, updated.length)
    setOverrideScore(stats.recommendedScore)
    setOverrideGrade(stats.recommendedGrade)
    setDynamicNotice(`Score dynamically recalculated to ${stats.recommendedScore}% (${stats.recommendedGrade.toUpperCase()}) based on viva verification`)
  }

  const handleMarkAllVerified = (newVerifiedState) => {
    setVivaVerified(newVerifiedState)
    const newStatus = newVerifiedState ? 'correct' : 'pending'
    const updated = localVivaAnswers.map(a => ({ ...a, faculty_verification: newStatus }))
    setLocalVivaAnswers(updated)

    const newVivaScore = newVerifiedState ? 100 : calculateDynamicVivaScore(updated)
    setVivaScore(newVivaScore)

    const stats = computeRubricStatistics(submission, newVivaScore, updated.length)
    setOverrideScore(stats.recommendedScore)
    setOverrideGrade(stats.recommendedGrade)
    setDynamicNotice(newVerifiedState ? `All viva questions marked verified! Score dynamically updated to ${stats.recommendedScore}%` : 'Verification reset to pending.')
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
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Viva Status</span>
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

          {/* SECTION: Student Viva Q&A & Verification */}
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
                  <CheckSquare size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Viva Questions & Student Answers
                    {vivaVerified ? (
                      <span className="tag tag-emerald" style={{ fontSize: '0.7rem' }}>
                        ✅ Verified by Faculty ({vivaScore}%)
                      </span>
                    ) : (
                      <span className="tag tag-amber" style={{ fontSize: '0.7rem' }}>
                        ⏳ Verification Pending ({vivaScore}%)
                      </span>
                    )}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Verify answers to MCQs, Fill-in-the-blanks, and conceptual viva questions. Scores update dynamically on verification.
                  </span>
                </div>
              </div>

              {localVivaAnswers.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => handleMarkAllVerified(!vivaVerified)}
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
                  const qType = item.question_type || 'conceptual'

                  // Auto check for MCQ
                  const isMcqCorrect = qType === 'mcq' && item.student_answer && item.correct_answer && (
                    item.student_answer.trim().toLowerCase() === item.correct_answer.trim().toLowerCase() ||
                    item.correct_answer.toLowerCase().includes(item.student_answer.trim().toLowerCase()) ||
                    (item.correct_answer[0] && item.student_answer[0] && item.correct_answer[0].toLowerCase() === item.student_answer[0].toLowerCase())
                  )

                  // Auto check for Fill in the Blank
                  const isBlankCorrect = (qType === 'fill_in_the_blank' || qType === 'fill_in_blank') && item.student_answer && item.correct_answer && (
                    item.correct_answer.toLowerCase().split(',').map(s => s.trim()).some(acc =>
                      acc === item.student_answer.trim().toLowerCase() ||
                      item.student_answer.trim().toLowerCase().includes(acc) ||
                      acc.includes(item.student_answer.trim().toLowerCase())
                    )
                  )

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: `1px solid ${status === 'correct' ? 'rgba(52, 211, 153, 0.4)' : status === 'incorrect' ? 'rgba(244, 63, 94, 0.4)' : status === 'partially_correct' ? 'rgba(251, 191, 36, 0.4)' : 'var(--border-color)'}`,
                        borderRadius: 10,
                        padding: 14
                      }}
                    >
                      {/* Question Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="tag tag-amber" style={{ fontSize: '0.7rem' }}>
                            Viva Question #{idx + 1}
                          </span>
                          <span
                            className={`tag ${qType === 'mcq' ? 'tag-blue' : qType === 'fill_in_the_blank' || qType === 'fill_in_blank' ? 'tag-emerald' : 'tag-purple'}`}
                            style={{ fontSize: '0.68rem', padding: '1px 6px', textTransform: 'uppercase' }}
                          >
                            {qType === 'mcq' ? 'MCQ' : qType === 'fill_in_the_blank' || qType === 'fill_in_blank' ? 'Fill in the Blank' : 'Conceptual'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score:</span>
                          <span className={`tag ${status === 'correct' || score >= 70 ? 'tag-emerald' : status === 'partially_correct' || score >= 40 ? 'tag-amber' : 'tag-rose'}`} style={{ fontSize: '0.7rem' }}>
                            {status === 'correct' ? '100%' : status === 'partially_correct' ? '50%' : status === 'incorrect' ? '0%' : `${score}%`}
                          </span>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>
                        {qType === 'fill_in_the_blank' && (item.prompt || '').includes('___') ? (
                          <span>
                            {(item.prompt || '').split('___').map((part, pIdx, arr) => (
                              <React.Fragment key={pIdx}>
                                {part}
                                {pIdx < arr.length - 1 && (
                                  <span style={{
                                    background: 'rgba(52, 211, 153, 0.15)',
                                    color: 'var(--accent-emerald)',
                                    border: '1px dashed var(--accent-emerald)',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    fontWeight: 700
                                  }}>
                                    ___
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </span>
                        ) : (
                          item.prompt
                        )}
                      </div>

                      {/* MCQ Choices Inspection */}
                      {qType === 'mcq' && item.options && item.options.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6, marginBottom: 12 }}>
                          {item.options.map((opt, optIdx) => {
                            const isCorrectOpt = (item.correct_answer || '').trim() === opt.trim() ||
                              (item.correct_answer && opt && item.correct_answer.startsWith(opt.slice(0, 2)))
                            const isStudentChoice = (item.student_answer || '').trim() === opt.trim() ||
                              (item.student_answer && opt && item.student_answer.startsWith(opt.slice(0, 2)))
                            return (
                              <div
                                key={optIdx}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: 6,
                                  background: isCorrectOpt ? 'rgba(52, 211, 153, 0.15)' : isStudentChoice ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-input)',
                                  border: `1px solid ${isCorrectOpt ? 'var(--accent-emerald)' : isStudentChoice ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                                  color: isCorrectOpt ? 'var(--accent-emerald)' : isStudentChoice ? 'var(--accent-blue)' : 'var(--text-main)',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 6
                                }}
                              >
                                <span>{opt}</span>
                                {isCorrectOpt && <span className="tag tag-emerald" style={{ fontSize: '0.62rem', padding: '1px 4px' }}>Correct Option ✓</span>}
                                {isStudentChoice && !isCorrectOpt && <span className="tag tag-rose" style={{ fontSize: '0.62rem', padding: '1px 4px' }}>Student Choice</span>}
                              </div>
                            )
                          })}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                            💬 Student Answer at Submission:
                          </span>
                          {qType === 'mcq' && item.student_answer && (
                            <span className={`tag ${isMcqCorrect ? 'tag-emerald' : 'tag-rose'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              {isMcqCorrect ? 'Auto-Check: Correct Option ✓' : 'Auto-Check: Incorrect Option ✗'}
                            </span>
                          )}
                          {(qType === 'fill_in_the_blank' || qType === 'fill_in_blank') && item.student_answer && (
                            <span className={`tag ${isBlankCorrect ? 'tag-emerald' : 'tag-rose'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              {isBlankCorrect ? 'Auto-Check: Match ✓' : 'Auto-Check: Mismatch ✗'}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.86rem', color: '#e2e8f0', margin: 0, fontStyle: item.student_answer ? 'normal' : 'italic' }}>
                          {item.student_answer ? `"${item.student_answer}"` : '(No answer submitted by student)'}
                        </p>
                      </div>

                      {/* AI Conceptual Analysis (Detected vs Missing) */}
                      {qType === 'conceptual' && item.student_answer && (
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
                      {(item.correct_answer || item.sample_answer) && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                          📖 <strong>Reference / Expected:</strong> {item.correct_answer ? `"${item.correct_answer}"` : ''} {item.sample_answer ? `— ${item.sample_answer}` : ''}
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
                            title="Verify as Correct (updates score dynamically)"
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
                            title="Verify as Partial (updates score dynamically)"
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
                            title="Mark as Incorrect (updates score dynamically)"
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
                No viva questions or student answers recorded for this submission.
              </div>
            )}
          </div>

          {/* Instructor Grade Override Form */}
          {(() => {
            const rubricStats = computeRubricStatistics(submission, vivaScore, localVivaAnswers.length)
            return (
              <form onSubmit={handleSave} style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--accent-purple)',
                borderRadius: 12,
                padding: 16
              }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Edit3 size={16} /> Instructor Grade Override & Viva Evaluation
                </h4>

                {/* Automated Rubric Recommendation Panel */}
                <div style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={16} color="var(--accent-blue)" />
                      <strong style={{ fontSize: '0.86rem', color: '#fff' }}>
                        Automated Rubric Recommendation & Statistics
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Recommended:</span>
                      <span style={{
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: rubricStats.recommendedScore >= 90 ? 'var(--accent-emerald)' : rubricStats.recommendedScore >= 75 ? 'var(--accent-blue)' : 'var(--accent-amber)'
                      }}>
                        {rubricStats.recommendedScore}%
                      </span>
                      <span className={`tag ${rubricStats.recommendedGrade === 'excellent' ? 'tag-emerald' : rubricStats.recommendedGrade === 'good' ? 'tag-blue' : rubricStats.recommendedGrade === 'fair' ? 'tag-amber' : 'tag-rose'}`} style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
                        {rubricStats.recommendedGrade.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideScore(rubricStats.recommendedScore)
                          setOverrideGrade(rubricStats.recommendedGrade)
                          setDynamicNotice(`Applied recommended score: ${rubricStats.recommendedScore}% (${rubricStats.recommendedGrade.toUpperCase()})`)
                        }}
                        className="btn-outline"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', color: 'var(--accent-blue)', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                        title="Apply recommended score and grade band"
                      >
                        ⚡ Apply Recommendation
                      </button>
                    </div>
                  </div>

                  {/* Rubric Breakdown Statistics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, fontSize: '0.75rem' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>🎯 Correctness ({rubricStats.weights.corr}%)</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-emerald)', marginTop: 2 }}>{rubricStats.metrics.corr}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>📐 Standards ({rubricStats.weights.std}%)</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-blue)', marginTop: 2 }}>{rubricStats.metrics.std}%</div>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                      <div style={{ color: 'var(--text-muted)' }}>⚡ Efficiency ({rubricStats.weights.eff}%)</div>
                      <div style={{ fontWeight: 700, color: 'var(--accent-purple)', marginTop: 2 }}>{rubricStats.metrics.eff}%</div>
                    </div>
                    {rubricStats.hasViva && (
                      <div style={{ background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                        <div style={{ color: 'var(--accent-amber)' }}>🎓 Viva Defense ({rubricStats.weights.viva}%)</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-amber)', marginTop: 2 }}>{rubricStats.metrics.viva}% (Dynamic)</div>
                      </div>
                    )}
                  </div>

                  {dynamicNotice && (
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={13} />
                      <span>{dynamicNotice}</span>
                    </div>
                  )}
                </div>

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
                    <span>Confirm Viva Questions & Answers Verified by Examiner ✅</span>
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
                    placeholder="e.g. Student clearly articulated algorithmic invariants and complexity trade-offs."
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
                    placeholder="e.g. Student demonstrated clear understanding of algorithms and complexity in viva examination."
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
            )
          })()}
        </div>
      </div>
    </div>
  )
}
