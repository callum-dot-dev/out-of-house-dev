import { supabase } from './supabase';
import { uploadAttachment } from './uploads';

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
  const { data, error } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return [];
  return data ?? [];
};

export const createDocument = async ({ projectId, uploaderId, title, description, stage, category, externalUrl, file, aiGenerated, aiModel, visibleToClient = true }) => {
  let storagePath = null;
  let sizeBytes = null;
  let mimeType = null;

  if (file) {
    const result = await uploadAttachment({
      file, uploaderId, projectId, bucket: 'documents', kindOverride: 'file',
    });
    if (result.error) return { error: result.error };
    storagePath = result.data?.storage_path;
    sizeBytes = file.size;
    mimeType = file.type;
  }

  const { data, error } = await supabase
    .from('project_documents')
    .insert([{
      project_id: projectId,
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
    }])
    .select()
    .maybeSingle();
  return { data, error };
};

export const updateDocument = async (id, patch) => {
  return supabase.from('project_documents').update(patch).eq('id', id);
};

export const deleteDocument = async (id) => {
  return supabase.from('project_documents').delete().eq('id', id);
};
