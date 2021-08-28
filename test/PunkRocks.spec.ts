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
let punks: Contract
let token: Contract
let signers: SignerWithAddress[]
let wallet: SignerWithAddress

describe('PunkRocks test all success and revert cases', () => {
  beforeEach(async () => {
    const CryptoPunks = await ethers.getContractFactory('CryptoPunksMarket')
    punks = await CryptoPunks.deploy()
    NFT = await ethers.getContractFactory('PunkRocks')
    signers = await ethers.getSigners()
    wallet = signers[0]
    // deploy a token
    token = await NFT.deploy(
      name,
      symbol,
      baseURI,
      ethers.utils.parseEther('0.069'),
      punks.address,
      proxy
    )

    // populate some punks
    await punks.setInitialOwners(
      [signers[1].address, signers[2].address],
      [2, 3]
    )
  })

  it('appendTokenIds', async () => {
    // check theoretical gas limit
    const ids = []
    for (let i = 0; i < 650; i++) {
      ids.push(i)
    }
    const tx = await token.appendTokenIds(ids, { gasLimit: 15e6 })
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(14847141)
    // ensure owner only
    token = token.connect(signers[1])
    await expect(token.appendTokenIds([651, 652])).to.be.revertedWith(
      'ONLY_OWNER'
    )
  })

  it('preMint', async () => {
    // attempt pre-mint from non-punk hoder wallet
    token = token.connect(signers[3])
    await expect(token.preMint(2, signers[3].address)).to.be.revertedWith(
      'NON_PUNK_OWNER'
    )
    // attempt to pre-mint an unowned id
    token = token.connect(signers[1])
    await expect(token.preMint(3, signers[1].address)).to.be.revertedWith(
      'NON_PUNK_OWNER'
    )
    // successfully pre-mint
    await expect(token.preMint(2, signers[3].address)).to.not.be.reverted
    expect(await token.ownerOf(2)).to.equal(signers[3].address)
    // timeout pre-mint period
    await ethers.provider.send('evm_increaseTime', [7200])
    await ethers.provider.send('evm_mine', [])
    token = token.connect(signers[2])
    await expect(token.preMint(3, wallet.address)).to.be.revertedWith(
      'PRE_MINT_CLOSED'
    )
    // allow owner to pre-mint after timeout
    token = token.connect(wallet)
    await expect(token.preMint(3, wallet.address)).to.not.be.reverted
    expect(await token.ownerOf(3)).to.equal(wallet.address)
  })

  it('mint', async () => {
    // populate some tokenIds
    await token.appendTokenIds([0, 5, 9, 23, 10, 45, 98], { gasLimit: 15e6 })
    // attempt to mint with insufficient price
    const value = await token.price()

    await expect(token.mint(wallet.address)).to.be.revertedWith(
      'MINT_PRICE_NOT_MET'
    )
    // attempt to mint before pre-mint timeout
    await expect(token.mint(wallet.address, { value })).to.be.revertedWith(
      'MINT_CLOSED'
    )
    // timeout pre-mint period
    await ethers.provider.send('evm_increaseTime', [7200])
    await ethers.provider.send('evm_mine', [])
    // mint with excess value
    const maxMint = await token.MAX_MINT()
    await expect(
      token.mint(wallet.address, { value: value.mul(maxMint.add(1)) })
    ).to.not.be.reverted
    expect(await token.balanceOf(wallet.address)).to.be.equal(maxMint)
    // fail after total supply minted
    await expect(token.mint(wallet.address, { value })).to.be.revertedWith(
      'TOTAL_SUPPLY_MINTED'
    )
  })

  it('withdrawProceeds', async () => {
    // populate some tokenIds
    await token.appendTokenIds([0, 5, 9, 23, 10, 45, 98], { gasLimit: 15e6 })
    // mint a batch of tokens from a second wallet
    token = token.connect(signers[1])
    const value = await token.price()
    // timeout pre-mint period
    await ethers.provider.send('evm_increaseTime', [7200])
    await ethers.provider.send('evm_mine', [])
    const maxMint = await token.MAX_MINT()
    // check that owner's balance is equal to previous balance + mint proceeds
    const balance = await wallet.getBalance()
    await expect(token.mint(wallet.address, { value })).to.not.be.reverted
    await expect(token.withdrawProceeds()).to.not.be.reverted
    expect(await wallet.getBalance()).to.be.equal(balance.add(value))
  })
})
