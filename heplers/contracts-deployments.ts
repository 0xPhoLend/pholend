import { AddressLike, BaseContract, Addressable } from 'ethers'
import { ethers } from 'hardhat'
import { waitAndLogDeployment } from './helpers'
import { IArgsForReserve, IDeployedStrategies, IReserveAsset } from './types'

export async function deployATokensAndRatesHelper(
	isWriteInFs: boolean,
	lendingPoolProxy: BaseContract,
	addressesProvider: BaseContract,
	lendingPoolConfiguratorProxy: BaseContract,
) {
	const ATokensAndRatesHelper = await ethers.getContractFactory(
		'ATokensAndRatesHelper',
	)

	const aTokensAndRatesHelper = await ATokensAndRatesHelper.deploy(
		lendingPoolProxy,
		addressesProvider,
		lendingPoolConfiguratorProxy,
	)
	const verifyArgs = isWriteInFs
		? [
				lendingPoolProxy.target,
				addressesProvider.target,
				lendingPoolConfiguratorProxy.target,
			]
		: null
	await waitAndLogDeployment(
		aTokensAndRatesHelper,
		'ATokensAndRatesHelper',
		verifyArgs,
	)
	return aTokensAndRatesHelper
}

export async function deployAddressesProvider(
	isWriteInFs: boolean,
	marketId: string,
) {
	const AddressProvider = await ethers.getContractFactory(
		'LendingPoolAddressesProvider',
	)
	const addressProvider = await AddressProvider.deploy(marketId)

	const verifyArgs = isWriteInFs ? [marketId] : null

	await waitAndLogDeployment(
		addressProvider,
		'LendingPoolAddressesProvider',
		verifyArgs,
	)

	return addressProvider
}

export async function deployAddressesProviderRegistry(isWriteInFs: boolean) {
	const AddressProviderRegistry = await ethers.getContractFactory(
		'LendingPoolAddressesProviderRegistry',
	)
	const addressProviderRegistry = await AddressProviderRegistry.deploy()

	const verifyArgs = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		addressProviderRegistry,
		'LendingPoolAddressesProviderRegistry',
		verifyArgs,
	)

	return addressProviderRegistry
}

export async function deployLendingPool(isWriteInFs: boolean) {
	const libs = await deployLibs(isWriteInFs)
	const LendingPool = await ethers.getContractFactory('LendingPool', {
		libraries: {
			ReserveLogic: libs.reserveLogic,
			ValidationLogic: libs.validationLogic,
		},
	})
	const lendingPool = await LendingPool.deploy()

	const verifyArgs = isWriteInFs ? [] : null

	await waitAndLogDeployment(lendingPool, 'LendingPool', verifyArgs, {
		ReserveLogic: libs.reserveLogic.target,
		ValidationLogic: libs.validationLogic.target,
	})

	return lendingPool
}

export async function deployLendingPoolConfigurator(isWriteInFs: boolean) {
	const LendingPoolConfigurator = await ethers.getContractFactory(
		'LendingPoolConfigurator',
	)
	const lendingPoolConfigurator = await LendingPoolConfigurator.deploy()

	const verifyArgs = isWriteInFs ? [] : null

	await waitAndLogDeployment(
		lendingPoolConfigurator,
		'LendingPoolConfigurator',
		verifyArgs,
	)

	return lendingPoolConfigurator
}

export async function deployLibs(isWriteInFs: boolean) {
	const ReserveLogic = await ethers.getContractFactory('ReserveLogic')
	const reserveLogic = await ReserveLogic.deploy()
	const verifyArgsReserveLogic = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		reserveLogic,
		'ReserveLogic',
		verifyArgsReserveLogic,
	)

	const GenericLogic = await ethers.getContractFactory('GenericLogic')
	const genericLogic = await GenericLogic.deploy()
	const verifyArgsGenericLogic = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		genericLogic,
		'GenericLogic',
		verifyArgsGenericLogic,
	)

	const ValidationLogic = await ethers.getContractFactory('ValidationLogic', {
		libraries: { GenericLogic: genericLogic },
	})
	const validationLogic = await ValidationLogic.deploy()
	const verifyArgsValidationLogic = isWriteInFs ? [] : null
	const librariesValidationLogic = {
		GenericLogic: genericLogic.target,
	}
	await waitAndLogDeployment(
		validationLogic,
		'ValidationLogic',
		verifyArgsValidationLogic,
		librariesValidationLogic,
	)

	return { reserveLogic, validationLogic }
}

export async function deployStableAndVariableTokensHelper(
	isWriteInFs: boolean,
	lendingPoolProxy: BaseContract,
	addressesProvider: BaseContract,
) {
	const StableAndVariableTokensHelper = await ethers.getContractFactory(
		'StableAndVariableTokensHelper',
	)

	const stableAndVariableTokensHelper =
		await StableAndVariableTokensHelper.deploy(
			lendingPoolProxy,
			addressesProvider,
		)
	const verifyArgs = isWriteInFs
		? [lendingPoolProxy.target, addressesProvider.target]
		: null
	await waitAndLogDeployment(
		stableAndVariableTokensHelper,
		'StableAndVariableTokensHelper',
		verifyArgs,
	)
	return stableAndVariableTokensHelper
}

