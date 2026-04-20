import type { Metadata } from 'next';
import { Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';

// Instrument Serif — KPI 숫자 · Hero 타이포 (AI slop 제거 장치)
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

// JetBrains Mono — 데이터 테이블 · 로그 · 코드
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ember Admin',
  description: 'Ember 교환일기 소개팅 앱 관리자 대시보드',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
