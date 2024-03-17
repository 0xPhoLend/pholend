import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ProtocolErrors, RateMode } from '../../heplers/types'
import BigNumber from 'bignumber.js'
import { testEnv } from './_.before'
import {
	convertToCurrencyDecimals,
	getUserData,
	increaseTime,
} from '../../heplers/helpers'
import { APPROVAL_AMOUNT_LENDING_POOL, oneEther } from '../../heplers/constants'
import { calcExpectedStableDebtTokenBalance } from './utils/calculation'

export const LendingPoolliquidationUnderlyingTest = () => {
	const { INVALID_HF } = ProtocolErrors

	before('Before LendingPool liquidation: set config', () => {
		BigNumber.config({
			DECIMAL_PLACES: 0,
			ROUNDING_MODE: BigNumber.ROUND_DOWN,
		})
	})

	after('After LendingPool liquidation: reset config', () => {
		BigNumber.config({
			DECIMAL_PLACES: 20,
			ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
		})
	})

	it("It's not possible to liquidate on a non-active collateral or a non active principal", async () => {
		const { configurator, weth, pool, users, dai } = testEnv
		const user = users[1]
		await configurator.deactivateReserve(weth)

		await expect(
			pool.liquidationCall(
				weth,
				dai,
				user.address,
				ethers.parseEther('1000'),
				false,
			),
		).to.be.revertedWith('2')

		await configurator.activateReserve(weth)

		await configurator.deactivateReserve(dai)

		await expect(
			pool.liquidationCall(
				weth,
				dai,
				user.address,
				ethers.parseEther('1000'),
				false,
			),
		).to.be.revertedWith('2')

		await configurator.activateReserve(dai)
	})

	it('Deposits WETH, borrows DAI', async () => {
		const { dai, weth, users, pool, oracle } = testEnv
		const depositor = users[0]
		const borrower = users[1]

		//mints DAI to depositor
		await dai
			.connect(depositor)
			.mint(await convertToCurrencyDecimals(dai, '1000'))

		//approve protocol to access depositor wallet
		await dai.connect(depositor).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		//user 1 deposits 1000 DAI
		const amountDAItoDeposit = await convertToCurrencyDecimals(dai, '1000')

		await pool
			.connect(depositor)
			.deposit(dai, amountDAItoDeposit, depositor.address, '0')
		//user 2 deposits 1 ETH
		const amountETHtoDeposit = await convertToCurrencyDecimals(weth, '1')

		//mints WETH to borrower
		await weth
			.connect(borrower)
			.mint(await convertToCurrencyDecimals(weth, '1000'))

		//approve protocol to access the borrower wallet
		await weth.connect(borrower).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		await pool
			.connect(borrower)
			.deposit(weth, amountETHtoDeposit, borrower.address, '0')

		//user 2 borrows

		const userGlobalData = await pool.getUserAccountData(borrower.address)
		const daiPrice = await oracle.getAssetPrice(dai)

		const amountDAIToBorrow = await convertToCurrencyDecimals(
			dai,
			new BigNumber(userGlobalData.availableBorrowsETH.toString())
				.div(daiPrice.toString())
				.multipliedBy(0.95)
				.toFixed(0),
		)

		await pool
			.connect(borrower)
			.borrow(
				dai,
				amountDAIToBorrow,
				RateMode.Stable,
				'0',
				borrower.address,
			)

		const userGlobalDataAfter = await pool.getUserAccountData(
			borrower.address,
		)

		expect(
			userGlobalDataAfter.currentLiquidationThreshold.toString(),
		).to.be.equal('8250', INVALID_HF)
	})

	it('Drop the health factor below 1', async () => {
		const { dai, weth, users, pool, oracle } = testEnv
		const borrower = users[1]

		const daiPrice = await oracle.getAssetPrice(dai)

		await oracle.setAssetPrice(
			dai,
			new BigNumber(daiPrice.toString()).multipliedBy(1.18).toFixed(0),
		)

		const userGlobalData = await pool.getUserAccountData(borrower.address)

		expect(userGlobalData.healthFactor).to.be.lt(
			oneEther.toFixed(0),
			INVALID_HF,
		)
	})

	it('Liquidates the borrow', async () => {
		const { dai, weth, users, pool, oracle, helpersContract } = testEnv
		const liquidator = users[3]
		const borrower = users[1]

		//mints dai to the liquidator
		await dai
			.connect(liquidator)
			.mint(await convertToCurrencyDecimals(dai, '1000'))

		//approve protocol to access the liquidator wallet
		await dai
			.connect(liquidator)
			.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		const daiReserveDataBefore = await helpersContract.getReserveData(dai)
		const ethReserveDataBefore = await helpersContract.getReserveData(weth)

		const userReserveDataBefore = await getUserData(
			pool,
			helpersContract,
			dai,
			borrower,
		)

		const amountToLiquidate = userReserveDataBefore.currentStableDebt
			.div(2)
			.toFixed(0)

		await increaseTime(100)

		const tx = await pool
			.connect(liquidator)
			.liquidationCall(
				weth,
				dai,
				borrower.address,
				amountToLiquidate,
				false,
			)

		const userReserveDataAfter = await getUserData(
			pool,
			helpersContract,
			dai,
			borrower,
		)

		const daiReserveDataAfter = await helpersContract.getReserveData(dai)
		const ethReserveDataAfter = await helpersContract.getReserveData(weth)

		const collateralPrice = await oracle.getAssetPrice(weth)
		const principalPrice = await oracle.getAssetPrice(dai)

		const collateralDecimals = (
			await helpersContract.getReserveConfigurationData(weth)
		).decimals.toString()
		const principalDecimals = (
			await helpersContract.getReserveConfigurationData(dai)
		).decimals.toString()

		const expectedCollateralLiquidated = new BigNumber(
			principalPrice.toString(),
		)
			.times(new BigNumber(amountToLiquidate).times(105))
			.times(new BigNumber(10).pow(collateralDecimals))
			.div(
				new BigNumber(collateralPrice.toString()).times(
					new BigNumber(10).pow(principalDecimals),
				),
			)
			.div(100)
			.decimalPlaces(0, BigNumber.ROUND_DOWN)

		if (!tx.blockNumber) {
			expect(false, 'Invalid block number')
			return
		}

		const block = await ethers.provider.getBlock(tx.blockNumber)
		let txTimestamp = {} as BigNumber
		if (block) {
			txTimestamp = new BigNumber(block.timestamp)
		} else {
			throw Error('block is null')
		}

		const stableDebtBeforeTx = calcExpectedStableDebtTokenBalance(
			userReserveDataBefore.principalStableDebt,
			userReserveDataBefore.stableBorrowRate,
			userReserveDataBefore.stableRateLastUpdated,
			txTimestamp,
		)

		expect(userReserveDataAfter.currentStableDebt).to.be.equal(
			stableDebtBeforeTx.minus(amountToLiquidate).toFixed(0),
			'Invalid user debt after liquidation',
		)

		//the liquidity index of the principal reserve needs to be bigger than the index before
		expect(daiReserveDataAfter.liquidityIndex).to.be.gte(
			daiReserveDataBefore.liquidityIndex,
			'Invalid liquidity index',
		)

		//the principal APY after a liquidation needs to be lower than the APY before
		expect(daiReserveDataAfter.liquidityRate).to.be.lt(
			daiReserveDataBefore.liquidityRate,
			'Invalid liquidity APY',
		)

		expect(daiReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(daiReserveDataBefore.availableLiquidity.toString())
				.plus(amountToLiquidate)
				.toFixed(0),
			'Invalid principal available liquidity',
		)

		expect(ethReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(ethReserveDataBefore.availableLiquidity.toString())
				.minus(expectedCollateralLiquidated)
				.toFixed(0),
			'Invalid collateral available liquidity',
		)
	})

	it('User 3 deposits 1000 USDC, user 4 1 WETH, user 4 borrows - drops HF, liquidates the borrow', async () => {
		const { usdc, users, pool, oracle, weth, helpersContract } = testEnv

		const depositor = users[3]
		const borrower = users[4]
		const liquidator = users[5]

		//mints USDC to depositor
		await usdc
			.connect(depositor)
			.mint(await convertToCurrencyDecimals(usdc, '1000'))

		//approve protocol to access depositor wallet
		await usdc
			.connect(depositor)
			.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		//depositor deposits 1000 USDC
		const amountUSDCtoDeposit = await convertToCurrencyDecimals(
			usdc,
			'1000',
		)

		await pool
			.connect(depositor)
			.deposit(usdc, amountUSDCtoDeposit, depositor.address, '0')

		//borrower deposits 1 ETH
		const amountETHtoDeposit = await convertToCurrencyDecimals(weth, '1')

		//mints WETH to borrower
		await weth
			.connect(borrower)
			.mint(await convertToCurrencyDecimals(weth, '1000'))

		//approve protocol to access the borrower wallet
		await weth.connect(borrower).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		await pool
			.connect(borrower)
			.deposit(weth, amountETHtoDeposit, borrower.address, '0')

		//borrower borrows
		const userGlobalData = await pool.getUserAccountData(borrower.address)

		const usdcPrice = await oracle.getAssetPrice(usdc)

		const amountUSDCToBorrow = await convertToCurrencyDecimals(
			usdc,
			new BigNumber(userGlobalData.availableBorrowsETH.toString())
				.div(usdcPrice.toString())
				.multipliedBy(0.9502)
				.toFixed(0),
		)

		await pool
			.connect(borrower)
			.borrow(
				usdc,
				amountUSDCToBorrow,
				RateMode.Stable,
				'0',
				borrower.address,
			)

		//drops HF below 1
		await oracle.setAssetPrice(
			usdc,
			new BigNumber(usdcPrice.toString()).multipliedBy(1.12).toFixed(0),
		)

		//mints dai to the liquidator

		await usdc
			.connect(liquidator)
			.mint(await convertToCurrencyDecimals(usdc, '1000'))

		//approve protocol to access depositor wallet
		await usdc
			.connect(liquidator)
			.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		const userReserveDataBefore = await helpersContract.getUserReserveData(
			usdc,
			borrower.address,
		)

		const usdcReserveDataBefore = await helpersContract.getReserveData(usdc)
		const ethReserveDataBefore = await helpersContract.getReserveData(weth)

		const amountToLiquidate = new BigNumber(
			userReserveDataBefore.currentStableDebt.toString(),
		)
			.div(2)
			.toString()

		await pool
			.connect(liquidator)
			.liquidationCall(
				weth,
				usdc,
				borrower.address,
				amountToLiquidate,
				false,
			)

		const userReserveDataAfter = await helpersContract.getUserReserveData(
			usdc,
			borrower.address,
		)

		const userGlobalDataAfter = await pool.getUserAccountData(
			borrower.address,
		)

		const usdcReserveDataAfter = await helpersContract.getReserveData(usdc)
		const ethReserveDataAfter = await helpersContract.getReserveData(weth)

		const collateralPrice = await oracle.getAssetPrice(weth)
		const principalPrice = await oracle.getAssetPrice(usdc)

		const collateralDecimals = (
			await helpersContract.getReserveConfigurationData(weth)
		).decimals.toString()
		const principalDecimals = (
			await helpersContract.getReserveConfigurationData(usdc)
		).decimals.toString()

		const expectedCollateralLiquidated = new BigNumber(
			principalPrice.toString(),
		)
			.times(new BigNumber(amountToLiquidate).times(105))
			.times(new BigNumber(10).pow(collateralDecimals))
			.div(
				new BigNumber(collateralPrice.toString()).times(
					new BigNumber(10).pow(principalDecimals),
				),
			)
			.div(100)
			.decimalPlaces(0, BigNumber.ROUND_DOWN)

		expect(userGlobalDataAfter.healthFactor).to.be.gt(
			oneEther.toFixed(0),
			'Invalid health factor',
		)

		expect(userReserveDataAfter.currentStableDebt).to.be.equal(
			new BigNumber(userReserveDataBefore.currentStableDebt.toString())
				.minus(amountToLiquidate)
				.toFixed(0),
			'Invalid user borrow balance after liquidation',
		)

		//the liquidity index of the principal reserve needs to be bigger than the index before
		expect(usdcReserveDataAfter.liquidityIndex).to.be.gte(
			usdcReserveDataBefore.liquidityIndex,
			'Invalid liquidity index',
		)

		//the principal APY after a liquidation needs to be lower than the APY before
		expect(usdcReserveDataAfter.liquidityRate).to.be.lt(
			usdcReserveDataBefore.liquidityRate,
			'Invalid liquidity APY',
		)

		expect(usdcReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(usdcReserveDataBefore.availableLiquidity.toString())
				.plus(amountToLiquidate)
				.toFixed(0),
			'Invalid principal available liquidity',
		)

		expect(ethReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(ethReserveDataBefore.availableLiquidity.toString())
				.minus(expectedCollateralLiquidated)
				.toFixed(0),
			'Invalid collateral available liquidity',
		)
	})

	it('User 4 deposits 10 AAVE - drops HF, liquidates the AAVE, which results on a lower amount being liquidated', async () => {
		const { aave, usdc, users, pool, oracle, helpersContract } = testEnv

		const depositor = users[3]
		const borrower = users[4]
		const liquidator = users[5]

		//mints AAVE to borrower
		await aave
			.connect(borrower)
			.mint(await convertToCurrencyDecimals(aave, '10'))

		//approve protocol to access the borrower wallet
		await aave.connect(borrower).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		//borrower deposits 10 AAVE
		const amountToDeposit = await convertToCurrencyDecimals(aave, '10')

		await pool
			.connect(borrower)
			.deposit(aave, amountToDeposit, borrower.address, '0')
		const usdcPrice = await oracle.getAssetPrice(usdc)

		//drops HF below 1
		await oracle.setAssetPrice(
			usdc,
			new BigNumber(usdcPrice.toString()).multipliedBy(1.14).toFixed(0),
		)

		//mints usdc to the liquidator
		await usdc
			.connect(liquidator)
			.mint(await convertToCurrencyDecimals(usdc, '1000'))

		//approve protocol to access depositor wallet
		await usdc
			.connect(liquidator)
			.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		const userReserveDataBefore = await helpersContract.getUserReserveData(
			usdc,
			borrower.address,
		)

		const usdcReserveDataBefore = await helpersContract.getReserveData(usdc)
		const aaveReserveDataBefore = await helpersContract.getReserveData(aave)

		const amountToLiquidate = new BigNumber(
			userReserveDataBefore.currentStableDebt.toString(),
		)
			.div(2)
			.decimalPlaces(0, BigNumber.ROUND_DOWN)
			.toFixed(0)

		const collateralPrice = await oracle.getAssetPrice(aave)
		const principalPrice = await oracle.getAssetPrice(usdc)

		await pool
			.connect(liquidator)
			.liquidationCall(
				aave,
				usdc,
				borrower.address,
				amountToLiquidate,
				false,
			)

		const userReserveDataAfter = await helpersContract.getUserReserveData(
			usdc,
			borrower.address,
		)

		const userGlobalDataAfter = await pool.getUserAccountData(
			borrower.address,
		)

		const usdcReserveDataAfter = await helpersContract.getReserveData(usdc)
		const aaveReserveDataAfter = await helpersContract.getReserveData(aave)

		const aaveConfiguration =
			await helpersContract.getReserveConfigurationData(aave)
		const collateralDecimals = aaveConfiguration.decimals.toString()
		const liquidationBonus = aaveConfiguration.liquidationBonus.toString()

		const principalDecimals = (
			await helpersContract.getReserveConfigurationData(usdc)
		).decimals.toString()

		const expectedCollateralLiquidated = oneEther.multipliedBy('10')

		const expectedPrincipal = new BigNumber(collateralPrice.toString())
			.times(expectedCollateralLiquidated)
			.times(new BigNumber(10).pow(principalDecimals))
			.div(
				new BigNumber(principalPrice.toString()).times(
					new BigNumber(10).pow(collateralDecimals),
				),
			)
			.times(10000)
			.div(liquidationBonus.toString())
			.decimalPlaces(0, BigNumber.ROUND_DOWN)

		expect(userGlobalDataAfter.healthFactor).to.be.gt(
			oneEther.toFixed(0),
			'Invalid health factor',
		)

		expect(userReserveDataAfter.currentStableDebt).to.be.equal(
			new BigNumber(userReserveDataBefore.currentStableDebt.toString())
				.minus(expectedPrincipal)
				.toFixed(0),
			'Invalid user borrow balance after liquidation',
		)

		expect(usdcReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(usdcReserveDataBefore.availableLiquidity.toString())
				.plus(expectedPrincipal)
				.toFixed(0),
			'Invalid principal available liquidity',
		)

		expect(aaveReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(aaveReserveDataBefore.availableLiquidity.toString())
				.minus(expectedCollateralLiquidated)
				.toFixed(0),
			'Invalid collateral available liquidity',
		)
	})
}
