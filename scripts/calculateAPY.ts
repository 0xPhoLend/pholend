// https://docs.aave.com/developers/v/2.0/guides/apy-and-apr#apr-greater-than-apy

export async function main() {
	const RAY = 10n ** 27n
	const depositAPR = 0.158
	const SECONDS_PER_YEAR = 31536000
	const depositAPY =
		(1 + depositAPR / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1

	const daiDepositApr =
		((1 + 0.1431) ** (1 / SECONDS_PER_YEAR) - 1) * SECONDS_PER_YEAR
	const daiBorrowApr =
		((1 + 0.2388) ** (1 / SECONDS_PER_YEAR) - 1) * SECONDS_PER_YEAR
	console.log(depositAPY)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
