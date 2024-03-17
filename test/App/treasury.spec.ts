import { ethers } from 'hardhat'
import { expect } from 'chai'
import { testEnv } from './_.before'
import { AaveCollector__factory } from '../../typechain-types'
import { convertToCurrencyDecimals } from '../../heplers/helpers'
import { MAX_UINT_AMOUNT } from '../../heplers/constants'

export const treasuryTest = () => {
	it('test treasury', async () => {
		const { reserveTreasury, deployer, dai, aDai, usdc, users, pool } =
			testEnv

		const depositor = users[0]
		const borrower = users[1]

		await dai
			.connect(depositor)
			.mint(await convertToCurrencyDecimals(dai, '100'))
		await usdc
			.connect(borrower)
			.mint(await convertToCurrencyDecimals(usdc, '100'))

		await dai.connect(depositor).approve(pool, MAX_UINT_AMOUNT)
		await dai.connect(borrower).approve(pool, MAX_UINT_AMOUNT)
		await usdc.connect(borrower).approve(pool, MAX_UINT_AMOUNT)

		await pool
			.connect(depositor)
			.deposit(
				dai,
				await convertToCurrencyDecimals(dai, '100'),
				depositor,
				0,
			)

		await pool
			.connect(borrower)
			.deposit(
				usdc,
				await convertToCurrencyDecimals(usdc, '100'),
				borrower,
				0,
			)

		await pool
			.connect(borrower)
			.borrow(
				dai,
				await convertToCurrencyDecimals(dai, '40'),
				2,
				0,
				borrower,
			)

		await ethers.provider.send('evm_increaseTime', [1000])
		await ethers.provider.send('evm_mine', [])

		await pool
			.connect(borrower)
			.repay(dai, await convertToCurrencyDecimals(dai, '1'), 2, borrower)

		expect(await aDai.balanceOf(reserveTreasury)).to.be.above(0n)
	})
}
