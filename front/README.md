# BNP Tennis Game

A retro-style tennis game built with JavaScript and Vite.js, featuring the classic Pong gameplay with modern enhancements.

## Features

### Core Gameplay
- **Canvas-based game** (800x400 pixels)
- **Two paddles**:
  - Left paddle: "Copilot" (AI-controlled, tracks the ball)
  - Right paddle: "Player" (controlled with ↑/↓ arrow keys)
- **Physics-based ball movement** with bouncing off walls and paddles
- **Scoring system** with real-time score display
- **Ball reset** to center after each point

### Visual Design
- **BNP green theme** (#00A550)
- **Custom PNG assets** for paddles, ball, and court
- **Retro/pixel art aesthetic** with modern Pong vibes
- **Responsive layout** for desktop
- **Monospace font** for authentic retro feel

### Bonus Features
- **Retro beep sound effects** on ball bounces and scoring
- **Custom player names** (prompt-based)
- **Pixel-perfect rendering** for crisp graphics
- **Speed progression** - ball gets faster with each paddle hit
- **AI difficulty** - Copilot has realistic movement with slight delays

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## How to Play

1. **Controls**: Use the ↑ and ↓ arrow keys to move your paddle
2. **Objective**: Hit the ball past Copilot's paddle to score points
3. **Scoring**: First to reach your target score wins!
4. **Customization**: Click "Change Player Name" to personalize your experience

## Game Mechanics

- **Ball Physics**: The ball bounces off top/bottom walls and paddles
- **Speed Increase**: Ball speed increases slightly with each paddle hit (capped at maximum)
- **AI Behavior**: Copilot tracks the ball vertically with realistic response delays
- **Hit Zones**: Ball trajectory changes based on where it hits the paddle
- **Sound Effects**: Different beep frequencies for different events

## Technical Details

- Built with **Vite.js** for fast development and building
- Uses **HTML5 Canvas** for game rendering
- **Web Audio API** for retro sound effects
- **ES6+ JavaScript** with modern features
- **Responsive CSS** with retro styling
- **Asset loading** with fallback rectangles

## File Structure

```
bnpp-coding-game/
├── assets/
│   ├── ball.png
│   ├── copilot.png
│   ├── court.png
│   └── player.png
├── index.html
├── main.js
├── style.css
├── vite.config.js
├── package.json
└── README.md
```

## Customization

### Adding New Assets
Place new PNG files in the `assets/` directory and update the image loading in `main.js`.

### Modifying Game Physics
Adjust ball speed, paddle speed, and other physics constants in the `TennisGame` constructor.

### Styling Changes
Modify `style.css` to change colors, fonts, or layout. The BNP green theme uses `#00A550`.

## Browser Compatibility

- Modern browsers with Canvas and Web Audio API support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers (responsive design)

## License

This project is for demonstration purposes.
