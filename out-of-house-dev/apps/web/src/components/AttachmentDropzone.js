import React, { useCallback, useRef, useState } from 'react';
import { uploadAttachment, signedUrl, publicUrl, inferKind } from '../lib/uploads';
import { useAuth } from '../lib/AuthProvider';
import { toast } from '../lib/toast';

const PaperclipIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.49" />
  </svg>
);

const fileSize = (n) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export const AttachmentList = ({ items = [], onRemove }) => {
  if (!items.length) return null;
  return (
    <ul className="attach-list">
      {items.map((a) => (
        <AttachmentItem key={a.id || a.storage_path} attachment={a} onRemove={onRemove} />
      ))}
    </ul>
  );
};

const AttachmentItem = ({ attachment, onRemove }) => {
  const [src, setSrc] = useState(null);
  const isImage = attachment.kind === 'image' || (attachment.mime_type || '').startsWith('image/');
  const isVoice = attachment.kind === 'voice' || attachment.kind === 'audio';
  const isVideo = attachment.kind === 'video';

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      let url = null;
      if (attachment.storage_path?.startsWith('avatars/')) {
        url = publicUrl(attachment.storage_path);
      } else {
        url = await signedUrl(attachment.storage_path);
      }
      if (!cancelled) setSrc(url);
    })();
    return () => { cancelled = true; };
  }, [attachment.storage_path]);

  return (
    <li className={`attach-item attach-${attachment.kind || 'file'}`}>
      {isImage && src && (
        <a href={src} target="_blank" rel="noopener noreferrer" className="attach-thumb">
          <img src={src} alt={attachment.filename} />
        </a>
      )}
      {isVideo && src && (
        <video controls src={src} className="attach-video" />
      )}
      {isVoice && src && (
        <audio controls src={src} className="attach-audio" />
      )}
      {!isImage && !isVideo && !isVoice && (
        <a href={src || '#'} target="_blank" rel="noopener noreferrer" className="attach-link">
          <PaperclipIcon />
          <span>{attachment.filename}</span>
        </a>
      )}
      <span className="attach-meta">{fileSize(attachment.size_bytes)}</span>
      {onRemove && (
        <button type="button" className="attach-remove" onClick={() => onRemove(attachment)} aria-label="Remove attachment">×</button>
      )}
    </li>
  );
};

const AttachmentDropzone = ({ requestId, projectId, commentId, onUploaded, label = 'Attach files', accept }) => {
  const { profile } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    if (!files?.length || !profile?.id) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const kind = inferKind(file);
      const { data, error } = await uploadAttachment({
        file, uploaderId: profile.id, requestId, projectId, commentId, kindOverride: kind,
      });
      if (error) {
        toast.error(`Upload failed: ${error.message || 'unknown'}`);
      } else if (data) {
        toast.success(`Attached ${file.name}`);
        onUploaded?.(data);
      }
    }
    setUploading(false);
  }, [profile?.id, requestId, projectId, commentId, onUploaded]);

  return (
    <div
      className={`dropzone ${dragging ? 'is-dragging' : ''} ${uploading ? 'is-uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button type="button" className="dropzone-btn" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <PaperclipIcon />
        <span>{uploading ? 'Uploading…' : label}</span>
      </button>
      <span className="dropzone-hint">or drop files here</span>
    </div>
  );
};

export default AttachmentDropzone;
