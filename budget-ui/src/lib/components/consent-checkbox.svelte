<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { t } from 'svelte-i18n';

	let {
		checked = $bindable(false),
		error
	}: {
		checked: boolean;
		error?: string;
	} = $props();

	let labelHtml = $derived(
		$t('legal.consentCheckbox', {
			values: {
				termsLink: `<a href="/terms" target="_blank" class="text-primary underline underline-offset-2 hover:opacity-80">${$t('legal.termsLink')}</a>`,
				privacyLink: `<a href="/privacy" target="_blank" class="text-primary underline underline-offset-2 hover:opacity-80">${$t('legal.privacyLink')}</a>`
			}
		})
	);
</script>

<div class="space-y-1">
	<div class="flex items-start gap-2">
		<Checkbox id="terms-consent" bind:checked class="mt-0.5" aria-invalid={!!error} />
		<label for="terms-consent" class="text-sm leading-snug">
			{@html labelHtml}
		</label>
	</div>
	{#if error}
		<p class="text-destructive text-[0.8rem] font-medium">{error}</p>
	{/if}
</div>
