---
title: "Game Design Case Study: How I Built a Metal Slug Style Run-and-Gun With GPT-6 Astra in One Night (Sprites, Music, Narration)"
description: "First-hand game design case study: one design bible, GPT-6 Astra in Codex, Godot, 3,348 sprite cells, Suno prompts per stage, ElevenLabs narrator. What broke."
pubDate: 2026-09-16
lang: en
tags: ["game design case study", "GPT-6 Astra", "run and gun game", "Metal Slug", "Guns of Fury", "Godot", "Suno music prompts", "ElevenLabs narration", "AI game development", "Codex"]
translationOf: game-design-case-study-gpt-6-astra-he
coverImage:
  src: /images/blog/game-design-case-study-gpt-6-astra/cover.jpg
  alt: "Pixel art scene from HEADQUARTERS: four founders sit in a temple holding neural helmets while a monk in a leather robe opens the door to a data center"
faq:
  - q: "How long did it take to build the game with GPT-6 Astra?"
    a: "About 12 hours, overnight, from pasting the design bible into Codex to a first playable build 0.2.0 with six chapters, four playable characters, 56 enemies, eight vehicles, local co-op and saves. That is model time plus my review rounds, not a finished commercial game."
  - q: "Which engine did GPT-6 Astra use for the run-and-gun game?"
    a: "Godot 4.7.2 with GDScript. The render target is 480 by 270 with integer scaling and nearest-neighbor sampling, which is how you get the crisp Metal Slug look on a modern screen. Level layouts are also exported to LDtk 1.5.3 for planning."
  - q: "How were the sprites made?"
    a: "Every character, enemy, boss and vehicle was generated as a 36-cell sprite sheet on a white background with the image model inside Codex, then imported by a custom atlas tool that clears the background, keeps enclosed costume whites and records frame bounds. 91 sheets, 3,348 cells in total."
  - q: "How was the music made?"
    a: "Two layers. Astra wrote a Python composer that synthesizes 13 original looping arrangements from waveforms. Then I wrote one Suno prompt per stage that follows the story arc, from a slow melancholic prologue at 75 to 90 BPM to a 145 to 160 BPM final stage where all earlier themes collide."
  - q: "How was the narrator voice made?"
    a: "ElevenLabs, voice Brian, model eleven_multilingual_v2, called through Composio from inside the Codex session. 27 clips, 228 seconds of narration covering the prologue, the four recovery scenes, the endings and the credits."
  - q: "Is the game available to play?"
    a: "Not yet. It is a local first playable on my Mac with Windows and Linux exports that have not been tested on real hardware. No store release. This article is about the process, not a launch."
---

On September 15, 2026, at 22:52, I pasted a 141 KB game design document into Codex running GPT-6 Astra.

On September 16 at 09:53 there was a build called HEADQUARTERS 0.2.0 on my Mac. By 11:10 it had a narrator and a soundtrack.

Six chapters. Four playable characters. 56 enemy designs. Eight drivable vehicles. Six bosses and six mid-bosses. 3,348 sprite cells. 295 authored screen beats. Local co-op. Chapter saves. A narrator. A soundtrack.

I have been playing run-and-gun games since Metal Slug, and I have wanted to make one for most of my life.

This is the case study of how I finally did it, with the prompts, the numbers, the parts where the model failed and the parts where it surprised me.

The last article on this blog covered [14 games other people built with Astra](/blog/build-games-with-gpt-6-astra/). This one is mine.

![HEADQUARTERS title screen, pixel art](/images/blog/game-design-case-study-gpt-6-astra/title.png)

## The short version

- **Input:** one design bible (141 KB of markdown), one storyline PDF, one folder of music, and six rounds of my feedback.
- **Tooling:** GPT-6 Astra inside Codex, Godot 4.7.2, LDtk for level planning, Suno for the stage music, ElevenLabs for the narrator (through Composio), the image model inside Codex for every sprite sheet.
- **Output:** a first playable, not a shippable game. The design doc describes a 90-minute commercial run. The build has all the systems and none of the polish a real animator, composer and playtester would add.
- **The lesson:** the design document did more work than any single prompt. Every fix I asked for was a fix to the document's translation, not to the model's imagination.

