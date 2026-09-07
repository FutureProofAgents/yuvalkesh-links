---
title: "How to Build Your Own AI Agent From Scratch: One Saturday, a $4.95 Server and a Telegram Bot Named John Connor"
description: "A simple guide to setting up your own AI agent in one day: a $4.95 server, OpenClaw, Telegram, Composio and free voice transcription. Every command, every trap."
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

By 22:40 the same bot had connected itself to twelve of my business tools. It had learned to understand my Hebrew voice notes. It had built a system that monitors its own failures. And it had pushed that system to GitHub and Vercel.

The server it lives on costs $4.95 a month.

The bot is called John Connor. This is the guide I wish I had at 13:15.

It is written for someone who does not code. Every command here is a command I ran. Every trap here is a trap I fell into.

## The bottom line

An AI agent of your own is five parts:

1. **A machine that never sleeps.** A small cloud server, $4.95 a month.
2. **An engine.** Software called OpenClaw that runs the agent. Open source, free.
3. **A model.** The ChatGPT or Claude subscription you already pay for. No new bill.
4. **A channel.** Telegram, because it is already open on your phone.
5. **Tools.** A service called Composio that connects the agent to Gmail, Calendar, GitHub and the rest.

Once those five work, you add memory, skills and monitoring.

All of it took one day. Six hours of that day went on logins. This guide exists so yours takes less.

## Step 0: a machine that never sleeps

The first wall every builder hits: the agent works beautifully, then you close the laptop and it dies.

So the agent does not live on the laptop. It lives on a small cloud server. I used Contabo, the cheapest tier, $4.95 a month. Why a server and not a managed service is covered in [How to run AI agents in the cloud 24/7](/blog/run-ai-agents-in-the-cloud-24-7).

You connect to the server with one command from the terminal on your computer:

```bash
ssh root@YOUR_SERVER_IP
```

Everything from here happens inside that window, on the server. Write that on a sticky note. It will save you an hour later.

## Step 1: install OpenClaw

OpenClaw is the engine. It takes a message from Telegram, sends it to the model, runs the tools, and sends the answer back. Open source, written by Peter Steinberger, launched in November 2025. Version 2.0 shipped on August 30, 2026.

Three commands:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw onboard
openclaw gateway install
```

The first installs. The second opens a wizard that asks which model and which channel. The third makes OpenClaw a background service, so it keeps running after you close the terminal.

At the end you have a dashboard on port 18789. It is closed to the internet on purpose. You open it only from your own computer through an SSH tunnel. I show how below.

## Step 2: connect a model without a new bill

You do not need an API key. OpenClaw can log into the ChatGPT subscription you already have:

```bash
openclaw models auth login --provider openai --device-code
```

It prints a link and a code. Open the link on your phone, type the code, done. A Claude subscription connects the same way.

Two things to know:

- The code expires in 15 minutes. Have your phone ready before you run it.
- If the command hangs without printing anything, connect to the server with `ssh -tt` instead of `ssh`.

Midway through the day I switched the model for the Telegram conversation only, using `/model` inside the chat. The system default stayed the same. That is how you experiment without breaking anything.

## Step 3: connect Telegram

Open Telegram, message @BotFather, send `/newbot`, and save the token it gives you. Then, on the server:

```bash
openclaw channels add --channel telegram --token YOUR_BOT_TOKEN
openclaw gateway restart
```

Send your bot any message. It will not answer yet. Approve it from the server:

```bash
openclaw pairing list telegram
openclaw pairing approve telegram CODE
```

After the first approval I locked the bot so it answers only my Telegram ID. A bot that answers anyone who finds it is not an assistant. It is a problem.

From here you have an agent that answers in Telegram. Everything else is making it useful.

## Step 4: memory

The agent's memory is plain text files on the server. Two matter:

- `USER.md`: who you are and how you like to be spoken to.
- `MEMORY.md`: standing rules and decisions. The agent reads it at the start of every conversation.

You do not edit them by hand. You tell the agent, and it writes.

At 13:55 I wrote "please be funnier." Since then every report ends with a one-liner. "Classic: 1,000 app integrations, defeated by one invisible textbox."

At 16:18 I sent a voice note: transcribe everything from start to finish, and save that as a rule. It wrote the rule into `MEMORY.md`. Every voice note since has been handled that way.

That is the whole story with memory. You say it once. The agent files it.

## Step 5: connect tools with Composio

An agent without tools is a chatbot. Composio is a service that connects the agent to a thousand apps with one login. You approve which apps are allowed in the Composio dashboard, and the agent uses them.

On the server:

```bash
openclaw plugins install clawhub:@composio/composio
openclaw plugins enable composio
openclaw config set plugins.entries.composio.hooks.allowConversationAccess true --strict-json
curl -fsSL https://composio.dev/install | sh
composio login --no-skill-install
composio whoami
```

When the last command shows your account, the agent is connected.

For me this step took nine hours. Here is why, so yours takes nine minutes.

**I logged in on the wrong machine.** I ran `composio login` on my laptop. The agent lives on the server. The sticky note from Step 0 exists because of this hour.

**The login link broke.** The command prints a one-time link inside a decorated box. My terminal was narrow and the last character fell onto the next line. The link did not work. The fix:

```bash
COLUMNS=200 composio login --no-browser --no-wait --no-skill-install
```

Copy the whole link into your browser, approve, and come back to the terminal with `composio login --poll --no-skill-install`.

**I pasted a key into the chat.** The agent deleted the message, said it had not used the key, and told me to revoke it and create a new one. A key sent in a chat counts as exposed. The new key goes into a protected field inside the OpenClaw dashboard.

**The dashboard needs a token.** To open it, on your own computer:

```bash
ssh -N -L 18789:127.0.0.1:18789 root@YOUR_SERVER_IP
```

Leave that window open and in your browser go to `http://127.0.0.1:18789`. Get the token on the server with `openclaw gateway auth-token --show` and paste it into the connection settings. Without it the dashboard shows Offline, which is exactly what a stranger should see.

