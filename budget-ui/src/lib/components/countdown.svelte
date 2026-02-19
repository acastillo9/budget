<script lang="ts">
	import dayjs from 'dayjs';
	import duration from 'dayjs/plugin/duration.js';
	import type { Snippet } from 'svelte';
	import type { CountdownData } from '$lib/types';

	dayjs.extend(duration);

	let { from, remaining }: { from: Date | string; remaining: Snippet<[CountdownData]> } = $props();

	let data = $state({
		hours: 0,
		minutes: 0,
		seconds: 0,
		done: false
	});

	$effect(() => {
		const target = dayjs(from);
		const local = dayjs();
		let diff = target.valueOf() - local.valueOf();
		let r = dayjs.duration(diff);
		data = {
			hours: r.hours(),
			minutes: r.minutes(),
			seconds: r.seconds(),
			done: false
		};
		diff -= 1000;

		const timer = setInterval(function () {
			if (diff > 0) {
				r = dayjs.duration(diff);
				data = {
					hours: r.hours(),
					minutes: r.minutes(),
					seconds: r.seconds(),
					done: false
				};
				diff -= 1000;
			} else {
				data = {
					hours: 0,
					minutes: 0,
					seconds: 0,
					done: true
				};
				clearInterval(timer);
			}
		}, 1000);
	});
</script>

{@render remaining(data)}
