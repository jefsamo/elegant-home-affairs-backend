import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.admin.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles('admin')
  overview() {
    return this.dashboardService.getOverview();
  }
  @Get('overviews')
  @Roles('admin')
  overviewV2() {
    return this.dashboardService.getOverview();
  }
}
