import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
}

export function useSEO({ title, description, image, url, type = 'website' }: SEOProps) {
  useEffect(() => {
    document.title = `${title} | Isekai World`;

    setMeta('description', description ?? '');

    setOG('title', `${title} | Isekai World`);
    setOG('description', description ?? '');
    setOG('type', type);
    if (image) setOG('image', image);
    if (url) setOG('url', url);

    setMeta('twitter:title', `${title} | Isekai World`);
    setMeta('twitter:description', description ?? '');
    if (image) setMeta('twitter:image', image);
  }, [title, description, image, url, type]);
}

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOG(property: string, content: string) {
  let el = document.querySelector(`meta[property="og:${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', `og:${property}`);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
