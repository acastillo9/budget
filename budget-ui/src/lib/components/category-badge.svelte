<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { iconMap } from '$lib/utils/icons';
	import type { Category } from '$lib/types/category.types';

	let { category, size = 'default' }: { category: Category; size?: 'default' | 'sm' } = $props();

	let isIncome = $derived(category.categoryType === 'INCOME');
	let Icon = $derived(iconMap[category.icon as keyof typeof iconMap]);
	let ParentIcon = $derived(
		category.parent ? iconMap[category.parent.icon as keyof typeof iconMap] : null
	);
	let colorClass = $derived(
		isIncome
			? 'bg-green-100 text-green-800 hover:bg-green-200'
			: 'bg-red-100 text-red-800 hover:bg-red-200'
	);
</script>

{#if category.parent && ParentIcon}
	<Badge variant="outline" class={`${colorClass} ${size === 'sm' ? 'px-1 py-0 text-xs' : ''}`}>
		<ParentIcon class={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
		{category.parent.name}
	</Badge>
{/if}
<Badge variant="outline" class={`${colorClass} ${size === 'sm' ? 'px-1 py-0 text-xs' : ''}`}>
	<Icon class={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
	{category.name}
</Badge>
