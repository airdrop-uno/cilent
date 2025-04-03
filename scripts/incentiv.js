require('dotenv').config()
const ethers = require('ethers')
const fs = require('fs')
const axios = require('axios')
const readline = require('readline')

const BASE_URL = 'https://api.testnet.incentiv.net/api'
const PROVIDER_TYPE = 'BROWSER_EXTENSION'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const formatTimestamp = () =>
  new Date().toISOString().replace('T', ' ').substr(0, 19)
const printDivider = () => console.log('-'.repeat(60))

function startCountdown(nextTimestamp, wallet, token, username) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const now = Date.now()
      const timeLeft = nextTimestamp - now

      if (timeLeft <= 0) {
        clearInterval(interval)
        process.stdout.write('\r')
        console.log(
          `[${formatTimestamp()}] Status: Cooldown completed, attempting faucet claim...`
        )
        resolve()
        return
      }

      const hours = Math.floor(timeLeft / (1000 * 60 * 60))
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
      process.stdout.write(
        `\r[${formatTimestamp()}] Waiting for next faucet claim: ${hours}h ${minutes}m ${seconds}s`
      )
    }, 1000)
  })
}

function createNewWallet() {
  const wallet = ethers.Wallet.createRandom()
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase
  }
}

async function getChallenge(address) {
  const response = await axios.get(`${BASE_URL}/user/challenge`, {
    params: { type: PROVIDER_TYPE, address },
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      Referer: 'https://testnet.incentiv.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })

  if (!response.data?.result?.challenge) {
    throw new Error('Invalid challenge response structure')
  }

  return response.data.result.challenge
}

async function signup(wallet, challenge) {
  const signer = new ethers.Wallet(wallet.privateKey)
  const signature = await signer.signMessage(challenge)

  const signupData = {
    type: PROVIDER_TYPE,
    challenge,
    signature,
    username: `user_${wallet.address.slice(2, 8)}`
  }

  const response = await axios.post(`${BASE_URL}/user/signup`, signupData, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      Referer: 'https://testnet.incentiv.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
  return response.data
}

async function login(wallet, challenge) {
  const signer = new ethers.Wallet(wallet.privateKey)
  const signature = await signer.signMessage(challenge)

  const loginData = {
    type: PROVIDER_TYPE,
    challenge,
    signature
  }

  const response = await axios.post(`${BASE_URL}/user/login`, loginData, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      Referer: 'https://testnet.incentiv.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
  return response.data
}

async function claimFaucet(token) {
  const response = await axios.post(
    `${BASE_URL}/user/faucet`,
    {},
    {
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'sec-ch-ua':
          '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        token: token,
        Referer: 'https://testnet.incentiv.net/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    }
  )
  return response.data
}

async function getUserInfo(token) {
  const response = await axios.get(`${BASE_URL}/user`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      token: token,
      'sec-ch-ua':
        '"Chromium";v="134", "Not:A-Brand";v="24", "Microsoft Edge";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      Referer: 'https://testnet.incentiv.net/',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  })
  return response.data.result
}

function saveWallets(wallets) {
  fs.writeFileSync('wallets.json', JSON.stringify(wallets, null, 2))
  printDivider()
  console.log(
    `[${formatTimestamp()}] Success: Wallet data saved to wallets.json`
  )
  console.log(`Total wallets: ${wallets.length}`)
  printDivider()
}

async function claimWithExistingWallet() {
  try {
    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) throw new Error('PRIVATE_KEY not found in .env')

    const wallet = new ethers.Wallet(privateKey)
    console.log('Status: Wallet loaded from private key... ✓')

    const challenge = await getChallenge(wallet.address)
    console.log('Status: Challenge retrieved... ✓')

    const loginResponse = await login(wallet, challenge)
    const token = loginResponse.result?.token || loginResponse.data?.token
    if (!token) throw new Error('Token not found in login response')
    console.log('Status: Login completed... ✓')

    while (true) {
      const userInfo = await getUserInfo(token)
      const username = userInfo.username
      const nextFaucetTimestamp = userInfo.nextFaucetRequestTimestamp || 0

      if (nextFaucetTimestamp > Date.now()) {
        console.log(`[${formatTimestamp()}] Status: Faucet claim on cooldown`)
        printDivider()
        console.log(`Address: ${wallet.address}`)
        console.log(`Username: ${username}`)
        await startCountdown(nextFaucetTimestamp, wallet, token, username)
      }

      try {
        await claimFaucet(token)
        console.log('Status: Faucet claimed... ✓')
        printDivider()
        console.log('Existing Wallet Summary:')
        console.log(`Address: ${wallet.address}`)
        console.log(`Username: ${username}`)
        console.log('Status: Successfully claimed faucet')
        printDivider()
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message
        if (errorMessage.includes('Faucet request already made')) {
          continue
        } else {
          throw error
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    console.log(`Status: Failed - ${errorMessage}`)
    printDivider()
    console.log('Existing Wallet Summary:')
    console.log('Status: Failed to process')
    console.log(`Error: ${errorMessage}`)
    printDivider()
  }
}

async function createAndProcessWallets(walletCount) {
  const wallets = []
  printDivider()
  console.log(`[${formatTimestamp()}] Starting wallet creation process...`)
  console.log(`Target: ${walletCount} wallets`)
  printDivider()

  for (let i = 0; i < walletCount; i++) {
    console.log(
      `\n[${formatTimestamp()}] Processing wallet ${i + 1}/${walletCount}`
    )
    try {
      const wallet = createNewWallet()
      console.log('Status: Generating new wallet... ✓')

      const challenge = await getChallenge(wallet.address)
      console.log('Status: Challenge retrieved... ✓')

      const signupResponse = await signup(wallet, challenge)
      const token = signupResponse.result?.token || signupResponse.data?.token
      if (!token) throw new Error('Token not found in signup response')
      console.log('Status: Signup completed... ✓')

      await claimFaucet(token)
      console.log('Status: Faucet claimed... ✓')

      wallets.push({
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        token,
        signupStatus: 'success',
        faucetStatus: 'success',
        timestamp: formatTimestamp()
      })

      printDivider()
      console.log(`Wallet ${i + 1} Summary:`)
      console.log(`Address: ${wallet.address}`)
      console.log(`Status: Successfully created and funded`)
      printDivider()
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message
      wallets.push({
        address: null,
        privateKey: null,
        mnemonic: null,
        token: null,
        signupStatus: 'failed',
        faucetStatus: 'failed',
        error: errorMessage,
        timestamp: formatTimestamp()
      })
      console.log(`Status: Failed - ${errorMessage}`)
      printDivider()
      console.log(`Wallet ${i + 1} Summary:`)
      console.log(`Status: Failed to create`)
      console.log(`Error: ${errorMessage}`)
      printDivider()
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  saveWallets(wallets)
  return wallets
}

async function main() {
  console.log('\n= Incentiv Testnet Wallet Bot - Airdrop Insiders =\n')
  console.log('Options:')
  console.log(
    '1. Claim faucet with existing wallet (using PRIVATE_KEY from .env)'
  )
  console.log('2. Create new wallets, signup, and claim faucet')
  printDivider()

  rl.question('Select an option (1 or 2): ', async (option) => {
    if (option === '1') {
      printDivider()
      console.log(
        `[${formatTimestamp()}] Starting faucet claim with existing wallet...`
      )
      await claimWithExistingWallet()
      console.log(`[${formatTimestamp()}] Process completed`)
      rl.close()
    } else if (option === '2') {
      rl.question(
        'How many wallets would you like to create? ',
        async (answer) => {
          const walletCount = parseInt(answer)
          if (isNaN(walletCount) || walletCount <= 0) {
            console.log('Error: Please enter a valid number greater than 0')
            rl.close()
            return
          }
          const wallets = await createAndProcessWallets(walletCount)
          console.log(`[${formatTimestamp()}] Process completed`)
          console.log(
            `Success: ${wallets.filter((w) => w.signupStatus === 'success').length} wallets`
          )
          console.log(
            `Failed: ${wallets.filter((w) => w.signupStatus === 'failed').length} wallets`
          )
          rl.close()
        }
      )
    } else {
      console.log('Error: Invalid option. Please select 1 or 2')
      rl.close()
    }
  })
}

main().catch((error) => {
  console.error(`[${formatTimestamp()}] Fatal error:`, error.message)
  rl.close()
})
