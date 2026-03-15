<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { buttonVariants } from './ui/button/button.svelte';
	import { Check, ChevronDown, Globe } from '@lucide/svelte';
	import { t } from 'svelte-i18n';

	const languages = [
		{ code: 'en', flag: '🇺🇸' },
		{ code: 'es', flag: '🇨🇴' }
	] as const;

	let {
		selectedLanguage = $bindable(),
		onChange
	}: { selectedLanguage: string; onChange: (language: string) => void } = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={buttonVariants({
			variant: 'ghost',
			class: 'h-8 gap-1 px-2',
			size: 'sm'
		})}
	>
		<Globe class="h-4 w-4" />
		<span class="font-medium">{$t(`header.languages.${selectedLanguage}`)}</span>
		<ChevronDown class="h-3 w-3 opacity-50" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="w-40">
		{#each languages as lang (lang.code)}
			<DropdownMenu.Item
				onSelect={() => {
					if (lang.code !== selectedLanguage) {
						selectedLanguage = lang.code;
						onChange(lang.code);
					}
				}}
				class="flex items-center gap-2"
			>
				<span class="text-lg">{lang.flag}</span>
				<span class="flex-1">{$t(`header.languages.${lang.code}`)}</span>
				<Check class={`h-4 w-4 ${selectedLanguage === lang.code ? 'opacity-100' : 'opacity-0'}`} />
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
