// Core engine for 8-BitHub
class RetroEngine {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 240;
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    this.diskSystem = new DiskSystem(this);
    this.audioEngine = new ChiptuneSynth();
    
    this.currentGame = null;
    this.fps = 60;
    this.running = false;
    
    // System palette (CGA/NES inspired)
    this.palette = [
      '#000000', '#0000AA', '#00AA00', '#00AAAA', 
      '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
      '#555555', '#5555FF', '#55FF55', '#55FFFF', 
      '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
    ];
  }
  
  // Load a game disk
  loadDisk(diskId) {
    this.running = false;
    this.diskSystem.loadDisk(diskId).then(() => {
      this.running = true;
      this.gameLoop();
    });
  }
  
  // Main game loop
  gameLoop() {
    if (!this.running) return;
    
    this.update();
    this.render();
    
    setTimeout(() => {
      requestAnimationFrame(() => this.gameLoop());
    }, 1000 / this.fps);
  }
  
  // Update game logic
  update() {
    if (this.currentGame && this.currentGame.update) {
      this.currentGame.update();
    }
  }
  
  // Render current frame
  render() {
    // Clear screen
    this.ctx.fillStyle = this.palette[0];
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render current game
    if (this.currentGame && this.currentGame.render) {
      this.currentGame.render(this.ctx, this.palette);
    }
  }
}

// Disk loading system with animations
class DiskSystem {
  constructor(engine) {
    this.engine = engine;
    this.disks = {
      'arcade': { title: 'ARCADE CLASSICS', color: '#FF5555' },
      'adventure': { title: 'TEXT ADVENTURE', color: '#55FF55' },
      'demo': { title: 'DEMO SCENE', color: '#5555FF' }
    };
  }
  
  // Load a disk with authentic loading sequence
  async loadDisk(diskId) {
    const disk = this.disks[diskId];
    if (!disk) return Promise.reject('Disk not found');
    
    // Play disk insertion sound
    this.engine.audioEngine.playSound('insert');
    
    // Show disk loading animation
    await this.showLoadingSequence(disk);
    
    // Initialize the game
    switch(diskId) {
      case 'arcade':
        this.engine.currentGame = new ArcadeGame(this.engine);
        break;
      case 'adventure':
        this.engine.currentGame = new TextAdventure(this.engine);
        break;
      case 'demo':
        this.engine.currentGame = new DemoScene(this.engine);
        break;
    }
    
    return Promise.resolve();
  }
  
  // Show authentic disk loading animation
  async showLoadingSequence(disk) {
    const ctx = this.engine.ctx;
    const width = this.engine.canvas.width;
    const height = this.engine.canvas.height;
    
    // Draw disk image
    this.drawDisk(ctx, width/2, height/2 - 40, disk.color, disk.title);
    
    // Loading text
    ctx.fillStyle = this.engine.palette[15];
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', width/2, height/2 + 50);
    
    // Progress bar
    const progressWidth = 160;
    const progressHeight = 8;
    const progressX = (width - progressWidth) / 2;
    const progressY = height/2 + 60;
    
    ctx.strokeStyle = this.engine.palette[15];
    ctx.strokeRect(progressX, progressY, progressWidth, progressHeight);
    
    // Simulate loading
    return new Promise(resolve => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 5;
        if (progress >= 100) {
          clearInterval(interval);
          
          // Loading complete sound
          this.engine.audioEngine.playSound('ready');
          
          setTimeout(resolve, 500);
        }
        
        // Update progress bar
        const fillWidth = (progress / 100) * progressWidth;
        ctx.fillStyle = disk.color;
        ctx.fillRect(progressX, progressY, fillWidth, progressHeight);
        
        // Add loading noise
        this.drawLoadingNoise(ctx, width, height);
        
        // Loading bytes text
        ctx.fillStyle = this.engine.palette[15];
        ctx.fillText(`LOADING BYTES: ${Math.floor(progress * 640)}`, width/2, height/2 + 80);
        
      }, 200);
    });
  }
  
  // Draw a floppy disk
  drawDisk(ctx, x, y, color, title) {
    // Draw disk body
    ctx.fillStyle = '#111111';
    ctx.fillRect(x - 40, y - 40, 80, 80);
    
    // Draw disk label
    ctx.fillStyle = color;
    ctx.fillRect(x - 35, y - 35, 70, 25);
    
    // Draw disk title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x, y - 22);
    
    // Draw disk metal slider
    ctx.fillStyle = '#DDDDDD';
    ctx.fillRect(x - 25, y + 20, 50, 15);
    
    // Draw disk center hole
    ctx.fillStyle = '#444444';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw write-protect notch
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 35, y, 10, 15);
  }
  
  // Add loading noise effect to screen
  drawLoadingNoise(ctx, width, height) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 3 + 1;
      ctx.fillRect(x, y, size, 1);
    }
  }
}

