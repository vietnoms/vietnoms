export function PartnersSection() {
  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-display text-xl font-semibold text-gray-400">
            Also available through our partners
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-8 text-gray-500">
            <a
              href="https://www.ezcater.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors text-sm font-medium"
            >
              EzCater
            </a>
            <a
              href="https://www.forkable.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors text-sm font-medium"
            >
              Forkable
            </a>
            <a
              href="https://www.foodja.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors text-sm font-medium"
            >
              Foodja
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
