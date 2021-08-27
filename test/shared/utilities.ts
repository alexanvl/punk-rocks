import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'

export function expandTo18Decimals(n: number): BigNumber {
  return expandToDecimals(n, 18)
}

export function expandToDecimals(num: number, decimals: number): BigNumber {
  return ethers.BigNumber.from(num).mul(ethers.BigNumber.from(10).pow(decimals))
}