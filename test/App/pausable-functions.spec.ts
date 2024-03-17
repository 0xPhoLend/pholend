import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ProtocolErrors, RateMode } from '../../heplers/types'
import { testEnv } from './_.before'
import { convertToCurrencyDecimals } from '../../heplers/helpers'
import { APPROVAL_AMOUNT_LENDING_POOL } from '../../heplers/constants'
import BigNumber from 'bignumber.js'

export const PausablePoolTest = () => {
	const {
		LP_IS_PAUSED,
		INVALID_FROM_BALANCE_AFTER_TRANSFER,
		INVALID_TO_BALANCE_AFTER_TRANSFER,
	} = ProtocolErrors

	it('User 0 deposits 1000 DAI. Configurator pauses pool. Transfers to user 1 reverts. Configurator unpauses the network and next transfer succees', async () => {
		const { users, pool, dai, aDai, configurator } = testEnv

		const amountDAItoDeposit = await convertToCurrencyDecimals(dai, '1000')

		await dai.connect(users[0]).mint(amountDAItoDeposit)

		// user 0 deposits 1000 DAI
		await dai.connect(users[0]).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)
		await pool
			.connect(users[0])
			.deposit(dai, amountDAItoDeposit, users[0].address, '0')

		const user0Balance = await aDai.balanceOf(users[0].address)
		const user1Balance = await aDai.balanceOf(users[1].address)

		// Configurator pauses the pool
		await configurator.setPoolPause(true)

		// User 0 tries the transfer to User 1
		await expect(
			aDai
				.connect(users[0])
				.transfer(users[1].address, amountDAItoDeposit),
		).to.revertedWith(LP_IS_PAUSED)

		const pausedFromBalance = await aDai.balanceOf(users[0].address)
		const pausedToBalance = await aDai.balanceOf(users[1].address)

		expect(pausedFromBalance).to.be.equal(
			user0Balance.toString(),
			INVALID_TO_BALANCE_AFTER_TRANSFER,
		)
		expect(pausedToBalance.toString()).to.be.equal(
			user1Balance.toString(),
			INVALID_FROM_BALANCE_AFTER_TRANSFER,
		)

		// Configurator unpauses the pool
		await configurator.setPoolPause(false)

		// User 0 succeeds transfer to User 1
		await aDai
			.connect(users[0])
			.transfer(users[1].address, amountDAItoDeposit)

		const fromBalance = await aDai.balanceOf(users[0].address)
		const toBalance = await aDai.balanceOf(users[1].address)

		expect(fromBalance.toString()).to.be.equal(
			user0Balance - amountDAItoDeposit,
			INVALID_FROM_BALANCE_AFTER_TRANSFER,
		)
		expect(toBalance.toString()).to.be.equal(
			user1Balance + amountDAItoDeposit,
			INVALID_TO_BALANCE_AFTER_TRANSFER,
		)
	})

	it('Deposit', async () => {
		const { users, pool, dai, aDai, configurator } = testEnv

		const amountDAItoDeposit = await convertToCurrencyDecimals(dai, '1000')

		await dai.connect(users[0]).mint(amountDAItoDeposit)

		// user 0 deposits 1000 DAI
		await dai.connect(users[0]).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		// Configurator pauses the pool
		await configurator.setPoolPause(true)
		await expect(
			pool
				.connect(users[0])
				.deposit(dai, amountDAItoDeposit, users[0].address, '0'),
		).to.revertedWith(LP_IS_PAUSED)

		// Configurator unpauses the pool
		await configurator.setPoolPause(false)
	})

	it('Withdraw', async () => {
		const { users, pool, dai, aDai, configurator } = testEnv

		const amountDAItoDeposit = await convertToCurrencyDecimals(dai, '1000')

		await dai.connect(users[0]).mint(amountDAItoDeposit)

		// user 0 deposits 1000 DAI
		await dai.connect(users[0]).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)
		await pool
			.connect(users[0])
			.deposit(dai, amountDAItoDeposit, users[0].address, '0')

		// Configurator pauses the pool
		await configurator.setPoolPause(true)

		// user tries to burn
		await expect(
			pool
				.connect(users[0])
				.withdraw(dai, amountDAItoDeposit, users[0].address),
		).to.revertedWith(LP_IS_PAUSED)

		// Configurator unpauses the pool
		await configurator.setPoolPause(false)
	})

	it('Borrow', async () => {
		const { pool, dai, users, configurator } = testEnv

		const user = users[1]
		// Pause the pool
		await configurator.setPoolPause(true)

		// Try to execute liquidation
		await expect(
			pool.connect(user).borrow(dai, '1', '1', '0', user.address),
		).revertedWith(LP_IS_PAUSED)

		// Unpause the pool
		await configurator.setPoolPause(false)
	})

	it('Repay', async () => {
		const { pool, dai, users, configurator } = testEnv

		const user = users[1]
		// Pause the pool
		await configurator.setPoolPause(true)

		// Try to execute liquidation
		await expect(
			pool.connect(user).repay(dai, '1', '1', user.address),
		).revertedWith(LP_IS_PAUSED)

		// Unpause the pool
		await configurator.setPoolPause(false)
	})

	it('Flash loan', async () => {
		const { dai, pool, weth, users, configurator, _mockFlashLoanReceiver } =
			testEnv

		const caller = users[3]

		const flashAmount = ethers.parseEther('0.8')

		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)

		// Pause pool
		await configurator.setPoolPause(true)

		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver,
					[weth],
					[flashAmount],
					[1],
					caller.address,
					'0x10',
					'0',
				),
		).revertedWith(LP_IS_PAUSED)

		// Unpause pool
		await configurator.setPoolPause(false)
	})

	it('Liquidation call', async () => {
		const {
			users,
			pool,
			usdc,
			oracle,
			weth,
			configurator,
			helpersContract,
		} = testEnv
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

		// Drops HF below 1
		await oracle.setAssetPrice(
			usdc,
			new BigNumber(usdcPrice.toString()).multipliedBy(1.2).toFixed(0),
		)

		//mints dai to the liquidator
		await usdc.mint(await convertToCurrencyDecimals(usdc, '1000'))
		await usdc.approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		const userReserveDataBefore = await helpersContract.getUserReserveData(
			usdc,
			borrower.address,
		)

		const amountToLiquidate = new BigNumber(
			userReserveDataBefore.currentStableDebt.toString(),
		)
			.multipliedBy(0.5)
			.toFixed(0)

		// Pause pool
		await configurator.setPoolPause(true)

		// Do liquidation
		await expect(
			pool.liquidationCall(
				weth,
				usdc,
				borrower.address,
				amountToLiquidate,
				true,
			),
		).revertedWith(LP_IS_PAUSED)

		// Unpause pool
		await configurator.setPoolPause(false)
	})

	it('SwapBorrowRateMode', async () => {
		const { pool, weth, dai, usdc, users, configurator } = testEnv
		const user = users[1]
		const amountWETHToDeposit = ethers.parseEther('10')
		const amountDAIToDeposit = ethers.parseEther('120')
		const amountToBorrow = ethers.parseUnits('65', 6)

		await weth.connect(user).mint(amountWETHToDeposit)
		await weth.connect(user).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)
		await pool
			.connect(user)
			.deposit(weth, amountWETHToDeposit, user.address, '0')

		await dai.connect(user).mint(amountDAIToDeposit)
		await dai.connect(user).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)
		await pool
			.connect(user)
			.deposit(dai, amountDAIToDeposit, user.address, '0')

		await pool
			.connect(user)
			.borrow(usdc, amountToBorrow, 2, 0, user.address)

		// Pause pool
		await configurator.setPoolPause(true)

		// Try to repay
		await expect(
			pool.connect(user).swapBorrowRateMode(usdc, RateMode.Stable),
		).revertedWith(LP_IS_PAUSED)

		// Unpause pool
		await configurator.setPoolPause(false)
	})

	it('RebalanceStableBorrowRate', async () => {
		const { pool, dai, users, configurator } = testEnv
		const user = users[1]
		// Pause pool
		await configurator.setPoolPause(true)

		await expect(
			pool.connect(user).rebalanceStableBorrowRate(dai, user.address),
		).revertedWith(LP_IS_PAUSED)

		// Unpause pool
		await configurator.setPoolPause(false)
	})

	it('setUserUseReserveAsCollateral', async () => {
		const { pool, weth, users, configurator } = testEnv
		const user = users[1]

		const amountWETHToDeposit = ethers.parseEther('1')
		await weth.connect(user).mint(amountWETHToDeposit)
		await weth.connect(user).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)
		await pool
			.connect(user)
			.deposit(weth, amountWETHToDeposit, user.address, '0')

		// Pause pool
		await configurator.setPoolPause(true)

		await expect(
			pool.connect(user).setUserUseReserveAsCollateral(weth, false),
		).revertedWith(LP_IS_PAUSED)

		// Unpause pool
		await configurator.setPoolPause(false)
	})
}
