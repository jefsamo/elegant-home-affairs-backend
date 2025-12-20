// src/products/combo.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ComboService } from './combo.service';
import { CreateComboDto } from './dto/create-combo.dto';

@Controller('combos')
export class ComboController {
  constructor(private readonly comboService: ComboService) {}

  @Post()
  create(@Body() dto: CreateComboDto) {
    // protect as admin if needed
    return this.comboService.createCombo(dto);
  }

  @Get()
  list() {
    return this.comboService.listCombos();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.comboService.getCombo(id);
  }

  @Get(':id/availability')
  availability(@Param('id') id: string) {
    return this.comboService.getComboAvailability(id);
  }
}
