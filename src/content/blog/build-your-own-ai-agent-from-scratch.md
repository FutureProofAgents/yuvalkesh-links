---
title: "How to Build Your Own AI Agent From Scratch: One Saturday, a $4.95 Server and a Telegram Bot Named John Connor"
description: "A step-by-step guide to setting up a self-hosted AI agent with OpenClaw, Telegram, Composio and local Whisper, with the real traps from one day of doing it."
pubDate: 2026-09-07
lang: en
tags: ["build an AI agent", "OpenClaw", "Telegram bot", "Composio", "self-hosted AI agent", "AI agent setup"]
translationOf: build-your-own-ai-agent-from-scratch-he
stickyCta:
  href: "https://clawbud.ai/?ref=YUVAL30"
  label: "Set up an agent with ClawBud"
  eyebrow: "The fast way to start"
faq:
  - q: "What do I need to build my own AI agent?"
    a: "Five things. A machine that stays on, a gateway like OpenClaw that runs the agent loop, a model subscription or API key, a channel such as Telegram, and a way to give it tools, for example Composio. Memory and skills come after the first message works."
  - q: "How much does a self-hosted AI agent cost per month?"
    a: "In this setup the server was a $4.95 VPS and the model ran on an existing ChatGPT subscription through OAuth. Voice transcription ran on a free local Whisper model. Total new spend: under five dollars a month."
  - q: "Is OpenClaw safe to run?"
    a: "It is as safe as the boundaries you set. Keep the Telegram DM policy on an allowlist, keep the dashboard behind an SSH tunnel, allowlist plugins explicitly, vet every community skill, and never paste a secret into the chat. The agent in this guide caught and fixed its own critical plugin finding."
  - q: "Why did Composio authentication take so long?"
    a: "Three reasons that had nothing to do with the code. The login was first run on the laptop instead of the server, the terminal wrapped the one-time login link so a character fell off the end, and the links expire fast. Run the login on the server with no-browser mode and copy the whole link."
  - q: "Can the agent understand Hebrew voice messages?"
    a: "Yes. Local Whisper handles Hebrew with no API key. The first pass garbled the middle of a mixed Hebrew and English message, so the agent was given a standing rule: transcribe the whole message, process all of it, and retry when the result looks partial."
---

On Saturday, September 6, 2026, at 13:15, I typed two words into a Telegram bot: "do you work?"

By 22:40 the same bot had connected itself to twelve of my business tools, taught itself to understand my Hebrew voice notes, built a monitoring system for its own failures, pushed that system to a private GitHub repo and deployed it to Vercel.

The server it lives on costs $4.95 a month.

The bot is called John Connor. This is the guide I wish I had at 13:15.

It is written for a founder or operator who is not a DevOps person. Every command is the command I actually ran. Every trap is a trap I actually fell into.

## The bottom line

An AI agent you own is five layers: a machine that stays on, a gateway that runs the agent loop, a model, a channel you already use, and tools. Memory and skills come after the first message works. The whole thing took one long day, and about six of those hours were authentication.

The layers, in the order you build them:

1. **A machine that never sleeps.** A $4.95 VPS.
2. **A gateway.** OpenClaw, open source, one install command.
3. **A model.** Your existing ChatGPT or Claude subscription, connected through OAuth. No new API bill.
4. **A channel.** Telegram, because you already have it open.
5. **Tools.** Composio, one login that unlocks Gmail, Calendar, GitHub, Airtable and the rest.
6. **Memory.** Plain markdown files the agent reads at the start of every session.
7. **Skills.** Vetted packages from ClawHub.
8. **Observability.** A place to see every session, every failure, every rule.

## Step 0: give it a machine that never sleeps

The first wall every builder hits: the agent works beautifully, then you close the laptop and it dies.

