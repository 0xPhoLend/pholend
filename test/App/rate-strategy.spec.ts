import { ethers } from 'hardhat'
import { expect } from 'chai'
import { testEnv } from './_.before'
import BigNumber from 'bignumber.js'
import { networksData, rateStrategyStableOne } from '../../heplers/data'
import { PERCENTAGE_FACTOR, RAY } from '../../heplers/constants'
import {
	AToken,
	DefaultReserveInterestRateStrategy,
	MintableERC20,
} from '../../typechain-types'

export const InterestRateStrategyTest = () => {
	let strategyInstance: DefaultReserveInterestRateStrategy
	let dai: MintableERC20
	let aDai: AToken
	const reserveFactorDai = networksData.test[0].config.reserveFactor

	before(async () => {
		dai = testEnv.dai
		aDai = testEnv.aDai

		const { addressesProvider } = testEnv
		const StrategyInstance = await ethers.getContractFactory(
			'DefaultReserveInterestRateStrategy',
		)
		strategyInstance = await StrategyInstance.deploy(
			addressesProvider,
			rateStrategyStableOne.optimalUtilizationRate,
			rateStrategyStableOne.baseVariableBorrowRate,
			rateStrategyStableOne.variableRateSlope1,
			rateStrategyStableOne.variableRateSlope2,
			rateStrategyStableOne.stableRateSlope1,
			rateStrategyStableOne.stableRateSlope2,
		)
	})

	it('Checks rates at 0% utilization rate, empty reserve', async () => {
		const {
			0: currentLiquidityRate,
			1: currentStableBorrowRate,
			2: currentVariableBorrowRate,
		} = await strategyInstance.calculateInterestRates(
			dai,
			0,
			0,
			0,
			0,
			networksData.test[0].config.reserveFactor,
		)

		expect(currentLiquidityRate.toString()).to.be.equal(
			'0',
			'Invalid liquidity rate',
		)
		expect(currentStableBorrowRate.toString()).to.be.equal(
			new BigNumber(0.039).times(RAY).toFixed(0),
			'Invalid stable rate',
		)
		expect(currentVariableBorrowRate.toString()).to.be.equal(
			rateStrategyStableOne.baseVariableBorrowRate,
			'Invalid variable rate',
		)
	})

	it('Checks rates at 80% utilization rate', async () => {
		const {
			0: currentLiquidityRate,
			1: currentStableBorrowRate,
			2: currentVariableBorrowRate,
		} = await strategyInstance.calculateInterestRates(
			dai,
			200000000000000000n,
			0,
			800000000000000000n,
			0,
			reserveFactorDai,
		)

		const expectedVariableRate = new BigNumber(
			rateStrategyStableOne.baseVariableBorrowRate,
		).plus(rateStrategyStableOne.variableRateSlope1)

		expect(currentLiquidityRate.toString()).to.be.equal(
			expectedVariableRate
				.times(0.8)
				.percentMul(
					new BigNumber(PERCENTAGE_FACTOR).minus(reserveFactorDai),
				)
				.toFixed(0),
			'Invalid liquidity rate',
		)

		expect(currentVariableBorrowRate.toString()).to.be.equal(
			expectedVariableRate.toFixed(0),
			'Invalid variable rate',
		)

		expect(currentStableBorrowRate.toString()).to.be.equal(
			new BigNumber(0.039)
				.times(RAY)
				.plus(rateStrategyStableOne.stableRateSlope1)
				.toFixed(0),
			'Invalid stable rate',
		)
	})

	it('Checks rates at 100% utilization rate', async () => {
		const {
			0: currentLiquidityRate,
			1: currentStableBorrowRate,
			2: currentVariableBorrowRate,
		} = await strategyInstance.calculateInterestRates(
			dai,
			'0',
			'0',
			'800000000000000000',
			'0',
			reserveFactorDai,
		)

		const expectedVariableRate = new BigNumber(
			rateStrategyStableOne.baseVariableBorrowRate,
		)
			.plus(rateStrategyStableOne.variableRateSlope1)
			.plus(rateStrategyStableOne.variableRateSlope2)

		expect(currentLiquidityRate.toString()).to.be.equal(
			expectedVariableRate
				.percentMul(
					new BigNumber(PERCENTAGE_FACTOR).minus(reserveFactorDai),
				)
				.toFixed(0),
			'Invalid liquidity rate',
		)

		expect(currentVariableBorrowRate.toString()).to.be.equal(
			expectedVariableRate.toFixed(0),
			'Invalid variable rate',
		)

		expect(currentStableBorrowRate.toString()).to.be.equal(
			new BigNumber(0.039)
				.times(RAY)
				.plus(rateStrategyStableOne.stableRateSlope1)
				.plus(rateStrategyStableOne.stableRateSlope2)
				.toFixed(0),
			'Invalid stable rate',
		)
	})

	it('Checks rates at 100% utilization rate, 50% stable debt and 50% variable debt, with a 10% avg stable rate', async () => {
		const {
			0: currentLiquidityRate,
			1: currentStableBorrowRate,
			2: currentVariableBorrowRate,
		} = await strategyInstance.calculateInterestRates(
			dai,
			'0',
			'400000000000000000',
			'400000000000000000',
			'100000000000000000000000000',
			reserveFactorDai,
		)

		const expectedVariableRate = new BigNumber(
			rateStrategyStableOne.baseVariableBorrowRate,
		)
			.plus(rateStrategyStableOne.variableRateSlope1)
			.plus(rateStrategyStableOne.variableRateSlope2)

		const expectedLiquidityRate = new BigNumber(
			(
				(currentVariableBorrowRate + 100000000000000000000000000n) /
				2n
			).toString(),
		)
			.percentMul(
				new BigNumber(PERCENTAGE_FACTOR).minus(reserveFactorDai),
			)
			.toFixed(0)

		expect(currentLiquidityRate.toString()).to.be.equal(
			expectedLiquidityRate,
			'Invalid liquidity rate',
		)

		expect(currentVariableBorrowRate.toString()).to.be.equal(
			expectedVariableRate.toFixed(0),
			'Invalid variable rate',
		)

		expect(currentStableBorrowRate.toString()).to.be.equal(
			new BigNumber(0.039)
				.times(RAY)
				.plus(rateStrategyStableOne.stableRateSlope1)
				.plus(rateStrategyStableOne.stableRateSlope2)
				.toFixed(0),
			'Invalid stable rate',
		)
	})
}
