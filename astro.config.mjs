// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://futureproofagents.com',
  integrations: [sitemap({ filter: (page) => !new Set(["/blog/ai-agent-tools-stack-he/", "/blog/timlul-pgishot-maagar-yeda/", "/blog/ai-agents-vs-skills-he/", "/blog/ai-development-agent-team-chat-he/", "/blog/ai-inference-market-guide-he/", "/blog/ai-agents-clinic-three-systems-he/", "/blog/build-ai-agent-team-orchestration-he/", "/blog/kids-song-video-ai-he/", "/blog/run-ai-agents-in-the-cloud-24-7-he/", "/404/", "/404.html", "/zap/", "/dorit/", "/ati/", "/zuron/", "/he/cto/", "/he/cto/thanks/", "/he/recruiting-help/cto/thanks/"]).has(new URL(page).pathname) })],
  redirects: {
    '/he/cto/': '/he/recruiting-help/cto/',
    '/he/cto/thanks/': '/he/recruiting-help/cto/thanks/',
  },
});
