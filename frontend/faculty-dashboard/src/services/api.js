const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
export const API_BASE = `http://${hostname}:8000/api`

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

  async createQuestion({ title, description, language }) {
    return request('/questions', {
      method: 'POST',
      body: JSON.stringify({ title, description, language })
    })
  },

  async updateQuestion(id, payload) {
    return request(`/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })
  },

  async approveQuestion(id) {
    return request(`/questions/${id}/approve`, {
      method: 'POST'
    })
  },

  async deleteQuestion(id) {
    return request(`/questions/${id}`, {
      method: 'DELETE'
    })
  },

  // Faculty Intelligence & Class Misconceptions
  async getFacultyIntelligence(id) {
    return request(`/questions/${id}/intelligence`)
  },

  // Grade Overrides
  async overrideSubmission(subId, payload) {
    return request(`/submissions/${subId}/override`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  // Submissions
  async deleteSubmission(subId) {
    return request(`/submissions/${subId}`, {
      method: 'DELETE'
    })
  },

  // Analytics & Reset
  async getAnalytics() {
    return request('/analytics')
  },

  async resetAllData() {
    return request('/reset-data', {
      method: 'POST'
    })
  }
}

export default api
