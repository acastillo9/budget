import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from './entities/transaction.entity';
import { Model } from 'mongoose';
import { TransactionType } from './entities/transaction-type.enum';
import { AccountsService } from 'src/accounts/accounts.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    private accountsService: AccountsService,
  ) {}

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await new this.transactionModel({
      ...createTransactionDto,
      amount:
        createTransactionDto.transactionType === TransactionType.EXPENSE
          ? -createTransactionDto.amount
          : createTransactionDto.amount,
      creationDate: new Date(),
    })
      .save()
      .then(TransactionResponseDto.fromTransaction);
    if (transaction.paid) {
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        transaction.amount,
      );
    }
    return transaction;
  }

  async findAll(): Promise<TransactionResponseDto[]> {
    return this.transactionModel
      .find()
      .exec()
      .then((transactions) =>
        transactions.map(TransactionResponseDto.fromTransaction),
      );
  }

  async findOne(id: string): Promise<TransactionResponseDto> {
    return this.transactionModel
      .findById(id)
      .exec()
      .then(TransactionResponseDto.fromTransaction);
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionModel
      .findByIdAndUpdate(
        id,
        {
          ...updateTransactionDto,
          amount:
            updateTransactionDto.transactionType === TransactionType.EXPENSE
              ? -updateTransactionDto.amount
              : updateTransactionDto.amount,
          updateDate: new Date(),
        },
        { new: true },
      )
      .exec()
      .then(TransactionResponseDto.fromTransaction);
    if (transaction.paid) {
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        transaction.amount,
      );
    }
    return transaction;
  }

  async remove(id: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionModel
      .findByIdAndDelete(id)
      .exec()
      .then(TransactionResponseDto.fromTransaction);
    if (transaction.paid) {
      await this.accountsService.addAccountBalance(
        transaction.account.id,
        transaction.amount * -1,
      );
    }
    return transaction;
  }

  async findAllByMonthAndYear(
    month: number,
    year: number,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionModel
      .find({
        startDate: {
          $gte: new Date(year, month - 1),
          $lt: new Date(year, month),
        },
      })
      .exec()
      .then((transactions) =>
        transactions.map(TransactionResponseDto.fromTransaction),
      );
  }
}
