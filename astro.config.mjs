// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';

// Hebrew articles have canonical URLs under /he/blog/, including future posts.
const blogDirectory = new URL('./src/content/blog/', import.meta.url);
const legacyHebrewPaths = new Set(readdirSync(blogDirectory)
  .filter((file) => file.endsWith('.md') && /^lang:\s*['\"]?he['\"]?\s*$/m.test(readFileSync(new URL(file, blogDirectory), 'utf8').split('---')[1] ?? ''))
  .map((file) => `/blog/${file.slice(0, -3)}/`));

export default defineConfig({
  site: 'https://futureproofagents.com',
  integrations: [sitemap({ filter: (page) => !legacyHebrewPaths.has(new URL(page).pathname) && !new Set(["/blog/ai-agent-tools-stack-he/", "/blog/timlul-pgishot-maagar-yeda/", "/blog/ai-agents-vs-skills-he/", "/blog/ai-development-agent-team-chat-he/", "/blog/ai-inference-market-guide-he/", "/blog/ai-agents-clinic-three-systems-he/", "/blog/build-ai-agent-team-orchestration-he/", "/blog/kids-song-video-ai-he/", "/blog/run-ai-agents-in-the-cloud-24-7-he/", "/he/recruiting-help/cto/", "/shenkar/2/", "/404/", "/404.html", "/zap/", "/dorit/", "/ati/", "/zuron/", "/he/cto/", "/he/cto/thanks/", "/he/recruiting-help/cto/thanks/"]).has(new URL(page).pathname) })],
  redirects: {
    '/he/cto/': '/he/recruiting-help/cto/',
    '/he/cto/thanks/': '/he/recruiting-help/cto/thanks/',
  },
});
