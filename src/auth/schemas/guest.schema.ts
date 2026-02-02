import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GuestSessionDocument = GuestSession & Document;

//new implementation
@Schema({ timestamps: true })
export class GuestSession {
  @Prop({ required: true, unique: true, index: true })
  guestId: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ip?: string;
  // @Prop()
  // _id?: string;
}

export const GuestSessionSchema = SchemaFactory.createForClass(GuestSession);

GuestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
