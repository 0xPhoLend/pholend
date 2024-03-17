import { ethers } from 'hardhat'
import { deployApp } from '../heplers/deployApp'
import { networksData } from '../heplers/data'
import { deployUiHelpers } from '../heplers/contracts-deployments'

export async function main() {
	await deployUiHelpers(false)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
