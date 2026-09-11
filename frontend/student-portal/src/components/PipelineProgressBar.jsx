import React, { useEffect, useState } from 'react'
import { Terminal, Shield, Brain, Zap, FileCheck, CheckCircle2 } from 'lucide-react'

const PIPELINE_STEPS = [
  { id: 1, label: 'Sandbox Execution', icon: Terminal, desc: 'Executing tests in isolated container' },
  { id: 2, label: 'AST Integrity Scan', icon: Shield, desc: 'Structural AST plagiarism & refactoring analysis' },
  { id: 3, label: 'Socratic Tutor', icon: Brain, desc: 'Detecting misconceptions & formulating hints' },
  { id: 4, label: 'Optimization Engine', icon: Zap, desc: 'Evaluating algorithmic time/space bounds' },
  { id: 5, label: 'Rubric Assessment', icon: FileCheck, desc: 'Synthesizing pedagogical scoring & viva defense' }
]

export default function PipelineProgressBar({ isSubmitting }) {
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (!isSubmitting) {
      setCurrentStep(1)
      return
    }

    // Advance step every ~3 seconds to give live feedback during LLM evaluation
    const timer = setInterval(() => {
      setCurrentStep(prev => (prev < 5 ? prev + 1 : prev))
    }, 2800)

    return () => clearInterval(timer)
  }, [isSubmitting])

  if (!isSubmitting) return null

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid var(--accent-blue)',
      boxShadow: '0 0 25px rgba(56, 189, 248, 0.25)',
      borderRadius: 14,
      padding: 18,
      marginBottom: 20,
      animation: 'modalIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            boxShadow: '0 0 10px var(--accent-blue)'
          }} className="pulse-active" />
          <strong style={{ fontSize: '0.92rem', color: '#fff' }}>
            Multi-Agent Assessment Pipeline Active
          </strong>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
          Step {currentStep} of 5
        </span>
      </div>

      {/* Stepper Dots & Connectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, position: 'relative' }}>
        {PIPELINE_STEPS.map((step) => {
          const isDone = currentStep > step.id
          const isActive = currentStep === step.id
          const Icon = step.icon

          const borderColor = isDone ? 'var(--accent-emerald)' : isActive ? 'var(--accent-blue)' : 'var(--border-color)'
          const bgColor = isDone ? 'rgba(52, 211, 153, 0.15)' : isActive ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-input)'
          const iconColor = isDone ? 'var(--accent-emerald)' : isActive ? 'var(--accent-blue)' : 'var(--text-dim)'

          return (
            <div
              key={step.id}
              style={{
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                padding: '10px 8px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 0 14px rgba(56, 189, 248, 0.35)' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                {isDone ? (
                  <CheckCircle2 size={18} color="var(--accent-emerald)" />
                ) : (
                  <Icon size={18} color={iconColor} className={isActive ? 'pulse-active' : undefined} />
                )}
              </div>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isActive ? '#fff' : isDone ? 'var(--accent-emerald)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {step.label}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {PIPELINE_STEPS[currentStep - 1]?.desc}
      </div>
    </div>
  )
}
