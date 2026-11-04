import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/auth.decorators';

class LivenessResponse {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';
}

class ReadinessResponse extends LivenessResponse {
  @ApiProperty({ enum: ['up'] })
  database!: 'up';
}

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOkResponse({ type: LivenessResponse })
  live(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOkResponse({ type: ReadinessResponse })
  @ApiServiceUnavailableResponse({ description: 'PostgreSQL is unavailable' })
  ready(): Promise<ReadinessResponse> {
    return this.healthService.checkDatabase();
  }
}
