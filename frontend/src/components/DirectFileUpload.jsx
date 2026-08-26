import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { processMedia } from '../services/api';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function DirectFileUpload({ mediaType, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDirectUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setProgress(15);
    setStatusText('Uploading file directly to Supabase Storage...');
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // 1. Direct upload to Supabase Storage Bucket
      const { data, error: uploadError } = await supabase.storage
        .from('media-uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(60);
      setStatusText('Retrieving public URL...');

      // 2. Retrieve Public File URL
      const { data: publicUrlData } = supabase.storage
        .from('media-uploads')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      setProgress(85);
      setStatusText('Processing media with Whisper & Grok on backend...');

      // 3. Send file metadata & public URL to FastAPI backend
      const result = await processMedia(publicUrl, mediaType);

      setProgress(100);
      setUploading(false);

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.detail || err.message || 'File upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900/90 rounded-xl border border-slate-800 shadow-xl text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
          <UploadCloud size={22} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">
            Upload {mediaType} File
          </h3>
          <p className="text-xs text-slate-400">Direct-to-Supabase Storage streaming</p>
        </div>
      </div>

      <form onSubmit={handleDirectUpload} className="space-y-4">
        <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-4 text-center bg-slate-950/40 transition">
          <input
            type="file"
            accept={mediaType === 'Audio' ? 'audio/*' : 'video/*'}
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-xs text-slate-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-xs file:font-semibold
              file:bg-indigo-600 file:text-white
              hover:file:bg-indigo-500 cursor-pointer"
          />
        </div>

        {file && (
          <div className="flex items-center justify-between text-xs bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <span className="text-indigo-300 font-medium truncate max-w-[200px]">{file.name}</span>
            <span className="text-slate-400 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                {statusText}
              </span>
              <span className="font-mono text-indigo-400">{progress}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-indigo-500 h-2 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 p-3 rounded-lg border border-red-800/60">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Processing...
            </>
          ) : (
            `Upload & Process ${mediaType}`
          )}
        </button>
      </form>
    </div>
  );
}
