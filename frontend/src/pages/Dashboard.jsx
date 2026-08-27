import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DirectFileUpload from '../components/DirectFileUpload';
import { processMedia, getUserMediaList } from '../services/api';
import { Link as LinkIcon, Music, Video, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [activeInputTab, setActiveInputTab] = useState('url'); // 'url', 'audio', 'video'
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');

  const [mediaList, setMediaList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const navigate = useNavigate();

  const fetchUserMedia = async () => {
    setLoadingList(true);
    try {
      const data = await getUserMediaList();
      setMediaList(data);
    } catch (err) {
      console.error('Failed to fetch user media list:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchUserMedia();
  }, []);

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsProcessingUrl(true);
    setUrlError('');

    try {
      const result = await processMedia(urlInput.trim(), 'URL');
      navigate(`/chat/${result.id || result._id}`);
    } catch (err) {
      console.error('URL processing error:', err);
      setUrlError(err.response?.data?.detail || 'Failed to process video URL');
    } finally {
      setIsProcessingUrl(false);
    }
  };

  const handleUploadSuccess = (result) => {
    const mediaId = result.id || result._id;
    navigate(`/chat/${mediaId}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveInputTab('url')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeInputTab === 'url'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LinkIcon size={14} /> URL
          </button>
          <button
            onClick={() => setActiveInputTab('audio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeInputTab === 'audio'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Music size={14} /> Audio
          </button>
          <button
            onClick={() => setActiveInputTab('video')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeInputTab === 'video'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video size={14} /> Video
          </button>
        </div>
      </div>

      {/* Input Tab Renderers */}
      <div className="max-w-2xl mx-auto">
        {activeInputTab === 'url' && (
          <div className="p-6 bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl text-white space-y-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <input
                type="url"
                required
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white outline-none transition"
              />

              {urlError && (
                <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-800/60">
                  {urlError}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessingUrl || !urlInput.trim()}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessingUrl ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Process <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {activeInputTab === 'audio' && (
          <DirectFileUpload mediaType="Audio" onUploadSuccess={handleUploadSuccess} />
        )}

        {activeInputTab === 'video' && (
          <DirectFileUpload mediaType="Video" onUploadSuccess={handleUploadSuccess} />
        )}
      </div>

      {/* User's Processed Media Sessions List */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-white">Recent sessions</h2>

        {loadingList ? (
          <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2 text-xs">
            <Loader2 size={16} className="animate-spin text-indigo-400" /> Loading...
          </div>
        ) : mediaList.length === 0 ? (
          <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
            No sessions yet. Add a video or audio above to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaList.map((item) => {
              const itemId = item.id || item._id;
              return (
                <Link
                  key={itemId}
                  to={`/chat/${itemId}`}
                  className="p-5 bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 rounded-xl transition group flex flex-col justify-between space-y-3 decoration-none"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition truncate">
                      {item.title || 'Processed Media Session'}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.summary || item.transcript || 'No summary available.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end text-xs text-indigo-400 font-medium gap-1 pt-2 border-t border-slate-800/60">
                    Open <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}