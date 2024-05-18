import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './entities/user.entity';
import { Model } from 'mongoose';
import { hash } from 'bcrypt';
import { UserResponseDto } from './dto/user-response.dto';
import { UserDto } from './dto/user.dto';
import { JWT_HASH_CYCLES } from './utils/constants';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(createUserDto: CreateUserDto) {
    const newUser = {
      ...createUserDto,
      password: await hash(createUserDto.password, JWT_HASH_CYCLES),
    };
    const user = await new this.userModel(newUser)
      .save()
      .then(UserResponseDto.fromUser);
    return user;
  }

  async findOneByUsernameWithPassword(username: string) {
    return this.userModel
      .findOne({ email: username })
      .exec()
      .then((user) => user && UserDto.fromUser(user));
  }

  async findOne(id: string) {
    return this.userModel.findById(id).exec().then(UserResponseDto.fromUser);
  }
}
