import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Video, VideoOff, AlertCircle } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui/button'

interface MultiCameraCaptureProps {
  onStreamsReady?: (stream0: MediaStream, stream1: MediaStream) => void
  onStreamStopped?: () => void
  onError?: (error: Error) => void
  className?: string
}

interface CameraInfo {
  id: string | null
  label: string
  stream: MediaStream | null
  error: string | null
}

export function MultiCameraCapture({
  onStreamsReady,
  onStreamStopped,
  onError,
  className,
}: MultiCameraCaptureProps) {
  const videoRef0 = useRef<HTMLVideoElement>(null)
  const videoRef1 = useRef<HTMLVideoElement>(null)
  const [stream0, setStream0] = useState<MediaStream | null>(null)
  const [stream1, setStream1] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [camera0Info, setCamera0Info] = useState<CameraInfo>({ id: null, label: '', stream: null, error: null })
  const [camera1Info, setCamera1Info] = useState<CameraInfo>({ id: null, label: '', stream: null, error: null })

  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
      return videoDevices
    } catch {
      return []
    }
  }, [])

  const startCapture = useCallback(async () => {
    setLoading(true)

    try {
      const videoDevices = await enumerateCameras()

      if (videoDevices.length < 2) {
        throw new Error('Need at least 2 cameras. Please connect a second camera.')
      }

      setCamera0Info({ id: videoDevices[0].deviceId, label: videoDevices[0].label || 'Camera 1', stream: null, error: null })
      setCamera1Info({ id: videoDevices[1].deviceId, label: videoDevices[1].label || 'Camera 2', stream: null, error: null })

      const constraints0: MediaStreamConstraints = {
        video: {
          deviceId: videoDevices[0].deviceId ? { exact: videoDevices[0].deviceId } : undefined,
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
        },
        audio: false,
      }

      const constraints1: MediaStreamConstraints = {
        video: {
          deviceId: videoDevices[1].deviceId ? { exact: videoDevices[1].deviceId } : undefined,
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
        },
        audio: false,
      }

      const [mediaStream0, mediaStream1] = await Promise.all([
        navigator.mediaDevices.getUserMedia(constraints0),
        navigator.mediaDevices.getUserMedia(constraints1),
      ])

      setStream0(mediaStream0)
      setStream1(mediaStream1)
      setCamera0Info((prev) => ({ ...prev, stream: mediaStream0 }))
      setCamera1Info((prev) => ({ ...prev, stream: mediaStream1 }))

      if (videoRef0.current) {
        videoRef0.current.srcObject = mediaStream0
        await videoRef0.current.play()
      }
      if (videoRef1.current) {
        videoRef1.current.srcObject = mediaStream1
        await videoRef1.current.play()
      }

      setIsActive(true)
      onStreamsReady?.(mediaStream0, mediaStream1)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access cameras'
      setCamera0Info((prev) => ({ ...prev, error: errorMessage }))
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }, [enumerateCameras, onStreamsReady, onError])

  const stopCapture = useCallback(() => {
    if (stream0) {
      stream0.getTracks().forEach((t) => t.stop())
      setStream0(null)
    }
    if (stream1) {
      stream1.getTracks().forEach((t) => t.stop())
      setStream1(null)
    }
    if (videoRef0.current) videoRef0.current.srcObject = null
    if (videoRef1.current) videoRef1.current.srcObject = null

    setIsActive(false)
    setCamera0Info((prev) => ({ ...prev, stream: null }))
    setCamera1Info((prev) => ({ ...prev, stream: null }))
    onStreamStopped?.()
  }, [stream0, stream1, onStreamStopped])

  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  const hasError = camera0Info.error || camera1Info.error

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-4">
        {[{ ref: videoRef0, info: camera0Info, name: 'Face Camera' },
          { ref: videoRef1, info: camera1Info, name: 'Hand Camera' }].map((cam, idx) => (
          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
            {!isActive && !cam.info.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Video className="h-12 w-12 text-slate-500 mb-3" />
                <p className="text-sm text-slate-400">{cam.name}</p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                <p className="text-sm">Starting cameras...</p>
              </div>
            )}

            {cam.info.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                <p className="text-sm text-red-400 text-center px-4">{cam.info.error}</p>
              </div>
            )}

            <video
              ref={cam.ref as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              className={cn(
                'w-full h-full object-cover',
                isActive ? 'transform scale-x-[-1]' : 'hidden'
              )}
            />

            {isActive && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 bg-red-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 right-2">
              <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <p className="text-white text-xs">{cam.name}</p>
                <p className="text-slate-400 text-xs">{cam.info.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button
          onClick={isActive ? stopCapture : startCapture}
          variant={isActive ? 'destructive' : 'default'}
          disabled={loading}
          className="min-w-[160px]"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Loading...
            </>
          ) : isActive ? (
            <>
              <VideoOff className="h-4 w-4 mr-2" />
              Stop Cameras
            </>
          ) : (
            <>
              <Video className="h-4 w-4 mr-2" />
              Start Cameras
            </>
          )}
        </Button>
      </div>

      {hasError && (
        <p className="text-center text-sm text-red-500">
          {camera0Info.error || camera1Info.error}
        </p>
      )}
    </div>
  )
}
