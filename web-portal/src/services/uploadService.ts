import api from '@/lib/api'

interface UploadResponse {
  id: string
  filename: string
  contentType: string
  size: number
}

export const uploadService = {
  async uploadCv(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<{ data: UploadResponse }>('/upload/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data.data
  },

  async uploadFaceImage(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<{ data: UploadResponse }>('/upload/face-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data.data
  },
}
