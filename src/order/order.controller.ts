import { Controller } from '@nestjs/common';
import { OrdersService } from './order.service';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrdersService) {}
}
