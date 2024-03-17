import BigNumber from 'bignumber.js'
import { INetworks, IStrategy } from './types'
import { ethers } from 'hardhat'

const oneRay = new BigNumber(Math.pow(10, 27))

// BAT ENJ LINK MANA MKR REN YFI ZRX
export const rateStrategyVolatileOne: IStrategy = {
	name: 'rateStrategyVolatileOne',
	optimalUtilizationRate: new BigNumber(0.45).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
	variableRateSlope1: new BigNumber(0.07).multipliedBy(oneRay).toFixed(),
	variableRateSlope2: new BigNumber(3).multipliedBy(oneRay).toFixed(),
	stableRateSlope1: new BigNumber(0.1).multipliedBy(oneRay).toFixed(),
	stableRateSlope2: new BigNumber(3).multipliedBy(oneRay).toFixed(),
}

// BUSD SUSD
export const rateStrategyStableOne: IStrategy = {
	name: 'rateStrategyStableOne',
	optimalUtilizationRate: new BigNumber(0.8).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
	variableRateSlope1: new BigNumber(0.04).multipliedBy(oneRay).toFixed(),
	variableRateSlope2: new BigNumber(1).multipliedBy(oneRay).toFixed(),
	stableRateSlope1: '0',
	stableRateSlope2: '0',
}

// DAI TUSD
const rateStrategyStableTwo: IStrategy = {
	name: 'rateStrategyStableTwo',
	optimalUtilizationRate: new BigNumber(0.8).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
	variableRateSlope1: new BigNumber(0.04).multipliedBy(oneRay).toFixed(),
	variableRateSlope2: new BigNumber(0.75).multipliedBy(oneRay).toFixed(),
	stableRateSlope1: new BigNumber(0.02).multipliedBy(oneRay).toFixed(),
	stableRateSlope2: new BigNumber(0.75).multipliedBy(oneRay).toFixed(),
}
// KNC WBTC
const rateStrategyVolatileTwo: IStrategy = {
	name: 'rateStrategyVolatileTwo',
	optimalUtilizationRate: new BigNumber(0.65).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
	variableRateSlope1: new BigNumber(0.08).multipliedBy(oneRay).toFixed(),
	variableRateSlope2: new BigNumber(3).multipliedBy(oneRay).toFixed(),
	stableRateSlope1: new BigNumber(0.1).multipliedBy(oneRay).toFixed(),
	stableRateSlope2: new BigNumber(3).multipliedBy(oneRay).toFixed(),
}

// USDC USDT
const rateStrategyStableThree: IStrategy = {
	name: 'rateStrategyStableThree',
	optimalUtilizationRate: new BigNumber(0.9).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
	variableRateSlope1: new BigNumber(0.04).multipliedBy(oneRay).toFixed(),
	variableRateSlope2: new BigNumber(0.6).multipliedBy(oneRay).toFixed(),
	stableRateSlope1: new BigNumber(0.02).multipliedBy(oneRay).toFixed(),
	stableRateSlope2: new BigNumber(0.6).multipliedBy(oneRay).toFixed(),
}

// WETH
const rateStrategyWETH: IStrategy = {
	name: 'rateStrategyWETH',
	optimalUtilizationRate: new BigNumber(0.65).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: new BigNumber(0).multipliedBy(oneRay).toFixed(),
	variableRateSlope1: new BigNumber(0.08).multipliedBy(oneRay).toFixed(),
	variableRateSlope2: new BigNumber(1).multipliedBy(oneRay).toFixed(),
	stableRateSlope1: new BigNumber(0.1).multipliedBy(oneRay).toFixed(),
	stableRateSlope2: new BigNumber(1).multipliedBy(oneRay).toFixed(),
}

// AAVE
const rateStrategyAAVE: IStrategy = {
	name: 'rateStrategyAAVE',
	optimalUtilizationRate: new BigNumber(0.45).multipliedBy(oneRay).toFixed(),
	baseVariableBorrowRate: '0',
	variableRateSlope1: '0',
	variableRateSlope2: '0',
	stableRateSlope1: '0',
	stableRateSlope2: '0',
}

