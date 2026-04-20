'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Ember 다크 모드 토글
 * - light / dark / system 3-way
 * - /design-consultation v1.0 — DESIGN.md §11 컴포넌트 참조
 */
export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // SSR hydration mismatch 방지
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="테마 전환" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const resolved = theme === 'system' ? systemTheme : theme;

  const handleToggle = () => {
    // light → dark → system → light ...
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const icon =
    theme === 'system' ? (
      <Monitor className="h-5 w-5" />
    ) : resolved === 'dark' ? (
      <Moon className="h-5 w-5" />
    ) : (
      <Sun className="h-5 w-5" />
    );

  const label =
    theme === 'system' ? '시스템 설정' : resolved === 'dark' ? '다크 모드' : '라이트 모드';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={`테마 전환 (현재: ${label})`}
      title={`${label} — 클릭하여 전환`}
      className="transition-colors duration-short"
    >
      {icon}
    </Button>
  );
}
