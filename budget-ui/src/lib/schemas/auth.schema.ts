import { $t } from '$lib/i18n';
import { z } from 'zod/v4';

export const signupFormSchema = z.object({
	name: z
		.string()
		.min(1, { error: () => $t('signUp.validation.nameIsRequired') })
		.max(200),
	email: z.string().email()
});

export type SignupFormSchema = z.infer<typeof signupFormSchema>;

export const checkEmailSchema = signupFormSchema.pick({ email: true });

export type CheckEmailSchema = z.infer<typeof checkEmailSchema>;

export const activationSchema = z.object({
	activationCode: z
		.string()
		.min(6, { error: () => $t('signUp.validation.activationCodeMinLength') })
		.max(6)
});

export type ActivationSchema = z.infer<typeof activationSchema>;

export const activationWithEmailSchema = z.object({
	email: z.string().email(),
	activationCode: z
		.string()
		.min(6, { error: () => $t('signUp.validation.activationCodeMinLength') })
		.max(6)
});

export type ActivationWithEmailSchema = z.infer<typeof activationWithEmailSchema>;

export const passwordSchema = z.object({
	password: z
		.string()
		.min(8, { error: () => $t('signUp.validation.passwordMinLength') })
		.max(250)
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).*$/, {
			error: () => $t('signUp.validation.passwordMustContainUppercase')
		})
});

export type PasswordSchema = z.infer<typeof passwordSchema>;

export const passwordWithTokenSchema = z.object({
	accessToken: z.string(),
	password: passwordSchema.shape.password
});

export type PasswordWithTokenSchema = z.infer<typeof passwordWithTokenSchema>;

export const loginFormSchema = z.object({
	email: z.string().email(),
	password: z.string(),
	rememberMe: z.boolean()
});

export type LoginFormSchema = z.infer<typeof loginFormSchema>;

export const forgotPasswordFormSchema = z.object({
	email: z.string().email()
});

export type ForgotPasswordFormSchema = z.infer<typeof forgotPasswordFormSchema>;
