import React, { useState, useEffect } from 'react'
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState('faculty')
  const [username, setUsername] = useState('faculty@codementor.edu')
  const [password, setPassword] = useState('faculty123')
  const [loginError, setLoginError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const [language, setLanguage] = useState('python')
  const [assignmentId, setAssignmentId] = useState('1')
  const [studentId, setStudentId] = useState('101')
  const [sourceCode, setSourceCode] = useState(SAMPLE_CODE.python)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('mentor')
  const [reportData, setReportData] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facLanguage, setFacLanguage] = useState('python')
  const [facLoading, setFacLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [facMsg, setFacMsg] = useState(null)

  const handleRoleTabChange = (role) => {
    setUserRole(role)
    if (role === 'faculty') {
      setUsername('faculty@codementor.edu')
      setPassword('faculty123')
    } else {
      setUsername('student101@codementor.edu')
      setPassword('student123')
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
    }
  }, [isAuthenticated])

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

  const assessmentDetails = assessmentOutput?.details || {}
  const mentorDetails = mentorOutput?.details || {}
  const optDetails = optOutput?.details || {}
  const vivaDetails = vivaOutput?.details || {}

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="glass-card login-card">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 6 }}>
              CodeMentor <span className="gradient-text">AI</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Sign in to access Faculty & Student Intelligence Portal
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              className={`role-pill ${userRole === 'faculty' ? 'active-faculty' : ''}`}
              onClick={() => handleRoleTabChange('faculty')}
            >
              🏫 Faculty Module
            </button>
            <button
              type="button"
              className={`role-pill ${userRole === 'student' ? 'active-student' : ''}`}
              onClick={() => handleRoleTabChange('student')}
            >
              🎓 Student Portal
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
              Sign In to {userRole === 'faculty' ? 'Faculty Module' : 'Student Portal'} →
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <header className="glass-card" style={{ padding: '16px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            CodeMentor <span className="gradient-text">AI</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {userRole === 'faculty' ? 'Faculty Intelligence & Question Setup Module' : 'Student Socratic Assessment Portal'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#090d16', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>👤 {currentUser?.name}</span>
            <span className={`tag ${currentUser?.role === 'faculty' ? 'tag-emerald' : 'tag-blue'}`} style={{ fontSize: '0.7rem' }}>
              {currentUser?.role?.toUpperCase()}
            </span>
          </div>

          <button
            className="btn-outline"
            onClick={() => setUserRole(userRole === 'faculty' ? 'student' : 'faculty')}
          >
            Switch to {userRole === 'faculty' ? 'Student Portal 🎓' : 'Faculty Module 🏫'}
          </button>

          <button className="btn-outline" onClick={handleLogout} style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
            🔒 Logout
          </button>
        </div>
      </header>

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
        </div>
      )}

      {userRole === 'student' && (
        <div style={{ display: 'grid', gridTemplateColumns: reportData ? '1fr 1.2fr' : '1fr', gap: 28 }}>
          <section className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Code Workspace</h2>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 6 }}>Assignment ID:</label>
                  <input
                    type="number"
                    value={assignmentId}
                    onChange={(e) => setAssignmentId(e.target.value)}
                    style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 8px', width: 60 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  style={{ background: '#090d16', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 6, padding: '6px 12px' }}
                >
                  <option value="python">Python 3</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                </select>

                <button
                  onClick={() => setSourceCode(SAMPLE_CODE[language] || '')}
                  style={{ background: 'transparent', color: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Load Sample Code
                </button>
              </div>
            </div>

            <textarea
              className="code-editor-textarea"
              rows={18}
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder="Type or paste your code here..."
            />

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
            <section className="glass-card" style={{ padding: 24 }}>
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

              <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 20 }}>
                <button
                  onClick={() => setActiveTab('mentor')}
                  className={`tag ${activeTab === 'mentor' ? 'tag-blue' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'mentor' ? undefined : 'transparent', border: activeTab === 'mentor' ? undefined : 'none' }}
                >
                  🧠 Socratic Mentor
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
                  onClick={() => setActiveTab('assessment')}
                  className={`tag ${activeTab === 'assessment' ? 'tag-rose' : ''}`}
                  style={{ cursor: 'pointer', background: activeTab === 'assessment' ? undefined : 'transparent', border: activeTab === 'assessment' ? undefined : 'none' }}
                >
                  📋 Assessment
                </button>
              </div>

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
    </div>
  )
}

export default App