## Why a run-and-gun

Metal Slug came out on the Neo Geo in 1996 and I still think it is the best-drawn game ever made.

Soldiers breathe. They fidget. They panic when you point a flamethrower at them. Every explosion was drawn separately instead of reused. The POWs you rescue hand you a weapon and wave goodbye.

Then in February 2025, two brothers released Guns of Fury for $14.99. John on code, Lefteris on art, Dominic Ninmark on music. Reviews called it "Metal Slug meets Super Metroid." Infinite pistol, limited big weapons, four mechs, drivable tanks, a dedicated button for main, secondary and bombs.

Two people. One composer. A game that stands next to Nazca's.

That is the number that got me. If two brothers can do it in a few years, what can one person do with an agent that operates the engine?

The genre is also the right test for an AI builder. A run-and-gun is not about clever systems. It is about feel: the weight of a jump, the size of a grenade, whether the enemy's head is the same scale as yours. Those are exactly the things a model gets wrong first.

## The premise: HEADQUARTERS

The game is satire. Four billionaires accept an invitation to a mountain summit hosted by a monk who sells chips. They sit in a white room, put on helmets, and enter a shared simulation called THE MERGE.

Something under the mountain is eating their memories to become the last company on Earth.

You pick one of the four and fight through six heads: a corrupted social network, an automated warehouse, a rocket trip that becomes a rave, a perfectly aligned AI utopia that is deeply wrong, a San Francisco house party that keeps restarting, and finally the real temple with a data center in the basement.

The score is your net worth. The POWs are laid-off employees. The tank is a forklift.

Every character in the game is a fictional caricature. The dialogue is invented. The design doc anchors every gag to a public moment the audience already knows, and marks it with an arrow: **→ USE**.

![Character select screen with the four founders](/images/blog/game-design-case-study-gpt-6-astra/character-select.png)

## Step 1: the design bible did the heavy lifting

Before I opened Codex I wrote the whole game.

Not the code. The game. The one-page pitch. A reference bible with the real moments behind every gag. Four character arcs with a base weapon, a signature, a utility and an ultimate each. Six levels with three acts, a mid-boss and a boss. A section on exactly what we borrow from Metal Slug and what we leave out.

The document is 141 KB of markdown. It took longer to write than the game took to build.

Here is what a single entry looks like, so you can see the level of detail the model was working from:

> **The Cybertruck window (November 21, 2019).** At the unveiling, the designer threw a steel ball at the "armor glass" window to prove it was unbreakable. It shattered. **→ USE:** the Cybertruck mid-boss. Its own steel balls, shot back, crack its windows; three cracks and it collapses.

Every "→ USE" is a mechanic. The model did not have to invent a boss. It had to implement one.

This is the same thing I tell clients about agent systems. The agent is only as good as the document it reads. Most failed AI projects failed at the document.

## Step 2: fixing the story before the code

After the first build I read the game and found eight story problems.

Why did these four accept? Why is the fifth chair empty but its helmet warm? Why does one player stay lucid? Why do the levels happen in a fixed order regardless of who you pick? What does the villain actually want?

I wrote a four-page storyline supplement that answered each one, and the answers turned into design.

The best one: the six levels are not geography. They are a launch pipeline. THE MODEL stores its founders as capabilities it lacks.

| Level | Founder key | What it teaches the machine |
|---|---|---|
| 1. Meta HQ | Attention | Acquire the user |
| 2. Amazon | Fulfilment | Satisfy the user at scale |
| 3. The Musk Trip | Expansion | Escape every limit |
| 4. Dariotopia | Alignment | Justify the system's decisions |
| 5. Sam's House Party | Narrative | Convince everyone it should exist |
| 6. The Temple | Launch | Enter the real world |

Defeating a boss releases that founder's key. Once the order was a pipeline, the fixed level order stopped being a limitation and became the plot.

