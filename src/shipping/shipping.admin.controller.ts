import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CreateLagosOptionDto,
  CreateShippingMethodDto,
  UpdateLagosOptionDto,
  UpdateShippingMethodDto,
  UpsertStateDto,
} from './dto/admin.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ShippingAdminService } from './shipping.admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class ShippingAdminController {
  constructor(private readonly admin: ShippingAdminService) {}

  @Get('states')
  listStates() {
    return this.admin.listStates();
  }

  @Post('states')
  upsertState(@Body() dto: UpsertStateDto) {
    return this.admin.upsertState(dto);
  }

  @Delete('states/:code')
  deleteState(@Param('code') code: string) {
    return this.admin.deleteState(code);
  }

  @Get('lagos-options')
  listLagos(
    @Query('isActive') isActive?: string,
    @Query('groupName') groupName?: string,
  ) {
    return this.admin.listLagosOptions({
      isActive: isActive === undefined ? undefined : isActive === 'true',
      groupName,
    });
  }

  @Post('lagos-options')
  createLagos(@Body() dto: CreateLagosOptionDto) {
    return this.admin.createLagosOption(dto);
  }

  @Patch('lagos-options/:id')
  updateLagos(@Param('id') id: string, @Body() dto: UpdateLagosOptionDto) {
    return this.admin.updateLagosOption(id, dto);
  }

  @Delete('lagos-options/:id')
  deleteLagos(@Param('id') id: string) {
    return this.admin.deleteLagosOption(id);
  }

  @Get('shipping-methods')
  listMethods(
    @Query('isActive') isActive?: string,
    @Query('applicability') applicability?: 'NON_LAGOS' | 'ALL',
  ) {
    return this.admin.listShippingMethods({
      isActive: isActive === undefined ? undefined : isActive === 'true',
      applicability,
    });
  }

  @Post('shipping-methods')
  createMethod(@Body() dto: CreateShippingMethodDto) {
    return this.admin.createShippingMethod(dto);
  }

  @Patch('shipping-methods/:id')
  updateMethod(@Param('id') id: string, @Body() dto: UpdateShippingMethodDto) {
    return this.admin.updateShippingMethod(id, dto);
  }

  @Delete('shipping-methods/:id')
  deleteMethod(@Param('id') id: string) {
    return this.admin.deleteShippingMethod(id);
  }
}
