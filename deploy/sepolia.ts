import { ethers } from 'hardhat'
import { deployApp } from '../heplers/deployApp'
import { networksData } from '../heplers/data'

export async function main() {
	await deployApp(
		networksData.sepolia,
		true,
		'0x2E34E736eff90Fe7138302FAc9Bbc8274017c47f',
		'WETH',
	)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
