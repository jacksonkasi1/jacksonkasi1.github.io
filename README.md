# 8-BitHub: Retro Gaming in Your GitHub README

> Embed these playable 8-bit style mini-games directly in any GitHub README.md!

## How to Embed

For clean embedding that shows only the game, use this iframe pointing to embed.html:

```html
<iframe 
  src="https://jacksonkasi1.github.io/embed.html" 
  width="320" 
  height="240" 
  frameborder="0">
</iframe>
```

## Game Selection

To launch a specific game automatically, add a hash to the URL:

```html
<!-- Arcade Game -->
<iframe src="https://jacksonkasi1.github.io/embed.html#arcade" width="320" height="240" frameborder="0"></iframe>

<!-- Text Adventure -->
<iframe src="https://jacksonkasi1.github.io/embed.html#adventure" width="320" height="240" frameborder="0"></iframe>

<!-- Demo Scene -->
<iframe src="https://jacksonkasi1.github.io/embed.html#demo" width="320" height="240" frameborder="0"></iframe>
```

## Available Games

- **Arcade Game**: Space-invaders style shooter (arrow keys to move, space to shoot)
- **Text Adventure**: Classic text adventure game (type commands like LOOK, GO N/S/E/W, TAKE [item])
- **Demo Scene**: Visual demo with retro effects

## Setup for Hosting

1. Fork this repository
2. Rename the repository to YOUR-USERNAME.github.io
3. The site will automatically be published to https://YOUR-USERNAME.github.io/
4. Update the URLs in your embed code to point to your GitHub Pages URL

## Full vs. Embed Version

- Use `index.html` for the full experience with game selection UI
- Use `embed.html` for clean embedding in READMEs (just the game)

---

Made with 💾 and nostalgia | [MIT License](LICENSE)