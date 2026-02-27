<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import Logo from '$lib/components/logo.svelte';
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Budget App - {$t('workspaces.acceptInvite')}</title>
</svelte:head>

<div class="flex h-full w-full items-center justify-center p-4">
	<div class="w-full md:w-96">
		<Card.Root>
			<Card.Header class="space-y-1">
				<p class="mb-4 flex justify-center">
					<Logo />
				</p>
				<Card.Title class="text-2xl">{$t('workspaces.acceptInvite')}</Card.Title>
				<Card.Description>
					{$t('workspaces.invitedToWorkspace', {
						values: { workspace: data.invitation?.workspace?.name ?? '' }
					})}
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4">
				<p class="text-muted-foreground text-sm">
					{$t('workspaces.signInToAccept')}
				</p>
			</Card.Content>
			<Card.Footer class="flex-col">
				<Button class="w-full" href="/signin">{$t('common.signIn')}</Button>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
