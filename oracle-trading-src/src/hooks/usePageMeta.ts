import { useEffect } from 'react';

const DEFAULT_TITLE = 'Oracle Trading - Investment Strategy Calculator | Compound Interest, Kelly Criterion, Martingale';
const DEFAULT_DESC  = 'Free professional trading calculator. Kelly Criterion, Martingale, Compound Interest — for stocks, crypto, gold, S&P 500, Nasdaq. No signup required.';
const BASE_URL      = 'https://oracletrading.site';

export function usePageMeta(title: string, description: string, ogTitle?: string, ogDescription?: string) {
  useEffect(() => {
    document.title = title;

    const set = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    const og  = ogTitle       ?? title;
    const ogD = ogDescription ?? description;
    const url = BASE_URL + window.location.pathname;

    set('meta[name="description"]',        'content', description);
    set('meta[property="og:title"]',       'content', og);
    set('meta[property="og:description"]', 'content', ogD);
    set('meta[property="og:url"]',         'content', url);
    set('meta[name="twitter:title"]',      'content', og);
    set('meta[name="twitter:description"]','content', ogD);
    set('link[rel="canonical"]',           'href',    url);

    return () => {
      document.title = DEFAULT_TITLE;
      set('meta[name="description"]',        'content', DEFAULT_DESC);
      set('meta[property="og:title"]',       'content', 'Oracle Trading - Investment Strategy Calculator');
      set('meta[property="og:description"]', 'content', DEFAULT_DESC);
      set('meta[property="og:url"]',         'content', BASE_URL + '/');
      set('meta[name="twitter:title"]',      'content', 'Oracle Trading - Investment Strategy Calculator');
      set('meta[name="twitter:description"]','content', DEFAULT_DESC);
      set('link[rel="canonical"]',           'href',    BASE_URL + '/');
    };
  }, [title, description, ogTitle, ogDescription]);
}
