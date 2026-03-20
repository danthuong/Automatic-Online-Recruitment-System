import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/renderer/components/ui/button'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'
import { Smartphone, Wifi, WifiOff, CheckCircle2, Loader2 } from 'lucide-react'

const AI_SERVER_URL = 'http://127.0.0.1:8765'

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

type ConnectionStatus = 'idle' | 'connecting' | 'waiting' | 'connected' | 'error'

interface PhoneCameraConnectorProps {
  onStreamReady: (stream: MediaStream) => void
  onError: (error: Error) => void
  className?: string
}

declare global {
  interface Window {
    io: any
  }
}

export function PhoneCameraConnector({
  onStreamReady,
  onError,
  className,
}: PhoneCameraConnectorProps) {
  const { theme } = useTheme()
  const videoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<any>(null)

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [phoneUrl, setPhoneUrl] = useState<string>('')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isLoadingQr, setIsLoadingQr] = useState(true)
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadQrCode = useCallback(async () => {
    try {
      const res = await fetch(`${AI_SERVER_URL}/qr/info`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return
      const data = await res.json()
      setQrDataUrl(data.qr)
      setPhoneUrl(data.url)
      setIsLoadingQr(false)
    } catch {
      setIsLoadingQr(false)
    }
  }, [])

  useEffect(() => {
    loadQrCode()
    qrPollRef.current = setInterval(loadQrCode, 5000)

    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current)
      disconnect()
    }
  }, [loadQrCode])

  const connect = useCallback(async () => {
    if (status !== 'idle') return

    setStatus('connecting')
    setErrorMsg('')

    try {
      await loadQrCode()

      if (!window.io) {
        await loadSocketIO()
      }

      await connectSignaling()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setErrorMsg(msg)
      setStatus('error')
      onError(new Error(msg))
    }
  }, [status, loadQrCode, onError])

  const loadSocketIO = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.io) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Socket.IO'))
      document.head.appendChild(script)
    })
  }

  const connectSignaling = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = window.io(`${AI_SERVER_URL}`, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      })

      socketRef.current = socket

      socket.on('connect', async () => {
        console.log('[PhoneCamera] Connected to signaling')
        socket.emit('exam_join', {})

        const pc = createPeerConnection()
        peerConnectionRef.current = pc

        setStatus('waiting')
        resolve()
      })

      socket.on('connect_error', (err: any) => {
        console.error('[PhoneCamera] Connection error:', err.message, '| Type:', err.type, '| Context:', JSON.stringify(err.context || {}))
        reject(new Error('Cannot connect to signaling server: ' + (err.message || 'connection rejected')))
      })

      socket.on('disconnect', () => {
        console.log('[PhoneCamera] Disconnected from signaling')
        setStatus('error')
        setErrorMsg('Disconnected from server')
      })

      socket.on('phone_joined', (data: any) => {
        console.log('[PhoneCamera] Phone joined:', data)
      })

      socket.on('offer', async (data: any) => {
        console.log('[PhoneCamera] Received offer')
        if (!peerConnectionRef.current) return

        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data)
          )
          const answer = await peerConnectionRef.current.createAnswer()
          await peerConnectionRef.current.setLocalDescription(answer)
          socket.emit('answer', {
            sdp: answer.sdp,
            type: answer.type,
          })
          console.log('[PhoneCamera] Answer sent')
        } catch (err) {
          console.error('[PhoneCamera] Offer handling error:', err)
        }
      })

      socket.on('ice_candidate', async (data: any) => {
        if (!peerConnectionRef.current || !data.candidate) return
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          )
        } catch (err) {
          console.error('[PhoneCamera] ICE add error:', err)
        }
      })
    })
  }

  const createPeerConnection = (): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('ice_candidate', {
          candidate: e.candidate.toJSON(),
        })
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log('[PhoneCamera] ICE state:', pc.iceConnectionState)
      if (pc.iceConnectionState === 'connected') {
        setStatus('connected')
      } else if (pc.iceConnectionState === 'failed') {
        setStatus('error')
        setErrorMsg('Connection failed. Check network.')
      }
    }

    pc.ontrack = (e) => {
      console.log('[PhoneCamera] Received track:', e.track.kind)
      if (e.streams && e.streams[0]) {
        const stream = e.streams[0]

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }

        setStatus('connected')
        onStreamReady(stream)
      }
    }

    return pc
  }

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus('idle')
    setErrorMsg('')
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className={cn(
            'text-sm font-medium mb-3',
            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          )}>
            Scan QR Code
          </h4>

          <div className={cn(
            'rounded-xl border p-4 flex flex-col items-center justify-center',
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
          )}>
            {isLoadingQr ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-48 h-48 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-sm text-center p-4">
                QR code unavailable. Check if server is running.
              </div>
            )}

            {phoneUrl && (
              <p className={cn(
                'mt-2 text-xs font-mono',
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              )}>
                {phoneUrl}
              </p>
            )}
          </div>

          <div className={cn(
            'mt-3 p-3 rounded-lg text-xs',
            theme === 'dark' ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-500'
          )}>
            <p className="font-medium mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Connect phone to the same WiFi network</li>
              <li>Open your phone's camera app</li>
              <li>Scan the QR code above</li>
              <li>Allow camera access on your phone</li>
              <li>Position hands in frame</li>
            </ol>
          </div>
        </div>

        <div>
          <h4 className={cn(
            'text-sm font-medium mb-3',
            theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
          )}>
            Connection Status
          </h4>

          <div className={cn(
            'rounded-xl border p-4',
            theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'
          )}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                'w-full aspect-video rounded-lg object-cover mb-4',
                status === 'connected' ? 'block' : 'hidden'
              )}
            />

            <div className={cn(
              'flex items-center gap-2 p-3 rounded-lg text-sm font-medium',
              status === 'idle' && 'bg-slate-100 dark:bg-slate-800 text-slate-500',
              status === 'connecting' && 'bg-blue-500/10 text-blue-600',
              status === 'waiting' && 'bg-amber-500/10 text-amber-600',
              status === 'connected' && 'bg-green-500/10 text-green-600',
              status === 'error' && 'bg-red-500/10 text-red-600',
            )}>
              {status === 'idle' && <Wifi className="w-4 h-4" />}
              {status === 'connecting' && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === 'waiting' && <Smartphone className="w-4 h-4 animate-pulse" />}
              {status === 'connected' && <CheckCircle2 className="w-4 h-4" />}
              {status === 'error' && <WifiOff className="w-4 h-4" />}
              <span>
                {status === 'idle' && 'Waiting to connect'}
                {status === 'connecting' && 'Connecting to server...'}
                {status === 'waiting' && 'Waiting for phone...'}
                {status === 'connected' && 'Phone camera connected!'}
                {status === 'error' && (errorMsg || 'Connection error')}
              </span>
            </div>

            {status !== 'connected' && (
              <p className={cn(
                'mt-2 text-xs',
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              )}>
                {status === 'waiting'
                  ? 'Ask the examinee to scan the QR code with their phone camera'
                  : status === 'connecting'
                    ? 'Establishing connection to the exam server...'
                    : 'Click Connect to start'}
              </p>
            )}

            {status === 'connected' && (
              <p className={cn(
                'mt-2 text-xs text-green-600 dark:text-green-400'
              )}>
                Camera feed is being processed for hand gesture detection
              </p>
            )}

            <div className="mt-4 flex gap-2">
              {status === 'idle' || status === 'error' ? (
                <Button onClick={connect} className="flex-1" size="sm">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Connect
                </Button>
              ) : status === 'connected' ? (
                <Button onClick={disconnect} variant="destructive" className="flex-1" size="sm">
                  Disconnect
                </Button>
              ) : (
                <Button onClick={disconnect} variant="outline" className="flex-1" size="sm" disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {status === 'connecting' ? 'Connecting...' : 'Waiting...'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
