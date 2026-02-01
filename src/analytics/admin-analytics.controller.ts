import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TimeSeriesQueryDto } from './dto/timeseries-query.dto';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('all-time')
  getAllTime(@Query() q: AnalyticsQueryDto) {
    return this.analyticsService.getAllTime(q);
  }

  @Get('timeseries')
  timeseries(@Query() q: TimeSeriesQueryDto) {
    return this.analyticsService.getTimeSeries(q);
  }
}
