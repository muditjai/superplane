import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createPayment, getOffer, trackEvent, type Offer } from '../api/client';

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getOffer(id)
      .then((o) => {
        setOffer(o);
        trackEvent('offer_view', id, { company: o.company });
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDownload() {
    if (!offer) return;
    setPaying(true);
    setError('');
    try {
      await createPayment(offer.id, 5);
      await trackEvent('offer_purchased', offer.id, { amount: 5 });
      setPaid(true);
      if (offer.downloadUrl && !offer.downloadUrl.startsWith('local://')) {
        window.open(offer.downloadUrl, '_blank');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <p className="text-center py-20 text-zinc-400">Loading...</p>;
  if (!offer) return <p className="text-center py-20 text-red-400">{error || 'Not found'}</p>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link to="/search" className="text-sm text-zinc-400 hover:text-white">
        ← Back to search
      </Link>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <h1 className="text-3xl font-bold">{offer.company}</h1>
        <p className="mt-2 text-zinc-400">
          {offer.level} · {offer.location}
        </p>
        <p className="mt-4 text-2xl text-emerald-400 font-semibold">
          ${offer.baseSalary.toLocaleString()} base
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Posted {new Date(offer.createdAt).toLocaleDateString()}
        </p>

        <button
          onClick={handleDownload}
          disabled={paying || paid}
          className="mt-8 w-full rounded-xl bg-white text-zinc-950 font-medium py-3 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
        >
          {paid ? 'Download unlocked' : paying ? 'Processing...' : 'Download (mock $5)'}
        </button>
        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
        {paid && (
          <p className="mt-4 text-emerald-400 text-sm">
            Mock payment complete. PDF download link generated.
          </p>
        )}
      </div>
    </div>
  );
}
