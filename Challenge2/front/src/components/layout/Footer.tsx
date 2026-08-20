import content from '../../content/es.json';

const { brand, footer } = content;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex-none border-t border-neutral-200 bg-white">
      <div className="flex w-full flex-col items-center gap-1 px-4 py-4 text-center text-xs text-neutral-500 sm:flex-row sm:justify-between sm:px-6">
        <p>
          © {year} {brand.name}. {footer.rights}
        </p>
        <p>{footer.tagline}</p>
      </div>
    </footer>
  );
}
