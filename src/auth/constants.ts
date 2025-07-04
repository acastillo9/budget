export const JWT_SECRET = 'JWT_SECRET';

export const JWT_EXPIRATION_TIME = '15m';

export const JWT_REFRESH_SECRET = 'JWT_REFRESH_SECRET';

export const JWT_REFRESH_EXPIRATION_TIME = '2h';

export const JWT_REFRESH_LONG_LIVED_EXPIRATION_TIME = '30d';

export const JWT_SET_PASSWORD_SECRET = 'JWT_SET_PASSWORD_SECRET';

export const JWT_SET_PASSWORD_EXPIRATION_TIME = '30m';

export const PASSWORD_BYCRYPT_SALT = 10;

export const PASSWORD_RESET_URL = 'PASSWORD_RESET_URL';

export const PASSWORD_RESET_LIMIT_MAX = 5;

export const PASSWORD_RESET_TOKEN_BYCRYPT_SALT = PASSWORD_BYCRYPT_SALT;

export const ACTIVATION_CODE_BYCRYPT_SALT = PASSWORD_BYCRYPT_SALT;

export const ACTIVATION_CODE_RESEND_LIMIT_TIME = 1.5 * 60 * 1000; // 1 minute 30 seconds

export const ACTIVATION_CODE_RESEND_LIMIT_MAX = 3; // Max 3 resends per day

export const ACTIVATION_CODE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

export const ACTIVATION_CODE_RESEND_LIMIT_TIME_DAILY = 24 * 60 * 60 * 1000; // 24 hours

export const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID';

export const GOOGLE_CLIENT_SECRET = 'GOOGLE_CLIENT_SECRET';

export const GOOGLE_CALLBACK_URL = 'GOOGLE_CALLBACK_URL';
