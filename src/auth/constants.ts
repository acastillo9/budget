export const JWT_SECRET = 'JWT_SECRET';

export const JWT_EXPIRATION_TIME = 'JWT_EXPIRATION_TIME';

export const PASSWORD_BYCRYPT_SALT = 'PASSWORD_BYCRYPT_SALT';

export const ACTIVATION_CODE_BYCRYPT_SALT = PASSWORD_BYCRYPT_SALT;

export const ACTIVATION_CODE_RESEND_LIMIT_TIME = 1.5 * 60 * 1000; // 1 minute 30 seconds

export const ACTIVATION_CODE_RESEND_LIMIT_MAX = 3; // Max 3 resends per day

export const ACTIVATION_CODE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

export const ACTIVATION_CODE_RESEND_LIMIT_TIME_DAILY = 24 * 60 * 60 * 1000; // 24 hours

export const PASSWORD_RESET_JWT_EXPIRATION_TIME =
  'PASSWORD_RESET_JWT_EXPIRATION_TIME';

export const PASSWORD_RESET_URL = 'PASSWORD_RESET_URL';

export const PASSWORD_RESET_LIMIT_MAX = 5;

export const REMEMBER_ME_TOKEN_EXPIRATION_TIME = 30 * 24 * 60 * 60 * 1000; // 30 days

export const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID';

export const GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET';

export const GOOGLE_CALLBACK_URL = 'GOOGLE_CALLBACK_URL';
