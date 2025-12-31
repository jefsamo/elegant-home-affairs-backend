import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StateDocument = State & Document;

@Schema({ timestamps: true })
export class State {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string; // "LA", "KW", etc.

  @Prop({ required: true, trim: true })
  name: string; // "Lagos", "Kwara"
}

export const StateSchema = SchemaFactory.createForClass(State);
StateSchema.index({ code: 1 }, { unique: true });
