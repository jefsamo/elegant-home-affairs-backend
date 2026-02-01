// src/users/users.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query';

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

  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
    user: { userId: string },
  ): Promise<User> {
    if (userId !== user.userId) throw new ForbiddenException();

    const userProfile = await this.userModel
      .findByIdAndUpdate(userId, dto, { new: true })
      .exec();
    if (!userProfile) throw new NotFoundException('User not found');
    return userProfile;
  }

  async getMe(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    // Optional: prevent email changes or enforce uniqueness here
    const user = await this.userModel
      .findByIdAndUpdate(userId, dto, { new: true })
      .select('-password')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findPaginated(query: ListUsersQueryDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 50);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<User> = {};

    if (query.isActive) filter.isActive = query.isActive === 'true';
    if (query.isEmailVerified)
      filter.isEmailVerified = query.isEmailVerified === 'true';

    if (query.search?.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { email: { $regex: s, $options: 'i' } },
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } },
        { phoneNumber: { $regex: s, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async findOneById(id: string) {
    return this.userModel.findById(id).select('-passwordHash').lean();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async createFromOAuth(dto: {
    email: string;
    firstName: string;
    lastName: string;
    provider: 'google';
    providerId: string;
    avatarUrl?: string;
  }) {
    return this.userModel.create({
      email: dto.email.toLowerCase(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      provider: dto.provider,
      providerId: dto.providerId,
      avatarUrl: dto.avatarUrl,
      roles: ['customer'],
      // password: undefined (or omit)
    });
  }

  async linkOAuth(
    userId: string,
    dto: { provider: 'google'; providerId: string; avatarUrl?: string },
  ) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        provider: dto.provider,
        providerId: dto.providerId,
        ...(dto.avatarUrl ? { avatarUrl: dto.avatarUrl } : {}),
      },
      { new: true },
    );
  }
}
