import { ethers } from 'hardhat'
import { chunk, waitForTx } from './helpers'
import { IArgsForReserve, IReserveAsset } from './types'
import { AddressLike } from 'ethers'
import { deployContractsForReserve } from './contracts-deployments'

export async function deployReserves(
	ReserveAssets: IReserveAsset[],
	aaveOracleAddress: string,
	lendingRateOracleAddress: string,
	stableAndVariableTokensHelperAddress: string,
	currentOwner: string,
	addressesProviderAddress: string,
	isWriteInFs: boolean,
	lendingPoolAddress: string,
	reserveTreasuryAddress: string,
	incentivesControllerAddress: string,
	lendingPoolConfiguratorAddress: string,
	aTokensAndRatesHelperAddress: string,
	wrappedNativeName?: string,
) {
	const currentOwnerSigner = await ethers.getSigner(currentOwner)
	const aaveOracle = await ethers.getContractAt(
		'AaveOracle',
		aaveOracleAddress,
	)
	const lendingRateOracle = await ethers.getContractAt(
		'LendingRateOracle',
		lendingRateOracleAddress,
	)
	const stableAndVariableTokensHelper = await ethers.getContractAt(
		'StableAndVariableTokensHelper',
		stableAndVariableTokensHelperAddress,
	)
	const addressesProvider = await ethers.getContractAt(
		'LendingPoolAddressesProvider',
		addressesProviderAddress,
	)
	const lendingPoolConfigurator = await ethers.getContractAt(
		'LendingPoolConfigurator',
		lendingPoolConfiguratorAddress,
	)
	const aTokensAndRatesHelper = await ethers.getContractAt(
		'ATokensAndRatesHelper',
		aTokensAndRatesHelperAddress,
	)

	const assetsWithoutWeth = ReserveAssets.filter(
		(asset) => asset.symbol !== wrappedNativeName,
	).map((value) => value.address)
	const sourcesWithoutWeth = ReserveAssets.filter(
		(asset) => asset.symbol !== wrappedNativeName,
	).map((value) => value.chainlinkAggregator)

	const chandkedAssetsWithoutWeth = chunk(assetsWithoutWeth, 20)
	const chandkedSourcesWithoutWeth = chunk(sourcesWithoutWeth, 20)
	console.log(
		`Setting asset sources in ${chandkedAssetsWithoutWeth.length} tx\n`,
	)
	chandkedAssetsWithoutWeth.forEach(async (assetsWithoutWeth, index) => {
		await waitForTx(
			await aaveOracle
				.connect(currentOwnerSigner)
				.setAssetSources(
					assetsWithoutWeth,
					chandkedSourcesWithoutWeth[index],
				),
		)
	})

	await waitForTx(
		await lendingRateOracle
			.connect(currentOwnerSigner)
			.transferOwnership(stableAndVariableTokensHelperAddress),
	)

	const reserveAddresses = ReserveAssets.map((value) => value.address)
	const chunkedReserveAddresses = chunk(reserveAddresses, 20)
	const lendingRates = ReserveAssets.map((value) => value.lendingRate)
	const chunkedLendingRates = chunk(lendingRates, 20)
	console.log(
		`Setting oracle borrow rates in ${chunkedReserveAddresses.length} tx\n`,
	)

	for (let i = 0; i < chunkedReserveAddresses.length; i++) {
		await waitForTx(
			await stableAndVariableTokensHelper
				.connect(currentOwnerSigner)
				.setOracleBorrowRates(
					chunkedReserveAddresses[i],
					chunkedLendingRates[i],
					lendingRateOracle,
				),
		)
	}

	await waitForTx(
		await stableAndVariableTokensHelper
			.connect(currentOwnerSigner)
			.setOracleOwnership(lendingRateOracle, currentOwner),
	)
	await waitForTx(
		await addressesProvider
			.connect(currentOwnerSigner)
			.setPriceOracle(aaveOracle),
	)
	await waitForTx(
		await addressesProvider
			.connect(currentOwnerSigner)
			.setLendingRateOracle(lendingRateOracle),
	)

	console.log('-----------------------------------------------------------')
	console.log('deploying tokens and settings reserves')
	console.log('-----------------------------------------------------------\n')

	const argsForReserves: IArgsForReserve[] = []

	for await (const asset of ReserveAssets) {
		const argsForReserve = await deployContractsForReserve(
			isWriteInFs,
			asset,
			lendingPoolAddress,
			reserveTreasuryAddress,
			incentivesControllerAddress,
			//@ts-ignore
			addressesProviderAddress,
		)
		argsForReserves.push(argsForReserve)
	}

	for await (const argsForReserve of argsForReserves) {
		await waitForTx(
			await lendingPoolConfigurator
				.connect(currentOwnerSigner)
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
			.connect(currentOwnerSigner)
			.setPoolAdmin(aTokensAndRatesHelper),
	)
	const chankedAssets = chunk(ReserveAssets, 20)
	for await (const chunkedAsset of chankedAssets) {
		await waitForTx(
			await aTokensAndRatesHelper
				.connect(currentOwnerSigner)
				.configureReserves(
					chunkedAsset.map((asset) => asset.address),
					chunkedAsset.map(
						(asset) => asset.config.baseLTVAsCollateral,
					),
					chunkedAsset.map(
						(asset) => asset.config.liquidationThreshold,
					),
					chunkedAsset.map((asset) => asset.config.liquidationBonus),
					chunkedAsset.map((asset) => asset.config.reserveFactor),
					chunkedAsset.map((asset) => asset.config.borrowingEnabled),
				),
		)
	}

	await waitForTx(
		await addressesProvider
			.connect(currentOwnerSigner)
			.setPoolAdmin(currentOwner),
	)
}
