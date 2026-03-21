import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/renderer/components/ui/button'
import { cn } from '@/renderer/lib/utils'
import { useTheme } from '@/renderer/hooks/useTheme'
import { Smartphone, Wifi, WifiOff, CheckCircle2, Loader2 } from 'lucide-react'
import { getAIServerUrl, getCachedServerUrl } from '@/renderer/services/ai-server'

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
  const autoConnectRef = useRef(false)

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [phoneUrl, setPhoneUrl] = useState<string>('')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [isLoadingQr, setIsLoadingQr] = useState(true)
  const [serverUrl, setServerUrl] = useState<string | null>(null)

  const loadQrCode = useCallback(async () => {
    try {
      const baseUrl = await getAIServerUrl()
      setServerUrl(baseUrl)
      const res = await fetch(`${baseUrl}/qr/info`, {
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return
      const data = await res.json()
      setQrDataUrl(data.qr)
      setPhoneUrl(data.url)
      setIsLoadingQr(false)
    } catch {
      setServerUrl(getCachedServerUrl())
      setIsLoadingQr(false)
    }
  }, [])

  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current

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

    peerConnectionRef.current = pc
    return pc
  }, [onStreamReady])

  const connectSignaling = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (socketRef.current) {
        resolve()
        return
      }

      getAIServerUrl().then((serverUrl) => {
        const socket = window.io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
          timeout: 20000,
        })

        socketRef.current = socket

        socket.on('connect', () => {
          console.log('[PhoneCamera] Connected to signaling, socket.id:', socket.id)
          socket.emit('exam_join', {})
          createPeerConnection()
          setStatus('waiting')
          resolve()
        })

        socket.on('connect_error', (err: any) => {
          console.error('[PhoneCamera] Connection error:', err.message)
          setStatus('error')
          setErrorMsg('Cannot connect to server')
          if (autoConnectRef.current) {
            reject(new Error('Cannot connect to signaling server'))
          }
        })

        socket.on('disconnect', () => {
          console.log('[PhoneCamera] Disconnected from signaling')
          if (autoConnectRef.current) {
            setStatus('idle')
            setErrorMsg('Disconnected. Retrying...')
          }
        })

        socket.on('exam_ready', () => {
          console.log('[PhoneCamera] Exam ready - phone joined')
        })

        socket.on('offer', async (data: any) => {
          console.log('[PhoneCamera] Received offer')
          const pc = peerConnectionRef.current
          if (!pc) {
            console.log('[PhoneCamera] No peer connection, creating now')
            createPeerConnection()
          }

          try {
            const activePc = peerConnectionRef.current
            if (!activePc) return

            await activePc.setRemoteDescription(new RTCSessionDescription(data))
            const answer = await activePc.createAnswer()
            await activePc.setLocalDescription(answer)
            socket.emit('answer', {
              sdp: answer.sdp,
              type: answer.type,
            })
            console.log('[PhoneCamera] Answer sent')
          } catch (err) {
            console.error('[PhoneCamera] Answer error:', err)
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
      }).catch((err) => {
        reject(err)
      })
    })
  }, [createPeerConnection])

  const disconnect = useCallback(() => {
    autoConnectRef.current = false
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

  const retryConnection = useCallback(() => {
    disconnect()
    setTimeout(() => {
      autoConnectRef.current = true
      setStatus('connecting')
      connectSignaling().catch(() => {})
    }, 500)
  }, [disconnect, connectSignaling])

  useEffect(() => {
    loadQrCode()
    autoConnectRef.current = true

    setStatus('connecting')
    connectSignaling().catch(() => {})

    return () => {
      disconnect()
    }
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

            {serverUrl && (
              <p className={cn(
                'mt-1 text-xs text-indigo-500/70',
                theme === 'dark' ? 'text-indigo-400/50' : 'text-indigo-400/70'
              )}>
                Server: {serverUrl}
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
              <li>Open your phone browser</li>
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
                {status === 'idle' && 'Not connected'}
                {status === 'connecting' && 'Connecting to server...'}
                {status === 'waiting' && 'Waiting for phone...'}
                {status === 'connected' && 'Phone camera connected!'}
                {status === 'error' && (errorMsg || 'Connection error')}
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              {status === 'error' ? (
                <Button onClick={retryConnection} className="flex-1" size="sm">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              ) : status === 'connected' ? (
                <Button onClick={disconnect} variant="destructive" className="flex-1" size="sm">
                  Disconnect
                </Button>
              ) : (
                <Button onClick={retryConnection} variant="outline" className="flex-1" size="sm" disabled>
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
