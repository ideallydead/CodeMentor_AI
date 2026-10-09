import React, { useState, useEffect } from 'react'
import { CheckSquare, CheckCircle2, AlertCircle, Sparkles, Send, Award, Save, HelpCircle, FileCheck } from 'lucide-react'

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
  const qType = currentQ?.question_type || (currentQ?.options && currentQ.options.length > 0 ? 'mcq' : 'conceptual')

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
    const studentAns = (studentAnswers[selectedIdx] || '').trim()

    if (qType === 'mcq') {
      const correctAns = (currentQ.correct_answer || '').trim()
      const isMatch = studentAns.toLowerCase() === correctAns.toLowerCase() ||
        (correctAns.length === 1 && studentAns.toUpperCase().startsWith(correctAns.toUpperCase())) ||
        (studentAns.length > 0 && correctAns.length > 0 && (studentAns.includes(correctAns) || correctAns.includes(studentAns)))

      setEvaluationResults(prev => ({
        ...prev,
        [selectedIdx]: {
          evaluated: true,
          percentage: isMatch ? 100 : 0,
          detected: isMatch ? [correctAns] : [],
          missing: isMatch ? [] : [correctAns]
        }
      }))
      return
    }

    if (qType === 'fill_in_the_blank') {
      const correctAns = (currentQ.correct_answer || '').trim().toLowerCase()
      const cleanStudent = studentAns.toLowerCase().replace(/['"`.]/g, '').trim()
      const cleanCorrect = correctAns.replace(/['"`.]/g, '').trim()
      const isMatch = cleanStudent === cleanCorrect || cleanCorrect.split(/[,/|]/).some(part => part.trim() === cleanStudent)

      setEvaluationResults(prev => ({
        ...prev,
        [selectedIdx]: {
          evaluated: true,
          percentage: isMatch ? 100 : 0,
          detected: isMatch ? [currentQ.correct_answer] : [],
          missing: isMatch ? [] : [currentQ.correct_answer]
        }
      }))
      return
    }

    // Conceptual question
    const answer = studentAns.toLowerCase()
    const expected = currentQ.expected_concepts || []
    const detected = []
    const missing = []

    expected.forEach(concept => {
      const cleanConcept = concept.toLowerCase().trim()
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
        No viva defense questions generated for this submission yet.
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
          <CheckSquare size={16} /> Interactive Viva Assessment Simulator
        </div>
        <p style={{ fontSize: '0.85rem', color: '#e2e8f0', margin: 0 }}>
          {vivaDetails?.guidance_for_faculty || 'Practice answering MCQs, fill-in-the-blanks, and articulating your algorithmic logic before instructor verification.'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span className="tag tag-amber" style={{ fontSize: '0.72rem' }}>
                  Viva Question #{selectedIdx + 1}
                </span>
                <span className={`tag ${qType === 'mcq' ? 'tag-blue' : qType === 'fill_in_the_blank' ? 'tag-purple' : 'tag-gray'}`} style={{ fontSize: '0.68rem' }}>
                  {qType === 'mcq' ? 'MCQ' : qType === 'fill_in_the_blank' ? 'Fill In Blank' : 'Conceptual'}
                </span>
              </div>
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
            {qType === 'mcq' ? (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Select the Correct Option:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(currentQ.options || []).map((opt, oIdx) => {
                    const isSelected = studentAnswers[selectedIdx] === opt
                    return (
                      <label
                        key={oIdx}
                        onClick={() => handleAnswerChange(opt)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-elevated)',
                          border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: isSelected ? '#fff' : 'var(--text-main)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <input
                          type="radio"
                          name={`sim_mcq_${selectedIdx}`}
                          checked={isSelected}
                          onChange={() => handleAnswerChange(opt)}
                          style={{ accentColor: 'var(--accent-blue)' }}
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : qType === 'fill_in_the_blank' ? (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Your Answer for the Missing Term:
                </label>
                <input
                  type="text"
                  value={studentAnswers[selectedIdx] || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type the exact word or complexity term to complete the blank..."
                  className="form-input"
                  style={{ width: '100%', fontSize: '0.88rem', padding: '10px 14px' }}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Your Explanation / Response:
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
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleEvaluateAnswer}
              disabled={!(studentAnswers[selectedIdx] || '').trim()}
              style={{ fontSize: '0.8rem' }}
            >
              <Send size={14} /> Quick Check
            </button>
            {onUpdateVivaAnswers && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveToFaculty}
                disabled={isUpdating}
                style={{ fontSize: '0.8rem' }}
                title="Save and submit your viva answers for instructor verification"
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
                    {qType === 'mcq' || qType === 'fill_in_the_blank' ? 'Answer Accuracy:' : 'Concept Articulation Readiness:'} {currentResult.percentage}%
                  </strong>
                </div>
                <span className={`tag ${currentResult.percentage >= 70 ? 'tag-emerald' : 'tag-amber'}`}>
                  {currentResult.percentage >= 70 ? 'CORRECT / READY ✅' : 'NEEDS REVISION ⚡'}
                </span>
              </div>

              {/* Qualitative Guidance */}
              <div style={{ marginTop: 8, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                {qType === 'mcq' || qType === 'fill_in_the_blank' ? (
                  currentResult.percentage >= 70 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-emerald)' }}>
                      <CheckCircle2 size={15} />
                      <span>Correct answer verified. You are ready to submit to faculty.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--accent-amber)' }}>
                      <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Answer does not match the expected key. Please review the problem logic and try again.</span>
                    </div>
                  )
                ) : (
                  currentResult.percentage >= 70 ? (
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
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
