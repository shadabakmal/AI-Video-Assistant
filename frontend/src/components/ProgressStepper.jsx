import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const STEPS = [
  { id: 'downloading', label: 'Audio Extraction', desc: 'Downloading audio via yt-dlp' },
  { id: 'transcribing', label: 'Whisper STT', desc: 'Transcribing & generating timestamps' },
  { id: 'analyzing', label: 'AI Intelligence', desc: 'Extracting summary & action items' },
  { id: 'indexing', label: 'Vector Indexing', desc: 'Building ChromaDB RAG index' }
];

export default function ProgressStepper({ statusData }) {
  const currentStatus = statusData?.status || 'pending';
  const progress = statusData?.progress_percentage || 0;
  const message = statusData?.step_message || 'Initializing task...';
  const isError = currentStatus === 'failed';

  const getStepState = (stepId, index) => {
    if (isError) return 'error';
    if (currentStatus === 'completed') return 'completed';

    const order = ['pending', 'downloading', 'transcribing', 'analyzing', 'indexing', 'completed'];
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="card-glass" style={{ padding: '2.5rem', maxWidth: '750px', margin: '3rem auto' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>
        {isError ? 'Processing Failed' : 'Processing Pipeline Active'}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '2rem' }}>
        {message}
      </p>

      {/* Progress Bar */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', height: '12px', overflow: 'hidden', marginBottom: '2.5rem', position: 'relative' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: isError
              ? 'var(--danger)'
              : 'linear-gradient(90deg, var(--accent), var(--cyan))',
            transition: 'width 0.4s ease',
            boxShadow: '0 0 10px var(--accent-glow)'
          }}
        />
      </div>

      {/* Stepper Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        {STEPS.map((step, idx) => {
          const state = getStepState(step.id, idx);

          return (
            <div
              key={step.id}
              style={{
                background: state === 'active' ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg)',
                border: `1px solid ${state === 'active' ? 'var(--accent)' : state === 'completed' ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}>
                {state === 'completed' && <CheckCircle2 color="var(--success)" size={24} />}
                {state === 'active' && <Loader2 className="spin" color="var(--accent-light)" size={24} style={{ animation: 'spin 1.5s linear infinite' }} />}
                {state === 'upcoming' && <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)' }} />}
                {state === 'error' && <AlertCircle color="var(--danger)" size={24} />}
              </div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>{step.label}</h4>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{step.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
