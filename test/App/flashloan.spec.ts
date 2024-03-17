import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'
import { MockFlashLoanReceiver } from '../../typechain-types'
import { testEnv } from './_.before'
import { APPROVAL_AMOUNT_LENDING_POOL, oneRay } from '../../heplers/constants'
import BigNumber from 'bignumber.js'
import { convertToCurrencyDecimals } from '../../heplers/helpers'

export const flashloanTest = () => {
	const {
		VL_COLLATERAL_BALANCE_IS_0,
		TRANSFER_AMOUNT_EXCEEDS_BALANCE,
		LP_INVALID_FLASHLOAN_MODE,
		SAFEERC20_LOWLEVEL_CALL,
		LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN,
		LP_BORROW_ALLOWANCE_NOT_ENOUGH,
	} = ProtocolErrors
	it('Deposits WETH into the reserve', async () => {
		const { pool, weth } = testEnv
		const userAddress = await pool.getAddress()
		const amountToDeposit = ethers.parseEther('1')
		await weth.mint(amountToDeposit)
		await weth.approve(pool.target, APPROVAL_AMOUNT_LENDING_POOL)
		await pool.deposit(weth, amountToDeposit, userAddress, '0')
	})
	it('Takes WETH flashloan with mode = 0, returns the funds correctly', async () => {
		const { pool, helpersContract, weth, _mockFlashLoanReceiver } = testEnv
		await pool.flashLoan(
			_mockFlashLoanReceiver.target,
			[weth],
			[ethers.parseEther('0.8')],
			[0],
			_mockFlashLoanReceiver.target,
			'0x10',
			'0',
		)
		ethers.parseUnits('10000')
		const reserveData = await helpersContract.getReserveData(weth)
		const currentLiquidityRate = reserveData.liquidityRate
		const currentLiquidityIndex = reserveData.liquidityIndex
		const totalLiquidity = new BigNumber(
			reserveData.availableLiquidity.toString(),
		)
			.plus(reserveData.totalStableDebt.toString())
			.plus(reserveData.totalVariableDebt.toString())
		expect(totalLiquidity.toString()).to.be.equal('1000720000000000000')
		expect(currentLiquidityRate.toString()).to.be.equal('0')
		expect(currentLiquidityIndex.toString()).to.be.equal(
			'1000720000000000000000000000',
		)
	})
	it('Takes an ETH flashloan with mode = 0 as big as the available liquidity', async () => {
		const { pool, helpersContract, weth, _mockFlashLoanReceiver } = testEnv
		const reserveDataBefore = await helpersContract.getReserveData(weth)
		const txResult = await pool.flashLoan(
			_mockFlashLoanReceiver.target,
			[weth],
			['1000720000000000000'],
			[0],
			_mockFlashLoanReceiver.target,
			'0x10',
			'0',
		)
		const reserveData = await helpersContract.getReserveData(weth)
		const currentLiqudityRate = reserveData.liquidityRate
		const currentLiquidityIndex = reserveData.liquidityIndex
		const totalLiquidity = new BigNumber(
			reserveData.availableLiquidity.toString(),
		)
			.plus(reserveData.totalStableDebt.toString())
			.plus(reserveData.totalVariableDebt.toString())
		expect(totalLiquidity.toString()).to.be.equal('1001620648000000000')
		expect(currentLiqudityRate.toString()).to.be.equal('0')
		expect(currentLiquidityIndex.toString()).to.be.equal(
			'1001620648000000000000000000',
		)
	})
	it('Takes WETH flashloan, does not return the funds with mode = 0. (revert expected)', async () => {
		const { pool, weth, users, _mockFlashLoanReceiver } = testEnv
		const caller = users[1]
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver.target,
					[weth],
					[ethers.parseEther('0.8')],
					[0],
					caller.address,
					'0x10',
					'0',
				),
		).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL)
	})
	it('Takes WETH flashloan, simulating a receiver as EOA (revert expected)', async () => {
		const { pool, weth, users, _mockFlashLoanReceiver } = testEnv
		const caller = users[1]
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await _mockFlashLoanReceiver.setSimulateEOA(true)
		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver.target,
					[weth],
					[ethers.parseEther('0.8')],
					[0],
					caller.address,
					'0x10',
					'0',
				),
		).to.be.revertedWith(LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN)
	})
	it('Takes a WETH flashloan with an invalid mode. (revert expected)', async () => {
		const { pool, weth, users, _mockFlashLoanReceiver } = testEnv
		const caller = users[1]
		await _mockFlashLoanReceiver.setSimulateEOA(false)
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver.target,
					[weth],
					[ethers.parseEther('0.8')],
					[4],
					caller.address,
					'0x10',
					'0',
				),
		).to.be.reverted
	})

	it('Caller deposits 1000 DAI as collateral, Takes WETH flashloan with mode = 2, does not return the funds. A variable loan for caller is created', async () => {
		const {
			dai,
			pool,
			weth,
			users,
			helpersContract,
			_mockFlashLoanReceiver,
		} = testEnv
		const caller = users[1]
		await dai
			.connect(caller)
			.mint(await convertToCurrencyDecimals(dai, '1000'))
		await dai
			.connect(caller)
			.approve(pool.target, APPROVAL_AMOUNT_LENDING_POOL)
		const amountToDeposit = await convertToCurrencyDecimals(dai, '1000')
		await pool
			.connect(caller)
			.deposit(dai, amountToDeposit, caller.address, '0')
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await pool
			.connect(caller)
			.flashLoan(
				_mockFlashLoanReceiver.target,
				[weth],
				[ethers.parseEther('0.8')],
				[2],
				caller.address,
				'0x10',
				'0',
			)
		const { variableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(weth)
		const wethDebtToken = await ethers.getContractAt(
			'VariableDebtToken',
			variableDebtTokenAddress,
		)
		const callerDebt = await wethDebtToken.balanceOf(caller.address)
		expect(callerDebt.toString()).to.be.equal(
			'800000000000000000',
			'Invalid user debt',
		)
	})

	it('tries to take a flashloan that is bigger than the available liquidity (revert expected)', async () => {
		const { pool, weth, users, _mockFlashLoanReceiver } = testEnv
		const caller = users[1]
		await expect(
			pool.connect(caller).flashLoan(
				_mockFlashLoanReceiver.target,
				[weth],
				['1004415000000000000'], //slightly higher than the available liquidity
				[2],
				caller.address,
				'0x10',
				'0',
			),
			TRANSFER_AMOUNT_EXCEEDS_BALANCE,
		).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL)
	})
	it('tries to take a flashloan using a non contract address as receiver (revert expected)', async () => {
		const { pool, deployer, weth, users } = testEnv
		const caller = users[1]
		await expect(
			pool.flashLoan(
				deployer.address,
				[weth],
				['1000000000000000000'],
				[2],
				caller.address,
				'0x10',
				'0',
			),
		).to.be.reverted
	})
	it('Deposits USDC into the reserve', async () => {
		const { usdc, pool, deployer } = testEnv
		const userAddress = deployer
		await usdc.mint(await convertToCurrencyDecimals(usdc, '1000'))
		await usdc.approve(pool.target, APPROVAL_AMOUNT_LENDING_POOL)
		const amountToDeposit = await convertToCurrencyDecimals(usdc, '1000')
		await pool.deposit(usdc, amountToDeposit, userAddress, '0')
	})
	it('Takes out a 500 USDC flashloan, returns the funds correctly', async () => {
		const {
			usdc,
			pool,
			helpersContract,
			deployer: depositor,
			_mockFlashLoanReceiver,
		} = testEnv
		await _mockFlashLoanReceiver.setFailExecutionTransfer(false)
		const reserveDataBefore = await helpersContract.getReserveData(usdc)
		const flashloanAmount = await convertToCurrencyDecimals(usdc, '500')
		await pool.flashLoan(
			_mockFlashLoanReceiver.target,
			[usdc],
			[flashloanAmount],
			[0],
			_mockFlashLoanReceiver.target,
			'0x10',
			'0',
		)
		const reserveDataAfter = helpersContract.getReserveData(usdc)
		const reserveData = await helpersContract.getReserveData(usdc)
		const userData = await helpersContract.getUserReserveData(
			usdc,
			depositor.address,
		)
		const totalLiquidity = (
			reserveData.availableLiquidity +
			reserveData.totalStableDebt +
			reserveData.totalVariableDebt
		).toString()
		const currentLiqudityRate = reserveData.liquidityRate.toString()
		const currentLiquidityIndex = reserveData.liquidityIndex.toString()
		const currentUserBalance = userData.currentATokenBalance.toString()
		const expectedLiquidity = await convertToCurrencyDecimals(
			usdc,
			'1000.450',
		)
		expect(totalLiquidity).to.be.equal(
			expectedLiquidity,
			'Invalid total liquidity',
		)
		expect(currentLiqudityRate).to.be.equal('0', 'Invalid liquidity rate')
		expect(currentLiquidityIndex).to.be.equal(
			new BigNumber('1.00045').multipliedBy(oneRay).toFixed(),
			'Invalid liquidity index',
		)
		expect(currentUserBalance.toString()).to.be.equal(
			expectedLiquidity,
			'Invalid user balance',
		)
	})
	it('Takes out a 500 USDC flashloan with mode = 0, does not return the funds. (revert expected)', async () => {
		const { usdc, pool, users, _mockFlashLoanReceiver } = testEnv
		const caller = users[2]
		const flashloanAmount = await convertToCurrencyDecimals(usdc, '500')
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver.target,
					[usdc],
					[flashloanAmount],
					[2],
					caller.address,
					'0x10',
					'0',
				),
		).to.be.revertedWith(VL_COLLATERAL_BALANCE_IS_0)
	})
	it('Caller deposits 5 WETH as collateral, Takes a USDC flashloan with mode = 2, does not return the funds. A loan for caller is created', async () => {
		const {
			usdc,
			pool,
			weth,
			users,
			helpersContract,
			_mockFlashLoanReceiver,
		} = testEnv
		const caller = users[2]
		await weth
			.connect(caller)
			.mint(await convertToCurrencyDecimals(weth, '5'))
		await weth
			.connect(caller)
			.approve(pool.target, APPROVAL_AMOUNT_LENDING_POOL)
		const amountToDeposit = await convertToCurrencyDecimals(weth, '5')
		await pool
			.connect(caller)
			.deposit(weth, amountToDeposit, caller.address, '0')
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		const flashloanAmount = await convertToCurrencyDecimals(usdc, '500')
		await pool
			.connect(caller)
			.flashLoan(
				_mockFlashLoanReceiver.target,
				[usdc],
				[flashloanAmount],
				[2],
				caller.address,
				'0x10',
				'0',
			)
		const { variableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(usdc)
		const usdcDebtToken = await ethers.getContractAt(
			'VariableDebtToken',
			variableDebtTokenAddress,
		)
		const callerDebt = await usdcDebtToken.balanceOf(caller.address)
		expect(callerDebt.toString()).to.be.equal(
			'500000000',
			'Invalid user debt',
		)
	})
	it('Caller deposits 1000 DAI as collateral, Takes a WETH flashloan with mode = 0, does not approve the transfer of the funds', async () => {
		const { dai, pool, weth, users, _mockFlashLoanReceiver } = testEnv
		const caller = users[3]
		await dai
			.connect(caller)
			.mint(await convertToCurrencyDecimals(dai, '1000'))
		await dai
			.connect(caller)
			.approve(pool.target, APPROVAL_AMOUNT_LENDING_POOL)
		const amountToDeposit = await convertToCurrencyDecimals(dai, '1000')
		await pool
			.connect(caller)
			.deposit(dai, amountToDeposit, caller.address, '0')
		const flashAmount = ethers.parseEther('0.8')
		await _mockFlashLoanReceiver.setFailExecutionTransfer(false)
		await _mockFlashLoanReceiver.setAmountToApprove(flashAmount / 2n)
		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver.target,
					[weth],
					[flashAmount],
					[0],
					caller.address,
					'0x10',
					'0',
				),
		).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL)
	})
	it('Caller takes a WETH flashloan with mode = 1', async () => {
		const {
			dai,
			pool,
			weth,
			users,
			helpersContract,
			_mockFlashLoanReceiver,
		} = testEnv
		const caller = users[3]
		const flashAmount = ethers.parseEther('0.8')
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await pool
			.connect(caller)
			.flashLoan(
				_mockFlashLoanReceiver.target,
				[weth],
				[flashAmount],
				[1],
				caller.address,
				'0x10',
				'0',
			)
		const { stableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(weth)
		const wethDebtToken = await ethers.getContractAt(
			'StableDebtToken',
			stableDebtTokenAddress,
		)
		const callerDebt = await wethDebtToken.balanceOf(caller.address)
		expect(callerDebt.toString()).to.be.equal(
			'800000000000000000',
			'Invalid user debt',
		)
	})
	it('Caller takes a WETH flashloan with mode = 1 onBehalfOf user without allowance', async () => {
		const {
			dai,
			pool,
			weth,
			users,
			helpersContract,
			_mockFlashLoanReceiver,
		} = testEnv
		const caller = users[5]
		const onBehalfOf = users[4]
		// Deposit 1000 dai for onBehalfOf user
		await dai
			.connect(onBehalfOf)
			.mint(await convertToCurrencyDecimals(dai, '1000'))
		await dai
			.connect(onBehalfOf)
			.approve(pool.target, APPROVAL_AMOUNT_LENDING_POOL)
		const amountToDeposit = await convertToCurrencyDecimals(dai, '1000')
		await pool
			.connect(onBehalfOf)
			.deposit(dai, amountToDeposit, onBehalfOf.address, '0')
		const flashAmount = ethers.parseEther('0.8')
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await expect(
			pool
				.connect(caller)
				.flashLoan(
					_mockFlashLoanReceiver.target,
					[weth],
					[flashAmount],
					[1],
					onBehalfOf.address,
					'0x10',
					'0',
				),
		).to.be.revertedWith(LP_BORROW_ALLOWANCE_NOT_ENOUGH)
	})
	it('Caller takes a WETH flashloan with mode = 1 onBehalfOf user with allowance. A loan for onBehalfOf is creatd.', async () => {
		const {
			dai,
			pool,
			weth,
			users,
			helpersContract,
			_mockFlashLoanReceiver,
		} = testEnv
		const caller = users[5]
		const onBehalfOf = users[4]
		const flashAmount = ethers.parseEther('0.8')
		const reserveData = await pool.getReserveData(weth)
		const stableDebtToken = await ethers.getContractAt(
			'StableDebtToken',
			reserveData.stableDebtTokenAddress,
		)
		// Deposited for onBehalfOf user already, delegate borrow allowance
		await stableDebtToken
			.connect(onBehalfOf)
			.approveDelegation(caller.address, flashAmount)
		await _mockFlashLoanReceiver.setFailExecutionTransfer(true)
		await pool
			.connect(caller)
			.flashLoan(
				_mockFlashLoanReceiver.target,
				[weth],
				[flashAmount],
				[1],
				onBehalfOf.address,
				'0x10',
				'0',
			)
		const { stableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(weth)
		const wethDebtToken = await ethers.getContractAt(
			'StableDebtToken',
			stableDebtTokenAddress,
		)
		const onBehalfOfDebt = await wethDebtToken.balanceOf(onBehalfOf.address)
		expect(onBehalfOfDebt.toString()).to.be.equal(
			'800000000000000000',
			'Invalid onBehalfOf user debt',
		)
	})
}
