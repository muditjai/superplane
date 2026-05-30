export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 prose prose-invert">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="mt-4 text-zinc-400 leading-relaxed">
        Superplane Offer Letters is a demo platform for sharing anonymized offer
        letters. Upload your PDF, we redact sensitive details, and make it
        searchable for the community.
      </p>
      <p className="mt-4 text-zinc-400 leading-relaxed">
        Built as part of the Superplane AWS→GCP migration demo. Payments are mock
        only in this version.
      </p>
    </div>
  );
}
