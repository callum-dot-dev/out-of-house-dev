import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import {
  STAGES, CATEGORIES, categoryLabel,
  fetchProjectDocuments, createDocument, updateDocument, deleteDocument,
} from '../lib/documents';
import { signedUrl } from '../lib/uploads';
import { toast } from '../lib/toast';
import { useRealtimeTable } from '../lib/realtime';

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);
const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" />
    <path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
  </svg>
);
const SparkleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
  </svg>
);

const fmtSize = (n) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const DocumentRow = ({ doc, canEdit, onPatch, onDelete }) => {
  const [openUrl, setOpenUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!doc.storage_path) return;
    (async () => {
      const url = await signedUrl(doc.storage_path);
      if (!cancelled) setOpenUrl(url);
    })();
    return () => { cancelled = true; };
  }, [doc.storage_path]);

  const href = doc.external_url || openUrl;

  return (
    <article className={`docroom-row ${doc.ai_generated ? 'is-ai' : ''}`}>
      <div className="docroom-row-icon" aria-hidden="true">
        {doc.external_url ? <LinkIcon /> : <FileIcon />}
      </div>
      <div className="docroom-row-body">
        <div className="docroom-row-head">
          <h4>
            {doc.pinned && <span className="docroom-pin" title="Pinned">★</span>}
            {doc.title}
          </h4>
          <div className="docroom-row-tags">
            <span className="badge docroom-badge-cat">{categoryLabel(doc.category)}</span>
            {doc.ai_generated && (
              <span className="badge docroom-badge-ai">
                <SparkleIcon /> AI {doc.ai_model ? `(${doc.ai_model})` : ''}
              </span>
            )}
            {!doc.visible_to_client && canEdit && (
              <span className="badge docroom-badge-hidden">Internal only</span>
            )}
          </div>
        </div>
        {doc.description && <p className="docroom-row-desc">{doc.description}</p>}
        <div className="docroom-row-meta">
          <span>v{doc.version || 1}</span>
          {doc.size_bytes != null && <span>{fmtSize(doc.size_bytes)}</span>}
          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="docroom-row-actions">
        {href && (
          <a className="ghost-btn" href={href} target="_blank" rel="noopener noreferrer">
            Open
          </a>
        )}
        {canEdit && (
          <>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onPatch(doc.id, { visible_to_client: !doc.visible_to_client })}
              title={doc.visible_to_client ? 'Hide from client' : 'Show client'}
            >
              {doc.visible_to_client ? 'Hide' : 'Publish'}
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onPatch(doc.id, { pinned: !doc.pinned })}
              title={doc.pinned ? 'Unpin' : 'Pin'}
            >
              {doc.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              className="ghost-btn docroom-row-delete"
              onClick={() => onDelete(doc.id)}
              title="Delete"
            >
              ×
            </button>
          </>
        )}
      </div>
    </article>
  );
};

const EmptyStage = ({ stage }) => (
  <div className="docroom-empty">
    <p className="app-muted">No documents in this stage yet.</p>
    <p className="docroom-empty-blurb">{stage.blurb}</p>
  </div>
);

