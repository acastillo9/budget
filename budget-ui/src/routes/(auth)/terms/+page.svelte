<script lang="ts">
	import LegalContentPage from '$lib/components/legal-content-page.svelte';
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Budget App - {$t('legal.termsOfService')}</title>
</svelte:head>

{#if data.error || !data.terms}
	<div class="flex h-full items-center justify-center p-4">
		<p class="text-muted-foreground text-sm">{$t('legal.loadError')}</p>
	</div>
{:else}
	<LegalContentPage
		title={data.terms.title}
		content={data.terms.content}
		version={data.terms.version}
		lastUpdated={data.terms.publishedAt}
	/>
{/if}
