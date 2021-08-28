import { ethers } from 'ethers'
import { deployContract } from 'ethereum-waffle'
import PunkRocks from '../artifacts/contracts/PunkRocks.sol/PunkRocks.json'

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.JSONRPC_URL || 'http://localhost:8545'
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider)
  console.log('Wallet:', wallet.address)

  const gas = process.env.GAS || '50'
  const proxy =
    process.env.PROXY || '0xf57b2c51ded3a29e6891aba85459d600256cf317' // Default Rinkeby // Mainnet 0xa5409ec958c83c3f309868babaca7c86dcb077c1
  const nonce = await wallet.getTransactionCount()

  console.log('Proxy:', proxy)
  console.log('Gas:', gas)
  console.log('Nonce:', nonce)

  const nft = await deployContract(
    wallet as any,
    PunkRocks,
    [
      'Punk Rocks',
      'PUNKROCKS',
      'ipfs://QmRRkBgZh3H52BLfYh2ebG7ufERRw2dqidTJUkP6VtxYcs/',
      ethers.utils.parseUnits('0.069', 'ether'),
      10e4,
      proxy,
    ],
    {
      gasLimit: 10e6,
      gasPrice: ethers.utils.parseUnits(gas, 'gwei'),
      nonce,
    }
  )

  console.log('Token:', nft.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
