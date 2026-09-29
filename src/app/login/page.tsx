'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Hexagon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { login } from '../actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result.success) {
      router.push('/admin');
      router.refresh();
    } else {
      setErrorMessage(result.error || 'Terjadi kesalahan');
      setIsLoading(false);
    }
  };

  return (
    // Container utama dengan background full warna primer
    <div className="min-h-screen flex bg-primary">
      
      {/* Bagian Kiri: Gambar Foto Balai dengan efek fade */}
      {/* Hanya tampil di layar berukuran besar (lg) */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/login.png')", // Pastikan gambar balai Anda menggunakan nama ini
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        {/* Gradien yang menciptakan efek memudar dari gambar ke warna primer di sisi kanan */}
        <div className="absolute inset-0 bg-gradient-to-r   to-primary"></div>
      </div>

      {/* Bagian Kanan: Form Login */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-8 sm:p-12 relative z-10">
        
        {/* Dekorasi blur halus di pojok kanan atas untuk menambah estetika */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 opacity-10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        {/* Kartu Form Login */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 z-10"
        >
          <div className="text-center mb-10">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-primary/20"
            >
              <Hexagon className="text-primary w-8 h-8" fill="currentColor" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Portal Balai</h1>
            <p className="text-gray-500 mt-3 font-medium">Silakan masuk ke akun administrator Anda</p>
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg font-medium"
            >
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-gray-900 text-sm outline-none transition-all font-medium"
                  placeholder="admin@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Kata Sandi</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-gray-900 text-sm outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2">
              <label className="flex items-center text-gray-600 font-medium cursor-pointer hover:text-gray-900 transition-colors">
                <input type="checkbox" className="mr-2.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                Ingat sesi saya
              </label>
              <a href="#" className="text-primary hover:text-blue-900 font-bold transition-colors">
                Lupa sandi?
              </a>
            </div>

            <motion.button
              whileHover={{ scale: 1.01, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-lg shadow-primary/30 text-sm font-bold text-white bg-primary hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Masuk ke Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}