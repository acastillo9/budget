<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { debounce } from 'throttle-debounce';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { t } from 'svelte-i18n';
	import { signupFormSchema } from '$lib/schemas/auth.schema';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';

	let {
		data,
		goToNextStep
	}: {
		data: SuperValidated<Infer<typeof signupFormSchema>>;
		goToNextStep: (email: string, activationCodeResendAt: Date) => void;
	} = $props();

	const form = superForm(data, {
		validationMethod: 'oninput',
		validators: zod4(signupFormSchema),
		onChange(event) {
			if (event.target && event.path !== 'email') {
				checkEmailError();
			}
		},
		onUpdate({ form, result }) {
			if (form.valid && result.data.step === 2) {
				goToNextStep(result.data.email, result.data.activationCodeResendAt);
			}
		}
	});
	const { form: formData, enhance, errors, isTainted, tainted, allErrors, delayed } = form;

	const checkEmailForm = superForm(
		{ email: '' },
		{
			invalidateAll: false,
			applyAction: false,
			multipleSubmits: 'abort',
			onSubmit({ cancel }) {
				if (!$formData.email) cancel();
			},
			onUpdate({ form }) {
				$errors.email = form.errors.email;
			}
		}
	);
	const {
		submit: checkEmailFormSubmit,
		enhance: checkEmailFormEnhance,
		errors: checkEmailFormErrors
	} = checkEmailForm;
	const checkEmail = debounce(200, checkEmailFormSubmit);

	function checkEmailError() {
		if ($checkEmailFormErrors.email?.length) {
			$errors.email = $errors.email?.length ? $errors.email : $checkEmailFormErrors.email;
		}
	}
</script>

<form id="signupForm" method="POST" action="?/post" use:enhance>
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('common.name')}</Form.Label>
				<Input placeholder="John Doe" {...props} bind:value={$formData.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="email">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('common.email')}</Form.Label>
				<Input
					form="check"
					type="email"
					placeholder="email@example.com"
					{...props}
					bind:value={$formData.email}
					oninput={checkEmail}
				/>
				<Input type="hidden" name="email" value={$formData.email} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<Button
		class="mt-5 w-full"
		type="submit"
		form="signupForm"
		disabled={$delayed ||
			!isTainted($tainted?.name) ||
			!isTainted($tainted?.email) ||
			!!$allErrors.length}
	>
		{#if $delayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
		{$t('common.next')}
	</Button>
</form>

<form id="check" method="POST" action="?/check" use:checkEmailFormEnhance></form>
