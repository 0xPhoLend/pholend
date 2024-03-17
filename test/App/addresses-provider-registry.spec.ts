import { expect } from 'chai'
import { ProtocolErrors } from '../../heplers/types'
import { ethers } from 'hardhat'
import { testEnv } from './_.before'

export const AddressesProviderRegistryTest = () => {
	it('Checks the addresses provider is added to the registry', async () => {
		const { addressesProvider, registry } = testEnv

		const providers = await registry.getAddressesProvidersList()

		expect(providers.length).to.be.equal(
			1,
			'Invalid length of the addresses providers list',
		)
		expect(providers[0].toString()).to.be.equal(
			addressesProvider,
			' Invalid addresses provider added to the list',
		)
	})

	it('tries to register an addresses provider with id 0', async () => {
		const { users, registry } = testEnv
		const { LPAPR_INVALID_ADDRESSES_PROVIDER_ID } = ProtocolErrors

		await expect(
			registry.registerAddressesProvider(users[2].address, '0'),
		).to.be.revertedWith(LPAPR_INVALID_ADDRESSES_PROVIDER_ID)
	})

	it('Registers a new mock addresses provider', async () => {
		const { users, registry } = testEnv

		//simulating an addresses provider using the users[1] wallet address
		await registry.registerAddressesProvider(users[1].address, '2')

		const providers = await registry.getAddressesProvidersList()

		expect(providers.length).to.be.equal(
			2,
			'Invalid length of the addresses providers list',
		)
		expect(providers[1].toString()).to.be.equal(
			users[1].address,
			' Invalid addresses provider added to the list',
		)
	})

	it('Removes the mock addresses provider', async () => {
		const { users, registry, addressesProvider } = testEnv

		const id = await registry.getAddressesProviderIdByAddress(
			users[1].address,
		)

		expect(id).to.be.equal('2', 'Invalid isRegistered return value')

		await registry.unregisterAddressesProvider(users[1].address)

		const providers = await registry.getAddressesProvidersList()

		expect(providers.length).to.be.equal(
			2,
			'Invalid length of the addresses providers list',
		)
		expect(providers[0].toString()).to.be.equal(
			addressesProvider,
			' Invalid addresses provider added to the list',
		)
		expect(providers[1].toString()).to.be.equal(
			ethers.ZeroAddress,
			' Invalid addresses',
		)
	})

	it('Tries to remove a unregistered addressesProvider', async () => {
		const { LPAPR_PROVIDER_NOT_REGISTERED } = ProtocolErrors

		const { users, registry } = testEnv

		await expect(
			registry.unregisterAddressesProvider(users[2].address),
		).to.be.revertedWith(LPAPR_PROVIDER_NOT_REGISTERED)
	})

	it('Tries to remove a unregistered addressesProvider', async () => {
		const { LPAPR_PROVIDER_NOT_REGISTERED } = ProtocolErrors

		const { users, registry } = testEnv

		await expect(
			registry.unregisterAddressesProvider(users[2].address),
		).to.be.revertedWith(LPAPR_PROVIDER_NOT_REGISTERED)
	})

	it('Tries to add an already added addressesProvider with a different id. Should overwrite the previous id', async () => {
		const { users, registry, addressesProvider } = testEnv

		await registry.registerAddressesProvider(addressesProvider, '2')

		const providers = await registry.getAddressesProvidersList()

		const id =
			await registry.getAddressesProviderIdByAddress(addressesProvider)

		expect(providers.length).to.be.equal(
			2,
			'Invalid length of the addresses providers list',
		)

		expect(providers[0].toString()).to.be.equal(
			addressesProvider,
			' Invalid addresses provider added to the list',
		)
		expect(providers[1].toString()).to.be.equal(
			ethers.ZeroAddress,
			' Invalid addresses',
		)
	})
}
