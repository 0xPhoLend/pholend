import {
	ContractTransactionResponse,
	BaseContract,
	AddressLike,
	ethers as ethersFromEthers,
} from 'ethers'
import { ethers, network, run } from 'hardhat'
import { SignTypedDataVersion, signTypedData } from '@metamask/eth-sig-util'
import { fromRpcSig, ECDSASignature } from 'ethereumjs-util'
import {
	AToken,
	AaveProtocolDataProvider,
	LendingPool,
	LendingRateOracle,
	MintableERC20,
	WETH9Mocked,
} from '../typechain-types'
import BigNumber from 'bignumber.js'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { IDeployment, ReserveData, UserReserveData } from './types'
import fs from 'fs'

export let deploymentPath: string

export async function waitAndLogDeployment(
	contract: BaseContract & {
		deploymentTransaction(): ContractTransactionResponse
	},
	name: string,
	verifyArgs: any[] | null,
	libraries?: { [key: string]: any },
) {
	const tx = contract.deploymentTransaction()

	await tx?.wait()

	const contractAddress = await contract.getAddress()

	console.log('contract name:', name)
	console.log('tx:', tx?.hash)
	console.log('contract address:', contractAddress)
	console.log()

	if (verifyArgs) {
		const filePath = deploymentPath + `/${name}.json`

		const deployment: IDeployment = {
			name: name,
			contractAddress: contractAddress,
			args: verifyArgs,
			libraries: libraries,
		}
		const fileContent = JSON.stringify(deployment)

		fs.writeFileSync(filePath, fileContent, {})
	}
}

export const setFolderForDeployment = () => {
	const pathOfdeployments = `./deployments/${network.name}`
	fs.mkdirSync(pathOfdeployments, { recursive: true })

	const now = new Date()
	const day = now.getDate()
	const month = now.getMonth() + 1
	const year = now.getFullYear()
	const hours = now.getHours()
	const minutes = now.getMinutes()
	const newFolder = `${day}.${month}.${year}_${hours}.${minutes}`

	deploymentPath = pathOfdeployments + '/' + newFolder
	fs.mkdirSync(deploymentPath, { recursive: true })
}

export async function waitForTx(
	tx: ContractTransactionResponse,
	confirms?: number,
) {
	await tx.wait(confirms)
}

