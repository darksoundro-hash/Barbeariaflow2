const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3000';

export async function createCheckoutSession(priceId: string, uid: string, shopId: string) {
  const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, uid, shopId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao criar sessão de checkout');
  }

  const { url } = await res.json();
  return url as string;
}
