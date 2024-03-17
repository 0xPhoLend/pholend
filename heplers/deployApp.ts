import { ethers } from 'hardhat'
import { AddressLike, ContractTransactionResponse } from 'ethers'
import {
	deployATokensAndRatesHelper,
	deployAaveOracle,
	deployAaveProtocolDataProvider,
	deployAddressesProvider,
	deployAddressesProviderRegistry,
	deployContractsForReserve,
	deployIncentivesController,
	deployLendingPool,
	deployLendingPoolCollateralManager,
	deployLendingPoolConfigurator,
	deployLendingRateOracle,
	deployReserveTreasury,
	deployStableAndVariableTokensHelper,
	deployUiHelpers,
	deployWETHGateway,
	deployWalletBalanceProvider,
} from './contracts-deployments'
import { chunk, setFolderForDeployment, waitForTx } from './helpers'
import {
	ATokensAndRatesHelper__factory,
	LendingPoolConfigurator__factory,
	LendingPool__factory,
} from '../typechain-types'
import { IArgsForReserve, IDeployedStrategies, IReserveAsset } from './types'

export async function deployApp(
	ReserveAssets: IReserveAsset[],
	isWriteInFs: boolean,
	owner: string,
	wrappedNativeName: string,
) {
	if (isWriteInFs) {
		setFolderForDeployment()
	}
	const users = await ethers.getSigners()
	const deployer = users[0]
	const wethAsset = ReserveAssets.find(
		(asset) => asset.symbol === wrappedNativeName,
	)
	if (!wethAsset) {
		throw Error('no weth asset')
	}
	const addressWETH = wethAsset.address

	console.log(
		'Deployer:',
		deployer.address,
		ethers.formatEther(await ethers.provider.getBalance(deployer)),
		'\n',
	)

	const reserveTreasury = await deployReserveTreasury(isWriteInFs, owner)
	const incentivesController = await deployIncentivesController(
		isWriteInFs,
		owner,
	)

	console.log('--------------------------------------------------------')
	console.log('deploying addresseProvider and addressesProviderRegistry')
	console.log('--------------------------------------------------------\n')

	const addressesProviderRegistry =
		await deployAddressesProviderRegistry(isWriteInFs)

	const marketId = '1'
	const addressesProvider = await deployAddressesProvider(
		isWriteInFs,
		marketId,
	)

	await waitForTx(
		await addressesProviderRegistry.registerAddressesProvider(
			addressesProvider,
			1,
		),
	)

	await waitForTx(await addressesProvider.setPoolAdmin(deployer))
	await waitForTx(await addressesProvider.setEmergencyAdmin(deployer))

	console.log('--------------------------------------------------------')
	console.log('deploying lendingPool and lendingPoolConfigurator')
	console.log('--------------------------------------------------------\n')

	const lendingPoolImpl = await deployLendingPool(isWriteInFs)

	await waitForTx(await lendingPoolImpl.initialize(addressesProvider))
	await waitForTx(await addressesProvider.setLendingPoolImpl(lendingPoolImpl))

	const lendingPoolProxy = await ethers.getContractAt(
		'LendingPool',
		await addressesProvider.getLendingPool(),
	)
	//  LendingPool__factory.connect(
	// 	await addressesProvider.getLendingPool(),
	// 	deployer,
	// )

	const lendingPoolConfiguratorImpl =
		await deployLendingPoolConfigurator(isWriteInFs)

	await waitForTx(
		await addressesProvider.setLendingPoolConfiguratorImpl(
			lendingPoolConfiguratorImpl,
		),
	)

	const lendingPoolConfiguratorProxy = await ethers.getContractAt(
		'LendingPoolConfigurator',
		await addressesProvider.getLendingPoolConfigurator(),
	)
	// const lendingPoolConfiguratorProxy =
	// 	LendingPoolConfigurator__factory.connect(
	// 		await addressesProvider.getLendingPoolConfigurator(),
	// 		deployer,
	// 	)

	await waitForTx(await lendingPoolConfiguratorProxy.setPoolPause(true))

	console.log('-----------------------------------------------------------')
	console.log('deploying helpers, oracles, protocolDataProvider')
	console.log('-----------------------------------------------------------\n')

	const stableAndVariableTokensHelper =
		await deployStableAndVariableTokensHelper(
			isWriteInFs,
			lendingPoolProxy,
			addressesProvider,
		)

	const aTokensAndRatesHelper = await deployATokensAndRatesHelper(
		isWriteInFs,
		lendingPoolProxy,
		addressesProvider,
		lendingPoolConfiguratorProxy,
	)

	const assetsWithoutWeth = ReserveAssets.filter(
		(asset) => asset.symbol !== wrappedNativeName,
	).map((value) => value.address)
	const sourcesWithoutWeth = ReserveAssets.filter(
		(asset) => asset.symbol !== wrappedNativeName,
	).map((value) => value.chainlinkAggregator)

	const aaveOracle = await deployAaveOracle(
		isWriteInFs,
		assetsWithoutWeth,
		sourcesWithoutWeth,
		ethers.ZeroAddress,
		addressWETH,
	)

	const chandkedAssetsWithoutWeth = chunk(assetsWithoutWeth, 20)
	const chandkedSourcesWithoutWeth = chunk(sourcesWithoutWeth, 20)
	console.log(
		`Setting asset sources in ${chandkedAssetsWithoutWeth.length} tx\n`,
	)
	chandkedAssetsWithoutWeth.forEach(async (assetsWithoutWeth, index) => {
		await waitForTx(
			await aaveOracle.setAssetSources(
				assetsWithoutWeth,
				chandkedSourcesWithoutWeth[index],
			),
		)
	})

	const lendingRateOracle = await deployLendingRateOracle(isWriteInFs)

	await waitForTx(
		await lendingRateOracle.transferOwnership(
			await stableAndVariableTokensHelper.getAddress(),
		),
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
			await stableAndVariableTokensHelper.setOracleBorrowRates(
				chunkedReserveAddresses[i],
				chunkedLendingRates[i],
				lendingRateOracle,
			),
		)
	}

	await waitForTx(
		await stableAndVariableTokensHelper.setOracleOwnership(
			lendingRateOracle,
			owner,
		),
	)
	await waitForTx(await addressesProvider.setPriceOracle(aaveOracle))
	await waitForTx(
		await addressesProvider.setLendingRateOracle(lendingRateOracle),
	)

	const aaveProtocolDataProvider = await deployAaveProtocolDataProvider(
		isWriteInFs,
		addressesProvider,
	)

	console.log('-----------------------------------------------------------')
	console.log('deploying tokens and settings reserves')
	console.log('-----------------------------------------------------------\n')

	const deployedStrategies: IDeployedStrategies = {}
	const argsForReserves: IArgsForReserve[] = []

	for await (const asset of ReserveAssets) {
		const argsForReserve = await deployContractsForReserve(
			isWriteInFs,
			asset,
			lendingPoolProxy,
			reserveTreasury,
			incentivesController,
			addressesProvider,
			deployedStrategies,
		)
		argsForReserves.push(argsForReserve)
	}

	for await (const argsForReserve of argsForReserves) {
		await waitForTx(
			await lendingPoolConfiguratorProxy.initReserve(
				argsForReserve.aToken,
				argsForReserve.stableDebtToken,
				argsForReserve.variableDebtToken,
				argsForReserve.decimals,
				argsForReserve.interestRateStrategy,
			),
		)
	}

	const atokenAndRatesDeployer = ATokensAndRatesHelper__factory.connect(
		await aTokensAndRatesHelper.getAddress(),
		deployer,
	)

	await waitForTx(
		await addressesProvider.setPoolAdmin(atokenAndRatesDeployer),
	)
	const chankedAssets = chunk(ReserveAssets, 20)
	for await (const chunkedAsset of chankedAssets) {
		await waitForTx(
			await atokenAndRatesDeployer.configureReserves(
				chunkedAsset.map((asset) => asset.address),
				chunkedAsset.map((asset) => asset.config.baseLTVAsCollateral),
				chunkedAsset.map((asset) => asset.config.liquidationThreshold),
				chunkedAsset.map((asset) => asset.config.liquidationBonus),
				chunkedAsset.map((asset) => asset.config.reserveFactor),
				chunkedAsset.map((asset) => asset.config.borrowingEnabled),
			),
		)
	}

	await waitForTx(await addressesProvider.setPoolAdmin(deployer))

	console.log('-----------------------------------------------------------')
	console.log(
		'deploying collateralManager, walletBalanceProvider, UiPoolDataProvider, WETHGateway',
	)
	console.log('-----------------------------------------------------------\n')

	const lendingPoolCollateralManager =
		await deployLendingPoolCollateralManager(isWriteInFs)

	await waitForTx(
		await addressesProvider.setLendingPoolCollateralManager(
			lendingPoolCollateralManager,
		),
	)

	await waitForTx(
		await addressesProvider.setAddress(
			'0x0100000000000000000000000000000000000000000000000000000000000000',
			aaveProtocolDataProvider,
		),
	)

	const wETHGateway = await deployWETHGateway(
		isWriteInFs,
		addressWETH,
		lendingPoolProxy,
	)

	await deployWalletBalanceProvider(isWriteInFs)
	await deployUiHelpers(isWriteInFs)
	await waitForTx(await lendingPoolConfiguratorProxy.setPoolPause(false))

	const poolAdmin = await ethers.getSigner(owner)
	const emergencyAdmin = await ethers.getSigner(owner)

	await waitForTx(await addressesProvider.setPoolAdmin(poolAdmin))
	await waitForTx(await addressesProvider.setEmergencyAdmin(emergencyAdmin))

	return {
		owner,
		deployer,
		poolAdmin,
		emergencyAdmin,
		users,
		reserveTreasury,
		incentivesController,
		addressesProviderRegistry,
		addressesProvider,
		lendingPoolProxy,
		lendingPoolConfiguratorProxy,
		stableAndVariableTokensHelper,
		aTokensAndRatesHelper,
		aaveOracle,
		lendingRateOracle,
		aaveProtocolDataProvider,
		wETHGateway,
		lendingPoolCollateralManager,
	}
}
