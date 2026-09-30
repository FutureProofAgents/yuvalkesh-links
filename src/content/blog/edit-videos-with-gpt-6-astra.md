---
title: "How I Edit Videos With GPT-6 Astra: My Full TikTok Workflow (Plus the Free Skill)"
description: "How I use OpenAI's GPT-6 Astra in Codex to edit TikTok videos: a teleprompter it built, auto-loaded scripts, one-command editing, and the free skill."
pubDate: 2026-09-30
lang: en
tags: ["GPT-6 Astra", "edit videos with AI", "AI video editing", "TikTok editing", "Codex", "Codex skills", "whisper.cpp", "teleprompter"]
translationOf: edit-videos-with-gpt-6-astra-he
coverImage:
  src: /images/blog/edit-videos-with-gpt-6-astra/cover.jpg
  alt: "Psychedelic illustration of a creator leaning back inside a clockwork machine next to a film camera and a floating screen, while the edit runs itself"
faq:
  - q: "Can GPT-6 Astra edit videos?"
    a: "Not on its own, and not inside ChatGPT. It edits videos when it runs inside an agent harness like Codex that can use your computer: it runs FFmpeg, whisper.cpp and Python on your files, looks at the rendered frames, and fixes what it sees. The quality depends on the instructions you give it, which is why I packaged mine as a skill."
  - q: "Is the Viral TikTok Editor skill free?"
    a: "Yes. It is MIT licensed on GitHub at github.com/Yuvalkesh/viral-tiktok-editor. You need your own Codex or Claude Code subscription, plus free tools: FFmpeg, jq and whisper.cpp."
  - q: "Does it work for English videos or only Hebrew?"
    a: "Both. It was built for Hebrew because right to left captions are where most AI editors break. Set WHISPER_LANGUAGE to en, or any other language code, and it transcribes and captions in that language."
  - q: "Does the skill publish to TikTok for me?"
    a: "No. Editing never authorizes publishing. It exports a versioned MP4 and, if you ask, an editable CapCut project. Uploading is a separate request you make on purpose."
  - q: "Why did you build your own teleprompter app?"
    a: "My iPhone storage was full, so I recorded on an Android phone, and the only free teleprompter app I found was buried in ads. I asked Codex to build one: offline, no ads, Hebrew right to left, with the camera behind the text. It also lets my Mac push a finished script straight onto the phone over a USB cable."
  - q: "Is Claude Code or Codex better for video editing?"
    a: "I run this workflow in Codex with GPT-6 Astra because it is strong at hands on the screen work: looking at frames, clicking through CapCut, pulling files off the phone. The skill folder works in Claude Code too. Pick the harness you already pay for."
---

A video this skill edited for me reached 300,000 organic views.

It was about Google publishing a full map of a fruit fly's brain, and everything the internet did with it next.

It was posted from accounts that had zero followers.

No ads, no audience, no editor on payroll.

I recorded it on a phone, and OpenAI's GPT-6 Astra, running inside Codex on my Mac, did the edit.

This article is the full workflow: the hardware, the teleprompter I had the agent build for me, how scripts get to the phone, and how a recording turns into a finished TikTok with captions, B-roll and zooms.

At the end you can download the editing skill for free.

> **Want the next skill before everyone else?** I share new agent skills, workflows and what's working for me first in my free WhatsApp group. [Join the group here](https://chat.whatsapp.com/KjeF05QrMTZ0s5ty66Ee92).

## What "editing with GPT-6 Astra" actually means

[GPT-6 Astra](/blog/gpt-6-astra-guide/) is OpenAI's model built to operate a computer.

On its own it can't open a video file.

Inside Codex it can: it runs terminal commands, reads files, looks at images, and checks its own output.

So "Astra edits my videos" really means Astra drives the same free tools a video engineer would use.

FFmpeg for cutting and rendering.

whisper.cpp for transcription, running locally on my Mac.

Python for captions and timeline math.

CapCut, when I want to keep editing by hand.

The model is the editor. The skill is the editing manual I wrote for it.

## Why I record on an Android phone

My iPhone storage went bananas.

Every video I recorded was a fight with the "storage almost full" popup.

So I took an old Android phone, a POCO X3 Pro, and made it my recording device.

That created a second problem.

## The free teleprompter apps were unusable, so I had Codex build one

I read my scripts off a teleprompter. Without one I ramble, and rambling kills retention.

The only free teleprompter app I could find was riddled with ads.

An ad popping up between two sentences while you're recording is the end of that take.

So I asked Codex to build me a teleprompter.

It wrote a native Android app from scratch, built the APK, and installed it on the phone over USB.

What it does:

- Hebrew and English, right to left by default
- The camera preview sits behind the scrolling text, so I read and record in the same app
- Speed and text size sliders, countdown, pause with a tap
- Saves recordings straight to the phone's gallery
- No ads, no account, no analytics, and no internet permission at all

The install wasn't smooth.

Xiaomi's security layer blocked the first attempt with `INSTALL_FAILED_USER_RESTRICTED`, and I had to allow USB installs in the developer settings.

After that it just worked.

## The USB cable is the whole trick

The phone stays plugged into the Mac with a cable, with USB debugging on.

That cable turns the phone into something my agents can reach.

Here's what that unlocks.

**Scripts load themselves onto the phone.**

I have skills that write my video scripts: turning a Facebook post into a TikTok script, or a news story into something I can say out loud.

The moment I approve a script, a small Python script pushes it over the cable into the teleprompter app, archives the previous script in the app's library, and opens the editor.

I pick up the phone and the words are already there.

