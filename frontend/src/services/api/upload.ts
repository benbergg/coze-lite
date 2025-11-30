import { client } from './client';
import type { ApiResponse } from '@/types/common';

export const uploadApi = {
  // 上传单个文件
  uploadFile: async (
    file: File,
    onProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await client.post<ApiResponse<{ url: string }>>(
      '/api/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
      }
    );

    return res.data.data;
  },

  // 上传多个文件
  uploadFiles: async (
    files: File[],
    onProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const res = await client.post<ApiResponse<{ urls: string[] }>>(
      '/api/upload/multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percent);
          }
        },
      }
    );

    return res.data.data;
  },
};
