import { ethers } from 'hardhat'
import { expect } from 'chai'
import { testEnv } from './_.before'
import { ProtocolErrors } from '../../heplers/types'

export const LendingPoolAddressesProviderTest = () => {
	it('Test the accessibility of the LendingPoolAddressesProvider', async () => {
		const { addressesProvider, users } = testEnv
		const mockAddress = ethers.Wallet.createRandom().address
		const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors

		await addressesProvider.transferOwnership(users[1].address)

		for (const contractFunction of [
			addressesProvider.setMarketId,
			addressesProvider.setLendingPoolImpl,
			addressesProvider.setLendingPoolConfiguratorImpl,
			addressesProvider.setLendingPoolCollateralManager,
			addressesProvider.setPoolAdmin,
			addressesProvider.setPriceOracle,
			addressesProvider.setLendingRateOracle,
		]) {
			await expect(contractFunction(mockAddress)).to.be.revertedWith(
				INVALID_OWNER_REVERT_MSG,
			)
		}

		await expect(
			addressesProvider.setAddress(
				ethers.keccak256(ethers.toUtf8Bytes('RANDOM_ID')),
				mockAddress,
			),
		).to.be.revertedWith(INVALID_OWNER_REVERT_MSG)

		await expect(
			addressesProvider.setAddressAsProxy(
				ethers.keccak256(ethers.toUtf8Bytes('RANDOM_ID')),
				mockAddress,
			),
		).to.be.revertedWith(INVALID_OWNER_REVERT_MSG)
	})

	it('Tests adding  a proxied address with `setAddressAsProxy()`', async () => {
		const { addressesProvider, users } = testEnv
		const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors

		const currentAddressesProviderOwner = users[1]

		const ReserveLogic = await ethers.getContractFactory('ReserveLogic')
		const reserveLogic = await ReserveLogic.deploy()

		const GenericLogic = await ethers.getContractFactory('GenericLogic')
		const genericLogic = await GenericLogic.deploy()

		const ValidationLogic = await ethers.getContractFactory(
			'ValidationLogic',
			{ libraries: { GenericLogic: genericLogic } },
		)
		const validationLogic = await ValidationLogic.deploy()

		const LendingPool = await ethers.getContractFactory('LendingPool', {
			libraries: {
				ReserveLogic: reserveLogic,
				ValidationLogic: validationLogic,
			},
		})
		const mockLendingPool = await LendingPool.deploy()
		const proxiedAddressId = ethers.keccak256(
			ethers.toUtf8Bytes('RANDOM_PROXIED'),
		)

		const proxiedAddressSetReceipt = await (
			await addressesProvider
				.connect(currentAddressesProviderOwner)
				.setAddressAsProxy(proxiedAddressId, mockLendingPool.target)
		).wait()

		if (
			!proxiedAddressSetReceipt?.logs ||
			proxiedAddressSetReceipt.logs?.length < 1
		) {
			throw new Error('INVALID_EVENT_EMMITED')
		}

		expect(proxiedAddressSetReceipt.logs[0].fragment.name).to.be.equal(
			'ProxyCreated',
		)
		expect(proxiedAddressSetReceipt.logs[1].fragment.name).to.be.equal(
			'AddressSet',
		)
		expect(proxiedAddressSetReceipt.logs[1].args.id).to.be.equal(
			proxiedAddressId,
		)
		expect(proxiedAddressSetReceipt.logs[1].args?.newAddress).to.be.equal(
			mockLendingPool.target,
		)
		expect(proxiedAddressSetReceipt.logs[1].args?.hasProxy).to.be.equal(
			true,
		)
	})

	it('Tests adding a non proxied address with `setAddress()`', async () => {
		const { addressesProvider, users } = testEnv
		const { INVALID_OWNER_REVERT_MSG } = ProtocolErrors

		const currentAddressesProviderOwner = users[1]

		const mockNonProxiedAddress = ethers.Wallet.createRandom().address
		const nonProxiedAddressId = ethers.keccak256(
			ethers.toUtf8Bytes('RANDOM_NON_PROXIED'),
		)

		const nonProxiedAddressSetReceipt = await (
			await addressesProvider
				.connect(currentAddressesProviderOwner)
				.setAddress(nonProxiedAddressId, mockNonProxiedAddress)
		).wait()

		expect(mockNonProxiedAddress.toLowerCase()).to.be.equal(
			(
				await addressesProvider.getFunction('getAddress')(
					nonProxiedAddressId,
				)
			).toLowerCase(),
		)

		if (
			!nonProxiedAddressSetReceipt?.logs ||
			nonProxiedAddressSetReceipt.logs.length < 1
		) {
			throw new Error('INVALID_EVENT_EMMITED')
		}

		expect(nonProxiedAddressSetReceipt.logs[0].fragment.name).to.be.equal(
			'AddressSet',
		)
		expect(nonProxiedAddressSetReceipt.logs[0].args?.id).to.be.equal(
			nonProxiedAddressId,
		)

		expect(nonProxiedAddressSetReceipt.logs[0].args.newAddress).to.be.equal(
			mockNonProxiedAddress,
		)
		expect(nonProxiedAddressSetReceipt.logs[0].args.hasProxy).to.be.equal(
			false,
		)
	})
}
