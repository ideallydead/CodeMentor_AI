import React, { useState, useEffect } from 'react'
import api from './services/api'
import Navbar from './components/Navbar'
import WorkspaceTabs from './components/WorkspaceTabs'
import AssignmentsView from './components/AssignmentsView'
import AnalyticsCards from './components/AnalyticsCards'
import DraftAssignmentForm from './components/DraftAssignmentForm'
import DraftReviewer from './components/DraftReviewer'
import MisconceptionAnalytics from './components/MisconceptionAnalytics'
import SubmissionsTable from './components/SubmissionsTable'
const SubmissionInspectorModal = React.lazy(() => import('./components/SubmissionInspectorModal'))
import ConfirmModal from './components/ConfirmModal'
import Toast from './components/Toast'
import { School, User, Lock, Trash2, Code2, ArrowRight } from 'lucide-react'
import './index.css'

function App() {
  // Navigation & Workspace State
  const [activeView, setActiveView] = useState('assignments') // 'assignments', 'submissions', 'insights'

  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('codementor_theme') || 'dark')

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('faculty@codementor.edu')
  const [password, setPassword] = useState('faculty123')
  const [loginError, setLoginError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Assignment Authoring State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [facLanguage, setFacLanguage] = useState('python')
  const [facLoading, setFacLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionsList, setQuestionsList] = useState([])
  const [assignmentId, setAssignmentId] = useState('')

  // Intelligence & Analytics State
  const [analytics, setAnalytics] = useState(null)
  const [facultyIntelligence, setFacultyIntelligence] = useState(null)

  // Modals & Notifications
  const [inspectSubmission, setInspectSubmission] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('codementor_theme', next)
  }

  // Fetch Analytics & Questions
  const fetchAnalytics = async () => {
    try {
      const data = await api.getAnalytics()
      setAnalytics(data)
    } catch (e) {
      console.error('Failed to fetch analytics', e)
    }
  }

  const fetchQuestions = async (targetAssignmentId = null) => {
    try {
      const data = await api.getQuestions()
      setQuestionsList(data)
      if (data.length > 0) {
        let matched = null
        if (targetAssignmentId != null) {
          matched = data.find(q => String(q.id) === String(targetAssignmentId))
        } else if (assignmentId) {
          matched = data.find(q => String(q.id) === String(assignmentId))
        }
        if (!matched) matched = data[0]

        setAssignmentId(String(matched.id))
        setCurrentQuestion(matched)
        fetchIntelligence(matched.id)
      } else {
        setAssignmentId('')
        setCurrentQuestion(null)
        setFacultyIntelligence(null)
      }
    } catch (e) {
      console.error('Failed to fetch questions', e)
    }
  }

  const fetchIntelligence = async (qId) => {
    try {
      const data = await api.getFacultyIntelligence(qId)
      setFacultyIntelligence(data)
    } catch (e) {
      console.error('Failed to fetch intelligence', e)
    }
  }

  const handleSelectAssignment = (qId) => {
    setAssignmentId(String(qId))
    const found = questionsList.find(q => String(q.id) === String(qId))
    if (found) {
      setCurrentQuestion(found)
    }
    fetchIntelligence(parseInt(qId, 10))
  }

  const handleStartNewAssignment = () => {
    setTitle('')
    setDescription('')
    setCurrentQuestion(null)
  }

  // Dynamic Real-time Sync & Auto-Refresh
  useEffect(() => {
    let channel = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('codementor_sync')
        channel.onmessage = (event) => {
          const { type, assignmentId: evtAssignmentId } = event.data || {}
          if (type === 'SUBMISSION_CREATED' || type === 'ASSIGNMENT_UPDATED' || type === 'DATA_RESET' || type === 'OVERRIDE_SAVED') {
            fetchAnalytics()
            if (assignmentId) {
              fetchIntelligence(parseInt(assignmentId, 10))
            } else if (evtAssignmentId) {
              fetchIntelligence(parseInt(evtAssignmentId, 10))
            }
          }
        }
      }
    } catch (e) {
      console.warn('BroadcastChannel error', e)
    }

    return () => {
      if (channel) channel.close()
    }
  }, [assignmentId])

  useEffect(() => {
    if (!isAuthenticated) return

    const refreshData = () => {
      fetchAnalytics()
      if (assignmentId) {
        fetchIntelligence(parseInt(assignmentId, 10))
      }
    }

    // Auto-poll interval (4 seconds for real-time analytics updates)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      refreshData()
    }, 4000)

    const handleFocus = () => {
      refreshData()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isAuthenticated, assignmentId])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics()
      fetchQuestions()
    }
  }, [isAuthenticated])

  // Create Assignment Flow
  const handleCreateQuestion = async (e) => {
    e.preventDefault()
    setFacLoading(true)
    try {
      const data = await api.createQuestion({ title, description, language: facLanguage })
      setAssignmentId(String(data.id))
      setCurrentQuestion(data)
      setTitle('')
      setDescription('')
      addToast('✨ Draft Assignment & AI Test/Viva Bank Created!', 'success')
      await fetchQuestions(data.id)
      await fetchAnalytics()
      fetchIntelligence(data.id)
    } catch (err) {
      addToast(`Error: ${err.message}`, 'error')
    } finally {
      setFacLoading(false)
    }
  }

  // Update Draft Test Cases
  const handleUpdateDraftTests = async (updatedTests) => {
    if (!currentQuestion) return
    setFacLoading(true)
    try {
      const updated = await api.updateQuestion(currentQuestion.id, { draft_tests: updatedTests })
      setCurrentQuestion(updated)
      addToast('✅ Draft test cases updated successfully.', 'success')
      await fetchQuestions(currentQuestion.id)
    } catch (err) {
      addToast(`Update failed: ${err.message}`, 'error')
    } finally {
      setFacLoading(false)
    }
  }

  // Update Draft Viva Questions
  const handleUpdateDraftViva = async (updatedViva) => {
    if (!currentQuestion) return
    setFacLoading(true)
    try {
      const updated = await api.updateQuestion(currentQuestion.id, { draft_viva: updatedViva })
      setCurrentQuestion(updated)
      addToast('✅ Draft viva questions updated successfully.', 'success')
      await fetchQuestions(currentQuestion.id)
    } catch (err) {
      addToast(`Update failed: ${err.message}`, 'error')
    } finally {
      setFacLoading(false)
    }
  }

  // Approve Assignment Flow
  const handleApprove = async () => {
    if (!currentQuestion) return
    setFacLoading(true)
    try {
      const updated = await api.approveQuestion(currentQuestion.id)
      setCurrentQuestion(updated)
      addToast('✅ Assignment Approved! Students can now submit solutions.', 'success')
      await fetchQuestions(currentQuestion.id)
      await fetchAnalytics()
    } catch (err) {
      addToast(`Approval failed: ${err.message}`, 'error')
    } finally {
      setFacLoading(false)
    }
  }

  // Delete Assignment Flow with Glassmorphic Confirmation Modal
  const handleDeleteQuestion = (qId) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Assignment #${qId}?`,
      message: `Are you sure you want to permanently delete assignment #${qId} and all associated student submissions, evaluation reports, and test cases? This action cannot be undone.`,
      confirmText: 'Delete Assignment',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false })
        setFacLoading(true)
        try {
          await api.deleteQuestion(qId)
          addToast(`🗑️ Assignment #${qId} deleted successfully.`, 'info')
          const remaining = questionsList.filter(q => q.id !== qId)
          setQuestionsList(remaining)
          if (remaining.length > 0) {
            setAssignmentId(String(remaining[0].id))
            setCurrentQuestion(remaining[0])
            fetchIntelligence(remaining[0].id)
          } else {
            setAssignmentId('')
            setCurrentQuestion(null)
            setFacultyIntelligence(null)
          }
          await fetchAnalytics()
        } catch (err) {
          addToast(`Delete failed: ${err.message}`, 'error')
        } finally {
          setFacLoading(false)
        }
      }
    })
  }

  // Delete Submission Flow
  const handleDeleteSubmission = (subId) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Submission #${subId}?`,
      message: `Delete student submission #${subId} and its associated multi-agent evaluation report?`,
      confirmText: 'Delete Submission',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false })
        setFacLoading(true)
        try {
          await api.deleteSubmission(subId)
          addToast(`🗑️ Submission #${subId} deleted successfully.`, 'info')
          if (assignmentId) fetchIntelligence(parseInt(assignmentId, 10))
          await fetchAnalytics()
        } catch (err) {
          addToast(`Delete failed: ${err.message}`, 'error')
        } finally {
          setFacLoading(false)
        }
      }
    })
  }

  // Reset All Data Flow
  const handleResetAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset ALL System Data?',
      message: '⚠️ Are you sure you want to wipe ALL assignments, student submissions, test cases, and evaluation reports across the entire platform? This action cannot be undone.',
      confirmText: 'Reset Everything',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false })
        setFacLoading(true)
        try {
          await api.resetAllData()
          addToast('🧹 All data permanently wiped and reset to initial clean state!', 'success')
          setCurrentQuestion(null)
          setFacultyIntelligence(null)
          setQuestionsList([])
          setAssignmentId('')
          setAnalytics({
            assignments_total: 0,
            approved_assignments: 0,
            submissions_total: 0,
            pending_submissions: 0
          })
          await fetchAnalytics()
          await fetchQuestions()
        } catch (err) {
          addToast(`Reset failed: ${err.message}`, 'error')
        } finally {
          setFacLoading(false)
        }
      }
    })
  }

  // Save Grade Override
  const handleSaveOverride = async (subId, payload) => {
    try {
      await api.overrideSubmission(subId, payload)
      addToast('✅ Grade override and feedback saved successfully!', 'success')
      setInspectSubmission(null)
      if (assignmentId) fetchIntelligence(parseInt(assignmentId, 10))
    } catch (err) {
      addToast(`Failed to save override: ${err.message}`, 'error')
    }
  }

  // Authentication Flow
  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoginError(null)

    if (!username || !password) {
      setLoginError('Please enter faculty credentials')
      return
    }

    setCurrentUser({
      username,
      name: 'Prof. Alan Turing',
      role: 'faculty',
      id: 'FAC_001'
    })
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
  }

  // =========================================================================
  // VIEW 1: AUTHENTICATION SCREEN
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div data-theme={theme} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-app)' }}>
        <div className="glass-card login-card" style={{ maxWidth: 460, width: '100%', padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(192, 132, 252, 0.2), rgba(56, 189, 248, 0.2))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              border: '1px solid rgba(192, 132, 252, 0.3)'
            }}>
              <School size={28} color="var(--accent-purple)" />
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
              CodeMentor <span className="gradient-text">AI</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Faculty Intelligence & Assignment Management Portal
            </p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label>Faculty Email / Institutional ID</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="faculty@codementor.edu"
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

            {loginError && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: 16, background: 'rgba(244, 63, 94, 0.1)', padding: 10, borderRadius: 8 }}>
                ⚠️ {loginError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              Sign In to Faculty Dashboard →
            </button>
          </form>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED FACULTY DASHBOARD
  // =========================================================================
  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg-app)', transition: 'background-color 0.25s ease' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>
        {/* Navbar */}
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onResetData={handleResetAllData}
          isLoading={facLoading}
        />

        {/* Analytics Metric Cards */}
        <AnalyticsCards analytics={analytics} />

        {/* Workspace Segmented Navigation */}
        <WorkspaceTabs
          activeView={activeView}
          onChangeView={setActiveView}
          assignmentsCount={questionsList.length}
          pendingCount={analytics?.pending_submissions || 0}
        />

        {/* VIEW 1: ASSIGNMENTS & CURRICULUM */}
        {activeView === 'assignments' && (
          <AssignmentsView
            questionsList={questionsList}
            currentQuestion={currentQuestion}
            onSelectAssignment={handleSelectAssignment}
            onCreateQuestion={handleCreateQuestion}
            onUpdateDraftTests={handleUpdateDraftTests}
            onUpdateDraftViva={handleUpdateDraftViva}
            onStartNewAssignment={handleStartNewAssignment}
            onApprove={handleApprove}
            onDelete={handleDeleteQuestion}
            onNavigateToSubmissions={(qId) => {
              handleSelectAssignment(qId)
              setActiveView('submissions')
            }}
            onNavigateToInsights={(qId) => {
              handleSelectAssignment(qId)
              setActiveView('insights')
            }}
            title={title}
            setTitle={setTitle}
            facLanguage={facLanguage}
            setFacLanguage={setFacLanguage}
            description={description}
            setDescription={setDescription}
            isLoading={facLoading}
          />
        )}

        {/* VIEW 2: SUBMISSIONS & GRADING */}
        {activeView === 'submissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Active Evaluation Queue
                </span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {currentQuestion ? currentQuestion.title : 'All Submissions'}
                </h2>
              </div>

              {questionsList.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target Assignment:</label>
                  <select
                    value={assignmentId}
                    onChange={(e) => handleSelectAssignment(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.84rem' }}
                  >
                    {questionsList.map(q => (
                      <option key={q.id} value={q.id}>#{q.id} - {q.title}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn-outline"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    onClick={() => setActiveView('insights')}
                  >
                    <span>View Class Insights</span>
                    <ArrowRight size={13} />
                  </button>

                  {assignmentId && (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ fontSize: '0.8rem', padding: '6px 12px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                      onClick={() => handleDeleteQuestion(parseInt(assignmentId, 10))}
                      title="Delete this assignment"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <section className="glass-card" style={{ padding: 24 }}>
              <SubmissionsTable
                submissions={facultyIntelligence?.consolidated_submissions || []}
                assignmentId={assignmentId}
                assignmentTitle={currentQuestion?.title}
                onInspectSubmission={(s) => setInspectSubmission(s)}
                onDeleteSubmission={handleDeleteSubmission}
              />
            </section>
          </div>
        )}

        {/* VIEW 3: CLASS INSIGHTS & ANALYTICS */}
        {activeView === 'insights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                  Learning Diagnostics
                </span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  Class Misconception & Performance Analytics
                </h2>
              </div>

              {questionsList.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Target Assignment:</label>
                  <select
                    value={assignmentId}
                    onChange={(e) => handleSelectAssignment(e.target.value)}
                    className="form-input"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.84rem' }}
                  >
                    {questionsList.map(q => (
                      <option key={q.id} value={q.id}>#{q.id} - {q.title}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="btn-outline"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    onClick={() => setActiveView('submissions')}
                  >
                    <span>Grade Submissions</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>

            <section className="glass-card" style={{ padding: 24 }}>
              <MisconceptionAnalytics
                facultyIntelligence={facultyIntelligence}
                assignmentId={assignmentId}
              />
            </section>
          </div>
        )}

        {/* Submission Inspector Modal (Lazy loaded on demand to prevent loading Monaco on initial render) */}
        {inspectSubmission && (
          <React.Suspense fallback={null}>
            <SubmissionInspectorModal
              submission={inspectSubmission}
              isOpen={!!inspectSubmission}
              onClose={() => setInspectSubmission(null)}
              onSaveOverride={handleSaveOverride}
              theme={theme === 'light' ? 'light' : 'vs-dark'}
            />
          </React.Suspense>
        )}

        {/* Reusable Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />

        {/* Floating Toast Alerts */}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  )
}

export default App