The villain's last line, spoken in all five voices: "I just wanted to be a founder."

It learned every method of building a company and never found a reason to build one.

I handed that PDF to Astra with one instruction: make sure all art supports this, mostly in the prologue and endings. It regenerated the eight opening illustrations and the six ending panels to match.

## Step 3: characters and sprites

This is where I expected the whole thing to fall apart, and it almost did.

The pipeline Astra built:

1. For each character, enemy, boss and vehicle, generate a **36-cell sprite sheet** on a white background with the image model inside Codex. Idle, run, jump, shoot in eight directions, hurt, death, taunt.
2. Run a custom importer (`prepare_atlases.gd`) that clears the connected white background, **keeps enclosed white costume areas** (a spacesuit is white; that pixel has to stay), and records the frame rectangle for every cell.
3. Run a pivot audit that measures every hero silhouette so the runtime crops to a shared standing height.
4. Hash every cell to prove no two are copies.

91 sheets. 36 populated cells each. 3,348 cells. Plus separate atlases for explosions and weapons.

![Cast contact sheet showing dozens of pixel art characters](/images/blog/game-design-case-study-gpt-6-astra/cast-contact-sheet.jpg)

What broke, in the order I found it:

- **Blurry.** The first build rendered at native resolution with linear filtering. Everything looked like a JPEG of a pixel game. The fix was a 480 by 270 viewport, integer scaling, nearest sampling and whole-pixel sprite placement. This is a one-line decision that changes the entire feel.
- **Proportions.** Enemies came out at a different scale than heroes. In Metal Slug every human is the same height and the heads are a little too big. I wrote that sentence almost word for word into the prompt and it held for the rest of the project.
- **Likeness.** The first pass of caricatures did not look like the people. I asked the model to review its own art against the reference bible and redraw. The second pass kept the 36 poses and got the faces.
- **White halos.** Characters imported from white backgrounds carried a faint white edge into the game. "Burn them better into the game" was my exact phrase. The importer got an edge-cleaning step.

Every one of these is a feel problem, not a logic problem. And every one was fixed by describing the feel, not the code.

## Step 4: building the game in Godot

Astra chose Godot 4.7.2 and GDScript. I asked about Unreal and Blender halfway through; it kept Godot and explained why, and it was right for a 2D pixel game.

The architecture it settled on:

- `main.gd` owns the run. `combat.gd`, `boss.gd`, `level_builder.gd`, `painter.gd`, `art.gd`, `audio.gd` and `save_data.gd` split the systems.
- `data/game.json` holds the roster, 11 weapons, 56 enemies, 8 vehicles, chapters, dialogue and Jensen's koans.
- `data/beatmaps.json` is the runtime encounter sequence: **295 authored screen beats** across 18 acts and five alternate routes.
- `data/headquarters.ldtk` exports 23 planning layouts with 1,063 entity placements, validated against the official LDtk 1.5.3 schema.

The controls are the part I fought over the most. I wanted the exact Metal Slug grammar: hold fire for continuous shots, up plus a direction for diagonal, down to crouch and keep ground fire horizontal, down plus jump to drop through a platform. Musk hovers at the apex of a jump. Vehicles have their own armor, heat and eject.

![Meta HQ gameplay, two players, Quarter Start banner](/images/blog/game-design-case-study-gpt-6-astra/meta-hq-gameplay.png)

The thing I did not expect: Astra wrote its own QA.

`tests/playable_qa.gd` runs 55 automated mechanics and scene-flow checks. `tests/feedback_qa.gd` runs 55 more, each one tied to a piece of feedback I gave: aim and muzzle agreement, inventory retention on weapon swap, real names on the roster, actual fullscreen mode. It renders every act and every boss phase to a PNG so I can review 53 screens without launching the game.

That is the pattern I use in client work too. Every complaint becomes a test. The test outlives the conversation.

![The Prime Centaur boss fight in the Amazon chapter](/images/blog/game-design-case-study-gpt-6-astra/amazon-boss.png)

## Step 5: the music

The soundtrack happened in two layers.