// 8-bit sound synthesis
class ChiptuneSynth {
  constructor() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.sounds = {};
    
    // Create common sounds
    this.createSound('insert', [
      { type: 'square', freq: 220, duration: 100 },
      { type: 'square', freq: 440, duration: 200 }
    ]);
    
    this.createSound('ready', [
      { type: 'square', freq: 660, duration: 100 },
      { type: 'square', freq: 880, duration: 100 },
      { type: 'square', freq: 1100, duration: 200 }
    ]);
    
    this.createSound('shoot', [
      { type: 'square', freq: 880, duration: 50 }
    ]);
  }
  
  // Create a sound from oscillator patterns
  createSound(name, patterns) {
    this.sounds[name] = patterns;
  }
  
  // Play a predefined sound
  playSound(name) {
    const patterns = this.sounds[name];
    if (!patterns) return;
    
    let time = this.audioCtx.currentTime;
    
    patterns.forEach(pattern => {
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      
      oscillator.type = pattern.type;
      oscillator.frequency.value = pattern.freq;
      
      gainNode.gain.value = 0.2;
      gainNode.gain.setValueAtTime(0.2, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + pattern.duration / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      oscillator.start(time);
      oscillator.stop(time + pattern.duration / 1000);
      
      time += pattern.duration / 1000;
    });
  }
}

// Example arcade game implementation
class ArcadeGame {
  constructor(engine) {
    this.engine = engine;
    this.playerX = 160;
    this.playerY = 200;
    this.bullets = [];
    this.enemies = [];
    this.score = 0;
    
    // Create initial enemies
    for (let i = 0; i < 10; i++) {
      this.enemies.push({
        x: 30 + i * 25,
        y: 50,
        direction: 1,
        frame: 0
      });
    }
    
    // Set up input handling
    document.addEventListener('keydown', (e) => this.handleInput(e));
  }
  
  update() {
    // Move player
    if (this.leftPressed) this.playerX = Math.max(10, this.playerX - 3);
    if (this.rightPressed) this.playerX = Math.min(310, this.playerX + 3);
    
    // Update bullets
    this.bullets.forEach(bullet => {
      bullet.y -= 5;
    });
    this.bullets = this.bullets.filter(bullet => bullet.y > 0);
    
    // Update enemies
    let changeDirection = false;
    this.enemies.forEach(enemy => {
      enemy.x += enemy.direction;
      enemy.frame = (enemy.frame + 1) % 30;
      
      if (enemy.x <= 10 || enemy.x >= 310) {
        changeDirection = true;
      }
    });
    
    if (changeDirection) {
      this.enemies.forEach(enemy => {
        enemy.direction *= -1;
        enemy.y += 10;
      });
    }
    
    // Check collisions
    this.checkCollisions();
  }
  
  render(ctx, palette) {
    // Draw player
    ctx.fillStyle = palette[11]; // Cyan
    ctx.fillRect(this.playerX - 10, this.playerY, 20, 10);
    ctx.fillRect(this.playerX - 5, this.playerY - 5, 10, 5);
    
    // Draw bullets
    ctx.fillStyle = palette[14]; // Yellow
    this.bullets.forEach(bullet => {
      ctx.fillRect(bullet.x - 1, bullet.y, 2, 5);
    });
    
    // Draw enemies
    this.enemies.forEach(enemy => {
      ctx.fillStyle = enemy.frame < 15 ? palette[12] : palette[13]; // Red/Magenta
      ctx.fillRect(enemy.x - 8, enemy.y, 16, 8);
      ctx.fillRect(enemy.x - 10, enemy.y + 2, 20, 4);
    });
    
    // Draw score
    ctx.fillStyle = palette[15]; // White
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 10, 20);
  }
  
  handleInput(e) {
    if (e.key === 'ArrowLeft') {
      this.leftPressed = true;
    } else if (e.key === 'ArrowRight') {
      this.rightPressed = true;
    } else if (e.key === ' ') {
      this.bullets.push({
        x: this.playerX,
        y: this.playerY - 5
      });
      this.engine.audioEngine.playSound('shoot');
    }
    
    document.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft') {
        this.leftPressed = false;
      } else if (e.key === 'ArrowRight') {
        this.rightPressed = false;
      }
    });
  }
  
  checkCollisions() {
    // Check bullet-enemy collisions
    this.bullets.forEach(bullet => {
      this.enemies = this.enemies.filter(enemy => {
        if (Math.abs(bullet.x - enemy.x) < 8 && Math.abs(bullet.y - enemy.y) < 8) {
          this.score += 10;
          return false;
        }
        return true;
      });
    });
  }
}

