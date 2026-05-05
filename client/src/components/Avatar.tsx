'use client';

import { useState } from 'react';

/**
 * Shared Avatar component.
 *
 * Renders the avatar image when `avatarUrl` is provided and the URL resolves.
 * If the image fails to load (e.g. Supabase 404 for a deleted/expired photo),
 * it silently falls back to a coloured initials circle — preventing the
 * intermittent "canvas 404 (Not Found)" console errors that appeared whenever
 * a user's avatar_url pointed to a missing resource.
 */
export default function Avatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  style = {},
}: {
  name: string;
  avatarUrl?: string | null;
  /** 'sm' = 28px  |  'md' = 32px  |  'lg' = 36px  |  'xl' = 48px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}) {
  const [imgError, setImgError] = useState(false);

  const hue = name ? name.charCodeAt(0) * 137 : 0;
  const bg = `hsl(${hue % 360}, 60%, 55%)`;

  const sizeMap: Record<string, { px: number; text: string }> = {
    sm: { px: 28, text: '10px' },
    md: { px: 32, text: '12px' },
    lg: { px: 36, text: '13px' },
    xl: { px: 48, text: '16px' },
  };
  const { px, text } = sizeMap[size];

  const baseStyle: React.CSSProperties = {
    width: px,
    height: px,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
    ...style,
  };

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={className}
        style={baseStyle}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: text,
      }}
    >
      {name?.charAt(0).toUpperCase()}
    </div>
  );
}