export const networksData: INetworks = {
	mainnet: [
		{
			symbol: 'DAI',
			address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
			chainlinkAggregator: '0x773616E4d11A78F511299002da57A0a94577F1f4',
			lendingRate: oneRay.multipliedBy(0.039).toFixed(),
			config: {
				strategy: rateStrategyStableTwo,
				baseLTVAsCollateral: '7500',
				liquidationThreshold: '8000',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '1000',
			},
		},
		{
			symbol: 'WBTC',
			address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
			chainlinkAggregator: '0xdeb288F737066589598e9214E782fa5A8eD689e8',
			lendingRate: oneRay.multipliedBy(0.03).toFixed(),
			config: {
				strategy: rateStrategyVolatileTwo,
				baseLTVAsCollateral: '7000',
				liquidationThreshold: '7500',
				liquidationBonus: '11000',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '8',
				reserveFactor: '2000',
			},
		},
		{
			symbol: 'WETH',
			address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
			chainlinkAggregator: '',
			lendingRate: oneRay.multipliedBy(0.03).toFixed(),
			config: {
				strategy: rateStrategyWETH,
				baseLTVAsCollateral: '8000',
				liquidationThreshold: '8250',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '1000',
			},
		},
	],
	test: [
		{
			symbol: 'DAI',
			address: '',
			chainlinkAggregator: '',
			lendingRate: oneRay.multipliedBy(0.039).toFixed(),
			config: {
				strategy: rateStrategyStableTwo,
				baseLTVAsCollateral: '7500',
				liquidationThreshold: '8000',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '1000',
			},
		},
		{
			symbol: 'USDC',
			address: '',
			chainlinkAggregator: '',
			lendingRate: oneRay.multipliedBy(0.039).toFixed(),
			config: {
				strategy: rateStrategyStableThree,
				baseLTVAsCollateral: '8000',
				liquidationThreshold: '8500',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '6',
				reserveFactor: '1000',
			},
		},
		{
			symbol: 'WETH',
			address: '',
			chainlinkAggregator: '',
			lendingRate: oneRay.multipliedBy(0.03).toFixed(),
			config: {
				strategy: rateStrategyWETH,
				baseLTVAsCollateral: '8000',
				liquidationThreshold: '8250',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '1000',
			},
		},
		{
			symbol: 'AAVE',
			lendingRate: oneRay.multipliedBy(0.03).toFixed(),
			address: '',
			chainlinkAggregator: '',
			config: {
				strategy: rateStrategyAAVE,
				baseLTVAsCollateral: '5000',
				liquidationThreshold: '6500',
				liquidationBonus: '11000',
				borrowingEnabled: false,
				stableBorrowRateEnabled: false,
				reserveDecimals: '18',
				reserveFactor: '0',
			},
		},
		{
			symbol: 'LINK',
			lendingRate: oneRay.multipliedBy(0.03).toFixed(),
			address: '',
			chainlinkAggregator: '',
			config: {
				strategy: rateStrategyVolatileOne,
				baseLTVAsCollateral: '7000',
				liquidationThreshold: '7500',
				liquidationBonus: '11000',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '2000',
			},
		},
	],
	sepolia: [
		{
			symbol: 'SMTH',
			address: '0x8aEc6Df1270Bd979666BFbDB1900784048887B6c',
			chainlinkAggregator: ethers.ZeroAddress,
			lendingRate: oneRay.multipliedBy(0.039).toFixed(),
			config: {
				strategy: rateStrategyStableTwo,
				baseLTVAsCollateral: '7500',
				liquidationThreshold: '8000',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '1000',
			},
		},
		{
			symbol: 'WETH',
			address: '0xD0dF82dE051244f04BfF3A8bB1f62E1cD39eED92',
			chainlinkAggregator: '',
			lendingRate: oneRay.multipliedBy(0.039).toFixed(),
			config: {
				strategy: rateStrategyStableTwo,
				baseLTVAsCollateral: '7500',
				liquidationThreshold: '8000',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '18',
				reserveFactor: '1000',
			},
		},
		{
			symbol: 'ANY',
			address: '0x702c288dc1E7FbC5b1D1610ab628Ac2620Aa6e4B',
			chainlinkAggregator: ethers.ZeroAddress,
			lendingRate: oneRay.multipliedBy(0.039).toFixed(),
			config: {
				strategy: rateStrategyStableThree,
				baseLTVAsCollateral: '8000',
				liquidationThreshold: '8500',
				liquidationBonus: '10500',
				borrowingEnabled: true,
				stableBorrowRateEnabled: true,
				reserveDecimals: '6',
				reserveFactor: '1000',
			},
		},
	],
}

export const main = {}
