/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/common/utils/paginate.util.ts
import { Model, FilterQuery, Document } from 'mongoose';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

export async function paginate<T extends Document>(
  model: Model<T>,
  pagination: PaginationQueryDto,
  filter: FilterQuery<T> = {},
  projection?: any,
  options?: any,
): Promise<PaginatedResult<T>> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 10;
  const skip = (page - 1) * limit;

  let sortOption = undefined as any;
  if ((pagination as any).sortBy) {
    const sortOrder = (pagination as any).sortOrder === 'desc' ? -1 : 1;
    sortOption = { [(pagination as any).sortBy]: sortOrder };
  }

  const [items, totalItems] = await Promise.all([
    model
      .find(filter, projection, options)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .exec(),
    model.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    items: items as T[],
    totalItems,
    totalPages,
    currentPage: page,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// export async function paginateV2<T extends Document>(
//   model: Model<T>,
//   pagination: PaginationQueryDto,
//   filter: FilterQuery<T> = {},
//   projection?: any,
//   options?: any,
// ): Promise<PaginatedResult<T>> {
//   const page = pagination.page ?? 1;
//   const limit = pagination.limit ?? 10;
//   const skip = (page - 1) * limit;

//   const sortOption: Record<string, 1 | -1> = { isTrending: -1 };

//   const sortBy = (pagination as any).sortBy as string | undefined;
//   const sortOrderRaw = (pagination as any).sortOrder as string | undefined;

//   if (sortBy) {
//     const sortOrder: 1 | -1 = sortOrderRaw === 'desc' ? -1 : 1;

//     if (sortBy !== 'isTrending') {
//       sortOption[sortBy] = sortOrder;
//     }
//   }

//   const [items, totalItems] = await Promise.all([
//     model
//       .find(filter, projection, options)
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .exec(),
//     model.countDocuments(filter).exec(),
//   ]);

//   const totalPages = Math.ceil(totalItems / limit) || 1;

//   return {
//     items: items as T[],
//     totalItems,
//     totalPages,
//     currentPage: page,
//     limit,
//     hasNextPage: page < totalPages,
//     hasPrevPage: page > 1,
//   };
// }

// export async function paginateV2<T extends Document>(
//   model: Model<T>,
//   pagination: PaginationQueryDto,
//   filter: FilterQuery<T> = {},
//   projection?: any,
//   options?: any,
// ): Promise<PaginatedResult<T>> {
//   const page = pagination.page ?? 1;
//   const limit = pagination.limit ?? 10;
//   const skip = (page - 1) * limit;

//   // 1) Always prioritize availability, then trending
//   const sortOption: Record<string, 1 | -1> = {
//     // isSoldOut: 1,
//     isAvailable: -1,
//     isTrending: -1,
//   };

//   const sortBy = (pagination as any).sortBy as string | undefined;
//   const sortOrderRaw = (pagination as any).sortOrder as string | undefined;

//   // 2) Optional user-defined sorting as a tie-breaker
//   if (sortBy && sortBy !== 'isAvailable' && sortBy !== 'isTrending') {
//     const sortOrder: 1 | -1 = sortOrderRaw === 'desc' ? -1 : 1;
//     sortOption[sortBy] = sortOrder;
//   }

//   const [items, totalItems] = await Promise.all([
//     model
//       .find(filter, projection, options)
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .exec(),
//     model.countDocuments(filter).exec(),
//   ]);

//   const totalPages = Math.ceil(totalItems / limit) || 1;

//   return {
//     items: items as T[],
//     totalItems,
//     totalPages,
//     currentPage: page,
//     limit,
//     hasNextPage: page < totalPages,
//     hasPrevPage: page > 1,
//   };
// }

export async function paginateV2<T extends Document>(
  model: Model<T>,
  pagination: PaginationQueryDto,
  filter: FilterQuery<T> = {},
  projection?: any,
  options?: any,
): Promise<PaginatedResult<T>> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 10;
  const skip = (page - 1) * limit;

  const sortOption: Record<string, 1 | -1> = {
    isAvailable: -1,
    isTrending: -1,
    isSoldOut: 1,
  };

  const sortBy = (pagination as any).sortBy as string | undefined;
  const sortOrderRaw = (pagination as any).sortOrder as string | undefined;

  if (sortBy && !['isSoldOut', 'isAvailable', 'isTrending'].includes(sortBy)) {
    const sortOrder: 1 | -1 = sortOrderRaw === 'desc' ? -1 : 1;
    sortOption[sortBy] = sortOrder;
  }
  const [items, totalItems] = await Promise.all([
    model
      .find(filter, projection, options)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .exec(),
    model.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    items: items as T[],
    totalItems,
    totalPages,
    currentPage: page,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
