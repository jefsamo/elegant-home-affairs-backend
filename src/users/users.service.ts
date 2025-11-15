// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    const { email, firstName, lastName, phoneNumber } = data;
    const created = new this.userModel({
      email,
      firstName,
      lastName,
      phoneNumber,
    });
    return created.save();
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { passwordHash }).exec();
  }

  async markUserEmailAsVerified(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { isEmailVerified: true })
      .exec();
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } })
      .exec();
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, dto, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
