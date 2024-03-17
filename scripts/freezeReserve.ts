import { ethers } from 'hardhat'
import { deployApp } from '../heplers/deployApp'
import { networksData } from '../heplers/data'

export async function main() {
	//
	const asset = ''
	const addressesProviderAddress = ''

	const addressesProvider = await ethers.getContractAt(
		'LendingPoolAddressesProvider',
		addressesProviderAddress,
	)

	const lendingPoolConfiguratorAddress =
		await addressesProvider.getLendingPoolConfigurator()
	const lendingPoolConfigurator = await ethers.getContractAt(
		'LendingPoolConfigurator',
		lendingPoolConfiguratorAddress,
	)

	await lendingPoolConfigurator.freezeReserve(asset)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
