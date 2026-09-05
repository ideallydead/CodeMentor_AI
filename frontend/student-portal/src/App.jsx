import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import './index.css'

const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
const API_BASE = `http://${hostname}:8000/api`

const SAMPLE_CODE = {
  python: `def two_sum(nums, target):
    # Hash map strategy for O(n) runtime
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
`,
  java: `public class Solution {
    public int[] twoSum(int[] nums, int target) {
        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}
`,
  c: `#include <stdio.h>

int main() {
    int arr[] = {2, 7, 11, 15};
    int target = 9;
    int n = 4;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (arr[i] + arr[j] == target) {
                printf("Indices: %d, %d\\n", i, j);
                return 0;
            }
        }
    }
    return 0;
}
`
}

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState('student') // 'student' or 'faculty'
  const [username, setUsername] = useState('student101@codementor.edu')
  const [password, setPassword] = useState('student123')
  const [loginError, setLoginError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Student Workspace State
  const [language, setLanguage] = useState('python')
  const [assignmentId, setAssignmentId] = useState('1')
  const [studentId, setStudentId] = useState('101')
  const [sourceCode, setSourceCode] = useState(SAMPLE_CODE.python)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('mentor')
  const [reportData, setReportData] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  // Monaco Editor State
  const [editorTheme, setEditorTheme] = useState('vs-dark')
  const [fontSize, setFontSize] = useState(14)
  const [showMinimap, setShowMinimap] = useState(true)

  // Faculty Workspace State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facLanguage, setFacLanguage] = useState('python')
  const [facLoading, setFacLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [facultyIntelligence, setFacultyIntelligence] = useState(null)
  const [facMsg, setFacMsg] = useState(null)
  const [overrideSubId, setOverrideSubId] = useState(null)
  const [overrideScore, setOverrideScore] = useState('90')
  const [overrideGrade, setOverrideGrade] = useState('excellent')
  const [overrideNotes, setOverrideNotes] = useState('Verified understanding in viva examination.')

  const handleRoleTabChange = (role) => {
    setUserRole(role)
    if (role === 'student') {
      setUsername('student101@codementor.edu')
      setPassword('student123')
    } else {
      setUsername('faculty@codementor.edu')
      setPassword('faculty123')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics`)
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      }
    } catch (e) {
      console.error('Failed to fetch analytics', e)
    }
  }

  const fetchIntelligence = async (qId) => {
    try {
      const res = await fetch(`${API_BASE}/questions/${qId}/intelligence`)
      if (res.ok) {
        const data = await res.json()
        setFacultyIntelligence(data)
      }
    } catch (e) {
      console.error('Failed to fetch intelligence', e)
    }
  }

  const handleOverrideSubmit = async (subId) => {
    try {
      const res = await fetch(`${API_BASE}/submissions/${subId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_score: parseInt(overrideScore, 10) || null,
          final_grade: overrideGrade,
          faculty_notes: overrideNotes
        })
      })
      if (res.ok) {
        setFacMsg('✅ Grade override saved successfully!')
        setOverrideSubId(null)
        if (assignmentId) fetchIntelligence(parseInt(assignmentId, 10))
      }
    } catch (e) {
      console.error('Failed to save override', e)
    }
  }

  // Student Workspace & Question State
  const [questionsList, setQuestionsList] = useState([])
  const [selectedQuestion, setSelectedQuestion] = useState(null)

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${API_BASE}/questions`)
      if (res.ok) {
        const data = await res.json()
        setQuestionsList(data)
        if (data.length > 0) {
          const matched = data.find(q => String(q.id) === String(assignmentId)) || data[0]
          setSelectedQuestion(matched)
          setAssignmentId(String(matched.id))
          if (matched.language) {
            setLanguage(matched.language)
          }
          fetchIntelligence(matched.id)
        }
      }
    } catch (e) {
      console.error('Failed to fetch questions', e)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
      fetchQuestions()
      if (assignmentId) fetchIntelligence(parseInt(assignmentId, 10))
    }
  }, [isAuthenticated, assignmentId])

  const handleSelectQuestion = async (qId) => {
    setAssignmentId(String(qId))
    const found = questionsList.find(q => String(q.id) === String(qId))
    if (found) {
      setSelectedQuestion(found)
      if (found.language) {
        setLanguage(found.language)
        setSourceCode(SAMPLE_CODE[found.language] || SAMPLE_CODE.python)
      }
    } else {
      try {
        const res = await fetch(`${API_BASE}/questions/${qId}`)
        if (res.ok) {
          const data = await res.json()
          setSelectedQuestion(data)
          if (data.language) setLanguage(data.language)
        } else {
          setSelectedQuestion(null)
        }
      } catch (e) {
        setSelectedQuestion(null)
      }
    }
  }

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoginError(null)

    if (!username || !password) {
      setLoginError('Please enter username and password')
      return
    }

    const nameDisplay = userRole === 'faculty' ? 'Prof. Alan Turing' : 'Vijil (Student #101)'
    setCurrentUser({
      username: username,
      name: nameDisplay,
      role: userRole,
      id: userRole === 'student' ? studentId : 'FAC_001'
    })
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setReportData(null)
    setErrorMsg(null)
  }

  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    setSourceCode(SAMPLE_CODE[lang] || '')
  }

  const handleStudentSubmit = async () => {
    setSubmitting(true)
    setErrorMsg(null)
    setReportData(null)
    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: parseInt(assignmentId, 10),
          student_id: parseInt(studentId, 10),
          source_code: sourceCode,
          language: language
        })
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.detail || `Server returned error status ${res.status}`)
      }

      const submission = await res.json()
      const subId = submission.id

      const statusRes = await fetch(`${API_BASE}/submissions/${subId}/status`)
      if (!statusRes.ok) {
        throw new Error('Failed to fetch assessment status')
      }
      const statusJson = await statusRes.json()
      
      setReportData(statusJson.details || {})
    } catch (err) {
      if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
        setErrorMsg(`Unable to connect to API server at ${API_BASE}. Please verify backend server is running on port 8000.`)
      } else {
        setErrorMsg(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateQuestion = async (e) => {
    e.preventDefault()
    if (!title) return
    setFacLoading(true)
    setFacMsg(null)
    try {
      const res = await fetch(`${API_BASE}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, language: facLanguage })
      })
      if (!res.ok) throw new Error('Failed to create question')
      const data = await res.json()
      setCurrentQuestion(data)
      setAssignmentId(String(data.id))
      setFacMsg('✨ Draft Assignment & AI Test/Viva Bank Created!')
      fetchAnalytics()
    } catch (err) {
      setFacMsg(`❌ Error: ${err.message}`)
    } finally {
      setFacLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!currentQuestion) return
    setFacLoading(true)
    try {
      const res = await fetch(`${API_BASE}/questions/${currentQuestion.id}/approve`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Approval failed')
      const updated = await res.json()
      setCurrentQuestion(updated)
      setFacMsg('✅ Assignment Approved! Students can now submit solutions.')
      fetchAnalytics()
    } catch (err) {
      setFacMsg(`❌ Error: ${err.message}`)
    } finally {
      setFacLoading(false)
    }
  }

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

  // =========================================================================
  // RENDER 1: AUTHENTICATION LOGIN SCREEN
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="glass-card login-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 6 }}>
              CodeMentor <span className="gradient-text">AI</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sign in to access Student & Faculty Intelligence Portal
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              className={`role-pill ${userRole === 'student' ? 'active-student' : ''}`}
              onClick={() => handleRoleTabChange('student')}
            >
              🎓 Student Portal
            </button>
            <button
              type="button"
              className={`role-pill ${userRole === 'faculty' ? 'active-faculty' : ''}`}
              onClick={() => handleRoleTabChange('faculty')}
            >
              🏫 Faculty Module
            </button>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label>Username / Institutional Email</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or email"
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
            </div>

            {userRole === 'student' && (
              <div className="input-group">
                <label>Student ID</label>
                <input
                  type="number"
                  className="form-input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="101"
                />
              </div>
            )}

            {loginError && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: 16 }}>
                ⚠️ {loginError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
              Sign In to {userRole === 'student' ? 'Student Portal' : 'Faculty Module'} →
            </button>
          </form>
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER 2: AUTHENTICATED WORKSPACE MODULE
  // =========================================================================
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <header className="glass-card" style={{ padding: '16px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            CodeMentor <span className="gradient-text">AI</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {userRole === 'student' ? 'Student Socratic Assessment Portal' : 'Faculty Intelligence & Question Setup Module'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#090d16', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>👤 {currentUser?.name}</span>
            <span className={`tag ${currentUser?.role === 'student' ? 'tag-blue' : 'tag-emerald'}`} style={{ fontSize: '0.7rem' }}>
              {currentUser?.role?.toUpperCase()}
            </span>
          </div>

          <button
            className="btn-outline"
            onClick={() => setUserRole(userRole === 'student' ? 'faculty' : 'student')}
          >
            Switch to {userRole === 'student' ? 'Faculty Module 🏫' : 'Student Portal 🎓'}
          </button>

          <button className="btn-outline" onClick={handleLogout} style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            🔒 Logout
          </button>
        </div>
      </header>

      {/* 🎓 MODULE 1: STUDENT PORTAL */}
      {userRole === 'student' && (
        <div style={{ display: 'grid', gridTemplateColumns: reportData ? '1fr 1fr' : '1fr', gap: 28, width: '100%', boxSizing: 'border-box' }}>
          <section className="glass-card" style={{ padding: 24, minWidth: 0, overflow: 'hidden' }}>
            {/* 📌 ASSIGNMENT PROBLEM STATEMENT & SAMPLE TEST CASES (PRE-SUBMISSION) */}
            <div style={{ background: '#090d16', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assignment #{assignmentId}</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
                    {selectedQuestion?.title || `Two Sum Problem (Assignment #${assignmentId})`}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {questionsList.length > 0 && (
                    <select
                      value={assignmentId}
                      onChange={(e) => handleSelectQuestion(e.target.value)}
                      style={{ background: '#111827', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem' }}
                    >
                      {questionsList.map(q => (
                        <option key={q.id} value={q.id}>
                          #{q.id} - {q.title} ({q.language})
                        </option>
                      ))}
                    </select>
                  )}
                  <span className={`tag ${selectedQuestion?.is_approved ? 'tag-emerald' : 'tag-amber'}`} style={{ fontSize: '0.75rem' }}>
                    {selectedQuestion?.is_approved ? 'APPROVED' : 'DRAFT / DEFAULT'}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: 14 }}>
                {selectedQuestion?.description || "Given an array of integers and a target sum, write an efficient function to return indices of the two numbers such that they add up to the target."}
              </p>

              {/* 🧪 SAMPLE TEST CASES (SHOWN BEFORE SUBMISSION) */}
              <div style={{ background: '#0d1322', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🧪 Sample Test Cases (Pre-Submission Preview)
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visible to student before execution</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {selectedQuestion?.draft_tests && selectedQuestion.draft_tests.length > 0 ? (
                    selectedQuestion.draft_tests.slice(0, 3).map((st, i) => (
                      <div key={i} style={{ background: '#090d16', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 4 }}>Sample #{i + 1}</div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Input:</strong> <code style={{ color: '#38bdf8' }}>{st.input || st.input_data || '2, 7, 11, 15 \n 9'}</code></div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Expected:</strong> <code style={{ color: '#34d399' }}>{st.expected_output || '[0, 1]'}</code></div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div style={{ background: '#090d16', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 4 }}>Sample #1</div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Input:</strong> <code style={{ color: '#38bdf8' }}>nums = [2, 7, 11, 15], target = 9</code></div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Expected:</strong> <code style={{ color: '#34d399' }}>[0, 1]</code></div>
                      </div>
                      <div style={{ background: '#090d16', padding: 10, borderRadius: 6, border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--accent-amber)', marginBottom: 4 }}>Sample #2</div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Input:</strong> <code style={{ color: '#38bdf8' }}>nums = [3, 2, 4], target = 6</code></div>
                        <div><strong style={{ color: 'var(--text-muted)' }}>Expected:</strong> <code style={{ color: '#34d399' }}>[1, 2]</code></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Monaco Code Workspace</h2>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 6 }}>Assignment ID:</label>
                  <input
                    type="number"
                    value={assignmentId}
                    onChange={(e) => handleSelectQuestion(e.target.value)}
                    style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 8px', width: 60 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  <option value="python">Python 3</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                </select>

                <select
                  value={editorTheme}
                  onChange={(e) => setEditorTheme(e.target.value)}
                  style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  <option value="vs-dark">🌙 VS Dark</option>
                  <option value="light">☀️ Light</option>
                </select>

                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowMinimap(!showMinimap)}
                  style={{
                    background: showMinimap ? 'rgba(56, 189, 248, 0.15)' : '#090d16',
                    color: showMinimap ? 'var(--accent-blue)' : 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  🗺️ {showMinimap ? 'Hide Minimap' : 'Show Minimap'}
                </button>

                <button
                  onClick={() => setSourceCode(SAMPLE_CODE[language] || '')}
                  style={{ background: 'transparent', color: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Load Sample Code
                </button>
              </div>
            </div>

            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 16 }}>
              <Editor
                height="450px"
                language={language === 'c' ? 'c' : language === 'java' ? 'java' : 'python'}
                theme={editorTheme}
                value={sourceCode}
                onChange={(val) => setSourceCode(val || '')}
                loading={
                  <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center', background: '#090d16' }}>
                    ⚡ Loading Monaco Editor...
                  </div>
                }
                options={{
                  fontSize: fontSize,
                  minimap: { enabled: showMinimap },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  lineNumbers: 'on',
                  folding: true,
                  formatOnType: true,
                  renderLineHighlight: 'all',
                  padding: { top: 12, bottom: 12 }
                }}
              />
            </div>

            {errorMsg && (
              <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--accent-rose)', color: '#fda4af', fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠️ {errorMsg}</div>
                {errorMsg.includes('not approved') && (
                  <div style={{ fontSize: '0.85rem', marginTop: 6, color: '#f8fafc' }}>
                    💡 <strong>Quick Fix:</strong> Switch to the <strong>Faculty Module</strong> above, create Assignment #{assignmentId}, and click <strong>Approve Question</strong>!
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={handleStudentSubmit} disabled={submitting}>
                {submitting ? 'Running Assessment Pipeline...' : 'Submit Code for AI Feedback ✨'}
              </button>
            </div>
          </section>

          {reportData && (
            <section className="glass-card" style={{ padding: 24, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#090d16', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Correctness</span>
                  <div className={`score-badge ${assessmentDetails.overall_recommendation || 'good'}`}>
                    {assessmentDetails.correctness_score ?? 0}%
                  </div>
                </div>
                <div style={{ background: '#090d16', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Code Standards</span>
                  <div className="score-badge good">
                    {assessmentDetails.standards_score ?? 100}%
                  </div>
                </div>
                <div style={{ background: '#090d16', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Efficiency</span>
                  <div className="score-badge fair">
                    {assessmentDetails.efficiency_score ?? 75}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveTab('mentor')}
                  className={`tag ${activeTab === 'mentor' ? 'tag-blue' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'mentor' ? undefined : 'transparent', border: activeTab === 'mentor' ? undefined : 'none' }}
                >
                  🧠 Socratic Mentor
                </button>
                <button
                  onClick={() => setActiveTab('testcases')}
                  className={`tag ${activeTab === 'testcases' ? 'tag-blue' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'testcases' ? undefined : 'transparent', border: activeTab === 'testcases' ? undefined : 'none' }}
                >
                  🧪 Test Execution Results
                </button>
                <button
                  onClick={() => setActiveTab('optimization')}
                  className={`tag ${activeTab === 'optimization' ? 'tag-emerald' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'optimization' ? undefined : 'transparent', border: activeTab === 'optimization' ? undefined : 'none' }}
                >
                  ⚡ Optimization
                </button>
                <button
                  onClick={() => setActiveTab('viva')}
                  className={`tag ${activeTab === 'viva' ? 'tag-amber' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'viva' ? undefined : 'transparent', border: activeTab === 'viva' ? undefined : 'none' }}
                >
                  🎙️ Viva Defense
                </button>
                <button
                  onClick={() => setActiveTab('integrity')}
                  className={`tag ${activeTab === 'integrity' ? 'tag-purple' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'integrity' ? undefined : 'transparent', border: activeTab === 'integrity' ? undefined : 'none' }}
                >
                  🛡️ Academic Integrity
                </button>
                <button
                  onClick={() => setActiveTab('assessment')}
                  className={`tag ${activeTab === 'assessment' ? 'tag-rose' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'assessment' ? undefined : 'transparent', border: activeTab === 'assessment' ? undefined : 'none' }}
                >
                  📋 Assessment
                </button>
              </div>

              {activeTab === 'testcases' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Post-Execution Test Suite Breakdown:</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Execution Engine: Sandbox Container
                    </span>
                  </div>

                  {assessmentDetails.all_test_results && assessmentDetails.all_test_results.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {assessmentDetails.all_test_results.map((tr, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 14, borderRadius: 10, border: `1px solid ${tr.passed ? 'rgba(52, 211, 153, 0.3)' : 'rgba(244, 63, 94, 0.3)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                              <span className={`tag ${tr.passed ? 'tag-emerald' : 'tag-rose'}`}>
                                {tr.passed ? 'PASSED ✅' : 'FAILED ❌'}
                              </span>
                              <strong style={{ fontSize: '0.9rem' }}>Test Case #{idx + 1} ({tr.test_id})</strong>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              ⏱️ {tr.execution_time_ms ? `${tr.execution_time_ms.toFixed(1)} ms` : '< 1 ms'}
                            </span>
                          </div>
                          {tr.actual_output !== undefined && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                              <strong>Actual Output:</strong> <code style={{ color: '#fff', background: '#111827', padding: '2px 8px', borderRadius: 4 }}>{tr.actual_output || '(None)'}</code>
                            </div>
                          )}
                          {tr.error_message && (
                            <div style={{ fontSize: '0.85rem', color: '#fda4af', marginTop: 4, background: 'rgba(244, 63, 94, 0.1)', padding: '6px 10px', borderRadius: 6 }}>
                              ⚠️ <strong>Failure Details:</strong> {tr.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : assessmentDetails.failed_tests && assessmentDetails.failed_tests.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {assessmentDetails.failed_tests.map((ft, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 14, borderRadius: 10, border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span className="tag tag-rose">FAILED ❌</span>
                            <strong style={{ fontSize: '0.9rem' }}>{ft.test_id}</strong>
                          </div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}><strong>Input Data:</strong> <code>{ft.input_data}</code></div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}><strong>Expected Output:</strong> <code style={{ color: 'var(--accent-emerald)' }}>{ft.expected_output}</code></div>
                          <div style={{ fontSize: '0.85rem', marginBottom: 4 }}><strong>Actual Output:</strong> <code style={{ color: 'var(--accent-rose)' }}>{ft.actual_output}</code></div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--accent-amber)', marginTop: 4 }}>Reason: {ft.reason}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ background: '#090d16', padding: 16, borderRadius: 10, color: 'var(--accent-emerald)', fontSize: '0.9rem', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      🎉 <strong>All Test Cases Passed!</strong> Your solution successfully satisfied all correctness constraints.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'mentor' && (
                <div>
                  <div style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '4px solid var(--accent-blue)', padding: 16, borderRadius: '0 8px 8px 0', marginBottom: 20 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4 }}>Growth Mindset Guidance</h3>
                    <p style={{ fontSize: '0.9rem' }}>{mentorOutput?.summary || 'No encouragement generated.'}</p>
                  </div>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Guiding Socratic Hints:</h4>
                  {mentorDetails.hints && mentorDetails.hints.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {mentorDetails.hints.map((hint, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span className="tag tag-amber">{hint.topic}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Review: {hint.concept_to_review}</span>
                          </div>
                          <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>"{hint.socratic_question}"</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>🎉 Excellent code! No failed test hints generated.</p>
                  )}

                  {mentorDetails.suggested_reading && mentorDetails.suggested_reading.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, color: 'var(--accent-purple)' }}>Recommended Topics to Review:</h4>
                      <ul style={{ paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {mentorDetails.suggested_reading.map((topic, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'optimization' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: '#090d16', padding: 12, borderRadius: 8, flex: 1, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time Complexity</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {optDetails.estimated_time_complexity || 'O(n)'}
                      </div>
                    </div>
                    <div style={{ background: '#090d16', padding: 12, borderRadius: 8, flex: 1, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Space Complexity</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {optDetails.estimated_space_complexity || 'O(1)'}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>{optOutput?.summary}</p>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Performance Recommendations:</h4>
                  <ul style={{ paddingLeft: 20, fontSize: '0.9rem' }}>
                    {optOutput?.recommendations?.map((rec, i) => (
                      <li key={i} style={{ marginBottom: 8 }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'viva' && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                    {vivaDetails.guidance_for_faculty || 'Select questions for oral defense.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {vivaDetails.selected_questions && vivaDetails.selected_questions.length > 0 ? (
                      vivaDetails.selected_questions.map((q, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                          <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-amber)', marginBottom: 6 }}>
                            Q{idx + 1}: {q.prompt}
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Why Selected: {q.personalization_reason}
                          </p>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {q.expected_concepts?.map((c, ci) => (
                              <span key={ci} className="tag tag-blue" style={{ fontSize: '0.75rem' }}>{c}</span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      vivaOutput?.recommendations?.map((r, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 14, borderRadius: 8, fontSize: '0.9rem' }}>
                          🗣️ {r}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'integrity' && (
                <div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ background: '#090d16', padding: 14, borderRadius: 8, flex: 1, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AST Structural Risk Level</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 4 }}>
                        <span className={`tag ${integrityDetails.risk_level === 'high' ? 'tag-rose' : integrityDetails.risk_level === 'moderate' ? 'tag-amber' : 'tag-emerald'}`}>
                          🛡️ {(integrityDetails.risk_level || 'low').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div style={{ background: '#090d16', padding: 14, borderRadius: 8, flex: 1, border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Max Structural Similarity</span>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-purple)', marginTop: 4 }}>
                        {integrityDetails.max_similarity_score !== undefined ? `${integrityDetails.max_similarity_score}%` : '0.0%'}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.1)', borderLeft: '4px solid var(--accent-purple)', padding: 14, borderRadius: '0 8px 8px 0', marginBottom: 16 }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-purple)', marginBottom: 4 }}>Academic Integrity Summary</h4>
                    <p style={{ fontSize: '0.85rem' }}>{integrityOutput?.summary || 'Code evaluated cleanly against historical submissions.'}</p>
                  </div>

                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 10 }}>Authorship Recommendations:</h4>
                  <ul style={{ paddingLeft: 20, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {integrityOutput?.recommendations?.map((rec, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'assessment' && (
                <div>
                  <p style={{ fontSize: '0.9rem', marginBottom: 16 }}>
                    <strong>Recommendation Band:</strong> <span className={`tag tag-${assessmentDetails.overall_recommendation === 'excellent' ? 'emerald' : 'amber'}`}>{assessmentDetails.overall_recommendation}</span>
                  </p>
                  <div style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>Assessment Summary:</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{assessmentDetails.justification_text || assessmentOutput?.summary}</p>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* 🏫 MODULE 2: FACULTY INTELLIGENCE MODULE */}
      {userRole === 'faculty' && (
        <div>
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Assignments</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{analytics.assignments_total}</div>
              </div>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Approved Questions</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{analytics.approved_assignments}</div>
              </div>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student Submissions</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{analytics.submissions_total}</div>
              </div>
              <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pending Evaluation</span>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f59e0b' }}>{analytics.pending_submissions}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 28 }}>
            <section className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>1. Create Assignment Draft</h2>

              <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Question Title</label>
                  <input
                    style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px', width: '100%' }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Find Two Sum Indices"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Target Language</label>
                  <select
                    style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px', width: '100%' }}
                    value={facLanguage}
                    onChange={(e) => setFacLanguage(e.target.value)}
                  >
                    <option value="python">Python 3</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Description & Constraints</label>
                  <textarea
                    style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px', width: '100%' }}
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Given an array of integers and a target sum, return indices of two numbers..."
                  />
                </div>

                <button className="btn-primary" type="submit" disabled={facLoading}>
                  {facLoading ? 'Generating AI Drafts...' : 'Create Draft & Generate AI Test/Viva Bank'}
                </button>
              </form>
            </section>

            <section className="glass-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>2. AI Draft Review & Approval</h2>

              {facMsg && (
                <div style={{ padding: 12, borderRadius: 8, background: '#090d16', border: '1px solid var(--border-color)', marginBottom: 16, fontSize: '0.9rem' }}>
                  {facMsg}
                </div>
              )}

              {currentQuestion ? (
                <div>
                  <div style={{ background: '#090d16', padding: 16, borderRadius: 12, marginBottom: 16, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currentQuestion.title}</h3>
                      <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: 20, background: currentQuestion.is_approved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: currentQuestion.is_approved ? 'var(--accent-emerald)' : '#f59e0b' }}>
                        {currentQuestion.is_approved ? 'APPROVED' : 'DRAFT'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {currentQuestion.id} | Language: {currentQuestion.language}</p>
                    <p style={{ fontSize: '0.9rem', marginTop: 8 }}>{currentQuestion.description}</p>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8, color: 'var(--accent-blue)' }}>
                      Draft Test Cases (Generated by TestCase Agent):
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentQuestion.draft_tests?.map((t, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 12, borderRadius: 8, fontSize: '0.85rem' }}>
                          <div><strong>Input:</strong> {t.input}</div>
                          <div><strong>Expected Output:</strong> {t.expected_output}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 8, color: 'var(--accent-purple)' }}>
                      Draft Viva Question Bank (Generated by Viva Question Agent):
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {currentQuestion.draft_viva?.map((v, idx) => (
                        <div key={idx} style={{ background: '#090d16', padding: 12, borderRadius: 8, fontSize: '0.85rem' }}>
                          <div><strong>Q{idx + 1}:</strong> {v.prompt}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                            Concepts: {v.expected_concepts?.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!currentQuestion.is_approved && (
                    <button className="btn-primary" onClick={handleApprove} disabled={facLoading} style={{ width: '100%' }}>
                      {facLoading ? 'Approving...' : 'Approve Question for Student Submissions ✅'}
                    </button>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Create an assignment draft on the left to inspect AI-generated test cases and viva question banks.
                </p>
              )}
            </section>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: FACULTY INTELLIGENCE & CLASS MISCONCEPTION ANALYTICS & INTEGRITY */}
          {/* ========================================================================= */}
          <section className="glass-card" style={{ padding: 24, marginTop: 28, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                📊 3. Class-Wide Misconception Analytics & Academic Integrity Reports
              </h2>
              {questionsList.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target Assignment:</label>
                  <select
                    value={assignmentId}
                    onChange={(e) => {
                      setAssignmentId(e.target.value)
                      fetchIntelligence(parseInt(e.target.value, 10))
                    }}
                    style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 10px', fontSize: '0.85rem' }}
                  >
                    {questionsList.map(q => (
                      <option key={q.id} value={q.id}>#{q.id} - {q.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {facultyIntelligence ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Class Avg Correctness</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-emerald)', marginTop: 4 }}>
                      {facultyIntelligence.class_averages?.correctness || 0}%
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Class Avg Quality</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: 4 }}>
                      {facultyIntelligence.class_averages?.standards || 0}%
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Submissions</span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-purple)', marginTop: 4 }}>
                      {facultyIntelligence.total_submissions || 0}
                    </div>
                  </div>
                  <div style={{ background: '#090d16', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Top Grade Band</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
                      {Object.keys(facultyIntelligence.grade_distribution || {}).length > 0
                        ? Object.keys(facultyIntelligence.grade_distribution || {}).reduce((a, b) => ((facultyIntelligence.grade_distribution[a] || 0) > (facultyIntelligence.grade_distribution[b] || 0) ? a : b), 'good').toUpperCase()
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
                  <div style={{ background: '#090d16', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)', minWidth: 0 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: 12 }}>
                      ⚠️ Top Class Misconceptions & Error Clusters
                    </h3>
                    {facultyIntelligence.top_misconceptions && facultyIntelligence.top_misconceptions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {facultyIntelligence.top_misconceptions.map((item, idx) => (
                          <div key={idx} style={{ background: 'rgba(244, 63, 94, 0.08)', padding: 12, borderRadius: 8, border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.misconception}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Affected: {item.affected_students_count} student(s)</div>
                            </div>
                            <span className="tag tag-rose" style={{ fontSize: '0.8rem' }}>{item.percentage_of_class}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No common misconceptions flagged yet for Assignment #{assignmentId}.</p>
                    )}
                  </div>

                  <div style={{ background: '#090d16', padding: 18, borderRadius: 12, border: '1px solid var(--border-color)', minWidth: 0 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 12 }}>
                      📈 Grade Performance Distribution
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(facultyIntelligence.grade_distribution || {}).map(([band, count], idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ width: 130, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{band.toUpperCase()}</span>
                          <div style={{ flex: 1, background: '#1e293b', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${(count / Math.max(1, facultyIntelligence.total_submissions)) * 100}%`, height: '100%', background: band === 'excellent' ? 'var(--accent-emerald)' : band === 'good' ? 'var(--accent-blue)' : band === 'fair' ? '#f59e0b' : 'var(--accent-rose)' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 12 }}>
                  📋 Consolidated Submissions & Academic Integrity Risk Report Table
                </h3>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left', minWidth: 640 }}>
                    <thead>
                      <tr style={{ background: '#090d16', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '10px 12px' }}>Sub ID</th>
                        <th style={{ padding: '10px 12px' }}>Student ID</th>
                        <th style={{ padding: '10px 12px' }}>Correctness</th>
                        <th style={{ padding: '10px 12px' }}>Integrity Risk</th>
                        <th style={{ padding: '10px 12px' }}>AI Grade Rec</th>
                        <th style={{ padding: '10px 12px' }}>Final Grade</th>
                        <th style={{ padding: '10px 12px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyIntelligence.consolidated_submissions && facultyIntelligence.consolidated_submissions.length > 0 ? (
                        facultyIntelligence.consolidated_submissions.map((s) => (
                          <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 12px' }}>#{s.id}</td>
                            <td style={{ padding: '10px 12px' }}>Student #{s.student_id}</td>
                            <td style={{ padding: '10px 12px' }}>{s.correctness_score !== null ? `${s.correctness_score}%` : 'N/A'}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className={`tag ${s.integrity_risk === 'high' ? 'tag-rose' : s.integrity_risk === 'moderate' ? 'tag-amber' : 'tag-emerald'}`}>
                                🛡️ {(s.integrity_risk || 'low').toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="tag tag-blue">{(s.overall_recommendation || 'good').toUpperCase()}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {s.final_grade ? (
                                <span className="tag tag-emerald">✅ {s.final_grade.toUpperCase()} ({s.faculty_score ?? ''})</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Pending Override</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <button
                                className="btn-outline"
                                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                onClick={() => setOverrideSubId(s.id)}
                              >
                                ✏️ Override Grade
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No student submissions recorded yet for Assignment #{assignmentId}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {overrideSubId && (
                  <div style={{ marginTop: 20, background: '#090d16', padding: 20, borderRadius: 12, border: '1px solid var(--accent-purple)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 12 }}>
                      ✏️ Instructor Override for Submission #{overrideSubId}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Override Score (0-100)</label>
                        <input
                          type="number"
                          value={overrideScore}
                          onChange={(e) => setOverrideScore(e.target.value)}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 10px', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Final Grade Band</label>
                        <select
                          value={overrideGrade}
                          onChange={(e) => setOverrideGrade(e.target.value)}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 10px', width: '100%' }}
                        >
                          <option value="excellent">Excellent</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="needs_improvement">Needs Improvement</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Instructor Feedback / Notes</label>
                        <input
                          type="text"
                          value={overrideNotes}
                          onChange={(e) => setOverrideNotes(e.target.value)}
                          style={{ background: '#1e293b', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 10px', width: '100%' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button className="btn-outline" style={{ fontSize: '0.8rem' }} onClick={() => setOverrideSubId(null)}>Cancel</button>
                      <button className="btn-primary" style={{ fontSize: '0.8rem' }} onClick={() => handleOverrideSubmit(overrideSubId)}>Save Grade Override ✅</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select or create an assignment to view class misconception analytics and student integrity reports.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
