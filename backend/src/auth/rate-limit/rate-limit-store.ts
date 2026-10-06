// Contagem de pedidos numa janela fixa: devolve quantos pedidos já houve na janela corrente,
// incluindo este. A janela começa no primeiro pedido e dura `windowSeconds`.
export interface RateLimitStore {
  hit(key: string, windowSeconds: number): Promise<number>;
}

// O que fazer quando o Redis não responde (decisão P107-02): contar em memória por processo
// (omissão) ou recusar o pedido com 503 (reservado para o pedido de reset de password, R3).
export type RateLimitStorePolicy = 'memory' | 'reject';

// Prefixo das chaves no Redis. Os e2e substituem-no por um prefixo próprio, para nunca tocarem nas
// chaves de um Redis partilhado com o ambiente de desenvolvimento.
export const RATE_LIMIT_KEY_PREFIX = 'RATE_LIMIT_KEY_PREFIX';
export const DEFAULT_RATE_LIMIT_KEY_PREFIX = 'ratelimit:';
