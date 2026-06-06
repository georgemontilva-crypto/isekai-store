import { useExchangeRate } from '@/hooks/useExchangeRate';

interface PriceDisplayProps {
  price: number | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ price, className = '', size = 'md' }: PriceDisplayProps) {
  const { toUSD } = useExchangeRate();

  const cop = parseFloat(String(price));
  const usd = toUSD(cop);

  const sizes = {
    sm: { cop: 'text-sm font-bold', usd: 'text-xs' },
    md: { cop: 'text-lg font-black', usd: 'text-xs' },
    lg: { cop: 'text-2xl font-black', usd: 'text-sm' },
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={sizes[size].cop} style={{ color: '#e5007d' }}>
        COP {cop.toLocaleString('es-CO')}
      </span>
      <span className={`${sizes[size].usd} text-[#999]`}>
        USD {parseFloat(usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
