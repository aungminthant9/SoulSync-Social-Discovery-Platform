'use client';

import { motion } from 'framer-motion';

export type Hobby = {
  id: string;
  label: string;
  emoji: string;
  category: string;
};

export const HOBBY_CATEGORIES: { name: string; emoji: string; hobbies: Hobby[] }[] = [
  {
    name: 'Music & Arts',
    emoji: '🎵',
    hobbies: [
      { id: 'music', label: 'Music', emoji: '🎵', category: 'Music & Arts' },
      { id: 'singing', label: 'Singing', emoji: '🎤', category: 'Music & Arts' },
      { id: 'dancing', label: 'Dancing', emoji: '💃', category: 'Music & Arts' },
      { id: 'painting', label: 'Painting', emoji: '🎨', category: 'Music & Arts' },
      { id: 'photography', label: 'Photography', emoji: '📷', category: 'Music & Arts' },
      { id: 'writing', label: 'Writing', emoji: '✍️', category: 'Music & Arts' },
      { id: 'theatre', label: 'Theatre', emoji: '🎭', category: 'Music & Arts' },
      { id: 'filmmaking', label: 'Film Making', emoji: '🎬', category: 'Music & Arts' },
    ],
  },
  {
    name: 'Sports & Fitness',
    emoji: '🏃',
    hobbies: [
      { id: 'gym', label: 'Gym', emoji: '🏋️', category: 'Sports & Fitness' },
      { id: 'yoga', label: 'Yoga', emoji: '🧘', category: 'Sports & Fitness' },
      { id: 'running', label: 'Running', emoji: '🏃', category: 'Sports & Fitness' },
      { id: 'hiking', label: 'Hiking', emoji: '🥾', category: 'Sports & Fitness' },
      { id: 'swimming', label: 'Swimming', emoji: '🏊', category: 'Sports & Fitness' },
      { id: 'cycling', label: 'Cycling', emoji: '🚴', category: 'Sports & Fitness' },
      { id: 'football', label: 'Football', emoji: '⚽', category: 'Sports & Fitness' },
      { id: 'basketball', label: 'Basketball', emoji: '🏀', category: 'Sports & Fitness' },
      { id: 'tennis', label: 'Tennis', emoji: '🎾', category: 'Sports & Fitness' },
      { id: 'martialarts', label: 'Martial Arts', emoji: '🥋', category: 'Sports & Fitness' },
    ],
  },
  {
    name: 'Food & Travel',
    emoji: '✈️',
    hobbies: [
      { id: 'cooking', label: 'Cooking', emoji: '🍳', category: 'Food & Travel' },
      { id: 'baking', label: 'Baking', emoji: '🧁', category: 'Food & Travel' },
      { id: 'travel', label: 'Travel', emoji: '✈️', category: 'Food & Travel' },
      { id: 'foodie', label: 'Food Tasting', emoji: '🍜', category: 'Food & Travel' },
      { id: 'coffee', label: 'Coffee', emoji: '☕', category: 'Food & Travel' },
      { id: 'camping', label: 'Camping', emoji: '⛺', category: 'Food & Travel' },
      { id: 'roadtrip', label: 'Road Trips', emoji: '🚗', category: 'Food & Travel' },
      { id: 'wine', label: 'Wine & Dining', emoji: '🍷', category: 'Food & Travel' },
    ],
  },
  {
    name: 'Gaming & Tech',
    emoji: '🎮',
    hobbies: [
      { id: 'gaming', label: 'Gaming', emoji: '🎮', category: 'Gaming & Tech' },
      { id: 'coding', label: 'Coding', emoji: '💻', category: 'Gaming & Tech' },
      { id: 'anime', label: 'Anime', emoji: '⛩️', category: 'Gaming & Tech' },
      { id: 'content', label: 'Content Creation', emoji: '📱', category: 'Gaming & Tech' },
      { id: 'podcast', label: 'Podcasting', emoji: '🎙️', category: 'Gaming & Tech' },
      { id: 'vr', label: 'VR / AR', emoji: '🥽', category: 'Gaming & Tech' },
    ],
  },
  {
    name: 'Mind & Soul',
    emoji: '🌿',
    hobbies: [
      { id: 'reading', label: 'Reading', emoji: '📚', category: 'Mind & Soul' },
      { id: 'meditation', label: 'Meditation', emoji: '🧘', category: 'Mind & Soul' },
      { id: 'gardening', label: 'Gardening', emoji: '🌱', category: 'Mind & Soul' },
      { id: 'animals', label: 'Animals & Pets', emoji: '🐾', category: 'Mind & Soul' },
      { id: 'stargazing', label: 'Stargazing', emoji: '🔭', category: 'Mind & Soul' },
      { id: 'spirituality', label: 'Spirituality', emoji: '🕯️', category: 'Mind & Soul' },
      { id: 'volunteering', label: 'Volunteering', emoji: '🤝', category: 'Mind & Soul' },
      { id: 'languages', label: 'Languages', emoji: '🗣️', category: 'Mind & Soul' },
    ],
  },
];

// Flat lookup map for quick emoji display
export const HOBBY_MAP: Record<string, string> = {};
HOBBY_CATEGORIES.forEach(cat => cat.hobbies.forEach(h => { HOBBY_MAP[h.id] = h.emoji; HOBBY_MAP[h.label.toLowerCase()] = h.emoji; }));

const MAX_HOBBIES = 10;

type Props = {
  selected: string[];
  onChange: (selected: string[]) => void;
  readOnly?: boolean;
};

export default function HobbyPicker({ selected, onChange, readOnly = false }: Props) {
  const toggle = (id: string) => {
    if (readOnly) return;
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      if (selected.length >= MAX_HOBBIES) return;
      onChange([...selected, id]);
    }
  };

  const isSelected = (id: string) => selected.includes(id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Pick up to {MAX_HOBBIES} hobbies that represent you
          </p>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
            background: selected.length >= MAX_HOBBIES ? 'rgba(249,115,22,0.1)' : 'var(--bg-elevated)',
            color: selected.length >= MAX_HOBBIES ? '#F97316' : 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
          }}>
            {selected.length}/{MAX_HOBBIES}
          </span>
        </div>
      )}

      {HOBBY_CATEGORIES.map((cat) => (
        <div key={cat.name}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 10px' }}>
            {cat.emoji} {cat.name}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cat.hobbies.map((hobby, i) => {
              const active = isSelected(hobby.id) || isSelected(hobby.label.toLowerCase()) || isSelected(hobby.label);
              const disabled = !readOnly && !active && selected.length >= MAX_HOBBIES;
              return (
                <motion.button
                  key={hobby.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => toggle(hobby.id)}
                  disabled={disabled}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                    fontSize: 13, fontWeight: 600, cursor: readOnly ? 'default' : (disabled ? 'not-allowed' : 'pointer'),
                    transition: 'all 0.15s ease',
                    background: active ? 'var(--color-brand-subtle)' : 'var(--bg-elevated)',
                    borderColor: active ? 'var(--color-brand)' : 'var(--border-subtle)',
                    color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
                    opacity: disabled ? 0.4 : 1,
                    boxShadow: active ? '0 0 0 3px rgba(var(--color-brand-rgb, 232,96,76), 0.12)' : 'none',
                    transform: 'scale(1)',
                  }}
                  whileHover={!disabled && !readOnly ? { scale: 1.04 } : {}}
                  whileTap={!disabled && !readOnly ? { scale: 0.95 } : {}}
                >
                  <span style={{ fontSize: 15 }}>{hobby.emoji}</span>
                  {hobby.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
