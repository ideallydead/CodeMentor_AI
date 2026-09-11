import React from 'react'
import { PlusCircle, Sparkles } from 'lucide-react'

export default function DraftAssignmentForm({
  title,
  setTitle,
  facLanguage,
  setFacLanguage,
  description,
  setDescription,
  onSubmit,
  isLoading
}) {
  return (
    <section className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <PlusCircle size={18} color="var(--accent-blue)" />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
          Assignment Problem Specification
        </h3>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500 }}>
            Question Title
          </label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Find Two Sum Indices in Array"
            required
          />
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500 }}>
            Target Programming Language
          </label>
          <select
            className="form-input"
            value={facLanguage}
            onChange={(e) => setFacLanguage(e.target.value)}
          >
            <option value="python">Python 3</option>
            <option value="java">Java</option>
            <option value="c">C</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block', fontWeight: 500 }}>
            Description & Problem Constraints
          </label>
          <textarea
            className="form-input"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        <button className="btn-primary" type="submit" disabled={isLoading} style={{ marginTop: 4 }}>
          <Sparkles size={16} />
          <span>{isLoading ? 'Generating AI Drafts...' : 'Create Draft & Generate AI Test/Viva Bank'}</span>
        </button>
      </form>
    </section>
  )
}
