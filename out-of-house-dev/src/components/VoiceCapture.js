import React, { useEffect, useRef, useState } from 'react';
import { uploadAttachment } from '../lib/uploads';
import { useAuth } from '../lib/AuthProvider';
import { toast } from '../lib/toast';

const fmt = (ms) => {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const MicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
  </svg>
);

const VoiceCapture = ({ projectId, onTranscript, onUploaded, label = 'Hold to record a voice memo' }) => {
  const { profile } = useAuth();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startedRef = useRef(0);
  const intervalRef = useRef(null);

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  useEffect(() => () => stopTimer(), []);

  const start = async () => {
    if (recording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const duration = Date.now() - startedRef.current;
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        setUploading(true);
        const { data, error } = await uploadAttachment({
          file, uploaderId: profile?.id, projectId,
          bucket: 'voice', kindOverride: 'voice', durationMs: duration,
        });
        setUploading(false);
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
        } else if (data) {
          toast.success('Voice memo saved.');
          onUploaded?.(data);
          onTranscript?.({
            attachment: data,
            placeholder: 'Voice memo captured. (Transcription wired up when AI worker is configured.)',
          });
        }
      };
      rec.start();
      recorderRef.current = rec;
      startedRef.current = Date.now();
      setElapsed(0);
      setRecording(true);
      intervalRef.current = setInterval(() => setElapsed(Date.now() - startedRef.current), 200);
    } catch (e) {
      toast.error(`Microphone error: ${e?.message || 'permission denied'}`);
    }
  };

  const stop = () => {
    if (!recording) return;
    recorderRef.current?.stop();
    setRecording(false);
    stopTimer();
  };

  return (
    <div className="voice-capture">
      <button
        type="button"
        className={`voice-btn ${recording ? 'is-recording' : ''}`}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={() => recording && stop()}
        onTouchStart={start}
        onTouchEnd={stop}
        disabled={uploading}
      >
        <MicIcon />
        <span>{recording ? `Recording ${fmt(elapsed)}` : uploading ? 'Uploading…' : label}</span>
      </button>
    </div>
  );
};

export default VoiceCapture;
