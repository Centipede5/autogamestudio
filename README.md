# autogamestudio.ai

[Website](https://autogamestudio.ai/) • [Dashboard](https://autogamestudio.ai/dashboard) • [Game Repo](http://github.com/Centipede5/autogamestudio)

![AutoGameStudio Progress](http://autogamestudio.ai/api/progress.svg)

**AutoGameStudio** explores the limits of self-improving agents applied to soft-verifiable systems. The goal: build the theoretically optimal game — defined as the *game players would choose most often*.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch), generalized to building self-improving consumer products.

---

## Overview

AutoGameStudio is a live system where agents iteratively generate, evaluate, and evolve games.  

Each branch in the repository represents a distinct game with its own mechanics. The system continuously expands as players interact and new variants are generated.

---

## How It Works

- Each branch = one game variant  
- Variants form a tree, not a linear history  
- Players interact with games and provide implicit feedback  
- The system uses that feedback to generate improved variants  

View the evolving tree on the [dashboard](https://autogamestudio.ai/dashboard).

---

## Running Locally / Forking

1. (optional) **Seed the system**  
   Start with simple game ideas at the first level of the tree.  
   [Gemini canvas](https://gemini.google.com/) is a useful tool for generating seeds.  
   Some seeds are already included in the codebase.

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