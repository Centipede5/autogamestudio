# autogamestudio.ai

[Website](https://autogamestudio.ai/) • [Dashboard](https://autogamestudio.ai/dashboard) • [Game Repo](http://github.com/Centipede5/autogamestudio-games)

![AutoGameStudio Progress](http://autogamestudio.ai/api/progress.svg)

**AutoGameStudio** explores the limits of self-improving agents applied to soft-verifiable systems. The goal: build the theoretically optimal game — defined as the *game players would choose most often*.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch), generalized to building self-improving consumer products.

---

## Overview

AutoGameStudio is a live system where agents iteratively generate, evaluate, and evolve games.  This repository hosts the self-improvement loop, while the [games repository](http://github.com/Centipede5/autogamestudio-games) hosts the generated game variants. Both are completely open-source. There is also an [evaluation site](https://autogamestudio.ai) where you can play the games and provide feedback.

---

## How It Works

For the [games repository](http://github.com/Centipede5/autogamestudio-games)
- Each branch = one game variant  
- Variants form a tree, not a linear history  
- Players interact with games and provide implicit feedback  
- The system uses that feedback to generate improved variants  

View the evolving tree on the [leaderboard](https://autogamestudio.ai/elo-history).

The evolution process is guided by a simple agent (see [agent prompt](prompts/agent.md)) that analyzes the current game and player feedback to create a plan for improvement. The agent then implements that plan in a new branch, which players can then interact with.

---

## Parent Selection Algorithm

Parent selection is branch-based and repo-aware.

### Auto-select mode

When the CLI is in `auto-select` mode, it does the following:

1. Fetches ranked version data from `https://autogamestudio.ai/api/versions` by default
2. Filters out any branch that:
   - is labeled or named like `main`
   - has fewer than `3` matches/evals
3. Sorts the remaining candidates by:
   - highest Elo first
   - then higher match count as a tiebreaker
4. Drops any website candidate that does not actually exist in the selected repo
5. Samples from the remaining ranked list using an exponential exploration distribution:

`weight(rank) = exp(-lambda * rank)`

Where:
- `rank = 0` is the highest-ranked candidate
- higher `lambda` means more exploitation of top Elo branches
- lower `lambda` means more exploration of lower-ranked branches

Preset exploration values:
- `1.25` = focused
- `0.75` = balanced
- `0.35` = exploratory
- `0.15` = wide search

This means the CLI does **not** always choose the top Elo game, but it still strongly favors high-performing games unless the user asks for wider exploration.

### Fixed-parent mode

When the CLI is in `fixed` mode, it skips the website ranking pool and always branches from the exact ref the user entered.

Accepted fixed-parent refs:
- branch name, such as `rhythm`
- remote-tracking branch name, resolved through the local repo state
- commit hash, such as `40201b3`

If a fixed ref resolves to a raw commit rather than a named branch, the CLI can still branch from it, but auto-PR is skipped because there is no clean PR base branch.

### Child branch naming

Child branches use:

`{root}-v{depth}.{width}-{callsign}`

Examples:
- `fighting-v2.1-c5`
- `rhythm-v3.2-calvi`

The CLI also skips already-existing child branch names, so retries do not crash on stale local branches from failed runs.

---

## Installation And Running

### Requirements

- Node.js `22+`
- `git`
- one installed provider CLI:
  - `codex`
  - `claude`
  - or `gemini`
- internet access to `https://autogamestudio.ai` for Elo/context selection
- optional override if you want to point the CLI at a different website base URL
- `GITHUB_TOKEN` only if you enable auto-PR

### Install the CLI locally

From this repository:

```powershell
npm install
npm run build
```

To use the built command directly:

```powershell
node dist/cli.js
```

To expose it as a shell command:

```powershell
npm link
autogamestudio
```

### Install provider CLIs

Codex:

```powershell
npm install -g @openai/codex
codex --version
```

Claude Code:

```powershell
npm install -g @anthropic-ai/claude-code
claude --version
```

Gemini CLI:

```powershell
npm install -g @google/gemini-cli
gemini --version
```

### Run the CLI

Interactive run:

```powershell
autogamestudio
```

Or without `npm link`:

```powershell
node dist/cli.js
```

The CLI will then guide you through:

1. confirming the danger warning
2. choosing the starting repo
3. choosing the provider
4. choosing a callsign
5. choosing the exploration lambda preset
6. choosing `auto-select parent` or `fixed parent`
7. choosing auto-PR and public-feedback settings
8. choosing `run once` or `run continuously`

### Useful flags

```powershell
node dist/cli.js --repo "https://github.com/Centipede5/autogamestudio-games" --provider codex --callsign c5 --website-base-url "https://autogamestudio.ai" --once
```

Supported flags:
- `--repo <pathOrUrl>`
- `--provider <codex|claude|gemini>`
- `--callsign <callsign>`
- `--auto-pr`
- `--dangerous-public-feedback`
- `--website-base-url <url>`
- `--once`

### Runtime files in the game repo

The CLI creates a local `.autogamestudio/` directory in the target game repo for:

- prompts
- guardrails
- local state
- worktrees
- the latest synced `plan.md`

This directory is automatically added to `.gitignore` by the CLI and should remain uncommitted.

---

## Contributing

Contributions focus on expanding the search space or improving the optimization loop.

1. **Add new game seeds**  
   - Simple, diverse concepts  
   - Prefer HTML5 canvas for rendering  

2. **Run your agent on existing branches**  
   - Select a branch  
   - Generate improved variants  

3. **Improve the system**  
   - Selection algorithm  
   - Feedback loop  
   - Infrastructure / performance  

---

## Design Choices

### 1. Trees over lines

Instead of a linear loop, the system grows a tree of games from simple seeds.

- Enables parallel exploration  
- Scales with branching factor  
- `selection_lambda` controls exploration vs exploitation  

---

### 2. Self-improvement through feedback loops

Player behavior is the signal.

- Choices and preferences → feature signal  
- Signal → new variants  
- Continuous closed-loop optimization  

---

### 3. Soft-verifiability

Game quality has no ground-truth metric.

The system optimizes for:

- **Player choice frequency**  
- Approximated using **ELO ratings**  

---

## Star History

<a href="https://www.star-history.com/?repos=Centipede5%2Fautogamestudio&type=date&legend=top-left">
 <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Centipede5/autogamestudio&type=date&theme=dark&legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Centipede5/autogamestudio&type=date&legend=top-left" />
    <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Centipede5/autogamestudio&type=date&legend=top-left" />
 </picture>
</a>

---

## License

MIT
