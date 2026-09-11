
import React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success'
        const isError = toast.type === 'error'
        const isWarning = toast.type === 'warning'

        const icon = isSuccess ? <CheckCircle2 size={18} color="var(--accent-emerald)" /> :
                     isError ? <AlertCircle size={18} color="var(--accent-rose)" /> :
                     isWarning ? <AlertCircle size={18} color="var(--accent-amber)" /> :
                     <Info size={18} color="var(--accent-blue)" />

        return (
          <div key={toast.id} className="toast-item">
            {icon}
            <div style={{ flex: 1, color: 'var(--text-main)', fontSize: '0.88rem' }}>
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss && onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex'
              }}
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
