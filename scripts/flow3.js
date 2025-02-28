/**
 * Flow3 机器人核心模块
 * 作者：小林
 * 实现与Flow3平台的交互，包括登录、带宽共享和积分查询
 */
const { getProxyAgent } = require('./proxy')
const UserAgent = require('user-agents')
const axios = require('axios')
const bs58 = require('bs58')
const nacl = require('tweetnacl')
const { Keypair } = require('@solana/web3.js')
const { logMessage } = require('../utils/logger')
const userAgent = new UserAgent().toString()

module.exports = class flow3Bot {
  /**
   * 创建Flow3机器人实例
   * @param {string} account - 账户私钥
   * @param {string|null} proxy - 代理服务器地址
   * @param {number} currentNum - 当前处理的账户编号
   * @param {number} total - 账户总数
   */
  constructor(account, proxy = null, currentNum, total) {
    this.currentNum = currentNum
    this.total = total
    this.token = null
    this.proxy = proxy
    this.wallet = this.getWalletFromPrivateKey(account)

    // 创建axios配置
    this.axiosConfig = {
      headers: {
        'User-Agent': userAgent,
        Origin: 'chrome-extension://lhmminnoafalclkgcbokfcngkocoffcp' // Flow3 Chrome扩展的Origin
      },
      timeout: 120000
    }

    // 如果有代理，设置代理agent
    if (this.proxy) {
      const proxyAgent = getProxyAgent(this.proxy, this.currentNum, this.total)
      if (proxyAgent) {
        this.axiosConfig.httpsAgent = proxyAgent
        logMessage(
          this.currentNum,
          this.total,
          `使用代理: ${this.proxy}`,
          'success'
        )
      } else {
        logMessage(
          this.currentNum,
          this.total,
          `代理设置失败，将使用默认IP`,
          'error'
        )
        this.proxy = null
      }
    } else {
      logMessage(
        this.currentNum,
        this.total,
        `未使用代理，将使用默认IP`,
        'warning'
      )
    }

    // 获取当前IP
    this.checkIP()
  }

  /**
   * 检查当前使用的IP地址
   * @returns {Promise<object|boolean>} 成功返回IP信息对象，失败返回false
   */
  async checkIP() {
    try {
      // 通过ipify API获取当前IP
      const response = await axios.get(
        'https://api.ipify.org?format=json',
        this.axiosConfig
      )
      const ip = response.data.ip
      logMessage(this.currentNum, this.total, `当前使用的IP: ${ip}`, 'success')
      return { success: true, ip: ip }
    } catch (error) {
      logMessage(
        this.currentNum,
        this.total,
        `获取IP失败: ${error.message}`,
        'error'
      )
      return false
    }
  }

  /**
   * 发送HTTP请求，自动处理重试和认证失效
   * @param {string} method - HTTP方法（GET, POST等）
   * @param {string} url - 请求URL
   * @param {object} config - Axios配置
   * @param {number} retries - 重试次数
   * @returns {object|null} - 请求响应或null
   */
  async makeRequest(method, url, config = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config
        })

        return response
      } catch (error) {
        // 处理认证失效的情况
        if (error.response && error.response.status === 401) {
          logMessage(
            this.currentNum,
            this.total,
            '认证已失效(401)，正在尝试重新登录...',
            'warning'
          )
          this.token = await this.loginUser()
          logMessage(
            this.currentNum,
            this.total,
            '重新登录成功，正在重试请求...',
            'process'
          )
          continue
        }
        logMessage(
          this.currentNum,
          this.total,
          `请求失败 ${error.message}`,
          'error'
        )

        logMessage(
          this.currentNum,
          this.total,
          `正在重试... (${i + 1}/${retries})`,
          'process'
        )
        await new Promise((resolve) => setTimeout(resolve, 12000)) // 等待12秒后重试
      }
    }
    return null
  }

  /**
   * 从私钥创建Solana钱包
   * @param {string} privateKeyBase58 - Base58编码的私钥
   * @returns {Keypair} - Solana钱包对象
   */
  getWalletFromPrivateKey(privateKeyBase58) {
    const secretKey = bs58.decode(privateKeyBase58)
    const keypair = Keypair.fromSecretKey(secretKey)
    return keypair
  }

  /**
   * 使用钱包私钥生成消息签名
   * @param {string} message - 要签名的消息
   * @returns {string} - Base58编码的签名
   */
  async generateSignature(message) {
    const messageBuffer = Buffer.from(message)
    const secretKey = new Uint8Array(this.wallet.secretKey)
    const signature = nacl.sign.detached(messageBuffer, secretKey)
    const encode = bs58.encode(signature)
    return encode
  }

  /**
   * 登录Flow3平台
   * @returns {string|null} - 成功返回访问令牌，失败返回null
   */
  async loginUser() {
    logMessage(this.currentNum, this.total, `正在尝试登录账户...`, 'process')
    // Flow3平台的登录消息格式
    const message = `Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.`
    const signature = await this.generateSignature(message)
    const payload = {
      message: message,
      walletAddress: this.wallet.publicKey.toBase58(),
      signature: signature
    }

    try {
      const response = await this.makeRequest(
        'POST',
        'https://api.flow3.tech/api/v1/user/login',
        {
          data: payload
        }
      )
      if (response?.data.statusCode === 200) {
        logMessage(this.currentNum, this.total, '登录成功', 'success')
        this.token = response.data.data.accessToken
        return response.data.data.accessToken
      }
      return null
    } catch (error) {
      logMessage(
        this.currentNum,
        this.total,
        `登录失败: ${error.message}`,
        'error'
      )
      return null
    }
  }

  /**
   * 执行带宽共享操作
   * @returns {boolean} - 操作是否成功
   */
  async sharingBandwith() {
    logMessage(this.currentNum, this.total, '正在尝试共享带宽...', 'process')
    const headers = {
      Authorization: `Bearer ${this.token}`
    }

    try {
      const response = await this.makeRequest(
        'POST',
        'https://api.mtcadmin.click/api/v1/bandwidth',
        { headers: headers }
      )
      if (response.data.statusCode === 200) {
        logMessage(this.currentNum, this.total, `带宽共享成功`, 'success')
        return true
      }
      return false
    } catch (error) {
      logMessage(this.currentNum, this.total, `带宽共享失败`, 'error')
      return false
    }
  }

  /**
   * 获取账户的积分信息
   * @returns {object|null} - 成功返回积分信息对象，失败返回null
   */
  async getPoints() {
    logMessage(this.currentNum, this.total, '正在获取积分信息...', 'process')
    const headers = {
      Authorization: `Bearer ${this.token}`
    }

    try {
      const response = await this.makeRequest(
        'GET',
        `https://api.mtcadmin.click/api/v1/point/info`,
        {
          headers: headers
        }
      )

      if (response.data.statusCode === 200) {
        logMessage(this.currentNum, this.total, `获取积分成功`, 'success')
        return response.data.data
      }
      logMessage(this.currentNum, this.total, `获取积分失败`, 'error')
      return null
    } catch (error) {
      logMessage(
        this.currentNum,
        this.total,
        `获取积分失败: ${error.message}`,
        'error'
      )
      return null
    }
  }

  /**
   * 执行完整的保活流程：登录、共享带宽和获取积分
   * @returns {object} - 包含积分和保活状态的对象
   */
  async processKeepAlive() {
    try {
      // 如果未登录，先执行登录
      if (!this.token) {
        await this.loginUser()
      }

      // 执行带宽共享
      const sharingBandwith = await this.sharingBandwith()
      // 获取积分信息
      const data = await this.getPoints()

      // 返回处理结果
      return {
        points: {
          total: data?.totalEarningPoint || 0,
          today: data?.todayEarningPoint || 0
        },
        keepAlive: sharingBandwith
      }
    } catch (error) {
      // 处理认证失效的情况
      if (error.response && error.response.status === 401) {
        logMessage(
          this.currentNum,
          this.total,
          '令牌已过期，正在尝试重新登录...',
          'warning'
        )
        await this.loginUser()
        return this.processKeepAlive()
      }

      logMessage(
        this.currentNum,
        this.total,
        `账户处理失败: ${error.message}`,
        'error'
      )
      throw error
    }
  }
}
