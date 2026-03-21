import { useCallback, useState } from 'react'
import { Upload, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadService } from '@/services/uploadService'

interface FileUploadProps {
  accept: string
  maxSize: number
  label: string
  description: string
  onUpload: (fileId: string, filename: string) => void
  className?: string
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function FileUpload({
  accept,
  maxSize,
  label,
  description,
  onUpload,
  className,
}: FileUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [error, setError] = useState('')

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatMaxSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${bytes / 1024}KB`
    return `${bytes / (1024 * 1024)}MB`
  }

  const upload = useCallback(
    async (file: File) => {
      if (file.size > maxSize) {
        setError(`File is too large. Maximum size is ${formatMaxSize(maxSize)}.`)
        setStatus('error')
        return
      }

      setFileName(file.name)
      setFileSize(file.size)
      setStatus('uploading')
      setProgress(0)
      setError('')

      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85))
      }, 100)

      try {
        const isCv = accept.includes('pdf') || accept.includes('word')
        const result = isCv
          ? await uploadService.uploadCv(file)
          : await uploadService.uploadFaceImage(file)

        clearInterval(interval)
        setProgress(100)
        setStatus('success')
        onUpload(result.id, result.filename)
      } catch (err: unknown) {
        clearInterval(interval)
        setStatus('error')
        const axiosError = err as { response?: { data?: { message?: string } } }
        const message =
          axiosError.response?.data?.message ??
          'Upload failed. Please try again.'
        setError(message)
      }
    },
    [maxSize, accept, onUpload]
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
    setFileName('')
    setFileSize(0)
    setError('')
  }

  if (status === 'idle') {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="text-sm font-medium leading-none">{label}</label>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors cursor-pointer',
            'hover:border-primary/50 hover:bg-primary/5'
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="text-sm font-medium leading-none">{label}</label>
        <div className="border border-destructive rounded-lg p-4 bg-destructive/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-destructive">{error}</p>
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
      </div>
    )
  }

  if (status === 'uploading') {
    return (
      <div className={cn('space-y-2', className)}>
        <label className="text-sm font-medium leading-none">{label}</label>
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Upload className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <p className="text-xs text-muted-foreground">Uploading... {formatSize(fileSize)}</p>
              <div className="mt-2 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
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
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium leading-none">{label}</label>
      <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-emerald-600">{formatSize(fileSize)} uploaded</p>
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
    </div>
  )
}
