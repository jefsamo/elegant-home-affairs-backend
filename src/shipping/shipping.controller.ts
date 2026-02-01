import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';

import { GetShippingOptionsDto } from './dto/get-options.dto';
import { ResolveShippingCostDto } from './dto/resolve-cost.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
// import { EitherAuthGuard } from 'src/common/guards/either-auth.guard';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('locations/states')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  // @UseGuards(EitherAuthGuard)
  getStates() {
    return this.shippingService.getStates();
  }

  @Get('shipping/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'admin')
  // @UseGuards(EitherAuthGuard)
  getOptions(@Query() query: GetShippingOptionsDto) {
    return this.shippingService.getOptionsByState(query.stateCode);
  }

  @Post('shipping/resolve')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('customer', 'admin')
  resolve(@Body() body: ResolveShippingCostDto) {
    return this.shippingService.resolveCost(body.stateCode, {
      lagosOptionId: body.lagosOptionId,
      shippingMethodId: body.shippingMethodId,
    });
  }

  // DEV ONLY (remove later)
  @Post('dev/seed-shipping')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  seed() {
    return this.shippingService.seedDevData();
  }
}
