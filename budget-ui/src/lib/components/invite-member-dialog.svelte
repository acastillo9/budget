<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import { t } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { createInvitationSchema } from '$lib/schemas/invitation.schema';

	interface Props {
		open?: boolean;
		onInviteSent?: () => void;
	}

	let { open = $bindable(false), onInviteSent = () => {} }: Props = $props();

	let email = $state('');
	let role = $state<'OWNER' | 'CONTRIBUTOR' | 'VIEWER'>('CONTRIBUTOR');
	let loading = $state(false);

	function resetForm() {
		email = '';
		role = 'CONTRIBUTOR';
	}

	async function handleSubmit() {
		const result = createInvitationSchema.safeParse({ email, role });
		if (!result.success) {
			toast.error($t('workspaces.inviteInvalidEmail'));
			return;
		}

		loading = true;
		try {
			const response = await fetch('/api/workspaces/invitations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, role })
			});

			if (!response.ok) {
				const { message } = await response.json();
				toast.error(message || $t('workspaces.inviteError'));
				return;
			}

			toast.success($t('workspaces.inviteSuccess'));
			open = false;
			resetForm();
			onInviteSent();
		} catch {
			toast.error($t('workspaces.inviteError'));
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen: boolean) => {
		if (!isOpen) resetForm();
	}}
>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button variant="default" size="sm" {...props}>
				<UserPlusIcon class="mr-2 h-4 w-4" />
				{$t('workspaces.inviteMember')}
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content escapeKeydownBehavior="ignore" interactOutsideBehavior="ignore">
		<Dialog.Header>
			<Dialog.Title>{$t('workspaces.inviteMember')}</Dialog.Title>
			<Dialog.Description>{$t('workspaces.inviteMemberDescription')}</Dialog.Description>
		</Dialog.Header>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<div class="space-y-2">
				<Label for="invite-email">{$t('common.email')}</Label>
				<Input id="invite-email" type="email" placeholder="user@example.com" bind:value={email} />
			</div>
			<div class="space-y-2">
				<Label for="invite-role">{$t('workspaces.role')}</Label>
				<Select.Root type="single" bind:value={role}>
					<Select.Trigger class="w-full">
						{$t(`workspaces.roles.${role}`)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="CONTRIBUTOR">{$t('workspaces.roles.CONTRIBUTOR')}</Select.Item>
						<Select.Item value="VIEWER">{$t('workspaces.roles.VIEWER')}</Select.Item>
						<Select.Item value="OWNER">{$t('workspaces.roles.OWNER')}</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<Button class="w-full" type="submit" disabled={loading || !email}>
				{#if loading}<LoaderCircle class="mr-1 animate-spin" />{/if}
				{$t('workspaces.sendInvitation')}
			</Button>
		</form>
	</Dialog.Content>
</Dialog.Root>
