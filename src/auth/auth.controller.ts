import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedRequest, UserSession } from 'src/shared/types';
import { Session } from './types';
import { UserDto } from 'src/shared/dto/user.dto';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { ActivationDto } from './dto/activation.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Log in a user.
   * @param req The request object.
   * @returns The session created.
   * @async
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@Request() req: AuthenticatedRequest): Promise<Session> {
    return this.authService.login(req.user);
  }

  /**
   * Register a new user.
   * @param registerDto The data to register the user.
   * @returns The user created.
   * @async
   */
  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<UserDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Get the profile of the user.
   * @param req The request object.
   * @returns The user profile.
   * @async
   */
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest): UserSession {
    return req.user;
  }

  /**
   * Check if the user exists.
   * @param req The request object.
   * @returns True if the user exists, false otherwise.
   * @async
   */
  @Public()
  @Get('email-registered')
  exists(@Query('email') email: string): Promise<EmailRegisteredDto> {
    return this.authService.emailRegistered(email);
  }

  /**
   * Activate a user account.
   * @param activationDto The data to activate the user account.
   * @returns The user activated.
   * @async
   */
  @Public()
  @Post('activate-account')
  activateAccount(@Body() activationDto: ActivationDto): Promise<UserDto> {
    return this.authService.activate(activationDto);
  }
}
