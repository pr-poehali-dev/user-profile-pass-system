import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  db,
  PRIVILEGE_COLORS,
  durationLabel,
  User,
} from '@/lib/store';
import Icon from '@/components/ui/icon';
import Auth from '@/components/Auth';
import Shop from '@/components/Shop';
import AdminPanel from '@/components/AdminPanel';

export default function Index() {
  const [session, setSession] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [shopOpen, setShopOpen] = useState(false);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    setSession(db.getSession());
  }, []);

  const currentUser: User | null = useMemo(() => {
    if (!session) return null;
    return db.getUsers().find((u) => u.username === session) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, tick]);

  if (!session || !currentUser) {
    return <Auth onAuth={(u) => setSession(u)} />;
  }

  const myPasses = db
    .getPasses()
    .filter((p) => p.owner === currentUser.username)
    .sort((a, b) => b.createdAt - a.createdAt);

  const logout = () => {
    db.setSession(null);
    setSession(null);
  };

  const notify = (msg: string) => toast(msg);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-foreground flex items-center justify-center">
              <Icon name="ScanLine" className="text-background" size={18} />
            </div>
            <span className="font-bold tracking-tight">Пропуски</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShopOpen(true)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl border hover:bg-muted transition-colors text-sm font-medium"
            >
              🍪 <span>{currentUser.coins}</span>
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
            {myPasses.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Icon name="Ticket" size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">У вас пока нет пропусков</p>
              </div>
            )}
            {myPasses.map((p) => {
              const expired = p.expiresAt !== null && p.expiresAt <= Date.now();
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-5 ${expired ? 'opacity-50' : 'animate-scale-in'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">@{p.owner}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${PRIVILEGE_COLORS[p.privilege]}`}>
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
                {currentUser.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold">@{currentUser.username}</p>
                <p className="text-sm text-muted-foreground">
                  {currentUser.isAdmin ? 'Администратор' : 'Пользователь'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border p-4">
                <p className="text-2xl font-bold">{currentUser.coins}</p>
                <p className="text-xs text-muted-foreground">Шоколадные орешки 🍪</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-2xl font-bold">{myPasses.length}</p>
                <p className="text-xs text-muted-foreground">Пропусков</p>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={logout}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выйти из аккаунта
            </Button>

            {currentUser.isAdmin && (
              <div className="pt-2">
                <AdminPanel currentUser={currentUser} refresh={refresh} onToast={notify} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Shop
        open={shopOpen}
        onClose={() => setShopOpen(false)}
        currentUser={currentUser}
        refresh={refresh}
        onToast={notify}
      />
    </div>
  );
}
