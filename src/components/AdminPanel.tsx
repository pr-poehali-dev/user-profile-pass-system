import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  db,
  Pass,
  Privilege,
  PRIVILEGES,
  PRIVILEGE_COLORS,
  Product,
  durationLabel,
  uid,
  User,
} from '@/lib/store';
import Icon from '@/components/ui/icon';

interface AdminPanelProps {
  currentUser: User;
  refresh: () => void;
  onToast: (msg: string) => void;
}

type Unit = 'minutes' | 'hours' | 'days' | 'infinite';

function computeExpiry(privilege: Privilege, unit: Unit, amount: number): number | null {
  if (privilege === 'Developer' || unit === 'infinite') return null;
  const ms =
    unit === 'minutes' ? amount * 60000 : unit === 'hours' ? amount * 3600000 : amount * 86400000;
  return Date.now() + ms;
}

function computeDuration(privilege: Privilege, unit: Unit, amount: number): number | null {
  if (privilege === 'Developer' || unit === 'infinite') return null;
  return unit === 'minutes' ? amount * 60000 : unit === 'hours' ? amount * 3600000 : amount * 86400000;
}

export default function AdminPanel({ currentUser, refresh, onToast }: AdminPanelProps) {
  const isOwnerAdmin = currentUser.adminGrantedBy === null; // может управлять админками

  // --- Создание пропуска ---
  const [targetUser, setTargetUser] = useState('');
  const [passTitle, setPassTitle] = useState('');
  const [privilege, setPrivilege] = useState<Privilege>('Client');
  const [unit, setUnit] = useState<Unit>('days');
  const [amount, setAmount] = useState(1);

  const createPass = () => {
    const target = targetUser.trim();
    if (!target || !passTitle.trim()) return onToast('Заполните никнейм и название');
    if (target === currentUser.username) return onToast('Нельзя создать пропуск самому себе');
    const users = db.getUsers();
    if (!users.some((u) => u.username === target)) return onToast('Такой игрок не найден');

    const pass: Pass = {
      id: uid(),
      owner: target,
      title: passTitle.trim(),
      privilege,
      createdAt: Date.now(),
      expiresAt: computeExpiry(privilege, unit, amount),
    };
    db.setPasses([...db.getPasses(), pass]);
    setPassTitle('');
    setTargetUser('');
    onToast('Пропуск создан');
    refresh();
  };

  // --- Управление пропусками ---
  const passes = db.getPasses();
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriv, setEditPriv] = useState<Privilege>('Client');

  const startEdit = (p: Pass) => {
    setEditId(p.id);
    setEditTitle(p.title);
    setEditPriv(p.privilege);
  };
  const saveEdit = () => {
    db.setPasses(
      passes.map((p) =>
        p.id === editId
          ? {
              ...p,
              title: editTitle,
              privilege: editPriv,
              expiresAt: editPriv === 'Developer' ? null : p.expiresAt,
            }
          : p,
      ),
    );
    setEditId(null);
    onToast('Пропуск изменён');
    refresh();
  };
  const deletePass = (id: string) => {
    db.setPasses(passes.filter((p) => p.id !== id));
    onToast('Пропуск удалён');
    refresh();
  };

  // --- Игроки и поиск ---
  const [search, setSearch] = useState('');
  const users = db.getUsers();
  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  // --- Валюта ---
  const [coinUser, setCoinUser] = useState('');
  const [coinAmount, setCoinAmount] = useState(10);
  const changeCoins = (delta: number) => {
    const target = coinUser.trim();
    if (!target) return onToast('Введите никнейм');
    const list = db.getUsers();
    const idx = list.findIndex((u) => u.username === target);
    if (idx === -1) return onToast('Игрок не найден');
    list[idx] = { ...list[idx], coins: Math.max(0, list[idx].coins + delta) };
    db.setUsers(list);
    onToast(delta > 0 ? `Выдано ${coinAmount} 🍪` : `Забрано ${coinAmount} 🍪`);
    refresh();
  };

  // --- Управление админками ---
  const grantAdmin = (username: string, grant: boolean) => {
    const list = db.getUsers();
    const idx = list.findIndex((u) => u.username === username);
    if (idx === -1) return;
    list[idx] = {
      ...list[idx],
      isAdmin: grant,
      adminGrantedBy: grant ? currentUser.username : null,
    };
    db.setUsers(list);
    onToast(grant ? 'Админка выдана' : 'Админка забрана');
    refresh();
  };

  // --- Товары ---
  const products = db.getProducts();
  const [prodTitle, setProdTitle] = useState('');
  const [prodPriv, setProdPriv] = useState<Privilege>('Client');
  const [prodUnit, setProdUnit] = useState<Unit>('days');
  const [prodAmount, setProdAmount] = useState(1);
  const [prodPrice, setProdPrice] = useState(50);

  const createProduct = () => {
    if (!prodTitle.trim()) return onToast('Введите название товара');
    const product: Product = {
      id: uid(),
      title: prodTitle.trim(),
      privilege: prodPriv,
      price: prodPrice,
      durationMs: computeDuration(prodPriv, prodUnit, prodAmount),
    };
    db.setProducts([...products, product]);
    setProdTitle('');
    onToast('Товар добавлен в магазин');
    refresh();
  };
  const deleteProduct = (id: string) => {
    db.setProducts(products.filter((p) => p.id !== id));
    onToast('Товар удалён навсегда');
    refresh();
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
                <SelectContent>
                  {PRIVILEGES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
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
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Количество" />
            )}
            {privilege === 'Developer' && (
              <p className="text-xs text-muted-foreground">Developer-пропуск всегда бесконечный</p>
            )}
            <Button className="w-full" onClick={createPass}>Создать пропуск</Button>
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
                      <SelectContent>
                        {PRIVILEGES.map((pr) => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}
                      </SelectContent>
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
                      <p className="text-xs text-muted-foreground">
                        @{p.owner} · {durationLabel(p.expiresAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIVILEGE_COLORS[p.privilege]}`}>{p.privilege}</span>
                      <button className="p-1.5 hover:bg-muted rounded-lg" onClick={() => startEdit(p)}><Icon name="Pencil" size={15} /></button>
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
          <p className="text-sm text-muted-foreground">Всего игроков: {users.length}</p>
          {filteredUsers.map((u) => (
            <div key={u.username} className="rounded-xl border p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">@{u.username}</p>
                <p className="text-xs text-muted-foreground">{u.coins} 🍪{u.isAdmin ? ' · админ' : ''}</p>
              </div>
              {isOwnerAdmin && u.username !== currentUser.username && (
                u.isAdmin ? (
                  <Button size="sm" variant="outline" onClick={() => grantAdmin(u.username, false)}>Забрать админку</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => grantAdmin(u.username, true)}>Выдать админку</Button>
                )
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
            <Input placeholder="Название (пропуск)" value={prodTitle} onChange={(e) => setProdTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={prodPriv} onValueChange={(v) => setProdPriv(v as Privilege)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIVILEGES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
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
              <span className="text-sm text-muted-foreground">Цена 🍪</span>
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
                  <p className="text-xs text-muted-foreground">
                    {p.price} 🍪 · {p.durationMs === null ? 'Бесконечно' : durationLabel(Date.now() + p.durationMs)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIVILEGE_COLORS[p.privilege]}`}>{p.privilege}</span>
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
