import type { UserState } from '$lib/types';

export const userState: UserState = $state({
	user: undefined,
	currencyRates: undefined
});
