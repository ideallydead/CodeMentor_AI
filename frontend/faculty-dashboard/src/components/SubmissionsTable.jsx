import React, { useState, useMemo } from 'react'
import { Search, Filter, Download, Eye, Trash2, ArrowUpDown, Shield, CheckCircle2 } from 'lucide-react'

export default function SubmissionsTable({
  submissions = [],
  assignmentId,
  assignmentTitle,
  onInspectSubmission,
  onDeleteSubmission
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all') // 'all', 'high', 'moderate', 'low'
  const [filterGrade, setFilterGrade] = useState('all') // 'all', 'overridden', 'pending'
  const [filterViva, setFilterViva] = useState('all') // 'all', 'verified', 'pending', 'none'
  const [sortField, setSortField] = useState('id') // 'id' or 'score'
  const [sortAsc, setSortAsc] = useState(false)

  // Filter and Sort Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter(s => {
        // Search by student ID or sub ID
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchSub = String(s.id).includes(q)
          const matchStudent = String(s.student_id).includes(q)
          if (!matchSub && !matchStudent) return false
        }

        // Filter by risk
        if (filterRisk !== 'all' && (s.integrity_risk || 'low') !== filterRisk) {
          return false
        }

        // Filter by grade status
        if (filterGrade === 'overridden' && !s.final_grade) return false
        if (filterGrade === 'pending' && s.final_grade) return false

        // Filter by viva status
        if (filterViva === 'verified' && !s.viva_verified) return false
        if (filterViva === 'pending' && (s.viva_verified || !s.viva_answers || s.viva_answers.length === 0)) return false
        if (filterViva === 'none' && s.viva_answers && s.viva_answers.length > 0) return false

        return true
      })
      .sort((a, b) => {
        let valA = sortField === 'score' ? (a.correctness_score ?? -1) : a.id
        let valB = sortField === 'score' ? (b.correctness_score ?? -1) : b.id
        return sortAsc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1)
      })
  }, [submissions, searchQuery, filterRisk, filterGrade, filterViva, sortField, sortAsc])

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!submissions || submissions.length === 0) return

    const headers = [
      'Submission ID',
      'Student ID',
      'Language',
      'Correctness Score',
      'Integrity Risk Level',
      'AI Recommendation',
      'Viva Defense Score',
      'Viva Verified',
      'Viva Examiner Feedback',
      'Final Grade Band',
      'Faculty Score',
      'Faculty Notes',
      'Submitted At'
    ]

    const rows = submissions.map(s => [
      s.id,
      s.student_id,
      s.language,
      s.correctness_score !== null ? `${s.correctness_score}%` : 'N/A',
      s.integrity_risk || 'low',
      s.overall_recommendation || 'good',
      s.viva_score !== null ? `${s.viva_score}%` : 'N/A',
      s.viva_verified ? 'Yes' : 'No',
      `"${(s.viva_feedback || '').replace(/"/g, '""')}"`,
      s.final_grade || 'None',
      s.faculty_score ?? '',
      `"${(s.faculty_notes || '').replace(/"/g, '""')}"`,
      s.created_at || ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `codementor_grades_assignment_${assignmentId || 'export'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      {/* Table Action Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16
      }}>
        {/* Search & Filter Group */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Student or Sub ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 32, fontSize: '0.82rem', paddingRight: 10 }}
            />
          </div>

          {/* Risk Filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '7px 12px' }}
          >
            <option value="all">All Risk Levels</option>
            <option value="high">High Risk Only</option>
            <option value="moderate">Moderate Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {/* Override Filter */}
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '7px 12px' }}
          >
            <option value="all">All Grading Statuses</option>
            <option value="overridden">Instructor Graded</option>
            <option value="pending">Pending Review</option>
          </select>

          {/* Viva Status Filter */}
          <select
            value={filterViva}
            onChange={(e) => setFilterViva(e.target.value)}
            className="form-input"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '7px 12px' }}
          >
            <option value="all">All Viva Defense Statuses</option>
            <option value="verified">Verified Viva</option>
            <option value="pending">Pending Verification</option>
            <option value="none">No Viva Submitted</option>
          </select>
        </div>

        {/* Sort & Export Buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              if (sortField === 'score') setSortAsc(!sortAsc)
              else { setSortField('score'); setSortAsc(false) }
            }}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title="Sort by Correctness Score"
          >
            <ArrowUpDown size={14} />
            <span>Sort: {sortField === 'score' ? (sortAsc ? 'Score Low→High' : 'Score High→Low') : 'By ID'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            style={{ fontSize: '0.82rem', padding: '7px 14px' }}
          >
            <Download size={14} />
            <span>Export Gradebook (CSV)</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left', minWidth: 680 }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 14px', color: 'var(--text-main)' }}>Sub ID</th>
              <th style={{ padding: '12px 14px', color: 'var(--text-main)' }}>Student</th>
              <th style={{ padding: '12px 14px' }}>Correctness</th>
              <th style={{ padding: '12px 14px' }}>Integrity Risk</th>
              <th style={{ padding: '12px 14px' }}>AI Recommendation</th>
              <th style={{ padding: '12px 14px' }}>Oral Viva</th>
              <th style={{ padding: '12px 14px' }}>Final Grade</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--accent-blue)' }}>#{s.id}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>Student #{s.student_id}</span>
                      {s.is_resubmission && (
                        <span className="tag tag-purple" style={{ fontSize: '0.65rem', padding: '1px 6px' }} title={`Attempt #${s.attempt_number || 2}`}>
                          Resubmission ({s.attempt_number ? `#${s.attempt_number}` : 'Re-attempt'})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.language}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontWeight: 700, color: s.correctness_score >= 80 ? 'var(--accent-emerald)' : s.correctness_score >= 50 ? 'var(--accent-blue)' : 'var(--accent-amber)' }}>
                      {s.correctness_score !== null ? `${s.correctness_score}%` : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className={`tag ${s.integrity_risk === 'high' ? 'tag-rose' : s.integrity_risk === 'moderate' ? 'tag-amber' : 'tag-emerald'}`}>
                      <Shield size={11} style={{ marginRight: 3 }} />
                      {(s.integrity_risk || 'low').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="tag tag-blue">{(s.overall_recommendation || 'good').toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {s.viva_answers && s.viva_answers.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: (s.viva_score ?? 0) >= 70 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                            {s.viva_score !== null ? `${s.viva_score}%` : 'N/A'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ({s.viva_answers.length} Qs)
                          </span>
                        </div>
                        <div>
                          {s.viva_verified ? (
                            <span className="tag tag-emerald" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              Verified
                            </span>
                          ) : (
                            <span className="tag tag-amber" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              Pending Verification
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem' }}>Not Submitted</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {s.final_grade ? (
                      <span className="tag tag-emerald">{s.final_grade.toUpperCase()} ({s.faculty_score ?? ''})</span>
                    ) : (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>Pending Review</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.74rem', padding: '5px 10px' }}
                        onClick={() => onInspectSubmission(s)}
                        title="View code, execution trace, and override grade"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ fontSize: '0.74rem', padding: '5px 8px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                        onClick={() => onDeleteSubmission(s.id)}
                        title="Delete submission"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: 36, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 4 }}>
                    {searchQuery || filterRisk !== 'all' || filterGrade !== 'all' || filterViva !== 'all'
                      ? 'No submissions match your active filter criteria.'
                      : `No submissions recorded yet for Assignment #${assignmentId || ''}.`}
                  </p>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                    When students submit their solutions, evaluation reports will populate here automatically.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
