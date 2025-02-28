const fs = require('fs')
const readline = require('readline')
const axios = require('axios')
const { HttpsProxyAgent } = require('https-proxy-agent')
const { SocksProxyAgent } = require('socks-proxy-agent')

const TOKEN_FILE = 'accounts.txt'
const PROXY_FILE = 'proxy.txt'

class ProxyError extends Error {
  constructor(message, proxy) {
    super(message)
    this.name = 'ProxyError'
    this.proxy = proxy
  }
}

function maskAddress(address) {
  if (!address || address.length <= 12) return address
  return address.substring(0, 6) + ':::' + address.substring(address.length - 6)
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchUserIdentity(account) {
  try {
    const response = await account.api.get('/users')
    if (response.data && response.data.data && response.data.data.raw_address) {
      account.raw_address = response.data.data.raw_address
    } else {
      console.error(`Failed to retrieve identity data for an account.`)
    }
  } catch (error) {
    console.error(`Error fetching user identity: ${error.message}`)
  }
}

async function claimTaskWithRetry(taskId, account, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const claimResponse = await account.api.post(
        `/user-tasks/social/${taskId}/claim`
      )
      return claimResponse
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      console.log(`Retry attempt ${attempt + 1} for task ${taskId}`)
      await sleep(5000)
    }
  }
}

async function completeTask(category, account) {
  if (!account.raw_address) {
    await fetchUserIdentity(account)
  }
  const maskedAddr = maskAddress(account.raw_address)
  console.log(`]> Processing Account: ${maskedAddr}`)
  console.log(
    `]> Starting Voltix Bot to Complete Task (${category === 'ONE' ? 'Once Time' : 'Daily'})`
  )

  try {
    const tasksResponse = await account.api.get('/tasks/socials')
    const allTasks = tasksResponse.data.data.filter(
      (task) => task.category === category
    )

    const completedResponse = await account.api.get(
      '/user-tasks/social/completed'
    )
    let completedTasks = completedResponse.data.data

    const tasksToClaim = completedTasks.filter((t) => t.status === 'COMPLETED')
    for (const t of tasksToClaim) {
      console.log(
        `\n${maskedAddr} ]> Task ${t.task_id} has status COMPLETED, attempting claim...`
      )
      await sleep(5000)
      try {
        const claimResp = await claimTaskWithRetry(t.task_id, account)
        if (claimResp.data && claimResp.data.data === 1) {
          console.log(
            `${maskedAddr} ]> Successfully claimed completed task ${t.task_id}\n`
          )
        } else {
          console.log(
            `${maskedAddr} ]> Failed to claim completed task ${t.task_id}\n`
          )
        }
      } catch (error) {
        console.log(
          `${maskedAddr} ]> Error claiming completed task ${t.task_id}: ${error.message}`
        )
      }
    }

    const newCompletedResponse = await account.api.get(
      '/user-tasks/social/completed'
    )
    completedTasks = newCompletedResponse.data.data

    const tasksToProcess = allTasks.filter((task) => {
      const completedTask = completedTasks.find((t) => t.task_id === task.id)
      return !(completedTask && completedTask.status === 'CLAIMED')
    })

    if (tasksToProcess.length === 0) {
      console.log(
        `\nNo More Tasks for account: ${maskedAddr}! All tasks complete.\n`
      )
      return
    }

    const failedTasks = []
    for (const task of tasksToProcess) {
      try {
        const verifyResponse = await account.api.post(
          `/user-tasks/social/verify/${task.id}`,
          {}
        )
        if (verifyResponse.data.data.status === 'IN_PROGRESS') {
          console.log(`\n${'―'.repeat(50)}`)
          console.log(`${maskedAddr} ]> Processing Task ID: ${task.id}`)
          console.log(`${maskedAddr} ]> Task: ${task.title}`)
          console.log(`\n${'―'.repeat(50)}`)

          await sleep(30000)
          try {
            const claimResponse = await claimTaskWithRetry(task.id, account)
            if (claimResponse.data && claimResponse.data.data === 1) {
              const newCompletedResponse = await account.api.get(
                '/user-tasks/social/completed'
              )
              const newCompletedTask = newCompletedResponse.data.data.find(
                (t) => t.task_id === task.id
              )
              if (newCompletedTask && newCompletedTask.status === 'CLAIMED') {
                console.log(`[${maskedAddr}]> Task successfully claimed\n`)
              } else {
                console.log(`[${maskedAddr}]> Task claim verification failed\n`)
                failedTasks.push(task.id)
              }
            }
          } catch (claimError) {
            console.log(`[${maskedAddr}]> Error claiming task: ${task.id}`)
            failedTasks.push(task.id)
          }
        }
      } catch (error) {
        console.log(`[${maskedAddr}]> Error processing task: ${task.id}`)
        failedTasks.push(task.id)
      }
    }

    if (failedTasks.length > 0) {
      console.log(
        `[${maskedAddr}]> Retrying failed tasks: ${failedTasks.join(', ')}`
      )
      await completeTask(category, account)
    }
  } catch (error) {
    console.error(`[${maskedAddr}]> Error: ${error.message}`)
  }
}

async function fetchRewards(account) {
  if (!account.raw_address) {
    await fetchUserIdentity(account)
  }
  const maskedAddr = maskAddress(account.raw_address)
  try {
    const response = await account.api.get('/stat/rewards')
    if (response.data && response.data.data) {
      const rewards = response.data.data
      const totalPoints = rewards.reduce(
        (sum, reward) => sum + (reward.total_points || 0),
        0
      )

      console.log(`\n${'―'.repeat(50)}`)
      console.log(`Account Address: ${maskedAddr}`)
      console.log(`Total Points   : ${totalPoints} PTS`)
      console.log(`${'―'.repeat(50)}\n`)
    }
  } catch (error) {
    console.error(`[${maskedAddr}]> Error fetching rewards: ${error.message}`)
  }
}

function showMenu(accounts) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  console.log(`\n=== Voltix Task Automation ===\n`)
  console.log(`1. Complete Main Tasks`)
  console.log(`2. Complete Daily Tasks`)
  console.log(`3. Exit\n`)

  rl.question('Select option: ', async (answer) => {
    let category
    switch (answer.trim()) {
      case '1':
        console.clear()
        category = 'ONE'
        break
      case '2':
        console.clear()
        category = 'DAILY'
        break
      case '3':
        console.log(`Goodbye!`)
        process.exit(0)
        break
      default:
        console.log(`Invalid option`)
        rl.close()
        return showMenu(accounts)
    }

    // Process each account sequentially.
    for (const account of accounts) {
      await fetchUserIdentity(account)
      await fetchRewards(account)
      await completeTask(category, account)
    }

    rl.close()
    // Redisplay the menu after processing.
    showMenu(accounts)
  })
}

// Main function to initialize accounts.
async function main() {
  const tokens = []
  const proxies = []

  if (tokens.length === 0) {
    console.error('No tokens found. Exiting.')
    process.exit(1)
  }

  const accounts = []

  for (const token of tokens) {
    let agent = null
    const proxyUrl = ''
    const instanceConfig = {
      baseURL: 'https://api.voltix.ai',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
    if (agent) {
      instanceConfig.httpAgent = agent
      instanceConfig.httpsAgent = agent
    }
    const apiInstance = axios.create(instanceConfig)
    accounts.push({
      token,
      api: apiInstance,
      proxy: proxyUrl || 'None'
    })
  }

  showMenu(accounts)
}
main()
