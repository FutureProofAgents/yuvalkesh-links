---
title: "Jev Use Cases: What People Actually Built With TypeSafe AI's Decision Model in Its First Week (Field Guide, Numbers, and Our Own Gate Log)"
description: "Jev use cases from week one: agent gates, model routing, compaction, triage, evals, reranking. Real numbers, the criticism, and our own 201-decision gate log."
pubDate: 2026-09-22
lang: en
tags: ["Jev use cases", "Jev", "TypeSafe AI", "System One model", "what is Jev", "AI agent guardrails", "model routing", "LLM as judge", "Claude Code", "AI agents in business"]
translationOf: jev-use-cases-he
coverImage:
  src: /images/blog/jev-use-cases/cover.png
  alt: "Diagram of the Jev decision loop: program state plus a typed question go in, a choice, a score or a yes-no probability comes out, and the code either acts, asks a human or stops"
faq:
  - q: "What is Jev?"
    a: "Jev is a decision model from TypeSafe AI, released September 15, 2026. It does not write text. You send it your program state plus one or more typed questions, and it returns a choice from a fixed list, a score on a scale you define, or a yes-no probability, each with a probability distribution. TypeSafe calls this category a System One model, after Kahneman's fast intuitive thinking."
  - q: "What are the main Jev use cases?"
    a: "Gating risky agent actions before they run, routing requests to the cheapest capable model, choosing which skill or tool an agent loads, scoring tool-call relevance for context compaction, triaging emails and support tickets, screening resumes and documents against explicit criteria, reranking search results, and replacing LLM judges in evals. Games, home automation and trading bots are the demo layer on top."
  - q: "How much does Jev cost?"
    a: "$0.042 per million input tokens, and output tokens are free. The jev-mcp README estimates about $0.0004 per decision. LangChain paid $0.34 for a 500-decision eval run that cost $28.17 on Claude Sonnet 4.6. New accounts get a small free credit, and Vercel's AI Gateway ran it free until September 25, 2026."
  - q: "How fast is Jev?"
    a: "TypeSafe states 70 to 500 milliseconds end to end. Independent measurements land in that band on the server side: 0.32 seconds median in Emil Lindfors' document test, 0.44 seconds per call in LangChain's eval. Our own gate hook, calling from Israel, measured a median of 842 milliseconds round trip over 201 decisions."
  - q: "Can Jev hallucinate?"
    a: "It cannot return an option that is not in your list, and it cannot break the answer format. It can still pick the wrong option with a confident probability. The Hacker News launch thread called this 'completely wrong valid values', and TypeSafe's own limitation page says typed is not the same as correct. Treat the probability as a signal to gate on, not a guarantee."
  - q: "Is Jev a replacement for GPT or Claude?"
    a: "No. It cannot write, code, summarize or converse. The working pattern is: a generative model researches, plans and writes; Jev routes, scores, approves or escalates; plain code executes. Most of the projects in this guide wrap Jev around an LLM agent rather than replacing one."
---

On September 19, 2026, at 20:33, I put a Jev gate in front of every shell command Claude Code runs on my Mac.

By September 22 at 12:49 the log had 242 lines.

201 commands went to Jev for a decision. 195 came back "allow". Six came back "ask me first". One of those six was a command that would have deleted a whole project folder. Another would have printed my API key to the terminal.

The bill for all 201 decisions, at the price the community README quotes, was about eight cents.

That is the whole Jev story in one log file, and it is why this guide exists.

We build and embed agent systems inside insurance companies, VC funds, telecom marketing teams and colleges. Every one of those systems has a place where an agent has to make a small decision before it does something expensive or irreversible. Until last week that decision cost a full LLM call, a few seconds, and a JSON parser that broke once a month.

This guide covers what Jev is, what it costs, what people actually built with it in the first seven days (with the numbers they published), where it fails, and the exact hook we run.

The same guide exists in Hebrew: [מקרי שימוש ב־Jev](/he/blog/jev-use-cases-he/).

## Key Takeaways

- Jev is a decision model, not a language model. It returns a choice, a score, or a yes-no probability. It never returns prose.
- Price: $0.042 per million input tokens, output free. Latency: 70 to 500 ms stated, 0.3 to 0.5 seconds measured by third parties, about 0.85 seconds round trip from Israel in our log.
- The use cases that survived contact with production in week one: tool-call gates, model routing, skill selection, context compaction, triage, document screening, reranking, and LLM-as-judge replacement.
- Vercel saw Jev reach about 13 percent of AI Gateway teams on day one. LangChain matched a human reviewer on 500 of 500 eval decisions for $0.34.
- The honest limitation: typed is not correct. Jev can be confidently wrong inside your list. Gate on the probability, split big questions into small ones, and keep a human on the high-stakes path.
- Our gate: 201 decisions, six stops, zero false blocks that cost us work, and it fails open when the network is down.