export async function deployAaveOracle(
	isWriteInFs: boolean,
	assets: AddressLike[],
	sources: AddressLike[],
	fallbackOracle: AddressLike,
	weth: AddressLike,
) {
	const AaveOracle = await ethers.getContractFactory('AaveOracle')

	const aaveOracle = await AaveOracle.deploy(
		assets,
		sources,
		fallbackOracle,
		weth,
	)

	const verifyArgs = isWriteInFs
		? [assets, sources, fallbackOracle, weth]
		: null

	await waitAndLogDeployment(aaveOracle, 'AaveOracle', verifyArgs)
	return aaveOracle
}

export async function deployLendingRateOracle(isWriteInFs: boolean) {
	const LendingRateOracle =
		await ethers.getContractFactory('LendingRateOracle')

	const lendingRateOracle = await LendingRateOracle.deploy()
	const verifyArgs = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		lendingRateOracle,
		'LenndingRateOracle',
		verifyArgs,
	)
	return lendingRateOracle
}

export async function deployAaveProtocolDataProvider(
	isWriteInFs: boolean,
	addressesProvider: BaseContract,
) {
	const AaveProtocolDataProvider = await ethers.getContractFactory(
		'AaveProtocolDataProvider',
	)

	const aaveProtocolDataProvider =
		await AaveProtocolDataProvider.deploy(addressesProvider)
	const verifyArgs = isWriteInFs ? [addressesProvider.target] : null
	await waitAndLogDeployment(
		aaveProtocolDataProvider,
		'AaveProtocolDataProvider',
		verifyArgs,
	)
	return aaveProtocolDataProvider
}

export async function deployWETHGateway(
	isWriteInFs: boolean,
	WETH: AddressLike,
	lendingPoolProxy: BaseContract,
) {
	const WETHGateway = await ethers.getContractFactory('WETHGateway')

	const wETHGateway = await WETHGateway.deploy(WETH, lendingPoolProxy)
	const verifyArgs = isWriteInFs ? [WETH, lendingPoolProxy.target] : null
	await waitAndLogDeployment(wETHGateway, 'WETHGateway', verifyArgs)
	return wETHGateway
}

export async function deployContractsForReserve(
	isWriteInFs: boolean,
	asset: IReserveAsset,
	lendingPoolProxy: string,
	reserveTreasury: string,
	incentivesController: string,
	addressesProvider: string,
	// deployedStrategies: IDeployedStrategies,
) {
	const deployedStrategies: IDeployedStrategies = {}
	const AToken = await ethers.getContractFactory('AToken')
	const aToken = await AToken.deploy(
		lendingPoolProxy,
		asset.address,
		reserveTreasury,
		`Interest bearing ${asset.symbol}`,
		`a${asset.symbol}`,
		incentivesController,
	)
	const verifyArgsAToken = isWriteInFs
		? [
				lendingPoolProxy,
				asset.address,
				reserveTreasury,
				`Interest bearing ${asset.symbol}`,
				`a${asset.symbol}`,
				incentivesController,
			]
		: null
	await waitAndLogDeployment(aToken, `a${asset.symbol}`, verifyArgsAToken)

	const StableDebtToken = await ethers.getContractFactory('StableDebtToken')
	const stableDebtToken = await StableDebtToken.deploy(
		lendingPoolProxy,
		asset.address,
		`Stable debt bearing ${asset.symbol}`,
		`stableDebt${asset.symbol}`,
		incentivesController,
	)
	const verifyArgsStable = isWriteInFs
		? [
				lendingPoolProxy,
				asset.address,
				`Stable debt bearing ${asset.symbol}`,
				`stableDebt${asset.symbol}`,
				incentivesController,
			]
		: null

	await waitAndLogDeployment(
		stableDebtToken,
		`stableDebt${asset.symbol}`,
		verifyArgsStable,
	)

	const VariableDebtToken =
		await ethers.getContractFactory('VariableDebtToken')
	const variableDebtToken = await VariableDebtToken.deploy(
		lendingPoolProxy,
		asset.address,
		`Variable debt bearing ${asset.symbol}`,
		`VariableDebt${asset.symbol}`,
		incentivesController,
	)
	const verifyArgsVariable = isWriteInFs
		? [
				lendingPoolProxy,
				asset.address,
				`Variable debt bearing ${asset.symbol}`,
				`VariableDebt${asset.symbol}`,
				incentivesController,
			]
		: null

	await waitAndLogDeployment(
		variableDebtToken,
		`VariableDebt${asset.symbol}`,
		verifyArgsVariable,
	)

	const config = asset.config

	let contractsForReserve: IArgsForReserve

	if (!Object.keys(deployedStrategies).includes(config.strategy.name)) {
		const InterestRateStrategy = await ethers.getContractFactory(
			'DefaultReserveInterestRateStrategy',
		)
		const interestRateStrategy = await InterestRateStrategy.deploy(
			addressesProvider,
			config.strategy.optimalUtilizationRate,
			config.strategy.baseVariableBorrowRate,
			config.strategy.variableRateSlope1,
			config.strategy.variableRateSlope2,
			config.strategy.stableRateSlope1,
			config.strategy.stableRateSlope2,
		)
		const verifyArgs = isWriteInFs
			? [
					addressesProvider,
					config.strategy.optimalUtilizationRate,
					config.strategy.baseVariableBorrowRate,
					config.strategy.variableRateSlope1,
					config.strategy.variableRateSlope2,
					config.strategy.stableRateSlope1,
					config.strategy.stableRateSlope2,
				]
			: null

		await waitAndLogDeployment(
			interestRateStrategy,
			config.strategy.name,
			verifyArgs,
		)
		deployedStrategies[config.strategy.name] = interestRateStrategy
		contractsForReserve = {
			aToken: aToken,
			stableDebtToken: stableDebtToken,
			variableDebtToken: variableDebtToken,
			interestRateStrategy: interestRateStrategy,
			decimals: config.reserveDecimals,
		}
	} else {
		contractsForReserve = {
			aToken: aToken,
			stableDebtToken: stableDebtToken,
			variableDebtToken: variableDebtToken,
			interestRateStrategy: deployedStrategies[config.strategy.name],
			decimals: config.reserveDecimals,
		}
	}

	return contractsForReserve
}

