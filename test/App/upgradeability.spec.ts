import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'
import { testEnv } from './_.before'
import {
	AToken,
	MockAToken,
	MockStableDebtToken,
	MockVariableDebtToken,
	StableDebtToken,
	VariableDebtToken,
} from '../../typechain-types'

export const UpgradeabilityTest = () => {
	const { CALLER_NOT_POOL_ADMIN } = ProtocolErrors
	let newAToken: MockAToken
	let newStableToken: MockStableDebtToken
	let newVariableToken: MockVariableDebtToken

	before('deploying instances', async () => {
		const { dai, pool, reserveTreasury, incentivesController } = testEnv

		const ATokenFactory = await ethers.getContractFactory('MockAToken')
		const aTokenInstance = await ATokenFactory.deploy(
			pool,
			dai,
			reserveTreasury,
			'Aave Interest bearing DAI updated',
			'aDAI',
			incentivesController,
		)

		const stableDebtTokenFactory = await ethers.getContractFactory(
			'MockStableDebtToken',
		)
		const stableDebtTokenInstance = await stableDebtTokenFactory.deploy(
			pool,
			dai,
			'Aave stable debt bearing DAI updated',
			'stableDebtDAI',
			ethers.ZeroAddress,
		)

		const variableDebtTokenFactory = await ethers.getContractFactory(
			'MockVariableDebtToken',
		)
		const variableDebtTokenInstance = await variableDebtTokenFactory.deploy(
			pool,
			dai,
			'Aave variable debt bearing DAI updated',
			'variableDebtDAI',
			ethers.ZeroAddress,
		)

		newAToken = aTokenInstance
		newVariableToken = variableDebtTokenInstance
		newStableToken = stableDebtTokenInstance
	})

	it('Tries to update the DAI Atoken implementation with a different address than the lendingPoolManager', async () => {
		const { dai, configurator, users } = testEnv
		const name = await newAToken.name()
		const symbol = await newAToken.symbol()

		await expect(
			configurator.connect(users[10]).updateAToken(dai, newAToken),
		).to.be.revertedWith(CALLER_NOT_POOL_ADMIN)
	})

	it('Upgrades the DAI Atoken implementation ', async () => {
		const { dai, configurator, aDai, users, pool } = testEnv

		await configurator.updateAToken(dai, newAToken)

		const tokenName = await aDai.name()

		expect(tokenName).to.be.eq(
			'Aave Interest bearing DAI updated',
			'Invalid token name',
		)
	})

	it('Tries to update the DAI Stable debt token implementation with a different address than the lendingPoolManager', async () => {
		const { dai, configurator, users } = testEnv

		await expect(
			configurator
				.connect(users[1])
				.updateStableDebtToken(dai, newStableToken),
		).to.be.revertedWith(CALLER_NOT_POOL_ADMIN)
	})

	it('Upgrades the DAI stable debt token implementation ', async () => {
		const { dai, configurator, pool, helpersContract } = testEnv

		await configurator.updateStableDebtToken(dai, newStableToken)

		const { stableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(dai)

		const debtToken = await ethers.getContractAt(
			'MockVariableDebtToken',
			stableDebtTokenAddress,
		)

		const tokenName = await debtToken.name()

		expect(tokenName).to.be.eq(
			'Aave stable debt bearing DAI updated',
			'Invalid token name',
		)
	})

	it('Tries to update the DAI variable debt token implementation with a different address than the lendingPoolManager', async () => {
		const { dai, configurator, users } = testEnv

		await expect(
			configurator
				.connect(users[1])
				.updateVariableDebtToken(dai, newVariableToken),
		).to.be.revertedWith(CALLER_NOT_POOL_ADMIN)
	})

	it('Upgrades the DAI variable debt token implementation ', async () => {
		const { dai, configurator, pool, helpersContract } = testEnv

		await configurator.updateVariableDebtToken(dai, newVariableToken)

		const { variableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(dai)

		const debtToken = await ethers.getContractAt(
			'MockVariableDebtToken',
			variableDebtTokenAddress,
		)

		const tokenName = await debtToken.name()

		expect(tokenName).to.be.eq(
			'Aave variable debt bearing DAI updated',
			'Invalid token name',
		)
	})
}
