import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackEvent, uploadOffer } from '../api/client';
import UploadDropzone from '../components/UploadDropzone';

export default function HomePage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [company, setCompany] = useState('');
  const [level, setLevel] = useState('');
  const [location, setLocation] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [error, setError] = useState('');

  async function handleUpload(file: File) {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('company', company || 'Anonymous Co');
      form.append('level', level || 'Unknown');
      form.append('location', location || 'Remote');
      form.append('baseSalary', baseSalary || '0');
      const offer = await uploadOffer(form);
      await trackEvent('offer_uploaded', offer.id, { company: offer.company });
      navigate(`/offers/${offer.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        Transparency starts with a letter.
      </h1>
      <p className="mt-4 text-zinc-400 text-lg max-w-xl mx-auto">
        Upload your offer letter anonymously. Search and find offer letters from
        other top companies. Modify and download them.
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 text-left max-w-lg mx-auto">
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
        />
        <input
          placeholder="Level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
        />
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
        />
        <input
          placeholder="Base salary"
          type="number"
          value={baseSalary}
          onChange={(e) => setBaseSalary(e.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-8">
        <UploadDropzone onUpload={handleUpload} disabled={uploading} />
      </div>

      {uploading && <p className="mt-4 text-zinc-400">Uploading and redacting...</p>}
      {error && <p className="mt-4 text-red-400">{error}</p>}

      <p className="mt-8 text-xs text-zinc-500">Your privacy is protected</p>
    </div>
  );
}