export const buildPermitParams = (
	chainId: number,
	token: AddressLike,
	revision: string,
	tokenName: string,
	owner: AddressLike,
	spender: AddressLike,
	nonce: bigint,
	deadline: string,
	value: string,
) => ({
	types: {
		EIP712Domain: [
			{ name: 'name', type: 'string' },
			{ name: 'version', type: 'string' },
			{ name: 'chainId', type: 'uint256' },
			{ name: 'verifyingContract', type: 'address' },
		],
		Permit: [
			{ name: 'owner', type: 'address' },
			{ name: 'spender', type: 'address' },
			{ name: 'value', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' },
		],
	},
	primaryType: 'Permit' as const,
	domain: {
		name: tokenName,
		version: revision,
		chainId: chainId,
		verifyingContract: token,
	},
	message: {
		owner,
		spender,
		value,
		nonce,
		deadline,
	},
})

export const getSignatureFromTypedData = (
	privateKey: string,
	//@ts-ignore
	typedData, // TODO: should be TypedData, from eth-sig-utils, but TS doesn't accept it
): ECDSASignature => {
	const signature = signTypedData({
		privateKey: Buffer.from(privateKey.substring(2, 66), 'hex'),
		data: typedData,
		version: SignTypedDataVersion.V4,
	})
	return fromRpcSig(signature)
}

export async function convertToCurrencyDecimals(
	token:
		| (MintableERC20 & {
				deploymentTransaction(): ethersFromEthers.ContractTransactionResponse
		  })
		| MintableERC20
		| WETH9Mocked
		| AToken,
	amount: string,
) {
	const decimals = await token.decimals()
	return ethers.parseUnits(amount, decimals)
}

export async function getReserveData(
	helper: AaveProtocolDataProvider,
	token: MintableERC20 | WETH9Mocked,
	rateOracle: LendingRateOracle,
): Promise<ReserveData> {
	const [reserveData, tokenAddresses] = await Promise.all([
		helper.getReserveData(token),
		helper.getReserveTokensAddresses(token),
	])

	const stableDebtToken = await ethers.getContractAt(
		'StableDebtToken',
		tokenAddresses.stableDebtTokenAddress,
	)
	const variableDebtToken = await ethers.getContractAt(
		'VariableDebtToken',
		tokenAddresses.variableDebtTokenAddress,
	)

	const { 0: principalStableDebt } = await stableDebtToken.getSupplyData()
	const totalStableDebtLastUpdated =
		await stableDebtToken.getTotalSupplyLastUpdated()

	const scaledVariableDebt = await variableDebtToken.scaledTotalSupply()

	const rate = (await rateOracle.getMarketBorrowRate(token)).toString()
	const symbol = await token.symbol()
	const decimals = new BigNumber((await token.decimals()).toString())

	const totalLiquidity = new BigNumber(
		reserveData.availableLiquidity.toString(),
	)
		.plus(reserveData.totalStableDebt.toString())
		.plus(reserveData.totalVariableDebt.toString())

	const utilizationRate = new BigNumber(
		totalLiquidity.eq(0)
			? 0
			: new BigNumber(reserveData.totalStableDebt.toString())
					.plus(reserveData.totalVariableDebt.toString())
					.rayDiv(totalLiquidity),
	)
	return {
		totalLiquidity,
		utilizationRate,
		availableLiquidity: new BigNumber(
			reserveData.availableLiquidity.toString(),
		),
		totalStableDebt: new BigNumber(reserveData.totalStableDebt.toString()),
		totalVariableDebt: new BigNumber(
			reserveData.totalVariableDebt.toString(),
		),
		liquidityRate: new BigNumber(reserveData.liquidityRate.toString()),
		variableBorrowRate: new BigNumber(
			reserveData.variableBorrowRate.toString(),
		),
		stableBorrowRate: new BigNumber(
			reserveData.stableBorrowRate.toString(),
		),
		averageStableBorrowRate: new BigNumber(
			reserveData.averageStableBorrowRate.toString(),
		),
		liquidityIndex: new BigNumber(reserveData.liquidityIndex.toString()),
		variableBorrowIndex: new BigNumber(
			reserveData.variableBorrowIndex.toString(),
		),
		lastUpdateTimestamp: new BigNumber(
			reserveData.lastUpdateTimestamp.toString(),
		),
		totalStableDebtLastUpdated: new BigNumber(
			totalStableDebtLastUpdated.toString(),
		),
		principalStableDebt: new BigNumber(principalStableDebt.toString()),
		scaledVariableDebt: new BigNumber(scaledVariableDebt.toString()),
		address: await token.getAddress(),
		aTokenAddress: tokenAddresses.aTokenAddress,
		symbol,
		decimals,
		marketStableRate: new BigNumber(rate),
	}
}

export const getUserData = async (
	pool: LendingPool,
	helper: AaveProtocolDataProvider,
	token: MintableERC20 | WETH9Mocked,
	user: HardhatEthersSigner,
	sender?: HardhatEthersSigner,
): Promise<UserReserveData> => {
	const [userData] = await Promise.all([
		helper.getUserReserveData(token, user),
	])

	const aTokenAddress = (await helper.getReserveTokensAddresses(token))
		.aTokenAddress
	const aToken = await ethers.getContractAt('AToken', aTokenAddress)

	const scaledATokenBalance = await aToken.scaledBalanceOf(user)

	const walletBalance = new BigNumber(
		(await token.balanceOf(sender || user)).toString(),
	)

	return {
		scaledATokenBalance: new BigNumber(scaledATokenBalance.toString()),
		currentATokenBalance: new BigNumber(
			userData.currentATokenBalance.toString(),
		),
		currentStableDebt: new BigNumber(userData.currentStableDebt.toString()),
		currentVariableDebt: new BigNumber(
			userData.currentVariableDebt.toString(),
		),
		principalStableDebt: new BigNumber(
			userData.principalStableDebt.toString(),
		),
		scaledVariableDebt: new BigNumber(
			userData.scaledVariableDebt.toString(),
		),
		stableBorrowRate: new BigNumber(userData.stableBorrowRate.toString()),
		liquidityRate: new BigNumber(userData.liquidityRate.toString()),
		usageAsCollateralEnabled: userData.usageAsCollateralEnabled,
		stableRateLastUpdated: new BigNumber(
			userData.stableRateLastUpdated.toString(),
		),
		walletBalance,
	}
}

export const increaseTime = async (secondsToIncrease: number) => {
	await ethers.provider.send('evm_increaseTime', [secondsToIncrease])
	await ethers.provider.send('evm_mine', [])
}

export const timeLatest = async () => {
	const block = await ethers.provider.getBlock('latest')
	if (!block) {
		throw Error('block is null')
	}
	return new BigNumber(block.timestamp)
}

export const advanceTimeAndBlock = async function (forwardTime: number) {
	const currentBlockNumber = await ethers.provider.getBlockNumber()
	const currentBlock = await ethers.provider.getBlock(currentBlockNumber)

	if (currentBlock === null) {
		/* Workaround for https://github.com/nomiclabs/hardhat/issues/1183
		 */
		await ethers.provider.send('evm_increaseTime', [forwardTime])
		await ethers.provider.send('evm_mine', [])
		//Set the next blocktime back to 15 seconds
		await ethers.provider.send('evm_increaseTime', [15])
		return
	}
	const currentTime = currentBlock.timestamp
	const futureTime = currentTime + forwardTime
	await ethers.provider.send('evm_setNextBlockTimestamp', [futureTime])
	await ethers.provider.send('evm_mine', [])
}

export const chunk = <T>(arr: Array<T>, chunkSize: number): Array<Array<T>> => {
	return arr.reduce(
		(prevVal: any, currVal: any, currIndx: number, array: Array<T>) =>
			!(currIndx % chunkSize)
				? prevVal.concat([array.slice(currIndx, currIndx + chunkSize)])
				: prevVal,
		[],
	)
}
