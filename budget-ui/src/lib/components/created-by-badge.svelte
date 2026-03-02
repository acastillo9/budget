<script lang="ts">
	import { t } from 'svelte-i18n';
	import { getUserContext } from '$lib/context';
	import Badge from './ui/badge/badge.svelte';

	let { userName }: { userName: string } = $props();

	const userState = getUserContext();
</script>

{#if userState.hasCollaborators}
	<Badge variant="outline">
		{$t('common.createdBy', { values: { name: userName } })}
	</Badge>
{/if}
