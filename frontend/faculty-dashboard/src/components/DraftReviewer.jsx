import React, { useState } from 'react'
import { CheckCircle2, Trash2, Plus, Edit2, Save, Eye, EyeOff, BookOpen, Mic } from 'lucide-react'

export default function DraftReviewer({
  currentQuestion,
  onApprove,
  onDelete,
  onUpdateDraftTests,
  isLoading
}) {
  const [editingTests, setEditingTests] = useState(false)
  const [tests, setTests] = useState([])

  // Synchronize draft tests when question changes
  React.useEffect(() => {
    if (currentQuestion) {
      setTests(currentQuestion.draft_tests || [])
      setEditingTests(false)
    }
  }, [currentQuestion])

  if (!currentQuestion) {
    return (
      <section className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-main)' }}>
          Generated Test Suite & Viva Review
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>
          Submit a problem specification on the left to inspect AI-generated sample and hidden test cases, along with the oral viva defense bank.
        </p>
      </section>
    )
  }

  const handleTestChange = (index, field, value) => {
    setTests(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleAddTestCase = () => {
    setTests(prev => [
      ...prev,
      { input: '', expected_output: '', is_hidden: false }
    ])
    setEditingTests(true)
  }

  const handleRemoveTestCase = (index) => {
    setTests(prev => prev.filter((_, i) => i !== index))
  }

  const handleSaveTests = async () => {
    if (onUpdateDraftTests) {
      await onUpdateDraftTests(tests)
    }
    setEditingTests(false)
  }

  return (
    <section className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          Test Suite & Defense Bank
        </h3>
        <span className={`tag ${currentQuestion.is_approved ? 'tag-emerald' : 'tag-amber'}`}>
          {currentQuestion.is_approved ? 'PUBLISHED' : 'DRAFT'}
        </span>
      </div>

      {/* Assignment Overview Box */}
      <div style={{
        background: 'var(--bg-input)',
        padding: 16,
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {currentQuestion.title}
          </h3>
          <span className="tag tag-purple" style={{ fontSize: '0.72rem' }}>
            ID #{currentQuestion.id} • {currentQuestion.language?.toUpperCase()}
          </span>
        </div>
        <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5 }}>
          {currentQuestion.description}
        </p>
      </div>

      {/* SECTION 1: DRAFT TEST CASES */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen size={16} /> Draft Test Suite ({tests.length} cases)
          </h4>

          <div style={{ display: 'flex', gap: 8 }}>
            {editingTests ? (
              <button
                type="button"
                className="btn-outline"
                onClick={handleSaveTests}
                style={{ fontSize: '0.76rem', padding: '4px 10px', color: 'var(--accent-emerald)', borderColor: 'rgba(52, 211, 153, 0.4)' }}
              >
                <Save size={13} /> Save Test Edits
              </button>
            ) : (
              <button
                type="button"
                className="btn-outline"
                onClick={() => setEditingTests(true)}
                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
              >
                <Edit2 size={13} /> Edit Test Cases
              </button>
            )}

            <button
              type="button"
              className="btn-outline"
              onClick={handleAddTestCase}
              style={{ fontSize: '0.76rem', padding: '4px 10px', color: 'var(--accent-blue)' }}
            >
              <Plus size={13} /> Add Case
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tests.map((t, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-input)',
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                fontSize: '0.82rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ color: 'var(--accent-amber)' }}>Case #{idx + 1}</strong>
                  <span className={`tag ${t.is_hidden ? 'tag-purple' : 'tag-blue'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                    {t.is_hidden ? 'Hidden / Grading' : 'Sample / Visible'}
                  </span>
                </div>

                {editingTests && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleTestChange(idx, 'is_hidden', !t.is_hidden)}
                      style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                      title="Toggle Hidden Test status"
                    >
                      {t.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{t.is_hidden ? 'Hidden' : 'Visible'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => handleRemoveTestCase(idx)}
                      style={{ fontSize: '0.72rem', padding: '2px 6px', color: 'var(--accent-rose)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>

              {editingTests ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Input Data:</span>
                    <input
                      className="form-input"
                      value={t.input || t.input_data || ''}
                      onChange={(e) => handleTestChange(idx, 'input', e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '6px 8px', marginTop: 3, fontFamily: 'Fira Code, monospace' }}
                    />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Output:</span>
                    <input
                      className="form-input"
                      value={t.expected_output || ''}
                      onChange={(e) => handleTestChange(idx, 'expected_output', e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '6px 8px', marginTop: 3, fontFamily: 'Fira Code, monospace' }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>Input: </strong>
                    <code style={{ color: '#38bdf8', fontFamily: 'Fira Code, monospace', whiteSpace: 'pre-wrap' }}>
                      {t.input || t.input_data || '(Empty input)'}
                    </code>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <strong style={{ color: 'var(--text-muted)' }}>Expected Output: </strong>
                    <code style={{ color: '#34d399', fontFamily: 'Fira Code, monospace', whiteSpace: 'pre-wrap' }}>
                      {t.expected_output || '(Empty output)'}
                    </code>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: DRAFT VIVA QUESTION BANK */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Mic size={16} /> Draft Viva Question Bank ({currentQuestion.draft_viva?.length || 0} questions)
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {currentQuestion.draft_viva?.map((v, idx) => (
            <div key={idx} style={{ background: 'var(--bg-input)', padding: 12, borderRadius: 8, fontSize: '0.82rem', border: '1px solid var(--border-color)' }}>
              <div><strong>Q{idx + 1}:</strong> {v.prompt}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: 4 }}>
                Target Concepts: {v.expected_concepts?.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {!currentQuestion.is_approved && (
          <button className="btn-primary" onClick={onApprove} disabled={isLoading} style={{ flex: 1, justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
            <span>{isLoading ? 'Approving...' : 'Approve Question for Student Submissions ✅'}</span>
          </button>
        )}
        <button
          type="button"
          className="btn-outline"
          onClick={() => onDelete(currentQuestion.id)}
          disabled={isLoading}
          style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
        >
          <Trash2 size={15} />
          <span>Delete Draft</span>
        </button>
      </div>
    </section>
  )
}
