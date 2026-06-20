import func2url from '../../backend/func2url.json';

const URLS = func2url as Record<string, string>;

async function call<T>(fn: string, method: 'GET' | 'POST', body?: unknown, params?: Record<string, string>): Promise<T> {
  let url = URLS[fn];
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url = `${url}?${qs}`;
  }
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data as T;
}

export interface UserInfo {
  username: string;
  isAdmin: boolean;
  adminGrantedBy: string | null;
  coins: number;
}

export interface Pass {
  id: string;
  owner: string;
  title: string;
  privilege: string;
  createdAt: number;
  expiresAt: number | null;
}

export interface Product {
  id: string;
  title: string;
  privilege: string;
  price: number;
  durationMs: number | null;
}

export const api = {
  auth: {
    register: (username: string, password: string) =>
      call<UserInfo>('auth', 'POST', { action: 'register', username, password }),
    login: (username: string, password: string) =>
      call<UserInfo>('auth', 'POST', { action: 'login', username, password }),
  },
  passes: {
    list: (owner?: string) =>
      call<Pass[]>('passes', 'GET', undefined, owner ? { owner } : undefined),
    create: (owner: string, title: string, privilege: string, expiresAt: number | null) =>
      call<Pass>('passes', 'POST', { action: 'create', owner, title, privilege, expiresAt }),
    update: (id: string, title: string, privilege: string, expiresAt: number | null) =>
      call<{ ok: boolean }>('passes', 'POST', { action: 'update', id, title, privilege, expiresAt }),
    delete: (id: string) =>
      call<{ ok: boolean }>('passes', 'POST', { action: 'delete', id }),
  },
  products: {
    list: () => call<Product[]>('products', 'GET'),
    create: (title: string, privilege: string, price: number, durationMs: number | null) =>
      call<Product>('products', 'POST', { action: 'create', title, privilege, price, durationMs }),
    delete: (id: string) =>
      call<{ ok: boolean }>('products', 'POST', { action: 'delete', id }),
  },
  users: {
    list: () => call<UserInfo[]>('users', 'GET'),
    changeCoins: (username: string, delta: number) =>
      call<{ coins: number }>('users', 'POST', { action: 'coins', username, delta }),
    setAdmin: (username: string, grant: boolean, grantedBy: string) =>
      call<{ ok: boolean }>('users', 'POST', { action: 'admin', username, grant, grantedBy }),
    buy: (username: string, productId: string) =>
      call<{ coins: number; pass: Pass }>('users', 'POST', { action: 'buy', username, productId }),
  },
};

// Сессия в localStorage (только username)
const SESSION_KEY = 'pass_session_v2';
export const session = {
  get: (): string | null => localStorage.getItem(SESSION_KEY),
  set: (username: string) => localStorage.setItem(SESSION_KEY, username),
  clear: () => localStorage.removeItem(SESSION_KEY),
};
