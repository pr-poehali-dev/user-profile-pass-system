import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db, OWNER_USERNAME, User } from '@/lib/store';
import Icon from '@/components/ui/icon';

interface AuthProps {
  onAuth: (username: string) => void;
}

export default function Auth({ onAuth }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    const name = username.trim();
    if (!name || !password) {
      setError('Заполните никнейм и пароль');
      return;
    }
    const users = db.getUsers();

    if (mode === 'register') {
      if (users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
        setError('Этот никнейм уже занят');
        return;
      }
      const isOwner = name === OWNER_USERNAME;
      const newUser: User = {
        username: name,
        password,
        isAdmin: isOwner,
        adminGrantedBy: null,
        coins: 0,
      };
      db.setUsers([...users, newUser]);
      db.setSession(name);
      onAuth(name);
    } else {
      const user = users.find((u) => u.username === name);
      if (!user || user.password !== password) {
        setError('Неверный никнейм или пароль');
        return;
      }
      db.setSession(name);
      onAuth(name);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center mb-5">
            <Icon name="ScanLine" className="text-background" size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Система пропусков</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === 'register' ? 'Создайте аккаунт' : 'Войдите в аккаунт'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Никнейм</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ваш никнейм"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button className="w-full" onClick={submit}>
            {mode === 'register' ? 'Зарегистрироваться' : 'Войти'}
          </Button>

          <button
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setMode(mode === 'register' ? 'login' : 'register');
              setError('');
            }}
          >
            {mode === 'register' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}
