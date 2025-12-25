/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get()
  findAll() {
    // return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { userId: string }) {
    console.log(user);
    return this.usersService.getMe(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    console.log(id);
    // return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'customer')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.usersService.updateProfile(id, updateUserDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    console.log(id);
    // return this.usersService.remove(+id);
  }
}
