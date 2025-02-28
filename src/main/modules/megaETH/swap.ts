import { ethers } from 'ethers'
import MegaETH from '.'
import { bronto, gte } from './config'

export default class Swap extends MegaETH {
  private signer: ethers.Wallet
  constructor(privateKey: string) {
    super()
    this.signer = new ethers.Wallet(privateKey, this.provider)
  }
  async swapGTE() {
    this.setSwapContract(gte.address, gte.abi)
    const path = [
      '0x776401b9BC8aAe31A685731B7147D4445fD9FB19',
      '0xE9b6e75C243B6100ffcb1c66e8f78F96FeeA727F'
    ]
    const amount = ethers.parseEther('0.00000000529')
    const deadline = Math.floor(Date.now() / 1000) + 60 * 60
    const getAmount = await this.swapContract.getAmountsOut(amount, path)
    const isAmount = (getAmount[1] * 95n) / 100n
    const gasPrice = await this.provider
      .getFeeData()
      .then((fees) => fees.gasPrice! * 3n)
    const gasEstimate = await this.swapContract.swapExactETHForTokens
      .estimateGas(isAmount, path, this.signer.address, deadline, {
        value: amount
      })
      .catch(() => 300000)
    const tx = await this.swapContract.swapExactETHForTokens(
      isAmount,
      path,
      this.signer.address,
      deadline,
      {
        value: amount,
        gasLimit: Math.floor(Number(gasEstimate) * 1.2),
        gasPrice
      }
    )
    const receipt = await tx.wait()
    return receipt
  }

  async swapBronto() {
    this.setSwapContract(bronto.address, bronto.abi)
  }
}
