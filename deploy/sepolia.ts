import { ethers } from 'hardhat'
import { deployApp } from '../heplers/deployApp'
import { networksData } from '../heplers/data'

export async function main() {
	const { lendingPoolConfiguratorProxy } = await deployApp(
		networksData.sepolia,
		true,
		'WETH',
	)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
