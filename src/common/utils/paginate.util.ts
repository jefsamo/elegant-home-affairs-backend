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
