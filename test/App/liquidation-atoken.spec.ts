import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ProtocolErrors, RateMode } from '../../heplers/types'
import { testEnv } from './_.before'
import {
	convertToCurrencyDecimals,
	getReserveData,
	getUserData,
} from '../../heplers/helpers'
import { APPROVAL_AMOUNT_LENDING_POOL, oneEther } from '../../heplers/constants'
import BigNumber from 'bignumber.js'
import { calcExpectedVariableDebtTokenBalance } from './utils/calculation'

export const LendingPoolLiquidationTest = () => {
	const {
		LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
		INVALID_HF,
		LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER,
		LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED,
		LP_IS_PAUSED,
	} = ProtocolErrors

	it('Deposits WETH, borrows DAI/Check liquidation fails because health factor is above 1', async () => {
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

		const amountETHtoDeposit = await convertToCurrencyDecimals(weth, '1')

		//mints WETH to borrower
		await weth.connect(borrower).mint(amountETHtoDeposit)

		//approve protocol to access borrower wallet
		await weth.connect(borrower).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		//user 2 deposits 1 WETH
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
				RateMode.Variable,
				'0',
				borrower.address,
			)

		const userGlobalDataAfter = await pool.getUserAccountData(
			borrower.address,
		)

		expect(
			userGlobalDataAfter.currentLiquidationThreshold.toString(),
		).to.be.equal('8250', 'Invalid liquidation threshold')

		//someone tries to liquidate user 2
		await expect(
			pool.liquidationCall(weth, dai, borrower.address, 1, true),
		).to.be.revertedWith(LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD)
	})

	it('Drop the health factor below 1', async () => {
		const { dai, users, pool, oracle } = testEnv
		const borrower = users[1]

		const daiPrice = await oracle.getAssetPrice(dai)

		await oracle.setAssetPrice(
			dai,
			new BigNumber(daiPrice.toString()).multipliedBy(1.15).toFixed(0),
		)

		const userGlobalData = await pool.getUserAccountData(borrower.address)

		expect(userGlobalData.healthFactor).to.be.lt(
			oneEther.toString(),
			INVALID_HF,
		)
	})

	it('Tries to liquidate a different currency than the loan principal', async () => {
		const { pool, users, weth } = testEnv
		const borrower = users[1]
		//user 2 tries to borrow
		await expect(
			pool.liquidationCall(
				weth,
				weth,
				borrower.address,
				oneEther.toString(),
				true,
			),
		).revertedWith(LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER)
	})

	it('Tries to liquidate a different collateral than the borrower collateral', async () => {
		const { pool, dai, users } = testEnv
		const borrower = users[1]

		await expect(
			pool.liquidationCall(
				dai,
				dai,
				borrower.address,
				oneEther.toString(),
				true,
			),
		).revertedWith(LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED)
	})

	it('Liquidates the borrow', async () => {
		const {
			pool,
			dai,
			weth,
			aWETH,
			aDai,
			users,
			oracle,
			helpersContract,
			deployer,
			lendingRateOracle,
		} = testEnv
		const borrower = users[1]

		//mints dai to the caller

		await dai.mint(await convertToCurrencyDecimals(dai, '1000'))

		//approve protocol to access depositor wallet
		await dai.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		const daiReserveDataBefore = await getReserveData(
			helpersContract,
			dai,
			lendingRateOracle,
		)
		const ethReserveDataBefore = await helpersContract.getReserveData(weth)

		const userReserveDataBefore = await getUserData(
			pool,
			helpersContract,
			dai,
			borrower,
		)

		const amountToLiquidate = new BigNumber(
			userReserveDataBefore.currentVariableDebt.toString(),
		)
			.div(2)
			.toFixed(0)

		const tx = await pool.liquidationCall(
			weth,
			dai,
			borrower.address,
			amountToLiquidate,
			true,
		)

		const userReserveDataAfter = await helpersContract.getUserReserveData(
			dai,
			borrower.address,
		)

		const userGlobalDataAfter = await pool.getUserAccountData(
			borrower.address,
		)

		const daiReserveDataAfter = await helpersContract.getReserveData(dai)
		const ethReserveDataAfter = await helpersContract.getReserveData(weth)

		const collateralPrice = (await oracle.getAssetPrice(weth)).toString()
		const principalPrice = (await oracle.getAssetPrice(dai)).toString()

		const collateralDecimals = (
			await helpersContract.getReserveConfigurationData(weth)
		).decimals.toString()
		const principalDecimals = (
			await helpersContract.getReserveConfigurationData(dai)
		).decimals.toString()

		const expectedCollateralLiquidated = new BigNumber(principalPrice)
			.times(new BigNumber(amountToLiquidate).times(105))
			.times(new BigNumber(10).pow(collateralDecimals))
			.div(
				new BigNumber(collateralPrice).times(
					new BigNumber(10).pow(principalDecimals),
				),
			)
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

		const variableDebtBeforeTx = calcExpectedVariableDebtTokenBalance(
			daiReserveDataBefore,
			userReserveDataBefore,
			txTimestamp,
		)

		expect(userGlobalDataAfter.healthFactor).to.be.gt(
			oneEther.toFixed(0),
			'Invalid health factor',
		)

		expect(userReserveDataAfter.currentVariableDebt).to.be.equal(
			new BigNumber(variableDebtBeforeTx)
				.minus(amountToLiquidate)
				.toFixed(0),
			'Invalid user borrow balance after liquidation',
		)

		expect(daiReserveDataAfter.availableLiquidity.toString()).to.be.equal(
			new BigNumber(daiReserveDataBefore.availableLiquidity.toString())
				.plus(amountToLiquidate)
				.toFixed(0),
			'Invalid principal available liquidity',
		)

		//the liquidity index of the principal reserve needs to be bigger than the index before
		expect(daiReserveDataAfter.liquidityIndex).to.be.gte(
			daiReserveDataBefore.liquidityIndex.toFixed(),
			'Invalid liquidity index',
		)

		//the principal APY after a liquidation needs to be lower than the APY before
		expect(daiReserveDataAfter.liquidityRate).to.be.lt(
			daiReserveDataBefore.liquidityRate.toFixed(),
			'Invalid liquidity APY',
		)

		expect(ethReserveDataAfter.availableLiquidity).to.be.equal(
			ethReserveDataBefore.availableLiquidity,
			'Invalid collateral available liquidity',
		)

		expect(
			(await helpersContract.getUserReserveData(weth, deployer.address))
				.usageAsCollateralEnabled,
		).to.be.true
	})

	it('User 3 deposits 1000 USDC, user 4 1 WETH, user 4 borrows - drops HF, liquidates the borrow', async () => {
		const { users, pool, usdc, oracle, weth, helpersContract } = testEnv
		const depositor = users[3]
		const borrower = users[4]

		//mints USDC to depositor
		await usdc
			.connect(depositor)
			.mint(await convertToCurrencyDecimals(usdc, '1000'))

		//approve protocol to access depositor wallet
		await usdc
			.connect(depositor)
			.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		//user 3 deposits 1000 USDC
		const amountUSDCtoDeposit = await convertToCurrencyDecimals(
			usdc,
			'1000',
		)

		await pool
			.connect(depositor)
			.deposit(usdc, amountUSDCtoDeposit, depositor.address, '0')

		//user 4 deposits 1 ETH
		const amountETHtoDeposit = await convertToCurrencyDecimals(weth, '1')

		//mints WETH to borrower
		await weth.connect(borrower).mint(amountETHtoDeposit)

		//approve protocol to access borrower wallet
		await weth.connect(borrower).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		await pool
			.connect(borrower)
			.deposit(weth, amountETHtoDeposit, borrower.address, '0')

		//user 4 borrows
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

		await usdc.mint(await convertToCurrencyDecimals(usdc, '1000'))

		//approve protocol to access depositor wallet
		await usdc.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		const userReserveDataBefore = await helpersContract.getUserReserveData(
			usdc,
			borrower.address,
		)

		const usdcReserveDataBefore = await helpersContract.getReserveData(usdc)
		const ethReserveDataBefore = await helpersContract.getReserveData(weth)

		const amountToLiquidate = new BigNumber(
			userReserveDataBefore.currentStableDebt.toString(),
		)
			.multipliedBy(0.5)
			.toFixed(0)

		await pool.liquidationCall(
			weth,
			usdc,
			borrower.address,
			amountToLiquidate,
			true,
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

		const collateralPrice = (await oracle.getAssetPrice(weth)).toString()
		const principalPrice = (await oracle.getAssetPrice(usdc)).toString()

		const collateralDecimals = (
			await helpersContract.getReserveConfigurationData(weth)
		).decimals.toString()
		const principalDecimals = (
			await helpersContract.getReserveConfigurationData(usdc)
		).decimals.toString()

		const expectedCollateralLiquidated = new BigNumber(principalPrice)
			.times(new BigNumber(amountToLiquidate).times(105))
			.times(new BigNumber(10).pow(collateralDecimals))
			.div(
				new BigNumber(collateralPrice).times(
					new BigNumber(10).pow(principalDecimals),
				),
			)
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

		expect(usdcReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(usdcReserveDataBefore.availableLiquidity.toString())
				.plus(amountToLiquidate)
				.toFixed(0),
			'Invalid principal available liquidity',
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

		expect(ethReserveDataAfter.availableLiquidity).to.be.equal(
			new BigNumber(
				ethReserveDataBefore.availableLiquidity.toString(),
			).toFixed(0),
			'Invalid collateral available liquidity',
		)
	})
}
