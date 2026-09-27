import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { buildLastmodMap } from './src/utils/lastmodMap.js';

const lastmodMap = buildLastmodMap();

// Markdown emits bare <table> elements, which blow past the viewport on phones.
// Wrap each one so it scrolls inside its own box instead of scrolling the page.
function rehypeWrapTables() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: { className: ['tablewrap'] },
            children: [child],
          };
        }
        return child;
      });
    };
    walk(tree);
  };
}

export default defineConfig({
  site: 'https://nofluffcruising.com',
  integrations: [
    sitemap({
      // lastmod is updatedAt ?? updatedDate ?? publishedAt ?? publishDate.
      // @astrojs/sitemap writes that instant as UTC ISO. Date-only values are noon ET, not midnight UTC.
      serialize(item) {
        const path = new URL(item.url).pathname;
        const key = path.endsWith('/') ? path : `${path}/`;
        const date = lastmodMap.get(key);
        if (date) item.lastmod = date;
        return item;
      },
    }),
  ],
  build: { format: 'directory' },
  // Duplicate-URL 301s live in vercel.json (real HTTP redirects). These remain HTML fallbacks for hosts without that file.
  redirects: {
    '/sitemap.xml': '/sitemap-index.xml',
    '/terms-of-service': '/terms/',
    '/privacy-policy': '/privacy/',
    '/news/margaritaville-at-sea': '/news/margaritaville/',
  },
  markdown: { rehypePlugins: [rehypeWrapTables] },
});
