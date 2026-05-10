/**
 * ════════════════════════════════════════════════════════════════════════════
 * SOUK BRAWL - Animated Background
 * Canvas-based animated background with particles and effects
 * ════════════════════════════════════════════════════════════════════════════
 */

class BackgroundAnimation {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.particles = [];
    this.lines = [];
    this.time = 0;

    // Set canvas size
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Initialize particles
    this.initParticles();
    this.initLines();

    // Handle resize
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Start animation
    this.animate = this.animate.bind(this);
    this.animationId = null;
    this.start();
  }

  /**
   * Initialize floating particles
   */
  initParticles() {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '#ff6b35' : '#00d9ff',
      });
    }
  }

  /**
   * Initialize connecting lines
   */
  initLines() {
    const lineCount = 3;
    for (let i = 0; i < lineCount; i++) {
      this.lines.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        angle: Math.random() * Math.PI * 2,
        length: Math.random() * 100 + 50,
      });
    }
  }

  /**
   * Update and draw background
   */
  animate() {
    this.time++;

    // Clear canvas with gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid pattern
    this.drawGrid();

    // Update and draw particles
    this.updateParticles();
    this.drawParticles();

    // Update and draw lines
    this.updateLines();
    this.drawLines();

    // Draw scanlines effect
    this.drawScanlines();

    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  }

  /**
   * Draw grid pattern background
   */
  drawGrid() {
    const gridSize = 40;
    this.ctx.strokeStyle = 'rgba(255, 107, 53, 0.05)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Update particles
   */
  updateParticles() {
    this.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < 0) particle.x = this.width;
      if (particle.x > this.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.height;
      if (particle.y > this.height) particle.y = 0;

      // Pulse opacity
      particle.opacity =
        0.2 +
        0.3 * Math.sin(this.time * 0.02 + particle.x * 0.01);
    });
  }

  /**
   * Draw particles
   */
  drawParticles() {
    this.particles.forEach((particle) => {
      this.ctx.fillStyle = particle.color;
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  /**
   * Update animated lines
   */
  updateLines() {
    this.lines.forEach((line) => {
      line.x += line.vx;
      line.y += line.vy;
      line.angle += 0.01;

      // Wrap around edges
      if (line.x < -100) line.x = this.width + 100;
      if (line.x > this.width + 100) line.x = -100;
      if (line.y < -100) line.y = this.height + 100;
      if (line.y > this.height + 100) line.y = -100;
    });
  }

  /**
   * Draw animated lines
   */
  drawLines() {
    this.lines.forEach((line) => {
      const x2 = line.x + Math.cos(line.angle) * line.length;
      const y2 = line.y + Math.sin(line.angle) * line.length;

      const gradient = this.ctx.createLinearGradient(line.x, line.y, x2, y2);
      gradient.addColorStop(0, 'rgba(255, 107, 53, 0.3)');
      gradient.addColorStop(0.5, 'rgba(0, 217, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');

      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(line.x, line.y);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    });
  }

  /**
   * Draw CRT scanlines effect
   */
  drawScanlines() {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    for (let y = 0; y < this.height; y += 2) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Handle window resize
   */
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  /**
   * Start animation
   */
  start() {
    if (!this.animationId) {
      this.animate();
    }
  }

  /**
   * Stop animation
   */
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
  }
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.bgAnimation = new BackgroundAnimation();
  });
} else {
  window.bgAnimation = new BackgroundAnimation();
}