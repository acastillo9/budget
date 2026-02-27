<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { Workspace } from '$lib/types/workspace.types';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import { t } from 'svelte-i18n';
	import { goto, invalidateAll } from '$app/navigation';

	interface Props {
		workspaces: Workspace[];
		currentWorkspace: Workspace | undefined;
	}

	let { workspaces, currentWorkspace }: Props = $props();

	const sidebar = useSidebar();

	async function switchWorkspace(workspace: Workspace) {
		if (workspace.id === currentWorkspace?.id) return;

		document.cookie = `X-Workspace-Id=${workspace.id}; path=/; SameSite=Strict`;
		await invalidateAll();
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}
					>
						<div
							class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
						>
							<WalletIcon class="size-4" />
						</div>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-semibold">{currentWorkspace?.name ?? 'Budget'}</span>
							<span class="text-muted-foreground truncate text-xs"
								>{$t('workspaces.workspace')}</span
							>
						</div>
						<ChevronsUpDownIcon class="ml-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="start"
				sideOffset={4}
			>
				<DropdownMenu.Label>{$t('workspaces.workspaces')}</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each workspaces as workspace}
					<DropdownMenu.Item onSelect={() => switchWorkspace(workspace)}>
						<div class="flex w-full items-center gap-2">
							<WalletIcon class="size-4" />
							<span class="flex-1 truncate">{workspace.name}</span>
							{#if workspace.id === currentWorkspace?.id}
								<CheckIcon class="size-4" />
							{/if}
						</div>
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={() => goto('/workspaces')}>
					<SettingsIcon class="mr-2 size-4" />
					{$t('workspaces.settings')}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
