<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Form from '$lib/components/ui/form';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { loginFormSchema } from '$lib/schemas/auth.schema';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import type { PageProps } from './$types';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Logo from '$lib/components/logo.svelte';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import { t } from 'svelte-i18n';

	let { data }: PageProps = $props();
	let showPassword = $state(false);

	const form = superForm(data.form, {
		validators: zod4(loginFormSchema)
	});

	const { form: formData, enhance, delayed, isTainted, tainted, allErrors } = form;
</script>

<svelte:head>
	<title>Budget App - {$t('signIn.title')}</title>
</svelte:head>

<div class="flex h-full w-full items-center justify-center p-4">
	<div class="w-full md:w-96">
		<Card.Root>
			<Card.Header class="space-y-1">
				<p class="mb-4 flex justify-center">
					<Logo />
				</p>
				<Card.Title class="text-2xl">{$t('signIn.title')}</Card.Title>
				<Card.Description>{$t('signIn.description')}</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-4">
				<form id="loginForm" method="POST" use:enhance>
					<Form.Field {form} class="mb-4" name="email">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('common.email')}</Form.Label>
								<Input
									type="email"
									placeholder="email@example.com"
									{...props}
									bind:value={$formData.email}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="password" class="mb-4">
						<Form.Control>
							{#snippet children({ props })}
								<div class="flex items-center justify-between">
									<Form.Label>{$t('common.password')}</Form.Label>
									<Button variant="link" class="h-auto p-0" href="/forgot-password"
										>{$t('signIn.forgotPassword')}</Button
									>
								</div>
								<div class="relative">
									<Input
										type={showPassword ? 'text' : 'password'}
										{...props}
										bind:value={$formData.password}
									/>
									<Button
										class="absolute top-0 right-0 border-none bg-transparent hover:bg-transparent"
										variant="outline"
										size="icon"
										onclick={() => (showPassword = !showPassword)}
									>
										{#if showPassword}
											<EyeOff />
										{:else}
											<Eye />
										{/if}
									</Button>
								</div>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="rememberMe">
						<Form.Control>
							{#snippet children({ props })}
								<div class="flex items-center gap-2">
									<Checkbox {...props} />
									<Form.Label>{$t('signIn.rememberMe')}</Form.Label>
								</div>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</form>
			</Card.Content>
			<Card.Footer class="flex-col">
				<Button
					class="mb-4 w-full"
					type="submit"
					form="loginForm"
					disabled={$delayed ||
						!isTainted($tainted?.email) ||
						!isTainted($tainted?.password) ||
						!!$allErrors.length}
				>
					{#if $delayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
					{$t('signIn.login')}
				</Button>
				<Button variant="outline" class="mb-4 w-full" href="/google"
					>{$t('signIn.loginWithGoogle')}</Button
				>
				<div class="flex items-center">
					<p class="text-muted-foreground text-sm">{$t('signIn.dontHaveAccount')}</p>
					<Button class="ml-1 p-0" variant="link" href="/signup">{$t('signIn.signUp')}</Button>
				</div>
			</Card.Footer>
		</Card.Root>
	</div>
</div>
