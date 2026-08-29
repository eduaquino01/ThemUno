'use client';

import { useState } from 'react';
import { Sparkles, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';

interface PasswordInputWithGeneratorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function PasswordInputWithGenerator({
  value,
  onChange,
  placeholder = 'Ex: S3cr3tP@ssw0rd!',
  required = true,
}: PasswordInputWithGeneratorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gera um índice aleatório no intervalo [0, max) usando o gerador
  // criptograficamente seguro do navegador. Math.random() não tem garantia
  // de imprevisibilidade e não deveria gerar nada usado como segredo.
  const secureRandomIndex = (max: number) => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };

  const secureShuffle = <T,>(items: T[]): T[] => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = secureRandomIndex(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  // Generate a random 16-character high entropy password
  const generateStrongPassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const all = uppercase + lowercase + numbers + symbols;
    const chars: string[] = [];

    // Ensure at least one character from each set
    chars.push(uppercase.charAt(secureRandomIndex(uppercase.length)));
    chars.push(lowercase.charAt(secureRandomIndex(lowercase.length)));
    chars.push(numbers.charAt(secureRandomIndex(numbers.length)));
    chars.push(symbols.charAt(secureRandomIndex(symbols.length)));

    for (let i = 4; i < 16; i++) {
      chars.push(all.charAt(secureRandomIndex(all.length)));
    }

    const pwd = secureShuffle(chars).join('');

    onChange(pwd);
    setIsVisible(true);
  };

  // Evaluate password strength
  const getStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-[#1e293b]', textColor: 'text-gray-500' };

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 25, label: 'Fraca', color: 'bg-rose-500', textColor: 'text-rose-400' };
    if (score === 3) return { score: 50, label: 'Média', color: 'bg-amber-500', textColor: 'text-amber-400' };
    if (score === 4) return { score: 75, label: 'Forte', color: 'bg-blue-500', textColor: 'text-blue-400' };
    return { score: 100, label: 'Extremamente Forte', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
  };

  const strength = getStrength(value);

  return (
    <div className="space-y-2">
      <div className="relative flex items-center">
        <input
          type={isVisible ? 'text' : 'password'}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-3 pr-24 py-2.5 bg-slate-950 border border-[#1e293b] rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
        />

        <div className="absolute right-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title={isVisible ? 'Ocultar' : 'Mostrar'}
          >
            {isVisible ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={generateStrongPassword}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-lg text-[10px] font-bold transition-all"
            title="Gerar Senha Segura Aleatória"
          >
            <Sparkles className="w-3 h-3 text-amber-300" /> Gerar
          </button>
        </div>
      </div>

      {/* STRENGTH METER BAR */}
      {value && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-blue-400" /> Força da Senha:
            </span>
            <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-[#1e293b]">
            <div
              className={`h-full transition-all duration-300 ${strength.color}`}
              style={{ width: `${strength.score}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
