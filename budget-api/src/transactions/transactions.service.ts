import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { ClientSession, Model } from 'mongoose';
import { AccountsService } from 'src/accounts/accounts.service';
import { TransactionDto } from './dto/transaction.dto';
import { plainToClass } from 'class-transformer';
import { DbTransactionService } from 'src/shared/db-transaction.service';
import { CategoriesService } from 'src/categories/categories.service';
import { CategoryType } from 'src/categories/entities/category-type.enum';
import { I18nService } from 'nestjs-i18n';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { PaginatedDataDto } from 'src/shared/dto/paginated-data.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ObjectId } from 'mongodb';

@Injectable()
export class TransactionsService {
  private readonly logger: Logger = new Logger(TransactionsService.name);

  constructor(
    private readonly dbTransactionService: DbTransactionService,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<Transaction>,
    private readonly i18n: I18nService,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
    userId: string,
    workspaceId?: string,
    session?: ClientSession,
  ): Promise<TransactionDto> {
    if (createTransactionDto.category && createTransactionDto.newCategory) {
      throw new HttpException(
        'Provide either category or newCategory, not both',
        HttpStatus.BAD_REQUEST,
      );
    }

    const saveTransactionFn = async (session: ClientSession) => {
      let category;
      if (createTransactionDto.newCategory) {
        category = await this.categoriesService.create(
          {
            ...createTransactionDto.newCategory,
            user: userId,
            workspace: workspaceId,
          } as any,
          session,
        );
      } else {
        category = await this.categoriesService.findById(
          createTransactionDto.category,
          workspaceId,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { newCategory: _, ...transactionData } = createTransactionDto;

      const newTransaction = {
        ...transactionData,
        category: category.id,
        amount:
          category.categoryType === CategoryType.EXPENSE
            ? -createTransactionDto.amount
            : createTransactionDto.amount,
        user: userId,
        workspace: workspaceId,
      };

      const transactionModel = new this.transactionModel(newTransaction);
      const savedTransaction = await transactionModel.save({ session });

      await this.accountsService.addAccountBalance(
        savedTransaction.account.id,
        savedTransaction.amount,
        session,
      );

      return plainToClass(TransactionDto, savedTransaction.toObject());
    };

    try {
      return session
        ? saveTransactionFn(session)
        : this.dbTransactionService.runTransaction(saveTransactionFn);
    } catch (error) {
      this.logger.error(
        `Failed to create transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createTransfer(
    createTransferDto: CreateTransferDto,
    userId: string,
    workspaceId: string,
  ) {
    const originAccount = await this.accountsService.findById(
      createTransferDto.originAccount,
      workspaceId,
    );

    if (!originAccount) {
      throw new HttpException('Origin account not found', HttpStatus.NOT_FOUND);
    }

    const newTransfer = {
      date: createTransferDto.date,
      description: createTransferDto.description,
      notes: createTransferDto.notes,
      account: createTransferDto.account,
      user: userId,
      workspace: workspaceId,
      amount: createTransferDto.amount,
    };

    try {
      return this.dbTransactionService.runTransaction(async (session) => {
        const incomeTransactionModel = new this.transactionModel(newTransfer);
        const savedIncomeTransaction = await incomeTransactionModel.save({
          session,
        });

        await this.accountsService.addAccountBalance(
          savedIncomeTransaction.account.id,
          savedIncomeTransaction.amount,
          session,
        );

        const outcomeTransaction = {
          date: createTransferDto.date,
          description: createTransferDto.description,
          notes: createTransferDto.notes,
          account: createTransferDto.originAccount,
          user: userId,
          workspace: workspaceId,
          amount: -createTransferDto.amount,
          transfer: savedIncomeTransaction.id,
          isTransfer: true,
        };
        const outcomeTransactionModel = new this.transactionModel(
          outcomeTransaction,
        );
        const savedOutcomeTransaction = await outcomeTransactionModel.save({
          session,
        });

        await this.accountsService.addAccountBalance(
          savedOutcomeTransaction.account.id,
          savedOutcomeTransaction.amount,
          session,
        );

        savedIncomeTransaction.transfer = savedOutcomeTransaction.id;
        savedIncomeTransaction.isTransfer = true;
        await savedIncomeTransaction.save({ session });

        return plainToClass(TransactionDto, savedIncomeTransaction.toObject());
      });
    } catch (error) {
      this.logger.error(
        `Failed to create transfer transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error creating the transfer transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    workspaceId: string,
    paginationDto: PaginationDto,
    categoryId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<PaginatedDataDto<TransactionDto>> {
    const filter: any = { workspace: workspaceId };
    const skip = paginationDto.offset || 0;
    const limit = paginationDto.limit || 10;
    const sort = { date: -1, createdAt: -1 };

    if (!dateFrom && !dateTo) {
      const now = new Date();
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = now;
    }
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lt = dateTo;
    }

    if (categoryId) {
      const expandedIds =
        await this.categoriesService.findCategoryIdsWithChildren(
          [categoryId],
          workspaceId,
        );
      filter.category = { $in: expandedIds };
    }

    try {
      const transactions = await this.transactionModel.find(filter, null, {
        skip,
        limit,
        sort,
      });
      const total = await this.transactionModel.countDocuments(filter);
      return {
        data: transactions.map((transaction) =>
          plainToClass(TransactionDto, transaction.toObject()),
        ),
        total,
        limit,
        offset: skip,
        nextPage: skip + limit < total ? skip + limit : null,
      };
    } catch (error) {
      this.logger.error(
        `Failed to find transactions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
    workspaceId?: string,
    session?: ClientSession,
  ): Promise<TransactionDto> {
    const wsId = workspaceId;
    const oldTransaction = await this.findOne(id, wsId);

    const dataToUpdate: UpdateTransactionDto = {
      ...updateTransactionDto,
    };

    if (
      updateTransactionDto.category &&
      updateTransactionDto.category !== oldTransaction.category.id
    ) {
      const category = await this.categoriesService.findById(
        updateTransactionDto.category,
        wsId,
      );

      dataToUpdate.category = category.id;
      if (
        updateTransactionDto.amount !== undefined &&
        updateTransactionDto.amount !== oldTransaction.amount
      ) {
        dataToUpdate.amount =
          category.categoryType === CategoryType.EXPENSE
            ? -updateTransactionDto.amount
            : updateTransactionDto.amount;
      } else {
        dataToUpdate.amount = -oldTransaction.amount;
      }
    } else if (
      updateTransactionDto.amount !== undefined &&
      updateTransactionDto.amount !== oldTransaction.amount
    ) {
      dataToUpdate.amount =
        oldTransaction.category.categoryType === CategoryType.EXPENSE
          ? -updateTransactionDto.amount
          : updateTransactionDto.amount;
    }

    const updateFn = async (session: ClientSession) => {
      if (
        updateTransactionDto.account &&
        updateTransactionDto.account !== oldTransaction.account.id
      ) {
        await this.accountsService.addAccountBalance(
          oldTransaction.account.id,
          -oldTransaction.amount,
          session,
        );

        if (dataToUpdate.amount !== undefined) {
          await this.accountsService.addAccountBalance(
            updateTransactionDto.account,
            dataToUpdate.amount,
            session,
          );
        } else {
          await this.accountsService.addAccountBalance(
            updateTransactionDto.account,
            oldTransaction.amount,
            session,
          );
        }
      } else if (dataToUpdate.amount !== undefined) {
        const amountDiff = dataToUpdate.amount - oldTransaction.amount;
        if (amountDiff !== 0) {
          await this.accountsService.addAccountBalance(
            oldTransaction.account.id,
            amountDiff,
            session,
          );
        }
      }

      const updatedTransaction = await this.transactionModel.findOneAndUpdate(
        { _id: id, workspace: wsId },
        dataToUpdate,
        { new: true, session },
      );

      return plainToClass(TransactionDto, updatedTransaction.toObject());
    };
    return session
      ? updateFn(session)
      : this.dbTransactionService.runTransaction(updateFn);
  }

  async updateTransfer(
    id: string,
    updateTransferDto: UpdateTransferDto,
    userId: string,
    workspaceId: string,
  ): Promise<TransactionDto> {
    const transactionToUpdate = await this.findOne(id, workspaceId);
    if (!transactionToUpdate.isTransfer) {
      throw new HttpException(
        'Transaction is not a transfer',
        HttpStatus.BAD_REQUEST,
      );
    }

    const siblingTransaction = transactionToUpdate.transfer;

    const originTransaction =
      transactionToUpdate.amount < 0 ? transactionToUpdate : siblingTransaction;
    const targetTransaction =
      transactionToUpdate.amount > 0 ? transactionToUpdate : siblingTransaction;

    const originTransactionPayload: UpdateTransactionDto = {};
    const targetTransactionPayload: UpdateTransactionDto = {};

    const isAmountUpdate =
      updateTransferDto.amount !== undefined &&
      updateTransferDto.amount !== Math.abs(originTransaction.amount);

    if (isAmountUpdate) {
      originTransactionPayload.amount = -updateTransferDto.amount;
      targetTransactionPayload.amount = updateTransferDto.amount;
    }

    if (
      updateTransferDto.originAccount &&
      updateTransferDto.originAccount !== originTransaction.account.id
    ) {
      if (
        updateTransferDto.originAccount ===
        (updateTransferDto.account || targetTransaction.account.id)
      ) {
        throw new HttpException(
          'Origin and target accounts cannot be the same.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const account = await this.accountsService.findById(
        updateTransferDto.originAccount,
        workspaceId,
      );
      originTransactionPayload.account = account.id;
    }

    if (
      updateTransferDto.account &&
      updateTransferDto.account !== targetTransaction.account.id
    ) {
      if (
        updateTransferDto.account ===
        (updateTransferDto.originAccount || originTransaction.account.id)
      ) {
        throw new HttpException(
          'Origin and target accounts cannot be the same.',
          HttpStatus.BAD_REQUEST,
        );
      }
      const account = await this.accountsService.findById(
        updateTransferDto.account,
        workspaceId,
      );
      targetTransactionPayload.account = account.id;
    }

    if (updateTransferDto.date) {
      originTransactionPayload.date = updateTransferDto.date;
      targetTransactionPayload.date = updateTransferDto.date;
    }

    if (updateTransferDto.description) {
      originTransactionPayload.description = updateTransferDto.description;
      targetTransactionPayload.description = updateTransferDto.description;
    }

    if (updateTransferDto.notes) {
      originTransactionPayload.notes = updateTransferDto.notes;
      targetTransactionPayload.notes = updateTransferDto.notes;
    }

    return this.dbTransactionService.runTransaction(async (session) => {
      if (originTransactionPayload.account) {
        await this.accountsService.addAccountBalance(
          originTransaction.account.id,
          -originTransaction.amount,
          session,
        );
        await this.accountsService.addAccountBalance(
          originTransactionPayload.account,
          originTransactionPayload.amount || originTransaction.amount,
          session,
        );

        if (targetTransactionPayload.account) {
          await this.accountsService.addAccountBalance(
            targetTransaction.account.id,
            -targetTransaction.amount,
            session,
          );
          await this.accountsService.addAccountBalance(
            targetTransactionPayload.account,
            targetTransactionPayload.amount || targetTransaction.amount,
            session,
          );
        } else if (targetTransactionPayload.amount !== undefined) {
          const amountDiff =
            targetTransactionPayload.amount - targetTransaction.amount;
          await this.accountsService.addAccountBalance(
            targetTransaction.account.id,
            amountDiff,
            session,
          );
        }
      } else if (targetTransactionPayload.account) {
        await this.accountsService.addAccountBalance(
          targetTransaction.account.id,
          -targetTransaction.amount,
          session,
        );
        await this.accountsService.addAccountBalance(
          targetTransactionPayload.account,
          targetTransactionPayload.amount || targetTransaction.amount,
          session,
        );

        if (originTransactionPayload.amount !== undefined) {
          const amountDiff =
            originTransactionPayload.amount - originTransaction.amount;
          await this.accountsService.addAccountBalance(
            originTransaction.account.id,
            amountDiff,
            session,
          );
        }
      } else if (isAmountUpdate) {
        const originAmountDiff =
          originTransactionPayload.amount - originTransaction.amount;
        const targetAmountDiff =
          targetTransactionPayload.amount - targetTransaction.amount;

        await this.accountsService.addAccountBalance(
          originTransaction.account.id,
          originAmountDiff,
          session,
        );
        await this.accountsService.addAccountBalance(
          targetTransaction.account.id,
          targetAmountDiff,
          session,
        );
      }

      const updatedOriginTransaction =
        await this.transactionModel.findOneAndUpdate(
          { _id: originTransaction.id, workspace: workspaceId },
          originTransactionPayload,
          { new: true, session },
        );

      const updatedTargetTransaction =
        await this.transactionModel.findOneAndUpdate(
          { _id: targetTransaction.id, workspace: workspaceId },
          targetTransactionPayload,
          { new: true, session },
        );

      return plainToClass(
        TransactionDto,
        (updatedOriginTransaction.id === transactionToUpdate.id
          ? updatedOriginTransaction
          : updatedTargetTransaction
        ).toObject(),
      );
    });
  }

  async remove(
    id: string,
    userId: string,
    workspaceId?: string,
    session?: ClientSession,
  ): Promise<TransactionDto> {
    const wsId = workspaceId;
    const transaction = await this.findOne(id, wsId);
    const removeFn = async (session: ClientSession) => {
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        -transaction.amount,
        session,
      );
      const deletedTransaction = await this.transactionModel.findOneAndDelete(
        { _id: id, workspace: wsId },
        { session },
      );
      if (!deletedTransaction) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(TransactionDto, deletedTransaction.toObject());
    };

    return session
      ? removeFn(session)
      : this.dbTransactionService.runTransaction(removeFn);
  }

  async removeTransfer(
    id: string,
    userId: string,
    workspaceId: string,
  ): Promise<TransactionDto> {
    const transaction = await this.findOne(id, workspaceId);
    if (!transaction.isTransfer) {
      throw new HttpException(
        'Transaction is not a transfer',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.dbTransactionService.runTransaction(async (session) => {
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        -transaction.amount,
        session,
      );
      await this.accountsService.addAccountBalance(
        transaction.transfer.account.id,
        -transaction.transfer.amount,
        session,
      );
      const deletedTransaction = await this.transactionModel.findOneAndDelete(
        { _id: id, workspace: workspaceId },
        { session },
      );
      const deletedTransfer = await this.transactionModel.findOneAndDelete(
        { _id: transaction.transfer.id, workspace: workspaceId },
        { session },
      );
      if (!deletedTransaction || !deletedTransfer) {
        throw new HttpException(
          'Transfer transaction not found',
          HttpStatus.NOT_FOUND,
        );
      }
      return plainToClass(TransactionDto, deletedTransaction.toObject());
    });
  }

  async getSummary(workspaceId: string): Promise<
    {
      currencyCode: string;
      totalIncome: number;
      totalExpenses: number;
    }[]
  > {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = now;
    try {
      const transactions = await this.transactionModel.aggregate([
        {
          $match: {
            workspace: new ObjectId(workspaceId),
            date: { $gte: startDate, $lt: endDate },
            isTransfer: false,
          },
        },
        {
          $lookup: {
            from: 'accounts',
            localField: 'account',
            foreignField: '_id',
            as: 'accountDetails',
          },
        },
        { $unwind: '$accountDetails' },
        {
          $group: {
            _id: '$accountDetails.currencyCode',
            totalIncome: {
              $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] },
            },
            totalExpenses: {
              $sum: { $cond: [{ $lt: ['$amount', 0] }, '$amount', 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            currencyCode: '$_id',
            totalIncome: '$totalIncome',
            totalExpenses: { $abs: '$totalExpenses' },
          },
        },
        { $sort: { currencyCode: 1 } },
      ]);
      return transactions;
    } catch (error) {
      this.logger.error(`Failed to get summary: ${error.message}`, error.stack);
      throw new HttpException(
        'Error getting the summary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async findOne(
    id: string,
    workspaceId: string,
  ): Promise<TransactionDto> {
    try {
      const transaction = await this.transactionModel.findOne({
        _id: id,
        workspace: workspaceId,
      });
      if (!transaction) {
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
      }
      return plainToClass(TransactionDto, transaction.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find transaction: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the transaction',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
