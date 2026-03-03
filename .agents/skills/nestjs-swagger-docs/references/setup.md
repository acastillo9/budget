# Swagger Setup Reference

## Installation

Install required packages:

```bash
npm install @nestjs/swagger swagger-ui-express
```

For Fastify-based apps (check `main.ts` for `FastifyAdapter`):
```bash
npm install @nestjs/swagger @fastify/swagger @fastify/swagger-ui
```

## Bootstrap Configuration

Add Swagger setup to `main.ts` **after** app creation but **before** `app.listen()`.

### Standard Setup (Express)

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Inside bootstrap(), after creating app and configuring pipes/interceptors:
const config = new DocumentBuilder()
  .setTitle('API Title')
  .setDescription('API description')
  .setVersion('1.0')
  .addBearerAuth(
    { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    'JWT',
  )
  .build();

const documentFactory = () => SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, documentFactory, {
  swaggerOptions: {
    persistAuthorization: true,
  },
});
```

### Configuration Decisions

**API path**: Use `'api/docs'` as default. If the app has a global prefix (e.g., `app.setGlobalPrefix('api')`), adjust accordingly.

**Bearer auth name**: Use `'JWT'` as the security scheme name. This must match the name used in `@ApiBearerAuth('JWT')` decorators.

**persistAuthorization**: Set to `true` so the JWT token persists across page refreshes in Swagger UI.

### Environment Gating

Optionally restrict Swagger to non-production environments:

```typescript
if (configService.getOrThrow('NODE_ENV') !== 'production') {
  // Swagger setup here
}
```

Only add this if the user explicitly wants to hide docs in production.

## CLI Plugin (Optional Enhancement)

The `@nestjs/swagger` CLI plugin can auto-infer `@ApiProperty()` decorators from TypeScript types, reducing manual decorator additions on DTOs.

Add to `nest-cli.json`:
```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

With `classValidatorShim: true`:
- `@IsString()` → infers `type: string`
- `@IsNumber()` → infers `type: number`
- `@IsBoolean()` → infers `type: boolean`
- `@IsEnum(X)` → infers `enum: X`
- `@IsOptional()` → infers `required: false`

With `introspectComments: true`:
- JSDoc comments on properties become `description` in the schema

**Trade-off**: The plugin reduces boilerplate but makes documentation implicit. Explicit `@ApiProperty()` decorators provide more control over descriptions, examples, and edge cases. Recommend using **both**: plugin for baseline inference, explicit decorators for descriptions and examples.

**Important**: After enabling the plugin, rebuild the project (`npm run build`) for changes to take effect. The dev server (`npm run start:dev`) will pick it up automatically on restart.
