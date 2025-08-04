// Game state and configuration
class TennisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 600;
        this.height = 800;
        
        // Game state
        this.gameRunning = false;
        this.gameStarted = false;
        this.isPaused = false;
        this.playerName = 'Player';
        this.currentDifficulty = 'beginner';
        
        // Difficulty configurations
        this.difficultySettings = {
            beginner: {
                ballSpeed: { x: 2, y: 1.5 },
                ballMaxSpeed: 4,
                ballSpeedIncrease: 1.01,
                aiSpeed: 2,
                aiReaction: 0.5,
                aiDeadZone: 30,
                paddleYVariation: 4
            },
            advanced: {
                ballSpeed: { x: 3, y: 2.5 },
                ballMaxSpeed: 6,
                ballSpeedIncrease: 1.03,
                aiSpeed: 3,
                aiReaction: 0.7,
                aiDeadZone: 20,
                paddleYVariation: 6
            },
            expert: {
                ballSpeed: { x: 4.5, y: 3.5 },
                ballMaxSpeed: 8,
                ballSpeedIncrease: 1.05,
                aiSpeed: 4.5,
                aiReaction: 0.9,
                aiDeadZone: 10,
                paddleYVariation: 8
            }
        };
        
        // Score
        this.copilotScore = 0;
        this.playerScore = 0;
        this.winningScore = 5;
        this.gameEnded = false;
        this.winner = null;
        
        // Animation properties
        this.animationState = 'none'; // 'victory', 'defeat', 'none'
        this.animationFrame = 0;
        this.animationDuration = 180; // 3 seconds at 60fps
        this.confetti = [];
        this.fadeOpacity = 1;
        
        // Images
        this.images = {};
        this.imagesLoaded = 0;
        this.totalImages = 3;
        
        // Audio
        this.audio = {};
        this.audioLoaded = 0;
        this.totalAudio = 1;
        this.isMuted = false;
        this.volume = 0.7; // Default volume (0.0 to 1.0)
        
        // Game objects (will be updated based on difficulty)
        // Top-down view: Copilot at top, Player at bottom
        this.paddle1 = { x: this.width / 2 - 40, y: 20, width: 80, height: 15, speed: 2 }; // Copilot (top)
        this.paddle2 = { x: this.width / 2 - 40, y: this.height - 35, width: 80, height: 15, speed: 5 }; // Player (bottom)
        
        // Player sprite (attached to paddle2)
        this.playerSprite = {
            width: 40,
            height: 60,
            offsetY: 5, // Offset below paddle
            offsetX: 0, // Additional horizontal offset for border movement
            x: this.width / 2 - 20, // Will be updated to follow paddle
            y: this.height - 35 + 15 + 5 // Initial position below paddle
        };
        this.ball = { 
            x: this.width / 2, 
            y: this.height / 2, 
            width: 20,
            height: 20,
            speedX: 3, // Simple horizontal speed
            speedY: 3, // Simple vertical speed
            maxSpeed: 8
        };
        
        // Physics and 3D constants
        this.netHeight = 30; // Visual net height
        this.netPosition = this.height / 2; // Net Y position
        this.groundLevel = 0; // Ground Z level
        this.maxBallHeight = 150; // Increased for higher arcs
        
        // Tennis court boundaries (playable area) - Match visual court boundaries
        this.courtBounds = {
            left: 80, // Left sideline - match green court boundary
            right: this.width - 80, // Right sideline - match green court boundary  
            top: 50, // Top baseline - match green court boundary
            bottom: this.height - 50 // Bottom baseline - match green court boundary
        };
        
        // Input handling
        this.keys = {};
        
        this.init();
    }
    
    async init() {
        await this.loadImages();
        await this.loadAudio();
        this.setupEventListeners();
        // this.askPlayerName(); // Re-enable when needed
        this.applyDifficultySettings(); // Apply initial difficulty
        this.resetGame();
        this.updateButtonStates();
        this.gameLoop();
    }
    
    async loadImages() {
        const imageFiles = {
            court: './assets/court3.png',
            ball: './assets/ball.png',
            playerBack: './assets/player_back.png'
        };
        
        const loadPromises = Object.entries(imageFiles).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    this.imagesLoaded++;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load image: ${src}`);
                    // Create a colored rectangle as fallback
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = key === 'playerBack' ? 40 : 20;
                    canvas.height = key === 'playerBack' ? 60 : 20;
                    ctx.fillStyle = key === 'ball' ? '#ffff00' : key === 'playerBack' ? '#ff0000' : '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    this.images[key] = canvas;
                    this.imagesLoaded++;
                    resolve();
                };
                img.src = src;
            });
        });
        
        await Promise.all(loadPromises);
    }
    
    async loadAudio() {
        const audioFiles = {
            ballHit: './assets/ball-hit.mp3'
        };
        
        const loadPromises = Object.entries(audioFiles).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.preload = 'auto';
                audio.volume = this.volume;
                
                audio.oncanplaythrough = () => {
                    this.audio[key] = audio;
                    this.audioLoaded++;
                    resolve();
                };
                
                audio.onerror = () => {
                    console.warn(`Failed to load audio: ${src}`);
                    // Create a silent fallback
                    this.audio[key] = null;
                    this.audioLoaded++;
                    resolve();
                };
                
                audio.src = src;
            });
        });
        
        await Promise.all(loadPromises);
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Prevent default behavior for arrow keys and spacebar
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || 
                e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault(); // Prevent page scroll and other default behaviors
            }
            
            // Spacebar to start/pause game
            if (e.code === 'Space') {
                this.handleGameToggle();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Mouse click on canvas to start/pause game
        this.canvas.addEventListener('click', (e) => {
            this.handleGameToggle();
        });
        
        // Add visual feedback for canvas interactions
        this.canvas.addEventListener('mouseenter', () => {
            this.canvas.style.cursor = 'pointer';
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.canvas.style.cursor = 'default';
        });
        
        // Difficulty selector
        document.getElementById('difficultySelect').addEventListener('change', (e) => {
            this.changeDifficulty(e.target.value);
        });
        
        // Buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('playerNameBtn').addEventListener('click', () => {
            this.askPlayerName();
        });
        
        document.getElementById('muteBtn').addEventListener('click', () => {
            this.toggleMute();
        });
    }
    
    askPlayerName() {
        const name = prompt('Enter your name:', this.playerName);
        if (name && name.trim()) {
            this.playerName = name.trim();
            this.updateScoreDisplay();
        }
    }
    
    toggleMute() {
        this.isMuted = !this.isMuted;
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.textContent = this.isMuted ? '🔇' : '🔊';
        muteBtn.title = this.isMuted ? 'Unmute sound' : 'Mute sound';
        
        // Visual feedback
        if (this.isMuted) {
            muteBtn.style.background = '#e74c3c';
        } else {
            muteBtn.style.background = '';
        }
        
        // Update audio volume for all loaded sounds
        Object.values(this.audio).forEach(audio => {
            if (audio) {
                audio.volume = this.isMuted ? 0 : this.volume;
            }
        });
    }
    
    playBallHitSound() {
        if (this.isMuted || !this.audio.ballHit) return;
        
        try {
            // Reset and play the audio
            this.audio.ballHit.currentTime = 0;
            this.audio.ballHit.volume = this.volume;
            this.audio.ballHit.play().catch(e => {
                console.warn('Could not play ball hit sound:', e);
            });
        } catch (e) {
            console.warn('Error playing ball hit sound:', e);
        }
    }
    
    initConfetti() {
        this.confetti = [];
        for (let i = 0; i < 50; i++) {
            this.confetti.push({
                x: Math.random() * this.width,
                y: -10,
                speedX: (Math.random() - 0.5) * 4,
                speedY: Math.random() * 3 + 2,
                color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa726', '#ab47bc'][Math.floor(Math.random() * 5)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }
    }
    
    updateConfetti() {
        this.confetti.forEach(particle => {
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.rotation += particle.rotationSpeed;
            particle.speedY += 0.1; // gravity
        });
        
        // Remove particles that are off screen
        this.confetti = this.confetti.filter(particle => 
            particle.y < this.height + 20 && 
            particle.x > -20 && 
            particle.x < this.width + 20
        );
    }
    
    drawConfetti() {
        this.confetti.forEach(particle => {
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate(particle.rotation * Math.PI / 180);
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
            this.ctx.restore();
        });
    }
    
    handleGameToggle() {
        if (!this.gameStarted) {
            // Game hasn't started yet - start it
            this.startGame();
        } else if (this.gameStarted && !this.isPaused) {
            // Game is running - pause it
            this.togglePause();
        } else if (this.gameStarted && this.isPaused) {
            // Game is paused - resume it
            this.togglePause();
        }
    }
    
    changeDifficulty(difficulty) {
        this.currentDifficulty = difficulty;
        this.applyDifficultySettings();
        
        // Reset game if it's running to apply new settings
        if (this.gameStarted) {
            this.resetGame();
        }
        
        // Show difficulty change feedback
        this.showDifficultyMessage(difficulty);
    }
    
    applyDifficultySettings() {
        const settings = this.difficultySettings[this.currentDifficulty];
        
        // Update AI paddle speed
        this.paddle1.speed = settings.aiSpeed;
        
        // Update ball properties
        this.ball.maxSpeed = settings.ballMaxSpeed;
        
        // Reset ball to initial speed for current difficulty
        this.resetBallSpeed();
    }
    
    resetBallSpeed() {
        // Simple Pong-style ball reset
        const direction = Math.random() > 0.5 ? 1 : -1;
        this.ball.speedX = (Math.random() * 2 + 2) * direction; // Random speed between 2-4
        this.ball.speedY = (Math.random() * 2 + 2) * (Math.random() > 0.5 ? 1 : -1); // Random direction
    }
    
    // Removed complex updateBallVisualSize function - keeping it simple
    
    // Removed complex triggerBallImpact function - keeping it simple
    
    hitBallWithPaddle(paddle, isTopPaddle = false) {
        // Simple Pong-style paddle hit
        this.ball.speedY = -this.ball.speedY; // Reverse vertical direction
        
        // Add some horizontal variation based on where the ball hits the paddle
        const hitPos = (this.ball.x + this.ball.width/2 - paddle.x) / paddle.width; // 0 to 1
        this.ball.speedX += (hitPos - 0.5) * 3; // Add spin based on hit position
        
        // Limit max speed
        if (Math.abs(this.ball.speedX) > this.ball.maxSpeed) {
            this.ball.speedX = this.ball.maxSpeed * Math.sign(this.ball.speedX);
        }
        if (Math.abs(this.ball.speedY) > this.ball.maxSpeed) {
            this.ball.speedY = this.ball.maxSpeed * Math.sign(this.ball.speedY);
        }
        
        // Play tennis ball hit sound
        this.playBallHitSound();
    }
    
    // Removed complex resetBallState function - keeping it simple
    
    // Removed complex handleOutOfBounds function - keeping it simple
    
    checkWinCondition() {
        if (this.playerScore >= this.winningScore) {
            // Player wins!
            this.gameEnded = true;
            this.winner = 'player';
            this.gameRunning = false;
            this.animationState = 'victory';
            this.animationFrame = 0;
            this.initConfetti();
        } else if (this.copilotScore >= this.winningScore) {
            // Copilot wins!
            this.gameEnded = true;
            this.winner = 'copilot';
            this.gameRunning = false;
            this.animationState = 'defeat';
            this.animationFrame = 0;
        }
    }
    
    showDifficultyMessage(difficulty) {
        // Create temporary message overlay
        const canvas = this.canvas;
        const rect = canvas.getBoundingClientRect();
        
        const messageDiv = document.createElement('div');
        messageDiv.style.position = 'absolute';
        messageDiv.style.top = '50%';
        messageDiv.style.left = '50%';
        messageDiv.style.transform = 'translate(-50%, -50%)';
        messageDiv.style.background = 'rgba(0, 165, 80, 0.9)';
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '15px 25px';
        messageDiv.style.borderRadius = '10px';
        messageDiv.style.fontFamily = 'Courier New, monospace';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.fontSize = '1.2rem';
        messageDiv.style.zIndex = '1000';
        messageDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        messageDiv.textContent = `Difficulty set to: ${difficulty.toUpperCase()}`;
        
        canvas.parentElement.style.position = 'relative';
        canvas.parentElement.appendChild(messageDiv);
        
        // Remove message after 2 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.parentElement.removeChild(messageDiv);
            }
        }, 2000);
    }
    
    startGame() {
        this.gameStarted = true;
        this.gameRunning = true;
        this.isPaused = false;
        this.updateButtonStates();
    }
    
    togglePause() {
        if (!this.gameStarted) return;
        
        this.isPaused = !this.isPaused;
        this.gameRunning = !this.isPaused;
        this.updateButtonStates();
    }
    
    updateButtonStates() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const newGameBtn = document.getElementById('newGameBtn');
        
        if (!this.gameStarted) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Game';
            pauseBtn.disabled = true;
            pauseBtn.textContent = 'Pause';
            pauseBtn.classList.remove('paused');
        } else if (this.isPaused) {
            startBtn.disabled = true;
            startBtn.textContent = 'Game Started';
            pauseBtn.disabled = false;
            pauseBtn.textContent = 'Resume';
            pauseBtn.classList.add('paused');
        } else {
            startBtn.disabled = true;
            startBtn.textContent = 'Game Running';
            pauseBtn.disabled = false;
            pauseBtn.textContent = 'Pause';
            pauseBtn.classList.remove('paused');
        }
    }
    
    resetGame() {
        // Reset ball position and properties
        this.ball.x = this.width / 2 - this.ball.width / 2;
        this.ball.y = this.height / 2 - this.ball.height / 2;
        
        // Reset ball speed
        this.resetBallSpeed();
        
        // Reset paddle positions
        this.paddle1.x = this.width / 2 - this.paddle1.width / 2; // Copilot centered at top
        this.paddle2.x = this.width / 2 - this.paddle2.width / 2; // Player centered at bottom
        
        // Reset player sprite position
        this.updatePlayerSpritePosition();
        
        // Reset scores and win conditions
        this.copilotScore = 0;
        this.playerScore = 0;
        this.gameEnded = false;
        this.winner = null;
        this.animationState = 'none';
        this.animationFrame = 0;
        this.fadeOpacity = 1;
        this.confetti = [];
        
        // Apply current difficulty settings
        this.applyDifficultySettings();
        
        this.gameRunning = false;
        this.gameStarted = false;
        this.isPaused = false;
        this.updateButtonStates();
        this.updateScoreDisplay();
    }
    
    update() {
        // Update animations even when game is not running
        if (this.animationState === 'victory') {
            this.updateConfetti();
            this.animationFrame++;
            if (this.animationFrame >= this.animationDuration) {
                this.animationState = 'none';
            }
        } else if (this.animationState === 'defeat') {
            this.animationFrame++;
            // Fade effect for defeat
            this.fadeOpacity = Math.max(0.3, 1 - (this.animationFrame / this.animationDuration) * 0.7);
            if (this.animationFrame >= this.animationDuration) {
                this.animationState = 'none';
                this.fadeOpacity = 1;
            }
        }
        
        if (!this.gameRunning) return;
        
        // Player paddle controls (bottom paddle - horizontal and vertical movement)
        // Constrain paddle to court boundaries
        const courtLeft = this.courtBounds.left;
        const courtRight = this.courtBounds.right - this.paddle2.width;
        const courtTop = this.netPosition + 10; // Stay below net
        const courtBottom = this.courtBounds.bottom - this.paddle2.height;
        
        if (this.keys['ArrowLeft'] && this.paddle2.x > courtLeft) {
            this.paddle2.x -= this.paddle2.speed;
        }
        if (this.keys['ArrowRight'] && this.paddle2.x < courtRight) {
            this.paddle2.x += this.paddle2.speed;
        }
        if (this.keys['ArrowUp'] && this.paddle2.y > courtTop) {
            this.paddle2.y -= this.paddle2.speed;
        }
        if (this.keys['ArrowDown'] && this.paddle2.y < courtBottom) {
            this.paddle2.y += this.paddle2.speed;
        }
        
        // Update player sprite position to follow paddle
        this.updatePlayerSpritePosition();
        
        // AI paddle (Copilot) - horizontal movement following ball
        const settings = this.difficultySettings[this.currentDifficulty];
        const paddle1Center = this.paddle1.x + this.paddle1.width / 2;
        const ballCenter = this.ball.x + this.ball.width / 2;
        const diff = ballCenter - paddle1Center;
        
        if (Math.abs(diff) > settings.aiDeadZone) {
            if (diff > 0 && this.paddle1.x < this.width - this.paddle1.width) {
                this.paddle1.x += this.paddle1.speed * settings.aiReaction;
            } else if (diff < 0 && this.paddle1.x > 0) {
                this.paddle1.x -= this.paddle1.speed * settings.aiReaction;
            }
        }
        
        // Simple Pong-style Ball Physics
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;
        
        // Ball collision with top and bottom walls (canvas boundaries)
        if (this.ball.y <= 0) {
            // Ball hit top wall - Copilot missed, Player scores
            this.playerScore++;
            this.updateScoreDisplay();
            this.checkWinCondition();
            
            if (!this.gameEnded) {
                this.ball.x = this.width / 2;
                this.ball.y = this.height / 2;
                this.resetBallSpeed();
            }
        } else if (this.ball.y >= this.height - this.ball.height) {
            // Ball hit bottom wall - Player missed, Copilot scores
            this.copilotScore++;
            this.updateScoreDisplay();
            this.checkWinCondition();
            
            if (!this.gameEnded) {
                this.ball.x = this.width / 2;
                this.ball.y = this.height / 2;
                this.resetBallSpeed();
            }
        }
        
        // Ball collision with left and right walls
        if (this.ball.x <= 0 || this.ball.x >= this.width - this.ball.width) {
            this.ball.speedX = -this.ball.speedX;
            this.ball.x = Math.max(0, Math.min(this.width - this.ball.width, this.ball.x));
        }
        
        // Simple Paddle collision detection
        const ballRect = {
            x: this.ball.x,
            y: this.ball.y,
            width: this.ball.width,
            height: this.ball.height
        };
        
        // Check collision with top paddle (Copilot)
        if (this.checkCollision(ballRect, this.paddle1)) {
            this.hitBallWithPaddle(this.paddle1, true);
        } 
        // Check collision with bottom paddle (Player)  
        else if (this.checkCollision(ballRect, this.paddle2)) {
            this.hitBallWithPaddle(this.paddle2, false);
        }
    }
    
    updatePlayerSpritePosition() {
        // Center the player sprite on the paddle horizontally
        this.playerSprite.x = this.paddle2.x + (this.paddle2.width - this.playerSprite.width) / 2 + this.playerSprite.offsetX;
        // Position the player sprite below the paddle
        this.playerSprite.y = this.paddle2.y + this.paddle2.height + this.playerSprite.offsetY;
        
        // Allow sprite to extend beyond canvas bounds - calculate additional offset based on paddle position
        const paddleDistanceFromCourt = {
            left: Math.max(0, this.courtBounds.left - this.paddle2.x),
            right: Math.max(0, this.paddle2.x + this.paddle2.width - this.courtBounds.right),
            bottom: Math.max(0, this.paddle2.y + this.paddle2.height - this.courtBounds.bottom)
        };
        
        // Allow sprite to move into border areas
        if (paddleDistanceFromCourt.left > 0) {
            this.playerSprite.x -= paddleDistanceFromCourt.left * 0.5; // Sprite extends further left
        }
        if (paddleDistanceFromCourt.right > 0) {
            this.playerSprite.x += paddleDistanceFromCourt.right * 0.5; // Sprite extends further right
        }
        if (paddleDistanceFromCourt.bottom > 0) {
            this.playerSprite.y += paddleDistanceFromCourt.bottom * 0.3; // Sprite extends further down
        }
        
        // No canvas boundary constraints for sprite - allow it to go beyond canvas
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    draw() {
        // Clear canvas with BNP green background
        this.ctx.fillStyle = '#00A550';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Apply fade effect for defeat animation
        if (this.animationState === 'defeat') {
            this.ctx.globalAlpha = this.fadeOpacity;
        }
        
        // Draw court background if available
        if (this.images.court) {
            this.ctx.drawImage(this.images.court, 0, 0, this.width, this.height);
        } else {
            // Fallback: draw court lines for top-down view
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([10, 10]);
            this.ctx.beginPath();
            // Horizontal center line (net)
            this.ctx.moveTo(0, this.height / 2);
            this.ctx.lineTo(this.width, this.height / 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // Draw court boundaries (playable area) - REMOVED
        // this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        // this.ctx.lineWidth = 3;
        // this.ctx.setLineDash([]);
        // this.ctx.strokeRect(this.courtBounds.left, this.courtBounds.top, 
        //                    this.courtBounds.right - this.courtBounds.left, 
        //                    this.courtBounds.bottom - this.courtBounds.top);
        
        // Draw paddles as colored bars (top-down view)
        // Copilot paddle (top) - Blue
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(this.paddle1.x, this.paddle1.y, this.paddle1.width, this.paddle1.height);
        
        // Player paddle (bottom) - Green
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(this.paddle2.x, this.paddle2.y, this.paddle2.width, this.paddle2.height);
        
        // Draw simple 2D ball
        if (this.images.ball) {
            this.ctx.drawImage(this.images.ball, this.ball.x, this.ball.y, this.ball.width, this.ball.height);
        } else {
            // Fallback: simple yellow circle
            const centerX = this.ball.x + this.ball.width / 2;
            const centerY = this.ball.y + this.ball.height / 2;
            
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, this.ball.width / 2, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Add a white highlight
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(centerX - 3, centerY - 3, 3, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        
        // Draw net (visual only - horizontal line with some 3D effect)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(0, this.netPosition - 2, this.width, 4);
        
        // Net posts
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.9)';
        this.ctx.fillRect(-5, this.netPosition - this.netHeight, 10, this.netHeight + 4);
        this.ctx.fillRect(this.width - 5, this.netPosition - this.netHeight, 10, this.netHeight + 4);
        
        // Draw player sprite LAST (in the foreground - z-index: 1000 equivalent)
        // Allow sprite to be drawn even if it extends beyond canvas bounds
        this.ctx.save(); // Save current clipping state
        
        if (this.images.playerBack) {
            this.ctx.drawImage(
                this.images.playerBack,
                this.playerSprite.x,
                this.playerSprite.y,
                this.playerSprite.width,
                this.playerSprite.height
            );
        } else {
            // Fallback: draw a large bright colored rectangle to show where player should be
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(this.playerSprite.x, this.playerSprite.y, this.playerSprite.width, this.playerSprite.height);
            
            // Add a border to make it even more visible
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.playerSprite.x, this.playerSprite.y, this.playerSprite.width, this.playerSprite.height);
        }
        
        this.ctx.restore(); // Restore clipping state
        
        // Reset alpha for overlays
        this.ctx.globalAlpha = 1;
        
        // Draw confetti for victory animation
        if (this.animationState === 'victory') {
            this.drawConfetti();
        }
        
        // Draw game state overlays
        if (this.gameEnded) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            if (this.winner === 'player') {
                // Victory animation
                const flashIntensity = Math.sin(this.animationFrame * 0.3) * 0.3 + 0.7;
                this.ctx.fillStyle = `rgba(255, 215, 0, ${flashIntensity})`;
                this.ctx.font = 'bold 64px Courier New';
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = '#000';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText('🎉 YOU WIN! 🎉', this.width / 2, this.height / 2 - 30);
                this.ctx.fillText('🎉 YOU WIN! 🎉', this.width / 2, this.height / 2 - 30);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '24px Courier New';
                this.ctx.fillText(`Final Score: ${this.playerName} ${this.playerScore} - ${this.copilotScore} Copilot`, this.width / 2, this.height / 2 + 30);
                this.ctx.fillText('Click New Game to play again!', this.width / 2, this.height / 2 + 70);
            } else {
                // Defeat animation
                this.ctx.fillStyle = '#ff6b6b';
                this.ctx.font = 'bold 48px Courier New';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('😔 GAME OVER 😔', this.width / 2, this.height / 2 - 30);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '24px Courier New';
                this.ctx.fillText(`Final Score: Copilot ${this.copilotScore} - ${this.playerScore} ${this.playerName}`, this.width / 2, this.height / 2 + 20);
                this.ctx.fillText('Better luck next time!', this.width / 2, this.height / 2 + 50);
                this.ctx.fillText('Click New Game to try again!', this.width / 2, this.height / 2 + 80);
            }
        } else if (!this.gameStarted) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PRESS START', this.width / 2, this.height / 2 - 40);
            
            this.ctx.font = '20px Courier New';
            this.ctx.fillText('Click here, press SPACEBAR, or use Start button', this.width / 2, this.height / 2 - 10);
            
            this.ctx.font = 'bold 24px Courier New';
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText(`🏆 First to ${this.winningScore} points wins! 🏆`, this.width / 2, this.height / 2 + 30);
        } else if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 48px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.width / 2, this.height / 2 - 20);
            
            this.ctx.font = '20px Courier New';
            this.ctx.fillText('Click here, press SPACEBAR, or use Resume button', this.width / 2, this.height / 2 + 30);
        }
    }
    
    updateScoreDisplay() {
        document.getElementById('copilot-score').textContent = `Copilot: ${this.copilotScore}`;
        document.getElementById('player-score').textContent = `${this.playerName}: ${this.playerScore}`;
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TennisGame();
});
