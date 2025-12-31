/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { State, StateDocument } from './schemas/state.schema';
import {
  LagosShippingOption,
  LagosShippingOptionDocument,
} from './schemas/lagos-option.schema';
import {
  ShippingMethod,
  ShippingMethodDocument,
} from './schemas/shipping-method.schema';
import {
  CreateLagosOptionDto,
  CreateShippingMethodDto,
  UpdateLagosOptionDto,
  UpdateShippingMethodDto,
  UpsertStateDto,
} from './dto/admin.dto';

@Injectable()
export class ShippingAdminService {
  constructor(
    @InjectModel(State.name) private readonly stateModel: Model<StateDocument>,
    @InjectModel(LagosShippingOption.name)
    private readonly lagosModel: Model<LagosShippingOptionDocument>,
    @InjectModel(ShippingMethod.name)
    private readonly methodModel: Model<ShippingMethodDocument>,
  ) {}

  private normalizeState(code: string) {
    return code.trim().toUpperCase();
  }

  // ---------- STATES ----------
  async listStates() {
    return this.stateModel.find({}).sort({ name: 1 }).lean();
  }

  async upsertState(dto: UpsertStateDto) {
    const code = this.normalizeState(dto.code);
    return this.stateModel.updateOne(
      { code },
      { $set: { code, name: dto.name.trim() } },
      { upsert: true },
    );
  }

  async deleteState(codeRaw: string) {
    const code = this.normalizeState(codeRaw);
    const res = await this.stateModel.deleteOne({ code });
    return { deleted: res.deletedCount === 1 };
  }

  // ---------- LAGOS OPTIONS ----------
  async listLagosOptions(filter: { isActive?: boolean; groupName?: string }) {
    const q: any = { stateCode: 'LA' };
    if (filter.isActive !== undefined) q.isActive = filter.isActive;
    if (filter.groupName) q.groupName = filter.groupName;

    return this.lagosModel
      .find(q)
      .sort({ serviceLevel: 1, sortOrder: 1, groupName: 1, label: 1 })
      .lean();
  }

  async createLagosOption(dto: CreateLagosOptionDto) {
    const doc = await this.lagosModel.create({
      stateCode: 'LA',
      groupName: dto.groupName.trim(),
      label: dto.label.trim(),
      serviceLevel: dto.serviceLevel,
      etaText: dto.etaText?.trim(),
      priceKobo: dto.priceKobo,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return { id: String(doc._id) };
  }

  async updateLagosOption(id: string, dto: UpdateLagosOptionDto) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');

    const update: any = {};
    if (dto.groupName !== undefined) update.groupName = dto.groupName.trim();
    if (dto.label !== undefined) update.label = dto.label.trim();
    if (dto.serviceLevel !== undefined) update.serviceLevel = dto.serviceLevel;
    if (dto.etaText !== undefined) update.etaText = dto.etaText.trim();
    if (dto.priceKobo !== undefined) update.priceKobo = dto.priceKobo;
    if (dto.sortOrder !== undefined) update.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;

    const res = await this.lagosModel.updateOne(
      { _id: new Types.ObjectId(id), stateCode: 'LA' },
      { $set: update },
    );
    if (res.matchedCount === 0)
      throw new NotFoundException('Lagos option not found');
    return { updated: true };
  }

  async deleteLagosOption(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    const res = await this.lagosModel.deleteOne({
      _id: new Types.ObjectId(id),
      stateCode: 'LA',
    });
    return { deleted: res.deletedCount === 1 };
  }

  // ---------- SHIPPING METHODS ----------
  async listShippingMethods(filter: {
    isActive?: boolean;
    applicability?: 'NON_LAGOS' | 'ALL';
  }) {
    const q: any = {};
    if (filter.isActive !== undefined) q.isActive = filter.isActive;
    if (filter.applicability) q.applicability = filter.applicability;

    return this.methodModel.find(q).sort({ sortOrder: 1, name: 1 }).lean();
  }

  async createShippingMethod(dto: CreateShippingMethodDto) {
    const code = dto.code.trim().toUpperCase();
    const exists = await this.methodModel.findOne({ code }).lean();
    if (exists)
      throw new BadRequestException(
        `Shipping method code already exists: ${code}`,
      );

    const doc = await this.methodModel.create({
      code,
      name: dto.name.trim(),
      serviceLevel: dto.serviceLevel,
      applicability: dto.applicability,
      description: dto.description?.trim(),
      etaText: dto.etaText?.trim(),
      priceKobo: dto.priceKobo,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      allowedStateCodes: (dto.allowedStateCodes ?? []).map((s) =>
        s.trim().toUpperCase(),
      ),
    });

    return { id: String(doc._id) };
  }

  async updateShippingMethod(id: string, dto: UpdateShippingMethodDto) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');

    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name.trim();
    if (dto.serviceLevel !== undefined) update.serviceLevel = dto.serviceLevel;
    if (dto.applicability !== undefined)
      update.applicability = dto.applicability;
    if (dto.description !== undefined)
      update.description = dto.description.trim();
    if (dto.etaText !== undefined) update.etaText = dto.etaText.trim();
    if (dto.priceKobo !== undefined) update.priceKobo = dto.priceKobo;
    if (dto.sortOrder !== undefined) update.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.allowedStateCodes !== undefined) {
      update.allowedStateCodes = dto.allowedStateCodes.map((s) =>
        s.trim().toUpperCase(),
      );
    }

    const res = await this.methodModel.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: update },
    );
    if (res.matchedCount === 0)
      throw new NotFoundException('Shipping method not found');
    return { updated: true };
  }

  async deleteShippingMethod(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    const res = await this.methodModel.deleteOne({
      _id: new Types.ObjectId(id),
    });
    return { deleted: res.deletedCount === 1 };
  }
}
