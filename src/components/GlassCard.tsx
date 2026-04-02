import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  animateFloat?: boolean;
  delayFloat?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hoverEffect = false,
  animateFloat = false,
  delayFloat = false
}) => {
  const hoverClass = hoverEffect ? 'glass-panel-hover' : '';
  let floatClass = '';
  if (animateFloat) {
    floatClass = delayFloat ? 'animate-float-delayed' : 'animate-float';
  }

  return (
    <div className={`glass-panel ${hoverClass} ${floatClass} ${className} p-6`}>
      {children}
    </div>
  );
};
