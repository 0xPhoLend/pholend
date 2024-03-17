import { ethers } from 'hardhat'
import { networksData } from '../../../heplers/data'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import {
	advanceTimeAndBlock,
	convertToCurrencyDecimals,
	getReserveData,
	getUserData,
	timeLatest,
} from '../../../heplers/helpers'
import { testEnv } from '../_.before'
import BigNumber from 'bignumber.js'
import { AToken, MintableERC20 } from '../../../typechain-types'
import { ContractTransactionResponse } from 'ethers'
import {
	calcExpectedReserveDataAfterBorrow,
	calcExpectedReserveDataAfterDeposit,
	calcExpectedReserveDataAfterRepay,
	calcExpectedReserveDataAfterStableRateRebalance,
	calcExpectedReserveDataAfterSwapRateMode,
	calcExpectedReserveDataAfterWithdraw,
	calcExpectedUserDataAfterBorrow,
	calcExpectedUserDataAfterDeposit,
	calcExpectedUserDataAfterRepay,
	calcExpectedUserDataAfterSetUseAsCollateral,
	calcExpectedUserDataAfterStableRateRebalance,
	calcExpectedUserDataAfterSwapRateMode,
	calcExpectedUserDataAfterWithdraw,
} from './calculation'
import { expect, Assertion } from 'chai'
import { MAX_UINT_AMOUNT, ONE_YEAR } from '../../../heplers/constants'
import { RateMode, ReserveData, UserReserveData } from '../../../heplers/types'

Assertion.overwriteMethod('almostEqualOrEqual', function (original: any) {
	return function (this: any, expected: ReserveData | UserReserveData) {
		const actual = (expected as ReserveData)
			? <ReserveData>this._obj
			: <UserReserveData>this._obj

		almostEqualOrEqual.apply(this, [expected, actual])
	}
})

export const mint = async (
	reserveSymbol: string,
	amount: string,
	user: HardhatEthersSigner,
) => {
	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	await token
		.connect(user)
		.mint(await convertToCurrencyDecimals(token, amount))
}

export const approve = async (
	reserveSymbol: string,
	user: HardhatEthersSigner,
) => {
	const { pool } = testEnv
	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	await token.connect(user).approve(pool, '100000000000000000000000000000')
}

export const deposit = async (
	reserveSymbol: string,
	amount: string,
	sender: HardhatEthersSigner,
	onBehalfOf: HardhatEthersSigner,
	sendValue: string,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const amountToDeposit = await convertToCurrencyDecimals(token, amount)

	const txOptions: any = {}

	const { reserveData: reserveDataBefore, userData: userDataBefore } =
		await getContractsData(token, onBehalfOf, sender)

	if (sendValue) {
		txOptions.value = await convertToCurrencyDecimals(token, sendValue)
	}

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(sender)
			.deposit(token, amountToDeposit, onBehalfOf, '0', txOptions)

		const {
			reserveData: reserveDataAfter,
			userData: userDataAfter,
			timestamp,
		} = await getContractsData(token, onBehalfOf, sender)

		const { txTimestamp } = await getTxCostAndTimestamp(txResult)

		const expectedReserveData = calcExpectedReserveDataAfterDeposit(
			amountToDeposit.toString(),
			reserveDataBefore,
			txTimestamp,
		)

		const expectedUserReserveData = calcExpectedUserDataAfterDeposit(
			amountToDeposit.toString(),
			reserveDataBefore,
			expectedReserveData,
			userDataBefore,
			txTimestamp,
			timestamp,
		)

		expectEqual(reserveDataAfter, expectedReserveData)
		expectEqual(userDataAfter, expectedUserReserveData)

		// truffleAssert.eventEmitted(txResult, "Deposit", (ev: any) => {
		//   const {_reserve, _user, _amount} = ev;
		//   return (
		//     _reserve === reserve &&
		//     _user === user &&
		//     new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
		//   );
		// });
	} else if (expectedResult === 'revert') {
		await expect(
			pool
				.connect(sender)
				.deposit(token, amountToDeposit, onBehalfOf, '0', txOptions),
			revertMessage,
		).to.be.reverted
	}
}

