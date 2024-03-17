import { ITestEnv } from '../../heplers/types'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import {
	AToken,
	AaveProtocolDataProvider,
	InitializableAdminUpgradeabilityProxy,
	InitializableImmutableAdminUpgradeabilityProxy,
	LendingPool,
	LendingPoolAddressesProvider,
	LendingPoolAddressesProviderRegistry,
	LendingPoolConfigurator,
	LendingRateOracle,
	MintableERC20,
	MockFlashLoanReceiver,
	PriceOracle,
	WETH9Mocked,
	WETHGateway,
} from '../../typechain-types'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { deployAppFixture } from './_.fixture'

export const testEnv: ITestEnv = {
	deployer: {} as HardhatEthersSigner,
	users: [] as HardhatEthersSigner[],
	pool: {} as LendingPool,
	configurator: {} as LendingPoolConfigurator,
	oracle: {} as PriceOracle,
	helpersContract: {} as AaveProtocolDataProvider,
	weth: {} as WETH9Mocked,
	aWETH: {} as AToken,
	dai: {} as MintableERC20,
	aDai: {} as AToken,
	usdc: {} as MintableERC20,
	addressesProvider: {} as LendingPoolAddressesProvider,
	registry: {} as LendingPoolAddressesProviderRegistry,
	wethGateway: {} as WETHGateway,
	reserveTreasury: {} as InitializableAdminUpgradeabilityProxy,
	incentivesController: {} as InitializableImmutableAdminUpgradeabilityProxy,
	_mockFlashLoanReceiver: {} as MockFlashLoanReceiver,
	lendingRateOracle: {} as LendingRateOracle,
	aave: {} as MintableERC20,
	emergencyAdmin: {} as HardhatEthersSigner,
	poolAdmin: {} as HardhatEthersSigner,
	ownerPrivateKey: {} as string,
	link: {} as MintableERC20,
}

export const makeEnv = async () => {
	const deployedApp = await loadFixture(deployAppFixture)

	testEnv.deployer = deployedApp.deployer
	testEnv.users = deployedApp.users
	testEnv.pool = deployedApp.lendingPoolProxy
	testEnv.configurator = deployedApp.lendingPoolConfiguratorProxy
	testEnv.oracle = deployedApp.priceOracle
	testEnv.helpersContract = deployedApp.aaveProtocolDataProvider
	testEnv.weth = deployedApp.weth
	testEnv.aWETH = deployedApp.aWeth
	testEnv.dai = deployedApp.dai
	testEnv.aDai = deployedApp.aDai
	testEnv.usdc = deployedApp.usdc
	testEnv.addressesProvider = deployedApp.addressesProvider
	testEnv.registry = deployedApp.addressesProviderRegistry
	testEnv.wethGateway = deployedApp.wETHGateway
	testEnv.reserveTreasury = deployedApp.reserveTreasury
	testEnv.incentivesController = deployedApp.incentivesController
	testEnv._mockFlashLoanReceiver = deployedApp.mockFlashLoanReceiver
	testEnv.lendingRateOracle = deployedApp.lendingRateOracle
	testEnv.aave = deployedApp.aave
	testEnv.poolAdmin = deployedApp.poolAdmin
	testEnv.emergencyAdmin = deployedApp.emergencyAdmin
	testEnv.ownerPrivateKey = deployedApp.ownerPrivateKey
	testEnv.link = deployedApp.link
}
