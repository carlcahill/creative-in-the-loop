import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://creativeintheloop.com',
  integrations: [mdx()],
  output: 'static',
});
