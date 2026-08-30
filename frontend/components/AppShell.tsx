'use client';

import Link from 'next/link';
import { clearToken } from '../lib/api';
import { useRouter } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-14 bg-slate-900 flex flex-col items-center py-4 gap-4 text-slate-300">
        <Link href="/" className="text-brand-teal text-xl font-bold" title="Home">
          3W
        </Link>
        <Link href="/masters" title="SKU Masters" className="hover:text-white text-lg">
          ⚙
        </Link>
        <button onClick={handleLogout} title="Logout" className="mt-auto hover:text-white text-lg">
          ⎋
        </button>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
