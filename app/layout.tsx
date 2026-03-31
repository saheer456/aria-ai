import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Aria — AI Assistant',
  description: 'Premium AI assistant powered by Groq, Gemini, and more. Chat, create, and explore with Aria.',
  keywords: ['AI assistant', 'chat AI', 'Aria', 'Groq', 'Gemini', 'voice AI'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Aria',
  },
  openGraph: {
    title: 'Aria — AI Assistant',
    description: 'Your premium AI companion',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d9488',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/192.png" />
      </head>
      <body className={`${outfit.variable} antialiased min-h-screen`} style={{ background: 'var(--aria-bg)', fontFamily: 'var(--font-outfit, sans-serif)' }}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderRadius: '12px',
                fontSize: '14px',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
