import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { ethers } from 'hardhat'

const zero = ethers.BigNumber.from(0)
const proxy = '0xf57b2c51ded3a29e6891aba85459d600256cf317'
const name = 'Punk Rocks'
const symbol = 'PUNKROCKS'
const baseURI = 'https:/test.server/'

let NFT: ContractFactory
let token: Contract
let signers: SignerWithAddress[]
let wallet: SignerWithAddress

describe('PunkRocks test all success and revert cases', () => {
  beforeEach(async () => {
    NFT = await ethers.getContractFactory('PunkRocks')
    signers = await ethers.getSigners()
    wallet = signers[0]
  })

  it('constructor', async () => {
    await expect(
      NFT.deploy(
        name,
        symbol,
        baseURI,
        ethers.utils.parseEther('0.069'),
        10e4,
        proxy
      )
    ).to.be.not.be.reverted
  })

  it('preMint', async () => {
    token = await NFT.deploy(
      name,
      symbol,
      baseURI,
      ethers.utils.parseEther('0.069'),
      200, // use 200 so we can pre-mint entire supply in total batch
      proxy
    )
    // attempt pre-mint from second wallet
    token = token.connect(signers[1])
    await expect(token.preMint(1, wallet.address)).to.be.revertedWith(
      'ONLY_OWNER'
    )
    // connect to main wallet and successfully pre-mint total amount
    token = token.connect(wallet)
    await expect(token.preMint(200, wallet.address)).to.not.be.reverted
    // max supply
    await expect(token.preMint(1, wallet.address)).to.be.revertedWith(
      'TOTAL_SUPPLY_MINTED'
    )
    // timeout pre-mint period
    await ethers.provider.send('evm_increaseTime', [7200])
    await ethers.provider.send('evm_mine', [])
    await expect(token.preMint(1, wallet.address)).to.be.revertedWith(
      'PRE_MINT_CLOSED'
    )
  })
})
