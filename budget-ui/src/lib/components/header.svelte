<script lang="ts">
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from 'svelte-i18n';
</script>

<header class="flex h-20 w-full items-center p-4 backdrop-blur-sm">
	<div class="flex w-full items-center justify-between">
		<a href="/">
			<h1 class="font-cursive text-4xl">Budget</h1>
		</a>
		<Button onclick={toggleMode} variant="outline" size="icon">
			<Sun class="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
			<Moon
				class="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
			/>
			<span class="sr-only">{$t('header.toggleTheme')}</span>
		</Button>
	</div>
</header>
