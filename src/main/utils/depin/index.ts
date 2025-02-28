import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
export const getProxyAgent = (proxy?: string) => {
  if (!proxy) return null
  if (proxy.startsWith('http')) return new HttpsProxyAgent(proxy)
  if (proxy.startsWith('socks')) return new SocksProxyAgent(proxy)
  throw new Error(`Unsupported proxy protocol: ${proxy}`)
}

export const getPublicIP = async (proxy?: string): Promise<string> => {
  const httpsAgent = getProxyAgent(proxy)
  const response = await axios.get('https://api.ipify.org/?format=json', {
    httpsAgent
  })
  return response.data.ip
}
export const ProxyRegex =
  /^(https?|socks[4-5]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/
