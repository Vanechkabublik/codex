import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  Actor,
  CurrentUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { Role } from '../users/role.enum';
import { StorefrontResponseDto } from './dto/storefront-response.dto';
import { StorefrontService } from './storefront.service';
@ApiTags('storefront')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}
  @Get()
  @ApiOkResponse({ type: StorefrontResponseDto })
  get(@CurrentUser() actor: Actor) {
    return this.storefront.get(actor.id);
  }
}
