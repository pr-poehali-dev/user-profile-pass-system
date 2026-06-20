import { useEffect, useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { api, session, UserInfo, Pass } from '@/lib/api';
import { PRIVILEGE_COLORS } from '@/lib/store';
import Icon from '@/components/ui/icon';
import Auth from '@/components/Auth';
import Shop from '@/components/Shop';
import AdminPanel from '@/components/AdminPanel';

function durationLabel(expiresAt: number | null): string {
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

export default function Index() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [shopOpen, setShopOpen] = useState(false);
  const [loadingPasses, setLoadingPasses] = useState(false);
  const [booting, setBooting] = useState(true);

  const loadPasses = useCallback(async (username: string) => {
    setLoadingPasses(true);
    try {
      const list = await api.passes.list(username);
      setPasses(list);
    } finally {
      setLoadingPasses(false);
    }
  }, []);

  useEffect(() => {
    const stored = session.get();
    if (!stored) { setBooting(false); return; }
    api.users.list().then(list => {
      const me = list.find(u => u.username === stored);
      if (me) { setUser(me); loadPasses(me.username); }
      else { session.clear(); }
    }).catch(() => { session.clear(); }).finally(() => setBooting(false));
  }, [loadPasses]);

  const handleAuth = (u: UserInfo) => {
    setUser(u);
    loadPasses(u.username);
  };

  const logout = () => {
    session.clear();
    setUser(null);
    setPasses([]);
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (!user) return <Auth onAuth={handleAuth} />;

  const notify = (msg: string) => toast(msg);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
              <Icon name="ScanLine" className="text-background" size={18} />
            </div>
            <span className="font-bold tracking-tight">Пропуски</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShopOpen(true)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border hover:bg-muted transition-colors text-sm font-medium">
              🍪 <span>{user.coins}</span>
            </button>
            <button onClick={logout} className="p-2 rounded-xl hover:bg-muted transition-colors">
              <Icon name="LogOut" size={18} />
            </button>
          </div>
        </header>

        <Tabs defaultValue="passes">
          <TabsList className="w-full">
            <TabsTrigger value="passes" className="flex-1">Пропуск</TabsTrigger>
            <TabsTrigger value="profile" className="flex-1">Профиль</TabsTrigger>
          </TabsList>

          {/* ВКЛАДКА ПРОПУСК */}
          <TabsContent value="passes" className="mt-5 space-y-3 animate-fade-in">
            {loadingPasses && <p className="text-sm text-muted-foreground text-center py-8">Загрузка...</p>}
            {!loadingPasses && passes.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Icon name="Ticket" size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">У вас пока нет пропусков</p>
              </div>
            )}
            {passes.map((p) => {
              const expired = p.expiresAt !== null && p.expiresAt <= Date.now();
              return (
                <div key={p.id} className={`rounded-2xl border p-5 animate-scale-in ${expired ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">@{p.owner}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${PRIVILEGE_COLORS[p.privilege as keyof typeof PRIVILEGE_COLORS]}`}>
                      {p.privilege}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Icon name="Clock" size={14} />
                    <span>{durationLabel(p.expiresAt)}</span>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ВКЛАДКА ПРОФИЛЬ */}
          <TabsContent value="profile" className="mt-5 space-y-5 animate-fade-in">
            <div className="rounded-2xl border p-6 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-2xl font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold">@{user.username}</p>
                <p className="text-sm text-muted-foreground">{user.isAdmin ? 'Администратор' : 'Пользователь'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border p-4">
                <p className="text-2xl font-bold">{user.coins}</p>
                <p className="text-xs text-muted-foreground">Шоколадные орешки 🍪</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-2xl font-bold">{passes.length}</p>
                <p className="text-xs text-muted-foreground">Пропусков</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={logout}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти из аккаунта
            </Button>

            {user.isAdmin && (
              <div className="pt-2">
                <AdminPanel
                  currentUser={user}
                  onToast={notify}
                  onCoinsChange={(coins) => setUser(u => u ? { ...u, coins } : u)}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Shop
        open={shopOpen}
        onClose={() => { setShopOpen(false); loadPasses(user.username); }}
        currentUser={user}
        onUpdate={(coins) => { setUser(u => u ? { ...u, coins } : u); loadPasses(user.username); }}
        onToast={notify}
      />
    </div>
  );
}
