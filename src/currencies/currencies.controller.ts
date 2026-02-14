import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CurrencyRates } from './types';

@ApiTags('Currencies')
@ApiBearerAuth('JWT')
@Controller('currencies')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @ApiOperation({ summary: 'Get exchange rates for a currency' })
  @ApiParam({
    name: 'currencyCode',
    description: 'Base currency code',
    example: 'USD',
  })
  @ApiResponse({
    status: 200,
    description: 'Exchange rates for the given currency',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get(':currencyCode')
  async getExchangeRate(
    @Param('currencyCode') currencyCode: string,
  ): Promise<CurrencyRates> {
    return this.currenciesService.getExchangeRate(currencyCode);
  }
}
