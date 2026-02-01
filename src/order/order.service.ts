/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/orders/orders.service.ts
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, FilterQuery, Model, Types } from 'mongoose';
import { Order } from './entities/order.entity';
import { Product } from 'src/product/schemas/product.schema';

import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaystackService } from 'src/payment/payment.service';
import { Payment } from 'src/payment/dto/payment.schema';
import { RefundOrderDto } from './entities/refund-order.dto';
import { DiscountService } from 'src/discount/discount.service';
import { User } from 'src/users/schemas/user.schema';
import { AdminCreateOrderDto } from './dto/admin-create-order.dto';
import { AdminInitPaystackDto } from './dto/admin-init-paystack.dto';
import { InitializePaymentDto } from 'src/payment/dto/initialize-payment.dto';

export type PaginatedOrders = {
  items: Order[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectConnection() private connection: Connection,
    @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
    @Inject(forwardRef(() => PaystackService))
    private readonly paystack: PaystackService,
    private readonly discountService: DiscountService,
  ) {}

  private async decrementStockForOrderItems(
    items: { productId: string; quantity: number }[],
    session: any,
  ) {
    for (const item of items) {
      const prod: any = await this.productModel
        .findById(item.productId)
        .session(session);

      if (!prod)
        throw new BadRequestException(`Product not found: ${item.productId}`);

      if (prod.kind === 'single') {
        // deduct directly
        const ok = await this.productModel.updateOne(
          { _id: prod._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (ok.modifiedCount !== 1) {
          throw new BadRequestException(`Insufficient stock for ${prod.name}`);
        }
      }

      if (prod.kind === 'combo') {
        // load components and deduct from each component product stock
        if (!prod.components?.length) {
          throw new BadRequestException(
            `Combo has no components: ${prod.name}`,
          );
        }

        for (const c of prod.components) {
          const needed = (c.quantity ?? 1) * item.quantity;

          const ok = await this.productModel.updateOne(
            { _id: c.productId, stock: { $gte: needed } },
            { $inc: { stock: -needed } },
            { session },
          );

          if (ok.modifiedCount !== 1) {
            throw new BadRequestException(
              `Insufficient stock for combo component`,
            );
          }
        }
      }
    }
  }
  async createFromPayment({
    userId,
    reference,
    amount,
    cart,
    delivery,
    discount = null,
    shippingFee = 0,
    shippingMethod = 'ship',
  }: {
    userId: string;
    reference: string;
    amount: number;
    cart: { productId: string; quantity: number; price: number }[];
    delivery: any;
    discount?: { discountId: string; code: string; percentage: number } | null;
    shippingFee?: number;
    shippingMethod?: 'pickup' | 'ship';
  }) {
    const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const shipping = shippingMethod === 'pickup' ? 0 : shippingFee;

    const discountPct = discount?.percentage ?? 0;
    const discountAmount = Math.round((subtotal * discountPct) / 100);

    // if your intent is "subtotal + shipping - discount"
    const total = Math.max(subtotal + shipping - discountAmount, 0);

    const totalAfterDiscount = total - discountAmount;
    const totalAndDiscountPlusShipping = total + shipping + discountAmount;

    const payload = {
      userId,
      items: cart,
      subtotal,
      shipping,
      discountId: discount?.discountId ?? null,
      discountCode: discount?.code ?? null,
      discountPercentage: discountPct,
      discountAmount,
      totalAfterDiscount,
      totalAndDiscountPlusShipping,
      total,
      paymentReference: reference,
      paymentStatus: 'paid' as const,
      delivery,
      deliveryMode: shippingMethod,
    };

    if (total !== amount) {
      return this.orderModel.create({
        ...payload,
        orderStatus: 'needs_review',
      });
    }

    return this.orderModel.create({
      ...payload,
      orderStatus: 'processing',
    });
  }

  // async findPaginated(args: {
  //   query: OrderQueryDto;
  //   userId?: string;
  // }): Promise<PaginatedOrders> {
  //   const { query, userId } = args;

  //   const page = Number(query.page ?? 1);
  //   const limit = Number(query.limit ?? 10);
  //   const skip = (page - 1) * limit;

  //   const filter: FilterQuery<Order> = {};

  //   if (userId) filter.userId = userId as any;

  //   if (query.status) filter.orderStatus = query.status;

  //   if (query.search?.trim()) {
  //     const s = query.search.trim();
  //     filter.$or = [
  //       { paymentReference: { $regex: s, $options: 'i' } },
  //       { 'delivery.email': { $regex: s, $options: 'i' } },
  //       { 'delivery.phone': { $regex: s, $options: 'i' } },
  //       { _id: { $regex: s, $options: 'i' } as any },
  //     ];
  //   }

  //   const sortBy = query.sortBy?.trim() || 'createdAt';
  //   const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  //   const sortOption = { [sortBy]: sortOrder } as any;

  //   const [items, totalItems] = await Promise.all([
  //     this.orderModel
  //       .find(filter)
  //       .sort(sortOption)
  //       .skip(skip)
  //       .limit(limit)
  //       .exec(),
  //     this.orderModel.countDocuments(filter).exec(),
  //   ]);

  //   const totalPages = Math.ceil(totalItems / limit) || 1;

  //   return {
  //     items,
  //     totalItems,
  //     totalPages,
  //     currentPage: page,
  //     limit,
  //     hasNextPage: page < totalPages,
  //     hasPrevPage: page > 1,
  //   };
  // }

  async findPaginated(args: {
    query: OrderQueryDto;
    userId?: string;
  }): Promise<PaginatedOrders> {
    const { query, userId } = args;

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const filter: FilterQuery<Order> = {};

    if (userId) filter.userId = userId as any;
    if (query.status) filter.orderStatus = query.status;

    if (query.search?.trim()) {
      const s = query.search.trim();
      const re = new RegExp(escapeRegExp(s), 'i');

      const or: FilterQuery<Order>[] = [
        { paymentReference: re as any },
        { 'delivery.email': re as any },
        { 'delivery.firstName': re as any },
        { 'delivery.lastName': re as any },
        { 'delivery.phone': re as any },
      ];

      // Only add _id match if user typed a valid ObjectId
      if (Types.ObjectId.isValid(s)) {
        or.push({ _id: new Types.ObjectId(s) } as any);
      }

      filter.$or = or as any;
    }

    const sortBy = query.sortBy?.trim() || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sortOption = { [sortBy]: sortOrder } as any;

    const [items, totalItems] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findById(
    orderId: string,
    currentUser: { userId: string; roles: string[] },
  ) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    const isAdmin = currentUser.roles?.includes('admin');
    if (!isAdmin && String(order.userId) !== currentUser.userId) {
      throw new ForbiddenException('Not allowed to view this order');
    }

    return order;
  }

  /**
   * Admin updates status
   */
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    order.orderStatus = dto.orderStatus;
    await order.save();

    return order;
  }

  async cancel(orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    if (['shipped', 'delivered', 'refunded'].includes(order.orderStatus)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    order.orderStatus = 'cancelled';
    await order.save();

    return order;
  }

  /**
   * Refund (admin):
   * - calls Paystack refund
   * - updates orderStatus/paymentStatus
   */
  async refund(orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');

    if (!order.paymentReference) {
      throw new BadRequestException('Order has no payment reference');
    }

    if (order.orderStatus === 'refunded') {
      throw new BadRequestException('Order already refunded');
    }

    const paid =
      order.paymentStatus === 'paid' || order.paymentStatus === 'success';
    if (!paid) throw new BadRequestException('Order is not paid');

    // Paystack expects transaction reference/id in "transaction" :contentReference[oaicite:2]{index=2}
    await this.paystack.refundTransaction({
      transaction: order.paymentReference,
      // amount: optional for partial refund (in kobo)
    });

    order.orderStatus = 'refunded';
    order.paymentStatus = 'refunded';
    await order.save();

    return {
      status: 'success',
      message: 'Refund initiated',
      order,
    };
  }

  async refundOrder(args: {
    orderId: string;
    adminUserId: string;
    dto: RefundOrderDto;
  }) {
    const { orderId, dto } = args;

    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const paid =
      order.paymentStatus === 'paid' || order.paymentStatus === 'success';

    if (!paid) throw new BadRequestException('Order is not paid');

    if (order.orderStatus === 'refunded') {
      throw new BadRequestException('Order already refunded');
    }

    if (order.orderStatus === 'cancelled') {
      throw new BadRequestException('Cancelled order cannot be refunded here');
    }

    const txRef = order.paymentReference;
    if (!txRef)
      throw new BadRequestException('Missing payment reference on order');

    // If you support partial refunds, validate amount
    if (dto.amount != null && dto.amount > order.total) {
      throw new BadRequestException('Refund amount cannot exceed order total');
    }

    // Call Paystack refund
    const refundResp = await this.paystack.createRefund({
      transaction: txRef,
      amount: dto.amount, // optional: full refund if omitted
      customer_note: dto.customerNote,
      merchant_note: dto.merchantNote,
    });

    const refundData = refundResp?.data ?? {};
    // Paystack returns a refund object; reference can be refund reference
    const refundReference = refundData?.reference; // usually refund reference
    const refundStatus = refundData?.status;

    // Update order
    order.orderStatus = 'refunded' as any;
    // Keep your paymentStatus consistent (optional):
    order.paymentStatus = 'refunded' as any;

    order.refund = {
      provider: 'paystack',
      refundReference,
      transactionReference: txRef,
      amount: refundData?.amount ?? dto.amount ?? order.total,
      status: refundStatus ?? 'pending',
      customerNote: dto.customerNote,
      merchantNote: dto.merchantNote,
      initiatedAt: new Date(),
      raw: refundData,
    };

    await order.save();

    // Update payment record too (best effort)
    await this.paymentModel.updateOne(
      { reference: txRef, userId: order.userId },
      {
        status: 'refunded',
        refund: {
          refundReference,
          amount: refundData?.amount ?? dto.amount ?? order.total,
          status: refundStatus ?? 'pending',
          initiatedAt: new Date(),
          raw: refundData,
        },
      },
    );

    return {
      status: 'success',
      message: 'Refund initiated',
      order: order.toObject(),
      refund: refundData,
    };
  }

  async adminCreateOrder(dto: AdminCreateOrderDto, adminId: string) {
    // 1) Load user exists
    // const user = await this.userModel.findById(dto.userId).lean();
    // if (!user) throw new NotFoundException('User not found');

    // 2) Fetch products for pricing
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .select('_id price stock name')
      .lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    // 3) Build final items with DB price
    const items = dto.items.map((i) => {
      const p = byId.get(i.productId);
      if (!p)
        throw new BadRequestException(`Invalid productId: ${i.productId}`);
      if (i.quantity < 1)
        throw new BadRequestException('Quantity must be >= 1');
      if (p.stock < i.quantity)
        throw new BadRequestException(`Insufficient stock for ${p.name}`);

      return {
        productId: i.productId,
        quantity: i.quantity,
        price: p.price, // in kobo in your system
      };
    });

    // 4) Compute subtotal/shipping/discount/total
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const shipping = Math.max(Number(dto.shippingKobo ?? 0), 0);

    let discountPercentage = 0;
    let discountAmount = 0;
    let discountId: string | undefined;
    let discountCode: string | undefined;

    if (dto.discountCode?.trim()) {
      const disc = await this.discountService.validate(dto.discountCode.trim());
      discountPercentage = disc.percentage;
      discountId = disc.discountId;
      discountCode = disc.code;
      discountAmount = Math.round((subtotal * discountPercentage) / 100);
    }

    const totalAfterDiscount = Math.max(subtotal - discountAmount, 0);
    const total = Math.max(totalAfterDiscount + shipping, 0);

    // 5) Reference: if manual/unpaid, still generate a unique reference for tracking
    const paymentReference =
      dto.paymentProvider === 'paystack'
        ? `ADM_${Date.now()}_${Math.random().toString(16).slice(2)}`
        : `MAN_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    // 6) Create order
    const order = await this.orderModel.create({
      userId: dto.userId ?? null,
      createdBy: adminId,
      source: 'admin',

      items,

      subtotal,
      shipping,
      total,
      totalAfterDiscount,
      totalAndDiscountPlusShipping: total,

      paymentReference,
      paymentProvider: dto.paymentProvider,
      paymentStatus: dto.paymentStatus,
      orderStatus: 'processing',

      delivery: dto.delivery,
      shippingMethod: dto.deliveryMode,

      discountId,
      discountCode,
      discountPercentage,
      discountAmount,

      adminNote: dto.adminNote ?? null,
    });

    // 7) Reduce stock (transaction recommended)
    // If you’re on Mongo replica set, use session transaction:
    await Promise.all(
      items.map((it) =>
        this.productModel.updateOne(
          { _id: it.productId },
          { $inc: { stock: -it.quantity } },
        ),
      ),
    );

    return order;
  }

  async adminCreatePaystackLink(
    dto: AdminInitPaystackDto,
    adminId: string,
    dto2: InitializePaymentDto,
  ) {
    // 1) compute items from DB (never trust price from client)
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .select('_id price stock name')
      .lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));

    const items = dto.items.map((i) => {
      const p = byId.get(i.productId);
      if (!p)
        throw new BadRequestException(`Invalid productId: ${i.productId}`);
      if (i.quantity < 1)
        throw new BadRequestException('Quantity must be >= 1');
      if (p.stock < i.quantity)
        throw new BadRequestException(`Insufficient stock for ${p.name}`);
      return { productId: i.productId, quantity: i.quantity, price: p.price };
    });

    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const shipping =
      dto.deliveryMode === 'pickup'
        ? 0
        : Math.max(Number(dto.shippingKobo || 0), 0);

    // 2) optional discount (validate server-side)
    let discountAmount = 0;
    let discountPercentage = 0;
    let discountId: string | undefined;
    let discountCode: string | undefined;

    if (dto.discountCode?.trim()) {
      const disc = await this.discountService.validate(dto.discountCode.trim());
      discountPercentage = disc.percentage;
      discountId = disc.discountId;
      discountCode = disc.code;
      discountAmount = Math.round((subtotal * discountPercentage) / 100);
    }

    const totalAfterDiscount = Math.max(subtotal - discountAmount, 0);
    const total = Math.max(totalAfterDiscount + shipping, 0);

    // 3) Create the order FIRST (unpaid)
    const order = await this.orderModel.create({
      customerEmail: dto.customerEmail.trim().toLowerCase(),

      // if you still keep userId required, make it optional OR store a dummy guest user id
      // userId: ...

      createdBy: adminId,
      source: 'admin',

      items,
      subtotal,
      shipping,
      total,
      totalAfterDiscount,
      totalAndDiscountPlusShipping: total,

      paymentStatus: 'unpaid',
      orderStatus: 'processing',

      delivery: dto.delivery,
      shippingMethod: dto.deliveryMode,

      discountId,
      discountCode,
      discountPercentage,
      discountAmount,

      adminNote: dto.adminNote ?? null,
    });

    // 4) Initialize Paystack using TOTAL (kobo)
    const init = await this.paystack.initializePaystackV2('', dto2);

    // 5) Save reference + link on the order
    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentReference: init.reference,
          paystackAccessCode: init.access_code,
          paystackAuthorizationUrl: init.authorization_url,
        },
      },
    );

    return {
      orderId: String(order._id),
      reference: init.reference,
      authorizationUrl: init.authorization_url,
    };
  }
}
