import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { Model } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { compare, hash } from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { PASSWORD_BYCRYPT_SALT } from './constants';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger: Logger = new Logger(UsersService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Find a user by email and password.
   * @param email The email of the user.
   * @param password The password of the user.
   * @returns The user if found, null otherwise.
   * @async
   */
  async findByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<UserDto | null> {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) return null;
      const isPasswordMatching = await compare(password, user.password);
      if (!isPasswordMatching) return null;
      return plainToClass(UserDto, user.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find user by email and password: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a user by email.
   * @param email The email of the user to find.
   * @returns The user found or null if not found.
   * @async
   */
  async findByEmail(email: string): Promise<UserDto | null> {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) return null;
      return plainToClass(UserDto, user.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find user by email: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a new user.
   * @param createUserDto The data to create the user.
   * @returns The user created.
   * @async
   */
  async create(createUserDto: CreateUserDto): Promise<UserDto> {
    try {
      const newUser = new this.userModel(createUserDto);
      const user = await newUser.save();
      return plainToClass(UserDto, user.toObject());
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new HttpException(
        'Error saving the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a user.
   * @param id The id of the user to update.
   * @param updateUserDto The data to update the user.
   * @returns The user updated.
   * @async
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDto> {
    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // if the password is being updated, hash it
      if (updateUserDto.password) {
        updateUserDto.password = await hash(
          updateUserDto.password,
          Number(this.configService.get(PASSWORD_BYCRYPT_SALT)),
        );
      }

      user.set(updateUserDto);
      const updatedUser = await user.save();
      return plainToClass(UserDto, updatedUser.toObject());
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw new HttpException(
        'Error saving the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Find a user by id.
   * @param id The id of the user to find.
   * @returns The user found.
   * @async
   */
  async findById(id: string): Promise<UserDto | null> {
    try {
      const user = await this.userModel.findById(id);
      if (!user) return null;
      return plainToClass(UserDto, user.toObject());
    } catch (error) {
      this.logger.error(
        `Failed to find user by id: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Error finding the user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
