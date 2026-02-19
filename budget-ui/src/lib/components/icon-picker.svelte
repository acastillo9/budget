<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import Button from './ui/button/button.svelte';
	import { t } from 'svelte-i18n';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { iconMap } from '$lib/utils/icons';

	let { icon = $bindable() } = $props();

	let searchTerm = $state('');
	let selectedCategory = $state<string | null>(null);

	const iconCategories = {
		foodDining: ['ShoppingCart', 'UtensilsCrossed', 'Coffee', 'Pizza'],
		transportation: ['Car', 'Bus', 'Plane', 'Fuel', 'Bike', 'Train'],
		shopping: ['ShoppingBag', 'Shirt'],
		entertainment: ['Film', 'Music', 'Gamepad2', 'Camera', 'Headphones'],
		utilitiesBills: ['Zap', 'Wifi', 'Phone', 'Smartphone', 'Monitor'],
		healthFitness: ['Heart', 'Pill', 'Stethoscope', 'Dumbbell'],
		workIncome: [
			'Briefcase',
			'Laptop',
			'DollarSign',
			'PiggyBank',
			'Banknote',
			'CreditCard',
			'TrendingUp',
			'TrendingDown'
		],
		homePersonal: ['Home', 'Book', 'Scissors', 'Wrench', 'Gift', 'MapPin']
	};

	const getFilteredIcons = () => {
		let iconsToShow: string[] = [];

		if (selectedCategory) {
			iconsToShow = iconCategories[selectedCategory as keyof typeof iconCategories] || [];
		} else {
			iconsToShow = Object.keys(iconMap);
		}

		if (searchTerm) {
			iconsToShow = iconsToShow.filter((iconName) =>
				iconName.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		return iconsToShow;
	};
</script>

<div class="space-y-4">
	<Input placeholder={$t('categories.searchIcons')} bind:value={searchTerm} class="h-8" />

	<div class="flex flex-wrap gap-1">
		<Button
			variant={selectedCategory === null ? 'default' : 'outline'}
			size="sm"
			class="h-6 text-xs"
			onclick={() => (selectedCategory = null)}
		>
			All
		</Button>

		{#each Object.keys(iconCategories) as category}
			<Button
				variant={selectedCategory === category ? 'default' : 'outline'}
				size="sm"
				class="h-6 text-xs"
				onclick={() => (selectedCategory = category)}
			>
				{$t(`categories.iconCategories.${category}`)}
			</Button>
		{/each}
	</div>

	<ScrollArea class="h-48">
		<div class="grid grid-cols-6 gap-2">
			{#each getFilteredIcons() as iconName}
				{@const Icon = iconMap[iconName as keyof typeof iconMap]}
				<Button
					variant={icon === iconName ? 'default' : 'outline'}
					size="icon"
					class="h-10 w-10"
					title={$t(`categories.icons.${iconName}`)}
					onclick={() => (icon = iconName)}
				>
					<Icon class="h-5 w-5" />
				</Button>
			{/each}
		</div>
	</ScrollArea>
</div>
