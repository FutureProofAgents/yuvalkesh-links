---
title: "How to Build Games With GPT-6 Astra: A Case Study From 14 Games, One Rocket and a $250 Souls-Like"
description: "14 games built with GPT-6 Astra in one week: build times, costs, the prompts that worked, why the pretty game was not the fun one, and what still needs a human."
pubDate: 2026-09-14
lang: en
tags: ["GPT-6 Astra", "build games with AI", "Astra game development", "Unreal Engine AI", "Blender AI", "Three.js", "AI game design", "Codex"]
translationOf: build-games-with-gpt-6-astra-he
coverImage:
  src: /images/blog/build-games-with-gpt-6-astra/cover.png
  alt: "Dark illustration of a rocket orbiting a small planet next to a pixel carrot that is slightly misaligned, representing the pretty game versus the fun game"
faq:
  - q: "Can GPT-6 Astra really build a playable game from one prompt?"
    a: "Yes, and four creators did it on camera in the week after launch. A one-prompt Subway Surfers clone in Unreal Engine took about 10 minutes of human time. A Clash of Clans clone took about 40 minutes of model time. The first result is a playable draft, not a finished game."
  - q: "What do I need installed to build games with Astra?"
    a: "Three things, all free except the model: OpenAI's Codex app or CLI with GPT-6 Astra selected, a game engine such as Unreal Engine 5 or Godot (or a Three.js project for the browser), and Blender for 3D assets. Astra operates the engine and Blender itself through the command line and Python."
  - q: "How much does it cost to build a game with Astra?"
    a: "It depends on the reasoning level and how long you let it run. A Godot prototype on Medium took about 25 minutes and a few percent of a weekly quota. A Souls-like in Unreal that ran for roughly four hours across three prompts on the highest setting cost one creator $250 in API credits."
  - q: "Which engines does Astra work with?"
    a: "Unreal Engine through the command line and AutomationTool, Unity through the CLI or an MCP server, Godot through the CLI or MCP with text scenes, Three.js by editing code and running it in the browser, and Blender headless through Python. It works best when it has a way to run the game and observe the result."
  - q: "Is the game Astra builds any good?"
    a: "It is fast and it looks good, and it is usually a lesser version of something that already exists. In a head to head test the prettier game was not the fun one. Fun came from the decisions someone made about knobs, physics and failure states. That part is still yours."
---

On September 6, 2026, Nvidia's CEO posted three words on X about OpenAI's new model: "AGI has arrived." The same post mentioned that the model was trained on more than 100,000 of his own chips and that 400,000 more were on the way.

That week, four YouTube creators did something more useful than arguing about the word AGI. They opened a game engine, gave GPT-6 Astra a prompt, and filmed what came out.

Between them they built 14 games: a rocket simulator, Super Mario, Subway Surfers, Counter-Strike, Minecraft, a GTA 6 clone called Neon Coast, Clash of Clans, Fortnite, Rocket League, Terraria, a Souls-like in Unreal Engine, a mechanical watch diagram, and a running gag of a game whose only bug was a carrot a few pixels off.

This is a case study of those builds, plus OpenAI's own published workflow and the numbers from the community. I read every transcript and every source. The goal is simple: if you want to build and design a game with Astra, this is what it actually takes, what it costs, and where it stops.

## The short version

1. **Astra does not just write game code. It operates the tools.** It opens Blender, builds models, exports them, imports them into Unreal or Unity or Godot, runs the game, looks at the result, and fixes what it sees.
2. **A playable draft takes 10 to 45 minutes.** A polished slice takes hours and several prompts. Nobody in this study shipped a finished game.
3. **References beat adjectives.** The builds that fed Astra screenshots and gameplay video came back closer to the target than the builds that only described it.
4. **The pretty game was not the fun game.** In a controlled test the model that finished first produced the better looking game and the worse one to play.
5. **The loop is the product.** Edit, run, observe, fix. Every number in this article comes from that loop, not from a single prompt.

