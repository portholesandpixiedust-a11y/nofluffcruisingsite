import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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
  integrations: [sitemap()],
  build: { format: 'directory' },
  // The auto-publish pipeline truncates long slugs, so this post first went live at a URL missing the last letter of "change". Point the old path at the corrected one.
  redirects: { '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-chang': '/reviews/virgin-voyages-resilient-lady-the-real-cost-after-the-gratuities-change' },
  markdown: { rehypePlugins: [rehypeWrapTables] },
});
