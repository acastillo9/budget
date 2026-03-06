<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { t } from 'svelte-i18n';
	import dayjs from 'dayjs';
	import localizedFormat from 'dayjs/plugin/localizedFormat';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import type { ConsentStatus, UserConsent } from '$lib/types/terms.types';

	dayjs.extend(localizedFormat);

	let {
		consentStatus,
		consentHistory
	}: {
		consentStatus: ConsentStatus | null;
		consentHistory: UserConsent[];
	} = $props();

	function formatDate(date: string) {
		return dayjs(date).format('LL');
	}

	function getDocumentLabel(type: string) {
		return type === 'TOS' ? $t('legal.termsOfService') : $t('legal.privacyPolicy');
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center gap-2">
			<ShieldCheckIcon class="h-5 w-5" />
			<div>
				<Card.Title>{$t('legal.settings.title')}</Card.Title>
				<Card.Description>{$t('legal.settings.description')}</Card.Description>
			</div>
		</div>
	</Card.Header>
	<Card.Content class="space-y-6">
		<!-- Quick Links -->
		<div class="flex flex-wrap gap-2">
			<Button variant="outline" size="sm" href="/terms" target="_blank">
				<FileTextIcon class="mr-1.5 h-4 w-4" />
				{$t('legal.settings.viewTerms')}
			</Button>
			<Button variant="outline" size="sm" href="/privacy" target="_blank">
				<FileTextIcon class="mr-1.5 h-4 w-4" />
				{$t('legal.settings.viewPrivacy')}
			</Button>
		</div>

		<!-- Consent Status -->
		{#if consentStatus}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<h4 class="text-sm font-medium">{$t('legal.settings.consentStatus')}</h4>
					{#if consentStatus.allAccepted}
						<Badge variant="secondary">{$t('legal.settings.upToDate')}</Badge>
					{:else}
						<Badge variant="destructive">{$t('legal.settings.actionRequired')}</Badge>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Consent History -->
		<div class="space-y-2">
			<h4 class="text-sm font-medium">{$t('legal.settings.consentHistory')}</h4>
			{#if consentHistory.length === 0}
				<p class="text-muted-foreground text-sm">{$t('legal.settings.noHistory')}</p>
			{:else}
				<div class="space-y-3">
					{#each consentHistory as consent}
						<div class="bg-muted/50 flex items-center justify-between rounded-lg border p-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">
									{getDocumentLabel(consent.termsVersion.type)}
								</p>
								<p class="text-muted-foreground text-xs">
									{$t('legal.settings.versionColumn')}: {consent.termsVersion.version}
								</p>
							</div>
							<div class="text-right">
								<p class="text-muted-foreground text-xs">
									{$t('legal.settings.acceptedOn', {
										values: { date: formatDate(consent.acceptedAt) }
									})}
								</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
