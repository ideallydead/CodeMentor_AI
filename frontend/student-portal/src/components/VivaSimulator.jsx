import React, { useState, useEffect } from 'react'
import { Mic, CheckCircle2, AlertCircle, Sparkles, Send, Award, Save } from 'lucide-react'

export default function VivaSimulator({
  vivaDetails,
  vivaSummary,
  submissionId,
  initialAnswers = {},
  onUpdateVivaAnswers
}) {
  const questions = vivaDetails?.selected_questions || []
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isUpdating, setIsUpdating] = useState(false)

  // Initialize student answers from initialAnswers or evaluated_answers
  const [studentAnswers, setStudentAnswers] = useState(() => {
    const init = { ...initialAnswers }
    if (vivaDetails?.evaluated_answers) {
      vivaDetails.evaluated_answers.forEach((ea, idx) => {
        if (!init[idx] && ea.student_answer) {
          init[idx] = ea.student_answer
        }
      })
    }
    return init
  })

  // Initialize evaluation results
  const [evaluationResults, setEvaluationResults] = useState(() => {
    const res = {}
    if (vivaDetails?.evaluated_answers) {
      vivaDetails.evaluated_answers.forEach((ea, idx) => {
        res[idx] = {
          evaluated: true,
          percentage: ea.correctness_score ?? 0,
          detected: ea.detected_concepts || [],
          missing: ea.missing_concepts || []
        }
      })
    }
    return res
  })

  useEffect(() => {
    if (vivaDetails?.evaluated_answers) {
      const res = {}
      const answers = { ...studentAnswers }
      vivaDetails.evaluated_answers.forEach((ea, idx) => {
        if (!answers[idx] && ea.student_answer) {
          answers[idx] = ea.student_answer
        }
        res[idx] = {
          evaluated: true,
          percentage: ea.correctness_score ?? 0,
          detected: ea.detected_concepts || [],
          missing: ea.missing_concepts || []
        }
      })
      setEvaluationResults(prev => ({ ...prev, ...res }))
      setStudentAnswers(answers)
    }
  }, [vivaDetails])

  const currentQ = questions[selectedIdx]

  const handleAnswerChange = (text) => {
    setStudentAnswers(prev => ({ ...prev, [selectedIdx]: text }))
  }

  const handleSaveToFaculty = async () => {
    if (!onUpdateVivaAnswers) return
    setIsUpdating(true)
    try {
      const payload = questions.map((q, idx) => ({
        question_id: q.question_id || `q_${idx + 1}`,
        prompt: q.prompt,
        expected_concepts: q.expected_concepts || [],
        sample_answer: q.sample_answer || '',
        student_answer: studentAnswers[idx] || ''
      }))
      await onUpdateVivaAnswers(payload)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEvaluateAnswer = () => {
    if (!currentQ) return
    const answer = (studentAnswers[selectedIdx] || '').toLowerCase()
    const expected = currentQ.expected_concepts || []

    const detected = []
    const missing = []

    expected.forEach(concept => {
      const cleanConcept = concept.toLowerCase().trim()
      // Check if word or phrase is mentioned
      if (answer.includes(cleanConcept) || cleanConcept.split(' ').some(word => word.length > 3 && answer.includes(word))) {
        detected.push(concept)
      } else {
        missing.push(concept)
      }
    })

    const percentage = expected.length > 0 ? Math.round((detected.length / expected.length) * 100) : 100

    setEvaluationResults(prev => ({
      ...prev,
      [selectedIdx]: {
        evaluated: true,
        percentage,
        detected,
        missing
      }
    }))
  }

  if (questions.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        No oral defense questions generated for this submission yet.
      </div>
    )
  }

  const currentResult = evaluationResults[selectedIdx]

  return (
    <div>
      {/* Guidance Header */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.1)',
        borderLeft: '4px solid var(--accent-amber)',
        padding: 14,
        borderRadius: '0 8px 8px 0',
        marginBottom: 18
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-amber)', fontWeight: 600, fontSize: '0.92rem', marginBottom: 4 }}>
          <Mic size={16} /> Interactive Viva Defense Simulator
        </div>
        <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: 0 }}>
          {vivaDetails?.guidance_for_faculty || 'Practice articulating your algorithmic logic and complexity trade-offs before facing oral examination.'}
        </p>
      </div>

      {/* Question Selector Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 6 }}>
        {questions.map((q, idx) => {
          const res = evaluationResults[idx]
          const isSelected = selectedIdx === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              style={{
                background: isSelected ? 'rgba(251, 191, 36, 0.2)' : 'var(--bg-input)',
                color: isSelected ? 'var(--accent-amber)' : 'var(--text-muted)',
                border: isSelected ? '1px solid var(--accent-amber)' : '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              <span>Q{idx + 1}</span>
              {res?.evaluated && (
                <span className={`tag ${res.percentage >= 70 ? 'tag-emerald' : 'tag-amber'}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                  {res.percentage}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active Question Card */}
      {currentQ && (
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 12,
          padding: 18
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <span className="tag tag-amber" style={{ fontSize: '0.72rem', marginBottom: 6 }}>
                Oral Defense Prompt #{selectedIdx + 1}
              </span>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginTop: 4 }}>
                {currentQ.prompt}
              </h4>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            🎯 <strong>Why Faculty May Ask This:</strong> {currentQ.personalization_reason || 'Evaluates algorithmic understanding.'}
          </div>

          {/* Answer Input Area */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Your Practice Verbal Explanation:
            </label>
            <textarea
              rows={4}
              value={studentAnswers[selectedIdx] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Explain in your own words: e.g. I utilized a hash map because key lookups operate in O(1) average time, reducing overall complexity from O(n²) to O(n)..."
              className="form-input"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleEvaluateAnswer}
              disabled={!(studentAnswers[selectedIdx] || '').trim()}
              style={{ fontSize: '0.8rem' }}
            >
              <Send size={14} /> Quick Concept Check
            </button>
            {onUpdateVivaAnswers && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveToFaculty}
                disabled={isUpdating}
                style={{ fontSize: '0.8rem' }}
                title="Save and submit your oral viva explanations for instructor verification"
              >
                <Save size={14} />
                <span>{isUpdating ? 'Submitting to Faculty...' : 'Submit Viva to Faculty ✅'}</span>
              </button>
            )}
          </div>

          {/* Feedback Evaluation */}
          {currentResult && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: `1px solid ${currentResult.percentage >= 70 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
              borderRadius: 10,
              padding: 14,
              animation: 'modalIn 0.25s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} color={currentResult.percentage >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
                  <strong style={{ fontSize: '0.9rem', color: '#fff' }}>
                    Concept Articulation Readiness: {currentResult.percentage}%
                  </strong>
                </div>
                <span className={`tag ${currentResult.percentage >= 70 ? 'tag-emerald' : 'tag-amber'}`}>
                  {currentResult.percentage >= 70 ? 'VIVA READY ✅' : 'NEEDS EXPANSION ⚡'}
                </span>
              </div>

              {/* General Qualitative Readiness Guidance (answers & expected concepts kept private) */}
              <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                {currentResult.percentage >= 70 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)' }}>
                    <CheckCircle2 size={15} />
                    <span>Strong conceptual articulation. Your response adequately explains the underlying algorithmic approach.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--accent-amber)' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      Consider expanding your explanation. Be sure to explain why your algorithm is structured this way, specify its time and space complexity, and discuss how edge cases are handled.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
