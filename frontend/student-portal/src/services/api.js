const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
export const API_BASE = `http://${hostname}:8000/api`

/**
 * Common fetch helper with error handling and json parsing
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    })

    if (!res.ok) {
      let errorDetail = `Request failed with status ${res.status}`
      try {
        const errJson = await res.json()
        if (errJson.detail) errorDetail = errJson.detail
      } catch (_) {}
      throw new Error(errorDetail)
    }

    return await res.json()
  } catch (err) {
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      throw new Error(`Unable to connect to API server at ${API_BASE}. Please verify backend server is running on port 8000.`)
    }
    throw err
  }
}

export const api = {
  // Questions
  async getQuestions() {
    return request('/questions')
  },

  async getQuestion(id) {
    return request(`/questions/${id}`)
  },

  // Fast Run Sandbox (< 1.5s, no LLM pipeline)
  async runCodeSandbox({ assignment_id, source_code, language }) {
    return request('/run-code', {
      method: 'POST',
      body: JSON.stringify({ assignment_id, source_code, language })
    })
  },

  // Full Multi-Agent Evaluation Submission
  async submitCode({ assignment_id, student_id, source_code, language, viva_answers }) {
    return request('/submissions', {
      method: 'POST',
      body: JSON.stringify({ assignment_id, student_id, source_code, language, viva_answers })
    })
  },

  async updateVivaAnswers(submissionId, viva_answers) {
    return request(`/submissions/${submissionId}/viva`, {
      method: 'POST',
      body: JSON.stringify({ viva_answers })
    })
  },

  async getSubmissionStatus(submissionId) {
    return request(`/submissions/${submissionId}/status`)
  },

  async getLatestStudentSubmission(assignmentId, studentId) {
    return request(`/assignments/${assignmentId}/submissions/latest?student_id=${studentId}`)
  },

  // Analytics
  async getAnalytics() {
    return request('/analytics')
  }
}

export default api
