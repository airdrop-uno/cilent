export const storkWorkerScript = `
      const { parentPort, workerData } = require('worker_threads');
      const { HttpsProxyAgent } = require('https-proxy-agent')
      const { SocksProxyAgent } = require('socks-proxy-agent')
      const axios = require('axios')
      const { priceData, token, proxy } = workerData;


      const getProxyAgent = (proxy) => {
        if (!proxy) return null
        if (proxy.startsWith('http')) return new HttpsProxyAgent(proxy)
        if (proxy.startsWith('socks4') || proxy.startsWith('socks5')) return new SocksProxyAgent(proxy)
        throw new Error('Unsupported proxy protocol: '+ proxy)
      }

      function verifyPrice(priceData) {
        try {
          if (!priceData.msg_hash || !priceData.price || !priceData.timestamp)
            throw new Error('数据不完整')
          const currentTime = Date.now()
          const dataTime = new Date(priceData.timestamp).getTime()
          const timeDiffMinutes = (currentTime - dataTime) / (1000 * 60)
          if (timeDiffMinutes > 60) {
            return false
          }
          return true
        } catch (error) {
          return false
        }
      }

      async function sendVerifyResult(priceData, proxy, token) {
        try {
          const valid = verifyPrice(priceData)
          const agent = getProxyAgent(proxy)
          const res = await axios.post('https://app-api.jp.stork-oracle.network/v1/stork_signed_prices/validations',
            { msg_hash: priceData.msg_hash, valid },
            {
              httpsAgent: agent,
              headers:{
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
                Origin: 'chrome-extension://knnliglhgkmlblppdejchidfihjnockl',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
              }
            }
          )
          parentPort?.postMessage({
            success: true,
            msgHash: priceData.msg_hash,
            valid
          })
        } catch (error) {
          parentPort?.postMessage({
            success: false,
            error: error.message,
            msgHash: priceData.msg_hash
          })
        }
      }
      sendVerifyResult(priceData, proxy, token)
    `
