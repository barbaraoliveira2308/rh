import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { KeycloakService } from './keycloak.service';

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(
    configService: ConfigService,
    private readonly keycloakService: KeycloakService,
  ) {
    const baseUrl = configService.get<string>('KEYCLOAK_BASE_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'hr-suite');
    const clientId = configService.get<string>('KEYCLOAK_CLIENT_ID', 'srh-backend');
    const clientSecret = configService.get<string>('KEYCLOAK_CLIENT_SECRET', 'srh-backend-secret');
    const callbackUrl = configService.get<string>('KEYCLOAK_CALLBACK_URL', 'http://localhost:3000/auth/sso/callback');

    super({
      authorizationURL: `${baseUrl}/realms/${realm}/protocol/openid-connect/auth`,
      tokenURL: `${baseUrl}/realms/${realm}/protocol/openid-connect/token`,
      clientID: clientId,
      clientSecret,
      callbackURL: callbackUrl,
      scope: 'openid profile email roles',
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _profile: unknown,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const userInfo = await this.keycloakService.getUserInfo(accessToken);
      const user = await this.keycloakService.syncUser(userInfo);
      done(null, user);
    } catch (err) {
      done(err instanceof Error ? err : new UnauthorizedException('Falha na autenticação SSO'));
    }
  }
}
