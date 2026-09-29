// src/app/actions/auth.ts
'use server';

import { cookies } from 'next/headers';

export async function login(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  const validEmail = process.env.ADMIN_EMAIL;
  const validPassword = process.env.ADMIN_PASSWORD;

  if (email === validEmail && password === validPassword) {
    // Tambahkan 'await' sebelum cookies()
    const cookieStore = await cookies();
    
    // Jika benar, set cookie (tahan 1 jam)
    cookieStore.set('mock_session', 'true', {
      httpOnly: true, // Lebih aman, tidak bisa dibaca oleh JavaScript client
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600,
      path: '/',
    });
    return { success: true };
  }

  // Jika salah, kembalikan pesan error
  return { success: false, error: 'Email atau password salah!' };
}

export async function logout() {
  // Tambahkan 'await' sebelum cookies()
  const cookieStore = await cookies();
  cookieStore.delete('mock_session');
}