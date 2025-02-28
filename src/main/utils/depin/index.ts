import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
export const getProxyAgent = (proxy?: string) => {
  if (!proxy) return null
  if (proxy.startsWith('http')) return new HttpsProxyAgent(proxy)
  if (proxy.startsWith('socks4') || proxy.startsWith('socks5')) return new SocksProxyAgent(proxy)
  throw new Error(`Unsupported proxy protocol: ${proxy}`)
}
