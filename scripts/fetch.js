import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
async function monadScore() {
  try {
    const res = await axios.post(
      'https://mscore.onrender.com/user',
      {
        wallet: '0xc88Ff1dC089174052c37929e8aC587F7F2b235E5'
      },
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          origin: 'https://monadscore.xyz',
          referer: 'https://monadscore.xyz/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        // 45.38.111.36:5951:xmdcjvbm:3gkects6jlxx

        httpsAgent: new HttpsProxyAgent(
          'http://xmdcjvbm:3gkects6jlxx@45.38.111.36:5951'
        )
      }
    )
    console.log(res.data)
  } catch (error) {
    console.log(error)
  }
}

async function startNode() {
  try {
    const res = await axios.put(
      'https://mscore.onrender.com/user/update-start-time',
      {
        wallet: '0x9f45B535E7fC22eD3a070688e488ff52543F43B9',
        startTime: Date.now()
      },
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          origin: 'https://monadscore.xyz',
          referer: 'https://monadscore.xyz/'
        },
        // 45.38.111.36:5951:xmdcjvbm:3gkects6jlxx

        httpsAgent: new HttpsProxyAgent(
          'http://xmdcjvbm:3gkects6jlxx@45.38.111.36:5951'
        )
      }
    )
    console.log(res.data)
  } catch (error) {
    console.log(error)
  }
}

async function claimTask() {
  try {
    const res = await axios.post(
      'https://mscore.onrender.com/user/claim-task',
      {
        wallet: '0x9f45B535E7fC22eD3a070688e488ff52543F43B9',
        taskId: 'task003'
      },
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
          origin: 'https://monadscore.xyz',
          referer: 'https://monadscore.xyz/'
        },
        // 45.38.111.36:5951:xmdcjvbm:3gkects6jlxx
        timeout: 10000,
        httpsAgent: new HttpsProxyAgent(
          'http://xmdcjvbm:3gkects6jlxx@45.38.111.36:5951'
        )
      }
    )
    console.log(res.data)
  } catch (error) {
    console.log(error)
  }
}

async function humanityFaucet() {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    const res = await axios.post(
      'https://faucet.testnet.humanity.org/api/claim',
      {
        address: '0x9f45B535E7fC22eD3a070688e488ff52543F43B9'
      },
      {
        headers: {
          Accept: '*/*',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/json',
          Origin: 'https://faucet.testnet.humanity.org',
          Referer: 'https://faucet.testnet.humanity.org/',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
        }
      }
    )
    console.log(res.data)
  } catch (error) {
    console.log(error)
  }
}
monadScore()
// startNode()
// claimTask()
// humanityFaucet()
