import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Actor,
  Roles,
} from '../../common/decorators/auth.decorators';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Role } from './role.enum';
import { UsersService } from './users.service';
import { ApiPage } from '../../common/decorators/api-page.decorator';
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('me')
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() user: Actor) {
    return this.users.get(user.id);
  }
  @Get()
  @Roles(Role.ADMIN)
  @ApiPage(UserResponseDto)
  list(@Query() query: PaginationDto) {
    return this.users.list(query);
  }
}
