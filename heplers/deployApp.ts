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
import { deployReserves } from './deployReserves'

export async function deployApp(
	ReserveAssets: IReserveAsset[],
	isWriteInFs: boolean,
	wrappedNativeName: string,
) {
	if (isWriteInFs) {
		setFolderForDeployment('App')
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

	const reserveTreasury = await deployReserveTreasury(isWriteInFs, deployer)
	const incentivesController = await deployIncentivesController(
		isWriteInFs,
		deployer,
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

	const lendingRateOracle = await deployLendingRateOracle(isWriteInFs)

	const aaveProtocolDataProvider = await deployAaveProtocolDataProvider(
		isWriteInFs,
		addressesProvider,
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

	await deployReserves(
		ReserveAssets,
		await aaveOracle.getAddress(),
		await lendingRateOracle.getAddress(),
		await stableAndVariableTokensHelper.getAddress(),
		deployer.address,
		await addressesProvider.getAddress(''),
		isWriteInFs,
		await lendingPoolProxy.getAddress(),
		await reserveTreasury.getAddress(),
		await incentivesController.getAddress(),
		await lendingPoolConfiguratorProxy.getAddress(),
		await aTokensAndRatesHelper.getAddress(),
		wrappedNativeName,
	)

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
	const uiPoolDataProvider = await deployUiHelpers(isWriteInFs)
	await waitForTx(await lendingPoolConfiguratorProxy.setPoolPause(false))

	return {
		deployer,
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
		uiPoolDataProvider,
	}
}
