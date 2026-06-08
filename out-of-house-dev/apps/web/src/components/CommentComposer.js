import React, { useState, useRef } from 'react';
import AttachmentDropzone, { AttachmentList } from './AttachmentDropzone';
import { parseMentions } from '../lib/mentions';
import { useAuth } from '../lib/AuthProvider';
import { api } from '../lib/api';
import { toast } from '../lib/toast';

const CommentComposer = ({ requestId, mentionCandidates = [], onPosted, placeholder = 'Write a comment. Type @ to mention.' }) => {
  const { profile } = useAuth();
  const [body, setBody] = useState('');
  const [working, setWorking] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [suggest, setSuggest] = useState({ open: false, items: [], anchor: 0 });
  const textareaRef = useRef(null);

  const onChange = (e) => {
    const val = e.target.value;
    setBody(val);
    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const m = before.match(/(?:^|\s)@([a-z0-9_.-]{0,30})$/i);
    if (m) {
      const q = (m[1] || '').toLowerCase();
      const items = mentionCandidates
        .filter((c) => {
          const name = (c.full_name || '').toLowerCase();
          const handle = (c.email || '').split('@')[0].toLowerCase();
          return !q || name.startsWith(q) || handle.startsWith(q) || name.includes(q);
        })
        .slice(0, 5);
      setSuggest({ open: items.length > 0, items, anchor: pos - (m[1]?.length || 0) - 1 });
    } else {
      setSuggest({ open: false, items: [], anchor: 0 });
    }
  };

  const insertMention = (c) => {
    const handle = (c.email || '').split('@')[0];
    const ta = textareaRef.current;
    const pos = ta?.selectionStart ?? body.length;
    const start = body.lastIndexOf('@', pos - 1);
    if (start < 0) return;
    const next = body.slice(0, start) + `@${handle} ` + body.slice(pos);
    setBody(next);
    setSuggest({ open: false, items: [], anchor: 0 });
    requestAnimationFrame(() => {
      ta.focus();
      const after = start + handle.length + 2;
      ta.setSelectionRange(after, after);
    });
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!body.trim() || !profile?.id) return;
    setWorking(true);
    const mentions = parseMentions(body, mentionCandidates);
    try {
      const { comment } = await api.post('/requests/' + requestId + '/comments', {
        body: body.trim(),
        mentions,
      });
      setBody('');
      setAttachments([]);
      setWorking(false);
      onPosted?.(comment);
    } catch (err) {
      toast.error(`Could not post: ${err?.message || 'Unknown error'}`);
      setWorking(false);
    }
  };

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
  };

  return (
    <form onSubmit={submit} className="comment-form">
      <div className="comment-composer">
        <textarea
          ref={textareaRef}
          rows="3"
          placeholder={placeholder}
          value={body}
          onChange={onChange}
          onKeyDown={onKey}
        />
        {suggest.open && (
          <div className="mention-suggest" role="listbox">
            {suggest.items.map((c) => (
              <button
                type="button"
                key={c.id}
                className="mention-suggest-item"
                onClick={() => insertMention(c)}
              >
                <span className="mention-avatar">{(c.full_name || c.email || '?').slice(0, 1).toUpperCase()}</span>
                <strong>{c.full_name || c.email}</strong>
                {c.role && <span className="mention-role">{c.role}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {attachments.length > 0 && (
        <AttachmentList items={attachments} onRemove={(a) => setAttachments((xs) => xs.filter((x) => x.id !== a.id))} />
      )}
      <div className="comment-form-foot">
        <AttachmentDropzone
          requestId={requestId}
          label="Attach"
          onUploaded={(a) => setAttachments((xs) => [...xs, a])}
        />
        <button type="submit" className="primary-btn" disabled={working || !body.trim()}>
          <span>{working ? 'Posting…' : 'Post'}</span>
        </button>
      </div>
      <div className="comment-form-hint app-muted">Cmd/Ctrl+Enter to post. @mention to ping.</div>
    </form>
  );
};

export default CommentComposer;
