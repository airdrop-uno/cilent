const blessed = require('blessed')
const contrib = require('blessed-contrib')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const ethers = require('ethers')

class ParasailNodeBot {
  constructor() {
    this.config = this.loadConfig()
    this.baseUrl = 'https://www.parasail.network/api'
    this.initUI()
  }

  async generateSignature() {
    const wallet = new ethers.Wallet(this.config.privateKey)
    const message = `By signing this message, you confirm that you agree to the Parasail Terms of Service.

Parasail (including the Website and Parasail Smart Contracts) is not intended for:
(a) access and/or use by Excluded Persons;
(b) access and/or use by any person or entity in, or accessing or using the Website from, an Excluded Jurisdiction.

Excluded Persons are prohibited from accessing and/or using Parasail (including the Website and Parasail Smart Contracts).

For full terms, refer to: https://parasail.network/Parasail_User_Terms.pdf`

    const signature = await wallet.signMessage(message)
    return {
      address: wallet.address,
      msg: message,
      signature
    }
  }

  async verifyUser() {
    try {
      const signatureData = await this.generateSignature()

      this.log(`Attempting verification for address: ${signatureData.address}`)

      const response = await axios.post(
        `${this.baseUrl}/user/verify`,
        signatureData,
        {
          headers: {
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
          }
        }
      )

      this.config.bearer_token = response.data.token
      this.config.wallet_address = signatureData.address
      this.saveConfig(this.config)

      this.log('User verification successful')
      return response.data
    } catch (error) {
      if (error.response) {
        this.log(`Verification Error Details:`)
        this.log(`Status: ${error.response.status}`)
        this.log(`Data: ${JSON.stringify(error.response.data)}`)
        this.log(`Headers: ${JSON.stringify(error.response.headers)}`)
      } else if (error.request) {
        this.log(`No response received: ${error.request}`)
      } else {
        this.log(`Error setting up request: ${error.message}`)
      }

      throw error
    }
  }


  log(message) {
    this.logBox.log(message)
    this.screen.render()
  }

  updateNodeStats(stats) {
    const statsContent = [
      `Has Node: ${stats.data.has_node ? 'Yes' : 'No'}`,
      `Node Address: ${stats.data.node_address}`,
      `Points: ${stats.data.points}`,
      `Pending Rewards: ${stats.data.pending_rewards || 'None'}`,
      `Total Distributed: ${stats.data.total_distributed || 'None'}`,
      `Last Check-in: ${
        stats.data.last_checkin_time
          ? new Date(stats.data.last_checkin_time * 1000).toLocaleString()
          : 'N/A'
      }`,
      `Card Count: ${stats.data.card_count}`
    ]

    this.nodeStatsBox.setContent(statsContent.join('\n'))
    this.screen.render()
  }

  async getNodeStats() {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/node/node_stats`, {
        params: { address: this.config.wallet_address },
        headers: {
          Authorization: `Bearer ${this.config.bearer_token}`,
          Accept: 'application/json, text/plain, */*'
        }
      })
      return response.data
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.log('Token expired. Attempting to refresh...')
        await this.verifyUser()
        return this.getNodeStats()
      }

      if (error.response) {
        this.log(`Node Stats Error Details:`)
        this.log(`Status: ${error.response.status}`)
        this.log(`Data: ${JSON.stringify(error.response.data)}`)
        this.log(`Headers: ${JSON.stringify(error.response.headers)}`)
      }

      this.log(`Failed to fetch node stats: ${error.message}`)
      throw error
    }
  }

  async checkIn() {
    try {
      const checkInResponse = await axios.post(
        `${this.baseUrl}/v1/node/check_in`,
        { address: this.config.wallet_address },
        {
          headers: {
            Authorization: `Bearer ${this.config.bearer_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*'
          }
        }
      )

      this.log('Node check-in successful')
      return checkInResponse.data
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.log('Token expired. Attempting to refresh...')
        await this.verifyUser()
        return this.checkIn()
      }

      if (error.response) {
        this.log(`Check-in Error Details:`)
        this.log(`Status: ${error.response.status}`)
        this.log(`Data: ${JSON.stringify(error.response.data)}`)
        this.log(`Headers: ${JSON.stringify(error.response.headers)}`)
      }

      this.log(`Check-in error: ${error.message}`)
      throw error
    }
  }

  async onboardNode() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/node/onboard`,
        { address: this.config.wallet_address },
        {
          headers: {
            Authorization: `Bearer ${this.config.bearer_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain, */*'
          }
        }
      )

      this.log('Node onboarding successful')
      return response.data
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.log('Token expired. Attempting to refresh...')
        await this.verifyUser()
        return this.onboardNode()
      }

      if (error.response) {
        this.log(`Onboarding Error Details:`)
        this.log(`Status: ${error.response.status}`)
        this.log(`Data: ${JSON.stringify(error.response.data)}`)
        this.log(`Headers: ${JSON.stringify(error.response.headers)}`)
      }

      this.log(`Onboarding error: ${error.message}`)
      throw error
    }
  }

  startCountdown() {
    let remainingSeconds = 24 * 60 * 60

    const countdownInterval = setInterval(() => {
      const hours = Math.floor(remainingSeconds / 3600)
      const minutes = Math.floor((remainingSeconds % 3600) / 60)
      const seconds = remainingSeconds % 60

      const countdownText = `Next Check-in: ${hours
        .toString()
        .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`

      this.countdownBox.setContent(countdownText)
      this.screen.render()

      remainingSeconds--

      if (remainingSeconds < 0) {
        clearInterval(countdownInterval)
        this.log('Time to check in!')
        this.performRoutineTasks()
      }
    }, 1000)

    const statsInterval = setInterval(async () => {
      try {
        const stats = await this.getNodeStats()
        this.updateNodeStats(stats)
      } catch (error) {
        this.log(`Stats update failed: ${error.message}`)
      }
    }, 60000)
  }

  async performRoutineTasks() {
    try {
      await this.onboardNode()

      await this.checkIn()

      const initialStats = await this.getNodeStats()
      this.updateNodeStats(initialStats)

      this.startCountdown()
    } catch (error) {
      this.log(`Routine tasks failed: ${error.message}`)
    }
  }

  async start() {
    this.log(`Starting Parasail Node Bot`)

    try {
      if (!this.config.bearer_token) {
        await this.verifyUser()
      }

      this.log(`Wallet Address: ${this.config.wallet_address}`)

      await this.onboardNode()
      await this.checkIn()

      const initialStats = await this.getNodeStats()
      this.updateNodeStats(initialStats)

      this.startCountdown()
    } catch (error) {
      this.log(`Initialization failed: ${error.message}`)
    }
  }
}

async function main() {
  const nodeBot = new ParasailNodeBot()
  await nodeBot.start()
}

main().catch((error) => {
  console.error('Main error:', error)
})
