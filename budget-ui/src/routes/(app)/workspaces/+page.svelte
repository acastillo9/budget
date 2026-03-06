<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import InviteMemberDialog from '$lib/components/invite-member-dialog.svelte';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';
	import LegalSettingsSection from '$lib/components/legal-settings-section.svelte';
	import { t } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { getUserContext } from '$lib/context';
	import { canManageWorkspace } from '$lib/utils/permissions';
	import type { WorkspaceMember, Invitation, WorkspaceRole } from '$lib/types/workspace.types';
	import type { ConsentStatus, UserConsent } from '$lib/types/terms.types';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import MailIcon from '@lucide/svelte/icons/mail';
	import XIcon from '@lucide/svelte/icons/x';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const userState = getUserContext();
	let isOwner = $derived(canManageWorkspace(userState.workspaceRole!));
	let inviteOpen = $state(false);
	let deleteConfirmOpen = $state(false);
	let memberToDelete = $state<WorkspaceMember | null>(null);
	let revokeConfirmOpen = $state(false);
	let invitationToRevoke = $state<Invitation | null>(null);
	let deleteLoading = $state(false);
	let revokeLoading = $state(false);

	let members = $derived(data.members as WorkspaceMember[]);
	let invitations = $derived(
		(data.invitations as Invitation[]).filter((i) => i.status === 'PENDING')
	);
	let consentStatus = $derived(data.consentStatus as ConsentStatus | null);
	let consentHistory = $derived(data.consentHistory as UserConsent[]);

	async function updateMemberRole(memberId: string, role: WorkspaceRole) {
		try {
			const response = await fetch(`/api/workspaces/members/${memberId}/role`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role })
			});

			if (!response.ok) {
				toast.error($t('workspaces.updateRoleError'));
				return;
			}

			toast.success($t('workspaces.updateRoleSuccess'));
			await invalidateAll();
		} catch {
			toast.error($t('workspaces.updateRoleError'));
		}
	}

	function confirmRemoveMember(member: WorkspaceMember) {
		memberToDelete = member;
		deleteConfirmOpen = true;
	}

	async function removeMember() {
		if (!memberToDelete) return;
		deleteLoading = true;
		try {
			const response = await fetch(`/api/workspaces/members/${memberToDelete.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				toast.error($t('workspaces.removeMemberError'));
				return;
			}

			toast.success($t('workspaces.removeMemberSuccess'));
			await invalidateAll();
		} catch {
			toast.error($t('workspaces.removeMemberError'));
		} finally {
			deleteLoading = false;
		}
	}

	function confirmRevokeInvitation(invitation: Invitation) {
		invitationToRevoke = invitation;
		revokeConfirmOpen = true;
	}

	async function revokeInvitation() {
		if (!invitationToRevoke) return;
		revokeLoading = true;
		try {
			const response = await fetch(`/api/workspaces/invitations/${invitationToRevoke.id}/revoke`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				toast.error($t('workspaces.revokeInviteError'));
				return;
			}

			toast.success($t('workspaces.revokeInviteSuccess'));
			await invalidateAll();
		} catch {
			toast.error($t('workspaces.revokeInviteError'));
		} finally {
			revokeLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('workspaces.title')}</title>
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6">
	<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">{$t('workspaces.title')}</h1>
			<p class="text-muted-foreground text-sm">{$t('workspaces.description')}</p>
		</div>
		{#if isOwner}
			<InviteMemberDialog bind:open={inviteOpen} onInviteSent={() => invalidateAll()} />
		{/if}
	</div>

	<!-- Members -->
	<Card.Root>
		<Card.Header>
			<Card.Title>{$t('workspaces.members')}</Card.Title>
			<Card.Description>{$t('workspaces.membersDescription')}</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				{#each members as member}
					<div class="flex items-center justify-between">
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<div
								class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium"
							>
								{member.user?.name
									?.split(' ')
									.map((w) => w.charAt(0).toUpperCase())
									.join('') ?? '?'}
							</div>
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">
									{member.user?.name ?? member.user?.email}
								</p>
								<p class="text-muted-foreground truncate text-xs">{member.user?.email}</p>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							{#if isOwner && member.role !== 'OWNER'}
								<Select.Root
									type="single"
									value={member.role}
									onValueChange={(value) => updateMemberRole(member.id, value as WorkspaceRole)}
								>
									<Select.Trigger class="w-28 sm:w-36">
										{$t(`workspaces.roles.${member.role}`)}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="CONTRIBUTOR"
											>{$t('workspaces.roles.CONTRIBUTOR')}</Select.Item
										>
										<Select.Item value="VIEWER">{$t('workspaces.roles.VIEWER')}</Select.Item>
									</Select.Content>
								</Select.Root>
								<Button variant="ghost" size="icon" onclick={() => confirmRemoveMember(member)}>
									<TrashIcon class="h-4 w-4" />
								</Button>
							{:else}
								<Badge variant="secondary">{$t(`workspaces.roles.${member.role}`)}</Badge>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Pending Invitations -->
	{#if isOwner && invitations.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>{$t('workspaces.pendingInvitations')}</Card.Title>
				<Card.Description>{$t('workspaces.pendingInvitationsDescription')}</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					{#each invitations as invitation}
						<div class="flex items-center justify-between">
							<div class="flex min-w-0 flex-1 items-center gap-3">
								<div
									class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm"
								>
									<MailIcon class="h-4 w-4" />
								</div>
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{invitation.email}</p>
									<p class="text-muted-foreground text-xs">
										{$t(`workspaces.roles.${invitation.role}`)}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								class="shrink-0"
								onclick={() => confirmRevokeInvitation(invitation)}
							>
								<XIcon class="h-4 w-4" />
							</Button>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Legal & Privacy -->
	<LegalSettingsSection {consentStatus} {consentHistory} />
</div>

<ConfirmationDialog
	open={deleteConfirmOpen}
	onOpenChange={(open) => (deleteConfirmOpen = open)}
	title={$t('workspaces.removeMemberTitle')}
	description={$t('workspaces.removeMemberDescription', {
		values: { name: memberToDelete?.user?.name ?? '' }
	})}
	loading={deleteLoading}
	onConfirm={removeMember}
/>

<ConfirmationDialog
	open={revokeConfirmOpen}
	onOpenChange={(open) => (revokeConfirmOpen = open)}
	title={$t('workspaces.revokeInviteTitle')}
	description={$t('workspaces.revokeInviteDescription', {
		values: { email: invitationToRevoke?.email ?? '' }
	})}
	loading={revokeLoading}
	onConfirm={revokeInvitation}
/>
