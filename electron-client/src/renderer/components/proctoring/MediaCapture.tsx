import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Microscope, Play, Square, Pause, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/renderer/lib/utils'
import { Button } from '@/renderer/components/ui/button'

interface MediaCaptureProps {
  onStreamReady?: (stream: MediaStream) => void
  onStreamUpdate?: (stream: MediaStream) => void
  onStreamStopped?: () => void
  onAudioLevel?: (level: number) => void
  onError?: (error: Error) => void
  className?: string
}

export function MediaCapture({
  onStreamReady,
  onStreamUpdate,
  onStreamStopped,
  onAudioLevel,
  onError,
  className,
}: MediaCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [hasAudio, setHasAudio] = useState(false)
  const [isMicTesting, setIsMicTesting] = useState(false)
  const [micTestComplete, setMicTestComplete] = useState(false)
  const [micTestAudio, setMicTestAudio] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const startCapture = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setMicTestComplete(false)
    setMicTestAudio(null)
    setIsPlaying(false)

    try {
      console.log('[MediaCapture] Requesting camera and microphone access...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      console.log('[MediaCapture] Stream obtained:', {
        video: mediaStream.getVideoTracks().length,
        audio: mediaStream.getAudioTracks().length
      })

      setStream(mediaStream)
      setHasAudio(mediaStream.getAudioTracks().length > 0)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        try {
          await videoRef.current.play()
          console.log('[MediaCapture] Video playback started')
        } catch (playError) {
          console.error('[MediaCapture] Play error:', playError)
        }
      }

      setupAudioAnalyser(mediaStream)

      setIsActive(true)
      onStreamReady?.(mediaStream)
      
    } catch (err) {
      console.error('[MediaCapture] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to access media devices'
      setError(errorMessage)
      setIsActive(false)
      onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }, [onStreamReady, onError])

  const setupAudioAnalyser = useCallback((mediaStream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(mediaStream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        if (!analyserRef.current) return

        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalizedLevel = Math.min(100, (average / 128) * 100)
        
        setAudioLevel(normalizedLevel)
        onAudioLevel?.(normalizedLevel)
        
        animationRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
      console.log('[MediaCapture] Audio analyser started')
    } catch (err) {
      console.error('[MediaCapture] Audio setup error:', err)
    }
  }, [onAudioLevel])

  const testMicrophone = useCallback(() => {
    if (!stream || !hasAudio) return

    setIsMicTesting(true)
    setIsPlaying(false)
    setMicTestComplete(false)
    audioChunksRef.current = []

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    try {
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setMicTestAudio(audioUrl)
        setMicTestComplete(true)
        setIsMicTesting(false)
        console.log('[MediaCapture] Mic test recording complete')
      }

      mediaRecorder.start()
      console.log('[MediaCapture] Mic test recording started')

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, 3000)
    } catch (err) {
      console.error('[MediaCapture] Mic test error:', err)
      setIsMicTesting(false)
    }
  }, [stream, hasAudio])

  const stopCapture = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    if (micTestAudio) {
      URL.revokeObjectURL(micTestAudio)
    }

    if (stream) {
      console.log('[MediaCapture] Stopping all tracks...')
      stream.getTracks().forEach(track => {
        console.log('[MediaCapture] Stopping track:', track.kind, track.label)
        track.stop()
      })
      setStream(null)
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setAudioLevel(0)
    setHasAudio(false)
    setIsActive(false)
    setMicTestComplete(false)
    setMicTestAudio(null)
    setIsPlaying(false)
    console.log('[MediaCapture] All stopped')
    
    onStreamStopped?.()
  }, [stream, micTestAudio])

  useEffect(() => {
    return () => {
      stopCapture()
    }
  }, [])

  useEffect(() => {
    if (!stream || !onStreamUpdate) return

    const checkStreamStatus = () => {
      if (stream) {
        onStreamUpdate(stream)
      }
    }

    const interval = setInterval(checkStreamStatus, 1000)
    return () => clearInterval(interval)
  }, [stream, onStreamUpdate])

  const getAudioLevelColor = () => {
    if (audioLevel > 70) return 'bg-red-500'
    if (audioLevel > 40) return 'bg-amber-500'
    return 'bg-primary'
  }

  const isReady = isActive && hasAudio

  return (
    <div className={cn('space-y-4', className)}>
      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
        {!isActive && !isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Video className="h-16 w-16 text-slate-500 mb-4" />
            <p className="text-sm text-slate-400"> Camera preview will appear here</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-sm">Accessing camera and microphone...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <VideoOff className="h-16 w-16 text-red-400 mb-4" />
            <p className="text-sm text-red-400 text-center px-4">{error}</p>
            <p className="text-xs text-slate-400 mt-2">Please allow camera and microphone access</p>
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
          <div className="absolute top-3 right-3 flex gap-2">
            <span className="px-3 py-1 bg-red-500/90 text-white text-xs font-medium rounded-full flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}

        {isActive && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-white text-xs">
                  {isActive ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-primary" />
                      <span>Camera OK</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-amber-400" />
                      <span>Camera Inactive</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-white text-xs">
                  {hasAudio ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-primary" />
                      <span>Mic OK</span>
                    </>
                  ) : (
                    <>
                      <MicOff className="h-3 w-3 text-amber-400" />
                      <span>Mic Inactive</span>
                    </>
                  )}
                </div>
              </div>

              {hasAudio && (
                <div className="flex items-center gap-2">
                  <VolumeX className="h-3 w-3 text-slate-400" />
                  <div className="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-100',
                        getAudioLevelColor()
                      )}
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <Volume2 className="h-3 w-3 text-slate-400" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-center gap-3">
          <Button
            onClick={isActive ? stopCapture : startCapture}
            variant={isActive ? 'destructive' : 'default'}
            className="min-w-[140px]"
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
                Stop
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Start Camera
              </>
            )}
          </Button>

          {isActive && hasAudio && (
            <Button
              variant={micTestComplete ? 'outline' : 'secondary'}
              onClick={testMicrophone}
              disabled={isMicTesting}
              className="min-w-[120px]"
            >
              {isMicTesting ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Recording...
                </>
              ) : micTestComplete ? (
                <>
                  <Microscope className="h-4 w-4 mr-2 text-primary" />
                  Tested
                </>
              ) : (
                <>
                  <Microscope className="h-4 w-4 mr-2" />
                  Test Mic
                </>
              )}
            </Button>
          )}
        </div>

        {micTestAudio && (
          <div className="flex items-center justify-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-bottom">
            <audio
              ref={audioRef}
              src={micTestAudio}
              onEnded={() => setIsPlaying(false)}
            />
            <button
              onClick={() => {
                if (!audioRef.current) return
                if (isPlaying) {
                  audioRef.current.pause()
                  audioRef.current.currentTime = 0
                } else {
                  audioRef.current.play()
                }
                setIsPlaying(!isPlaying)
              }}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary hover:bg-primary/80 transition-colors"
            >
              {isPlaying ? (
                <Square className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white ml-0.5" />
              )}
            </button>
            <span className="text-sm text-primary font-medium">
              {isPlaying ? 'Playing...' : 'Tap to play recording'}
            </span>
          </div>
        )}
      </div>

      <div className="text-center text-sm">
        {isReady ? (
          <p className="text-primary flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Camera and microphone are ready
          </p>
        ) : (
          <p className="text-muted-foreground">
            Start camera and microphone to continue
          </p>
        )}
      </div>
    </div>
  )
}
