import React from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  Mic,
  Award,
  Terminal,
  Brain,
  Zap,
  Shield,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import AssessmentFeedbackView from './AssessmentFeedbackView'
const OptimizationView = React.lazy(() => import('./OptimizationView'))
import VivaSimulator from './VivaSimulator'

export default function ProblemStatement({
  questionsList = [],
  assignmentId,
  selectedQuestion,
  onSelectQuestion,
  activeTab = 'problem',
  onChangeTab,
  vivaAnswers = {},
  setVivaAnswers,
  reportData,
  theme = 'dark',
  sourceCode = '',
  language = 'python',
  currentSubmissionId,
  onUpdateVivaAnswers
}) {
  if (!selectedQuestion) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          padding: 14,
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          color: 'var(--accent-blue)',
          marginBottom: 14
        }}>
          <BookOpen size={24} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
          No Assignment Selected
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto 18px' }}>
          {questionsList.length > 0
            ? 'Please choose an assignment to begin solving the problem and preparing your defense.'
            : 'No assignments have been published yet by faculty. Please check back later.'}
        </p>

        {questionsList.length > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Assignment:</span>
            <select
              value={assignmentId || ''}
              onChange={(e) => onSelectQuestion(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 14px', fontSize: '0.86rem' }}
            >
              <option value="" disabled>Select an assignment...</option>
              {questionsList.map(q => (
                <option key={q.id} value={q.id}>
                  #{q.id} - {q.title} ({q.language})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    )
  }

  const rawTests = selectedQuestion.draft_tests || selectedQuestion.test_cases || []
  const sampleTests = rawTests.filter(t => !t.is_hidden).slice(0, 4)
  const vivaList = selectedQuestion.draft_viva || []
  const answeredVivaCount = Object.values(vivaAnswers).filter(a => (a || '').trim().length > 0).length

  // Agent outputs
  const getAgentOutput = (name) => {
    if (!reportData || !reportData.agents) return null
    return reportData.agents.find(a => a.agent_name === name)
  }

  const assessmentOutput = getAgentOutput('assessment_agent')
  const mentorOutput = getAgentOutput('mentor_agent')
  const optOutput = getAgentOutput('optimization_agent')
  const vivaOutput = getAgentOutput('viva_agent')
  const integrityOutput = getAgentOutput('integrity_agent')

  const assessmentDetails = assessmentOutput?.details || {}
  const mentorDetails = mentorOutput?.details || {}
  const optDetails = optOutput?.details || {}
  const vivaDetails = vivaOutput?.details || {}
  const integrityDetails = integrityOutput?.details || {}

  const [reportSubTab, setReportSubTab] = React.useState('mentor')

  return (
    <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 640 }}>
      {/* Top Header & Assignment Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Assignment #{assignmentId || selectedQuestion.id}
            </span>
            <span className="tag tag-blue" style={{ fontSize: '0.7rem' }}>
              <Code2 size={11} /> {(selectedQuestion?.language || 'python').toUpperCase()}
            </span>
            <span className={`tag ${selectedQuestion?.is_approved ? 'tag-emerald' : 'tag-amber'}`} style={{ fontSize: '0.7rem' }}>
              {selectedQuestion?.is_approved ? 'Approved' : 'Draft'}
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            {selectedQuestion?.title || `Assignment #${assignmentId}`}
          </h2>
        </div>

        {questionsList.length > 1 && (
          <select
            value={assignmentId}
            onChange={(e) => onSelectQuestion(e.target.value)}
            className="form-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
          >
            {questionsList.map(q => (
              <option key={q.id} value={q.id}>
                #{q.id} - {q.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Segmented Context Tabs */}
      <div className="workspace-nav" style={{ marginBottom: 18, width: '100%', display: 'flex' }}>
        <button
          type="button"
          className={`workspace-tab ${activeTab === 'problem' ? 'active' : ''}`}
          style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => onChangeTab && onChangeTab('problem')}
        >
          <FileText size={15} />
          <span>Problem Spec</span>
        </button>

        {vivaList.length > 0 && (
          <button
            type="button"
            className={`workspace-tab ${activeTab === 'viva' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => onChangeTab && onChangeTab('viva')}
          >
            <Mic size={15} />
            <span>Oral Viva Defense</span>
            <span
              className={`tag ${answeredVivaCount === vivaList.length ? 'tag-emerald' : 'tag-amber'}`}
              style={{ fontSize: '0.68rem', padding: '1px 6px', marginLeft: 4 }}
            >
              {answeredVivaCount}/{vivaList.length}
            </span>
          </button>
        )}

        {reportData && (
          <button
            type="button"
            className={`workspace-tab ${activeTab === 'report' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => onChangeTab && onChangeTab('report')}
          >
            <Award size={15} />
            <span>AI Evaluation Report</span>
            <span className="tag tag-emerald" style={{ fontSize: '0.68rem', padding: '1px 6px', marginLeft: 4 }}>
              {assessmentDetails.correctness_score ?? 0}%
            </span>
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: PROBLEM SPECIFICATION */}
      {activeTab === 'problem' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          <div>
            <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Description & Requirements
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {selectedQuestion?.description || 'No problem description provided.'}
            </p>
          </div>

          {/* Sample Tests */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Terminal size={14} /> Public Sample Test Cases
              </h4>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Fast verification data
              </span>
            </div>

            {sampleTests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sampleTests.map((st, i) => {
                  const testInput = st.input_data !== undefined ? st.input_data : (st.input !== undefined ? st.input : '')
                  const testExpected = st.expected_output !== undefined ? st.expected_output : ''
                  return (
                    <div
                      key={i}
                      style={{
                        background: 'var(--bg-elevated)',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 6, fontSize: '0.8rem' }}>
                        Sample Case #{i + 1}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Input (STDIN):</span>
                          <code style={{
                            color: 'var(--accent-blue)',
                            background: 'var(--bg-input)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            display: 'block',
                            marginTop: 3,
                            fontFamily: 'Fira Code, monospace',
                            fontSize: '0.8rem',
                            whiteSpace: 'pre-wrap',
                            border: '1px solid var(--border-color)'
                          }}>
                            {testInput !== '' ? testInput : '(No input)'}
                          </code>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>Expected Output:</span>
                          <code style={{
                            color: 'var(--accent-emerald)',
                            background: 'var(--bg-input)',
                            padding: '4px 8px',
                            borderRadius: 4,
                            display: 'block',
                            marginTop: 3,
                            fontFamily: 'Fira Code, monospace',
                            fontSize: '0.8rem',
                            whiteSpace: 'pre-wrap',
                            border: '1px solid var(--border-color)'
                          }}>
                            {testExpected !== '' ? testExpected : '(No output)'}
                          </code>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{
                background: 'var(--bg-elevated)',
                padding: 16,
                borderRadius: 8,
                border: '1px dashed var(--border-color)',
                fontSize: '0.84rem',
                color: 'var(--text-muted)',
                textAlign: 'center'
              }}>
                No public sample cases configured. Hidden assessment test cases will execute upon submission.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: ORAL VIVA DEFENSE PREPARATION */}
      {activeTab === 'viva' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 4 }}>
              Oral Viva Defense Instructions
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Formulate verbal/conceptual explanations in your own words. These answers are submitted with your code and evaluated for concept accuracy by CodeMentor AI, then reviewed and verified by your course instructor.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {vivaList.map((vq, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 10,
                  padding: 14
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span className="tag tag-amber" style={{ fontSize: '0.7rem' }}>
                    Defense Question {idx + 1}
                  </span>
                  {vq.expected_concepts && vq.expected_concepts.length > 0 && (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Focus: {vq.expected_concepts.join(', ')}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>
                  {vq.prompt}
                </div>

                <textarea
                  rows={3}
                  value={vivaAnswers[idx] || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setVivaAnswers && setVivaAnswers(prev => ({ ...prev, [idx]: val }))
                  }}
                  placeholder="Explain your approach, algorithmic logic, time/space complexity, and edge-case handling in your own words..."
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical', fontSize: '0.84rem' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: MULTI-AGENT ASSESSMENT REPORT */}
      {activeTab === 'report' && reportData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {/* Top Pillar Scores */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correctness</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (assessmentDetails.correctness_score ?? 0) >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)', marginTop: 2 }}>
                {assessmentDetails.correctness_score ?? 0}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code Quality</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                {assessmentDetails.standards_score ?? 100}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Efficiency</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: 2 }}>
                {assessmentDetails.efficiency_score ?? 75}%
              </div>
            </div>
          </div>

          {/* Sub-Tabs for Report Breakdown */}
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border-color)', paddingBottom: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setReportSubTab('mentor')}
              className={`btn-outline ${reportSubTab === 'mentor' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: reportSubTab === 'mentor' ? 'var(--bg-elevated)' : 'transparent',
                color: reportSubTab === 'mentor' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <Brain size={13} /> Socratic Mentor
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab('optimization')}
              className={`btn-outline ${reportSubTab === 'optimization' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: reportSubTab === 'optimization' ? 'var(--bg-elevated)' : 'transparent',
                color: reportSubTab === 'optimization' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <Zap size={13} /> Optimization
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab('viva')}
              className={`btn-outline ${reportSubTab === 'viva' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: reportSubTab === 'viva' ? 'var(--bg-elevated)' : 'transparent',
                color: reportSubTab === 'viva' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <Award size={13} /> Viva Defense
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab('integrity')}
              className={`btn-outline ${reportSubTab === 'integrity' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: reportSubTab === 'integrity' ? 'var(--bg-elevated)' : 'transparent',
                color: reportSubTab === 'integrity' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <Shield size={13} /> Integrity
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab('rubric')}
              className={`btn-outline ${reportSubTab === 'rubric' ? 'active' : ''}`}
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                background: reportSubTab === 'rubric' ? 'var(--bg-elevated)' : 'transparent',
                color: reportSubTab === 'rubric' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <FileCheck size={13} /> Rubric
            </button>
          </div>

          {/* Sub-tab views */}
          {reportSubTab === 'mentor' && (
            <div>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderLeft: '3px solid var(--accent-blue)', padding: 12, borderRadius: '0 6px 6px 0', marginBottom: 14 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4 }}>
                  Growth Mindset Feedback
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  {mentorOutput?.summary || 'No feedback generated.'}
                </p>
              </div>

              {mentorDetails.hints && mentorDetails.hints.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Guiding Socratic Hints
                  </div>
                  {mentorDetails.hints.map((h, i) => (
                    <div key={i} style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <span className="tag tag-amber" style={{ fontSize: '0.7rem', marginBottom: 4 }}>
                        {h.topic || 'Concept'}
                      </span>
                      <p style={{ fontSize: '0.86rem', fontStyle: 'italic', color: 'var(--text-main)', marginTop: 4 }}>
                        "{h.socratic_question}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reportSubTab === 'optimization' && (
            <React.Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading code comparison...</div>}>
              <OptimizationView
                optDetails={optDetails}
                optSummary={optOutput?.summary}
                originalCode={sourceCode}
                language={language}
                theme={theme}
              />
            </React.Suspense>
          )}

          {reportSubTab === 'viva' && (
            <VivaSimulator
              vivaDetails={vivaDetails}
              vivaSummary={vivaOutput?.summary}
              submissionId={currentSubmissionId}
              initialAnswers={vivaAnswers}
              onUpdateVivaAnswers={onUpdateVivaAnswers}
            />
          )}

          {reportSubTab === 'integrity' && (
            <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 8, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Shield size={16} color="var(--accent-emerald)" />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Academic Integrity Analysis</span>
                <span className="tag tag-emerald" style={{ fontSize: '0.7rem' }}>
                  {(integrityDetails.risk_level || 'LOW').toUpperCase()} RISK
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {integrityOutput?.summary || 'No suspicious code patterns detected.'}
              </p>
            </div>
          )}

          {reportSubTab === 'rubric' && (
            <AssessmentFeedbackView
              assessmentDetails={assessmentDetails}
              theme={theme}
            />
          )}
        </div>
      )}
    </div>
  )
}