export const withdraw = async (
	reserveSymbol: string,
	amount: string,
	user: HardhatEthersSigner,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const {
		aTokenInstance,
		token,
		userData: userDataBefore,
		reserveData: reserveDataBefore,
	} = await getDataBeforeAction(reserveSymbol, user)

	let amountToWithdraw = '0'

	if (amount !== '-1') {
		amountToWithdraw = (
			await convertToCurrencyDecimals(token, amount)
		).toString()
	} else {
		amountToWithdraw = MAX_UINT_AMOUNT
	}

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(user)
			.withdraw(token, amountToWithdraw, user)

		const {
			reserveData: reserveDataAfter,
			userData: userDataAfter,
			timestamp,
		} = await getContractsData(token, user)

		const { txTimestamp } = await getTxCostAndTimestamp(txResult)

		const expectedReserveData = calcExpectedReserveDataAfterWithdraw(
			amountToWithdraw,
			reserveDataBefore,
			userDataBefore,
			txTimestamp,
		)

		const expectedUserData = calcExpectedUserDataAfterWithdraw(
			amountToWithdraw,
			reserveDataBefore,
			expectedReserveData,
			userDataBefore,
			txTimestamp,
			timestamp,
		)

		expectEqual(reserveDataAfter, expectedReserveData)
		expectEqual(userDataAfter, expectedUserData)

		// truffleAssert.eventEmitted(txResult, "Redeem", (ev: any) => {
		//   const {_from, _value} = ev;
		//   return (
		//     _from === user && new BigNumber(_value).isEqualTo(actualAmountRedeemed)
		//   );
		// });
	} else if (expectedResult === 'revert') {
		await expect(
			pool.connect(user).withdraw(token, amountToWithdraw, user),
			revertMessage,
		).to.be.reverted
	}
}

export const delegateBorrowAllowance = async (
	reserve: string,
	amount: string,
	interestRateMode: string,
	user: HardhatEthersSigner,
	receiver: string,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const reserveAsset = networksData.test.find(
		(asset) => asset.symbol === reserve,
	)
	if (!reserveAsset) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt(
		'MintableERC20',
		reserveAsset?.address,
	)

	const amountToDelegate: string = await (
		await convertToCurrencyDecimals(token, amount)
	).toString()

	const reserveData = await pool.getReserveData(token)

	const debtToken =
		interestRateMode === '1'
			? await ethers.getContractAt(
					'StableDebtToken',
					reserveData.stableDebtTokenAddress,
				)
			: await ethers.getContractAt(
					'VariableDebtToken',
					reserveData.variableDebtTokenAddress,
				)

	const delegateAllowancePromise = debtToken
		.connect(user)
		.approveDelegation(receiver, amountToDelegate)

	if (expectedResult === 'revert' && revertMessage) {
		await expect(
			delegateAllowancePromise,
			revertMessage,
		).to.be.revertedWith(revertMessage)
		return
	} else {
		await delegateAllowancePromise
		const allowance = await debtToken.borrowAllowance(user, receiver)
		expect(allowance.toString()).to.be.equal(
			amountToDelegate,
			'borrowAllowance is set incorrectly',
		)
	}
}

