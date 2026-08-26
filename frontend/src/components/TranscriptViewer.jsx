import React, { useState } from 'react';
import { Search, Clock, MessageSquareText } from 'lucide-react';

export default function TranscriptViewer({ segments = [], onSeek }) {
  const [filterText, setFilterText] = useState('');

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
  };

  const filteredSegments = segments.filter(seg =>
    seg.text.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="card-glass" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
          <MessageSquareText size={16} color="var(--accent-light)" />
          TIMESTAMPED TRANSCRIPT ({segments.length} segments)
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', width: '180px' }}>
          <Search size={14} color="var(--text-muted)" style={{ marginRight: '0.35rem' }} />
          <input
            type="text"
            placeholder="Search transcript..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '0.75rem',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '480px', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.25rem' }}>
        {filteredSegments.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No matching transcript segments found.
          </p>
        ) : (
          filteredSegments.map((seg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.6rem',
                borderRadius: '6px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                lineHeight: '1.5'
              }}
            >
              <button
                className="timestamp-chip"
                onClick={() => onSeek && onSeek(seg.start)}
                title="Click to jump video to this moment"
                style={{ height: 'fit-content', flexShrink: 0 }}
              >
                <Clock size={10} style={{ marginRight: '0.2rem', verticalAlign: 'middle' }} />
                {formatTimestamp(seg.start)}
              </button>
              <div style={{ color: 'var(--text)', flex: 1 }}>
                {seg.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
