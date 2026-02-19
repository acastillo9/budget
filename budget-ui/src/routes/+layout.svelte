<script lang="ts">
	import '../app.css';
	import '$lib/i18n';
	import { ModeWatcher } from 'mode-watcher';
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';

	let { children } = $props();

	// Show Toasts messages from flash store
	const flash = getFlash(page);

	$effect(() => {
		if (!$flash) return;

		toast[$flash.type]($flash.message);

		// Clear the flash message to avoid double-toasting.
		$flash = undefined;
	});
</script>

<Toaster />

<ModeWatcher />

{@render children()}
