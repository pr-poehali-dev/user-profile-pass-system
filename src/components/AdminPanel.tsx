import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api, Pass, Product, UserInfo } from '@/lib/api';
import { PRIVILEGE_COLORS } from '@/lib/store';
import Icon from '@/components/ui/icon';

type Privilege = 'Client' | 'Helper' | 'Admator' | 'Developer';
type Unit = 'minutes' | 'hours' | 'days' | 'infinite';
const PRIVILEGES: Privilege[] = ['Client', 'Helper', 'Admator', 'Developer'];

function computeExpiry(priv: Privilege, unit: Unit, amount: number): number | null {
  if (priv === 'Developer' || unit === 'infinite') return null;
  const ms = unit === 'minutes' ? amount * 60000 : unit === 'hours' ? amount * 3600000 : amount * 86400000;
  return Date.now() + ms;
}
function computeDuration(priv: Privilege, unit: Unit, amount: number): number | null {
  if (priv === 'Developer' || unit === 'infinite') return null;
  return unit === 'minutes' ? amount * 60000 : unit === 'hours' ? amount * 3600000 : amount * 86400000;
}

interface Props {
  currentUser: UserInfo;
  onToast: (msg: string) => void;
  onCoinsChange: (coins: number) => void;
}

export default function AdminPanel({ currentUser, onToast, onCoinsChange }: Props) {
  const isOwnerAdmin = currentUser.adminGrantedBy === null;

  const [passes, setPasses] = useState<Pass[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadAll = useCallback(async () => {
    const [p, u, pr] = await Promise.all([api.passes.list(), api.users.list(), api.products.list()]);
    setPasses(p); setUsers(u); setProducts(pr);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // --- Создание пропуска ---
  const [targetUser, setTargetUser] = useState('');
  const [passTitle, setPassTitle] = useState('');
  const [privilege, setPrivilege] = useState<Privilege>('Client');
  const [unit, setUnit] = useState<Unit>('days');
  const [amount, setAmount] = useState(1);

  const createPass = async () => {
    const target = targetUser.trim();
    if (!target || !passTitle.trim()) return onToast('Заполните никнейм и название');
    try {
      await api.passes.create(target, passTitle.trim(), privilege, computeExpiry(privilege, unit, amount));
      setPassTitle(''); setTargetUser('');
      onToast('Пропуск создан');
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  // --- Редактирование пропуска ---
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriv, setEditPriv] = useState<Privilege>('Client');

  const saveEdit = async () => {
    const p = passes.find(x => x.id === editId);
    if (!p) return;
    try {
      await api.passes.update(p.id, editTitle, editPriv, editPriv === 'Developer' ? null : p.expiresAt);
      setEditId(null);
      onToast('Пропуск изменён');
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  const deletePass = async (id: string) => {
    try {
      await api.passes.delete(id);
      onToast('Пропуск удалён');
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  // --- Игроки ---
  const [search, setSearch] = useState('');
  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  const toggleAdmin = async (u: UserInfo) => {
    try {
      await api.users.setAdmin(u.username, !u.isAdmin, currentUser.username);
      onToast(u.isAdmin ? 'Админка забрана' : 'Админка выдана');
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  // --- Валюта ---
  const [coinUser, setCoinUser] = useState('');
  const [coinAmount, setCoinAmount] = useState(10);

  const changeCoins = async (delta: number) => {
    if (!coinUser.trim()) return onToast('Введите никнейм');
    try {
      await api.users.changeCoins(coinUser.trim(), delta);
      onToast(delta > 0 ? `Выдано ${Math.abs(delta)} 🍪` : `Забрано ${Math.abs(delta)} 🍪`);
      if (coinUser.trim() === currentUser.username) {
        const me = await api.users.list().then(list => list.find(u => u.username === currentUser.username));
        if (me) onCoinsChange(me.coins);
      }
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  // --- Товары ---
  const [prodTitle, setProdTitle] = useState('');
  const [prodPriv, setProdPriv] = useState<Privilege>('Client');
  const [prodUnit, setProdUnit] = useState<Unit>('days');
  const [prodAmount, setProdAmount] = useState(1);
  const [prodPrice, setProdPrice] = useState(50);

  const createProduct = async () => {
    if (!prodTitle.trim()) return onToast('Введите название товара');
    try {
      await api.products.create(prodTitle.trim(), prodPriv, prodPrice, computeDuration(prodPriv, prodUnit, prodAmount));
      setProdTitle('');
      onToast('Товар добавлен');
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.products.delete(id);
      onToast('Товар удалён навсегда');
      loadAll();
    } catch (e: unknown) { onToast(e instanceof Error ? e.message : 'Ошибка'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Icon name="Shield" size={20} />
        <h2 className="text-xl font-bold">Админ-панель</h2>
      </div>

      <Tabs defaultValue="passes">
        <TabsList className="w-full flex flex-wrap h-auto">
          <TabsTrigger value="passes" className="flex-1">Пропуски</TabsTrigger>
          <TabsTrigger value="players" className="flex-1">Игроки</TabsTrigger>
          <TabsTrigger value="coins" className="flex-1">Валюта</TabsTrigger>
          <TabsTrigger value="shop" className="flex-1">Магазин</TabsTrigger>
        </TabsList>

        {/* ПРОПУСКИ */}
        <TabsContent value="passes" className="space-y-6 mt-5">
          <div className="rounded-xl border p-4 space-y-3">
            <p className="font-semibold text-sm">Создать пропуск</p>
            <Input placeholder="Никнейм игрока" value={targetUser} onChange={(e) => setTargetUser(e.target.value)} />
            <Input placeholder="Название пропуска" value={passTitle} onChange={(e) => setPassTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={privilege} onValueChange={(v) => setPrivilege(v as Privilege)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIVILEGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={unit} onValueChange={(v) => setUnit(v as Unit)} disabled={privilege === 'Developer'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Минуты</SelectItem>
                  <SelectItem value="hours">Часы</SelectItem>
                  <SelectItem value="days">Дни</SelectItem>
                  <SelectItem value="infinite">Бесконечно</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {privilege !== 'Developer' && unit !== 'infinite' && (
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            )}
            {privilege === 'Developer' && <p className="text-xs text-muted-foreground">Developer — всегда бесконечный</p>}
            <Button className="w-full" onClick={createPass}>Создать</Button>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Все пропуски ({passes.length})</p>
            {passes.length === 0 && <p className="text-sm text-muted-foreground">Пропусков пока нет</p>}
            {passes.map((p) => (
              <div key={p.id} className="rounded-xl border p-3">
                {editId === p.id ? (
                  <div className="space-y-2">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <Select value={editPriv} onValueChange={(v) => setEditPriv(v as Privilege)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PRIVILEGES.map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}</SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>Сохранить</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>Отмена</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">@{p.owner} · {p.expiresAt === null ? 'Бесконечно' : new Date(p.expiresAt).toLocaleDateString('ru')}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIVILEGE_COLORS[p.privilege as keyof typeof PRIVILEGE_COLORS]}`}>{p.privilege}</span>
                      <button className="p-1.5 hover:bg-muted rounded-lg" onClick={() => { setEditId(p.id); setEditTitle(p.title); setEditPriv(p.privilege as Privilege); }}><Icon name="Pencil" size={15} /></button>
                      <button className="p-1.5 hover:bg-muted rounded-lg text-destructive" onClick={() => deletePass(p.id)}><Icon name="Trash2" size={15} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ИГРОКИ */}
        <TabsContent value="players" className="space-y-3 mt-5">
          <Input placeholder="Поиск по никнейму..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <p className="text-sm text-muted-foreground">Всего: {users.length}</p>
          {filtered.map((u) => (
            <div key={u.username} className="rounded-xl border p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">@{u.username}</p>
                <p className="text-xs text-muted-foreground">{u.coins} 🍪{u.isAdmin ? ' · админ' : ''}</p>
              </div>
              {isOwnerAdmin && u.username !== currentUser.username && (
                <Button size="sm" variant="outline" onClick={() => toggleAdmin(u)}>
                  {u.isAdmin ? 'Забрать админку' : 'Выдать админку'}
                </Button>
              )}
            </div>
          ))}
        </TabsContent>

        {/* ВАЛЮТА */}
        <TabsContent value="coins" className="space-y-3 mt-5">
          <div className="rounded-xl border p-4 space-y-3">
            <p className="font-semibold text-sm">Шоколадные орешки 🍪</p>
            <Input placeholder="Никнейм игрока" value={coinUser} onChange={(e) => setCoinUser(e.target.value)} />
            <Input type="number" min={1} value={coinAmount} onChange={(e) => setCoinAmount(Number(e.target.value))} />
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => changeCoins(coinAmount)}>Выдать</Button>
              <Button variant="outline" onClick={() => changeCoins(-coinAmount)}>Забрать</Button>
            </div>
          </div>
        </TabsContent>

        {/* МАГАЗИН */}
        <TabsContent value="shop" className="space-y-6 mt-5">
          <div className="rounded-xl border p-4 space-y-3">
            <p className="font-semibold text-sm">Создать товар</p>
            <Input placeholder="Название пропуска" value={prodTitle} onChange={(e) => setProdTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={prodPriv} onValueChange={(v) => setProdPriv(v as Privilege)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIVILEGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={prodUnit} onValueChange={(v) => setProdUnit(v as Unit)} disabled={prodPriv === 'Developer'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Минуты</SelectItem>
                  <SelectItem value="hours">Часы</SelectItem>
                  <SelectItem value="days">Дни</SelectItem>
                  <SelectItem value="infinite">Бесконечно</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {prodPriv !== 'Developer' && prodUnit !== 'infinite' && (
              <Input type="number" min={1} value={prodAmount} onChange={(e) => setProdAmount(Number(e.target.value))} placeholder="Длительность" />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">Цена 🍪</span>
              <Input type="number" min={1} value={prodPrice} onChange={(e) => setProdPrice(Number(e.target.value))} />
            </div>
            <Button className="w-full" onClick={createProduct}>Добавить товар</Button>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Товары ({products.length})</p>
            {products.length === 0 && <p className="text-sm text-muted-foreground">Товаров пока нет</p>}
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.price} 🍪 · {p.durationMs === null ? 'Бесконечно' : `${Math.round(p.durationMs / 86400000)}д`}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIVILEGE_COLORS[p.privilege as keyof typeof PRIVILEGE_COLORS]}`}>{p.privilege}</span>
                  <button className="p-1.5 hover:bg-muted rounded-lg text-destructive" onClick={() => deleteProduct(p.id)}><Icon name="Trash2" size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