No copy and paste, no WhatsApp to myself, no emailing a text file.

**Recordings come back the same way.**

When I stop recording, the video sits in the phone's gallery.

I tell Codex "take my last recording from the Android and edit it," and it pulls the file off the phone and starts the edit.

That's the entire handoff.

## What the editing skill does, step by step

The skill is called Viral TikTok Editor. Here's what happens after I hand it a recording.

**1. It never touches the original.**

Every video gets its own project folder with `source`, `transcript`, `broll`, `work`, `exports` and `review` subfolders.

The raw recording is copied in and left alone.

**2. It transcribes locally.**

whisper.cpp with the large-v3-turbo model, running on my Mac, with word-level timestamps.

It then corrects names, brands and numbers against my script, because Whisper hears "Kalshi" as three random Hebrew words.

**3. It writes an edit plan before it cuts anything.**

The hook, what gets deleted, where the zooms go, which sentence gets B-roll, where the music drops.

The opening goes to the strongest line I said, even if I said it at minute two.

**4. It finds B-roll in a strict order.**

My own footage and screenshots first.

Then official sources, like the actual article or the company's press page.

Then stock footage with a clear license.

Generated images only as illustration, never as proof of anything.

Every insert gets a line in a sources file with the URL and the reason it's allowed.

**5. One timeline controls everything.**

Video cuts, dialogue cuts and captions all come from a single frame-accurate JSON file.

This sounds like a detail. It's the reason captions don't drift out of sync after the tenth cut.

**6. Captions are built for Hebrew.**

Two to five words per caption, broken where I actually pause, not by character count.

Right to left text is rendered with proper shaping and then checked in real frames, because mixed Hebrew and English is where every captioning tool I've tried falls apart.

**7. Audio gets mixed, not just normalized.**

My voice sits around -16 LUFS, music sits well underneath and ducks when I speak.

**8. It checks its own work.**

It looks at frames from the opening, the busiest section and the ending, runs a decode and loudness check, and writes a short QA note.

When it can't actually listen to the audio, it says so instead of pretending.

**9. Every export is versioned.**

`final-v01.mp4`, `final-v02.mp4`, and so on. Nothing gets overwritten, and nothing gets published.

## Extra footage: just throw it in

Screenshots, screen recordings, a clip of the product I'm talking about, gameplay from a game I built.

I drop them into the chat and say where they belong.

The skill matches each insert to the exact sentence it proves.

For videos about [the games I build with Astra](/blog/build-games-with-gpt-6-astra/), it goes into the project folder, finds real gameplay captures, and puts them on top with me in a square below.

## References make it better every week

This is the part people underestimate.

The skill improves every time I give it a reference or a complaint.

A few real examples from the last two weeks:

**"You didn't look at the reference video."**

I sent an Instagram reel whose style I liked: me on top, the example on the bottom, whoosh sounds on transitions, zooms in and out, animated text.

The first pass ignored it. I called it out, and the next version followed it.

**"Fewer diagrams, more real footage."**

After an edit about the TikTok algorithm, I told it the flowcharts and text cards felt cheap.

That note is now a permanent rule inside the skill: prefer moving footage that shows what I'm talking about, and if there's nothing good, keep me on screen instead of filling it with a diagram.

**A full revision in plain language.**

On a video about the movie Léon, my feedback was a list:

Keep my opening line exactly as I said it.

Remove the weird on-screen texts.

Some transitions show static images, fix them.

Add captions, cuts, zoom in and zoom out.

Add real footage of the band I mentioned.

End on the explosion, full screen, with the actor's actual scream from the film instead of my imitation.

Ten versions later, v10 was on my phone, ready to post.

Every one of those notes can become a line in the skill's reference files, so the next video starts where this one ended.

## What still breaks

I'd rather you hear it from me than find out yourself.

**It can't truly listen.**

It can measure loudness and run the audio back through Whisper to check it's intelligible. It can't tell you whether your voice sounds nice. You still need to watch it once with headphones.

**Fancy audio restoration can backfire.**

I tested a neural speech enhancer on a Hebrew recording. It passed every technical check and destroyed the consonants and numbers. The skill now treats that model as rejected for Hebrew.

**CapCut projects are fragile.**

CapCut's project format isn't a public API. The skill can build an editable project, but it has to verify it in the actual app, and an update to CapCut can break the method.

**It needs taste from you.**

The first pass is usually good. The great version comes after you tell it what felt off.

## Download the skill for free

The editing skill is open source, MIT licensed:

**[github.com/Yuvalkesh/viral-tiktok-editor](https://github.com/Yuvalkesh/viral-tiktok-editor)**

Install in Codex:

```sh
git clone https://github.com/Yuvalkesh/viral-tiktok-editor ~/.codex/skills/viral-tiktok-editor
```

Or in Claude Code:

```sh
git clone https://github.com/Yuvalkesh/viral-tiktok-editor ~/.claude/skills/viral-tiktok-editor
```

You'll need FFmpeg, jq, whisper.cpp and a Whisper model. The README lists the rest.

Then record something and say: `Use $viral-tiktok-editor to edit my latest recording for TikTok.`

## Get the next one first

This skill started as a messy experiment and got better with every video.

I share the next versions, new skills and the workflows behind them in my free WhatsApp group first.

**[Join the WhatsApp group](https://chat.whatsapp.com/KjeF05QrMTZ0s5ty66Ee92)**

If you want a system like this built inside your business, for content or for anything else your team does by hand every day, [message me on WhatsApp](https://wa.me/972526414555). That's what I do.
