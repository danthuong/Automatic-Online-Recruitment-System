import { useCallback, useState } from 'react'
import { X, CheckCircle2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadService } from '@/services/uploadService'

interface ImageUploadProps {
  label: string
  description: string
  onUpload: (fileId: string, filename: string) => void
  className?: string
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

const MAX_SIZE = 5 * 1024 * 1024

export function ImageUpload({ label, description, onUpload, className }: ImageUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [error, setError] = useState('')

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const upload = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        setError('Image is too large. Maximum size is 5MB.')
        setStatus('error')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)

      setFileName(file.name)
      setFileSize(file.size)
      setStatus('uploading')
      setProgress(0)
      setError('')

      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85))
      }, 100)

      try {
        const result = await uploadService.uploadFaceImage(file)

        clearInterval(interval)
        setProgress(100)
        setStatus('success')
        onUpload(result.id, result.filename)
      } catch (err: unknown) {
        clearInterval(interval)
        setStatus('error')
        setPreview(null)
        const axiosError = err as { response?: { data?: { message?: string } } }
        const message =
          axiosError.response?.data?.message ??
          'Upload failed. Please try again.'
        setError(message)
      }
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) upload(file)
    },
    [upload]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) upload(file)
    },
    [upload]
  )

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setPreview(null)
    setFileName('')
    setFileSize(0)
    setError('')
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium leading-none">{label}</label>

      {status === 'idle' || status === 'error' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            'hover:border-primary/50 hover:bg-primary/5',
            status === 'error' ? 'border-destructive' : 'border-border'
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'border rounded-lg p-4',
            status === 'uploading' && 'border-border',
            status === 'success' && 'border-emerald-200 bg-emerald-50/50'
          )}
        >
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
              )}
              {status === 'success' && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                {status === 'uploading' ? (
                  <span>Uploading... {formatSize(fileSize)}</span>
                ) : status === 'success' ? (
                  <span className="text-emerald-600">Uploaded successfully</span>
                ) : (
                  <span className="text-destructive">{error}</span>
                )}
              </p>

              {status === 'uploading' && (
                <div className="mt-2 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={reset}
              className="flex-shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
