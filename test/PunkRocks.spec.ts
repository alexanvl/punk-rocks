import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'
import {
  expandToDecimals,
  expandTo18Decimals,
} from './shared/utilities'

const zero = ethers.BigNumber.from(0)
const proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317'
const name = 'Punk Rocks'
const symbol = 'PUNKROCKS'
const baseURI = 'https:/test.server/'

let NFT: ContractFactory
let token: Contract
let wallet: SignerWithAddress

describe('PunkRocks test all success and revert cases', () => {
  beforeEach(async () => {
    NFT = await ethers.getContractFactory('PunkRocks')
    wallet = (await ethers.getSigners())[0]
  })

  it('constructor', async () => {
    await expect(
      NFT.deploy(
        name,
        symbol,
        baseURI,
        expandToDecimals(69, 15),
        10e4,
        proxy
      )
    ).to.be.not.be.reverted
  })
})
