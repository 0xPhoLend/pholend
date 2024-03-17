import { AddressesProviderRegistryTest } from './addresses-provider-registry.spec'
import { LendingPoolConfiguratorTest } from './configurator.spec'
import { delegationAwareTest } from './delegation-aware-atoken.spec'
import { flashloanTest } from './flashloan.spec'
import { LendingPoolAddressesProviderTest } from './lending-pool-addresses-provider.spec'
import { LendingPoolLiquidationTest } from './liquidation-atoken.spec'
import { LendingPoolliquidationUnderlyingTest } from './liquidation-underlying.spec'
import { PausablePoolTest } from './pausable-functions.spec'
import { InterestRateStrategyTest } from './rate-strategy.spec'
import fs from 'fs'
import { executeStory } from './scenario.spec'
import { makeSuite } from './utils/makeSuite'
import { ATokenModifiersTest } from './atoken-modifiers.spec'
import { ATokenPermitTest } from './atoken-permit.spec'
import { ATokenTransferTest } from './atoken-transfer.spec'
import BigNumber from 'bignumber.js'
import { StableDebtTokenTest } from './stable-token.spec'
import { UpgradeabilityTest } from './upgradeability.spec'
import { VariableDebtTokenTest } from './variable-debt-token.spec'
import { WETHGatewayTest } from './weth-gateway.spec'
import { treasuryTest } from './treasury.spec'
import { someTesting } from './for-testing-function'

const scenarioFolder = './test/App/utils/scenarios/'
const selectedScenarios: string[] = []

makeSuite('AddressesProviderRegistry', AddressesProviderRegistryTest)
makeSuite('AToken: Modifiers', ATokenModifiersTest)
makeSuite('AToken: Permit', ATokenPermitTest)
makeSuite('AToken: Transfer', ATokenTransferTest)
makeSuite('LendingPoolConfigurator', LendingPoolConfiguratorTest)
makeSuite('AToken: underlying delegation', delegationAwareTest)
makeSuite('LendingPool FlashLoan function', flashloanTest)
makeSuite('LendingPoolAddressesProvider', LendingPoolAddressesProviderTest)
makeSuite(
	'LendingPool liquidation - liquidator receiving aToken',
	LendingPoolLiquidationTest,
)
makeSuite(
	'LendingPool liquidation - liquidator receiving the underlying asset',
	LendingPoolliquidationUnderlyingTest,
)
makeSuite('Pausable Pool', PausablePoolTest)
makeSuite('Interest rate strategy tests', InterestRateStrategyTest)
fs.readdirSync(scenarioFolder).forEach((file) => {
	const scenario = require(`./utils/scenarios/${file}`)
	makeSuite(scenario.title, async () => {
		before('Initializing configuration', async () => {
			// Sets BigNumber for this suite, instead of globally
			BigNumber.config({
				DECIMAL_PLACES: 0,
				ROUNDING_MODE: BigNumber.ROUND_DOWN,
			})
		})
		after('Reset', () => {
			// Reset BigNumber
			BigNumber.config({
				DECIMAL_PLACES: 20,
				ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
			})
		})
		for (const story of scenario.stories) {
			it(story.description, async function () {
				// Retry the test scenarios up to 4 times if an error happens, due erratic HEVM network errors
				this.retries(4)
				await executeStory(story)
			})
		}
	})
})
makeSuite('Stable debt token tests', StableDebtTokenTest)
makeSuite('Upgradeability', UpgradeabilityTest)
makeSuite('Variable debt token tests', VariableDebtTokenTest)
makeSuite('Use native ETH at LendingPool via WETHGateway', WETHGatewayTest)
makeSuite('Check treasury', treasuryTest)
makeSuite('testing functions of protocol', someTesting, 'only')