// Text adventure game implementation
class TextAdventure {
  constructor(engine) {
    this.engine = engine;
    this.currentRoom = 'start';
    this.inventory = [];
    this.textBuffer = ['WELCOME TO THE HAUNTED HOUSE', '', 'YOU ARE STANDING OUTSIDE AN OLD MANSION.'];
    this.inputText = '';
    this.cursorBlink = false;
    
    // Set up input handling
    document.addEventListener('keydown', (e) => this.handleInput(e));
    
    // Blink cursor
    setInterval(() => {
      this.cursorBlink = !this.cursorBlink;
    }, 500);
    
    // Define rooms
    this.rooms = {
      'start': {
        desc: 'YOU ARE OUTSIDE THE MANSION. THE DOOR IS LOCKED.',
        exits: {
          'N': 'hallway',
        },
        requires: {
          'N': 'key'
        }
      },
      'hallway': {
        desc: 'YOU ARE IN A DUSTY HALLWAY. DOORS LEAD EAST AND WEST.',
        exits: {
          'E': 'library',
          'W': 'kitchen',
          'S': 'start'
        }
      },
      'kitchen': {
        desc: 'THE KITCHEN IS DIRTY. THERE IS A RUSTY KEY ON THE TABLE.',
        exits: {
          'E': 'hallway'
        },
        items: ['key']
      },
      'library': {
        desc: 'BOOKS LINE THE WALLS. A GHOST APPEARS!',
        exits: {
          'W': 'hallway'
        }
      }
    };
  }
  
  update() {
    // Game logic updates
  }
  
  render(ctx, palette) {
    // Draw text adventure interface
    ctx.fillStyle = palette[1]; // Dark blue background
    ctx.fillRect(0, 0, 320, 240);
    
    // Draw text
    ctx.fillStyle = palette[15]; // White text
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    
    for (let i = 0; i < this.textBuffer.length; i++) {
      ctx.fillText(this.textBuffer[i], 10, 20 + i * 15);
    }
    
    // Draw input line
    ctx.fillText('> ' + this.inputText + (this.cursorBlink ? '_' : ''), 10, 220);
  }
  
