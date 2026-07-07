import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

interface KeycloakUserInfo {
  sub: string;
  email: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  realm_roles?: string[];
}

@Injectable()
export class KeycloakService {
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL', 'http://localhost:8080');
    this.realm = this.configService.get<string>('KEYCLOAK_REALM', 'hr-suite');
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'srh-backend');
    this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET', 'srh-backend-secret');
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenUrl = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    if (!response.ok) {
      throw new UnauthorizedException('Falha na troca do código de autorização');
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    const userInfoUrl = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;

    const response = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Falha ao obter informação do utilizador');
    }

    return response.json() as Promise<KeycloakUserInfo>;
  }

  async syncUser(keycloakUser: KeycloakUserInfo): Promise<User> {
    let user = await this.userRepository.findOneBy({
      email: keycloakUser.email,
    });

    if (user) {
      if (!user.isActive) {
        throw new UnauthorizedException('Conta desativada');
      }
      return user;
    }

    const username = keycloakUser.preferred_username
      ? keycloakUser.preferred_username
      : keycloakUser.email.split('@')[0];

    user = this.userRepository.create({
      email: keycloakUser.email,
      username,
      passwordHash: '',
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  getAuthorizationUrl(redirectUri: string): string {
    const authUrl = `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/auth`;
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'openid profile email roles',
    });
    return `${authUrl}?${params.toString()}`;
  }
}
