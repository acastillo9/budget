import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedRequest } from 'src/shared/types';
import { GoogleAuthenticatedRequest, Credentials } from './types';
import { EmailRegisteredDto } from './dto/email-registered.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { EmailDto } from './dto/email.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { ResendActivationCodeDto } from './dto/resend-activation-code.dto';
import { LoginDto } from './dto/login.dto';
import { CredentialsDto } from './dto/credentials.dto';
import { GoogleOAuthGuard } from './google-oauth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { AuthenticationProviderType } from './entities/authentication-provider-type.enum';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UserDto } from 'src/users/dto/user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * Check if the user exists.
   * @param req The request object.
   * @returns True if the user exists, false otherwise.
   * @async
   */
  @Public()
  @ApiOperation({ summary: 'Check if an email is already registered' })
  @ApiQuery({
    name: 'email',
    description: 'Email address to check',
    example: 'alice@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Email registration status',
    type: EmailRegisteredDto,
  })
  @Get('email-registered')
  isEmailRegistered(
    @Query('email') email: string,
  ): Promise<EmailRegisteredDto> {
    return this.authService.isEmailRegistered(email);
  }

  /**
   * Register a new user by email.
   * @param registerDto The data to register the user.
   * @returns The user created.
   * @async
   */
  @Public()
  @ApiOperation({
    summary: 'Register a new user by email',
    description:
      'Creates a new user account and sends an activation code via email. The user status is set to UNVERIFIED.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered. Activation code sent via email.',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error — invalid or missing fields',
  })
  @Post('register')
  register(
    @Body() registerDto: RegisterDto,
    @Headers('Accept-Language') acceptLanguage: string,
  ): Promise<RegisterResponseDto> {
    const locale = acceptLanguage ? acceptLanguage.split(',')[0] : 'en-US';
    return this.authService.registerByEmail(registerDto, locale);
  }

  /**
   * Resend the activation email.
   * @param emailDto The email to resend the activation email.
   * @returns The response of the resend.
   * @async
   */
  @Public()
  @ApiOperation({ summary: 'Resend the activation code email' })
  @ApiResponse({
    status: 201,
    description: 'Activation code resent',
    type: ResendActivationCodeDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid email' })
  @Post('resend-activation-code')
  resendActivationCode(
    @Body() emailDto: EmailDto,
  ): Promise<ResendActivationCodeDto> {
    return this.authService.resendActivationCode(emailDto.email);
  }

  /**
   * Verify the email of the user.
   * @param verifyEmailDto The data to verify the email.
   * @returns The session created.
   * @async
   */
  @Public()
  @ApiOperation({
    summary: 'Verify email with activation code',
    description:
      'Validates the activation code sent via email. On success, transitions the user to VERIFIED_NO_PASSWORD and returns a set-password token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Email verified. Returns credentials with set-password token.',
    type: CredentialsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid activation code',
  })
  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto): Promise<Credentials> {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  /**
   * Set the password of the user.
   * @param setPasswordDto The data to set the password.
   * @returns The session created.
   * @async
   */
  @Public()
  @ApiOperation({
    summary: 'Set password for a verified user',
    description:
      'Sets the password using the token from email verification. Transitions user to ACTIVE and returns JWT credentials.',
  })
  @ApiParam({
    name: 'token',
    description: 'Set-password JWT token from email verification',
  })
  @ApiResponse({
    status: 201,
    description: 'Password set. Returns access and refresh tokens.',
    type: CredentialsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid/expired token',
  })
  @Post('set-password/:token')
  setPassword(
    @Param('token') token: string,
    @Body() passwordDto: SetPasswordDto,
  ): Promise<Credentials> {
    return this.authService.setPassword(token, passwordDto.password);
  }

  /**
   * Log in a user.
   * @param req The request object.
   * @param loginDto The data to log in the user.
   * @returns The session created.
   * @async
   */
  @Public()
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful. Returns access and refresh tokens.',
    type: CredentialsDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Body() loginDto: LoginDto): Promise<Credentials> {
    return this.authService.login(
      AuthenticationProviderType.EMAIL,
      loginDto.email,
      loginDto.rememberMe,
    );
  }

  /**
   * Get the user profile.
   * @param req The request object.
   * @returns The user profile.
   * @async
   */
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT token',
  })
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.authId);
  }

  /**
   * Log out the user.
   * @param req The request object.
   * @returns The response of the logout.
   * @async
   */
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Logout the authenticated user',
    description: 'Invalidates the refresh token for the current session.',
  })
  @ApiResponse({ status: 201, description: 'Logout successful' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid JWT token',
  })
  @Post('logout')
  logout(@Req() req: AuthenticatedRequest) {
    this.authService.logout(req.user.authId);
  }

  /**
   * Refresh the access token.
   * @param req The request object.
   * @returns The new access token.
   * @async
   */
  @Public()
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Refresh the access token',
    description:
      'Uses the refresh token (sent as Bearer token) to issue a new access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'New access token issued',
    type: CredentialsDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @Get('refresh')
  @UseGuards(JwtRefreshGuard)
  refreshTokens(@Req() req: AuthenticatedRequest) {
    const authId = req.user.authId;
    const refreshToken = req.user.refreshToken;
    const isLongLived = req.user.isLongLived;
    return this.authService.refreshTokens(authId, refreshToken, isLongLived);
  }

  /**
   * Forgot password.
   * @param emailDto The email to send the forgot password email.
   * @returns The response of the forgot password.
   * @async
   */
  @Public()
  @ApiOperation({
    summary: 'Request a password reset email',
    description:
      'Sends a set-password email with a reset token if the email is registered.',
  })
  @ApiResponse({
    status: 201,
    description: 'Password reset email sent (if email exists)',
  })
  @ApiResponse({ status: 400, description: 'Validation error — invalid email' })
  @Post('forgot-password')
  forgotPassword(@Body() emailDto: EmailDto): Promise<void> {
    return this.authService.forgotPassword(emailDto.email);
  }

  /**
   * Verify the reset password token.
   * @param token The reset password token.
   * @returns True if the token is valid, false otherwise.
   * @async
   */
  @Public()
  @ApiOperation({ summary: 'Verify a set-password token is valid' })
  @ApiParam({
    name: 'token',
    description: 'Set-password JWT token from the reset email',
  })
  @ApiResponse({
    status: 200,
    description: 'Token validity check result',
    type: Boolean,
  })
  @Get('verify-set-password-token/:token')
  verifySetPasswordToken(@Param('token') token: string): Promise<boolean> {
    return this.authService.validateResetPasswordToken(token);
  }

  /**
   * Google OAuth.
   * @async
   */
  @Public()
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description: 'Redirects the user to the Google consent screen.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth consent screen',
  })
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {}

  /**
   * Google OAuth redirect.
   * @param req The request object.
   * @param res The response object.
   * @async
   */
  @Public()
  @ApiExcludeEndpoint()
  @Get('google-redirect')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(
    @Req() req: GoogleAuthenticatedRequest,
    @Res() res: Response,
    @Headers('Accept-Language') acceptLanguage: string,
  ) {
    if (!req.user) {
      throw new HttpException('Login fail', HttpStatus.BAD_REQUEST);
    }

    const googleLogin: GoogleLoginDto = {
      id: req.user.sub,
      email: req.user.email,
      displayName: req.user.displayName,
      picture: req.user.picture,
    };

    const locale =
      req.user.locale || acceptLanguage
        ? acceptLanguage.split(',')[0]
        : 'en-US';

    const session: Credentials = await this.authService.googleLogin(
      googleLogin,
      locale,
    );

    return res.redirect(
      301,
      `${this.configService.getOrThrow('GOOGLE_CLIENT_CALLBACK_URL')}?access_token=${session.access_token}&refresh_token=${session.refresh_token}`,
    );
  }
}
