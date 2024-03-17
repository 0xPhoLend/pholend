import { ethers } from 'hardhat'
import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'
import { testEnv } from './_.before'

export const StableDebtTokenTest = () => {
	const { CT_CALLER_MUST_BE_LENDING_POOL } = ProtocolErrors

	it('Tries to invoke mint not being the LendingPool', async () => {
		const { deployer, dai, helpersContract } = testEnv

		const daiStableDebtTokenAddress = (
			await helpersContract.getReserveTokensAddresses(dai)
		).stableDebtTokenAddress

		const stableDebtContract = await ethers.getContractAt(
			'StableDebtToken',
			daiStableDebtTokenAddress,
		)

		await expect(
			stableDebtContract.mint(
				deployer.address,
				deployer.address,
				'1',
				'1',
			),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})

	it('Tries to invoke burn not being the LendingPool', async () => {
		const { deployer, dai, helpersContract } = testEnv

		const daiStableDebtTokenAddress = (
			await helpersContract.getReserveTokensAddresses(dai)
		).stableDebtTokenAddress

		const stableDebtContract = await ethers.getContractAt(
			'StableDebtToken',
			daiStableDebtTokenAddress,
		)

		const name = await stableDebtContract.name()

		expect(name).to.be.equal('Stable debt bearing DAI')
		await expect(
			stableDebtContract.burn(deployer.address, '1'),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})
}
