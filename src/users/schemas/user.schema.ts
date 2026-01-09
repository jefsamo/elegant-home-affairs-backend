// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop()
  passwordHash: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ type: [String], default: ['customer'] })
  roles: string[];

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({
    required: true,
    unique: true,
  })
  phoneNumber: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop()
  resetPasswordTokenHash?: string;

  @Prop()
  resetPasswordExpiresAt?: Date;
  _id: any;

  provider?: string;
  providerId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
