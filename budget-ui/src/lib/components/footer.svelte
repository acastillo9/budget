<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from 'svelte-i18n';
</script>

<footer class="mt-4 w-full">
	<p class="text-center text-sm">
		&copy; {new Date().getFullYear()} &middot; Budget App &middot;
		<Button class="pl-0" variant="link" href="https://acastillo.dev" target="_blank"
			>acastillo.dev</Button
		>
	</p>
	<p class="text-center text-sm">
		<Button class="px-1" variant="link" href="/terms">{$t('legal.termsOfService')}</Button>
		&middot;
		<Button class="px-1" variant="link" href="/privacy">{$t('legal.privacyPolicy')}</Button>
	</p>
</footer>
