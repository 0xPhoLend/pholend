import { ethers } from 'hardhat'
import { deployApp } from '../heplers/deployApp'
import { networksData } from '../heplers/data'
import {
	IArgsForReserve,
	IDeployedStrategies,
	IReserveAsset,
} from '../heplers/types'
import { chunk, setFolderForDeployment, waitForTx } from '../heplers/helpers'
import { deployContractsForReserve } from '../heplers/contracts-deployments'

export async function main() {
	const ReserveAssets: IReserveAsset[] = []
	const addressOfAddressesProvider = ''
	const addressReserveTreasury = ''
	const addressIncentivesController = ''
	const isWriteInFs = true
	const AddressATokensAndRatesHelper = ''

	if (isWriteInFs) {
		setFolderForDeployment('newAsset')
	}

	const addressesProvider = await ethers.getContractAt(
		'LendingPoolAddressesProvider',
		addressOfAddressesProvider,
	)

	const owner = await ethers.getSigner(await addressesProvider.getPoolAdmin())

	const addressLendingPool = await addressesProvider.getLendingPool()
	const lendingPool = await ethers.getContractAt(
		'LendingPool',
		addressLendingPool,
	)

	const addressLendingPoolConfigurator =
		await addressesProvider.getLendingPoolConfigurator()
	const lendingPoolConfigurator = await ethers.getContractAt(
		'LendingPoolConfigurator',
		addressLendingPoolConfigurator,
	)

	const aTokensAndRatesHelper = await ethers.getContractAt(
		'ATokensAndRatesHelper',
		AddressATokensAndRatesHelper,
	)

	const argsForReserves: IArgsForReserve[] = []
	for await (const asset of ReserveAssets) {
		const argsForReserve = await deployContractsForReserve(
			isWriteInFs,
			asset,
			addressLendingPool,
			addressReserveTreasury,
			addressIncentivesController,
			addressOfAddressesProvider,
		)
		argsForReserves.push(argsForReserve)
	}

	for await (const argsForReserve of argsForReserves) {
		await waitForTx(
			await lendingPoolConfigurator
				.connect(owner)
				.initReserve(
					argsForReserve.aToken,
					argsForReserve.stableDebtToken,
					argsForReserve.variableDebtToken,
					argsForReserve.decimals,
					argsForReserve.interestRateStrategy,
				),
		)
	}

	await waitForTx(
		await addressesProvider
			.connect(owner)
			.setPoolAdmin(aTokensAndRatesHelper),
	)
	const chankedAssets = chunk(ReserveAssets, 20)
	for await (const chunkedAsset of chankedAssets) {
		await waitForTx(
			await aTokensAndRatesHelper.configureReserves(
				chunkedAsset.map((asset) => asset.address),
				chunkedAsset.map((asset) => asset.config.baseLTVAsCollateral),
				chunkedAsset.map((asset) => asset.config.liquidationThreshold),
				chunkedAsset.map((asset) => asset.config.liquidationBonus),
				chunkedAsset.map((asset) => asset.config.reserveFactor),
				chunkedAsset.map((asset) => asset.config.borrowingEnabled),
			),
		)
	}
    
	await waitForTx(await addressesProvider.setPoolAdmin(owner))
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
