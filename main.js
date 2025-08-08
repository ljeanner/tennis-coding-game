// Game state and configuration
class TennisGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // iOS Safari compatibility - use even smaller canvas dimensions
        this.isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isIOSSafari) {
            // Very small iOS Safari safe canvas dimensions
            this.width = 320;
            this.height = 480;
        } else if (this.isMobile) {
            // Small mobile dimensions for other mobile devices
            this.width = 400;
            this.height = 600;
        } else {
            // Desktop - use larger canvas
            this.width = 600;
            this.height = 800;
        }
        
        // Force apply canvas dimensions immediately
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        
        // Ensure canvas visibility
        this.canvas.style.display = 'block';
        this.canvas.style.visibility = 'visible';
        this.canvas.style.opacity = '1';
        
        this.canvasReady = true;
        
        // Game state
        this.gameRunning = false;
        this.gameStarted = false;
        this.isPaused = false;
        this.playerName = 'Player';
        this.currentDifficulty = 'beginner';
        
        // Touch control state
        this.touchActive = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        
        // Difficulty configurations
        this.difficultySettings = {
            beginner: {
                ballSpeed: { x: 1, y: 0.8 },        // Much slower for beginners
                ballMaxSpeed: 2.5,                  // Reduced max speed
                ballSpeedIncrease: 1.005,           // Very gradual speed increase
                aiSpeed: 2,
                aiReaction: 0.5,
                aiDeadZone: 30,
                paddleYVariation: 4,
                // Enhanced AI movement properties for realistic gameplay
                aiVerticalReaction: 0.3,     // Slower vertical reaction
                aiVerticalDeadZone: 40,      // Larger dead zone for Y movement
                aiSmoothingFactor: 0.15,     // Low smoothing for natural movement
                aiEasingFactor: 0.03,        // Very slow easing for human-like delays
                aiMaxDistanceFromNet: 120    // Stay 120px+ from net (conservative)
            },
            advanced: {
                ballSpeed: { x: 1.5, y: 1.2 },     // Moderate speed
                ballMaxSpeed: 3.5,                  // Moderate max speed
                ballSpeedIncrease: 1.01,            // Gradual speed increase
                aiSpeed: 3,
                aiReaction: 0.7,
                aiDeadZone: 20,
                paddleYVariation: 6,
                // Enhanced AI movement properties for realistic gameplay
                aiVerticalReaction: 0.5,
                aiVerticalDeadZone: 30,
                aiSmoothingFactor: 0.25,
                aiEasingFactor: 0.05,        // Standard easing as requested
                aiMaxDistanceFromNet: 100    // Stay 100px+ from net
            },
            expert: {
                ballSpeed: { x: 2, y: 1.8 },       // Faster but still manageable
                ballMaxSpeed: 4.5,                  // Reduced from 8 to 4.5
                ballSpeedIncrease: 1.02,            // More reasonable increase
                aiSpeed: 4.5,
                aiReaction: 0.9,
                aiDeadZone: 10,
                paddleYVariation: 8,
                // Enhanced AI movement properties for realistic gameplay
                aiVerticalReaction: 0.7,
                aiVerticalDeadZone: 20,
                aiSmoothingFactor: 0.35,
                aiEasingFactor: 0.07,        // Faster easing for expert level
                aiMaxDistanceFromNet: 80     // More aggressive positioning
            }
        };
        
        // Score
        this.copilotScore = 0;
        this.playerScore = 0;
        this.winningScore = 5;
        this.gameEnded = false;
        this.winner = null;
        
        // Point scoring delay system
        this.isScoreDelay = false;
        this.scoreDelayDuration = 1500; // 1.5 seconds delay
        this.lastScorer = null; // 'player' or 'copilot' - determines serve direction
        
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
        
        // AI paddle tracking for natural movement
        this.aiTarget = {
            x: this.width / 2 - 40, // Target X position for AI paddle
            y: 20                   // Target Y position for AI paddle
        };
        
        // Player sprite (attached to paddle2)
        this.playerSprite = {
            width: 50,
            height: 70,
            offsetY: 5, // Offset below paddle
            offsetX: 0, // Additional horizontal offset for border movement
            x: this.width / 2 - 20, // Will be updated to follow paddle
            y: this.height - 35 + 15 + 5 // Initial position below paddle
        };
        this.ball = { 
            x: this.width / 2, 
            y: this.height / 2, 
            width: 40,
            height: 40,
            speedX: 1.5, // Reduced default horizontal speed
            speedY: 1.5, // Reduced default vertical speed
            maxSpeed: 4  // Reduced default max speed
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
        
        this.startMenuEl = document.getElementById('startMenu');
		this.playerNameInput = document.getElementById('playerNameInput');
		this.menuStartBtn = document.getElementById('menuStartBtn');
		this.startMenuForm = document.getElementById('startMenuForm');
        
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
            court: '/court3.png',
            ball: '/ball.png',
            playerBack: '/player_back.png'
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
            ballHit: '/ball-hit.mp3'
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

        // Touch controls for mobile devices
        this.setupTouchControls();
        
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
        
        // Start menu interactions
		if (this.menuStartBtn && this.playerNameInput) {
			const tryStart = (e) => {
				if (e) e.preventDefault();
				this.confirmStartFromMenu();
			};
			this.menuStartBtn.addEventListener('click', tryStart);
			this.menuStartBtn.addEventListener('pointerdown', tryStart, { passive: false });
			this.menuStartBtn.addEventListener('touchstart', tryStart, { passive: false });
			this.playerNameInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					this.confirmStartFromMenu();
				}
			});
			// Global Enter fallback while menu visible
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' && this.startMenuEl && document.body.contains(this.startMenuEl)) {
					e.preventDefault();
					this.confirmStartFromMenu();
				}
			});
			// Autofocus input when overlay present (small timeout for iOS reliability)
			setTimeout(() => { this.playerNameInput.focus(); }, 50);
		}
		
		if (this.startMenuForm) {
			this.startMenuForm.addEventListener('submit', (e) => {
				e.preventDefault();
				this.confirmStartFromMenu();
			});
		}
    }
    
    setupTouchControls() {
        // Track touch state
        this.touchActive = false;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        
        // Add touch event listeners to canvas
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.touchActive = true;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            // Simple coordinate conversion
            this.lastTouchX = touch.clientX - rect.left;
            this.lastTouchY = touch.clientY - rect.top;
            
            // Start game on touch if not running
            if (!this.gameRunning && !this.isPaused) {
                this.handleGameToggle();
            }
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.touchActive) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            // Get touch position relative to canvas
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            this.lastTouchX = touchX;
            
            // Convert screen coordinates to canvas coordinates
            const canvasX = (touchX / rect.width) * this.width;
            const canvasY = (touchY / rect.height) * this.height;
            
            // Update player paddle (paddle2) - with both horizontal AND vertical movement
            if (this.paddle2) {
                // Center paddle under finger horizontally
                const newPaddleX = canvasX - (this.paddle2.width / 2);
                // Center paddle under finger vertically
                const newPaddleY = canvasY - (this.paddle2.height / 2);
                
                // Apply horizontal boundaries
                const canvasLeft = 0;
                const canvasRight = this.width - this.paddle2.width;
                this.paddle2.x = Math.max(canvasLeft, Math.min(canvasRight, newPaddleX));
                
                // Apply vertical boundaries - keep paddle in bottom half of court
                const topBoundary = this.height * 0.4; // Can't go above 40% of court height
                const bottomBoundary = this.height - this.paddle2.height - 20; // Stay 20px from bottom
                this.paddle2.y = Math.max(topBoundary, Math.min(bottomBoundary, newPaddleY));
                
                // Also update the player sprite position to follow the paddle
                this.updatePlayerSpritePosition();
            }
            
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.touchActive = false;
        }, { passive: false });
        
        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.touchActive = false;
        }, { passive: false });
        
        // Removed body-level scroll prevention so UI buttons and selects still receive clicks/taps on mobile.
        // Previously we had document.body touchstart/touchmove with preventDefault(), which blocks click synthesis.
    }
    
    askPlayerName() {
        // If menu still visible, focus input instead of prompt
        if (this.startMenuEl && document.body.contains(this.startMenuEl)) {
            if (this.playerNameInput) this.playerNameInput.focus();
            return;
        }
        
        const name = prompt('Enter your name:', this.playerName);
        if (name && name.trim()) {
            this.playerName = name.trim();
            this.updateScoreDisplay();
        }
    }

    // New: confirm start from the start menu overlay
    confirmStartFromMenu() {
        // Avoid double-starts
        if (this.gameStarted) return;

        // Read player name from input if available
        let name = this.playerNameInput && this.playerNameInput.value ? this.playerNameInput.value.trim() : '';
        if (!name) name = 'Player';
        this.playerName = name;
        this.updateScoreDisplay();

        // Hide overlay and start the game
        this.hideStartMenu();
        this.startGame();

        // Ensure keyboard input works immediately
        if (this.canvas && this.canvas.focus) {
            try { this.canvas.focus(); } catch {}
        }
    }

    // New: fade out and remove the start menu overlay so it doesn't block clicks
    hideStartMenu() {
        if (!this.startMenuEl) return;

        try {
            this.startMenuEl.classList.add('hide');
            this.startMenuEl.style.pointerEvents = 'none';
        } catch {}

        const el = this.startMenuEl;
        // Remove from DOM after transition
        setTimeout(() => {
            if (el && el.parentElement) {
                el.parentElement.removeChild(el);
            }
            this.startMenuEl = null;
        }, 420);
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
        // Tennis-style ball reset with safe diagonal trajectory
        const settings = this.difficultySettings[this.currentDifficulty];
        
        // Create safe diagonal trajectory with controlled speeds
        const horizontalDirection = Math.random() > 0.5 ? 1 : -1;
        const verticalDirection = Math.random() > 0.5 ? 1 : -1;
        
        // Set safe diagonal speeds (within -4 to +4 range for horizontal)
        this.ball.speedX = Math.max(-3, Math.min(3, 
            (settings.ballSpeed.x + Math.random() * 0.5) * horizontalDirection
        ));
        this.ball.speedY = (settings.ballSpeed.y + Math.random() * 0.5) * verticalDirection;
        
        // Ensure minimum movement for continuous gameplay
        if (Math.abs(this.ball.speedX) < 0.8) {
            this.ball.speedX = 0.8 * Math.sign(this.ball.speedX || 1);
        }
        if (Math.abs(this.ball.speedY) < 0.8) {
            this.ball.speedY = 0.8 * Math.sign(this.ball.speedY || 1);
        }
        
        // Update max speed based on difficulty
        this.ball.maxSpeed = settings.ballMaxSpeed;
    }
    
    // Removed complex updateBallVisualSize function - keeping it simple
    
    // Removed complex triggerBallImpact function - keeping it simple
    
    hitBallWithPaddle(paddle, isTopPaddle = false) {
        // Smart tennis-style paddle hit with fair trajectory calculation
        const hitPos = (this.ball.x + this.ball.width/2 - paddle.x) / paddle.width; // 0 to 1
        const settings = this.difficultySettings[this.currentDifficulty];
        
        // Get opponent paddle for position awareness
        const opponentPaddle = isTopPaddle ? this.paddle2 : this.paddle1;
        const opponentCenterX = opponentPaddle.x + opponentPaddle.width / 2;
        
        // Calculate safe target area on opponent's side
        const courtLeftSafe = this.courtBounds.left + 40; // 40px margin from sideline
        const courtRightSafe = this.courtBounds.right - 40; // 40px margin from sideline
        const safeTargetWidth = courtRightSafe - courtLeftSafe;
        
        // Calculate horizontal direction with opponent awareness
        let targetX;
        
        // Base target calculation from hit position
        const baseTargetX = courtLeftSafe + (hitPos * safeTargetWidth);
        
        // Adjust target to avoid extreme corners if opponent is already at edge
        if (opponentCenterX < this.width * 0.3) {
            // Opponent is on the left, favor center-right shots
            targetX = Math.max(baseTargetX, this.width * 0.4);
        } else if (opponentCenterX > this.width * 0.7) {
            // Opponent is on the right, favor center-left shots
            targetX = Math.min(baseTargetX, this.width * 0.6);
        } else {
            // Opponent is center, use normal targeting
            targetX = baseTargetX;
        }
        
        // Calculate trajectory to reach target
        const ballCurrentX = this.ball.x + this.ball.width / 2;
        const horizontalDistance = targetX - ballCurrentX;
        
        // Estimate trajectory time to opponent's side
        const verticalDistance = isTopPaddle ? 
            (this.netPosition + 50) - this.ball.y : // AI to player area
            this.ball.y - (this.netPosition - 50);   // Player to AI area
        
        const trajectoryTime = Math.max(20, Math.abs(verticalDistance / 2)); // Minimum 20 frames
        
        // Calculate required speeds
        let targetSpeedX = horizontalDistance / trajectoryTime;
        let targetSpeedY = isTopPaddle ? 
            Math.abs(verticalDistance / trajectoryTime) : // Positive for downward
            -Math.abs(verticalDistance / trajectoryTime);  // Negative for upward
        
        // Apply safe horizontal speed limits (-4 to +4 as requested)
        targetSpeedX = Math.max(-4, Math.min(4, targetSpeedX));
        
        // Ensure good vertical speed for proper trajectory
        const minVerticalSpeed = 1.2;
        const maxVerticalSpeed = settings.ballMaxSpeed * 0.8;
        
        if (isTopPaddle) {
            // AI paddle - ensure downward movement
            targetSpeedY = Math.max(minVerticalSpeed, Math.min(maxVerticalSpeed, Math.abs(targetSpeedY)));
        } else {
            // Player paddle - ensure upward movement
            targetSpeedY = -Math.max(minVerticalSpeed, Math.min(maxVerticalSpeed, Math.abs(targetSpeedY)));
        }
        
        // Add controlled randomness for unpredictability (smaller variation for fairness)
        const randomFactorX = (Math.random() - 0.5) * 0.8; // ±0.4 variation
        const randomFactorY = (Math.random() - 0.5) * 0.6; // ±0.3 variation
        
        targetSpeedX += randomFactorX;
        targetSpeedY += randomFactorY * (isTopPaddle ? 1 : -1);
        
        // Final safety clamps
        targetSpeedX = Math.max(-4, Math.min(4, targetSpeedX)); // Hard limit as requested
        
        if (isTopPaddle) {
            targetSpeedY = Math.max(0.8, Math.min(settings.ballMaxSpeed, targetSpeedY));
        } else {
            targetSpeedY = Math.max(-settings.ballMaxSpeed, Math.min(-0.8, targetSpeedY));
        }
        
        // Apply the calculated trajectory
        this.ball.speedX = targetSpeedX;
        this.ball.speedY = targetSpeedY;
        
        // Play tennis ball hit sound
        this.playBallHitSound();
    }
    
    // Removed complex resetBallState function - keeping it simple
    
    // Handle scoring delay and ball reset after a point
    triggerScoreDelay(scorer) {
        this.isScoreDelay = true;
        this.lastScorer = scorer;
        
        // Use setTimeout to handle the delay
        setTimeout(() => {
            this.restartAfterScore();
        }, this.scoreDelayDuration);
    }
    
    restartAfterScore() {
        if (this.gameEnded) {
            this.isScoreDelay = false;
            return;
        }
        
        // Reset ball to center
        this.ball.x = this.width / 2;
        this.ball.y = this.height / 2;
        
        // Get current difficulty settings
        const settings = this.difficultySettings[this.currentDifficulty];
        const baseSpeedX = settings.ballSpeed.x;
        const baseSpeedY = settings.ballSpeed.y;
        
        // Serve ball in a safe diagonal trajectory towards the opponent
        // Use controlled horizontal speed within safe range
        const safeHorizontalSpeed = Math.max(-3, Math.min(3, 
            (baseSpeedX + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1)
        ));
        
        if (this.lastScorer === 'player') {
            // Player scored, serve towards copilot (upward diagonal)
            this.ball.speedX = safeHorizontalSpeed;
            this.ball.speedY = -(baseSpeedY + Math.random() * 0.5); // Negative = upward
        } else {
            // Copilot scored, serve towards player (downward diagonal)
            this.ball.speedX = safeHorizontalSpeed;
            this.ball.speedY = baseSpeedY + Math.random() * 0.5; // Positive = downward
        }
        
        // Ensure minimum diagonal movement
        if (Math.abs(this.ball.speedX) < 0.8) {
            this.ball.speedX = 0.8 * Math.sign(this.ball.speedX);
        }
        if (Math.abs(this.ball.speedY) < 0.8) {
            this.ball.speedY = 0.8 * Math.sign(this.ball.speedY);
        }
        
        this.isScoreDelay = false;
    }
    
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
        
        // Reset AI target position
        this.aiTarget.x = this.paddle1.x;
        this.aiTarget.y = this.paddle1.y;
        
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
        
        if (!this.gameRunning || this.isScoreDelay) return;
        
        // Player paddle controls (bottom paddle - horizontal and vertical movement)
        // Allow player to move across the full canvas width, but constrain vertically to stay below net
        const canvasLeft = 0; // Allow movement to canvas edge
        const canvasRight = this.width - this.paddle2.width; // Allow movement to canvas edge
        const courtTop = this.netPosition + 10; // Stay below net
        const courtBottom = this.courtBounds.bottom - this.paddle2.height;
        
        if (this.keys['ArrowLeft'] && this.paddle2.x > canvasLeft) {
            this.paddle2.x -= this.paddle2.speed;
        }
        if (this.keys['ArrowRight'] && this.paddle2.x < canvasRight) {
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
        
        // Enhanced AI paddle (Copilot) - Realistic movement with human-like constraints
        const settings = this.difficultySettings[this.currentDifficulty];
        
        // Define AI positioning limits - stay well behind the net
        const aiMinY = this.courtBounds.top; // Top court boundary
        const aiMaxY = this.netPosition - settings.aiMaxDistanceFromNet; // Stay distance from net
        
        // Calculate target positions with ball prediction
        const ballCenterX = this.ball.x + this.ball.width / 2;
        const ballCenterY = this.ball.y + this.ball.height / 2;
        
        // Horizontal tracking with prediction (more responsive)
        let targetX = ballCenterX - this.paddle1.width / 2;
        
        // Add prediction based on ball movement for more realistic play
        if (Math.abs(this.ball.speedX) > 1) {
            const predictionFrames = 8; // Look ahead 8 frames
            const predictedBallX = this.ball.x + (this.ball.speedX * predictionFrames);
            targetX = predictedBallX - this.paddle1.width / 2;
        }
        
        // Vertical positioning - defensive strategy with constraints
        let targetY = this.aiTarget.y; // Start with current target
        
        // Only move vertically if ball is approaching and within reasonable range
        if (this.ball.speedY < 0 && ballCenterY < this.netPosition) {
            // Ball is moving toward AI side - calculate defensive position
            const optimalDefenseY = Math.max(aiMinY, ballCenterY - 60); // Stay 60px above ball
            targetY = Math.min(optimalDefenseY, aiMaxY); // Clamp to max distance from net
        } else {
            // Ball moving away or on player side - maintain conservative position
            const conservativeY = aiMinY + 40; // Stay near top of court
            targetY = conservativeY;
        }
        
        // Apply human-like easing to target positions (smooth reaction delays)
        this.aiTarget.x += (targetX - this.aiTarget.x) * settings.aiEasingFactor;
        this.aiTarget.y += (targetY - this.aiTarget.y) * settings.aiEasingFactor * 0.7; // Slower Y easing
        
        // Constrain AI target within boundaries
        this.aiTarget.x = Math.max(0, Math.min(this.width - this.paddle1.width, this.aiTarget.x));
        this.aiTarget.y = Math.max(aiMinY, Math.min(aiMaxY, this.aiTarget.y));
        
        // Move paddle toward target with human-like delays and imperfection
        const xDiff = this.aiTarget.x - this.paddle1.x;
        const yDiff = this.aiTarget.y - this.paddle1.y;
        
        // Apply movement only if difference is significant (dead zone simulation)
        if (Math.abs(xDiff) > 2) {
            this.paddle1.x += xDiff * settings.aiSmoothingFactor * settings.aiReaction;
        }
        
        if (Math.abs(yDiff) > 3) {
            this.paddle1.y += yDiff * settings.aiSmoothingFactor * settings.aiVerticalReaction * 0.8;
        }
        
        // Final boundary enforcement for paddle position
        this.paddle1.x = Math.max(0, Math.min(this.width - this.paddle1.width, this.paddle1.x));
        this.paddle1.y = Math.max(aiMinY, Math.min(aiMaxY, this.paddle1.y));
        
        // Tennis-style Ball Physics - Diagonal trajectories
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;
        
        // Check if ball goes out of bounds (scoring)
        if (this.ball.y <= -20) {
            // Ball went off top - Copilot missed, Player scores
            this.playerScore++;
            this.updateScoreDisplay();
            this.checkWinCondition();
            
            if (!this.gameEnded) {
                this.triggerScoreDelay('player');
            }
        } else if (this.ball.y >= this.height + 20) {
            // Ball went off bottom - Player missed, Copilot scores
            this.copilotScore++;
            this.updateScoreDisplay();
            this.checkWinCondition();
            
            if (!this.gameEnded) {
                this.triggerScoreDelay('copilot');
            }
        } else if (this.ball.x <= -20 || this.ball.x >= this.width + 20) {
            // Ball went off sides - Point goes to last player who hit it
            // For now, alternate scoring or use a simple rule
            if (Math.abs(this.ball.speedY) > Math.abs(this.ball.speedX)) {
                // Ball was moving more vertically, likely a missed return
                if (this.ball.y < this.height / 2) {
                    // Ball was in upper half, Copilot missed
                    this.playerScore++;
                    if (!this.gameEnded) {
                        this.triggerScoreDelay('player');
                    }
                } else {
                    // Ball was in lower half, Player missed
                    this.copilotScore++;
                    if (!this.gameEnded) {
                        this.triggerScoreDelay('copilot');
                    }
                }
                this.updateScoreDisplay();
                this.checkWinCondition();
            }
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
        
        // Keep sprite visible within canvas bounds while allowing paddle to move to edges
        const spriteMinX = 0; // Minimum X to keep sprite visible
        const spriteMaxX = this.width - this.playerSprite.width; // Maximum X to keep sprite visible
        
        // Clamp sprite position to stay within canvas bounds
        this.playerSprite.x = Math.max(spriteMinX, Math.min(spriteMaxX, this.playerSprite.x));
        
        // Allow sprite to extend beyond court bounds but stay within canvas bounds
        const paddleDistanceFromCourt = {
            left: Math.max(0, this.courtBounds.left - this.paddle2.x),
            right: Math.max(0, this.paddle2.x + this.paddle2.width - this.courtBounds.right),
            bottom: Math.max(0, this.paddle2.y + this.paddle2.height - this.courtBounds.bottom)
        };
        
        // Allow sprite to move into border areas but keep within canvas
        if (paddleDistanceFromCourt.left > 0) {
            // Paddle is beyond left court boundary - adjust sprite but keep it visible
            const leftAdjustment = paddleDistanceFromCourt.left * 0.5;
            this.playerSprite.x = Math.max(spriteMinX, this.playerSprite.x - leftAdjustment);
        }
        if (paddleDistanceFromCourt.right > 0) {
            // Paddle is beyond right court boundary - adjust sprite but keep it visible
            const rightAdjustment = paddleDistanceFromCourt.right * 0.5;
            this.playerSprite.x = Math.min(spriteMaxX, this.playerSprite.x + rightAdjustment);
        }
        if (paddleDistanceFromCourt.bottom > 0) {
            // Allow sprite to extend further down when paddle is at bottom
            this.playerSprite.y += paddleDistanceFromCourt.bottom * 0.3;
        }
        
        // Final safety check - ensure sprite stays within canvas bounds
        this.playerSprite.x = Math.max(spriteMinX, Math.min(spriteMaxX, this.playerSprite.x));
        this.playerSprite.y = Math.max(0, Math.min(this.height - this.playerSprite.height, this.playerSprite.y));
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
            this.ctx.arc(centerX - 4, centerY - 4, 4, 0, 2 * Math.PI);
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
