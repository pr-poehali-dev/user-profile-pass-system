export type Privilege = 'Client' | 'Helper' | 'Admator' | 'Developer';

export const PRIVILEGES: Privilege[] = ['Client', 'Helper', 'Admator', 'Developer'];

export const PRIVILEGE_COLORS: Record<Privilege, string> = {
  Client: 'bg-gray-100 text-gray-700 border-gray-200',
  Helper: 'bg-blue-50 text-blue-700 border-blue-200',
  Admator: 'bg-amber-50 text-amber-700 border-amber-200',
  Developer: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
};

export interface User {
  username: string;
  password: string;
  isAdmin: boolean;
  adminGrantedBy: string | null; // null = главный админ (может выдавать админку), иначе ник выдавшего
  coins: number;
}

export interface Pass {
  id: string;
  owner: string; // username
  title: string;
  privilege: Privilege;
  createdAt: number;
  expiresAt: number | null; // null = бесконечно
}

export interface Product {
  id: string;
  title: string;
  privilege: Privilege;
  price: number;
  durationMs: number | null; // null = бесконечно
}

export const OWNER_USERNAME = 'Lavrov1yList';

const USERS_KEY = 'pass_app_users';
const PASSES_KEY = 'pass_app_passes';
const PRODUCTS_KEY = 'pass_app_products';
const SESSION_KEY = 'pass_app_session';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const db = {
  getUsers: () => read<User[]>(USERS_KEY, []),
  setUsers: (users: User[]) => write(USERS_KEY, users),
  getPasses: () => read<Pass[]>(PASSES_KEY, []),
  setPasses: (passes: Pass[]) => write(PASSES_KEY, passes),
  getProducts: () => read<Product[]>(PRODUCTS_KEY, []),
  setProducts: (products: Product[]) => write(PRODUCTS_KEY, products),
  getSession: () => read<string | null>(SESSION_KEY, null),
  setSession: (username: string | null) => write(SESSION_KEY, username),
};

export function durationLabel(expiresAt: number | null): string {
  if (expiresAt === null) return 'Бесконечно';
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Истёк';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const parts: string[] = [];
  if (days) parts.push(`${days}д`);
  if (hours) parts.push(`${hours}ч`);
  if (minutes) parts.push(`${minutes}м`);
  return parts.length ? parts.join(' ') : 'меньше минуты';
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
