import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, Product, UserInfo } from '@/lib/api';
import { PRIVILEGE_COLORS } from '@/lib/store';

interface ShopProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserInfo;
  onUpdate: (coins: number) => void;
  onToast: (msg: string) => void;
}

export default function Shop({ open, onClose, currentUser, onUpdate, onToast }: ShopProps) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) api.products.list().then(setProducts).catch(() => {});
  }, [open]);

  const buy = async (product: Product) => {
    if (currentUser.coins < product.price) return onToast('Недостаточно 🍪');
    setLoading(true);
    try {
      const res = await api.users.buy(currentUser.username, product.id);
      onUpdate(res.coins);
      onToast(`Куплено: ${product.title}`);
    } catch (e: unknown) {
      onToast(e instanceof Error ? e.message : 'Ошибка покупки');
    } finally {
      setLoading(false);
    }
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
                  <span className={`inline-block px-2 py-0.5 rounded-full border mr-1.5 ${PRIVILEGE_COLORS[p.privilege as keyof typeof PRIVILEGE_COLORS]}`}>{p.privilege}</span>
                  {p.durationMs === null ? 'Бесконечно' : `${Math.round(p.durationMs / 86400000)}д`}
                </p>
              </div>
              <Button size="sm" onClick={() => buy(p)} disabled={currentUser.coins < p.price || loading}>
                {p.price} 🍪
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