export async function deployReserveTreasury(
	isWriteInFs: boolean,
	owner: AddressLike,
) {
	const PlugForProxy = await ethers.getContractFactory('PlugForTreasury')
	const plugForProxy = await PlugForProxy.deploy()
	const verifyArgsForPlug = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		plugForProxy,
		'PlugForProxyReserveTreasury',
		verifyArgsForPlug,
	)

	const ReserveTreasury = await ethers.getContractFactory(
		'InitializableAdminUpgradeabilityProxy',
	)
	const reserveTreasury = await ReserveTreasury.deploy()
	const verifyArgs = isWriteInFs ? [] : null

	await waitAndLogDeployment(reserveTreasury, 'ReserveTreasury', verifyArgs)

	//data is from https://dashboard.tenderly.co/tx/mainnet/0x6147c76272cdb7ef1ff4ef9ce4c6f43349f6d7510759faa8f223e4c0388d1c96?trace=0.3
	const data = '0x8129fc1c'
	await reserveTreasury['initialize(address,address,bytes)'](
		plugForProxy,
		owner,
		data,
	)

	return reserveTreasury
}

export async function deployIncentivesController(
	isWriteInFs: boolean,
	owner: AddressLike,
) {
	const PlugForProxy = await ethers.getContractFactory(
		'PlugForIncentivesController',
	)
	const plugForProxy = await PlugForProxy.deploy()
	const verifyArgsForPlug = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		plugForProxy,
		'PlugForIncentivesController',
		verifyArgsForPlug,
	)

	const IncentivesController = await ethers.getContractFactory(
		'InitializableAdminUpgradeabilityProxy',
	)
	const incentivesController = await IncentivesController.deploy()

	const verifyArgs = isWriteInFs ? [] : null

	await waitAndLogDeployment(
		incentivesController,
		'IncentivesController',
		verifyArgs,
	)

	const data = '0x8129fc1c'
	await incentivesController['initialize(address,address,bytes)'](
		plugForProxy,
		owner,
		data,
	)

	return incentivesController
}

export async function deployLendingPoolCollateralManager(isWriteInFs: boolean) {
	const LendingPoolCollateralManager = await ethers.getContractFactory(
		'LendingPoolCollateralManager',
	)
	const lendingPoolCollateralManager =
		await LendingPoolCollateralManager.deploy()
	const verifyArgs = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		lendingPoolCollateralManager,
		'LendingPoolCollateralManager',
		verifyArgs,
	)
	return lendingPoolCollateralManager
}

export async function deployWalletBalanceProvider(isWriteInFs: boolean) {
	const WalletBalanceProvider = await ethers.getContractFactory(
		'WalletBalanceProvider',
	)
	const walletBalanceProvider = await WalletBalanceProvider.deploy()

	const verifyArgs = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		walletBalanceProvider,
		'WalletBalanceProvider',
		verifyArgs,
	)
	return walletBalanceProvider
}

export async function deployUiHelpers(isWriteInFs: boolean) {
	const UiPoolDataProvider =
		await ethers.getContractFactory('UiPoolDataProvider')
	const uiPoolDataProvider = await UiPoolDataProvider.deploy()

	const verifyArgs = isWriteInFs ? [] : null
	await waitAndLogDeployment(
		uiPoolDataProvider,
		'UiPoolDataProvider',
		verifyArgs,
	)
	return uiPoolDataProvider
}
