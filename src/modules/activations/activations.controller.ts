import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  Actor,
  CurrentUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { ApiPage } from '../../common/decorators/api-page.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Role } from '../users/role.enum';
import {
  ActivatedOfferDto,
  ActivationResponseDto,
} from './dto/activation-response.dto';
import { ActivationsService } from './activations.service';
@ApiTags('activations')
@ApiBearerAuth()
@Roles(Role.CLIENT)
@Controller()
export class ActivationsController {
  constructor(private readonly activations: ActivationsService) {}
  @Put('offers/:id/activation')
  @ApiOkResponse({ type: ActivationResponseDto })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.activations.activate(id, actor.id);
  }
  @Get('activations')
  @ApiPage(ActivatedOfferDto)
  list(@CurrentUser() actor: Actor, @Query() query: PaginationDto) {
    return this.activations.list(actor.id, query);
  }
}
