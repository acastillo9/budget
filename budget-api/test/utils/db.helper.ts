import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Clear all documents from every collection in the test database,
 * except `accounttypes` which is managed by migrations.
 */
export async function clearDatabase(app: INestApplication): Promise<void> {
  const connection = app.get<Connection>(getConnectionToken());
  const collections = connection.collections;
  for (const key in collections) {
    if (key === 'accounttypes') continue;
    await collections[key].deleteMany({});
  }
}

/**
 * Create a fully ACTIVE user with a hashed password, ready for login tests.
 * Seeds User, AuthenticationProvider, Workspace, and WorkspaceMember documents.
 */
export async function createActiveUser(
  app: INestApplication,
  data: {
    email: string;
    password: string;
    name?: string;
    currencyCode?: string;
  },
): Promise<{ userId: string; authProviderId: string; workspaceId: string }> {
  const connection = app.get<Connection>(getConnectionToken());
  const hashedPassword = await hash(data.password, BCRYPT_SALT_ROUNDS);

  const UserModel = connection.model('User');
  const user = await UserModel.create({
    name: data.name ?? 'Test User',
    email: data.email,
    currencyCode: data.currencyCode ?? 'USD',
  });

  const AuthProviderModel = connection.model('AuthenticationProvider');
  const authProvider = await AuthProviderModel.create({
    providerUserId: data.email,
    providerType: 'EMAIL',
    status: 'ACTIVE',
    password: hashedPassword,
    user: user._id,
  });

  // Create a default workspace and OWNER membership
  const WorkspaceModel = connection.model('Workspace');
  const workspace = await WorkspaceModel.create({
    owner: user._id,
  });

  const WorkspaceMemberModel = connection.model('WorkspaceMember');
  await WorkspaceMemberModel.create({
    workspace: workspace._id,
    user: user._id,
    role: 'OWNER',
  });

  return {
    userId: user._id.toString(),
    authProviderId: authProvider._id.toString(),
    workspaceId: workspace._id.toString(),
  };
}

/**
 * Create an UNVERIFIED user with a known activation code, ready for
 * verify-email and resend-activation-code tests.
 */
export async function createUnverifiedUser(
  app: INestApplication,
  data: {
    email: string;
    activationCode: string;
    name?: string;
    activationCodeResendAt?: Date;
  },
): Promise<{ userId: string; authProviderId: string }> {
  const connection = app.get<Connection>(getConnectionToken());
  const hashedCode = await hash(data.activationCode, BCRYPT_SALT_ROUNDS);

  const UserModel = connection.model('User');
  const user = await UserModel.create({
    name: data.name ?? 'Test User',
    email: data.email,
    currencyCode: 'USD',
  });

  const AuthProviderModel = connection.model('AuthenticationProvider');
  const authProvider = await AuthProviderModel.create({
    providerUserId: data.email,
    providerType: 'EMAIL',
    status: 'UNVERIFIED',
    activationCode: hashedCode,
    activationCodeExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    activationCodeResendAt: data.activationCodeResendAt ?? new Date(0),
    activationCodeRetries: 0,
    user: user._id,
  });

  return {
    userId: user._id.toString(),
    authProviderId: authProvider._id.toString(),
  };
}

/**
 * Create a VERIFIED_NO_PASSWORD user with a valid set-password JWT token,
 * ready for set-password and verify-set-password-token tests.
 */
export async function createVerifiedNoPasswordUser(
  app: INestApplication,
  data: {
    email: string;
    name?: string;
  },
): Promise<{
  userId: string;
  authProviderId: string;
  setPasswordToken: string;
}> {
  const connection = app.get<Connection>(getConnectionToken());
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);

  const UserModel = connection.model('User');
  const user = await UserModel.create({
    name: data.name ?? 'Test User',
    email: data.email,
    currencyCode: 'USD',
  });

  const AuthProviderModel = connection.model('AuthenticationProvider');
  const authProvider = await AuthProviderModel.create({
    providerUserId: data.email,
    providerType: 'EMAIL',
    status: 'VERIFIED_NO_PASSWORD',
    user: user._id,
  });

  // Generate the set-password JWT and store its hash
  const setPasswordToken = jwtService.sign(
    { sub: authProvider._id.toString() },
    {
      secret: configService.get('JWT_SET_PASSWORD_SECRET'),
      expiresIn: '30m',
    },
  );
  const hashedToken = await hash(setPasswordToken, BCRYPT_SALT_ROUNDS);

  await AuthProviderModel.findByIdAndUpdate(authProvider._id, {
    setPasswordToken: hashedToken,
    setPasswordExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    setPasswordRetries: 0,
  });

  return {
    userId: user._id.toString(),
    authProviderId: authProvider._id.toString(),
    setPasswordToken,
  };
}

// ──────────────────────────────────────────────────
// Financial module seed helpers
// ──────────────────────────────────────────────────

/**
 * Generate a valid MongoDB ObjectId that does not exist in the database.
 */
export function nonExistentId(): string {
  return new Types.ObjectId().toString();
}

/**
 * Look up an existing AccountType by name (seeded by migrations).
 * Throws if the account type is not found.
 */
export async function getAccountTypeId(
  app: INestApplication,
  name: string,
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('AccountType');
  const doc = await Model.findOne({ name });
  if (!doc) {
    throw new Error(
      `AccountType "${name}" not found. Ensure migrations have been run.`,
    );
  }
  return doc._id.toString();
}

/**
 * Seed a Category document belonging to a user.
 */
export async function seedCategory(
  app: INestApplication,
  data: {
    name: string;
    icon: string;
    categoryType: string;
    user: string;
    parent?: string;
    workspace?: string;
  },
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Category');
  const doc = await Model.create(data);
  return doc._id.toString();
}

/**
 * Seed an Account document belonging to a user.
 */
export async function seedAccount(
  app: INestApplication,
  data: {
    name: string;
    balance: number;
    currencyCode: string;
    accountType: string;
    user: string;
    workspace?: string;
  },
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Account');
  const doc = await Model.create(data);
  return doc._id.toString();
}

/**
 * Seed a Bill document belonging to a user.
 */
export async function seedBill(
  app: INestApplication,
  data: {
    name: string;
    amount: number;
    dueDate: Date;
    frequency: string;
    account: string;
    category: string;
    user: string;
    endDate?: Date;
    workspace?: string;
  },
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Bill');
  const doc = await Model.create(data);
  return doc._id.toString();
}

/**
 * Seed a Budget document belonging to a user.
 */
export async function seedBudget(
  app: INestApplication,
  data: {
    name?: string;
    amount: number;
    period: string;
    startDate: Date;
    endDate?: Date;
    categories: string[];
    user: string;
    workspace?: string;
  },
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Budget');
  const doc = await Model.create(data);
  return doc._id.toString();
}

/**
 * Seed a Transaction document belonging to a user.
 * Amount should be negative for expenses, positive for income.
 */
export async function seedTransaction(
  app: INestApplication,
  data: {
    amount: number;
    date: Date;
    description?: string;
    category?: string;
    account: string;
    user: string;
    isTransfer?: boolean;
    workspace?: string;
  },
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Transaction');
  const doc = await Model.create({
    ...data,
    isTransfer: data.isTransfer ?? false,
  });
  return doc._id.toString();
}

/**
 * Read the current balance of an account directly from the database.
 */
export async function getAccountBalance(
  app: INestApplication,
  accountId: string,
): Promise<number> {
  const connection = app.get<Connection>(getConnectionToken());
  const Model = connection.model('Account');
  const doc = await Model.findById(accountId);
  return doc?.balance ?? 0;
}
