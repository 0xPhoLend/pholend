import { ethers } from 'hardhat'
import {
	DelegationAwareAToken,
	MintableDelegationERC20,
} from '../../typechain-types'
import { testEnv } from './_.before'
import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'

export const delegationAwareTest = () => {
	let delegationAToken = <DelegationAwareAToken>{}
	let delegationERC20 = <MintableDelegationERC20>{}

	it('Deploys a new MintableDelegationERC20 and a DelegationAwareAToken', async () => {
		const { pool, reserveTreasury } = testEnv

		const MintableDelegationERC20 = await ethers.getContractFactory(
			'MintableDelegationERC20',
		)
		delegationERC20 = await MintableDelegationERC20.deploy(
			'DEL',
			'DEL',
			'18',
		)

		const DelegationAwareAToken = await ethers.getContractFactory(
			'DelegationAwareAToken',
		)

		delegationAToken = await DelegationAwareAToken.deploy(
			pool.target,
			delegationERC20.target,
			reserveTreasury.target,
			'aDEL',
			'aDEL',
			ethers.ZeroAddress,
		)
		//await delegationAToken.initialize(pool.target, ZERO_ADDRESS, delegationERC20.target, ZERO_ADDRESS, '18', 'aDEL', 'aDEL');
	})

	it('Tries to delegate with the caller not being the Aave admin', async () => {
		const { users } = testEnv

		await expect(
			delegationAToken
				.connect(users[1])
				.delegateUnderlyingTo(users[2].address),
		).to.be.revertedWith(ProtocolErrors.CALLER_NOT_POOL_ADMIN)
	})

	it('Tries to delegate to user 2', async () => {
		const { users } = testEnv

		await delegationAToken.delegateUnderlyingTo(users[2].address)

		const delegateeAddress = await delegationERC20.delegatee()

		expect(delegateeAddress).to.be.equal(users[2].address)
	})
}
