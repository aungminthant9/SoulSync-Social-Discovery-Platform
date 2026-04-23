'use client';

import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full select-none"
      style={{ background: 'var(--bg-base)' }}>

      {/* Subtle dot-grid background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(var(--color-brand) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center z-10">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
          style={{ background: 'var(--color-brand-subtle)', border: '1px solid var(--border-default)' }}>
          <MessageCircle className="w-10 h-10" style={{ color: 'var(--color-brand)' }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Your Messages
        </h2>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
          Select a conversation from the left to start chatting with your matches.
        </p>
      </motion.div>
    </div>
  );
}