## What changed with Astra

GPT-6 Astra was released on September 3, 2026, to approved users, and to everyone the next day. It has a context window of about a million tokens. The API costs $10 per million input tokens and $50 per million output tokens. Inside ChatGPT it arrived on the Plus, Pro, Business and Enterprise plans within days of launch.

The game development story is not about the benchmarks. It is about one capability: Astra works a computer. On OSWorld, the benchmark that measures real work across desktop applications, it completed 72.6 percent of tasks at roughly 40 minutes per task. In practice that means it can drive the tools a game needs.

Here is how it connects to each one, based on the official demos and the community guides:

| Tool | How Astra drives it |
|---|---|
| Unreal Engine | Command line and AutomationTool |
| Unity | CLI or an MCP server (Playco's Playbot setup) |
| Godot | CLI or MCP, with text scenes and scripts |
| Three.js | Edits the code, runs it in the browser, reads the result |
| Blender | Headless through Python, no GUI needed |

The game studio Playco ran a Unity evaluation and reported about 50 percent fewer manual fixes on prototypes compared with previous models. Three themed prototypes came out of one grey box foundation. Most worked on the first run; one cyberpunk version needed a performance fix.

Now the experiments.

## Experiment 1: the rocket that was pretty but not fun

Jeff of the Fireship channel asked his kids what game they wanted. They asked for a rocket launch simulator: build a rocket, launch it into orbit.

He gave the exact same prompt, at the exact same second, to GPT-6 Astra and to Claude Fable 5.1.

Astra finished in about 26 minutes. The 3D graphics were detailed and nearly mistake free. The UI was polished. The rocket orbited the globe in an animation that looked like a broadcast.

Fable took much longer. When it finished, the UI looked like it was built with a CSS framework from 2011. The graphics were plain.

Then he played both.

The Astra game let you launch a rocket. That was it. He also noticed the UI looked identical to dozens of other Astra games he had seen on X. There is a formula. You can spot an Astra game from across the room.

The Fable game had far more rocket customization, real scientific calculations, several ways to succeed and several ways to fail, and better explosions.

His 3-year-old picked the pretty game. His 8-year-old picked the fun one.

Two more data points from the same video. In July he asked the previous OpenAI model for an exploded view of a mechanical watch and got garbage. He reran the same prompt on Astra and got a diagram that would take a 3D artist hundreds of hours in Blender. And his running test game, which Astra built in 21 minutes, survived hours of line by line code review with one defect: a carrot a few pixels off.

## Experiment 2: five famous games, one prompt each

Brendan Jowett ran Astra on its highest setting through the Codex desktop app, with Unreal Engine 5 and Blender installed. His rule: the model builds everything, including assets, with no open source libraries.

Each game got one prompt of about five sentences. The pattern was: "I have Unreal Engine 5 on this computer. Do a one to one recreation of [game] inside Unreal Engine. Make it as close as possible with great graphics. Search the internet for images. Build it yourself without open source libraries. Blender is installed if you need it for assets."

**Super Mario.** The first version was almost indistinguishable from the original, including the music. It turned out Astra had found three GitHub repositories with clones of the game and used them. He asked for a from scratch version. It came back close in gameplay, worse in music, because the model generated the music in code.

**Subway Surfers.** One prompt, about 10 minutes of his time. A 3D runner with trains, coins, power ups, a jetpack with a glitchy animation, and a full menu with graphics settings and a sound toggle. He opened the Blender files afterward and found the train, the character and the barriers modeled there by Astra.

**Counter-Strike.** A menu, a deploy screen, bots, a bomb plant on E. Also a bomb site that was a plain block, glitching wall textures and characters that did not look like people. His summary: "not a polished game at all," and playable.

**Minecraft.** Infinite terrain that generates as you fly, water that changes how the character moves, an inventory bar that places blocks, music generated in code. Killing an animal produced no animation, just a message about raw meat.

**GTA 6.** Astra named it Neon Coast. A Miami sunset, buildings, trees, a beach, a car with engine sound. Character model weak, a plant box that looked terrible, buildings that looked good. His verdict: "certainly at the level of indie game development of very small startups."

His most useful note for anyone building: asset creation is the weak spot. For a real project, feed Astra free 3D models instead of asking it to model everything.

## Experiment 3: references beat descriptions

Minimunch (1.27 million views on the video) ran Astra on high thinking and built four games. His method was different: long prompts plus a folder of reference material.

**Clash of Clans.** About 40 minutes. The UI matched "to a T." Clans work, and joining one dropped him straight into a clan war. He added an admin panel in the prompt to give himself unlimited resources, which is a smart trick for testing a progression game you cannot play for ten hours. Missing: visual feedback when defenses hit troops.

**Fortnite, Chapter 2 Season 1.** 44 minutes, with a folder of reference screenshots. Seven skins, all with the same face. The building system was broken on the first pass and fixed by one revision prompt in 18 minutes and 45 seconds.

**Rocket League.** 44 minutes. This time he uploaded gameplay footage of himself against a bot so the model could extract frames and learn how the car moves. The stadium, lighting and power slide were good. Left and right were reversed, the camera flipped at 90 degrees during aerials, and the ball was too bouncy. One prompt and 10 minutes later, aerials worked.

**Terraria.** About an hour and a half. Corruption biome, floating islands, the dungeon, Skeletron, the Destroyer with accurate lasers, a Terra Blade, wings, an admin panel that spawns every boss. The character's head was not attached to its body properly.

The pattern across all four: the more concrete the reference, the closer the first pass. Screenshots beat adjectives. Video beat screenshots.

## Experiment 4: a Souls-like in Unreal for $250

tef ran Astra on its highest setting from the command line, with Unreal Engine 5.8. His prompt cast the model as a lead Unreal gameplay engineer and asked for a third person dark fantasy boss fight game called Petals at the World's End. He also told it to keep working on itself.

**Prompt one** ran for about three hours: an hour and a half, then a stop to buy more credits, then another hour and 24 minutes. Result: a dark world, a boss called the Hollow Bell Keeper, lock on, parry, stamina, controller support. Also a roll animation that went through the floor and a sword held in the wrong place.

**Prompt two** ran about an hour: a more vibrant world with grass, tree assets Astra pulled from the web, fists instead of the sword, a better roll.

**Prompt three** ran about four hours: a big sword, a sword animation Astra created itself inside Unreal, wall and bell models it found online, a helmet it modeled itself. He told it not to stop until the gameplay view resembled a polished AAA promotional screenshot.

Total: about $250, charged as five automatic $50 refills. His line: "It took control of my computer and just went to work."

## What OpenAI's own team does

OpenAI's developer blog published a piece called "Building games with Astra." It is the most technical source in this study and it confirms the pattern.

Their stack for a web game is TypeScript, Vite and Three.js, with Vitest for unit tests, Playwright for browser play testing, Web Workers for terrain generation and Rapier for physics. Blender is used to author the main 3D asset. A Sites plugin deploys the game from one prompt.

Their workflow has five steps:

1. Start with experience goals, not technical specs. What should the player be able to do?
2. Let Astra propose the architecture inside your constraints.
3. Give Astra inspection tools: test scenes, a browser it can drive, measurements it can read.
4. Build systems that scale across levels of detail.
5. Play the game yourself and give feedback in terms of feel.

The examples are Sunwake, a game about piloting a small boat across a procedural ocean, and Void Explorer, a space game with 2,048 star systems and more than 10,000 planets. The boat's Blender source has 193 editable meshes; the exported asset runs at 14,968 triangles in eight material batches. One terrain scheduling fix cut discarded jobs from 6,074 to 13 in a nine second test.

The line that explains why their results look better than most of the community demos: "Some of my feedback combined appearance and performance, because I was seeing both problems during the same flight." They describe a transition as "jarring" instead of prescribing the fix, and let the model investigate.

## Build times and costs, side by side

| Build | Engine | Model time | Human prompts | Cost noted |
|---|---|---|---|---|
| Rocket simulator (Fireship) | Web 3D | ~26 min | 1 | ChatGPT Pro plan |
| Subway Surfers (Jowett) | Unreal 5 | ~10 min of his time | 1 | Codex, Ultra |
| Clash of Clans (Minimunch) | Web | ~40 min | 1 | High thinking |
| Fortnite (Minimunch) | Web | 44 min + 18:45 fix | 2 | High thinking |
| Rocket League (Minimunch) | Web | 44 min + ~10 min fix | 2 | High thinking |
| Terraria (Minimunch) | Web canvas | ~1.5 h | 1 | High thinking |
| Souls-like (tef) | Unreal 5.8 | ~8 h across 3 runs | 3 | ~$250 |
| Sonic-like (@AiBattle_) | Godot | 53 min Max / 25 min Medium | 1 | ~3% of weekly quota |
| Manhattan world (Matt Shumer) | Unreal | ~1 week | many, street by street | not stated |
| FPS map refinement (Riley Brown) | not stated | ~28 min autonomous | 1 | 20 files, 80 auto checks |

## The pattern nobody is talking about

Two facts from the same week say the same thing.

First, Fireship's rocket. The model that finished first made the better looking game and the worse one to play. The fun lived in decisions: how many knobs to give the player, what the physics does, what happens when you fail. Astra made the safe decision every time, which is why its games look the same.

Second, the benchmark. Astra scored 99.9 percent on ARC-AGI-3, the test built so it cannot be memorized, when it ran inside OpenAI's own harness, the wrapper that manages its memory between steps. On the standard harness that every model is tested on, it scored 62.7 percent. Months earlier, a team from Berkeley reported about 99 percent on the same test with last generation models, Opus 4.8 and Fable 5, by changing only the harness. Without it, those models scored about 42 percent.

Same model, different wrapper, different result. That is also the story of every game above. The builds that gave Astra references, a way to run the game, and feedback in terms of feel came back better. The builds that gave it one adjective heavy prompt came back as a lesser version of something that already exists.

Vice put it bluntly on September 10: Astra "can build video games fast, but they look awfully familiar." A horror game developer told them: "We're about to see more slop, copied ideas and cloned games than ever before."

Both things are true. The tool is real. The taste is still yours.

## A practical workflow

This is the workflow I would use tomorrow, assembled from the four experiments and OpenAI's guide.

**1. Set up three things.** Codex (desktop app or CLI) with GPT-6 Astra selected. A game engine: Unreal Engine 5 is free and gives the best graphics; Godot is lighter; Three.js if you want a browser game with no install. Blender, free, for assets. Tell Astra in the prompt that the engine and Blender are installed.

**2. Write the first prompt around the experience, with references.** A template that worked:

> You are the lead gameplay engineer. Unreal Engine 5 and Blender are installed on this machine. Build a third person [genre] game called [name]. The player should be able to [three verbs]. Reference screenshots are in the folder /refs. Match their look and feel. Use Blender for any asset you cannot find. Run the game, play test it yourself, and fix what you see before you report back.

**3. Add an admin panel.** For any progression game, ask for a debug menu with unlimited resources, teleport, spawn any enemy. You cannot test ten hours of gameplay by hand.

**4. Give feedback in feel words, not code words.** "The roll goes through the floor." "The ball is too bouncy." "The camera flips past 90 degrees." "The transition into orbit is jarring." Let the model find the cause.

**5. Feed it assets.** Astra models a decent building and a terrible plant box. For anything the player looks at closely, give it free 3D models or generated concept art first, then ask it to match.

**6. Budget the reasoning level.** Medium is about half the time of Max for the same prototype. Use Medium for the first pass and Max for the hard fix. Turn off auto refill or set a ceiling before you go to sleep.

**7. Lock down overnight runs.** If Astra is driving your machine while you sleep, it is doing so with your keys. Use a separate machine or user, scope the API keys, and keep your real accounts out of reach.

**8. Iterate on the loop, not the prompt.** The second and third prompts in every experiment above produced more than the first. Play, describe, run again.

## What still needs a human

One Unity developer summarized it after testing: "art direction, economy, live ops, platform cert, accessibility, and the last 20 percent of game feel still need people." His conclusion: "A person still owns taste and systems."

The list from the experiments is consistent. Original ideas. Which knobs the player gets. Difficulty. Visual feedback during combat. Whether the character's head is attached to the body. Whether anyone wants to play it twice.

## What this means for a business

I do not run a game studio. I build AI agents for companies. I am writing about games because the four creators above ran, on camera, the exact loop that decides whether an agent works in a business: give the model the tools, give it references, let it run, look at the result, describe what is wrong in plain words, run again.

The models will keep getting prettier. The 26 minute rocket proves it. What separates the pretty version from the one people use is the wrapper someone builds around the model: the references, the checks, the decisions about what happens when the input is something nobody planned for.

I am running an experiment of my own with Astra this week. I will publish the results in the coming days.

If you want the same loop built around a process in your company, we start with a paid scoping day, then build. [Book a meeting](/).

Read this case study in Hebrew: [איך בונים ומעצבים משחקים עם GPT-6 Astra](/he/blog/build-games-with-gpt-6-astra-he/).

## Sources

Fireship, "I built the same game with Astra and Fable 5.1... only one was fun" (September 9, 2026) — https://www.youtube.com/watch?v=2Xiljy4xzbc
Brendan Jowett, "GPT-6 Astra Is INSANE For Building Video Games (Full Test)" (September 10, 2026) — https://www.youtube.com/watch?v=HVrwoywwvdw
Minimunch, "GPT 6 Astra is ridiculous" (September 5, 2026) — https://www.youtube.com/watch?v=wKunHx6IUeQ
tef, "ChatGPT 6 Astra + Unreal Engine = Insanity." (September 9, 2026) — https://www.youtube.com/watch?v=GuO_Eo34C8E
OpenAI Developers, "Building games with Astra" — https://developers.openai.com/blog/how-to-build-games-with-astra
ARC Prize, "OpenAI's GPT-6 Astra on ARC-AGI-3" (September 3, 2026) — https://arcprize.org/blog/astra
Schema harness, "Frontier Models with Our Harness Achieve ~99% on ARC-AGI-3 Public" — https://schema-harness.github.io/
Jensen Huang on X (September 6, 2026) — https://x.com/JensenHuang/status/2096700264569090384
Aituts, "GPT-6 Astra for Game Creation: Unreal, Unity, Godot & Three.js" — https://aituts.com/gpt6-astra-game-dev/
Aituts, "GPT-6 Astra 3D Generation: Incredible Examples So Far" — https://aituts.com/gpt6-astra-game-demos/
Vice, "GPT-6 Astra Can Build Video Games Fast, but They Look Awfully Familiar" (September 10, 2026) — https://www.vice.com/en/article/gpt-6-astra-can-build-video-games-fast-but-they-look-awfully-familiar/
GuardingPearSoftware, "Will GPT-6 Astra change game development forever?" — https://www.guardingpearsoftware.com/blog/will-gpt-6-astra-change-game-development-forever-20074
DataCamp, "GPT-6 Astra: Features, Benchmarks, and Pricing" — https://www.datacamp.com/blog/gpt-6-astra
MindStudio, "How to Build a Video Game With GPT-6 Astra: A Practical Workflow" — https://www.mindstudio.ai/blog/gpt-6-astra-video-game-development
