// Session management for Ace2Ace with Azure Functions backend integration
// Stores persistent player identity in localStorage and syncs with backend

export type Player = {
  playerId: string;
  playerName: string;
  currentScore?: number;
  bestScore?: number;
  gamesPlayed?: number;
  createdAt?: Date;
  lastSeenAt?: Date;
};

export type BestTimer = {
  playerId: string;
  playerName: string | null;
  bestDurationMs: number;
  achievedAt: string | null; // ISO string from server
};

const KEY_ID = 'ace2ace.playerId';
const KEY_NAME = 'ace2ace.playerName';

// API Configuration
const getApiBaseUrl = (): string => {
  // Use path-based API. In dev, Vite proxies /api to Functions; in prod, SWA exposes /api
  return '/api';
};

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

// API functions
async function apiRegisterPlayer(playerId: string, playerName: string): Promise<Player> {
  const response = await fetch(`${getApiBaseUrl()}/players`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
      playerName
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to register player: ${response.statusText}`);
  }

  return await response.json();
}

async function apiGetPlayer(playerId: string): Promise<Player | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/players/${playerId}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get player: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch player from API:', error);
    return null;
  }
}

async function apiSubmitScore(playerId: string, score: number): Promise<Player> {
  const response = await fetch(`${getApiBaseUrl()}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerId,
      score
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to submit score: ${response.statusText}`);
  }

  return await response.json();
}

// New: record a finished match with duration and difficulty
async function apiRecordMatch(playerId: string, difficulty: string, durationMs: number): Promise<any> {
  const response = await fetch(`${getApiBaseUrl()}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, difficulty, durationMs })
  });
  if (!response.ok) {
    throw new Error(`Failed to record match: ${response.statusText}`);
  }
  return await response.json();
}

export async function getLeaderboard(limit: number = 10): Promise<Player[]> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/leaderboard?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get leaderboard: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch leaderboard from API:', error);
    return [];
  }
}

export async function getTimersLeaderboard(difficulty: string | null = null, limit: number = 5): Promise<BestTimer[]> {
  try {
    const q = new URLSearchParams();
    if (difficulty) q.set('difficulty', difficulty);
    if (limit) q.set('limit', String(limit));
    const response = await fetch(`${getApiBaseUrl()}/leaderboard/timers?` + q.toString());
    if (!response.ok) throw new Error(`Failed to get timers leaderboard: ${response.statusText}`);
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch timers leaderboard from API:', error);
    return [];
  }
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

export async function setPlayerName(name: string): Promise<Player> {
  const trimmed = (name || '').trim();
  let id = readId();
  if (!id) {
    id = generateUuid();
    writeId(id);
  }
  writeName(trimmed);
  
  const localPlayer = { playerId: id, playerName: trimmed };
  
  // Sync with backend
  try {
    const backendPlayer = await apiRegisterPlayer(id, trimmed);
    // Update local storage with any additional data from backend
    if (backendPlayer.playerId && backendPlayer.playerId !== id) {
      writeId(backendPlayer.playerId);
    }
    if (backendPlayer.playerName && backendPlayer.playerName !== trimmed) {
      writeName(backendPlayer.playerName);
    }
    
    if (backendPlayer.playerName) emitReady(backendPlayer);
    return backendPlayer;
  } catch (error) {
    console.warn('Failed to sync player with backend:', error);
    // Fall back to local player
    if (localPlayer.playerName) emitReady(localPlayer);
    return localPlayer;
  }
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

// Ensure a player exists in the backend (upsert) with a non-empty name.
// If name is missing locally, uses the provided defaultName and persists it.
export async function ensurePlayerInBackend(defaultName: string = 'Player'): Promise<Player> {
  let id = readId();
  if (!id) {
    id = generateUuid();
    writeId(id);
  }
  let name = readName();
  if (!name) {
    name = defaultName;
    writeName(name);
  }

  const localPlayer = { playerId: id, playerName: name } as Player;

  try {
    const backendPlayer = await apiRegisterPlayer(id, name);
    if (backendPlayer.playerId && backendPlayer.playerId !== id) {
      writeId(backendPlayer.playerId);
    }
    if (backendPlayer.playerName && backendPlayer.playerName !== name) {
      writeName(backendPlayer.playerName);
    }
    if (backendPlayer.playerName) emitReady(backendPlayer);
    return backendPlayer;
  } catch (error) {
    console.warn('Failed to ensure player in backend:', error);
    if (localPlayer.playerName) emitReady(localPlayer);
    return localPlayer;
  }
}

export async function submitScore(score: number): Promise<Player | null> {
  const player = getPlayer();
  if (!player.playerId || !player.playerName) {
    console.warn('Cannot submit score: no player registered');
    return null;
  }

  try {
    const updatedPlayer = await apiSubmitScore(player.playerId, score);
    return updatedPlayer;
  } catch (error) {
    console.warn('Failed to submit score to backend:', error);
    return null;
  }
}

// New: public helper to submit a match record
export async function submitMatch(durationMs: number, difficulty: string): Promise<any | null> {
  const player = getPlayer();
  if (!player.playerId) {
    console.warn('Cannot record match: no player registered');
    return null;
  }
  if (typeof durationMs !== 'number' || durationMs <= 0) {
    console.warn('Cannot record match: invalid durationMs');
    return null;
  }
  try {
    return await apiRecordMatch(player.playerId, difficulty || 'beginner', Math.floor(durationMs));
  } catch (error) {
    console.warn('Failed to record match to backend:', error);
    return null;
  }
}

export async function syncPlayerData(): Promise<Player | null> {
  const player = getPlayer();
  if (!player.playerId) {
    return null;
  }

  try {
    const backendPlayer = await apiGetPlayer(player.playerId);
    return backendPlayer;
  } catch (error) {
    console.warn('Failed to sync player data:', error);
    return null;
  }
}
