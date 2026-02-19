import { PartialType } from '@nestjs/swagger';
import { CreateAuthenticationProviderDto } from './create-authentication-provider.dto';

export class UpdateAuthenticationProviderDto extends PartialType(
  CreateAuthenticationProviderDto,
) {}
