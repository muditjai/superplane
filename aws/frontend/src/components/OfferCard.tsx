import { Link } from 'react-router-dom';
import type { Offer } from '../api/client';

interface OfferCardProps {
  offer: Offer;
}

export default function OfferCard({ offer }: OfferCardProps) {
  return (
    <Link
      to={`/offers/${offer.id}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">{offer.company}</h3>
          <p className="text-zinc-400 text-sm mt-1">
            {offer.level} · {offer.location}
          </p>
        </div>
        <div className="text-right">
          <p className="text-emerald-400 font-medium">
            ${offer.baseSalary.toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            {new Date(offer.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Link>
  );
}
