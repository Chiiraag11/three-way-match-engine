'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from './api';

/**
 * Simple client-side guard: if no token is present, redirect to /login.
 * Returns `ready=true` once the check has run so pages can avoid a flash of
 * protected content.
 */
export function useAuthGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