  handleInput(e) {
    if (e.key === 'Enter') {
      this.processCommand(this.inputText);
      this.inputText = '';
    } else if (e.key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1);
    } else if (e.key.length === 1) {
      this.inputText += e.key.toUpperCase();
    }
  }
  
  processCommand(cmd) {
    this.textBuffer.push('> ' + cmd);
    
    const words = cmd.split(' ');
    const verb = words[0];
    const noun = words[1] || '';
    
    switch(verb) {
      case 'GO':
      case 'N':
      case 'S':
      case 'E':
      case 'W':
        this.movePlayer(verb === 'GO' ? noun : verb);
        break;
      case 'LOOK':
        this.lookAround();
        break;
      case 'TAKE':
        this.takeItem(noun);
        break;
      case 'INVENTORY':
      case 'INV':
        this.showInventory();
        break;
      default:
        this.addText("I DON'T UNDERSTAND THAT.");
    }
    
    // Keep buffer from getting too long
    if (this.textBuffer.length > 12) {
      this.textBuffer.shift();
    }
  }
  
  addText(text) {
    this.textBuffer.push(text);
  }
  
  movePlayer(direction) {
    const room = this.rooms[this.currentRoom];
    
    if (!room.exits[direction]) {
      this.addText("YOU CAN'T GO THAT WAY.");
      return;
    }
    
    // Check if this exit requires an item
    if (room.requires && room.requires[direction]) {
      const requiredItem = room.requires[direction];
      if (!this.inventory.includes(requiredItem)) {
        this.addText(`YOU NEED A ${requiredItem.toUpperCase()} TO GO THAT WAY.`);
        return;
      }
    }
    
    this.currentRoom = room.exits[direction];
    this.lookAround();
  }
  
  lookAround() {
    const room = this.rooms[this.currentRoom];
    this.addText(room.desc);
    
    if (room.items && room.items.length > 0) {
      this.addText(`YOU SEE: ${room.items.join(', ').toUpperCase()}`);
    }
  }
  
  takeItem(item) {
    const room = this.rooms[this.currentRoom];
    
    if (!room.items || !room.items.includes(item.toLowerCase())) {
      this.addText("YOU DON'T SEE THAT HERE.");
      return;
    }
    
    this.inventory.push(item.toLowerCase());
    room.items = room.items.filter(i => i !== item.toLowerCase());
    this.addText(`YOU TAKE THE ${item}.`);
  }
  
  showInventory() {
    if (this.inventory.length === 0) {
      this.addText("YOU AREN'T CARRYING ANYTHING.");
    } else {
      this.addText(`YOU ARE CARRYING: ${this.inventory.join(', ').toUpperCase()}`);
    }
  }
}

// Demo scene visualization
class DemoScene {
  constructor(engine) {
    this.engine = engine;
    this.time = 0;
    this.stars = [];
    
    // Create starfield
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * 320,
        y: Math.random() * 240,
        z: Math.random() * 5 + 1
      });
    }
  }
  
  update() {
    this.time += 0.05;
    
    // Update stars
    this.stars.forEach(star => {
      star.z -= 0.02;
      
      if (star.z <= 0) {
        star.x = Math.random() * 320;
        star.y = Math.random() * 240;
        star.z = 5;
      }
    });
  }
  
  render(ctx, palette) {
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, palette[1]);  // Dark blue
    gradient.addColorStop(1, palette[5]);  // Purple
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 240);
    
    // Draw stars
    this.stars.forEach(star => {
      const size = (6 - star.z) * 0.5;
      const brightness = Math.floor((1 - star.z / 5) * 7) + 8; // Map to palette indices 8-15
      
      ctx.fillStyle = palette[brightness];
      ctx.fillRect(star.x, star.y, size, size);
    });
    
    // Draw scrolling text
    ctx.fillStyle = palette[14]; // Yellow
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    
    const scrollText = "8-BITHUB DEMO SCENE PRESENTS: THE AMAZING SCROLLING TEXT!";
    const textPos = (320 - this.time * 5) % (scrollText.length * 16 + 320);
    
    ctx.fillText(scrollText, textPos, 120);
    
    // Draw plasma effect
    this.drawPlasma(ctx, palette);
    
    // Draw bouncing logo
    this.drawLogo(ctx, palette);
  }
  
  drawPlasma(ctx, palette) {
    const width = 320;
    const height = 60;
    const yOffset = 160;
    
    for (let x = 0; x < width; x += 4) {
      for (let y = 0; y < height; y += 4) {
        // Create plasma effect using sine waves
        const v1 = Math.sin((x / 32.0) + this.time);
        const v2 = Math.sin((y / 16.0) + this.time * 0.5);
        const v3 = Math.sin(((x + y) / 32.0) + this.time * 0.7);
        
        // Combine waves and map to palette
        const colorIndex = Math.floor(((v1 + v2 + v3 + 3) / 6) * 7) + 8; // Map to palette indices 8-15
        
        ctx.fillStyle = palette[colorIndex];
        ctx.fillRect(x, y + yOffset, 4, 4);
      }
    }
  }
  
  drawLogo(ctx, palette) {
    // Calculate bounce position
    const y = 40 + Math.abs(Math.sin(this.time * 0.5) * 20);
    
    // Draw 8-BitHub logo
    ctx.fillStyle = palette[14]; // Yellow
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText("8-BITHUB", 160, y);
    
    // Draw shadow
    ctx.fillStyle = palette[4]; // Dark red
    ctx.fillText("8-BITHUB", 162, y + 2);
  }
} 