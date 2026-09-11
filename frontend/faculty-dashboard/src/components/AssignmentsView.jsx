import React, { useState } from 'react'
import { Plus, Search, Filter, BookOpen, CheckCircle2, Clock, Trash2, ArrowRight, Code2, Edit3, Sparkles } from 'lucide-react'
import DraftAssignmentForm from './DraftAssignmentForm'
import DraftReviewer from './DraftReviewer'

export default function AssignmentsView({
  questionsList = [],
  currentQuestion,
  onSelectAssignment,
  onCreateQuestion,
  onUpdateDraftTests,
  onApprove,
  onDelete,
  onNavigateToSubmissions,
  onNavigateToInsights,
  title,
  setTitle,
  facLanguage,
  setFacLanguage,
  description,
  setDescription,
  isLoading
}) {
  const [isAuthoringOpen, setIsAuthoringOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all') // 'all', 'approved', 'draft'
  const [searchQuery, setSearchQuery] = useState('')

  const filteredQuestions = questionsList.filter(q => {
    if (filterStatus === 'approved' && !q.is_approved) return false
    if (filterStatus === 'draft' && q.is_approved) return false
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase().trim()
      const matchTitle = (q.title || '').toLowerCase().includes(qLower)
      const matchDesc = (q.description || '').toLowerCase().includes(qLower)
      const matchId = String(q.id).includes(qLower)
      if (!matchTitle && !matchDesc && !matchId) return false
    }
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
            Curriculum & Coding Assignments
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Author, inspect AI test suites, and publish laboratory assignments for student assessment.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => setIsAuthoringOpen(!isAuthoringOpen)}
        >
          {isAuthoringOpen ? (
            <span>Close Authoring Studio</span>
          ) : (
            <>
              <Plus size={16} />
              <span>Author New Assignment</span>
            </>
          )}
        </button>
      </div>

      {/* Authoring Drawer / Split View when active */}
      {isAuthoringOpen && (
        <div className="glass-card" style={{ padding: 24, border: '1px solid var(--border-active)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="var(--accent-blue)" />
                Formulate Problem Prompt
              </h3>
              <DraftAssignmentForm
                title={title}
                setTitle={setTitle}
                facLanguage={facLanguage}
                setFacLanguage={setFacLanguage}
                description={description}
                setDescription={setDescription}
                onSubmit={async (e) => {
                  await onCreateQuestion(e)
                }}
                isLoading={isLoading}
              />
            </div>

            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} color="var(--accent-purple)" />
                AI Test Suite & Viva Bank Review
              </h3>
              <DraftReviewer
                currentQuestion={currentQuestion}
                onApprove={async () => {
                  await onApprove()
                  setIsAuthoringOpen(false)
                }}
                onDelete={onDelete}
                onUpdateDraftTests={onUpdateDraftTests}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            style={{ padding: '6px 12px', fontSize: '0.86rem' }}
            placeholder="Search assignments by title, description, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status:</span>
          <button
            type="button"
            className={`btn-outline ${filterStatus === 'all' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              background: filterStatus === 'all' ? 'var(--bg-elevated)' : 'transparent',
              color: filterStatus === 'all' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
            onClick={() => setFilterStatus('all')}
          >
            All ({questionsList.length})
          </button>
          <button
            type="button"
            className={`btn-outline ${filterStatus === 'approved' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              background: filterStatus === 'approved' ? 'var(--bg-elevated)' : 'transparent',
              color: filterStatus === 'approved' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
            onClick={() => setFilterStatus('approved')}
          >
            Approved ({questionsList.filter(q => q.is_approved).length})
          </button>
          <button
            type="button"
            className={`btn-outline ${filterStatus === 'draft' ? 'active' : ''}`}
            style={{
              padding: '5px 12px',
              fontSize: '0.8rem',
              background: filterStatus === 'draft' ? 'var(--bg-elevated)' : 'transparent',
              color: filterStatus === 'draft' ? 'var(--text-main)' : 'var(--text-muted)'
            }}
            onClick={() => setFilterStatus('draft')}
          >
            Drafts ({questionsList.filter(q => !q.is_approved).length})
          </button>
        </div>
      </div>

      {/* Assignment Cards Grid */}
      {filteredQuestions.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
            color: 'var(--text-muted)'
          }}>
            <BookOpen size={22} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>
            No Assignments Found
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 18px' }}>
            {questionsList.length === 0
              ? 'Get started by creating your first laboratory assignment. CodeMentor AI will generate test cases and viva banks automatically.'
              : 'No assignments match your active search or status filter.'}
          </p>
          {questionsList.length === 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAuthoringOpen(true)}
            >
              <Plus size={16} />
              <span>Create First Assignment</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {filteredQuestions.map(q => {
            const rawTests = q.draft_tests || q.test_cases || []
            const vivaCount = q.draft_viva?.length || 0

            return (
              <div
                key={q.id}
                className="glass-card"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        #{q.id}
                      </span>
                      <span className="tag tag-blue" style={{ fontSize: '0.7rem' }}>
                        <Code2 size={11} /> {(q.language || 'python').toUpperCase()}
                      </span>
                    </div>

                    <span className={`tag ${q.is_approved ? 'tag-emerald' : 'tag-amber'}`} style={{ fontSize: '0.72rem' }}>
                      {q.is_approved ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                    {q.title}
                  </h3>

                  <p style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    marginBottom: 16,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {q.description}
                  </p>

                  <div style={{ display: 'flex', gap: 14, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 18 }}>
                    <span>🧪 {rawTests.length} Test Cases</span>
                    <span>🎤 {vivaCount} Viva Questions</span>
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                      onClick={() => onNavigateToSubmissions(q.id)}
                    >
                      <span>Submissions</span>
                      <ArrowRight size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn-outline"
                      style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                      onClick={() => onNavigateToInsights(q.id)}
                    >
                      <span>Insights</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-outline"
                    style={{ fontSize: '0.8rem', padding: '5px 8px', color: 'var(--accent-rose)', borderColor: 'transparent' }}
                    onClick={() => onDelete(q.id)}
                    title="Delete Assignment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
