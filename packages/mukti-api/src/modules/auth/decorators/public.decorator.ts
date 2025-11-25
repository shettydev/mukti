import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes as public.
 * Used by JwtAuthGuard to skip authentication.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator that marks a route as public, bypassing authentication.
 *
 * @returns Method or class decorator
 *
 * @remarks
 * This decorator:
 * - Allows routes to be accessed without JWT authentication
 * - Works with JwtAuthGuard when applied globally
 * - Useful for public endpoints like health checks, registration, login
 * - Can be applied to controllers (all routes) or individual methods
 *
 * When JwtAuthGuard is applied globally, use @Public() to exempt specific
 * routes from authentication requirements.
 *
 * @example
 * ```typescript
 * // Public authentication endpoints
 * @Controller('auth')
 * export class AuthController {
 *   @Public()
 *   @Post('register')
 *   register(@Body() dto: RegisterDto) {
 *     return this.authService.register(dto);
 *   }
 *
 *   @Public()
 *   @Post('login')
 *   login(@Body() dto: LoginDto) {
 *     return this.authService.login(dto);
 *   }
 *
 *   // This route requires authentication (no @Public())
 *   @Get('me')
 *   getProfile(@CurrentUser() user: User) {
 *     return user;
 *   }
 * }
 *
 * // Public health check
 * @Controller('health')
 * export class HealthController {
 *   @Public()
 *   @Get()
 *   check() {
 *     return { status: 'ok' };
 *   }
 * }
 *
 * // Controller-level (all routes public)
 * @Public()
 * @Controller('docs')
 * export class DocsController {
 *   // All routes are public
 * }
 *
 * // Mixed public and protected routes
 * @Controller('posts')
 * export class PostsController {
 *   // Public - anyone can view
 *   @Public()
 *   @Get()
 *   findAll() {}
 *
 *   // Public - anyone can view
 *   @Public()
 *   @Get(':id')
 *   findOne(@Param('id') id: string) {}
 *
 *   // Protected - requires authentication
 *   @Post()
 *   create(@CurrentUser() user: User, @Body() dto: CreatePostDto) {}
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
