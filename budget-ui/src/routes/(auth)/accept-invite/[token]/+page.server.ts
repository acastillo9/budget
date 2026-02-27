import { API_URL } from '$env/static/private';
import { setFlash } from 'sveltekit-flash-message/server';
import { redirect } from '@sveltejs/kit';
import { $t } from '$lib/i18n';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch, cookies, locals }) => {
	const { token } = params;

	// Validate the invitation token
	let invitation;
	try {
		const response = await fetch(`${API_URL}/workspaces/invitations/${token}`);
		if (!response.ok) {
			const { message } = await response.json();
			setFlash({ type: 'error', message: message || $t('workspaces.inviteInvalid') }, cookies);
			throw redirect(302, '/signin');
		}
		invitation = await response.json();
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		setFlash({ type: 'error', message: $t('workspaces.inviteInvalid') }, cookies);
		throw redirect(302, '/signin');
	}

	// If user is not logged in, set redirectTo cookie so post-auth redirects back here
	if (!locals.user) {
		cookies.set('redirectTo', `/accept-invite/${token}`, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 10 // 10 minutes
		});
	}

	// If user is logged in, accept automatically
	if (locals.user) {
		try {
			const acceptResponse = await fetch(`${API_URL}/workspaces/invitations/${token}/accept`, {
				method: 'POST'
			});
			if (!acceptResponse.ok) {
				const { message } = await acceptResponse.json();
				setFlash(
					{ type: 'error', message: message || $t('workspaces.acceptInviteError') },
					cookies
				);
				throw redirect(302, '/');
			}

			// Set the new workspace as active
			cookies.set('X-Workspace-Id', invitation.workspace.id || invitation.workspace, {
				path: '/',
				sameSite: 'strict',
				httpOnly: false
			});

			setFlash({ type: 'success', message: $t('workspaces.acceptInviteSuccess') }, cookies);
			throw redirect(302, '/');
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e) throw e;
			setFlash({ type: 'error', message: $t('workspaces.acceptInviteError') }, cookies);
			throw redirect(302, '/');
		}
	}

	return { invitation, token };
};
