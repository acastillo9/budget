<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
	<h1 class="text-4xl font-bold">{page.status}</h1>
	<p class="text-muted-foreground text-lg">{page.error?.message ?? 'Something went wrong'}</p>
	<a
		href="/"
		class="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
	>
		Go home
	</a>
</div>
