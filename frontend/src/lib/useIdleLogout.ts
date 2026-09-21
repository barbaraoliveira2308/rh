import * as React from 'react';
import { sendActivityHeartbeat } from '@/api/auth.api';

// Partilhado entre separadores: atividade num separador mantém os outros abertos.
const LAST_ACTIVITY_KEY = 'srh-last-activity';
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'] as const;
const CHECK_INTERVAL_MS = 15_000;
const STORE_THROTTLE_MS = 5_000;
// O servidor só vê pedidos; ler uma página longa não gera nenhum. O heartbeat mantém o relógio
// do servidor alinhado com o do browser.
const HEARTBEAT_INTERVAL_MS = 30_000;

function readLastActivity(fallback: number): number {
  try {
    const value = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

function writeLastActivity(timestamp: number): void {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
  } catch {
    // Sem localStorage, cada separador conta só a sua própria atividade.
  }
}

/**
 * BR-AUTH-005: termina a sessão no browser depois de `timeoutMinutes` sem interação, para que um
 * ecrã abandonado deixe de mostrar dados. O backend aplica a mesma regra do seu lado.
 */
export function useIdleLogout(timeoutMinutes: number, onIdle: () => void): void {
  const onIdleRef = React.useRef(onIdle);
  onIdleRef.current = onIdle;

  React.useEffect(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let lastActivity = Date.now();
    let lastStored = 0;
    let lastHeartbeat = Date.now();
    writeLastActivity(lastActivity);

    const markActive = (): void => {
      const now = Date.now();
      lastActivity = now;
      if (now - lastStored >= STORE_THROTTLE_MS) {
        lastStored = now;
        writeLastActivity(now);
      }
      if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeat = now;
        sendActivityHeartbeat().catch(() => undefined);
      }
    };

    const check = (): void => {
      const latest = Math.max(lastActivity, readLastActivity(lastActivity));
      if (Date.now() - latest >= timeoutMs) {
        onIdleRef.current();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true, capture: true });
    }
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);

    return (): void => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive, { capture: true });
      }
      window.clearInterval(interval);
    };
  }, [timeoutMinutes]);
}
