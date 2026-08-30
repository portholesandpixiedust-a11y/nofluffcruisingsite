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
  markdown: { rehypePlugins: [rehypeWrapTables] },
});
