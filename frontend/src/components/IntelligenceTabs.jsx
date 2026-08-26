import React, { useState } from 'react';
import { FileText, CheckSquare, Target, HelpCircle, UserCheck } from 'lucide-react';
import { toggleActionItem } from '../services/api';

export default function IntelligenceTabs({ meeting, onActionItemToggled }) {
  const [activeSubTab, setActiveSubTab] = useState('summary');
  const [items, setItems] = useState(meeting.action_items || []);

  const handleToggle = async (itemId, currentCompleted) => {
    const nextCompleted = !currentCompleted;
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, completed: nextCompleted } : item));
    try {
      await toggleActionItem(meeting.meeting_id, itemId, nextCompleted);
      if (onActionItemToggled) onActionItemToggled();
    } catch (e) {
      console.error('Failed to update action item status:', e);
    }
  };

  return (
    <div className="card-glass" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          className={activeSubTab === 'summary' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveSubTab('summary')}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
        >
          <FileText size={14} /> Executive Summary
        </button>
        <button
          className={activeSubTab === 'actions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveSubTab('actions')}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
        >
          <CheckSquare size={14} /> Action Items ({items.filter(i => i.completed).length}/{items.length})
        </button>
        <button
          className={activeSubTab === 'decisions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveSubTab('decisions')}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
        >
          <Target size={14} /> Key Decisions
        </button>
        <button
          className={activeSubTab === 'questions' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setActiveSubTab('questions')}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
        >
          <HelpCircle size={14} /> Open Questions
        </button>
      </div>

      {activeSubTab === 'summary' && (
        <div>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Executive Overview
          </h4>
          <p style={{ fontSize: '0.9rem', lineHeight: '1.7', color: 'var(--text)', whiteSpace: 'pre-line' }}>
            {meeting.summary || 'No summary available.'}
          </p>
        </div>
      )}

      {activeSubTab === 'actions' && (
        <div>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Action Items & Task Checklist
          </h4>
          {items.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No action items extracted.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: item.completed ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg)',
                    border: `1px solid ${item.completed ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggle(item.id, item.completed)}
                      style={{ accentColor: 'var(--success)', width: '18px', height: '18px' }}
                    />
                    <span style={{
                      fontSize: '0.85rem',
                      color: item.completed ? 'var(--text-muted)' : 'var(--text)',
                      textDecoration: item.completed ? 'line-through' : 'none'
                    }}>
                      {item.task}
                    </span>
                  </label>
                  <span className="badge badge-purple" style={{ fontSize: '0.65rem', flexShrink: 0 }}>
                    <UserCheck size={10} /> {item.assignee || 'Unassigned'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'decisions' && (
        <div>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Key Decisions Agreed
          </h4>
          {(!meeting.key_decisions || meeting.key_decisions.length === 0) ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No key decisions recorded.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {meeting.key_decisions.map((dec, idx) => (
                <li key={idx} style={{ padding: '0.65rem 1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text)' }}>
                  🔑 {dec}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeSubTab === 'questions' && (
        <div>
          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Unresolved / Open Questions
          </h4>
          {(!meeting.open_questions || meeting.open_questions.length === 0) ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No open questions recorded.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {meeting.open_questions.map((q, idx) => (
                <li key={idx} style={{ padding: '0.65rem 1rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text)' }}>
                  ❓ {q}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