export const borrow = async (
	reserveSymbol: string,
	amount: string,
	interestRateMode: string,
	user: HardhatEthersSigner,
	onBehalfOf: HardhatEthersSigner,
	timeTravel: string,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const { reserveData: reserveDataBefore, userData: userDataBefore } =
		await getContractsData(token, onBehalfOf, user)

	const amountToBorrow = await convertToCurrencyDecimals(token, amount)

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(user)
			.borrow(token, amountToBorrow, interestRateMode, '0', onBehalfOf)

		const { txTimestamp } = await getTxCostAndTimestamp(txResult)

		if (timeTravel) {
			const secondsToTravel = new BigNumber(timeTravel)
				.multipliedBy(ONE_YEAR)
				.div(365)
				.toNumber()

			await advanceTimeAndBlock(secondsToTravel)
		}

		const {
			reserveData: reserveDataAfter,
			userData: userDataAfter,
			timestamp,
		} = await getContractsData(token, onBehalfOf, user)

		const expectedReserveData = calcExpectedReserveDataAfterBorrow(
			amountToBorrow.toString(),
			interestRateMode,
			reserveDataBefore,
			userDataBefore,
			txTimestamp,
			timestamp,
		)

		const expectedUserData = calcExpectedUserDataAfterBorrow(
			amountToBorrow.toString(),
			interestRateMode,
			reserveDataBefore,
			expectedReserveData,
			userDataBefore,
			txTimestamp,
			timestamp,
		)

		expectEqual(reserveDataAfter, expectedReserveData)
		expectEqual(userDataAfter, expectedUserData)

		// truffleAssert.eventEmitted(txResult, "Borrow", (ev: any) => {
		//   const {
		//     _reserve,
		//     _user,
		//     _amount,
		//     _borrowRateMode,
		//     _borrowRate,
		//     _originationFee,
		//   } = ev;
		//   return (
		//     _reserve.toLowerCase() === reserve.toLowerCase() &&
		//     _user.toLowerCase() === user.toLowerCase() &&
		//     new BigNumber(_amount).eq(amountToBorrow) &&
		//     new BigNumber(_borrowRateMode).eq(expectedUserData.borrowRateMode) &&
		//     new BigNumber(_borrowRate).eq(expectedUserData.borrowRate) &&
		//     new BigNumber(_originationFee).eq(
		//       expectedUserData.originationFee.minus(userDataBefore.originationFee)
		//     )
		//   );
		// });
	} else if (expectedResult === 'revert') {
		await expect(
			pool
				.connect(user)
				.borrow(
					token,
					amountToBorrow,
					interestRateMode,
					'0',
					onBehalfOf,
				),
			revertMessage,
		).to.be.reverted
	}
}

export const repay = async (
	reserveSymbol: string,
	amount: string,
	rateMode: string,
	user: HardhatEthersSigner,
	onBehalfOf: HardhatEthersSigner,
	sendValue: string,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv
	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const { reserveData: reserveDataBefore, userData: userDataBefore } =
		await getContractsData(token, onBehalfOf)

	let amountToRepay = '0'

	if (amount !== '-1') {
		amountToRepay = (
			await convertToCurrencyDecimals(token, amount)
		).toString()
	} else {
		amountToRepay = MAX_UINT_AMOUNT
	}
	amountToRepay = '0x' + new BigNumber(amountToRepay).toString(16)

	const txOptions: any = {}

	if (sendValue) {
		const valueToSend = await convertToCurrencyDecimals(token, sendValue)
		txOptions.value =
			'0x' + new BigNumber(valueToSend.toString()).toString(16)
	}

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(user)
			.repay(
				token,
				amountToRepay,
				rateMode,
				onBehalfOf.address,
				txOptions,
			)

		const { txTimestamp } = await getTxCostAndTimestamp(txResult)

		const {
			reserveData: reserveDataAfter,
			userData: userDataAfter,
			timestamp,
		} = await getContractsData(token, onBehalfOf)

		const expectedReserveData = calcExpectedReserveDataAfterRepay(
			amountToRepay,
			<RateMode>rateMode,
			reserveDataBefore,
			userDataBefore,
			txTimestamp,
			timestamp,
		)

		const expectedUserData = calcExpectedUserDataAfterRepay(
			amountToRepay,
			<RateMode>rateMode,
			reserveDataBefore,
			expectedReserveData,
			userDataBefore,
			user.address,
			onBehalfOf.address,
			txTimestamp,
			timestamp,
		)

		expectEqual(reserveDataAfter, expectedReserveData)
		expectEqual(userDataAfter, expectedUserData)

		// truffleAssert.eventEmitted(txResult, "Repay", (ev: any) => {
		//   const {_reserve, _user, _repayer} = ev;

		//   return (
		//     _reserve.toLowerCase() === reserve.toLowerCase() &&
		//     _user.toLowerCase() === onBehalfOf.toLowerCase() &&
		//     _repayer.toLowerCase() === user.toLowerCase()
		//   );
		// });
	} else if (expectedResult === 'revert') {
		await expect(
			pool
				.connect(user)
				.repay(
					token,
					amountToRepay,
					rateMode,
					onBehalfOf.address,
					txOptions,
				),
			revertMessage,
		).to.be.reverted
	}
}

