const axios = require('axios')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { HttpsProxyAgent } = require('https-proxy-agent')
const { SocksProxyAgent } = require('socks-proxy-agent')

class Account {
  constructor(token, extensionId, proxy = null) {
    this.token = token
    this.extensionId = extensionId
    this.proxy = proxy
    this.api = this.createApiInstance()
    this.stats = {
      connectCount: 0,
      livenessCount: 0,
      statsChecks: 0,
      totalPoints: 0,
      referralPoints: 0,
      lastUpdated: null,
      startTime: new Date(),
      earningsTotal: 0,
      connectedNodesRewards: 0,
      connectedNodesCount: 0
    }
  }

  createApiInstance() {
    const config = {
      baseURL: 'https://api.exeos.network',
      headers: {
        accept: 'application/json, text/plain, */*',
        authorization: `Bearer ${this.token}`,
        'content-type': 'application/json'
      }
    }

    if (this.proxy) {
      const agent = this.proxy.protocol.includes('socks')
        ? new SocksProxyAgent(this.proxy.url)
        : new HttpsProxyAgent(this.proxy.url)
      config.httpsAgent = agent
    }

    return axios.create(config)
  }
}

const config = {
  logFilePath: path.join(__dirname, 'exeos-bot.log'),
  livenessDelay: 5000,
  livenessInterval: 15000,
  connectInterval: 60000
}

function parseProxy(proxyString) {
  const regex = /^(https?|socks[4-5]):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/
  const match = proxyString.match(regex)
  if (!match) return null

  const [, protocol, username, password, host, port] = match
  return {
    protocol,
    url: `${protocol}://${username ? `${username}:${password}@` : ''}${host}:${port}`,
    host,
    port: Number(port),
    auth: username && password ? { username, password } : null
  }
}

function loadFileLines(filePath) {
  return fs.existsSync(filePath)
    ? fs
        .readFileSync(filePath, 'utf-8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : []
}

async function selectExtensionId() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const extensionIds = loadFileLines('id.txt')

  return new Promise((resolve) => {
    if (extensionIds.length > 0) {

      rl.question(
        '\nSelect an option (number) or type an Extension ID: ',
        (answer) => {
          const choice = parseInt(answer)

          if (!isNaN(choice) && choice >= 1 && choice <= extensionIds.length) {
            resolve(extensionIds[choice - 1])
            rl.close()
          } else if (!isNaN(choice) && choice === extensionIds.length + 1) {
            rl.question('Enter Extension ID manually: ', (manualId) => {
              if (manualId.trim().length > 0) {
                resolve(manualId.trim())
              } else {
                resolve(extensionIds[0] || '')
              }
              rl.close()
            })
          } else if (answer.trim().length > 0) {
            resolve(answer.trim())
            rl.close()
          } else {
            resolve(extensionIds[0] || '')
            rl.close()
          }
        }
      )
    } else {
      rl.question(
        'No IDs found in id.txt. Enter Extension ID manually: ',
        (manualId) => {
          if (manualId.trim().length > 0) {
            resolve(manualId.trim())
          } else {
            resolve('')
          }
          rl.close()
        }
      )
    }
  })
}

async function loadAccounts() {
  const tokens = loadFileLines('token.txt')
  const proxies = loadFileLines('proxies.txt')
    .map(parseProxy)
    .filter((p) => p)

  if (tokens.length === 0) {
    return []
  }

  const selectedExtensionId = await selectExtensionId()
  if (!selectedExtensionId) {
    return []
  }

  const accounts = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const proxy = proxies[i % proxies.length] || null
    accounts.push(new Account(token, selectedExtensionId, proxy))
  }

  return accounts
}

async function getPublicIP(account) {
  try {
    const response = await account.api.get('https://api.ipify.org/?format=json')
    return response.data.ip
  } catch (error) {
    return null
  }
}

async function checkAccountInfo(account) {
  try {
    const response = await account.api.get('/account/web/me')
    const data = response.data.data

    if (data) {
      account.stats.totalPoints = data.points || 0
      account.stats.referralPoints = data.referralPoints || 0
      account.stats.earningsTotal = parseFloat(data.earningsTotal) || 0

      account.stats.connectedNodesRewards = 0
      account.stats.connectedNodesCount = 0

      if (data.networkNodes && Array.isArray(data.networkNodes)) {
        data.networkNodes.forEach((node) => {
          if (node.status === 'Connected') {
            account.stats.connectedNodesRewards +=
              parseFloat(node.totalRewards) || 0
            account.stats.connectedNodesCount++
          }
        })
      }

      account.stats.lastUpdated = new Date()
    }
    return data
  } catch (error) {
    return null
  }
}

async function checkStats(account) {
  try {
    const response = await account.api.post('/extension/stats', {
      extensionId: account.extensionId
    })
    account.stats.statsChecks++

    return response.data
  } catch (error) {
    return null
  }
}

async function checkLiveness(account) {
  try {
    const response = await account.api.post('/extension/liveness', {
      extensionId: account.extensionId
    })
    account.stats.livenessCount++

    return response.data
  } catch (error) {
    return null
  }
}

async function connectExtension(account, ip) {
  try {
    const response = await account.api.post('/extension/connect', {
      ip,
      extensionId: account.extensionId
    })
    account.stats.connectCount++

    return response.data
  } catch (error) {
    return null
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function livenessSequence(account) {
  await checkLiveness(account)
  await sleep(config.livenessDelay)
  await checkLiveness(account)
  await sleep(config.livenessDelay)
  await checkLiveness(account)
  await sleep(config.livenessDelay)
  await checkLiveness(account)
}

async function connectSequence(account) {
  const ip = await getPublicIP(account)
  if (ip) {
    await connectExtension(account, ip)
    await checkStats(account)
    await checkAccountInfo(account)
  } else {
  }
}

async function runBot() {
  if (!fs.existsSync(config.logFilePath)) {
    fs.writeFileSync(config.logFilePath, '')
  }

  const accounts = await loadAccounts()
  if (accounts.length === 0) {
    return
  }

  accounts.forEach((account, index) => {
    connectSequence(account)

    setInterval(() => livenessSequence(account), config.livenessInterval)
    setInterval(() => connectSequence(account), config.connectInterval)
  })
}


runBot().catch((error) => {
})
