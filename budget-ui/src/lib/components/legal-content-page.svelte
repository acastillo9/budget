<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { t } from 'svelte-i18n';
	import { marked } from 'marked';
	import dayjs from 'dayjs';
	import localizedFormat from 'dayjs/plugin/localizedFormat';

	dayjs.extend(localizedFormat);

	let {
		title,
		content,
		version,
		lastUpdated
	}: {
		title: string;
		content: string;
		version: string;
		lastUpdated: string;
	} = $props();

	let formattedDate = $derived(dayjs(lastUpdated).format('LL'));
	let htmlContent = $derived(marked.parse(content) as string);
</script>

<div class="flex justify-center p-4">
	<div class="w-full max-w-3xl">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-2xl">{title}</Card.Title>
				<Card.Description>
					{$t('legal.version', { values: { version } })} &middot;
					{$t('legal.lastUpdated', { values: { date: formattedDate } })}
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="prose dark:prose-invert max-w-none">
					{@html htmlContent}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
