import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import {
  Play,
  Send,
  RotateCcw,
  Sparkles,
  Terminal,
  Shield,
  Brain,
  Zap,
  FileCheck,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  Mic,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

import api from './services/api'
import Navbar from './components/Navbar'
import ProblemStatement from './components/ProblemStatement'
import TerminalDrawer from './components/TerminalDrawer'
import PipelineProgressBar from './components/PipelineProgressBar'
import VivaSimulator from './components/VivaSimulator'
import OptimizationView from './components/OptimizationView'
import AssessmentFeedbackView from './components/AssessmentFeedbackView'
import ConfirmModal from './components/ConfirmModal'
import Toast from './components/Toast'
import './index.css'

const STARTER_TEMPLATES = {
  python: `# Write your solution below

def solution():
    # Implement your logic here
    pass

if __name__ == '__main__':
    # Read input from standard input (STDIN) if required
    pass
`,
  java: `import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Implement your solution below
        
    }
}
`,
  c: `#include <stdio.h>

int main() {
    // Implement your solution below
    
    return 0;
}
`
}

function App() {
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('codementor_theme') || 'dark')

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState('student101@codementor.edu')
  const [password, setPassword] = useState('student123')
  const [studentId, setStudentId] = useState('101')
  const [loginError, setLoginError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  // Workspace & Question State
  const [questionsList, setQuestionsList] = useState([])
  const [assignmentId, setAssignmentId] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [language, setLanguage] = useState('python')
  const [sourceCode, setSourceCode] = useState(STARTER_TEMPLATES.python)

  // Monaco Settings
  const [fontSize, setFontSize] = useState(14)
  const [showMinimap, setShowMinimap] = useState(true)

  // Execution & Pipeline State
  const [isRunningSandbox, setIsRunningSandbox] = useState(false)
  const [sandboxResults, setSandboxResults] = useState(null)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [activeLeftTab, setActiveLeftTab] = useState('problem') // 'problem', 'viva', 'report'
  const [vivaAnswers, setVivaAnswers] = useState({})
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null)

  // Keyboard shortcut: Ctrl+Enter (or Cmd+Enter) to run sandbox tests
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isRunningSandbox && !submitting) {
          handleRunSandbox()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunningSandbox, submitting, assignmentId, sourceCode, language])

  // Feedback Notifications
  const [toasts, setToasts] = useState([])
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })

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

  // Resolve code: check student-scoped local draft first; then check student's latest submission on server; then starter template
  const resolveStudentCode = async (qId, targetLang, defaultTemplate, explicitStudentId) => {
    const activeStudentId = explicitStudentId || currentUser?.id || studentId || '101'
    const savedDraft = localStorage.getItem(`codementor_code_${activeStudentId}_${qId}_${targetLang}`)
    if (savedDraft) {
      return savedDraft
    }
    try {
      const latest = await api.getLatestStudentSubmission(qId, activeStudentId)
      if (latest && latest.source_code) {
        return latest.source_code
      }
    } catch (err) {
      console.warn('Could not fetch prior student submission:', err)
    }
    return defaultTemplate || STARTER_TEMPLATES[targetLang] || STARTER_TEMPLATES.python
  }

  // Load questions when authenticated
  const loadQuestions = async (explicitStudentId) => {
    try {
      const data = await api.getQuestions()
      const list = data || []
      setQuestionsList(list)
      if (list.length > 0) {
        const current = (assignmentId && list.find(q => String(q.id) === String(assignmentId))) || list[0]
        setAssignmentId(String(current.id))
        setSelectedQuestion(current)
        const targetLang = current.language || 'python'
        setLanguage(targetLang)
        const code = await resolveStudentCode(current.id, targetLang, current.starter_code, explicitStudentId)
        setSourceCode(code)
      } else {
        setAssignmentId('')
        setSelectedQuestion(null)
        setSourceCode(STARTER_TEMPLATES[language] || '')
      }
    } catch (err) {
      console.error('Failed to load questions:', err)
      addToast(err.message, 'error')
    }
  }

  useEffect(() => {
    if (isAuthenticated && currentUser?.id) {
      loadQuestions(currentUser.id)
    }
  }, [isAuthenticated, currentUser?.id])

  // Local storage auto-save scoped strictly by student ID
  useEffect(() => {
    const activeStudentId = currentUser?.id || studentId
    if (isAuthenticated && assignmentId && sourceCode && activeStudentId) {
      localStorage.setItem(`codementor_code_${activeStudentId}_${assignmentId}_${language}`, sourceCode)
    }
  }, [assignmentId, language, sourceCode, currentUser?.id, studentId, isAuthenticated])

  // Handle Question Selection
  const handleSelectQuestion = async (qId) => {
    if (!qId) return
    setAssignmentId(String(qId))
    setSandboxResults(null)
    setReportData(null)
    const activeStudentId = currentUser?.id || studentId || '101'
    const found = questionsList.find(q => String(q.id) === String(qId))
    if (found) {
      setSelectedQuestion(found)
      const targetLang = found.language || 'python'
      setLanguage(targetLang)
      const code = await resolveStudentCode(qId, targetLang, found.starter_code, activeStudentId)
      setSourceCode(code)
    } else {
      try {
        const data = await api.getQuestion(qId)
        setSelectedQuestion(data)
        const targetLang = data.language || 'python'
        setLanguage(targetLang)
        const code = await resolveStudentCode(qId, targetLang, data.starter_code, activeStudentId)
        setSourceCode(code)
      } catch (e) {
        setSelectedQuestion(null)
      }
    }
  }

  const handleLanguageChange = async (lang) => {
    setLanguage(lang)
    const activeStudentId = currentUser?.id || studentId || '101'
    const defaultTemplate = (selectedQuestion?.language === lang ? selectedQuestion.starter_code : null) || STARTER_TEMPLATES[lang] || ''
    if (assignmentId) {
      const code = await resolveStudentCode(assignmentId, lang, defaultTemplate, activeStudentId)
      setSourceCode(code)
    } else {
      setSourceCode(defaultTemplate)
    }
  }

  const handleResetCode = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Code Template?',
      message: 'This will replace your current code with the default starter template. Any unsaved edits will be discarded.',
      confirmText: 'Reset to Template',
      isDanger: true,
      onConfirm: () => {
        const defaultCode = (selectedQuestion?.language === language ? selectedQuestion.starter_code : null) || STARTER_TEMPLATES[language] || ''
        setSourceCode(defaultCode)
        const activeStudentId = currentUser?.id || studentId || '101'
        if (assignmentId && activeStudentId) {
          localStorage.removeItem(`codementor_code_${activeStudentId}_${assignmentId}_${language}`)
        }
        setConfirmModal({ isOpen: false })
        addToast('Code reset to default starter template.', 'info')
      }
    })
  }

  // Fast Run Sandbox (< 1.5s)
  const handleRunSandbox = async () => {
    if (!assignmentId) {
      addToast('Please select an active assignment first.', 'warning')
      return
    }
    setIsRunningSandbox(true)
    setIsTerminalOpen(true)
    try {
      const res = await api.runCodeSandbox({
        assignment_id: parseInt(assignmentId, 10),
        source_code: sourceCode,
        language
      })
      setSandboxResults(res)
      if (res.status === 'compile_error') {
        addToast('Compilation error detected in sandbox.', 'error')
      } else if (res.passed_tests === res.total_tests) {
        addToast(`🎉 Passed all ${res.total_tests} sample test cases!`, 'success')
      } else {
        addToast(`Passed ${res.passed_tests}/${res.total_tests} sample tests. Click test cases below for failure details.`, 'warning')
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setIsRunningSandbox(false)
    }
  }

  // Full Multi-Agent Evaluation Submission
  const handleStudentSubmit = async () => {
    if (!assignmentId) {
      addToast('Please select an active assignment before submitting.', 'warning')
      return
    }
    setSubmitting(true)
    setReportData(null)
    try {
      const vivaList = selectedQuestion?.draft_viva || []
      const viva_answers_payload = vivaList.map((vq, idx) => ({
        question_id: String(vq.id || `q_${idx + 1}`),
        prompt: vq.prompt,
        expected_concepts: vq.expected_concepts || [],
        sample_answer: vq.sample_answer || '',
        student_answer: vivaAnswers[idx] || ''
      }))

      const submission = await api.submitCode({
        assignment_id: parseInt(assignmentId, 10),
        student_id: parseInt(studentId, 10),
        source_code: sourceCode,
        language,
        viva_answers: viva_answers_payload
      })

      setCurrentSubmissionId(submission.id)
      const status = await api.getSubmissionStatus(submission.id)
      setReportData(status.details || {})
      addToast('✨ Multi-Agent Evaluation Complete!', 'success')

      // Broadcast new submission event to Faculty Dashboard for real-time live sync
      try {
        const syncChannel = new BroadcastChannel('codementor_sync')
        syncChannel.postMessage({
          type: 'SUBMISSION_CREATED',
          assignmentId: parseInt(assignmentId, 10),
          studentId: parseInt(studentId, 10),
          submissionId: submission.id,
          timestamp: Date.now()
        })
        syncChannel.close()
      } catch (bcErr) {
        console.warn('BroadcastChannel error:', bcErr)
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateVivaAnswers = async (updatedList) => {
    if (!currentSubmissionId) return
    try {
      await api.updateVivaAnswers(currentSubmissionId, updatedList)
      addToast('✅ Viva defense answers updated for faculty evaluation!', 'success')
      const newMap = { ...vivaAnswers }
      updatedList.forEach((item, i) => {
        newMap[i] = item.student_answer
      })
      setVivaAnswers(newMap)
      const status = await api.getSubmissionStatus(currentSubmissionId)
      setReportData(status.details || {})

      // Broadcast viva update to Faculty Dashboard
      try {
        const syncChannel = new BroadcastChannel('codementor_sync')
        syncChannel.postMessage({
          type: 'SUBMISSION_UPDATED',
          submissionId: currentSubmissionId,
          timestamp: Date.now()
        })
        syncChannel.close()
      } catch (bcErr) {}
    } catch (err) {
      addToast(`Failed to update viva: ${err.message}`, 'error')
    }
  }

  // Login handler
  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoginError(null)
    if (!username || !password) {
      setLoginError('Please enter institutional credentials')
      return
    }

    const sid = studentId ? String(studentId).trim() : '101'
    setCurrentUser({
      username,
      name: `Student #${sid}`,
      role: 'student',
      id: sid
    })
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentUser(null)
    setReportData(null)
    setSandboxResults(null)
    setSourceCode(STARTER_TEMPLATES.python)
    setAssignmentId('')
    setSelectedQuestion(null)
    setVivaAnswers({})
    setCurrentSubmissionId(null)
  }

  // Agent Output Extraction
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
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(192, 132, 252, 0.2))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <Code2 size={28} color="var(--accent-blue)" />
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em' }}>
              CodeMentor <span className="gradient-text">AI</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Student Socratic Assessment & Programming Portal
            </p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="input-group">
              <label>Student Email / Institutional ID</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="student101@codementor.edu"
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

            {loginError && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '0.85rem', marginBottom: 16, background: 'rgba(244, 63, 94, 0.1)', padding: 10, borderRadius: 8 }}>
                ⚠️ {loginError}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              Sign In to Student Portal →
            </button>
          </form>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED WORKSPACE
  // =========================================================================
  return (
    <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg-app)', transition: 'background-color 0.25s ease' }}>
      <div style={{ maxWidth: 1340, margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>
        {/* Navigation Bar */}
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* Multi-Agent Pipeline Progress Indicator (during submission) */}
        <PipelineProgressBar isSubmitting={submitting} />

        {/* Main Dual-Pane Studio Workspace */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.25fr', gap: 24, width: '100%', alignItems: 'start' }}>
          {/* LEFT COLUMN: Problem Spec, Oral Viva Defense, or Multi-Agent Evaluation Report */}
          <div style={{ minWidth: 0 }}>
            <ProblemStatement
              questionsList={questionsList}
              assignmentId={assignmentId}
              selectedQuestion={selectedQuestion}
              onSelectQuestion={handleSelectQuestion}
              activeTab={activeLeftTab}
              onChangeTab={setActiveLeftTab}
              vivaAnswers={vivaAnswers}
              setVivaAnswers={setVivaAnswers}
              reportData={reportData}
              theme={theme}
              sourceCode={sourceCode}
              language={language}
              currentSubmissionId={currentSubmissionId}
              onUpdateVivaAnswers={handleUpdateVivaAnswers}
            />
          </div>

          {/* RIGHT COLUMN: Code Workspace Studio & Terminal */}
          <section className="glass-card" style={{ padding: 20, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Editor Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code2 size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Implementation Studio
                </h3>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="form-input"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: '0.82rem' }}
                >
                  <option value="python">Python 3</option>
                  <option value="java">Java</option>
                  <option value="c">C</option>
                </select>

                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="form-input"
                  style={{ width: 'auto', padding: '5px 8px', fontSize: '0.82rem' }}
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowMinimap(!showMinimap)}
                  className="btn-outline"
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  {showMinimap ? 'Hide Map' : 'Map'}
                </button>

                <button
                  type="button"
                  onClick={handleResetCode}
                  className="btn-outline"
                  title="Reset to starter code"
                  style={{ fontSize: '0.78rem', padding: '5px 8px' }}
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)', background: '#090d16' }}>
              <Editor
                height="500px"
                language={language === 'c' ? 'c' : language === 'java' ? 'java' : 'python'}
                theme={theme === 'light' ? 'light' : 'vs-dark'}
                value={sourceCode}
                onChange={(val) => setSourceCode(val || '')}
                loading={
                  <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center', background: '#090d16' }}>
                    Initializing Monaco Code Workspace...
                  </div>
                }
                options={{
                  fontSize,
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

            {/* Docked Sandbox Terminal */}
            <TerminalDrawer
              runResults={sandboxResults}
              isRunning={isRunningSandbox}
              isOpen={isTerminalOpen}
              onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
            />

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Ctrl+Enter to run sandbox • Edits auto-saved to session
              </span>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleRunSandbox}
                  disabled={isRunningSandbox || submitting}
                >
                  <Play size={15} />
                  <span>{isRunningSandbox ? 'Running Tests...' : 'Run Sandbox'}</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleStudentSubmit}
                  disabled={submitting || isRunningSandbox}
                >
                  <Sparkles size={15} />
                  <span>{submitting ? 'Evaluating Submission...' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Reusable Confirm Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          isDanger={confirmModal.isDanger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />

        {/* Floating Toast Notification Stack */}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  )
}

export default App
