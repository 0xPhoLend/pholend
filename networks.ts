import dotenv from 'dotenv'

dotenv.config()

function accounts() {
	if (!process.env.PRIVATE_KEY) throw Error('private key is not set in .env')
	return [process.env.PRIVATE_KEY as string]
}

export default {
	// hardhat: {
	// forking: {
	// 	url: 'https://eth-mainnet.g.alchemy.com/v2/G0XWiB4W3Uw0kUSh2ADTc27emXvEc2NK',
	// 	blockNumber: 19254891,
	// },
	// },
	sepolia: {
		url: process.env.SEPOLIA_ENDPOINT,
		accounts: accounts(),
	},
	ethereum: {
		url: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
		chainId: 1,
		accounts: accounts(),
	},
	bsc: {
		url: 'https://bsc-dataseed1.binance.org',
		chainId: 56,
		accounts: accounts(),
	},
	avalanche: {
		url: 'https://api.avax.network/ext/bc/C/rpc',
		chainId: 43114,
		accounts: accounts(),
	},
	polygon: {
		url: 'https://rpc-mainnet.maticvigil.com',
		chainId: 137,
		accounts: accounts(),
	},
	goerli: {
		url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // public infura endpoint
		chainId: 5,
		accounts: accounts(),
	},
	arbitrum: {
		url: 'https://arb1.arbitrum.io/rpc',
		chainId: 42161,
		accounts: accounts(),
	},
	optimism: {
		url: 'https://mainnet.optimism.io',
		chainId: 10,
		accounts: accounts(),
	},
	fantom: {
		url: 'https://rpcapi.fantom.network',
		chainId: 250,
		accounts: accounts(),
	},
	'bsc-testnet': {
		url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
		chainId: 97,
		accounts: accounts(),
	},
	fuji: {
		url: 'https://api.avax-test.network/ext/bc/C/rpc',
		chainId: 43113,
		accounts: accounts(),
	},
	mumbai: {
		url: 'https://rpc-mumbai.matic.today/',
		chainId: 80001,
		accounts: accounts(),
	},
	'arbitrum-goerli': {
		url: 'https://goerli-rollup.arbitrum.io/rpc/',
		chainId: 421613,
		accounts: accounts(),
	},
	'optimism-goerli': {
		url: 'https://goerli.optimism.io/',
		chainId: 420,
		accounts: accounts(),
	},
	'fantom-testnet': {
		url: 'https://rpc.testnet.fantom.network/',
		chainId: 4002,
		accounts: accounts(),
	},
	moonbeam: {
		url: 'https://moonbeam.public.blastapi.io',
		chainId: 1284,
		accounts: accounts(),
	},
	moonbase: {
		url: 'https://rpc.api.moonbase.moonbeam.network',
		chainId: 1287,
		accounts: accounts(),
	},
}