So it does not live on the laptop. It lives on a Contabo VPS, the cheapest tier, Ubuntu 24.04, $4.95 a month. I covered the local versus VPS versus managed decision in [How to run AI agents in the cloud 24/7](/blog/run-ai-agents-in-the-cloud-24-7). The short version: a VPS is cheap on paper and costs you in hours, and this guide is exactly those hours, documented so you spend fewer of them.

You reach the server with one command:

```bash
ssh root@YOUR_SERVER_IP
```

Everything below happens inside that session. Write that sentence on a sticky note. It matters later.

## Step 1: install the gateway

OpenClaw is the piece that turns a chat app into a control panel for an AI agent. It is open source under the MIT license, written by Peter Steinberger, launched in November 2025, renamed four times in two months, and handed to the OpenClaw Foundation after Steinberger joined OpenAI in February 2026. Version 2.0 shipped on August 30, 2026. My server runs 2026.9.2.

Install:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard
openclaw gateway install
```

The onboarding wizard asks for a model provider and a channel. The gateway then runs as a background service and serves a web dashboard on port 18789, bound to localhost only. That last detail is a feature, not a bug. You will open it through an SSH tunnel, never through the public internet.

One trap from my upgrade: after `openclaw doctor --fix` moved environment variables into a new config section, a stale base URL survived in the service file and silently hijacked the model provider. If your provider stops answering after an upgrade, check both the config and the service unit for leftover environment lines.

## Step 2: connect a model without a new bill

You do not need an API key to start. OpenClaw can log into your existing ChatGPT subscription through OAuth:

```bash
openclaw models auth login --provider openai --device-code
```

It prints a URL and a code. You open the URL on your phone, enter the code, done. The Claude subscription works the same way through the Anthropic provider.

Two traps:

- The device-code flow needs a real terminal. Over a plain SSH pipe it hangs. Use `ssh -tt` or run it interactively.
- The code expires in 15 minutes. Have your phone ready before you run the command.

Mid-day I switched the Telegram session from GPT-5.6 Sol to GPT-6 Astra with `/model` inside the chat. The system default stayed put, only that session changed. That is the right granularity: experiment per conversation, keep the default stable.

## Step 3: give it a phone number, which means Telegram

Open Telegram, message @BotFather, run `/newbot`, save the token. Then:

```bash
openclaw channels add --channel telegram --token YOUR_BOT_TOKEN
openclaw gateway restart
```

Send your bot any message, then approve the pairing from the server:

```bash
openclaw pairing list telegram
openclaw pairing approve telegram CODE
```

After the first pairing I locked the DM policy to an allowlist containing exactly one Telegram user ID: mine. Pairing codes expire after one hour, which is fine. A bot that talks to anyone who finds it is not an assistant, it is a liability.

At this point you have an agent that answers in Telegram. Everything after this is making it useful.

## Step 4: give it a name and a memory

OpenClaw keeps memory as markdown files in the agent workspace. Three matter:

- `USER.md` holds who you are and how you like to be spoken to.
- `MEMORY.md` holds durable facts and decisions. It loads at the start of every session.
- `memory/YYYY-MM-DD.md` holds daily running notes.

If the long-term file grows past its budget, the file on disk stays intact but the copy injected into context gets truncated. Keep the durable file short and push detail into the daily notes.

Here is what this looks like in practice. At 13:55 I wrote "please be funnier." From then on every status report ended with a one-liner. "Classic: 1,000 app integrations, defeated by one invisible textbox." The tone lived in memory, not in a prompt I had to repeat.

At 16:18 I sent a voice note asking it to transcribe everything from start to finish and to save that as a law. It wrote the rule into `MEMORY.md` under a heading it called a permanent rule for voice messages, and every voice note since has been handled that way.

That is the whole trick with memory. You do not configure the agent. You tell it things, and it files them.

## Step 5: give it hands, which means Composio

An agent without tools is a chatbot. Composio is the shortcut: one account, one login, and the agent can reach a thousand apps through managed OAuth.

On the server:

```bash
openclaw plugins install clawhub:@composio/composio
openclaw plugins enable composio
openclaw config set plugins.entries.composio.hooks.allowConversationAccess true --strict-json
curl -fsSL https://composio.dev/install | sh
composio login --no-skill-install
composio whoami
```

The plugin itself is thin. It shells out to the local Composio CLI, so the CLI login is the real connection. Once `composio whoami` shows your account, the agent can see every app you connected in the Composio dashboard.

This step took me from 13:16 to 22:22. Nine hours. Here is every reason, so it takes you nine minutes.

**Trap 1: I logged in on the wrong machine.** The first `composio login` ran on my laptop. The agent lives on the server. The agent's CLI still had no identity. The sticky note from Step 0 exists because of this hour.

**Trap 2: the login link wrapped.** The CLI prints the one-time login URL inside a decorated box. My terminal was narrow, so the last character of the key fell onto the next line. The copied link was one character short, and the dashboard said the link was invalid. Fix:

```bash
COLUMNS=200 composio login --no-browser --no-wait --no-skill-install
```

Then copy the complete link into your browser and finish with `composio login --poll --no-skill-install`.

**Trap 3: the links expire fast, and each one is a credential.** Twice I pasted a half-link into Telegram and asked the bot to "clean this URL." It refused to rebuild it and told me the link was now exposed and to generate a fresh one. It was right. A login link is a password with a timer.

**Trap 4: the wrong kind of key.** Composio has user API keys, connection keys and publishable keys. Only the user API key authenticates the CLI. When I finally pasted a key, I pasted it into the Telegram chat. The agent deleted the message, told me it had not used the key, and told me to revoke it and create a new one. Then it asked me to enter the new one in a protected credential field inside the OpenClaw dashboard, where it never appears in a log.

**Trap 5: the dashboard needs a token.** To reach that protected field you open the Control UI through an SSH tunnel:

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_SERVER_IP
```

