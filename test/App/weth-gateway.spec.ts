import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import { ethers, network } from 'hardhat'
import { testEnv } from './_.before'
import { convertToCurrencyDecimals } from '../../heplers/helpers'
import { MAX_UINT_AMOUNT } from '../../heplers/constants'
import {} from 'hardhat-gas-reporter'

export const WETHGatewayTest = () => {
	const zero = 0n
	const depositSize = ethers.parseEther('5')
	const daiSize = ethers.parseEther('10000')
	it('Deposit WETH via WethGateway and DAI', async () => {
		const { users, wethGateway, aWETH, pool } = testEnv

		const user = users[1]
		const depositor = users[0]

		// Deposit liquidity with native ETH
		await wethGateway
			.connect(depositor)
			.depositETH(depositor, '0', { value: depositSize })

		// Deposit with native ETH
		await wethGateway
			.connect(user)
			.depositETH(user, '0', { value: depositSize })

		const aTokensBalance = await aWETH.balanceOf(user)

		expect(aTokensBalance).to.be.gt(zero)
		expect(aTokensBalance).to.be.gte(depositSize)
	})

	it('Withdraw WETH - Partial', async () => {
		const { users, wethGateway, aWETH, pool } = testEnv

		const user = users[1]
		const priorEthersBalance = await ethers.provider.getBalance(user)

		const aTokensBalance = await aWETH.balanceOf(user)

		expect(aTokensBalance).to.be.gt(zero, 'User should have aTokens.')

		// Partially withdraw native ETH
		const partialWithdraw = await convertToCurrencyDecimals(aWETH, '2')

		// Approve the aTokens to Gateway so Gateway can withdraw and convert to Ether

		const approveTx = await (
			await aWETH.connect(user).approve(wethGateway, MAX_UINT_AMOUNT)
		).wait()

		// Partial Withdraw and send native Ether to user

		const withdrawTx = await (
			await wethGateway.connect(user).withdrawETH(partialWithdraw, user)
		).wait()

		const afterPartialEtherBalance = await ethers.provider.getBalance(user)
		const afterPartialATokensBalance = await aWETH.balanceOf(user)

		if (!approveTx || !withdrawTx) {
			throw new Error('no withdrawTx or approveTx')
		}

		const gasCosts =
			approveTx?.gasUsed * approveTx?.gasPrice +
			withdrawTx?.gasUsed * withdrawTx?.gasPrice

		expect(afterPartialEtherBalance).to.be.equal(
			priorEthersBalance + partialWithdraw - gasCosts,
			'User ETHER balance should contain the partial withdraw',
		)
		expect(afterPartialATokensBalance).to.be.equal(
			aTokensBalance - partialWithdraw,
			'User aWETH balance should be substracted',
		)
	})

	it('Withdraw WETH - Full', async () => {
		const { users, aWETH, wethGateway, pool } = testEnv

		const user = users[1]
		const priorEthersBalance = await ethers.provider.getBalance(user)
		const aTokensBalance = await aWETH.balanceOf(user)

		expect(aTokensBalance).to.be.gt(zero, 'User should have aTokens.')

		// Approve the aTokens to Gateway so Gateway can withdraw and convert to Ether
		const approveTx = await (
			await aWETH.connect(user).approve(wethGateway, MAX_UINT_AMOUNT)
		).wait()

		// Full withdraw
		const withdrawTx = await (
			await wethGateway.connect(user).withdrawETH(MAX_UINT_AMOUNT, user)
		).wait()

		const afterFullEtherBalance = await ethers.provider.getBalance(user)
		const afterFullATokensBalance = await aWETH.balanceOf(user)
		if (!approveTx || !withdrawTx) {
			throw new Error('no withdrawTx or approveTx')
		}
		const gasCosts =
			approveTx?.gasUsed * approveTx?.gasPrice +
			withdrawTx?.gasUsed * withdrawTx?.gasPrice

		expect(afterFullEtherBalance).to.be.eq(
			priorEthersBalance + aTokensBalance - gasCosts,
			'User ETHER balance should contain the full withdraw',
		)
		expect(afterFullATokensBalance).to.be.eq(
			0,
			'User aWETH balance should be zero',
		)
	})

	it('Borrow stable WETH and Full Repay with ETH', async () => {
		const { users, wethGateway, aDai, weth, dai, pool, helpersContract } =
			testEnv
		const borrowSize = ethers.parseEther('1')
		const repaySize = borrowSize + (borrowSize * 5n) / 100n
		const user = users[1]
		const depositor = users[0]

		// Deposit with native ETH
		await wethGateway
			.connect(depositor)
			.depositETH(depositor, '0', { value: depositSize })

		const { stableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(weth)

		const stableDebtToken = await ethers.getContractAt(
			'StableDebtToken',
			stableDebtTokenAddress,
		)

		// Deposit 10000 DAI
		await dai.connect(user).mint(daiSize)
		await dai.connect(user).approve(pool, daiSize)
		await pool.connect(user).deposit(dai, daiSize, user, '0')

		const aTokensBalance = await aDai.balanceOf(user)

		expect(aTokensBalance).to.be.gt(zero)
		expect(aTokensBalance).to.be.gte(daiSize)

		// Borrow WETH with WETH as collateral

		await pool.connect(user).borrow(weth, borrowSize, '1', '0', user)

		const debtBalance = await stableDebtToken.balanceOf(user)

		expect(debtBalance).to.be.gt(zero)

		// Full Repay WETH with native ETH

		await wethGateway
			.connect(user)
			.repayETH(MAX_UINT_AMOUNT, '1', user, { value: repaySize })

		const debtBalanceAfterRepay = await stableDebtToken.balanceOf(user)
		expect(debtBalanceAfterRepay).to.be.eq(zero)

		// Withdraw DAI
		await aDai.connect(user).approve(pool, MAX_UINT_AMOUNT)
		await pool.connect(user).withdraw(dai, MAX_UINT_AMOUNT, user)
	})

	it('Borrow variable WETH and Full Repay with ETH', async () => {
		const { users, wethGateway, aWETH, weth, pool, helpersContract } =
			testEnv
		const borrowSize = ethers.parseEther('1')
		const repaySize = borrowSize + (borrowSize * 5n) / 100n
		const user = users[1]

		const { variableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(weth)

		const varDebtToken = await ethers.getContractAt(
			'VariableDebtToken',
			variableDebtTokenAddress,
		)

		// Deposit with native ETH
		await wethGateway
			.connect(user)
			.depositETH(user, '0', { value: depositSize })

		const aTokensBalance = await aWETH.balanceOf(user)

		expect(aTokensBalance).to.be.gt(zero)
		expect(aTokensBalance).to.be.gte(depositSize)

		// Borrow WETH with WETH as collateral

		await pool.connect(user).borrow(weth, borrowSize, '2', '0', user)

		const debtBalance = await varDebtToken.balanceOf(user)

		expect(debtBalance).to.be.gt(zero)

		// Partial Repay WETH loan with native ETH
		const partialPayment = repaySize / 2n

		await wethGateway
			.connect(user)
			.repayETH(partialPayment, '2', user, { value: partialPayment })

		const debtBalanceAfterPartialRepay = await varDebtToken.balanceOf(user)
		expect(debtBalanceAfterPartialRepay).to.be.lt(debtBalance)

		// Full Repay WETH loan with native ETH

		await wethGateway
			.connect(user)
			.repayETH(MAX_UINT_AMOUNT, '2', user, { value: repaySize })

		const debtBalanceAfterFullRepay = await varDebtToken.balanceOf(user)
		expect(debtBalanceAfterFullRepay).to.be.eq(zero)
	})

	it('Borrow ETH via delegateApprove ETH and repays back', async () => {
		const { users, wethGateway, aWETH, weth, helpersContract, pool } =
			testEnv
		const borrowSize = ethers.parseEther('1')
		const user = users[2]
		const { variableDebtTokenAddress } =
			await helpersContract.getReserveTokensAddresses(weth)
		const varDebtToken = await ethers.getContractAt(
			'VariableDebtToken',
			variableDebtTokenAddress,
		)

		const priorDebtBalance = await varDebtToken.balanceOf(user)
		expect(priorDebtBalance).to.be.eq(zero)

		// Deposit WETH with native ETH
		await wethGateway
			.connect(user)
			.depositETH(user, '0', { value: depositSize })

		const aTokensBalance = await aWETH.balanceOf(user)

		expect(aTokensBalance).to.be.gt(zero)
		expect(aTokensBalance).to.be.gte(depositSize)

		// Delegates borrowing power of WETH to WETHGateway

		await varDebtToken
			.connect(user)
			.approveDelegation(wethGateway, borrowSize)

		// Borrows ETH with WETH as collateral

		await wethGateway.connect(user).borrowETH(borrowSize, '2', '0')

		const debtBalance = await varDebtToken.balanceOf(user)

		expect(debtBalance).to.be.gt(zero)

		// Full Repay WETH loan with native ETH

		await wethGateway
			.connect(user)
			.repayETH(MAX_UINT_AMOUNT, '2', user, { value: borrowSize * 2n })

		const debtBalanceAfterFullRepay = await varDebtToken.balanceOf(user)
		expect(debtBalanceAfterFullRepay).to.be.eq(zero)
	})

	it('Should revert if receiver function receives Ether if not WETH', async () => {
		const { users, wethGateway } = testEnv
		const user = users[0]
		const amount = ethers.parseEther('1')

		// Call receiver function (empty data + value)
		await expect(
			user.sendTransaction({
				to: wethGateway,
				value: amount,
				gasLimit: network.config.gas,
			}),
		).to.be.revertedWith('Receive not allowed')
	})

	it('Should revert if fallback functions is called with Ether', async () => {
		const { users, wethGateway } = testEnv
		const user = users[0]
		const amount = ethers.parseEther('1')
		const fakeABI = ['function wantToCallFallback()']
		const abiCoder = new ethers.Interface(fakeABI)
		const fakeMethodEncoded = abiCoder.encodeFunctionData(
			'wantToCallFallback',
			[],
		)

		// Call fallback function with value
		await expect(
			user.sendTransaction({
				to: wethGateway,
				data: fakeMethodEncoded,
				value: amount,
				gasLimit: network.config.gas,
			}),
		).to.be.revertedWith('Fallback not allowed')
	})

	it('Should revert if fallback functions is called', async () => {
		const { users, wethGateway } = testEnv
		const user = users[0]

		const fakeABI = ['function wantToCallFallback()']
		const abiCoder = new ethers.Interface(fakeABI)
		const fakeMethodEncoded = abiCoder.encodeFunctionData(
			'wantToCallFallback',
			[],
		)

		// Call fallback function without value
		await expect(
			user.sendTransaction({
				to: wethGateway,
				data: fakeMethodEncoded,
				gasLimit: network.config.gas,
			}),
		).to.be.revertedWith('Fallback not allowed')
	})

	it('Owner can do emergency token recovery', async () => {
		const { users, dai, wethGateway, deployer } = testEnv
		const user = users[0]
		const amount = ethers.parseEther('1')

		await dai.connect(user).mint(amount)
		const daiBalanceAfterMint = await dai.balanceOf(user)

		await dai.connect(user).transfer(wethGateway, amount)
		const daiBalanceAfterBadTransfer = await dai.balanceOf(user)
		expect(daiBalanceAfterBadTransfer).to.be.eq(
			daiBalanceAfterMint - amount,
			'User should have lost the funds here.',
		)

		await wethGateway
			.connect(deployer)
			.emergencyTokenTransfer(dai, user, amount)
		const daiBalanceAfterRecovery = await dai.balanceOf(user)

		expect(daiBalanceAfterRecovery).to.be.eq(
			daiBalanceAfterMint,
			'User should recover the funds due emergency token transfer',
		)
	})

	it('Owner can do emergency native ETH recovery', async () => {
		const { users, wethGateway, deployer } = testEnv
		const user = users[0]
		const amount = ethers.parseEther('1')

		// Deploy contract with payable selfdestruct contract
		const selfdestructContract = await (
			await ethers.getContractFactory('SelfdestructTransfer')
		).deploy()

		const userBalancePriorCall = await ethers.provider.getBalance(user)
		// Selfdestruct the mock, pointing to WETHGateway address
		const callTx = await (
			await selfdestructContract
				.connect(user)
				.destroyAndTransfer(wethGateway, { value: amount })
		).wait()
		if (!callTx) {
			throw new Error('no callTx')
		}
		const gasFees = callTx.gasUsed * callTx.gasPrice
		const userBalanceAfterCall = await ethers.provider.getBalance(user)

		expect(userBalanceAfterCall).to.be.eq(
			userBalancePriorCall - amount - gasFees,
			'',
		)

		// Recover the funds from the contract and sends back to the user
		const emergencyTx = await (
			await wethGateway
				.connect(deployer)
				.emergencyEtherTransfer(user, amount)
		).wait()
		if (!emergencyTx) {
			throw new Error('no emergencyTx')
		}

		const userBalanceAfterRecovery = await ethers.provider.getBalance(user)
		const wethGatewayAfterRecovery =
			await ethers.provider.getBalance(wethGateway)

		expect(userBalanceAfterRecovery).to.be.eq(
			userBalancePriorCall -
				gasFees -
				emergencyTx.gasPrice * emergencyTx.gasUsed,
			'User should recover the funds due emergency eth transfer.',
		)
		expect(wethGatewayAfterRecovery).to.be.eq(
			'0',
			'WETHGateway ether balance should be zero.',
		)
	})
}
