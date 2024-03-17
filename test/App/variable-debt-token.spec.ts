import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'
import { testEnv } from './_.before'
import { ethers } from 'hardhat'

export const VariableDebtTokenTest = () => {
	const { CT_CALLER_MUST_BE_LENDING_POOL } = ProtocolErrors

	it('Tries to invoke mint not being the LendingPool', async () => {
		const { deployer, pool, dai, helpersContract } = testEnv

		const daiVariableDebtTokenAddress = (
			await helpersContract.getReserveTokensAddresses(dai)
		).variableDebtTokenAddress

		const variableDebtContract = await ethers.getContractAt(
			'VariableDebtToken',
			daiVariableDebtTokenAddress,
		)

		await expect(
			variableDebtContract.mint(
				deployer.address,
				deployer.address,
				'1',
				'1',
			),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})

	it('Tries to invoke burn not being the LendingPool', async () => {
		const { deployer, pool, dai, helpersContract } = testEnv

		const daiVariableDebtTokenAddress = (
			await helpersContract.getReserveTokensAddresses(dai)
		).variableDebtTokenAddress

		const variableDebtContract = await ethers.getContractAt(
			'VariableDebtToken',
			daiVariableDebtTokenAddress,
		)

		await expect(
			variableDebtContract.burn(deployer.address, '1', '1'),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})
}
