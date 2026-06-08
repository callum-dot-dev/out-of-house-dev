import { supabase } from './supabase';

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

const sanitize = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);

export const inferKind = (file) => {
  const mime = file.type || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

const buildPath = (uploaderId, file) => {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${uploaderId}/${stamp}-${rand}-${sanitize(file.name)}`;
};

export const uploadAttachment = async ({ file, uploaderId, requestId, projectId, commentId, bucket = 'attachments', kindOverride, durationMs }) => {
  if (!file) return { error: { message: 'No file provided' } };
  if (file.size > MAX_SIZE) return { error: { message: `Too large (max ${Math.round(MAX_SIZE / 1024 / 1024)}MB)` } };
  if (!uploaderId) return { error: { message: 'Not signed in' } };

  const path = buildPath(uploaderId, file);
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) return { error: upErr };

  const { data: row, error: insErr } = await supabase.from('attachments').insert([{
    uploader_id: uploaderId,
    project_id: projectId,
    request_id: requestId,
    comment_id: commentId,
    storage_path: `${bucket}/${path}`,
    filename: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    kind: kindOverride || inferKind(file),
    duration_ms: durationMs,
  }]).select().maybeSingle();

  if (insErr) {
    // Cleanup orphaned file
    await supabase.storage.from(bucket).remove([path]).catch(() => {});
    return { error: insErr };
  }
  return { data: row };
};

export const signedUrl = async (storagePath, { expiresIn = 3600 } = {}) => {
  if (!storagePath) return null;
  const [bucket, ...rest] = storagePath.split('/');
  const path = rest.join('/');
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
};

export const publicUrl = (storagePath) => {
  if (!storagePath) return null;
  const [bucket, ...rest] = storagePath.split('/');
  const path = rest.join('/');
  return supabase.storage.from(bucket).getPublicUrl(path)?.data?.publicUrl ?? null;
};