At 22:26 the agent listed its connections: Gmail, Google Docs, Drive, Sheets, Slides, Calendar, GitHub, Airtable, Stripe, Vercel, ActiveCampaign and Zoom. Twelve services. The rule it phrased on its own: "The robot has keys, not diplomatic immunity." Reading is allowed. Sending, deleting or charging only when asked explicitly.

## Step 6: voice messages, for free

At 14:48 I asked it to understand voice messages. It installed Whisper, a transcription model that runs on the server itself. Hebrew by default. No key, no bill.

The first transcription came out garbled in the middle. I did not tune settings. I sent one voice note: transcribe the whole message, process all of it before you answer, and save that as a rule. The next attempt took two and a half minutes and understood everything.

This is the pattern for the whole day. When the output is partial, you do not fix the tool. You write a rule.

## Step 7: skills

A skill is a packaged procedure the agent knows how to run, for example producing a designed PDF or a diagram. There is a public registry called ClawHub. The agent installed seven skills from it and tested each one for real before reporting that it worked.

It also refused to install "all the skills on the internet," and skipped ones with a risk warning. Community skills are not signed. Cisco researchers found a skill that stole data without the user knowing.

The rule we saved: install a skill only if it passed a security scan, and only after it proved itself with one real output.

## Step 8: monitoring

At 18:13 an error popped up in Telegram. I asked what happened. The agent read the logs and explained: a settings change landed exactly as a reply was being finalized. A one-time glitch, recovered on its own.

I asked: does that glitch show up in the dashboard you built? Answer: no.

I said: make the system do it. Fifty-seven minutes later there was a service that reads the logs, classifies failures by severity, keeps 24-hour counters, and hides keys and passwords before storing anything. The earlier glitch appears in it as a row: Critical, Recovered.

At 22:27 I asked for it on GitHub and Vercel. Private repo, live site, seven tests passing. One boundary the agent set on its own: the public site shows demo data only. The real logs stay on the server.

On the same run it found a security issue in its own settings: plugins could load without explicit approval. It fixed it, re-checked, and reported.

## Step 9: what is still open

The next morning I tried to connect Supabase and Cloudflare so the dashboard could work from the cloud with a login.

Supabase returned a permissions error. The reason: the Composio connection was on a different Supabase account than the one that owns the project. Reconnecting from the right account solved it.

Cloudflare still rejects the credentials. Cloudflare has two different authentication methods, and it looks like one was entered into the field meant for the other. At the time of writing this is still open.

## What it cost

- Server: $4.95 a month.
- Model: an existing ChatGPT subscription. No new spend.
- Transcription: free.
- Tools: the free tier of Composio.
- Time: about ten hours on one Saturday. Six of them on logins that should have taken ten minutes.

## Ten rules

1. The agent lives on the server. Log in on the server.
2. A login link is a password with a timer. Not in the chat.
3. The terminal broke a link? Widen the window. Do not guess.
4. A key sent in a chat gets revoked and replaced.
5. Lock the bot to your own ID before you connect a single tool.
6. Open the dashboard only through an SSH tunnel.
7. Say a rule once, then check that the agent wrote it down.
8. Partial output? Write a rule. Do not tune the tool.
9. Install a skill like you hire a contractor. Check, demand one output, write down why.
10. Every failure should be a row in a table you did not type yourself.

## Why this matters for a business

This is not a story about a Telegram bot. It is a story about someone who does not code, who in one day and on a five-dollar server got a worker that reads the inbox, files decisions, monitors its own failures, and refuses to handle passwords carelessly.

The question for a company is not whether to do this. The question is which process gets the first agent, and who on the team writes the first rule.

If you want a setup like this for your own business, we start with a paid scoping day, then build. The scoping day ends with the first rule written and the first tool connected. [Book a meeting](/).