export const setUseAsCollateral = async (
	reserveSymbol: string,
	user: HardhatEthersSigner,
	useAsCollateral: string,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const { reserveData: reserveDataBefore, userData: userDataBefore } =
		await getContractsData(token, user)

	const useAsCollateralBool = useAsCollateral.toLowerCase() === 'true'

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(user)
			.setUserUseReserveAsCollateral(token, useAsCollateralBool)

		const { userData: userDataAfter } = await getContractsData(token, user)

		const expectedUserData = calcExpectedUserDataAfterSetUseAsCollateral(
			useAsCollateral.toLocaleLowerCase() === 'true',
			reserveDataBefore,
			userDataBefore,
		)

		expectEqual(userDataAfter, expectedUserData)
		// if (useAsCollateralBool) {
		//   truffleAssert.eventEmitted(txResult, 'ReserveUsedAsCollateralEnabled', (ev: any) => {
		//     const {_reserve, _user} = ev;
		//     return _reserve === reserve && _user === user;
		//   });
		// } else {
		//   truffleAssert.eventEmitted(txResult, 'ReserveUsedAsCollateralDisabled', (ev: any) => {
		//     const {_reserve, _user} = ev;
		//     return _reserve === reserve && _user === user;
		//   });
		// }
	} else if (expectedResult === 'revert') {
		await expect(
			pool
				.connect(user)
				.setUserUseReserveAsCollateral(token, useAsCollateralBool),
			revertMessage,
		).to.be.reverted
	}
}

export const swapBorrowRateMode = async (
	reserveSymbol: string,
	user: HardhatEthersSigner,
	rateMode: string,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const { reserveData: reserveDataBefore, userData: userDataBefore } =
		await getContractsData(token, user)

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(user)
			.swapBorrowRateMode(token, rateMode)

		const { txTimestamp } = await getTxCostAndTimestamp(txResult)

		const { reserveData: reserveDataAfter, userData: userDataAfter } =
			await getContractsData(token, user)

		const expectedReserveData = calcExpectedReserveDataAfterSwapRateMode(
			reserveDataBefore,
			userDataBefore,
			rateMode,
			txTimestamp,
		)

		const expectedUserData = calcExpectedUserDataAfterSwapRateMode(
			reserveDataBefore,
			expectedReserveData,
			userDataBefore,
			rateMode,
			txTimestamp,
		)

		expectEqual(reserveDataAfter, expectedReserveData)
		expectEqual(userDataAfter, expectedUserData)

		// truffleAssert.eventEmitted(txResult, "Swap", (ev: any) => {
		//   const {_user, _reserve, _newRateMode, _newRate} = ev;
		//   return (
		//     _user === user &&
		//     _reserve == reserve &&
		//     new BigNumber(_newRateMode).eq(expectedUserData.borrowRateMode) &&
		//     new BigNumber(_newRate).eq(expectedUserData.borrowRate)
		//   );
		// });
	} else if (expectedResult === 'revert') {
		await expect(
			pool.connect(user).swapBorrowRateMode(token, rateMode),
			revertMessage,
		).to.be.reverted
	}
}

export const rebalanceStableBorrowRate = async (
	reserveSymbol: string,
	user: HardhatEthersSigner,
	target: HardhatEthersSigner,
	expectedResult: string,
	revertMessage?: string,
) => {
	const { pool } = testEnv

	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const { reserveData: reserveDataBefore, userData: userDataBefore } =
		await getContractsData(token, target)

	if (expectedResult === 'success') {
		const txResult = await pool
			.connect(user)
			.rebalanceStableBorrowRate(token, target)

		const { txTimestamp } = await getTxCostAndTimestamp(txResult)

		const { reserveData: reserveDataAfter, userData: userDataAfter } =
			await getContractsData(token, target)

		const expectedReserveData =
			calcExpectedReserveDataAfterStableRateRebalance(
				reserveDataBefore,
				userDataBefore,
				txTimestamp,
			)

		const expectedUserData = calcExpectedUserDataAfterStableRateRebalance(
			reserveDataBefore,
			expectedReserveData,
			userDataBefore,
			txTimestamp,
		)

		expectEqual(reserveDataAfter, expectedReserveData)
		expectEqual(userDataAfter, expectedUserData)
	} else if (expectedResult === 'revert') {
		await expect(
			pool.connect(user).rebalanceStableBorrowRate(token, target.address),
			revertMessage,
		).to.be.reverted
	}
}

