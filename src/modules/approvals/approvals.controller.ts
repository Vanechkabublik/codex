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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { REVIEWER_ROLES, STAFF_ROLES, Role } from '../users/role.enum';
import {
  OfferCardResponseDto,
  OfferResponseDto,
  ReviewResponseDto,
  ReviewResultDto,
  RoundResponseDto,
  SubmitResponseDto,
} from '../offers/dto/offer-response.dto';
import { CreateReviewDto } from './dto/review.dto';
import { ApprovalQueryService } from './approval-query.service';
import { WorkflowService } from './workflow.service';
@ApiTags('approvals')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('offers')
export class ApprovalsController {
  constructor(
    private readonly workflow: WorkflowService,
    private readonly queries: ApprovalQueryService,
  ) {}
  @Get(':id')
  @ApiOkResponse({ type: OfferCardResponseDto })
  card(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    return this.queries.current(id, actor);
  }
  @Get(':id/current-round')
  @ApiOkResponse({
    type: OfferCardResponseDto,
    description:
      'Current round, decisions, pending roles and launch blockers with offer fields',
  })
  current(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    return this.queries.current(id, actor);
  }
  @Get(':id/rounds')
  @ApiPage(RoundResponseDto)
  rounds(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.queries.rounds(id, query, actor);
  }
  @Get(':id/rounds/:roundId/reviews')
  @ApiOkResponse({ type: [ReviewResponseDto] })
  reviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @CurrentUser() actor: Actor,
  ) {
    return this.queries.reviews(id, roundId, actor);
  }
  @Post(':id/submit')
  @Roles(Role.OFFER_OWNER, Role.ADMIN)
  @ApiCreatedResponse({ type: SubmitResponseDto })
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    return this.workflow.submit(id, actor);
  }
  @Post(':id/rounds/:roundId/reviews')
  @Roles(...REVIEWER_ROLES)
  @ApiCreatedResponse({ type: ReviewResultDto })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roundId', ParseUUIDPipe) roundId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() actor: Actor,
  ) {
    return this.workflow.review(id, roundId, dto, actor);
  }
  @Post(':id/ready-to-launch')
  @HttpCode(200)
  @Roles(Role.OFFER_OWNER, Role.ADMIN)
  @ApiOkResponse({ type: OfferResponseDto })
  ready(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: Actor) {
    return this.workflow.ready(id, actor);
  }
}
