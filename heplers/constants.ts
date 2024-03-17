import BigNumber from 'bignumber.js'

export const MAX_UINT_AMOUNT =
	'115792089237316195423570985008687907853269984665640564039457584007913129639935'
export const BUIDLEREVM_CHAINID = 31337
export const APPROVAL_AMOUNT_LENDING_POOL = '1000000000000000000000000000'
export const RAY = new BigNumber(10).exponentiatedBy(27).toFixed()
export const oneRay = new BigNumber(Math.pow(10, 27))
export const oneEther = new BigNumber(Math.pow(10, 18))
export const WAD = Math.pow(10, 18).toString()
export const HALF_RAY = new BigNumber(RAY).multipliedBy(0.5).toFixed()
export const HALF_WAD = new BigNumber(WAD).multipliedBy(0.5).toString()
export const WAD_RAY_RATIO = Math.pow(10, 9).toString()
export const PERCENTAGE_FACTOR = '10000'
export const HALF_PERCENTAGE = '5000'
export const ONE_YEAR = '31536000'