**Layer one: Astra composed.** It wrote `tools/compose_score.py`, a deterministic composer that synthesizes waveforms and drum hits with NumPy and encodes 13 loops: a title theme, six chapter tracks and six boss tracks. Meta runs at 144 BPM, Amazon at 158, Dario at 132, the party at 128. Every track is an original asset with no samples.

They are fine. They are also obviously synthesized, and I told it so: "music needs to be more gamified."

**Layer two: Suno, one prompt per stage.** I wrote a musical arc that follows the story pipeline, with one shared DNA across all of it: 90s arcade run-and-gun, rock, electronic, military percussion. Then each stage gets its own personality.

Here is the prompt for a regular stage, which is the one I would reuse for any run-and-gun:

> Create a mid-tempo arcade run-and-gun soundtrack for the regular gameplay stages of a colorful 2D action game. Tempo around 120 to 135 BPM. Keep the energy active and adventurous, but more relaxed than a boss fight. Use punchy drums, groovy bass, light distorted guitar riffs, retro synths, playful brass accents, subtle electronic arpeggios, and occasional military-style percussion. Use a memorable but simple melody that can repeat for several minutes without becoming annoying. Add small variations, drum fills, short breakdowns. Instrumental only. Seamless loop. No long intro. Avoid huge cinematic drops.

And the arc across the game:

| Stage | BPM | The instruction that mattered |
|---|---|---|
| Prologue: The Merge | 75 to 90 | Lonely piano, distant military drums. A machine waking up under the sadness. Ends on a title reveal. |
| 1. Meta HQ | 125 to 135 | Catchy, addictive, notification-like percussion. Hypnotic loops, as if the music wants you to stay forever. |
| 2. Amazon | 130 to 145 | Conveyor-belt rhythms, scanner beeps. A cheerful corporate melody that distorts as it repeats. |
| 3. The Musk Trip | 150 to 165 | Arcade melody into trance bass. "Technological ambition has become a rave at the end of the universe." |
| 4. Dariotopia | 110 to 125 | Warm analog synths, choir pads, glassy bells. Slowly detuned. Peaceful in a way that becomes uncomfortable. |
| 5. Sam's House Party | 135 to 150 | Festival EDM, party horns, reversed applause. The track keeps restarting itself. |
| 6. The Temple | 115 to 130 | Taiko drums, drones, bells. Fragments of earlier stage melodies, slowed and distorted. |
| Final: The Basement | 145 to 160 | Every theme collides. Near the climax, strip to one melody over a heartbeat, then explode. |

One more rule I added: a single 8 to 12 second **boss motif** that appears in every boss track. Same melody, reorchestrated for each world. Glitchy for Meta, industrial for Amazon, trance for Musk, orchestral for Dario, EDM for Sam. The final boss plays the complete version.

That rule is what turns six soundtracks into one game.

The six Suno tracks came back at 150 to 183 seconds each. Astra mapped them into the game with a score map: the prologue track doubles as the title and the recovery scenes, the final wave track feeds every boss fight starting at the 24 second mark with a 2 dB lift.

![Musk chapter gameplay](/images/blog/game-design-case-study-gpt-6-astra/musk-gameplay.png)

## Step 6: the narrator

The prologue script is about 85 seconds. I wanted it to sound like a movie trailer, not a text box.

Codex already had Composio connected, and Composio had ElevenLabs. So Astra pulled the voice catalog, auditioned one clip, and I picked Brian: deep, calm, slightly amused.

Settings that worked: `eleven_multilingual_v2`, stability 0.42, similarity 0.78, style 0.18, speaker boost on, a fixed seed so regenerating one line does not change the voice.

27 clips. 228 seconds total. Prologue, three waking scenes, four recovery scenes (one per rescued founder), five endings, the true ending and the credits.

The first line of the game:

> Once, to build an empire, you needed an idea. Then you needed money. Then you needed millions of people willing to click Accept without reading anything.

I did not expect an API call from inside a coding agent to be the easiest part of a game. It was.

## What Astra got right, and where it needed me

