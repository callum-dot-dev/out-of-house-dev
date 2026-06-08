import { api } from './api';

export const STAGES = [
  { id: 'discovery', label: 'Discovery',     blurb: 'Brief, scope, initial calls, audience research.' },
  { id: 'design',    label: 'Design',        blurb: 'Mocks, wireframes, design system, brand direction.' },
  { id: 'build',     label: 'Build',         blurb: 'Working code, screenshots of progress, in-flight features.' },
  { id: 'review',    label: 'Review',        blurb: 'Drafts ready for your sign-off, QA reports, test plans.' },
  { id: 'ship',      label: 'Ship',          blurb: 'Launch checklists, deploy notes, post-launch handover.' },
  { id: 'ai-output', label: 'AI output',     blurb: 'What the AI produced. Reviewed before anything goes to you.' },
  { id: 'general',   label: 'General',       blurb: 'Anything that does not fit a single stage.' },
];

export const CATEGORIES = [
  { id: 'design',        label: 'Design' },
  { id: 'doc',           label: 'Doc' },
  { id: 'spec',          label: 'Spec' },
  { id: 'code-review',   label: 'Code review' },
  { id: 'ai-output',     label: 'AI output' },
  { id: 'meeting-notes', label: 'Meeting notes' },
  { id: 'asset',         label: 'Asset' },
  { id: 'other',         label: 'Other' },
];

export const stageLabel = (id) => STAGES.find((s) => s.id === id)?.label || id;
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

export const fetchProjectDocuments = async (projectId) => {
  if (!projectId) return [];
  try {
    const { documents } = await api.get('/projects/' + projectId + '/documents');
    return documents ?? [];
  } catch (e) {
    return [];
  }
};

export const createDocument = async ({ projectId, uploaderId, title, description, stage, category, externalUrl, file, aiGenerated, aiModel, visibleToClient = true }) => {
  let storagePath = null;
  let sizeBytes = null;
  let mimeType = null;

  if (file) {
    try {
      const { file: uploaded } = await api.upload(file, 'documents');
      storagePath = uploaded?.path;
      sizeBytes = uploaded?.size ?? file.size;
      mimeType = uploaded?.mime || file.type;
    } catch (e) {
      return { error: { message: e?.message || 'Upload failed' } };
    }
  }

  try {
    const { document } = await api.post('/projects/' + projectId + '/documents', {
      uploaded_by: uploaderId,
      title,
      description,
      stage,
      category,
      storage_path: storagePath,
      external_url: externalUrl || null,
      ai_generated: !!aiGenerated,
      ai_model: aiModel || null,
      visible_to_client: !!visibleToClient,
      size_bytes: sizeBytes,
      mime_type: mimeType,
    });
    return { data: document };
  } catch (e) {
    return { error: { message: e?.message || 'Could not create document' } };
  }
};

export const updateDocument = async (id, patch) => {
  try {
    const { document } = await api.patch('/documents/' + id, patch);
    return { data: document };
  } catch (e) {
    return { error: { message: e?.message || 'Could not update document' } };
  }
};

export const deleteDocument = async (id) => {
  try {
    await api.del('/documents/' + id);
    return { data: { id } };
  } catch (e) {
    return { error: { message: e?.message || 'Could not delete document' } };
  }
};
