import { networksData } from '../heplers/data'
import { deployApp } from '../heplers/deployApp'

export async function main() {
	await deployApp(networksData['bsc-testnet'], true, 'WBNB')
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
