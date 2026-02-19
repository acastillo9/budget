import { getContext, setContext } from 'svelte';
import type { UserState } from './types';

const key = 'userState';

export function setUserContext(userState: UserState) {
	setContext(key, userState);
}

export function getUserContext(): UserState {
	return getContext(key);
}
