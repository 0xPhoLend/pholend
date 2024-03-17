import fs from 'fs'
import { IDeployment } from '../heplers/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

interface ITaskArgs {
	path: string
}

export const verifyAll = async (
	taskArgs: ITaskArgs,
	hre: HardhatRuntimeEnvironment,
) => {
	console.log('starting verification')

	const deployments = fs.readdirSync(taskArgs.path)
	let amountErrors = 0
	for await (const file of deployments) {
		const deployment: IDeployment = require(
			'./.' + taskArgs.path + '/' + file,
		)
		try {
			await hre.run('verify:verify', {
				address: deployment.contractAddress,
				constructorArguments: deployment.args,
				libraries: deployment.libraries,
			})
		} catch (error) {
			console.log(error)
			amountErrors++
		}
	}
	console.log(`verification was completed with ${amountErrors} errors`)
}
