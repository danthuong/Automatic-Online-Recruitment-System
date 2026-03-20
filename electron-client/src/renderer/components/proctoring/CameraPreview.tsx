import React, { useRef, useState, useCallback } from 'react'
import { Video, VideoOff } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui/button'

interface CameraPreviewProps {
  onStreamReady?: (stream: MediaStream) => void
  onError?: (error: Error) => void
  className?: string
}

export function CameraPreview({
  onStreamReady,
  onError,
  className,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[Camera] Requesting camera access...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
        },
        audio: false,
      })

      console.log('[Camera] Stream obtained:', mediaStream.getVideoTracks().length, 'video tracks')

      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        
        try {
          await videoRef.current.play()
          console.log('[Camera] Video playback started')
        } catch (playError) {
          console.error('[Camera] Play error:', playError)
        }
      }

      setIsActive(true)
      onStreamReady?.(mediaStream)
      
    } catch (err) {
      console.error('[Camera] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera'
      setError(errorMessage)
      setIsActive(false)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [onStreamReady, onError])

  const stopCamera = useCallback(() => {
    if (stream) {
      console.log('[Camera] Stopping camera...')
      stream.getTracks().forEach(track => {
        console.log('[Camera] Stopping track:', track.kind)
        track.stop()
      })
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
    console.log('[Camera] Camera stopped')
  }, [stream])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
        {!isActive && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Video className="h-16 w-16 text-slate-500 mb-4" />
            <p className="text-sm text-slate-400">Camera preview will appear here</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-sm">Accessing camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <VideoOff className="h-16 w-16 text-red-400 mb-4" />
            <p className="text-sm text-red-400 text-center px-4">{error}</p>
            <p className="text-xs text-slate-400 mt-2">Please allow camera access and try again</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover',
            isActive ? 'transform scale-x-[-1]' : 'hidden'
          )}
        />

        {isActive && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-red-500/90 text-white text-xs font-medium rounded-full flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}

        {isActive && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2 py-1 bg-black/50 text-white text-xs rounded flex items-center gap-1">
              <Video className="h-3 w-3" />
              Camera Active
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={isActive ? stopCamera : startCamera}
          variant={isActive ? 'destructive' : 'default'}
          className="min-w-[160px]"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Loading...
            </>
          ) : isActive ? (
            <>
              <VideoOff className="h-4 w-4 mr-2" />
              Stop Camera
            </>
          ) : (
            <>
              <Video className="h-4 w-4 mr-2" />
              Start Camera
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
