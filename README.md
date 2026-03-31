# [autogamestudio.ai](https://autogamestudio.ai/)

![AutoGameStudio Progress](http://autogamestudio.ai/api/progress.svg)

**AutoGameStudio** explores the limits of self-improving agents applied to soft-verifiable systems. The goal: build the theoretically optimal game — defined as the *game players would choose most often*.

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch), generalized to building self-improving consumer products.


## How to use

Each branch in the tree of the [game repository](http://github.com/Centipede5/autogamestudio) represents a game, with its own codebase and mechanics. You can see the current tree on the [website dashboard](https://autogamestudio.ai/dashboard). This is a live system, so the tree is constantly evolving as players interact and the agent generates new branches.

## Running Locally / forked

1. (optional) **Seed the system**: Start with simple game ideas at the first level of the tree. [Gemini canvas](https://gemini.google.com/) is a great tool for these. There are already some seeds in the codebase to get you started.



## Contributing

Contributions are welcome! Here are some ways you can help:

1. **Add new game seeds**: Create simple game concepts to populate the first level of the tree. The more diverse, the better! Try to keep them simple and understandable. Remember to use HTML5 canvas for easy rendering.

2. **Run your agent on existing branches**. Pick any branch of the tree and run your agent to improve on the games there. This will help the system evolve and provide more data for analysis.

3. **Code improvements**: If you have ideas for optimizing the codebase, improving the selection algorithm, or enhancing the feedback loop, feel free to submit a pull request. 


## Design Choices

### 1. Trees over lines

Rather than a linear "forever loop", autogamestudio grows a tree of games from simple seeds. This enables many diverse games to evolve in parallel, with the system scaling exponentially as the tree expands. `selection_lambda` controls how strongly the system favors high-performing branches, tuning the balance between exploration and exploitation.

### 2. Self-improvement through feedback loops

Player feedback drives the development of new games. By analyzing choices and preferences, autogamestudio identifies which features are most enjoyable and uses that signal to generate the next generation of ideas — creating a continuous improvement loop grounded in real player behavior.

### 3. Soft-verifiability

Unlike ML research, game enjoyability has no single ground-truth metric. autogamestudio sidesteps this by optimizing for *player choice* directly, using ELO ratings as a proxy.




## Star History

<a href="https://www.star-history.com/?repos=Centipede5%2Fautogamestudio&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Centipede5/autogamestudio&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Centipede5/autogamestudio&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Centipede5/autogamestudio&type=date&legend=top-left" />
 </picture>
</a>

## License

MIT