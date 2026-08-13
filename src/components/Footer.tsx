export default function Footer() {
  return (
    <footer className="mt-16">
      <div className="stripe-bar h-1.5 w-full" />
      <div className="bg-navy px-4 py-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-lg font-extrabold">SHPE LAMC</p>
            <p className="text-sm text-white/70">Los Angeles Mission College</p>
          </div>
          <div className="text-sm text-white/70">
            <p>
              Email: <span className="font-semibold text-gold">[chapter email]</span>
            </p>
            <p>
              Instagram: <span className="font-semibold text-gold">[@handle]</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
