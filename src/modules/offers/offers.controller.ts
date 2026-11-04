import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Actor,
  CurrentUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { ApiPage } from '../../common/decorators/api-page.decorator';
import { STAFF_ROLES, Role } from '../users/role.enum';
import {
  OfferEventResponseDto,
  OfferResponseDto,
} from './dto/offer-response.dto';
import { SaveOfferDto, OfferListDto } from './dto/offer.dto';
import { OffersService } from './offers.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
@ApiTags('offers')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}
  @Post()
  @Roles(Role.OFFER_OWNER, Role.ADMIN)
  @ApiCreatedResponse({ type: OfferResponseDto })
  create(@Body() dto: SaveOfferDto, @CurrentUser() actor: Actor) {
    return this.offers.create(dto, actor);
  }
  @Get()
  @ApiPage(OfferResponseDto)
  list(@Query() query: OfferListDto, @CurrentUser() actor: Actor) {
    return this.offers.list(query, actor);
  }
  @Patch(':id')
  @Roles(Role.OFFER_OWNER, Role.ADMIN)
  @ApiOkResponse({ type: OfferResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveOfferDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.offers.update(id, dto, actor);
  }
  @Get(':id/history')
  @ApiPage(OfferEventResponseDto)
  history(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.offers.history(id, query, actor);
  }
}
