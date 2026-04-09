import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/header';
import { Providers } from '@/components/providers';
import { AuthGuard } from '@/components/auth/auth-guard';

// Lazy load pages for isolation
const HomePage = lazy(() => import('./app/page'));
const AiPage = lazy(() => import('./app/ai/page'));
const LoginPage = lazy(() => import('./app/auth/login/page'));
const RegisterPage = lazy(() => import('./app/auth/register/page'));
const ConnectionsPage = lazy(() => import('./app/connections/page'));

const SettingsPage = lazy(() => import('./app/settings/page'));
const SqlLabPage = lazy(() => import('./app/sqllab/page'));
const UnauthorizedPage = lazy(() => import('./app/unauthorized/page'));

function App() {
  return (
    <Providers>
      <AuthGuard>
        <div className="relative flex h-screen flex-col bg-background overflow-hidden">
          <Header />
          <main className="flex-1 flex flex-col overflow-hidden">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center">Loading page...</div>}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/ai" element={<AiPage />} />
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route path="/connections" element={<ConnectionsPage />} />

                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/sqllab" element={<SqlLabPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                
                {/* Fallback to 404 or home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </AuthGuard>
    </Providers>
  );
}

export default App;
