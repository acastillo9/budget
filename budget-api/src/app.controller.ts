import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getInfo() {
    return {
      name: 'Personal Finance API',
      version: '1.0.0',
      status: 'running',
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}
