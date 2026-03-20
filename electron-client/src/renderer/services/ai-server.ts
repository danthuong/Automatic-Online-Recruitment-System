let _serverUrl: string | null = null
const AI_PORT = 8765

export async function getAIServerUrl(): Promise<string> {
  if (_serverUrl) return _serverUrl

  const tryUrl = async (base: string): Promise<boolean> => {
    try {
      const res = await fetch(`${base}/qr/info`, { signal: AbortSignal.timeout(2000) })
      if (res.ok) {
        const data = (await res.json()) as { ip: string }
        _serverUrl = `https://${data.ip}:${AI_PORT}`
        console.log('[AIServer] Resolved URL:', _serverUrl)
        return true
      }
    } catch {
      // try next
    }
    return false
  }

  // 1. Try localhost first (server on same machine)
  if (await tryUrl('https://localhost:8765')) return _serverUrl!

  // 2. Try to detect own LAN IP via RTCPeerConnection (no data sent)
  try {
    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('')
    await new Promise<void>((resolve) => {
      pc.onicecandidate = (e) => {
        if (e.candidate && e.candidate.candidate.includes('c_ip4')) {
          const parts = e.candidate.candidate.split(' ')
          const ip = parts[parts.length - 1]
          if (ip && ip !== '127.0.0.1') {
            _serverUrl = `https://${ip}:${AI_PORT}`
          }
        }
      }
      pc.createOffer().then((o) => pc.setLocalDescription(o))
      setTimeout(() => { resolve() }, 1500)
    })
    pc.close()
  } catch {
    // RTC detection failed
  }

  if (_serverUrl) {
    console.log('[AIServer] Detected LAN IP via RTCPeerConnection:', _serverUrl)
    return _serverUrl!
  }

  // 3. Last resort
  _serverUrl = `https://localhost:${AI_PORT}`
  console.log('[AIServer] Falling back to:', _serverUrl)
  return _serverUrl
}
