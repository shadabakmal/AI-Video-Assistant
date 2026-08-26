import React from 'react';
import { Video, Calendar, Clock, Trash2, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { deleteMeeting } from '../services/api';

export default function MeetingLibrary({ meetings = [], onSelectMeeting, RefreshList }) {

  const handleDelete = async (e, meetingId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this meeting session from MongoDB?')) {
      try {
        await deleteMeeting(meetingId);
        if (RefreshList) RefreshList();
      } catch (err) {
        console.error('Failed to delete meeting:', err);
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    return `${mins} mins`;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>MongoDB Meeting Library</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            All processed video meetings stored in your MongoDB database collection.
          </p>
        </div>
      </div>

      {meetings.length === 0 ? (
        <div className="card-glass" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Video size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <h3>No Meetings Found</h3>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Process a new video link to start populating your MongoDB meeting library.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {meetings.map((m) => (
            <div
              key={m.meeting_id}
              className="card-glass"
              onClick={() => onSelectMeeting(m.meeting_id)}
              style={{
                padding: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span className="badge badge-purple">
                    <Video size={10} /> {m.source_type || 'YouTube'}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, m.meeting_id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                    title="Delete Meeting Document"
                  >
                    <Trash2 size={14} hoverColor="var(--danger)" />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.75rem', lineHeight: '1.4' }}>
                  {m.title || 'Untitled Meeting'}
                </h3>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Calendar size={12} /> {formatDate(m.created_at)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {formatDuration(m.duration)}
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle size={12} color="var(--success)" />
                  {(m.action_items || []).length} Action Items
                </span>

                <span style={{ fontSize: '0.75rem', color: 'var(--accent-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Open Workspace <ArrowRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
