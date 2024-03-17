import { ethers, network } from 'hardhat'
import { AddressLike } from 'ethers'
import { deployApp } from '../../heplers/deployApp'
import { networksData } from '../../heplers/data'
import { oneEther } from '../../heplers/constants'

export async function deployAppFixture() {
	const data = networksData.test

	const MintableERC20 = await ethers.getContractFactory('MintableERC20')
	const WETH9Mocked = await ethers.getContractFactory('WETH9Mocked')

	const dai = await MintableERC20.deploy('DAI token', 'DAI', 18)
	const usdc = await MintableERC20.deploy('USDC token', 'USDC', 6)
	const aave = await MintableERC20.deploy('DAI token', 'AAVE', 18)
	const link = await MintableERC20.deploy('LINK token', 'LINK', 18)
	const weth = await WETH9Mocked.deploy()

	const PriceOracle = await ethers.getContractFactory('PriceOracle')
	const priceOracle = await PriceOracle.deploy()

	const MockAggregator = await ethers.getContractFactory('MockAggregator')
	const daiAggregator = await MockAggregator.deploy(
		oneEther.multipliedBy('0.00369068412860').toFixed(),
	)
	const usdcAggregator = await MockAggregator.deploy(
		oneEther.multipliedBy('0.00367714136416').toFixed(),
	)
	const wethAggregator = await MockAggregator.deploy(oneEther.toFixed())
	const aaveAggregator = await MockAggregator.deploy(
		oneEther.multipliedBy('0.003620948469').toFixed(),
	)
	const linkAggregator = await MockAggregator.deploy(
		oneEther.multipliedBy('0.009955').toFixed(),
	)

	data[0].address = await dai.getAddress()
	data[1].address = await usdc.getAddress()
	data[2].address = await weth.getAddress()
	data[3].address = await aave.getAddress()
	data[4].address = await link.getAddress()
	data[0].chainlinkAggregator = await daiAggregator.getAddress()
	data[1].chainlinkAggregator = await usdcAggregator.getAddress()
	data[2].chainlinkAggregator = await wethAggregator.getAddress()
	data[3].chainlinkAggregator = await aaveAggregator.getAddress()
	data[4].chainlinkAggregator = await linkAggregator.getAddress()

	await priceOracle.setAssetPrice(
		dai,
		oneEther.multipliedBy('0.00369068412860').toFixed(),
	)
	await priceOracle.setAssetPrice(
		usdc,
		oneEther.multipliedBy('0.00367714136416').toFixed(),
	)
	await priceOracle.setAssetPrice(weth, oneEther.toFixed())
	await priceOracle.setAssetPrice(
		aave,
		oneEther.multipliedBy('0.003620948469').toFixed(),
	)
	await priceOracle.setAssetPrice(
		link,
		oneEther.multipliedBy('0.009955').toFixed(),
	)
	const deployer = (await ethers.getSigners())[0]
	const deployedApp = await deployApp(
		networksData.test,
		false,
		deployer.address,
		'WETH',
	)

	await deployedApp.addressesProvider.setPriceOracle(priceOracle)

	const MockFlashLoanReceiver = await ethers.getContractFactory(
		'MockFlashLoanReceiver',
	)
	const mockFlashLoanReceiver = await MockFlashLoanReceiver.deploy(
		deployedApp.addressesProvider,
	)

	const aDaiAddress = (
		await deployedApp.aaveProtocolDataProvider.getReserveTokensAddresses(
			dai,
		)
	).aTokenAddress
	const aDai = await ethers.getContractAt('AToken', aDaiAddress)

	const aWethAddress = (
		await deployedApp.aaveProtocolDataProvider.getReserveTokensAddresses(
			weth,
		)
	).aTokenAddress
	const aWeth = await ethers.getContractAt('AToken', aWethAddress)

	const ownerPrivateKey = ethers.Wallet.fromPhrase(
		//@ts-ignore
		network.config.accounts.mnemonic,
	).privateKey

	return {
		...deployedApp,
		aDai,
		dai,
		usdc,
		weth,
		ownerPrivateKey,
		priceOracle,
		aWeth,
		mockFlashLoanReceiver,
		aave,
		link,
	}
}
