export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
  jti?: string;
  mfaSetupRequired?: boolean;
}

// `req.user` é preenchido pelo JwtAuthGuard. Até P-094 este campo vinha declarado por arrasto do
// @types/passport (dependência da estratégia Keycloak, entretanto removida); reproduz-se aqui a
// mesma declaração, para que os controllers que fazem `req.user as JwtPayload` fiquem iguais.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User {}

    interface Request {
      user?: User;
    }
  }
}
