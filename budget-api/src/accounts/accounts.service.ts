import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Account } from './entities/account.entity';
import { ClientSession, Model } from 'mongoose';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountDto } from './dto/account.dto';
import { plainToClass } from 'class-transformer';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { Transaction } from 'src/transactions/entities/transaction.entity';
import { ObjectId } from 'mongodb';
import { AccountsSummary } from './types';
import { PaginationDto } from 'src/shared/dto/pagination.dto';

@Injectable()
export class AccountsService {
  private readonly logger: Logger = new Logger(AccountsService.name);

  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<Account>,
    private readonly dbTransactionService: DbTransactionService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
  ) {}

  async create(
    createAccountDto: CreateAccountDto,
    userId: string,
    workspaceId: string,
  ): Promise<AccountDto> {
    const newAccount = {
      ...createAccountDto,
      user: userId,
      workspace: workspaceId,
    };
    try {
      const accountModel = new this.accountModel(newAccount);
      const savedAccount = await accountModel.save();
      return plainToClass(AccountDto, savedAccount.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to create account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    workspaceId: string,
    paginationDto: PaginationDto,
  ): Promise<AccountDto[]> {
    const limit = paginationDto.limit;
    try {
      const accounts = await this.accountModel.find(
        { workspace: workspaceId },
        null,
        { limit, sort: { createdAt: -1 } },
      );
      return accounts.map((account) =>
        plainToClass(AccountDto, account.toObject()),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find accounts: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: string, workspaceId: string): Promise<AccountDto> {
    try {
      const account = await this.accountModel.findOne({
        _id: id,
        workspace: workspaceId,
      });
      if (!account) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(AccountDto, account.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateAccountDto: UpdateAccountDto,
    workspaceId: string,
  ): Promise<AccountDto> {
    try {
      const updatedAccount = await this.accountModel.findOneAndUpdate(
        { _id: id, workspace: workspaceId },
        updateAccountDto,
        { new: true },
      );
      if (!updatedAccount) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(AccountDto, updatedAccount.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to update account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error updating the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string, workspaceId: string): Promise<AccountDto> {
    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const deletedAccount = await this.accountModel.findOneAndDelete(
          { _id: id, workspace: workspaceId },
          { session },
        );
        if (!deletedAccount) {
          throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
        }
        await this.transactionModel.deleteMany({ account: id }, { session });
        return plainToClass(AccountDto, deletedAccount.toObject());
      });
    } catch (error) {
      this.logger.error(
        `Failed to remove account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error removing the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addAccountBalance(
    id: string,
    amount: number,
    session?: ClientSession,
  ): Promise<AccountDto> {
    try {
      const updatedAccount = await this.accountModel.findOneAndUpdate(
        { _id: id },
        { $inc: { balance: amount } },
        { new: true, session },
      );
      if (!updatedAccount) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(AccountDto, updatedAccount.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to add balance to account: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error adding balance to the account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSummary(workspaceId: string): Promise<AccountsSummary> {
    try {
      const assetsAccountsBalance = await this.accountModel.aggregate([
        { $match: { workspace: new ObjectId(workspaceId) } },
        {
          $lookup: {
            from: 'accounttypes',
            localField: 'accountType',
            foreignField: '_id',
            as: 'accountType',
          },
        },
        {
          $addFields: {
            accountType: { $arrayElemAt: ['$accountType', 0] },
          },
        },
        {
          $group: {
            _id: {
              currencyCode: '$currencyCode',
              accountCategory: '$accountType.accountCategory',
            },
            totalBalance: { $sum: '$balance' },
            accountsCount: { $sum: 1 },
          },
        },
        {
          $project: {
            currencyCode: '$_id.currencyCode',
            accountCategory: '$_id.accountCategory',
            totalBalance: 1,
            accountsCount: 1,
            _id: 0,
          },
        },
      ]);
      return assetsAccountsBalance;
    } catch (error) {
      this.logger.error(
        `Failed to get total balance: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error getting the total balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
