import { ethers } from 'hardhat'
import { MAX_UINT_AMOUNT } from '../../heplers/constants'
import { convertToCurrencyDecimals } from '../../heplers/helpers'
import { testEnv } from './_.before'

export const someTesting = async () => {
	it('liquidityIndex', async () => {
		const {
			dai,
			usdc,
			users,
			pool,
			helpersContract,
			reserveTreasury,
			uiPoolDataProvider,
			addressesProvider,
		} = testEnv
		const depositor = users[0]
		const borrower = users[1]

		await dai
			.connect(depositor)
			.mint(await convertToCurrencyDecimals(dai, '100'))
		await usdc
			.connect(borrower)
			.mint(await convertToCurrencyDecimals(usdc, '100'))

		await dai.connect(depositor).approve(pool, MAX_UINT_AMOUNT)
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
				await convertToCurrencyDecimals(dai, '20'),
				1,
				0,
				borrower,
			)

		await pool
			.connect(depositor)
			.withdraw(
				dai,
				await convertToCurrencyDecimals(dai, '10'),
				depositor,
			)
		const liquidityIndex = (await helpersContract.getReserveData(dai))
			.liquidityIndex
		console.log('liquidityIndex: ', liquidityIndex)
		console.log(
			'totalStableDebt: ',
			(await helpersContract.getReserveData(dai)).totalStableDebt,
		)
		const depositorCurrentATokenBalance = (
			await helpersContract.getUserReserveData(dai, depositor)
		).currentATokenBalance
		console.log(
			'depositor currentATokenBalance: ',
			depositorCurrentATokenBalance,
		)
		console.log(
			'treasury currentATokenBalance: ',
			(await helpersContract.getUserReserveData(dai, reserveTreasury))
				.currentATokenBalance,
		)
		console.log(
			await uiPoolDataProvider.getReservesData(
				addressesProvider,
				depositor,
			),
		)

		// console.log((liquidityIndex - 10n ** 27n) / 10n ** (27n - 18n))
		// console.log(depositorCurrentATokenBalance - 90n * 10n ** 18n)
	})
}