## What Is Jev?

Jev is the first model from TypeSafe AI, a San Francisco lab that came out of stealth on September 15, 2026 with a $40 million seed round led by DCVC.

The CEO is Diogo Almeida, who co-invented RLHF and InstructGPT at OpenAI, the training method behind ChatGPT. His co-founders are Sasha Sheng (COO, ex-Meta FAIR) and Erik Gafni (CTO).

The launch tweet had 75,127 likes and 38.9 million views by the time I checked it.

TypeSafe calls Jev a System One model. The name is Daniel Kahneman's: System 1 is the fast intuitive judgment, System 2 is the slow deliberate reasoning. Chat models are built to do System 2 in public. Jev is built to do System 1 for software.

The model itself is named after William Stanley Jevons, the economist who noticed that making coal engines more efficient increased coal consumption. TypeSafe's bet is the same: make judgment cheap enough and software will use far more of it.

Here is the whole interface.

You send three things: the state (any text or JSON, up to 32K tokens), one or more questions, and for each question a type.

**Choice.** Pick one option from a fixed list of up to 255. You get the chosen option, a probability for every option, and a confidence number.

**Score.** Place the input on an ordered scale of 2 to 10 levels that you define. You get the level, the probability per level, and a confidence number.

**Noul.** The probability that a statement is true, from 0 to 1. No confidence field, the probability is the answer.

You can pack many questions of all three types into one call. They are evaluated in parallel and independently. That is the pattern TypeSafe calls speculative fan-out: ask everything you might need, let your code decide what to use.

The training method is called RLCD, Reinforcement Learning for Calibrated Decisions. The stated goal is that when Jev says 80 percent, it should be right about 80 percent of the time.

Current version is jev-1.13.0. The `jev-latest` alias moves on each release, so pin the version in production if you have tuned thresholds.

Text only. No images, no audio, no streaming. 64K tokens per request.

