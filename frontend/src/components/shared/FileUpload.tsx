/**
 * File Upload Component
 *
 * Reusable file upload component with:
 * - Drag and drop support
 * - Progress tracking
 * - File validation
 * - Multiple file support
 * - Preview generation
 */

import React, { useState, useRef } from 'react';
import { Upload, X, File, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  uploadFile,
  validateFile,
  formatFileSize,
  type UploadProgress,
  type UploadResult,
} from '../../lib/supabase/storage';

interface FileUploadProps {
  bucket: string;
  path?: string;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  onUploadComplete?: (results: UploadResult[]) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  result?: UploadResult;
}

export function FileUpload({
  bucket,
  path = '',
  accept,
  maxSize = 10, // 10MB default
  multiple = false,
  onUploadComplete,
  onUploadError,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList) => {
    const newFiles = Array.from(fileList);

    // Validate files
    const validatedFiles: UploadingFile[] = newFiles.map((file) => {
      const validation = validateFile(file, {
        maxSize: maxSize * 1024 * 1024,
        allowedTypes: accept?.split(',').map((t) => t.trim()),
      });

      return {
        file,
        progress: 0,
        status: validation.valid ? ('uploading' as const) : ('error' as const),
        error: validation.error,
      };
    });

    setFiles((prev) => [...prev, ...validatedFiles]);

    // Upload valid files
    const results: UploadResult[] = [];

    for (let i = 0; i < validatedFiles.length; i++) {
      const uploadingFile = validatedFiles[i];

      if (uploadingFile.status === 'error') continue;

      try {
        const filePath = path
          ? `${path}/${uploadingFile.file.name}`
          : uploadingFile.file.name;

        const result = await uploadFile({
          bucket,
          path: filePath,
          file: uploadingFile.file,
          onProgress: (progress: UploadProgress) => {
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === files.length + i
                  ? { ...f, progress: progress.percentage }
                  : f
              )
            );
          },
        });

        // Update status to success
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === files.length + i
              ? { ...f, status: 'success', result }
              : f
          )
        );

        results.push(result);
      } catch (error) {
        // Update status to error
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === files.length + i
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );

        if (onUploadError) {
          onUploadError(
            error instanceof Error ? error : new Error('Upload failed')
          );
        }
      }
    }

    if (results.length > 0 && onUploadComplete) {
      onUploadComplete(results);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-all duration-200 cursor-pointer
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50/10'
              : 'border-gray-700 hover:border-gray-600'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <Upload
            className={`w-12 h-12 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-gray-200">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {accept || 'Any file type'} up to {maxSize}MB
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-200">
              {files.length} file{files.length > 1 ? 's' : ''}
            </h4>
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Clear all
            </button>
          </div>

          {files.map((uploadingFile, index) => (
            <div
              key={index}
              className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-3"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {uploadingFile.file.type.startsWith('image/') ? (
                  <ImageIcon className="w-8 h-8 text-blue-400" />
                ) : (
                  <File className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(uploadingFile.file.size)}
                </p>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {uploadingFile.status === 'error' && uploadingFile.error && (
                  <p className="text-xs text-red-400 mt-1">
                    {uploadingFile.error}
                  </p>
                )}
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">
                {uploadingFile.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
                {uploadingFile.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                {uploadingFile.status === 'uploading' && (
                  <span className="text-xs text-gray-400">
                    {uploadingFile.progress}%
                  </span>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeFile(index)}
                className="flex-shrink-0 p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
