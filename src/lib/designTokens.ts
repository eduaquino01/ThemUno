/**
 * ThemUno CLMS - Design System & Visual Tokens
 */

export const DESIGN_TOKENS = {
  colors: {
    brand: {
      primary: '#3b82f6', // Blue-500
      secondary: '#6366f1', // Indigo-500
      accent: '#8b5cf6', // Purple-500
      darkBg: '#090d16',
      cardBg: '#0d1527',
      border: '#1e293b',
    },
    semantic: {
      revenue: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/20',
        solid: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      },
      expense: {
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/20',
        solid: 'bg-rose-600 hover:bg-rose-500 text-white',
      },
      warning: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/20',
        solid: 'bg-amber-600 hover:bg-amber-500 text-white',
      },
      info: {
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/20',
        solid: 'bg-blue-600 hover:bg-blue-500 text-white',
      },
    },
  },
  animations: {
    hoverScale: 'hover:scale-[1.02] active:scale-[0.98] transition-all duration-200',
    fadeIn: 'animate-fade-in',
    glowHover: 'hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300',
  },
  glassmorphism: 'bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl',
};
