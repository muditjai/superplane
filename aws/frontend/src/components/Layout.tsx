import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            <span className="text-zinc-400">O</span>fferletters.fyi
          </Link>
          <nav className="flex gap-6 text-sm text-zinc-400">
            <Link to="/search" className="hover:text-white transition-colors">
              Search
            </Link>
            <Link to="/about" className="hover:text-white transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        <p>Made with care for transparency</p>
        <div className="mt-2 flex justify-center gap-4">
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
