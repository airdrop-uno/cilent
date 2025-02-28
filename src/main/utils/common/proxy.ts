import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

export class ProxyValidator {
  private static readonly TIMEOUT = 10000
  /**
   * 代理格式类型
   */
  private static readonly PROXY_PATTERNS = {
    // 基础格式：protocol://host:port
    BASIC: /^(http|https|socks4|socks5):\/\/([a-zA-Z0-9.-]+):(\d{1,5})$/,

    // 带认证格式：protocol://username:password@host:port
    AUTH: /^(http|https|socks4|socks5):\/\/([a-zA-Z0-9._-]+):([^@]+)@([a-zA-Z0-9.-]+):(\d{1,5})$/,

    // IP格式
    IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,

    // 域名格式
    DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/
  }

  /**
   * 验证代理格式
   */
  public static validateProxyFormat(proxy: string): {
    valid: boolean
    error?: string
    message?: string
    details?: {
      protocol: string
      host: string
      port: number
      username?: string
      password?: string
    }
  } {
    try {
      // 移除空白字符
      proxy = proxy.trim()

      // 检查是否为空
      if (!proxy) {
        return { valid: false, error: 'Proxy string is empty' }
      }

      let match: RegExpMatchArray | null

      // 尝试匹配带认证格式
      if ((match = proxy.match(this.PROXY_PATTERNS.AUTH))) {
        const [, protocol, username, password, host, portStr] = match
        const port = parseInt(portStr, 10)

        // 验证端口范围
        if (port < 1 || port > 65535) {
          return { valid: false, error: 'Invalid port number' }
        }

        // 验证主机格式
        if (!this.validateHost(host)) {
          return { valid: false, error: 'Invalid host format' }
        }

        return {
          valid: true,
          message: 'ok',
          details: {
            protocol,
            host,
            port,
            username,
            password
          }
        }
      }

      // 尝试匹配基础格式
      if ((match = proxy.match(this.PROXY_PATTERNS.BASIC))) {
        const [, protocol, host, portStr] = match
        const port = parseInt(portStr, 10)

        // 验证端口范围
        if (port < 1 || port > 65535) {
          return { valid: false, error: 'Invalid port number' }
        }

        // 验证主机格式
        if (!this.validateHost(host)) {
          return { valid: false, error: 'Invalid host format' }
        }

        return {
          valid: true,
          details: {
            protocol,
            host,
            port
          }
        }
      }

      return { valid: false, error: 'Invalid proxy format' }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error during validation'
      }
    }
  }

  /**
   * 验证主机格式（IP或域名）
   */
  private static validateHost(host: string): boolean {
    return this.PROXY_PATTERNS.IPV4.test(host) || this.PROXY_PATTERNS.DOMAIN.test(host)
  }

  /**
   * 格式化代理地址
   */
  public static formatProxy(details: { protocol: string; host: string; port: number; username?: string; password?: string }): string {
    const { protocol, host, port, username, password } = details
    if (username && password) {
      return `${protocol}://${username}:${password}@${host}:${port}`
    }
    return `${protocol}://${host}:${port}`
  }

  /**
   * 完整的代理验证（格式验证 + 连接测试）
   */
  public static async validateProxy(
    proxy: string,
    testUrl: string
  ): Promise<{
    valid: boolean
    error?: string
    responseTime?: number
    details?: {
      protocol: string
      host: string
      port: number
      username?: string
      password?: string
    }
  }> {
    // 首先验证格式
    const formatValidation = this.validateProxyFormat(proxy)
    if (!formatValidation.valid) {
      return formatValidation
    }

    // 然后测试连接
    try {
      const startTime = Date.now()
      const isConnectable = await this.testConnection(proxy, testUrl)
      const responseTime = Date.now() - startTime

      if (!isConnectable) {
        return {
          valid: false,
          error: 'Connection test failed',
          details: formatValidation.details
        }
      }

      return {
        valid: true,
        responseTime,
        details: formatValidation.details
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        details: formatValidation.details
      }
    }
  }

  /**
   * 获取代理代理
   */
  private static getProxyAgent(proxy: string) {
    try {
      if (proxy.startsWith('http')) {
        return new HttpsProxyAgent(proxy)
      }
      if (proxy.startsWith('socks')) {
        return new SocksProxyAgent(proxy)
      }
      throw new Error(`Unsupported proxy protocol: ${proxy}`)
    } catch (error) {
      throw new Error(`Failed to create proxy agent: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async testConnection(proxy: string, testUrl: string): Promise<boolean> {
    try {
      const formatValidation = this.validateProxyFormat(proxy)
      if (!formatValidation.valid) {
        return false
      }
      const agent = this.getProxyAgent(proxy)
      const response = await axios({
        method: 'GET',
        url: testUrl,
        httpsAgent: agent,
        timeout: this.TIMEOUT,
        validateStatus: (status) => status === 200
      })
      return response.status === 200
    } catch (error) {
      console.error(`Proxy test failed for ${proxy}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return false
    }
  }
}
