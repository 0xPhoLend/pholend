import { expect } from 'chai'
import { ethers } from 'ethers'
import { ProtocolErrors, RateMode } from '../../heplers/types'
import { convertToCurrencyDecimals } from '../../heplers/helpers'
import { APPROVAL_AMOUNT_LENDING_POOL } from '../../heplers/constants'
import { testEnv } from './_.before'

export const ATokenTransferTest = () => {
	const {
		INVALID_FROM_BALANCE_AFTER_TRANSFER,
		INVALID_TO_BALANCE_AFTER_TRANSFER,
		VL_TRANSFER_NOT_ALLOWED,
	} = ProtocolErrors

	it('User 0 deposits 1000 DAI, transfers to user 1', async () => {
		const { users, pool, dai, aDai } = testEnv

		await dai
			.connect(users[0])
			.mint(await convertToCurrencyDecimals(dai, '1000'))

		await dai.connect(users[0]).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		//user 1 deposits 1000 DAI
		const amountDAItoDeposit = await convertToCurrencyDecimals(dai, '1000')

		await pool
			.connect(users[0])
			.deposit(dai, amountDAItoDeposit, users[0].address, '0')

		await aDai
			.connect(users[0])
			.transfer(users[1].address, amountDAItoDeposit)

		const name = await aDai.name()

		expect(name).to.be.equal('Interest bearing DAI')

		const fromBalance = await aDai.balanceOf(users[0].address)
		const toBalance = await aDai.balanceOf(users[1].address)

		expect(fromBalance.toString()).to.be.equal(
			'0',
			INVALID_FROM_BALANCE_AFTER_TRANSFER,
		)
		expect(toBalance.toString()).to.be.equal(
			amountDAItoDeposit.toString(),
			INVALID_TO_BALANCE_AFTER_TRANSFER,
		)
	})

	it('User 0 deposits 1 WETH and user 1 tries to borrow the WETH with the received DAI as collateral', async () => {
		const { users, pool, weth, helpersContract } = testEnv
		const userAddress = await pool.getAddress()

		await weth
			.connect(users[0])
			.mint(await convertToCurrencyDecimals(weth, '1'))

		await weth.connect(users[0]).approve(pool, APPROVAL_AMOUNT_LENDING_POOL)

		await pool
			.connect(users[0])
			.deposit(weth, ethers.parseEther('1.0'), userAddress, '0')
		await pool
			.connect(users[1])
			.borrow(
				weth,
				ethers.parseEther('0.1'),
				RateMode.Stable,
				0,
				users[1].address,
			)

		const userReserveData = await helpersContract.getUserReserveData(
			weth,
			users[1].address,
		)

		expect(userReserveData.currentStableDebt.toString()).to.be.eq(
			ethers.parseEther('0.1'),
		)
	})

	it('User 1 tries to transfer all the DAI used as collateral back to user 0 (revert expected)', async () => {
		const { users, pool, aDai, dai, weth } = testEnv

		const aDAItoTransfer = await convertToCurrencyDecimals(dai, '1000')

		await expect(
			aDai.connect(users[1]).transfer(users[0].address, aDAItoTransfer),
			VL_TRANSFER_NOT_ALLOWED,
		).to.be.revertedWith(VL_TRANSFER_NOT_ALLOWED)
	})

	it('User 1 tries to transfer a small amount of DAI used as collateral back to user 0', async () => {
		const { users, pool, aDai, dai, weth } = testEnv

		const aDAItoTransfer = await convertToCurrencyDecimals(dai, '100')

		await aDai.connect(users[1]).transfer(users[0].address, aDAItoTransfer)

		const user0Balance = await aDai.balanceOf(users[0].address)

		expect(user0Balance.toString()).to.be.eq(aDAItoTransfer.toString())
	})
}
