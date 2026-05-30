import { useEffect, useState } from 'react';
import { searchOffers, trackEvent, type Offer } from '../api/client';
import OfferCard from '../components/OfferCard';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [company, setCompany] = useState('');
  const [level, setLevel] = useState('');
  const [results, setResults] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const data = await searchOffers({ q, company, level });
        if (!cancelled) setResults(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [q, company, level]);

  useEffect(() => {
    trackEvent('search_view');
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Search offer letters</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <input
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2"
        />
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2"
        />
        <input
          placeholder="Level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2"
        />
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : results.length === 0 ? (
        <p className="text-zinc-400">No offers found yet. Be the first to upload.</p>
      ) : (
        <div className="grid gap-4">
          {results.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </div>
  );
}
