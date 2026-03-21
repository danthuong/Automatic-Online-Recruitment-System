import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Video, VideoOff, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui/button'
import { PhoneCameraConnector } from './PhoneCameraConnector'

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
      return devices.filter((d) => d.kind === 'videoinput')
    } catch {
      return [] as MediaDeviceInfo[]
    }
  }, [])

  const startCapture = useCallback(async () => {
    setLoading(true)
    try {
      const videoDevices = await enumerateCameras()

      if (videoDevices.length === 0) {
        setCamera0Info({ id: null, label: '', stream: null, error: 'No camera found. Please connect a webcam.' })
        onError?.(new Error('No camera found.'))
        setLoading(false)
        return
      }

      const faceCamera = videoDevices[0]
      setCamera0Info({ id: faceCamera.deviceId, label: faceCamera.label || 'Face Camera', stream: null, error: null })
      setCamera1Info({ id: null, label: 'Phone Camera', stream: null, error: null })

      const constraints0: MediaStreamConstraints = {
        video: {
          deviceId: faceCamera.deviceId ? { exact: faceCamera.deviceId } : undefined,
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
        },
        audio: false,
      }

      const mediaStream0 = await navigator.mediaDevices.getUserMedia(constraints0)
      setStream0(mediaStream0)
      setCamera0Info((prev) => ({ ...prev, stream: mediaStream0 }))

      if (videoRef0.current) {
        videoRef0.current.srcObject = mediaStream0
        await videoRef0.current.play()
      }

      setIsActive(true)
      // onStreamsReady?.(mediaStream0, mediaStream0)
      setStream1((currentStream1) => {
        if (currentStream1) {
           onStreamsReady?.(mediaStream0, currentStream1)
        } else {
           // Nếu chưa có stream1 thì cứ gửi stream0, stream1 sẽ null (tùy thuộc vào store của bạn)
           onStreamsReady?.(mediaStream0, mediaStream0) // Hoặc sửa lại logic này nếu store bạn cần
        }
        return currentStream1;
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      setCamera0Info((prev) => ({ ...prev, error: errorMessage }))
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }, [enumerateCameras, onStreamsReady, onError])

  const handlePhoneStreamReady = useCallback(
    (phoneStream: MediaStream) => {
      setStream1(phoneStream)
      setCamera1Info({ id: null, label: 'Phone Camera', stream: phoneStream, error: null })

      if (videoRef1.current) {
        videoRef1.current.srcObject = phoneStream
        videoRef1.current.play().catch(() => {})
      }

      // if (stream0) {
      //   onStreamsReady?.(stream0, phoneStream)
      // }
      setStream0((currentStream0) => {
        if (currentStream0) {
          onStreamsReady?.(currentStream0, phoneStream)
        }
        return currentStream0;
      })
    },
    [onStreamsReady]
  )

  const stopCapture = useCallback(() => {
    // if (stream0) {
    //   stream0.getTracks().forEach((t) => t.stop())
    //   setStream0(null)
    // }
    // if (stream1) {
    //   stream1.getTracks().forEach((t) => t.stop())
    //   setStream1(null)
    // }
    if (videoRef0.current) videoRef0.current.srcObject = null
    if (videoRef1.current) videoRef1.current.srcObject = null

    setIsActive(false)
    // setCamera0Info((prev) => ({ ...prev, stream: null }))
    // setCamera1Info((prev) => ({ ...prev, stream: null }))
    onStreamStopped?.()
  }, [onStreamStopped])

  useEffect(() => {
    startCapture()
  }, [])

  const handleRetryCamera = useCallback(() => {
    stopCapture()
    setTimeout(() => startCapture(), 100)
  }, [stopCapture, startCapture])

  const hasFaceCamera = !!stream0?.getVideoTracks().length
  const hasHandCamera = !!stream1?.getVideoTracks().length

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-4">
        {[
          { ref: videoRef0, info: camera0Info, name: 'Face Camera' },
          { ref: videoRef1, info: camera1Info, name: 'Hand Camera' },
        ].map((cam, idx) => (
          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                <Loader2 className="h-10 w-10 animate-spin mb-3" />
                <p className="text-sm">Starting camera...</p>
              </div>
            )}

            {!loading && cam.info.error && !cam.info.stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
                <p className="text-sm text-red-400 text-center px-4">{cam.info.error}</p>
                {cam.name === 'Face Camera' && (
                  <Button onClick={handleRetryCamera} variant="outline" size="sm" className="mt-3 text-white border-white/50">
                    Retry
                  </Button>
                )}
              </div>
            )}

            {!loading && !cam.info.error && !cam.info.stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Video className="h-12 w-12 text-slate-500 mb-3" />
                <p className="text-sm text-slate-400">{cam.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {cam.name === 'Hand Camera' ? 'Scan QR code below' : 'Starting...'}
                </p>
              </div>
            )}

            <video
              ref={cam.ref as React.RefObject<HTMLVideoElement>}
              autoPlay
              playsInline
              muted
              style={idx === 1 ? { transform: 'rotate(90deg) scale(1.8)' } : undefined}
              // 2. Class CSS mặc định (Face camera thì xài Tailwind scale-x-[-1])
              className={cn(
                'w-full h-full object-cover transition-transform duration-300',
                idx === 0 ? 'transform scale-x-[-1]' : '' 
              )}
            />

            {idx === 0 && hasFaceCamera && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 bg-red-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
            )}

            {idx === 1 && hasHandCamera && (
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

      <PhoneCameraConnector onStreamReady={handlePhoneStreamReady} onError={onError ?? (() => {})} />
    </div>
  )
}
