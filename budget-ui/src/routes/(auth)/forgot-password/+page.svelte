<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import type { PageProps } from './$types';
	import Logo from '$lib/components/logo.svelte';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { forgotPasswordFormSchema } from '$lib/schemas/auth.schema';
	import { t } from 'svelte-i18n';

	let { data }: PageProps = $props();

	const form = superForm(data.form, {
		validators: zod4(forgotPasswordFormSchema)
	});

	const { form: formData, enhance, delayed, isTainted, tainted, allErrors } = form;
</script>

<svelte:head>
	<title>Budget App - {$t('forgotPassword.title')}</title>
</svelte:head>

<div class="flex h-full items-center justify-center p-4">
	<div class="w-full md:w-96">
		<Card.Root>
			<Card.Header class="space-y-1">
				<p class="mb-4 flex justify-center">
					<Logo />
				</p>
				<Card.Title class="text-2xl">{$t('forgotPassword.title')}</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-4">
				<form id="forgotPasswordForm" method="POST" use:enhance>
					<Form.Field {form} name="email">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('common.email')}</Form.Label>
								<Input
									type="email"
									placeholder="email@example.com"
									{...props}
									bind:value={$formData.email}
								/>
								<Form.Description>{$t('forgotPassword.description')}</Form.Description>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</form>
			</Card.Content>
			<Card.Footer class="flex-col">
				<Button
					class="w-full"
					type="submit"
					form="forgotPasswordForm"
					disabled={$delayed || !isTainted($tainted?.email) || !!$allErrors.length}
				>
					{#if $delayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
					{$t('common.send')}
				</Button>
				<div class="flex items-center">
					<p class="text-muted-foreground text-sm">{$t('common.goTo')}</p>
					<Button class="px-2" variant="link" href="/signin">{$t('common.signIn')}</Button>
				</div>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
