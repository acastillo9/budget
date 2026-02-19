<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	import Logo from '$lib/components/logo.svelte';
	import PasswordForm from '$lib/components/register-form/password-form.svelte';
	import { t } from 'svelte-i18n';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Budget App - {$t('resetPassword.title')}</title>
</svelte:head>

<div class="flex h-full items-center justify-center p-4">
	<div class="w-full md:w-96">
		<Card.Root>
			<Card.Header class="space-y-1">
				<p class="mb-4 flex justify-center">
					<Logo />
				</p>
				<Card.Title class="text-2xl">{$t('resetPassword.title')}</Card.Title>
				<Card.Description>{$t('resetPassword.description')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4">
				<PasswordForm data={data.form} accessToken={data.accessToken}></PasswordForm>
			</Card.Content>
			<Card.Footer class="flex-col">
				<div class="flex items-center">
					<p class="text-muted-foreground text-sm">{$t('common.goTo')}</p>
					<Button class="px-2" variant="link" href="/signin">{$t('common.signIn')}</Button>
				</div>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
