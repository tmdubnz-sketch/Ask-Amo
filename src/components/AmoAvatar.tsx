import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface AmoAvatarProps {
  className?: string;
  animate?: boolean;
  interactionMode?: 'default' | 'web-active';
}

export function AmoAvatar({ className, animate = true, interactionMode = 'default' }: AmoAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const isWebActive = interactionMode === 'web-active';

  useEffect(() => {
    if (!animate) {
      return;
    }

    let blinkTimer: number | undefined;
    let nextBlinkTimer: number | undefined;

    const queueBlink = () => {
      const delay = 2200 + Math.floor(Math.random() * 3400);
      nextBlinkTimer = window.setTimeout(() => {
        setIsBlinking(true);
        blinkTimer = window.setTimeout(() => {
          setIsBlinking(false);
          queueBlink();
        }, 140);
      }, delay);
    };

    queueBlink();

    return () => {
      window.clearTimeout(blinkTimer);
      window.clearTimeout(nextBlinkTimer);
    };
  }, [animate]);

  return (
    <svg
      viewBox="0 0 128 128"
      aria-hidden="true"
      className={cn('amo-avatar drop-shadow-[0_0_24px_rgba(255,120,64,0.3)]', className)}
    >
      <defs>
        <linearGradient id="amo-shell" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#121212" />
          <stop offset="100%" stopColor="#24110d" />
        </linearGradient>
        <linearGradient id="amo-trim" x1="0%" x2="100%" y1="50%" y2="50%">
          <stop offset="0%" stopColor="#ff8c5a" />
          <stop offset="100%" stopColor="#ff4e00" />
        </linearGradient>
      </defs>

      <rect x="20" y="22" width="88" height="88" rx="28" fill="url(#amo-shell)" />
      <rect x="20" y="22" width="88" height="88" rx="28" fill="none" opacity="0.9" stroke="url(#amo-trim)" strokeWidth="4" />
      <path d="M54 18L64 8L74 18" fill="none" stroke="url(#amo-trim)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
      <path d="M64 8V22" fill="none" stroke="url(#amo-trim)" strokeLinecap="round" strokeWidth="4" />
      <circle cx="64" cy="44" r="4" fill={isWebActive ? '#23d96e' : '#ff7b47'} />

      <g className={cn('origin-center transition-transform duration-100', isBlinking ? 'scale-y-[0.18]' : 'scale-y-100')}>
        <path d="M38 60H56" fill="none" stroke={isWebActive ? '#2ce57b' : '#fff1ea'} strokeLinecap="round" strokeWidth="6" />
        <path d="M72 60H90" fill="none" stroke={isWebActive ? '#2ce57b' : '#fff1ea'} strokeLinecap="round" strokeWidth="6" />
      </g>

      <path d="M44 84H84" fill="none" opacity="0.9" stroke="url(#amo-trim)" strokeLinecap="round" strokeWidth="5" />
      <path d="M37 74H91" fill="none" opacity="0.35" stroke="#ffffff" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}
