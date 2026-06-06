import { trpc } from '@/lib/trpc';

export function useExchangeRate() {
  const { data } = trpc.settings.getExchangeRate.useQuery(undefined, {
    refetchInterval: 1000 * 60 * 60,
    staleTime: 1000 * 60 * 30,
  });

  const rate = data?.usdToCOP ?? 4200;

  const toUSD = (cop: number | string): string => {
    const amount = parseFloat(String(cop));
    if (isNaN(amount)) return '0.00';
    return (amount / rate).toFixed(2);
  };

  return { rate, toUSD };
}