export const getTxCostAndTimestamp = async (
	tx: ContractTransactionResponse,
) => {
	if (!tx.blockNumber || !tx.hash) {
		throw new Error('No tx blocknumber')
	}
	const block = await ethers.provider.getBlock(tx.blockNumber)
	if (!block) {
		throw new Error('No block')
	}
	const txTimestamp = new BigNumber(block.timestamp)

	return { txTimestamp }
}

export const getContractsData = async (
	token: MintableERC20,
	user: HardhatEthersSigner,
	sender?: HardhatEthersSigner,
) => {
	const { pool, helpersContract } = testEnv

	const [userData, reserveData, timestamp] = await Promise.all([
		getUserData(pool, helpersContract, token, user, sender || user),
		getReserveData(helpersContract, token, testEnv.lendingRateOracle),
		timeLatest(),
	])

	return {
		reserveData,
		userData,
		timestamp: new BigNumber(timestamp),
	}
}

const expectEqual = (
	actual: UserReserveData | ReserveData,
	expected: UserReserveData | ReserveData,
) => {
	//@ts-ignore
	expect(actual).to.be.almostEqualOrEqual(expected)
}

function almostEqualOrEqual(
	this: any,
	expected: ReserveData | UserReserveData,
	actual: ReserveData | UserReserveData,
) {
	const keys = Object.keys(actual)

	keys.forEach((key) => {
		if (
			key === 'lastUpdateTimestamp' ||
			key === 'marketStableRate' ||
			key === 'symbol' ||
			key === 'aTokenAddress' ||
			key === 'decimals' ||
			key === 'totalStableDebtLastUpdated'
		) {
			// skipping consistency check on accessory data
			return
		}

		this.assert(
			actual[key] != undefined,
			`Property ${key} is undefined in the actual data`,
		)
		expect(
			expected[key] != undefined,
			`Property ${key} is undefined in the expected data`,
		)

		if (expected[key] == null || actual[key] == null) {
			console.log(
				'Found a undefined value for Key ',
				key,
				' value ',
				expected[key],
				actual[key],
			)
		}

		if (actual[key] instanceof BigNumber) {
			const actualValue = (<BigNumber>actual[key]).decimalPlaces(
				0,
				BigNumber.ROUND_DOWN,
			)
			const expectedValue = (<BigNumber>expected[key]).decimalPlaces(
				0,
				BigNumber.ROUND_DOWN,
			)

			this.assert(
				actualValue.eq(expectedValue) ||
					actualValue.plus(1).eq(expectedValue) ||
					actualValue.eq(expectedValue.plus(1)) ||
					actualValue.plus(2).eq(expectedValue) ||
					actualValue.eq(expectedValue.plus(2)) ||
					actualValue.plus(3).eq(expectedValue) ||
					actualValue.eq(expectedValue.plus(3)),
				`expected #{act} to be almost equal or equal #{exp} for property ${key}`,
				`expected #{act} to be almost equal or equal #{exp} for property ${key}`,
				expectedValue.toFixed(0),
				actualValue.toFixed(0),
			)
		} else {
			this.assert(
				actual[key] !== null &&
					expected[key] !== null &&
					actual[key].toString() === expected[key].toString(),
				`expected #{act} to be equal #{exp} for property ${key}`,
				`expected #{act} to be equal #{exp} for property ${key}`,
				expected[key],
				actual[key],
			)
		}
	})
}

interface ActionData {
	token: MintableERC20
	reserveData: ReserveData
	userData: UserReserveData
	aTokenInstance: AToken
}
const getDataBeforeAction = async (
	reserveSymbol: string,
	user: HardhatEthersSigner,
): Promise<ActionData> => {
	const reserve = networksData.test.find(
		(asset) => asset.symbol === reserveSymbol,
	)
	if (!reserve) {
		throw Error('asset was not founded')
	}
	const token = await ethers.getContractAt('MintableERC20', reserve?.address)

	const { reserveData, userData } = await getContractsData(token, user)
	const aTokenInstance = await ethers.getContractAt(
		'AToken',
		reserveData.aTokenAddress,
	)
	return {
		token,
		reserveData,
		userData,
		aTokenInstance,
	}
}
