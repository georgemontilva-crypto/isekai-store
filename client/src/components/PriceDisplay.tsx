interface PriceDisplayProps {
  price: number | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PriceDisplay({ price, className = '', size = 'md' }: PriceDisplayProps) {
  const amount = parseFloat(String(price));

  const sizes = {
    sm: { price: 'text-sm font-bold' },
    md: { price: 'text-lg font-black' },
    lg: { price: 'text-2xl font-black' },
  };

  return (
    <span className={`${sizes[size].price} ${className}`} style={{ color: '#e5007d' }}>
      ${amount.toFixed(2)} USD
    </span>
  );
}
