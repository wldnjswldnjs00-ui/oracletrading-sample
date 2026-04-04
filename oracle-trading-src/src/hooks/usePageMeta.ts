import { useEffect } from 'react';

const DEFAULT_TITLE = 'Oracle Trading - Investment Strategy Calculator | Compound Interest, Kelly Criterion, Martingale';
const DEFAULT_DESC = 'Professional investment strategy calculator. Calculate compound interest, optimal position sizing with Kelly Criterion, and martingale pyramid strategies. Free financial tools for serious traders.';

export function usePageMeta(title: string, description: string, ogTitle?: string, ogDescription?: string) {
  useEffect(() => {
    // Title
    document.title = title;

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);

    // OG title
    const ogTitleEl = document.querySelector('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.setAttribute('content', ogTitle ?? title);

    // OG description
    const ogDescEl = document.querySelector('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.setAttribute('content', ogDescription ?? description);

    // Twitter title
    const twTitleEl = document.querySelector('meta[name="twitter:title"]');
    if (twTitleEl) twTitleEl.setAttribute('content', ogTitle ?? title);

    // Twitter description
    const twDescEl = document.querySelector('meta[name="twitter:description"]');
    if (twDescEl) twDescEl.setAttribute('content', ogDescription ?? description);

    // Restore defaults on unmount
    return () => {
      document.title = DEFAULT_TITLE;
      if (metaDesc) metaDesc.setAttribute('content', DEFAULT_DESC);
      if (ogTitleEl) ogTitleEl.setAttribute('content', 'Oracle Trading - Investment Strategy Calculator');
      if (ogDescEl) ogDescEl.setAttribute('content', DEFAULT_DESC);
      if (twTitleEl) twTitleEl.setAttribute('content', 'Oracle Trading - Investment Strategy Calculator');
      if (twDescEl) twDescEl.setAttribute('content', DEFAULT_DESC);
    };
  }, [title, description, ogTitle, ogDescription]);
}
