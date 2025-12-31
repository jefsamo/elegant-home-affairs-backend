/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

@Injectable()
export class ShippingService {
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

  async getStates() {
    return this.stateModel
      .find({}, { code: 1, name: 1 })
      .sort({ name: 1 })
      .lean();
  }

  async getOptionsByState(stateCodeRaw: string) {
    const stateCode = this.normalizeState(stateCodeRaw);

    const state = await this.stateModel.findOne({ code: stateCode }).lean();
    if (!state) throw new NotFoundException(`Unknown state: ${stateCode}`);

    if (stateCode === 'LA') {
      const options = await this.lagosModel
        .find({ stateCode: 'LA', isActive: true })
        .sort({ serviceLevel: 1, sortOrder: 1, groupName: 1, label: 1 })
        .lean();

      const map = new Map<string, any[]>();

      for (const o of options) {
        const group =
          o.serviceLevel === 'SAME_DAY' ? 'Same-day delivery' : o.groupName;

        const item = {
          id: String(o._id),
          label: o.label,
          priceKobo: o.priceKobo,
          etaText: o.etaText ?? null,
          serviceLevel: o.serviceLevel,
        };

        map.set(group, [...(map.get(group) ?? []), item]);
      }

      return {
        mode: 'LAGOS',
        stateCode,
        groups: Array.from(map.entries()).map(([group, items]) => ({
          group,
          items,
        })),
      };
    }

    const methods = await this.methodModel
      .find({
        isActive: true,
        applicability: { $in: ['NON_LAGOS', 'ALL'] },
        $or: [
          { allowedStateCodes: { $size: 0 } },
          { allowedStateCodes: stateCode },
        ],
      })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return {
      mode: 'NON_LAGOS',
      stateCode,
      methods: methods.map((m) => ({
        id: String(m._id),
        code: m.code,
        name: m.name,
        serviceLevel: m.serviceLevel,
        description: m.description ?? null,
        etaText: m.etaText ?? null,
        priceKobo: m.priceKobo,
      })),
    };
  }

  async resolveCost(
    stateCodeRaw: string,
    ids: { lagosOptionId?: string; shippingMethodId?: string },
  ) {
    const stateCode = this.normalizeState(stateCodeRaw);

    const state = await this.stateModel.findOne({ code: stateCode }).lean();
    if (!state) throw new NotFoundException(`Unknown state: ${stateCode}`);

    if (stateCode === 'LA') {
      if (!ids.lagosOptionId) {
        throw new BadRequestException(
          'lagosOptionId is required for Lagos orders',
        );
      }
      if (!Types.ObjectId.isValid(ids.lagosOptionId)) {
        throw new BadRequestException('Invalid lagosOptionId');
      }

      const opt = await this.lagosModel
        .findOne({
          _id: new Types.ObjectId(ids.lagosOptionId),
          isActive: true,
          stateCode: 'LA',
        })
        .lean();

      if (!opt)
        throw new NotFoundException('Selected Lagos delivery option not found');

      return {
        mode: 'LAGOS',
        stateCode,
        priceKobo: opt.priceKobo,
        etaText: opt.etaText ?? null,
        label: `${opt.groupName}: ${opt.label}`,
      };
    }

    if (!ids.shippingMethodId) {
      throw new BadRequestException(
        'shippingMethodId is required for non-Lagos orders',
      );
    }
    if (!Types.ObjectId.isValid(ids.shippingMethodId)) {
      throw new BadRequestException('Invalid shippingMethodId');
    }

    const method = await this.methodModel
      .findOne({
        _id: new Types.ObjectId(ids.shippingMethodId),
        isActive: true,
        applicability: { $in: ['NON_LAGOS', 'ALL'] },
        $or: [
          { allowedStateCodes: { $size: 0 } },
          { allowedStateCodes: stateCode },
        ],
      })
      .lean();

    if (!method)
      throw new NotFoundException('Selected shipping method not found');

    return {
      mode: 'NON_LAGOS',
      stateCode,
      priceKobo: method.priceKobo,
      etaText: method.etaText ?? null,
      label: method.name,
    };
  }

  async seedDevData() {
    const states = [
      { code: 'LA', name: 'Lagos' },
      { code: 'KW', name: 'Kwara' },
      { code: 'FC', name: 'FCT' },
      { code: 'RV', name: 'Rivers' },
      { code: 'KN', name: 'Kano' },
    ];

    for (const s of states) {
      await this.stateModel.updateOne(
        { code: s.code },
        { $set: s },
        { upsert: true },
      );
    }

    const lagosSamples: Partial<LagosShippingOption>[] = [
      {
        stateCode: 'LA',
        groupName: 'Lagos Island',
        label: 'After Jakande',
        serviceLevel: 'STANDARD',
        etaText: '1–2 business days',
        priceKobo: 350000,
        sortOrder: 1,
        isActive: true,
      },
      {
        stateCode: 'LA',
        groupName: 'Lagos Island',
        label: 'Before Jakande',
        serviceLevel: 'STANDARD',
        etaText: '1–2 business days',
        priceKobo: 350000,
        sortOrder: 2,
        isActive: true,
      },
      {
        stateCode: 'LA',
        groupName: 'Lagos Mainland',
        label: 'Mainland',
        serviceLevel: 'STANDARD',
        etaText: '1–2 business days',
        priceKobo: 350000,
        sortOrder: 3,
        isActive: true,
      },
      {
        stateCode: 'LA',
        groupName: 'Same-day',
        label: 'Island Zone I (VI - Ikate)',
        serviceLevel: 'SAME_DAY',
        etaText: 'Mon–Fri 8AM–5PM',
        priceKobo: 1000000,
        sortOrder: 10,
        isActive: true,
      },
    ];

    await this.lagosModel.deleteMany({ stateCode: 'LA' });
    await this.lagosModel.insertMany(lagosSamples);

    const nonLagosMethods: Partial<ShippingMethod>[] = [
      {
        code: 'GIGL_STANDARD',
        name: 'GIGL | Wait Time: 3–5 business days. Doorstep delivery available in select locations, others require office pickup.',
        serviceLevel: 'STANDARD',
        applicability: 'NON_LAGOS',
        etaText: 'Ships next business day',
        priceKobo: 1000000, // ₦10,000
        sortOrder: 1,
        isActive: true,
        allowedStateCodes: [],
      },
      {
        code: 'GIGL_GOFASTER',
        name: 'GIGL GoFaster | Wait Time: 1–2 business days',
        serviceLevel: 'EXPRESS',
        applicability: 'NON_LAGOS',
        etaText: 'Ships next day',
        priceKobo: 1800000, // ₦18,000
        sortOrder: 2,
        isActive: true,
        allowedStateCodes: [],
      },
      {
        code: 'AIR_FREIGHT',
        name: 'Air Freight | Same Day Delivery Outside Lagos | Only orders placed before 12 Noon daily can opt for this shipping method',
        serviceLevel: 'SAME_DAY',
        applicability: 'NON_LAGOS',
        etaText: 'Ships next day if ordered after 12 noon (Mon–Sat)',
        priceKobo: 2500000, // ₦25,000
        sortOrder: 3,
        isActive: true,
        allowedStateCodes: [],
      },
    ];

    await this.methodModel.deleteMany({});
    await this.methodModel.insertMany(nonLagosMethods);

    return { ok: true };
  }
}