Then in the browser open `http://127.0.0.1:18789`, and paste the gateway token from `openclaw gateway auth-token --show` into the connection settings. Without it the dashboard shows Offline and Unauthorized, which is what it should show to a stranger.

By 22:26 the agent listed its connections: Gmail with four accounts, Google Docs, Drive, Sheets, Slides, Calendar, GitHub, Airtable, Stripe, Vercel, ActiveCampaign and Zoom. Twelve services, sixteen account connections. Its own summary of the rule: "The robot has keys, not diplomatic immunity." Reading is allowed. Sending, deleting, publishing or charging still needs an explicit request.

## Step 6: give it ears, for free

At 14:48 I asked for voice messages, and I asked for every free transcription service connected. The agent connected one. Local Whisper, running on the server, Hebrew as the default language, no API key, no bill. Its reasoning: multiple engines add confusion, not superpowers.

The first transcription came back partly garbled in the middle of a mixed Hebrew and English message. Instead of tuning parameters, I sent one voice note: transcribe everything from the first second to the last, process all of it before you answer, and save that as a rule. The next pass took about two and a half minutes and extracted the full meaning. The rule now lives in memory.

This is the pattern for the whole day. When output is partial, you do not fix the tool. You write the rule.

## Step 7: give it skills, but check their passports

ClawHub is the public registry of OpenClaw skills and plugins. Skills are packaged procedures the agent can pull in on demand. In one pass the agent installed seven: mermaid-diagrams, beautiful-pdf, design, frontend, code-review, systematic-debugging and gitx, plus the engines behind them, Mermaid CLI, Pandoc, WeasyPrint and Poppler. It then tested each one by producing a real SVG, a real PDF and an A4 render before reporting success.

It also refused something. It skipped candidates flagged with a medium risk warning and declined to install "all the skills from the internet." Community skills are not digitally signed. Cisco researchers found a third-party skill that exfiltrated data and injected prompts without the user knowing. Vetting is not paranoia, it is the price of a marketplace.

The rule we saved: install a skill only after it passes the registry security scan, prove it works with one real output, and record the decision in memory.

## Step 8: watch it work, which means observability

