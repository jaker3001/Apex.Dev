/**
 * Supabase Storage Utilities
 *
 * Helper functions for file upload, download, and management using Supabase Storage.
 * Includes progress tracking and error handling.
 */

import { supabase } from './client';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  upsert?: boolean;
}

export interface UploadResult {
  path: string;
  fullPath: string;
  publicUrl?: string;
}

/**
 * Upload a file to Supabase Storage
 *
 * @example
 * const result = await uploadFile({
 *   bucket: 'avatars',
 *   path: `${userId}/avatar.jpg`,
 *   file: fileFromInput,
 *   onProgress: (progress) => console.log(progress.percentage),
 * });
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, onProgress, upsert = false } = options;

  // Simulate progress (Supabase client doesn't expose upload progress directly)
  if (onProgress) {
    onProgress({ loaded: 0, total: file.size, percentage: 0 });
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  if (onProgress) {
    onProgress({ loaded: file.size, total: file.size, percentage: 100 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: urlData?.publicUrl,
  };
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  bucket: string,
  files: Array<{ path: string; file: File }>,
  onProgress?: (completed: number, total: number) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  let completed = 0;

  for (const { path, file } of files) {
    const result = await uploadFile({ bucket, path, file });
    results.push(result);
    completed++;

    if (onProgress) {
      onProgress(completed, files.length);
    }
  }

  return results;
}

/**
 * Download a file from Supabase Storage
 */
export async function downloadFile(
  bucket: string,
  path: string
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    throw new Error(`Download failed: ${error.message}`);
  }

  return data;
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  bucket: string,
  paths: string[]
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get a public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Create a signed URL with expiration
 *
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * List files in a bucket
 */
export async function listFiles(
  bucket: string,
  path?: string,
  options?: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: 'asc' | 'desc' };
  }
) {
  const { data, error } = await supabase.storage.from(bucket).list(path, options);

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data;
}

/**
 * Create a bucket
 */
export async function createBucket(
  name: string,
  options?: {
    public?: boolean;
    fileSizeLimit?: number;
    allowedMimeTypes?: string[];
  }
): Promise<void> {
  const { error } = await supabase.storage.createBucket(name, {
    public: options?.public ?? false,
    fileSizeLimit: options?.fileSizeLimit,
    allowedMimeTypes: options?.allowedMimeTypes,
  });

  if (error) {
    throw new Error(`Failed to create bucket: ${error.message}`);
  }
}

/**
 * Move a file
 */
export async function moveFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to move file: ${error.message}`);
  }
}

/**
 * Copy a file
 */
export async function copyFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const { maxSize, allowedTypes } = options || {};

  // Check file size
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
    };
  }

  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique file path
 */
export function generateFilePath(
  userId: number,
  fileName: string,
  folder?: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const basePath = folder ? `${folder}/${userId}` : `${userId}`;

  return `${basePath}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Get file extension
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
