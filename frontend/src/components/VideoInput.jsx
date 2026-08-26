import React, { useState } from 'react';
import { Youtube, Globe, Play, Sparkles } from 'lucide-react';

export default function VideoInput({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('english');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), 'youtube', language);
  };

  const setSampleUrl = (sample) => {
    setUrl(sample);
  };

  return (
    <div className="card-glass" style={{ padding: '2.5rem', maxWidth: '750px', margin: '3rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Analyze Any Video or Meeting
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Paste a YouTube URL or meeting recording link to extract summary, action items, timestamped transcripts, and interactive RAG chat.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            YouTube Video URL
          </label>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
            <Youtube color="#ef4444" size={20} style={{ marginRight: '0.75rem' }} />
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Audio Language
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
              <Globe size={18} color="var(--accent-light)" style={{ marginRight: '0.75rem' }} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem'
                }}
              >
                <option value="english" style={{ background: 'var(--surface)' }}>English (OpenAI Whisper)</option>
                <option value="hinglish" style={{ background: 'var(--surface)' }}>Hinglish / Hindi (Sarvam AI STT)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !url.trim()}
          style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}
        >
          {isLoading ? (
            <>Initializing Pipeline...</>
          ) : (
            <>
              <Sparkles size={18} /> Process & Analyze Video
            </>
          )}
        </button>
      </form>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
          Try a sample YouTube link:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => setSampleUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Play size={12} /> Tech Keynote
          </button>
          <button
            className="btn-secondary"
            onClick={() => setSampleUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw')}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            <Play size={12} /> Product Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}