At 18:13 an error appeared in Telegram: "Something went wrong while processing your request." I asked what happened. The diagnosis: a security change had waited five minutes for a hot reload, the reload landed exactly as a reply was being finalized, and the finalization failed after the real answer had already been sent. A race, once, recovered.

Then I asked the question that mattered: does that incident show up in the dashboard you built earlier today? Answer: no. The dashboard was a summary the agent updated by hand, not a pipeline reading the logs.

So I said: make the system do it. Fifty-seven minutes later there was a service that collects gateway logs incrementally, classifies incidents by severity and cause, tracks open, recovered and historical states, keeps 24-hour counters and a Telegram success rate, redacts keys and tokens before storing anything, and stores it all in a local SQLite database. Six automated tests passed. The earlier race now appears as a line: Critical, Recovered.

At 22:27 I asked for it on GitHub and Vercel. Private repo, live deployment, security headers on, seven tests passing. One boundary the agent drew on its own: the Vercel site shows sanitized demo data. The real logs stay on the server, reachable only through the tunnel. Its words: publishing live logs to the internet would be less observability and more "free autobiography for hackers."

On the same run it found a Critical security finding in its own setup: external plugins could load without an explicit allowlist. It wrote the allowlist containing only the approved plugins and re-ran the check. One Critical became zero.

## Step 9: the parts that are still open

Honesty section. The next morning I connected Supabase and Cloudflare so the dashboard could become a real cloud system with login. Both stalled.

Supabase returned 403 for the project. The cause was an account mismatch: the Composio connection was authorized on a different Supabase account than the one that owned the project. Reconnecting Composio to Supabase from the account that sees the project fixed it in one step. The publishable key I pasted could not authenticate the CLI at all, because it is a browser key, and the database password I pasted into Telegram got the same treatment as before: message deleted, please rotate.

Cloudflare kept rejecting the credential with "Invalid format for X-Auth-Key." That error means an API Token was entered into a field expecting the legacy Email plus API Key pair. They are different authentication methods and Cloudflare does not accept one for the other. At the time of writing this is still open.

Neither blocks the dashboard from becoming real. What blocks it is finishing the API layer on Vercel and choosing the one email address allowed to log in. That is the next session.

## What it actually cost

- Server: $4.95 a month.
- Model: an existing ChatGPT subscription, connected through OAuth. No new spend.
- Voice: local Whisper, free.
- Tools: Composio free tier for one user.
- Time: about ten hours across one Saturday, six of them on authentication that should have taken ten minutes.

Compare that to the plan most companies reach for first. I did the Claude Max versus Enterprise math separately this week, and the lesson is the same: a flat subscription you already pay for, connected through OAuth, beats a metered enterprise setup for one operator building alone.

## Ten rules the day taught me

1. The agent lives on the server. Authenticate on the server. Every time.
2. A login link is a password with a timer. Never paste it into a chat.
3. If the terminal wraps a link, widen the terminal or use no-browser mode. Do not guess the missing character.
4. Keys have types. A publishable key opens nothing on a CLI. A user API key does.
5. Lock the DM policy to your own user ID before you connect a single tool.
6. Open the dashboard through an SSH tunnel. Offline and Unauthorized are what strangers should see.
7. Memory is a file. Tell the agent a rule once and check that it wrote it down.
8. When output is partial, write the rule, do not tune the tool.
9. Install skills like you hire contractors: check the scan, demand one real output, write down why.
10. Every incident should be a row in a table you did not type yourself.

## Why this matters for a business

None of this is about Telegram bots. It is about the fact that a non-engineer, in one day, on a five-dollar server, now has a worker that reads his inbox, files decisions to memory, monitors its own failures and refuses to handle secrets carelessly.

The interesting question for a company is not whether to do this. It is which process gets the first agent, and who on the team writes the first rule into `MEMORY.md`.

If you want the same setup pointed at your own operation, we do this as a paid scoping day first, then a build. The scoping day ends with the first rule written and the first tool connected. [Book a meeting](/).
