import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'
import { testEnv } from './_.before'

export const ATokenModifiersTest = () => {
	const { CT_CALLER_MUST_BE_LENDING_POOL } = ProtocolErrors

	it('Tries to invoke mint not being the LendingPool', async () => {
		const { deployer, aDai } = testEnv
		await expect(aDai.mint(deployer.address, '1', '1')).to.be.revertedWith(
			CT_CALLER_MUST_BE_LENDING_POOL,
		)
	})

	it('Tries to invoke burn not being the LendingPool', async () => {
		const { deployer, aDai } = testEnv
		await expect(
			aDai.burn(deployer.address, deployer.address, '1', '1'),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})

	it('Tries to invoke transferOnLiquidation not being the LendingPool', async () => {
		const { deployer, users, aDai } = testEnv
		await expect(
			aDai.transferOnLiquidation(deployer.address, users[0].address, '1'),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})

	it('Tries to invoke transferUnderlyingTo not being the LendingPool', async () => {
		const { deployer, aDai } = testEnv
		await expect(
			aDai.transferUnderlyingTo(deployer.address, '1'),
		).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL)
	})
}