const NewDocForm = ({ projectId, onCreated, onCancel, defaultStage }) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState(defaultStage || 'design');
  const [category, setCategory] = useState('doc');
  const [externalUrl, setExternalUrl] = useState('');
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!file && !externalUrl.trim()) { toast.error('Add a file or a link'); return; }
    setSubmitting(true);
    const { data, error } = await createDocument({
      projectId, uploaderId: profile?.id,
      title: title.trim(),
      description: description.trim(),
      stage, category,
      externalUrl: externalUrl.trim() || null,
      file,
      aiGenerated,
      aiModel: aiGenerated ? aiModel.trim() || null : null,
      visibleToClient,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Document added.');
    onCreated?.(data);
  };

  return (
    <form className="docroom-form" onSubmit={submit}>
      <div className="docroom-form-row">
        <label className="docroom-form-field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hero design v3" required />
        </label>
        <label className="docroom-form-field">
          <span>Stage</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="docroom-form-field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
      </div>

      <label className="docroom-form-field">
        <span>Description (optional)</span>
        <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it is, what the client should look at, what to ignore." />
      </label>

      <div className="docroom-form-row">
        <label className="docroom-form-field">
          <span>File (optional)</span>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <label className="docroom-form-field">
          <span>or external link</span>
          <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://figma.com/file/..." />
        </label>
      </div>

      <div className="docroom-form-row">
        <label className="docroom-toggle">
          <input type="checkbox" checked={aiGenerated} onChange={(e) => setAiGenerated(e.target.checked)} />
          <span>AI generated</span>
        </label>
        {aiGenerated && (
          <label className="docroom-form-field" style={{ flex: 1 }}>
            <span>AI model (optional)</span>
            <input value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="Claude Sonnet 4.6" />
          </label>
        )}
        <label className="docroom-toggle">
          <input type="checkbox" checked={visibleToClient} onChange={(e) => setVisibleToClient(e.target.checked)} />
          <span>Visible to client</span>
        </label>
      </div>

      <div className="docroom-form-actions">
        <button type="submit" className="primary-btn" disabled={submitting}>
          <span>{submitting ? 'Adding…' : 'Add document'}</span>
        </button>
        <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

const DocumentRoom = ({ projectId }) => {
  const { isDeveloper } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [stageFilter, setStageFilter] = useState('all');

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const list = await fetchProjectDocuments(projectId);
    setDocs(list);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useRealtimeTable({
    channel: `docroom-${projectId}`,
    table: 'project_documents',
    filter: `project_id=eq.${projectId}`,
    onChange: () => load(),
  });

  const onPatch = async (id, patch) => {
    const before = docs;
    setDocs((xs) => xs.map((d) => d.id === id ? { ...d, ...patch } : d));
    const { error } = await updateDocument(id, patch);
    if (error) {
      setDocs(before);
      toast.error(error.message);
    } else {
      if ('visible_to_client' in patch) toast.success(patch.visible_to_client ? 'Published to client.' : 'Hidden from client.');
      if ('pinned' in patch) toast.success(patch.pinned ? 'Pinned.' : 'Unpinned.');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    const before = docs;
    setDocs((xs) => xs.filter((d) => d.id !== id));
    const { error } = await deleteDocument(id);
    if (error) { setDocs(before); toast.error(error.message); }
    else toast.success('Deleted.');
  };

  const visibleDocs = useMemo(() => {
    if (stageFilter === 'all') return docs;
    return docs.filter((d) => d.stage === stageFilter);
  }, [docs, stageFilter]);

  const grouped = useMemo(() => {
    const m = {};
    STAGES.forEach((s) => { m[s.id] = []; });
    visibleDocs.forEach((d) => {
      if (!m[d.stage]) m[d.stage] = [];
      m[d.stage].push(d);
    });
    return m;
  }, [visibleDocs]);

  const totalCount = docs.length;

  return (
    <section className="app-section docroom">
      <div className="app-section-head">
        <h2 className="app-h2">Document Room</h2>
        {isDeveloper && (
          <button type="button" className="primary-btn" onClick={() => setShowNew((s) => !s)}>
            <span>{showNew ? 'Cancel' : 'Add document'}</span>
          </button>
        )}
      </div>

      <p className="app-lead docroom-lead">
        Designs, specs, AI output, and notes built alongside the project. Filtered by stage.
        {isDeveloper && ' Toggle visibility per doc — clients only see what you publish.'}
      </p>

      <div className={`docroom-new-wrap ${showNew ? 'is-open' : ''}`}>
        <div className="docroom-new-inner">
          <div className="app-card">
            <NewDocForm
              projectId={projectId}
              onCreated={() => { setShowNew(false); load(); }}
              onCancel={() => setShowNew(false)}
            />
          </div>
        </div>
      </div>

      <div className="docroom-filters">
        <button
          type="button"
          className={`filter-pill ${stageFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setStageFilter('all')}
        >
          All <span className="docroom-filter-count">{totalCount}</span>
        </button>
        {STAGES.map((s) => {
          const count = docs.filter((d) => d.stage === s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              className={`filter-pill ${stageFilter === s.id ? 'is-active' : ''}`}
              onClick={() => setStageFilter(s.id)}
            >
              {s.label}
              <span className="docroom-filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="app-card app-empty">Loading documents…</div>
      ) : totalCount === 0 ? (
        <div className="app-card app-empty-card">
          <h3>No documents yet</h3>
          <p>{isDeveloper
            ? 'Upload designs, specs, AI drafts, and meeting notes. Toggle the visibility flag to control what the client sees.'
            : 'The team will share designs, drafts, and notes here as the project progresses.'}</p>
          {isDeveloper && (
            <button type="button" className="primary-btn" onClick={() => setShowNew(true)}>
              <span>Add the first document</span>
            </button>
          )}
        </div>
      ) : (
        <div className="docroom-stages">
          {STAGES.filter((s) => grouped[s.id]?.length > 0).map((s) => (
            <div key={s.id} className="docroom-stage">
              <div className="docroom-stage-head">
                <h3>{s.label}</h3>
                <span className="docroom-stage-count">{grouped[s.id].length}</span>
              </div>
              <p className="docroom-stage-blurb">{s.blurb}</p>
              <div className="docroom-list">
                {grouped[s.id].map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    canEdit={isDeveloper}
                    onPatch={onPatch}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}
          {visibleDocs.length === 0 && stageFilter !== 'all' && (
            <EmptyStage stage={STAGES.find((s) => s.id === stageFilter) || STAGES[0]} />
          )}
        </div>
      )}
    </section>
  );
};

export default DocumentRoom;
