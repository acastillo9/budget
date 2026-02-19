<script lang="ts">
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';

	let { children } = $props();
</script>

<div class="flex h-screen flex-col">
	<Header></Header>

	<div class="grow">
		{@render children()}
	</div>

	<Footer></Footer>
</div>
