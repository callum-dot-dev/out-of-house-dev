import { api } from './api';

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export const inferKind = (file) => {
  const mime = file.type || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

export const uploadAttachment = async ({ file, uploaderId, requestId, projectId, commentId, bucket = 'attachments', kindOverride, durationMs }) => {
  if (!file) return { error: { message: 'No file provided' } };
  if (file.size > MAX_SIZE) return { error: { message: `Too large (max ${Math.round(MAX_SIZE / 1024 / 1024)}MB)` } };

  try {
    const { file: uploaded } = await api.upload(file, bucket);
    const row = {
      uploader_id: uploaderId,
      project_id: projectId,
      request_id: requestId,
      comment_id: commentId,
      storage_path: uploaded?.path,
      filename: file.name,
      mime_type: uploaded?.mime || file.type,
      size_bytes: uploaded?.size ?? file.size,
      kind: kindOverride || inferKind(file),
      duration_ms: durationMs,
    };
    return { data: row };
  } catch (e) {
    return { error: { message: e?.message || 'Upload failed' } };
  }
};

export const signedUrl = async (storagePath) => {
  if (!storagePath) return null;
  return api.fileUrl(storagePath);
};

export const publicUrl = (storagePath) => {
  if (!storagePath) return null;
  return api.fileUrl(storagePath);
};
