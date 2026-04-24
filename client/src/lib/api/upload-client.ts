import { apiClient } from '@/lib/api'

type ApiResponse<T> = {
  message?: string
} & T

export type UploadedAsset = {
  url: string
  publicId: string
  bytes: number
  format: string
}

type UploadResponse = ApiResponse<{
  upload: UploadedAsset
}>

export async function uploadFile(file: File): Promise<UploadedAsset> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiClient.post<UploadResponse>('/upload', formData, {
    auth: true,
  })

  return response.upload
}
