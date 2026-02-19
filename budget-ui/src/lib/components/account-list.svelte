<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { t } from 'svelte-i18n';
	import type { Account } from '$lib/types/account.types';
	import Wallet from '@lucide/svelte/icons/wallet';
	import { Badge } from '$lib/components/ui/badge';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import { formatCurrencyWithSymbol, getCurrencyByCode } from '$lib/utils/currency';
	import Button from './ui/button/button.svelte';
	import { Component, Edit, House, Landmark, LineChart, PiggyBank, Trash2 } from '@lucide/svelte';
	import { getUserContext } from '$lib/context';
	import type { Rates } from '$lib/types';

	interface Props {
		accounts: Account[];
		rates: Rates;
		headless?: boolean;
		editable?: boolean;
		onEdit?: (account: Account) => void;
		onDelete?: (account: Account) => void;
	}

	let {
		accounts,
		rates,
		headless = false,
		editable = false,
		onEdit = () => {},
		onDelete = () => {}
	}: Props = $props();

	const accountTypeIcons: { [accountType: string]: typeof Component } = {
		CHECKING: Building2,
		CREDIT_CARD: CreditCard,
		CASH: Wallet,
		SAVINGS: PiggyBank,
		INVESTMENT: LineChart,
		LOAN: Landmark,
		MORTGAGE: House
	};

	const userState = getUserContext();
</script>

<Card.Root class="mb-4">
	{#if !headless}
		<Card.Header>
			<Card.Title>{$t('accounts.yourAccounts')}</Card.Title>
			<Card.Description>{$t('accounts.yourAccountsDescription')}</Card.Description>
		</Card.Header>
	{/if}
	<Card.Content>
		{#if accounts.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<Wallet class="mx-auto mb-4 h-12 w-12 opacity-50" />
				<p>{$t('accounts.noAccounts')}</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each accounts as account (account.id)}
					{@const Icon = accountTypeIcons[account.accountType.name]}
					{@const currency = getCurrencyByCode(account.currencyCode)}
					<div class="flex items-center justify-between gap-4 rounded-lg border p-4">
						<div class="flex w-full items-center gap-4">
							<div class="bg-muted rounded-lg p-2">
								<Icon class="h-4 w-4" />
							</div>
							<div
								class="flex w-full flex-col items-start gap-2 md:flex-row md:items-center md:justify-between"
							>
								<div class="flex flex-col gap-1">
									<p class="font-medium">{account.name}</p>
									<div class="flex flex-wrap gap-1">
										<Badge
											variant={account.accountType.name === 'CREDIT' ? 'destructive' : 'secondary'}
										>
											{$t(`accounts.accountTypes.${account.accountType.name}`)}
										</Badge>
										<Badge variant="outline">
											{`${currency?.flag} ${currency?.code}`}
										</Badge>
									</div>
								</div>
								<div class="flex flex-col md:text-right">
									<p class="font-semibold">
										{#if account.currencyCode !== userState.user?.currencyCode}
											{account.currencyCode}
										{/if}
										{formatCurrencyWithSymbol(account.balance, account.currencyCode)}
									</p>
									{#if account.currencyCode !== userState.user?.currencyCode}
										<p class="text-muted-foreground mt-1 text-xs break-words">
											≈ {userState.user?.currencyCode || 'USD'}
											{formatCurrencyWithSymbol(
												account.balance / rates[account.currencyCode].rate,
												userState.user?.currencyCode || 'USD'
											)}
										</p>
									{/if}
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if editable}
								<div class="flex items-center gap-2">
									<Button variant="ghost" size="icon" onclick={() => onEdit(account)}>
										<Edit class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => onDelete(account)}
										class="text-destructive hover:text-destructive"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
