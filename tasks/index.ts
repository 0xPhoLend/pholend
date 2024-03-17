import { task } from 'hardhat/config'
import { verifyAll } from './verify'

//run for test: npx hardhat verifyAll --path ./deployments/sepolia/test --network sepolia

task('verifyAll', 'verify all contracts in folder')
	.addParam('path', 'path to folder with deployed contracts')
	.setAction(verifyAll)
