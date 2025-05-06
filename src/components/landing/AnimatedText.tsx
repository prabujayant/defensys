import React from 'react';

interface AnimatedTextProps {
  children: React.ReactNode;
  delay: string;
}

export function AnimatedText({ children, delay }: AnimatedTextProps) {
  return (
    <div
      className="opacity-0 translate-y-4 animate-fade-in"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {children}
    </div>
  );
}