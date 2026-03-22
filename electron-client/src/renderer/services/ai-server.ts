let _serverUrl: string | null = null
const AI_PORT = 8765

export function getCachedServerUrl(): string | null {
  return _serverUrl
}

export async function getAIServerUrl(): Promise<string> {
  if (_serverUrl) return _serverUrl

  // 1. Try to detect LAN IP via RTCPeerConnection (no data sent, no SSL needed)
  const lanIp = await _detectLanIp()
  if (lanIp) {
    console.log('[AIServer] Detected LAN IP:', lanIp)
    const url = `https://${lanIp}:${AI_PORT}`
    if (await _verifyServer(url)) {
      _serverUrl = url
      console.log('[AIServer] Resolved URL:', _serverUrl)
      return _serverUrl
    }
  }

  // 2. Try localhost
  const localhostUrl = `https://localhost:${AI_PORT}`
  if (await _verifyServer(localhostUrl)) {
    _serverUrl = localhostUrl
    console.log('[AIServer] Resolved URL:', _serverUrl)
    return _serverUrl
  }

  // 3. Try common gateway IPs
  const commonGateways = ['192.168.1.1', '192.168.0.1', '10.0.0.1']
  for (const ip of commonGateways) {
    const url = `https://${ip}:${AI_PORT}`
    if (await _verifyServer(url)) {
      _serverUrl = url
      console.log('[AIServer] Resolved URL:', _serverUrl)
      return _serverUrl
    }
  }

  // 4. Last resort fallback
  _serverUrl = lanIp ? `https://${lanIp}:${AI_PORT}` : localhostUrl
  console.log('[AIServer] Falling back to:', _serverUrl)
  return _serverUrl
}

async function _verifyServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      console.log('[AIServer] Verified server at', url, '- status:', data.status)
      return true
    }
  } catch (err) {
    console.log('[AIServer] Server not reachable at', url, '-', (err as Error).message)
  }
  return false
}

async function _detectLanIp(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.onicecandidate = (e) => {
        if (e.candidate && e.candidate.candidate.includes('c_ip4')) {
          const parts = e.candidate.candidate.split(' ')
          const ip = parts[parts.length - 1]
          if (ip && ip !== '127.0.0.1' && !ip.startsWith('10.') && !ip.startsWith('172.')) {
            resolve(ip)
          }
        }
      }
      pc.createOffer().then((o) => pc.setLocalDescription(o))
      setTimeout(() => { resolve(null) }, 2000)
    } catch {
      resolve(null)
    }
  })
}
