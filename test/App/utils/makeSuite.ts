import { makeEnv } from '../_.before'

export function makeSuite(
	name: string,
	test: () => void,
	behavior?: 'skip' | 'only',
) {
	if (behavior === 'skip') {
		describe.skip(name, () => {
			before(async () => {
				await makeEnv()
			})
			test()
		})
	} else if (behavior === 'only') {
		describe.only(name, () => {
			before(async () => {
				await makeEnv()
			})
			test()
		})
	} else {
		describe(name, () => {
			before(async () => {
				await makeEnv()
			})
			test()
		})
	}
}
