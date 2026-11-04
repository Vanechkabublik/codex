import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
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
import { CreatePurchaseDto } from './dto/purchase.dto';
import {
  PurchaseResponseDto,
  PurchaseResultDto,
} from './dto/purchase-response.dto';
import { PurchasesService } from './purchases.service';
@ApiTags('purchases')
@ApiBearerAuth()
@Roles(Role.CLIENT, Role.ADMIN)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}
  @Post()
  @HttpCode(200)
  @Roles(Role.CLIENT)
  @ApiOkResponse({
    type: PurchaseResultDto,
    description:
      'Idempotent demonstration purchase processing, including persisted business declines',
  })
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() actor: Actor) {
    return this.purchases.create(dto, actor);
  }
  @Get()
  @ApiPage(PurchaseResponseDto)
  list(@Query() query: PaginationDto, @CurrentUser() actor: Actor) {
    return this.purchases.list(actor, query);
  }
  @Get(':id')
  @ApiOkResponse({ type: PurchaseResultDto })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    return this.purchases.get(id, actor);
  }
}
