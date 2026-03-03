import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get()
  getInfo() {
    return {
      name: 'Personal Finance API',
      version: '1.0.4',
      status: 'running',
      commit: process.env.COMMIT_SHA || 'unknown',
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }
}
