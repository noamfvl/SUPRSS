import '@/app/globals.css';
import { ReactNode } from 'react';

export const metadata = { title: 'SUPRSS', description: 'Lecteur RSS collaboratif' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="
        min-h-screen
        bg-slate-50 text-slate-900
        dark:bg-slate-900 dark:text-slate-100
        antialiased transition-colors
      ">
        {children}
      </body>
    </html>
  );
}