Matt Canham, who works on AI product at Atlassian, wrote the cleanest one-line rule for choosing the type, in his "Jev explained for normies" [post on X](https://x.com/matthewcanham/status/2102077098756280413):

> Use Yes/No anywhere knowing whether something is true or false allows you to change the action taken. Use Choice anywhere selecting from a set of options allows you to decide what happens next. Use Score anywhere judging how much, how well, or how closely something meets a criterion allows you to prioritize.

## What It Costs and How Fast It Is

The list price is $0.042 per million input tokens. Output tokens are free, which TypeSafe describes as too cheap to meter.

TypeSafe's own workflow evals claim up to 193.6x faster and 444.6x cheaper than frontier LLMs. Those are vendor numbers, measured against a wrapper that made the competing LLMs do the same job in prose. Treat them as the high end.

Here is what people outside TypeSafe measured.

| Who | Task | Jev | The alternative | Source |
|---|---|---|---|---|
| LangChain (Sep 20) | Agent eval judge, 500 repeated decisions | $0.34 total, 0.44 s per call, 500 of 500 matched the human reviewer | Claude Sonnet 4.6: $28.17, 80.0 percent match | [LangChain blog](https://www.langchain.com/blog/jev-agent-evals-langsmith) |
| Emil Lindfors (Sep 18) | 24 Norwegian government hearing documents, stance and respondent type | $0.22 per 1,000 documents, 0.32 s median, 20 of 24 stances correct | DeepSeek V4.1 Flash: $1.31 and 2.7 s; with reasoning $3.08 and 26 s, for two more correct labels | [lindfors.no](https://lindfors.no/blog/a-first-look-at-typesafes-jev/) |
| elvex (Sep 18) | 2,000 expense reports classified | 21 seconds, about five cents | Their existing LLM pipeline: 75 percent higher cost on context extraction | [elvex blog](https://www.elvex.com/blog/early-experimentation-using-jev-to-rethink-harness-ux) |
| Sam Reghenzi (Sep 21) | Product category taxonomy, 50 products | 1.38 s mean per product, 3.18 model calls | Agentic loop on gpt-5.2: 9.62 s, 7.22 calls. Author calls the 7x headline "probably generous" | [blog.r6i.it](https://blog.r6i.it/typesafe-jev-vs-agentic-loop.html) |
| Idan Levin (Sep 18) | WebMCP browser benchmark, 49 tasks | Jev picks the tool, Mercury 2.5 writes the arguments: 49 of 49 solved, about 112x lower model cost | GPT-6 Astra doing it alone | [post on X](https://x.com/0xidanlevin/status/2100937437325205568) |
| Vercel (Sep 16) | fx auto-mode safety classifier | Up to 18x faster at p95 and more accurate | GPT-5.6 Luna, their previous default | [Guillermo Rauch on X](https://x.com/rauchg/status/2100307962262872105) |
| Our gate hook (Sep 19 to 22) | 201 shell commands, three questions each | Median 842 ms round trip from Israel, p90 1,167 ms | Nothing. We never reviewed these commands before | `~/.claude/jev-gate.log` |

The latency row for our hook is worth a sentence. TypeSafe says 70 to 500 ms. We measured 842 ms median. The difference is the ocean between Tel Aviv and the US region the API runs in, plus three questions per call instead of one. Nobody notices 0.8 seconds in front of a shell command. You would notice it in a voice loop.

Distribution moved fast. Vercel AI Gateway added Jev on September 16 with zero data retention and a free window until September 25. Cloudflare AI Gateway followed on September 17. OpenRouter on September 18. The waitlist was dropped on September 20.

Vercel published one adoption number: Jev reached about 13 percent of AI Gateway teams in its first day, twice the GPT-5.6 family's first-day share.

## The Use Case Map: What People Built in Seven Days

The community directory [awesome-jev](https://github.com/yibie/awesome-jev) lists projects by category, and a Reddit reviewer went through 287 open-source Jev projects in the first week. Matt Van Horn's [nine things people are building](https://x.com/mvanhorn/status/2100788572316139655) thread has 105,000 views. Moritz Kremb's project roundup has 498,000 views and 7,505 bookmarks.

I read all of them. Here is what actually recurs, with the numbers people published.

### 1. Tool-call gates: allow, confirm, block

The single most common build. Before an agent runs a command, deletes a file, sends an email or hits production, Jev scores the risk and the code decides whether to proceed, ask a human, or stop.

- Vercel's fx agent runs a safety reviewer on every command in auto mode. They benchmarked Jev against it and got the 18x-faster number above. Guillermo Rauch said it is likely to become the default.
- LangChain shipped it as `AutoModeMiddleware` in their [harness post](https://www.langchain.com/blog/building-a-harness-with-jev), next to a model-routing middleware.
- The [jev-mcp](https://github.com/codaaiteam/jev-mcp) server exposes it as `jev_gate` with `allow`, `confirm`, `block`.
- pi-warden, a gate for the Pi agent, reported 42 holds over 17,000 calls at about 250 ms each, roughly 88 percent judged correct.
- jev-axi, a PreToolUse gate for Claude Code, scored 44 of 44 on a labeled set of shell commands.
- DiffJury pastes a public PR link and says merge or review.
- jev-git screens diffs for secrets before commit in under a second.

Ours is in the last section. It is 150 lines of Python.

### 2. Model routing: send the request to the cheapest model that can do it

Jev reads the request and picks a model tier, and sometimes the reasoning effort too.

- Daniel Avila's Jev Model Router for Claude Code classifies the subagent model, the main model at session start, and the effort level on every request. Install is one command: `npx claude-code-templates@latest --mod productivity/jev-model-router`.
- Duncan's [model router demo](https://x.com/ephraimduncan/status/2100454070536351824) has 114,000 views.
- Jevonian, jcm-router, pi-jev-router, Jev Auto Router for Codex: at least six routers appeared in the first week, one per agent runtime.

The economics: a routing decision costs a fraction of a cent. A wrong route to a frontier model costs dollars. Even a mediocre router pays for itself.

### 3. Skill and tool selection: keep the catalog out of the context window

An agent with 40 skills loads 40 skill descriptions into every prompt. Jev picks the one that matches and the harness injects only that.

- Avila's Jev Skill Suggestion for Claude Code does exactly this.
- jev-skill-router, pi-jev-skill-picker, jev-agent-skill-router and omo-jevlike-router do it for other runtimes.
- Idan Levin's WebMCP result belongs here: once tools were explicit, Jev choosing the tool took the benchmark from 25 of 49 to 49 of 49.

### 4. Context compaction: score every tool call, drop the irrelevant ones

Instead of asking an LLM to summarize a long conversation, score each past tool call for relevance and prune.

- The fast-jev-compaction plugin took a session from 1 million tokens to 86,000 in about a second, for around four cents.
- The 32K state limit means long histories are chunked, which the author noted.
- Theo (t3.gg) [pushed back hard](https://x.com/theo/status/2100762304862384257), 634,000 views: the model deciding what to drop does not have the full context, reasoning traces get lost, and cache rewrites get expensive. Both sides are worth reading before you ship this one.

### 5. Triage: email, support, logs, incidents

The oldest classification job in software, now at a price where you can run it on everything.

- Jev-Mail runs 24/7 on Gmail scoring urgency, importance and category.
- Van Horn cites 1,500 emails processed for $5 and 777 judgments for a quarter of a cent.
- Ruben Hassid cleaned a Gmail contact list into human versus automated senders, and filtered 348 arXiv papers for $0.18.
- jev-logtriage batches collapsed logs into Noul, Score and Choice questions for on-call.
- TypeSafe's own use-case map lists support routing, refund eligibility, invoice pay-hold-dispute, insurance claims straight-through versus specialist, and AML alert prioritization.

### 6. Document and candidate screening against explicit criteria

Anything with a rubric.

- A resume screener that sends five Noul evidence gates, four Score dimensions and one Choice in a single request.
- DocJev, a LlamaIndex library that classifies documents against natural-language category rules, 40 of 40 correct in its pilot.
- elvex's 2,000 expense reports in 21 seconds.
- Lindfors' Norwegian hearing documents, which is also the best independent calibration data so far: in the 0.7 to 0.9 probability bin, Jev agreed with the reference label 97 percent of the time.

### 7. Reranking and relevance filtering for search and RAG

Ask one Noul per retrieved chunk: is this relevant to the query? Keep the ones above threshold.

- jev-reranker and a Rust CLI version ship this as a drop-in.
- hippo-memory reported recall at 1 rising from 0.41 to 0.62 with an optional Jev reranker.
- An unofficial LlamaIndex adapter reported nDCG at 5 moving from 0.340 to 0.396.
- Firecrawl reported legal retrieval top-1 going from 5 percent to 18 percent.
- One measured counterexample: a run over 33,047 catalog entries and 164 queries concluded that Jev reranking is not a free win. Test on your corpus.

### 8. Evals: Jev as the judge instead of an LLM

This is the use case with the strongest published evidence.

- LangChain's 500-of-500 result, with variance up to 913x lower than GPT-5.6 Terra. Jev-as-a-judge is now a LangSmith feature.
- Good Start Labs, via Langfuse, ran 6,003 rubric checks: 91.5 percent agreement with Claude Fable 5.1 at $160 per million graded answers versus $33,000.
- Isaac Flath's list of six boring things he is confident he will still use Jev for in 60 days ends with "figuring out why agents fail (eval over traces)".

### 9. Content quality and moderation

- Sniff Test asks ten Boolean questions per paragraph as a prose linter, 182 ms median.
- taste-lint and JevSlop score text for AI slop. We will be testing one of these against our own Hebrew de-slop checklist.
- A Mastra moderation demo blocked 9 of 9 hostile messages and 0 of 49 real ones.
- Discord, Twitch and Telegram moderation bots appeared within days.

### 10. Data work in SQL and spreadsheets

- A DuckDB extension classifies rows at 1,943 rows per second. A PostgreSQL `jev()` function and a SQLite extension do the same for natural-language filters on rows.
- jev-align evaluates CSV, Parquet and JSONL rows against typed questions.

### 11. Adaptive UI and browser control

- Stefan's [designer demo](https://x.com/heystefan_/status/2101369117496521042), narrowing an icon set by intent, has 1 million views.
- Browser Use's Jev Ultrafast lets Jev decide each browser action. Van Horn cites a flight search in 7 seconds for $0.0039.
- Chrome extensions for ad blocking, timeline labeling and spoiler hiding, each asking one Noul per element.
- A macOS command palette that reads the accessibility tree and asks one Noul per menu item.

### 12. Real-time loops: games, homes, robots, markets

The demo layer, but it proves the latency claim.

- TypeSafe's own Doom bot runs at about ten decisions a second for roughly $7 an hour.
- Mario, Pokémon Red, StarCraft, 2048 and a public chess board where the internet plays against Jev.
- A Home Assistant integration that answers house questions as probability, choice or score. A Hacker News commenter called it the demo that made the value obvious.
- Trading bots where Jev decides direction inside hard-coded risk limits. Treat these as toys.

One more, filed under warning rather than use case. A post with 324,000 views worked out that if Jev can solve 100 CAPTCHAs for $0.0068, a marketplace paying a cent per CAPTCHA has a 99 percent gross margin. Cheap judgment cuts both ways.

## What Makes Jev Good

Five things, each with a source.

**It returns a type, not a string.** No JSON prompting, no parser, no retry when the model adds a sentence before the bracket. OpenRouter's launch note: "There is no JSON prompting, parsing layer, and nothing to validate against."

**It is fast enough to put inside a loop.** 0.3 to 0.5 seconds measured. You can afford to ask before every tool call, every email, every row.

**It is cheap enough to ask about everything.** This is the Jevons part, and it is the point most reviews miss. Nobody would pay a human, or a two-cent LLM call, to review `git status`. At four hundredths of a cent, every command gets reviewed anyway. Checks that were never done get done.

**It gives you a probability you can gate on.** TypeSafe's docs recommend three tiers: above 0.9 act automatically, in the middle confirm or flag, below 0.5 route to a human. Different actions in the same system get different thresholds depending on the cost of being wrong.

**It is consistent.** The same input gives the same answer. LangChain measured variance 92 to 913 times lower than three LLM judges. For an eval or a gate, consistency matters more than brilliance.

## What Jev Is Not, and Where It Fails

The Hacker News launch thread reached 1,953 points and 511 comments. The best criticism there is also the most important line in this guide.

**Typed is not correct.** Jev cannot return an option outside your list. It can return the wrong option with a confident probability. The HN phrase was "completely wrong valid values". TypeSafe's own limitation page says the same thing in politer words.

**The vendor benchmarks are self-tested.** The reference answers in TypeSafe's workflow evals were the average of two other LLMs, not a ground-truth key. On public benchmarks the picture is narrower: on jevals.com, Jev scores 67.8 on Banking77 intent classification against 74.1 for Gemini 3.8 Flash, and 69.0 on PubMedQA yes-no against 73.0. The site's summary is that Jev is statistically tied with top LLMs on binary questions at one twenty-eighth of the price. Tied at a fraction of the cost is the honest claim. Better is not.

**One big question underperforms five small ones.** An independent calibration study found a phishing classifier at 62.6 percent accuracy when asked as one holistic question and 95.0 percent when split into five narrow ones. Atomic questions are not a tip, they are the method.

**It cannot abstain unless you let it.** Add an "unknown" or "none of the above" option. Otherwise it will pick.

**Known weak spots, from TypeSafe's own jaggedness page for 1.13:** literal reading, arithmetic, dates and time, multi-step indirection, large noisy state, and adversarial text inside the state. The state is an attack surface. If a fetched web page can talk to your gate, your gate can be talked out of blocking.

**Specialists still win on narrow tasks.** A 706,000-parameter form-field scorer from the trycua team hit 99.7 percent on forms where hosted Jev scored 83.6.

**It is English-first.** Other languages are supported but TypeSafe says to evaluate on your own workload. We are doing that for Hebrew now and will publish what we find.

**No paper, no weights, no named customers yet.** A $40 million seed at a reported $200 million valuation, and a week of demos. Plan for the API to change.

## How We Run Jev at FutureProof Agents

Here is the part nobody in the first-week roundups has, because most of them are demos and this one has been running for three days on a machine that does real client work.

Claude Code has a PreToolUse hook: a script that runs before every tool call and can tell the harness to proceed, ask the user, or block. We wrote a 150-line Python hook that sends every shell command to Jev with three questions in one call.

```python
"questions": {
    "risk": {
        "type": "score",
        "instructions": "How risky is it to run this command automatically without a human confirming first?",
        "criteria": [
            "safe: read-only or trivially reversible",
            "low: writes files inside a project, easily undone",
            "needs review: touches git history, deploys, system config, or many files",
            "high: could permanently destroy data, affect production, or expose secrets",
        ],
    },
    "irreversible": {
        "type": "noul",
        "instructions": "Would this command permanently delete or overwrite data, or affect a live production system, in a way that cannot be undone?",
    },
    "recommendation": {
        "type": "choice",
        "instructions": "What should the harness do with this command?",
        "criteria": {
            "allow": "safe to run automatically",
            "confirm": "pause and ask the human to confirm first",
            "block": "do not run; a safer approach is needed",
        },
    },
}
```

The rule: pause if the recommendation is block, or the risk score is 2.3 or higher on the 0 to 3 scale, or the recommendation is confirm and the irreversible probability is 0.7 or higher.

Three design choices matter more than the questions.

**Obvious read-only commands skip the network.** `ls`, `cat`, `git status` and friends never leave the machine. 40 of the 242 log lines are those skips.

**It fails open.** No key, no network, a timeout: the hook logs an error and lets the command through. A safety gate that blocks all work when the API is down gets deleted by Friday. One of the 242 lines is that error.

**Every decision is logged.** Timestamp, verdict, risk, irreversible probability, recommendation, confidence, latency, the command. That log is the eval set for tuning thresholds next month.

What three days looked like:

| | |
|---|---|
| Log lines | 242 |
| Sent to Jev | 201 |
| Allowed | 195 |
| Paused for confirmation | 6 |
| Skipped by the read-only fast path | 40 |
| Errors (failed open) | 1 |
| Median latency, round trip from Israel | 842 ms |
| p90 latency | 1,167 ms |
| Estimated cost at $0.0004 per decision | about $0.08 |

The six pauses, with Jev's own numbers:

- `rm -rf` of an entire project folder. Risk 2.84, irreversible 0.75, recommendation confirm. Correct. It was a stale clone and I confirmed.
- A `sed` that would have rewritten the API key line in my shell profile. Risk 2.77, recommendation block. Correct.
- A command that would have printed fragments of that key to the terminal. Risk 2.61, recommendation block. Correct, and I had not noticed.
- A Python script using a database service-role key. Risk 2.60, irreversible 0.63, block. Debatable. It was a read, but the key in the script was the right thing to flag.
- `kill` of four processes plus deleting a git lock file. Risk 2.41, confirm. Reasonable.
- A `sed` rewriting a build-artifact list. Risk 2.31, confirm. Overcautious, and cheap to click through.

Six stops, four clearly right, two overcautious, zero destructive commands that slipped through. The 195 silent approvals are the part I would not go back from: reading a file scored 0.02, a git log scored 0.03, and nobody paid for a reviewer.

Where it goes next in client systems, honestly stated as plans, not results:

- Lead scoring inside the CRM we run for our own pipeline: one Choice for tier, one Score for urgency, one Noul for "is there a real budget signal in this thread".
- The gatekeeper stage of our content pipelines: our Hebrew de-slop checklist as ten Noul questions per paragraph, in the style of Sniff Test.
- Stale-data flags in the finance dashboard: a Noul per figure, "does the source note make this number look older than 30 days".
- Support-inbox routing for a client, replacing a full LLM call per email with one Jev call and a threshold. The first felt win in most of our engagements is exactly this shape.

If you want the mapping day for your own process, [book a call](https://futureproofagents.com/) or, in Hebrew, [write to us on WhatsApp](https://futureproofagents.com/he/).

## Getting Started in Ten Minutes

**Get a key.** [console.typesafe.ai](https://console.typesafe.ai). No waitlist since September 20. New accounts start with a small free credit.

**Or use a gateway you already have.** Vercel AI Gateway (`typesafe-ai/jev`, zero data retention), Cloudflare AI Gateway (`typesafe/jev`), or OpenRouter (`typesafe/jev-latest`, beta).

**Raw API.** One endpoint.

```
POST https://api.typesafe.ai/v1/systemone
Authorization: Bearer YOUR_KEY

{
  "model": "jev-1.13.0",
  "state": "<your text or JSON, up to 32K tokens>",
  "questions": {
    "urgent": { "type": "noul", "instructions": "Does this message need a reply today?" },
    "team": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": { "sales": "pricing, quotes, demos", "support": "bugs, access, how-to", "billing": "invoices, refunds" }
    }
  }
}
```

**Inside Claude Code.** Either the official plugin, `claude plugin install typesafe@typesafe-ai`, or the open-source MCP server:

```
claude mcp add jev -e TYPESAFE_API_KEY=your_key -- npx -y github:codaaiteam/jev-mcp
```

That gives the agent `jev_classify`, `jev_score`, `jev_check`, `jev_gate` and `jev_decide` as tools.

**Your first question.** Make it boring and atomic. Not "is this email important" but "does this email ask for money", "does this email come from a person", "does this email mention a deadline". Three Nouls, one call, then combine in code.

**Then log everything.** The log is your eval set. Tune thresholds against it after a week, not before.

## Videos and Threads Worth Your Time

More than 270 YouTube videos about Jev went up in its first week. These are the ones worth your time, grouped by what you need.

**From the founder.**

- Latent Space, [Why We Made Jev](https://www.youtube.com/watch?v=cFx9Z3ZXca0), a two-hour interview with Diogo Almeida. He explains the three answer types as a switch statement, a sort, and an if statement, and says plainly that calibration is not perfect.
- AI Engineer, [Jev CEO: I made ChatGPT, now I'm building what's next](https://www.youtube.com/watch?v=cJ0EOzey--o), the pre-launch talk on why assistance and automation need different training.

**Clear explainers.**

- Sam Witteveen, [Jev: The Ultimate Classification Model?](https://www.youtube.com/watch?v=X117w2Rark8). The most careful hands-on: routing, refunds, sarcasm, prompt injection, and the reminder that it can still pick the wrong option.
- Theo, [Jev is incredible](https://www.youtube.com/watch?v=F3YXg7AaKWE). The rule of thumb we use: if a person could answer from the data in under ten seconds, Jev fits. He also argues against using it for compaction and as an eval judge.
- Syntax, [Jev Explained: Demos and Use Cases](https://www.youtube.com/watch?v=QbYBRjOaGOo), including a chatbot with no LLM at all.

**Real use-case tests.**

- Greg Isenberg with Ryan Vogel, [Jev is HERE. How to use it](https://www.youtube.com/watch?v=4mTLpuQpB80). 1,700 real emails classified for 18 cents.
- Nate Herk, [I Tested Jev on 12 Real Use Cases](https://www.youtube.com/watch?v=ymgH8jS6Wb8). 1,000 emails with seven questions each: 9 cents versus 62 cents on GPT-5.6 Luna.
- Ray Amjad, [Jev + Claude Code](https://www.youtube.com/watch?v=ScvXFi4MUSc). Skill routing across 182 skills cut the wrong-skill rate from 17 percent to 7.3.
- RoboNuggets, [Jev will 10x your Claude Code](https://www.youtube.com/watch?v=tTnUcSj-QPA). Model routing inside Claude Code saved 70 percent on a 12-prompt test.
- Mitchell Keller, [Benchmarking Jev for Go-To-Market Engineering](https://www.youtube.com/watch?v=h2x54LWxdcI). Reply sentiment, spam and lead qualification, with the finding that answers above 85 percent confidence were almost always right.
- LangChain, [Building a Harness with Jev](https://www.youtube.com/watch?v=VE5dsWll06M), the official walkthrough of routing, auto mode and Jev as judge.

**The skeptics.**

- 01Coder, [Jev: 662 tests](https://www.youtube.com/watch?v=Ptwhkqut2Q0), in Chinese, and the best independent benchmark we found. Spam 96.5 percent against 93.5 for Claude Haiku 4.5, Banking77 81.6 against 80.1, and answers above 0.9 confidence right 91 percent of the time.
- Prism Labs, [The 200x AI Hype vs What's Proven](https://www.youtube.com/watch?v=no9G3N8PSIk). Against a fair baseline the gains drop to roughly 25 times on speed and 76 times on cost.
- Steve from Builder.io, [Fake Jev demos are taking over the internet](https://www.youtube.com/watch?v=Spn-F83ZHH0). Jev cannot see or type, so the self-driving and UI-design demos are staged. His real production use is picking tools and skills before the LLM runs.
- Stacked Podcast, [Was Jev Stolen From Open Source Work?](https://www.youtube.com/watch?v=J_q-MW8zCAo), on the Laya controversy.

**Threads on X.** The launch post, the LangChain eval post, the Hacker News thread and Matt Canham's explainer are all in the Sources below.

## FAQs

### Is Jev free?

There is a small free credit on signup and Vercel's gateway ran it free until September 25, 2026. After that it is $0.042 per million input tokens with free output. A typical decision with a few hundred tokens of state costs a few hundredths of a cent.

### What is the difference between Jev and a normal LLM with structured output?

A normal LLM generates the JSON token by token, which is slow and can still produce a malformed or off-schema answer. Jev does not generate. It scores your options directly and returns the distribution, which is why it is 20 to 200 times faster and cannot break the format. The trade is that it cannot explain, reason in steps, or write.

### What is Noul?

The name TypeSafe uses for its yes-no primitive. You give it a statement, it returns the probability the statement is true, from 0 to 1. Near 1 is a strong yes, near 0 a strong no, 0.5 is uncertain. Nouls do not carry a separate confidence number; the probability is the answer.

### Does Jev work in Hebrew?

It accepts any text. TypeSafe says English is the primary training language and other languages need workload-specific evaluation. We are running it on Hebrew business emails and posts now and will publish the numbers.

### Can Jev replace my LLM-as-judge evals?

For binary and rubric-style checks, the LangChain and Langfuse results say yes, at a fraction of the cost and with far lower variance. For open-ended quality judgments, no model has cracked the Score benchmark on jevals.com yet.

### Is it safe to put Jev in front of production actions?

Only as one layer. Keep deterministic rules for the obvious cases, gate on probability for the rest, log every decision, and keep a human on anything irreversible. The state you send is an attack surface, so never let untrusted text be the only input to a gate.

## Conclusion

Every agent system has a hundred small decisions between the big ones. Route this. Check that. Is this safe. Is this relevant. Is this done.

Until last week each of those decisions cost a full LLM call, or was skipped.

Jev makes the decision cost nothing, return a type, and come with a number you can gate on.

It is not smarter than the models it sits next to. On public benchmarks it is roughly tied. What changed is the price of asking, and when asking is free, you ask about everything.

That is what our log shows. 201 questions in three days that nobody would have paid to ask, six answers that mattered, and a habit we are not giving back.

## Sources

TypeSafe AI, Introducing System One Models and Jev, https://typesafe.ai/blog/introducing-system-one-models-and-jev
TypeSafe AI docs: primitives, confidence, models, model jaggedness for jev-1.13, https://docs.typesafe.ai/
TypeSafe AI team page, https://typesafe.ai/team
Diogo Almeida, launch post on X, https://x.com/CompleteSkeptic/status/2099925682726002904
TypeSafe AI, no-waitlist announcement, https://x.com/typesafeai/status/2101786156572823624
Business Wire via Morningstar, TypeSafe AI Emerges From Stealth With $40M, https://www.morningstar.com/news/business-wire/20260915525333/typesafe-ai-emerges-from-stealth-with-40m-in-funding-with-new-model-for-composable-ai
Forkast, TypeSafe AI's Jev Is Not an LLM, and That May Be the Point, https://forkast.news/typesafe-ais-jev-is-not-an-llm-and-that-may-be-the-point/
Vercel changelog, TypeSafe AI Jev now available on AI Gateway, https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway
Vercel, first-day adoption post, https://x.com/vercel/status/2101077346203971900
Guillermo Rauch, fx safety reviewer results, https://x.com/rauchg/status/2100307962262872105
Cloudflare Developers, Jev on AI Gateway, https://x.com/CloudflareDev/status/2100688880798159254
OpenRouter, Jev beta announcement, https://x.com/OpenRouter/status/2100744709589316009
LangChain, Building a Harness with Jev, https://www.langchain.com/blog/building-a-harness-with-jev
LangChain, Can Jev Be a Better Agent Evaluator?, https://www.langchain.com/blog/jev-agent-evals-langsmith
Langfuse, Using TypeSafe's Jev for evals, https://langfuse.com/blog/2026-09-18-using-typesafes-jev-for-evals
Emil Lindfors, A first look at TypeSafe's Jev, https://lindfors.no/blog/a-first-look-at-typesafes-jev/
elvex, Early experimentation using Jev to rethink harness UX, https://www.elvex.com/blog/early-experimentation-using-jev-to-rethink-harness-ux
Sam Reghenzi, Replacing an agentic classification loop with Jev, https://blog.r6i.it/typesafe-jev-vs-agentic-loop.html
Idan Levin, Jev on the WebMCP benchmark, https://x.com/0xidanlevin/status/2100937437325205568
Matt Van Horn, WTF is Jev and the 9 things people are building with it, https://x.com/mvanhorn/status/2100788572316139655
Matt Canham, Jev explained for normies, https://x.com/matthewcanham/status/2102077098756280413
Moritz Kremb, all the coolest Jev projects on X, https://x.com/moritzkremb/status/2100895894287839255
Daniel Avila, Jev Model Router for Claude Code, https://x.com/dani_avila7/status/2101176629745561686
Daniel Avila, Jev Skill Suggestion for Claude Code, https://x.com/dani_avila7/status/2101885477158547753
Duncan, model router built with Jev, https://x.com/ephraimduncan/status/2100454070536351824
Stefan, when a designer gets access to Jev, https://x.com/heystefan_/status/2101369117496521042
Theo, pushback on Jev compaction, https://x.com/theo/status/2100762304862384257
Isaac Flath, six things I will still use Jev for, https://x.com/isaac_flath/status/2100623016644223175
keno, Jev CAPTCHA arbitrage, https://x.com/kenonews/status/2101656436136661163
Ruben Hassid, Jev guide, https://ruben.substack.com/p/jev
Hacker News, Introducing System One Models and Jev, https://news.ycombinator.com/item?id=49717558
jevals.com, System One model leaderboard, https://jevals.com/
BERI, calibration decomposition of Jev, https://www.beri.net/article/typesafe-jev-typed-decision-model-calibration-decomposition-shadow-eval
ts2.tech, TypeSafe's 445x cost claim is still self-tested, https://ts2.tech/en/typesafe-ai-raises-40-million-for-jev-but-its-445x-cost-claim-is-still-self-tested/
trycua, CUA-S1-FORMS specialist model, https://x.com/trycua/status/2101014004927729737
awesome-jev community directory, https://github.com/yibie/awesome-jev
jev-mcp, MCP server for Jev, https://github.com/codaaiteam/jev-mcp
Firecrawl, What is Jev, https://www.firecrawl.dev/blog/what-is-jev
Pydantic AI, TypeSafe model docs, https://pydantic.dev/docs/ai/models/typesafe/
Latent Space, Why We Made Jev, Diogo Almeida interview, https://www.youtube.com/watch?v=cFx9Z3ZXca0
Sam Witteveen, Jev: The Ultimate Classification Model?, https://www.youtube.com/watch?v=X117w2Rark8
Theo, Jev is incredible, https://www.youtube.com/watch?v=F3YXg7AaKWE
Greg Isenberg, Jev is HERE. How to use it, https://www.youtube.com/watch?v=4mTLpuQpB80
Nate Herk, I Tested Jev on 12 Real Use Cases, https://www.youtube.com/watch?v=ymgH8jS6Wb8
01Coder, Jev 662 tests (Chinese), https://www.youtube.com/watch?v=Ptwhkqut2Q0
Prism Labs, TypeSafe Jev Fact-Check, https://www.youtube.com/watch?v=no9G3N8PSIk
Builder.io, Fake Jev demos are taking over the internet, https://www.youtube.com/watch?v=Spn-F83ZHH0
