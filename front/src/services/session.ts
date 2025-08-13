// Session management for Ace2Ace
// Stores persistent player identity in localStorage

export type Player = {
  playerId: string;
  playerName: string;
};

const KEY_ID = 'ace2ace.playerId';
const KEY_NAME = 'ace2ace.playerName';

// Robust storage wrapper (localStorage → sessionStorage → cookies → in-memory)
const memStore: Record<string, string> = {};
function canUseStorage(store: Storage | undefined): boolean {
  if (!store) return false;
  try {
    const k = '__ace2ace_test__';
    store.setItem(k, '1');
    store.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const storageBackend = (() => {
  // Prefer localStorage
  // @ts-ignore
  if (canUseStorage(typeof localStorage !== 'undefined' ? localStorage : undefined)) return 'local' as const;
  // @ts-ignore
  if (canUseStorage(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined)) return 'session' as const;
  // Try cookies (best-effort)
  try {
    document.cookie = 'ace2ace_cookie_test=1; path=/';
    if (document.cookie.indexOf('ace2ace_cookie_test=1') !== -1) {
      // Clean test cookie
      document.cookie = 'ace2ace_cookie_test=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      return 'cookie' as const;
    }
  } catch {}
  return 'memory' as const;
})();

function getItem(key: string): string | null {
  try {
    if (storageBackend === 'local') return localStorage.getItem(key);
    if (storageBackend === 'session') return sessionStorage.getItem(key);
    if (storageBackend === 'cookie') {
      const m = document.cookie.match(new RegExp('(?:^|; )' + key.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : null;
    }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  } catch { return null; }
}

function setItem(key: string, value: string) {
  try {
    if (storageBackend === 'local') return localStorage.setItem(key, value);
    if (storageBackend === 'session') return sessionStorage.setItem(key, value);
    if (storageBackend === 'cookie') {
      // 365 days
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${key}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/`;
      return;
    }
    memStore[key] = value;
  } catch {
    // Last resort, keep in memory
    memStore[key] = value;
  }
}

const callbacks = new Set<(player: Player) => void>();

function readId(): string | null {
  try { return getItem(KEY_ID); } catch { return null; }
}
function readName(): string {
  try { return getItem(KEY_NAME) || ''; } catch { return ''; }
}
function writeId(id: string) {
  try { setItem(KEY_ID, id); } catch {}
}
function writeName(name: string) {
  try { setItem(KEY_NAME, name); } catch {}
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  // Fallback: RFC4122-ish
  const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}

function emitReady(player: Player) {
  callbacks.forEach(cb => {
    try { cb(player); } catch { /* no-op */ }
  });
}

export function onPlayerReady(cb: (player: Player) => void) {
  callbacks.add(cb);
  // If already ready (id + name exist), notify immediately on next tick
  const id = readId();
  const name = readName();
  if (id && name) {
    setTimeout(() => cb({ playerId: id, playerName: name }), 0);
  }
  return () => callbacks.delete(cb);
}

export function getPlayer(): Player {
  const id = readId() || '';
  const name = readName();
  return { playerId: id, playerName: name };
}

export function setPlayerName(name: string): Player {
  const trimmed = (name || '').trim();
  let id = readId();
  if (!id) {
    id = generateUuid();
    writeId(id);
  }
  writeName(trimmed);
  const player = { playerId: id, playerName: trimmed };
  if (player.playerName) emitReady(player);
  return player;
}

export function ensurePlayer(): Player {
  let id = readId();
  if (!id) {
    id = generateUuid();
    writeId(id);
  }
  const player = { playerId: id, playerName: readName() };
  if (player.playerName) emitReady(player);
  return player;
}
