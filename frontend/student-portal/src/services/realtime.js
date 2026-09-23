/**
 * Real-Time Event Bus Client for Student Portal
 * Connects to FastAPI WebSocket /api/ws and dispatches live events (assignment created, approved, updated, etc.)
 */

const hostname = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost'
const WS_URL = `ws://${hostname}:8000/api/ws`

class RealtimeClient {
  constructor() {
    this.ws = null
    this.subscribers = new Set()
    this.reconnectTimer = null
    this.pingTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 30
    this.connected = false
    this.shouldReconnect = true
  }

  connect() {
    if (typeof window === 'undefined' || !('WebSocket' in window)) return
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      this.ws = new WebSocket(WS_URL)

      this.ws.onopen = () => {
        this.connected = true
        this.reconnectAttempts = 0
        console.log('[Realtime] Connected to CodeMentor AI event bus.')
        this._startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this._notify(data)
        } catch (err) {
          console.warn('[Realtime] Failed to parse message:', event.data)
        }
      }

      this.ws.onclose = () => {
        this.connected = false
        this._stopHeartbeat()
        this._scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        console.warn('[Realtime] WebSocket error:', err)
        this.connected = false
        if (this.ws) {
          try { this.ws.close() } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[Realtime] Could not initiate WebSocket:', e)
      this._scheduleReconnect()
    }
  }

  _scheduleReconnect() {
    if (!this.shouldReconnect) return
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  _startHeartbeat() {
    this._stopHeartbeat()
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'PING' }))
        } catch (_) {}
      }
    }, 25000)
  }

  _stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  _notify(message) {
    this.subscribers.forEach((callback) => {
      try {
        callback(message)
      } catch (err) {
        console.error('[Realtime] Subscriber callback error:', err)
      }
    })
  }

  subscribe(callback) {
    this.subscribers.add(callback)
    if (!this.connected) {
      this.connect()
    }
    return () => {
      this.subscribers.delete(callback)
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this._stopHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      try { this.ws.close() } catch (_) {}
      this.ws = null
    }
  }
}

export const realtime = new RealtimeClient()
