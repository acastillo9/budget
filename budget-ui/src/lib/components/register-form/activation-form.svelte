<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import * as InputOTP from '$lib/components/ui/input-otp/index.js';
	import { Button } from '$lib/components/ui/button';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { REGEXP_ONLY_DIGITS } from 'bits-ui';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Countdown from '../countdown.svelte';
	import type { CountdownData } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { t } from 'svelte-i18n';
	import { activationSchema } from '$lib/schemas/auth.schema';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';

	let {
		data,
		email,
		activationCodeResendAt,
		goToNextStep
	}: {
		data: SuperValidated<Infer<typeof activationSchema>>;
		email: string;
		activationCodeResendAt: Date | string;
		goToNextStep: (accessToken: string) => void;
	} = $props();
	// svelte-ignore state_referenced_locally
	let remainingTime = $state(activationCodeResendAt);
	let resendingActivationCode = $state(false);

	// svelte-ignore state_referenced_locally
	const form = superForm(data, {
		validators: zod4(activationSchema),
		onSubmit({ formData, cancel }) {
			if (!email) {
				cancel();
			}
			formData.set('email', email);
		},
		onUpdate({ form, result }) {
			if (form.valid && result.data.step === 3 && result.data.accessToken) {
				goToNextStep(result.data.accessToken);
			}
		}
	});

	const { form: formData, isTainted, tainted, allErrors, delayed, enhance } = form;

	async function resendActivationCode() {
		resendingActivationCode = true;
		try {
			const response = await fetch('/api/auth/resend-activation-code', {
				method: 'POST',
				body: JSON.stringify({ email })
			});

			const { activationCodeResendAt } = await response.json();
			remainingTime = new Date(activationCodeResendAt);
			toast.success($t('signUp.activationCodeSent'));
		} catch {
			toast.error($t('signUp.activationCodeSentError'));
		} finally {
			resendingActivationCode = false;
		}
	}
</script>

<form method="POST" action="?/activate" use:enhance>
	<Form.Field {form} name="activationCode">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('signUp.activationCode')}</Form.Label>
				<InputOTP.Root
					minlength={6}
					maxlength={6}
					{...props}
					bind:value={$formData.activationCode}
					pattern={REGEXP_ONLY_DIGITS}
				>
					{#snippet children({ cells })}
						<InputOTP.Group>
							{#each cells as cell}
								<InputOTP.Slot {cell} />
							{/each}
						</InputOTP.Group>
					{/snippet}
				</InputOTP.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Countdown from={remainingTime}>
		{#snippet remaining(data: CountdownData)}
			<div class="leading-none">
				<Button
					class={[
						'h-auto p-0',
						(resendingActivationCode || !data.done) && 'text-muted pointer-events-none'
					]}
					variant="link"
					onclick={resendActivationCode}>{$t('signUp.resendActivationCode')}</Button
				>
				{#if !data.done}
					<small class="text-muted">
						{$t('signUp.in')}
						{#if data.hours}
							<span>{data.hours} {$t('signUp.hours')}</span>
						{/if}
						{#if data.minutes}
							<span>{data.minutes} {$t('signUp.minutes')}</span>
						{/if}
						<span>{data.seconds} {$t('signUp.seconds')}</span>
					</small>
				{/if}
			</div>
		{/snippet}
	</Countdown>

	<Button
		class="mt-5 w-full"
		type="submit"
		disabled={$delayed || !isTainted($tainted?.activationCode) || !!$allErrors.length}
	>
		{#if $delayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
		{$t('common.next')}
	</Button>
</form>
