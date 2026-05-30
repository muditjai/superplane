const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface Offer {
  id: string;
  company: string;
  level: string;
  location: string;
  baseSalary: number;
  role?: string;
  status: string;
  createdAt: string;
  downloadUrl?: string | null;
}

export async function searchOffers(params: {
  q?: string;
  company?: string;
  level?: string;
}): Promise<Offer[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.company) qs.set('company', params.company);
  if (params.level) qs.set('level', params.level);
  const res = await fetch(`${API_BASE}/api/search?${qs}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.results;
}

export async function getOffer(id: string): Promise<Offer> {
  const res = await fetch(`${API_BASE}/api/offers/${id}`);
  if (!res.ok) throw new Error('Offer not found');
  return res.json();
}

export async function uploadOffer(formData: FormData): Promise<Offer> {
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.offer;
}

export async function createPayment(offerId: string, amount = 5) {
  const res = await fetch(`${API_BASE}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offerId, amount }),
  });
  if (!res.ok) throw new Error('Payment failed');
  return res.json();
}

export async function trackEvent(
  type: string,
  offerId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await fetch(`${API_BASE}/api/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, offerId, metadata }),
    });
  } catch {
    // fire-and-forget
  }
}
