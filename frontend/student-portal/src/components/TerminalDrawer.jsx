import React, { useState } from 'react'
import {
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react'

export default function TerminalDrawer({
  runResults,
  isRunning,
  isOpen,
  onToggle
}) {
  const [activeTab, setActiveTab] = useState('tests') // 'tests' or 'console'
  const [expandedTests, setExpandedTests] = useState({})

  if (!isOpen && !runResults && !isRunning) return null

  const passedCount = runResults?.passed_tests ?? 0
  const totalCount = runResults?.total_tests ?? 0
  const isAllPassed = totalCount > 0 && passedCount === totalCount

  const toggleExpand = (idx) => {
    setExpandedTests(prev => ({
      ...prev,
      [idx]: prev[idx] !== undefined ? !prev[idx] : false // default is true for failed, toggle inverts
    }))
  }

  const isTestExpanded = (idx, passed) => {
    if (expandedTests[idx] !== undefined) return expandedTests[idx]
    // Default: failed tests are expanded automatically, passed tests are collapsed
    return !passed
  }

  return (
    <div style={{
      marginTop: 14,
      borderRadius: 12,
      border: '1px solid var(--border-color)',
      background: '#050811',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
    }}>
      {/* Terminal Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#090f1f',
        padding: '8px 16px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* macOS Style Window Dots */}
          <div style={{ display: 'flex', gap: 6, marginRight: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            style={{
              background: activeTab === 'tests' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'tests' ? 'var(--accent-blue)' : '#94a3b8',
              border: activeTab === 'tests' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>Sandbox Test Suite</span>
            {runResults && (
              <span className={`tag ${isAllPassed ? 'tag-emerald' : 'tag-rose'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                {passedCount}/{totalCount} Passed
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('console')}
            style={{
              background: activeTab === 'console' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeTab === 'console' ? 'var(--accent-blue)' : '#94a3b8',
              border: activeTab === 'console' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Terminal size={13} />
            <span>Stdout / Raw Output</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggle}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.78rem'
          }}
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Terminal Body */}
      {isOpen && (
        <div style={{ padding: 16, maxHeight: 380, overflowY: 'auto' }}>
          {isRunning ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-blue)', padding: 16, fontSize: '0.88rem' }}>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid var(--accent-blue)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Compiling and executing in isolated container sandbox...</span>
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : !runResults ? (
            <div style={{ color: '#cbd5e1', fontSize: '0.85rem', padding: 8 }}>
              Click <strong>"▶ Run Code (Sandbox Only)"</strong> to execute your code against test cases before submitting for AI evaluation.
            </div>
          ) : (
            <div>
              {/* Compilation Error Banner */}
              {runResults.compilation_error && (
                <div style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  color: '#fda4af',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                    <AlertTriangle size={16} color="var(--accent-rose)" /> Compilation Error
                  </div>
                  <pre style={{ margin: 0, fontFamily: 'Fira Code, monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                    {runResults.compilation_error}
                  </pre>
                </div>
              )}

              {/* Execution Timeout Banner */}
              {runResults.timeout_error && (
                <div style={{
                  background: 'rgba(251, 191, 36, 0.12)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  color: '#fde68a',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                    <Clock size={16} color="var(--accent-amber)" /> Execution Timeout (Possible Infinite Loop)
                  </div>
                  <pre style={{ margin: 0, fontFamily: 'Fira Code, monospace', fontSize: '0.8rem' }}>
                    {runResults.timeout_error}
                  </pre>
                </div>
              )}

              {/* TAB 1: Detailed Test Cases with Rich Failure Diagnostics */}
              {activeTab === 'tests' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {runResults.test_results?.map((tr, idx) => {
                    const expanded = isTestExpanded(idx, tr.passed)
                    const isMismatch = !tr.passed && !tr.error_message?.includes('Compilation Error') && !tr.error_message?.includes('Timeout')

                    // Determine failure category
                    let failureCategory = 'OUTPUT MISMATCH'
                    let categoryColor = 'tag-amber'
                    if (tr.passed) {
                      failureCategory = 'PASSED'
                      categoryColor = 'tag-emerald'
                    } else if (tr.error_message?.toLowerCase().includes('compilation')) {
                      failureCategory = 'COMPILATION ERROR'
                      categoryColor = 'tag-rose'
                    } else if (tr.error_message?.toLowerCase().includes('timeout')) {
                      failureCategory = 'TIMEOUT'
                      categoryColor = 'tag-amber'
                    } else if (tr.error_message && (tr.error_message.includes('Traceback') || tr.error_message.includes('Error:') || tr.error_message.toLowerCase().includes('runtime'))) {
                      failureCategory = 'RUNTIME EXCEPTION'
                      categoryColor = 'tag-rose'
                    } else if (!tr.actual_output || tr.actual_output.trim() === '') {
                      failureCategory = 'NO OUTPUT PRODUCED'
                      categoryColor = 'tag-amber'
                    }

                    return (
                      <div
                        key={idx}
                        style={{
                          background: '#090d16',
                          borderRadius: 8,
                          border: `1px solid ${tr.passed ? 'rgba(52, 211, 153, 0.3)' : 'rgba(244, 63, 94, 0.35)'}`,
                          overflow: 'hidden'
                        }}
                      >
                        {/* Test Summary Row */}
                        <div
                          onClick={() => toggleExpand(idx)}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: tr.passed ? 'rgba(52, 211, 153, 0.04)' : 'rgba(244, 63, 94, 0.06)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {tr.passed ? (
                              <span className="tag tag-emerald" style={{ fontSize: '0.72rem' }}>
                                <CheckCircle2 size={12} /> PASSED
                              </span>
                            ) : (
                              <span className="tag tag-rose" style={{ fontSize: '0.72rem' }}>
                                <XCircle size={12} /> FAILED
                              </span>
                            )}
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                              Test Case #{idx + 1}
                            </strong>
                            {!tr.passed && (
                              <span className={`tag ${categoryColor}`} style={{ fontSize: '0.65rem' }}>
                                {failureCategory}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} /> {tr.execution_time_ms ? `${tr.execution_time_ms.toFixed(1)} ms` : '< 1 ms'}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 2 }}>
                              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </span>
                          </div>
                        </div>

                        {/* Collapsible Inspection Details */}
                        {expanded && (
                          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-color)', background: '#070b13' }}>
                            {/* Failure Reason Callout */}
                            {!tr.passed && (
                              <div style={{
                                background: 'rgba(244, 63, 94, 0.08)',
                                borderLeft: '3px solid var(--accent-rose)',
                                borderRadius: '0 6px 6px 0',
                                padding: '8px 12px',
                                marginBottom: 12,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8
                              }}>
                                <AlertCircle size={16} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fca5a5', marginBottom: 2 }}>
                                    Failure Reason:
                                  </div>
                                  <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                                    {tr.failure_reason || tr.error_message || 'Output did not match the expected test case output.'}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* I/O Breakdown Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                              {/* Input Box */}
                              <div style={{ background: '#090d16', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                  Input (STDIN)
                                </span>
                                <pre style={{
                                  margin: 0,
                                  fontSize: '0.78rem',
                                  fontFamily: 'Fira Code, monospace',
                                  color: 'var(--accent-blue)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  maxHeight: 100,
                                  overflowY: 'auto'
                                }}>
                                  {tr.input_data !== undefined && tr.input_data !== null && tr.input_data !== ''
                                    ? tr.input_data
                                    : '(No stdin input)'}
                                </pre>
                              </div>

                              {/* Expected Output Box */}
                              <div style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                  Expected Output
                                </span>
                                <pre style={{
                                  margin: 0,
                                  fontSize: '0.78rem',
                                  fontFamily: 'Fira Code, monospace',
                                  color: 'var(--accent-emerald)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  maxHeight: 100,
                                  overflowY: 'auto'
                                }}>
                                  {tr.expected_output !== undefined && tr.expected_output !== null && tr.expected_output !== ''
                                    ? tr.expected_output
                                    : '(No output expected)'}
                                </pre>
                              </div>

                              {/* Actual Output Box */}
                              <div style={{ background: 'var(--bg-input)', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                                <span style={{
                                  fontSize: '0.72rem',
                                  color: tr.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  fontWeight: 600,
                                  display: 'block',
                                  marginBottom: 4
                                }}>
                                  Actual Output Received
                                </span>
                                <pre style={{
                                  margin: 0,
                                  fontSize: '0.78rem',
                                  fontFamily: 'Fira Code, monospace',
                                  color: tr.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  maxHeight: 100,
                                  overflowY: 'auto'
                                }}>
                                  {tr.actual_output !== undefined && tr.actual_output !== null && tr.actual_output !== ''
                                    ? tr.actual_output
                                    : '(Empty / No stdout produced)'}
                                </pre>
                              </div>
                            </div>

                            {/* Stderr / Exception Traceback Box (if present and distinct) */}
                            {tr.error_message && !tr.error_message.startsWith('Output mismatch') && (
                              <div style={{ marginTop: 10 }}>
                                <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                                  Execution Error Details / Traceback:
                                </span>
                                <pre style={{
                                  margin: 0,
                                  fontSize: '0.76rem',
                                  fontFamily: 'Fira Code, monospace',
                                  color: '#fda4af',
                                  background: 'rgba(244, 63, 94, 0.08)',
                                  padding: 10,
                                  borderRadius: 6,
                                  border: '1px solid rgba(244, 63, 94, 0.2)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  maxHeight: 140,
                                  overflowY: 'auto'
                                }}>
                                  {tr.error_message}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* TAB 2: Raw Console / Stdout */}
              {activeTab === 'console' && (
                <div style={{
                  background: '#090d16',
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '0.8rem',
                  lineHeight: 1.6
                }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
                    $ sandbox-runner --submission=local --timeout=10s
                  </div>
                  {runResults.test_results?.map((tr, idx) => (
                    <div key={idx} style={{ marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-dim)' }}>[Test {idx + 1}] </span>
                      {tr.actual_output ? (
                        <span style={{ color: tr.passed ? '#38bdf8' : '#fb7185' }}>{tr.actual_output}</span>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>no stdout</span>
                      )}
                      {!tr.passed && tr.failure_reason && (
                        <div style={{ color: '#fda4af', fontSize: '0.75rem', paddingLeft: 16 }}>
                          ↳ {tr.failure_reason}
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ color: isAllPassed ? 'var(--accent-emerald)' : 'var(--accent-amber)', marginTop: 8, borderTop: '1px dashed var(--border-color)', paddingTop: 6 }}>
                    ✓ Execution finished in {runResults.test_results?.reduce((acc, t) => acc + (t.execution_time_ms || 0), 0).toFixed(1)}ms. Passed {passedCount}/{totalCount} tests.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
