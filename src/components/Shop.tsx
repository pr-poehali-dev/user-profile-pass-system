import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  db,
  Pass,
  PRIVILEGE_COLORS,
  Product,
  durationLabel,
  uid,
  User,
} from '@/lib/store';

interface ShopProps {
  open: boolean;
  onClose: () => void;
  currentUser: User;
  refresh: () => void;
  onToast: (msg: string) => void;
}

export default function Shop({ open, onClose, currentUser, refresh, onToast }: ShopProps) {
  const products = db.getProducts();

  const buy = (product: Product) => {
    const users = db.getUsers();
    const idx = users.findIndex((u) => u.username === currentUser.username);
    if (idx === -1) return;
    if (users[idx].coins < product.price) return onToast('Недостаточно 🍪');

    users[idx] = { ...users[idx], coins: users[idx].coins - product.price };
    db.setUsers(users);

    const pass: Pass = {
      id: uid(),
      owner: currentUser.username,
      title: product.title,
      privilege: product.privilege,
      createdAt: Date.now(),
      expiresAt: product.durationMs === null ? null : Date.now() + product.durationMs,
    };
    db.setPasses([...db.getPasses(), pass]);
    onToast(`Куплено: ${product.title}`);
    refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🍪 Магазин</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-muted p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Ваш баланс</span>
          <span className="text-2xl font-bold">{currentUser.coins} 🍪</span>
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {products.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Товаров пока нет</p>
          )}
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  <span className={`inline-block px-2 py-0.5 rounded-full border mr-1.5 ${PRIVILEGE_COLORS[p.privilege]}`}>{p.privilege}</span>
                  {p.durationMs === null ? 'Бесконечно' : durationLabel(Date.now() + p.durationMs)}
                </p>
              </div>
              <Button size="sm" onClick={() => buy(p)} disabled={currentUser.coins < p.price}>
                {p.price} 🍪
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
