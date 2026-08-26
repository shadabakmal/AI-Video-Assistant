import React, { useEffect, useRef } from 'react';

export default function VideoPlayerSync({ youtubeId, mediaFilePath, seekTime }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && iframeRef.current) {
      if (youtubeId) {
        // Send postMessage to YouTube IFrame API to seekTo exact timestamp
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [seekTime, true]
          }),
          '*'
        );
      }
    }
  }, [seekTime, youtubeId]);

  if (youtubeId) {
    return (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&autoplay=0`}
          title="Meeting Video Player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0
          }}
        />
      </div>
    );
  }

  return (
    <div className="card-glass" style={{ padding: '2rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)' }}>Audio / Media File Processed</p>
    </div>
  );
}