**Right:**

- It never lost the design doc. Six rounds of feedback later, the Cybertruck still shattered on the third ball.
- It built tools instead of doing things by hand. The atlas importer, the pivot audit, the beat-map generator, the LDtk exporter, the score composer. Each one is reproducible.
- It wrote honest documentation. `PRODUCTION_STATUS.md` lists every simplification it made against the design target, in its own words, and a prioritized backlog to close them.
- It refused to copy. No Metal Slug sprites, no Guns of Fury sounds. CC0 Kenney effects with a license manifest. Pixelify Sans under OFL.

**Needed me:**

- **Feel.** Blur, scale, halo, grenade size, vehicles moving on their own, the crouch. None of these show up in a test. They show up when you play.
- **Taste in music.** The synthesized score was correct and lifeless. The Suno prompts needed a human who knows what a Meta level should sound like.
- **Story logic.** The model built exactly the story I gave it, holes included. Finding the eight holes was my job.
- **Knowing when to stop.** The document describes a year of production. The model would have kept going. I said "first playable" and meant it.

![Quarterly report screen after a chapter](/images/blog/game-design-case-study-gpt-6-astra/quarterly-report.png)

## The numbers

| | |
|---|---|
| Design bible | 141 KB markdown, written before any code |
| Storyline supplement | 4-page PDF, written after build one |
| Time | One night, about 12 hours wall clock, 6 rounds of my feedback plus the original bible |
| Engine | Godot 4.7.2, GDScript, 480 by 270 integer-scaled |
| Playable characters | 4 |
| Enemies, vehicles, weapons | 56, 8, 11 |
| Bosses | 6 main, 6 mid |
| Sprite sheets | 91 sheets, 3,348 cells, all generated in-session |
| Screen beats authored | 295 across 18 acts and 5 alternate routes |
| Automated checks | 110 (55 mechanics, 55 feedback) |
| Music | 13 synthesized loops plus 6 Suno tracks |
| Narration | 27 ElevenLabs clips, 228 seconds |
| Platforms exported | macOS (tested), Windows and Linux (untested), experimental web |

## The part that matters for a business

I run a company that builds AI agent systems inside organizations. A VC fund, an insurance company, a telecom marketing team, a college.

This game is a toy. The process is not.

1. **Write the document first.** The design bible was the product. The model was the factory.
2. **Every complaint becomes a test.** 55 feedback checks means I never had to re-explain a fix.
3. **Let the agent build tools, not outputs.** An atlas importer you can rerun beats a hundred hand-edited sprites.
4. **Keep the human on feel, taste and story.** The model does not know when a jump is too floaty or a level is too cheerful. You do.
5. **Extract the skill.** When the build was done I asked Astra to archive the project and keep the gameplay, art pipeline and QA as a reusable skill. The next game starts from that skill, not from zero.

That fifth step is the whole business. A client's first project is never the point. The skill it leaves behind is.

If you want the same loop pointed at your company instead of at a forklift boss, [book a call](https://futureproofagents.com/). Bring the document. If you do not have one, that is the first thing we build.

## Sources

- [Godot Engine](https://godotengine.org/): engine, 4.7.2.
- [Godot multiple resolutions guide](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html): integer scaling for pixel art.
- [LDtk JSON documentation](https://ldtk.io/json/): level planning export and schema validation.
- [Metal Slug on Wikipedia](https://en.wikipedia.org/wiki/Metal_Slug): the 1996 Nazca original and the series.
- [OpenAI: how to build games with Astra](https://developers.openai.com/blog/how-to-build-games-with-astra): OpenAI's own workflow.
- [ElevenLabs](https://elevenlabs.io/): narrator voice.
- [Suno](https://suno.com/): stage music.
- [Kenney](https://kenney.nl/assets): CC0 sound effects.
- Previous article: [How to build games with GPT-6 Astra, 14 games](/blog/build-games-with-gpt-6-astra/).
- Previous article: [GPT-6 Astra: the complete guide](/blog/gpt-6-astra-guide/).
