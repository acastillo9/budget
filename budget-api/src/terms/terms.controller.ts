import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TermsService } from './terms.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthenticatedRequest } from 'src/shared/types';
import { ActiveTermsQueryDto } from './dto/active-terms-query.dto';
import { TermsVersionDto } from './dto/terms-version.dto';
import { RecordConsentDto } from './dto/record-consent.dto';
import { UserConsentDto } from './dto/user-consent.dto';
import { ConsentStatusDto } from './dto/consent-status.dto';

@ApiTags('Terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Public()
  @ApiOperation({
    summary: 'Get active terms versions',
    description:
      'Returns all currently active terms versions (ToS and Privacy Policy) for the requested locale.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active terms versions',
    type: [TermsVersionDto],
  })
  @Get('active')
  getActiveTerms(
    @Query() query: ActiveTermsQueryDto,
  ): Promise<TermsVersionDto[]> {
    return this.termsService.getActiveTerms(query.locale);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get consent status',
    description:
      'Check if the authenticated user has accepted all current active terms versions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Consent status with pending and accepted lists',
    type: ConsentStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('consent/status')
  getConsentStatus(
    @Request() req: AuthenticatedRequest,
    @Query() query: ActiveTermsQueryDto,
  ): Promise<ConsentStatusDto> {
    return this.termsService.getConsentStatus(req.user.userId, query.locale);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get consent history',
    description: "Returns the authenticated user's full consent history.",
  })
  @ApiResponse({
    status: 200,
    description: 'List of consent records',
    type: [UserConsentDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('consent/history')
  getConsentHistory(
    @Request() req: AuthenticatedRequest,
  ): Promise<UserConsentDto[]> {
    return this.termsService.getConsentHistory(req.user.userId);
  }

  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Record consent',
    description: 'Record the authenticated user accepting a terms version.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consent recorded',
    type: UserConsentDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Terms version not found' })
  @Post('consent')
  recordConsent(
    @Request() req: AuthenticatedRequest,
    @Body() recordConsentDto: RecordConsentDto,
  ): Promise<UserConsentDto> {
    return this.termsService.recordConsent(
      req.user.userId,
      recordConsentDto.termsVersionId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @ApiOperation({
    summary: 'Get terms version by ID',
    description: 'Returns a specific terms version by its MongoDB ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Terms version ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Terms version details',
    type: TermsVersionDto,
  })
  @ApiResponse({ status: 404, description: 'Terms version not found' })
  @Get(':id')
  getTermsById(@Param('id') id: string): Promise<TermsVersionDto> {
    return this.termsService.getTermsById(id);
  }
}
