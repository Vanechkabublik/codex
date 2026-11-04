import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Actor,
  CurrentUser,
  Public,
} from '../../common/decorators/auth.decorators';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, TokenResponseDto } from './dto/auth.dto';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponseDto })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ type: TokenResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }
  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiNoContentResponse()
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }
  @Get('me')
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() actor: Actor) {
    return this.users.get(actor.id);
  }
}
