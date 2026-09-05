/**
 * M7SH · MOHAMMED MUSHARAF PORTFOLIO
 * High-Performance Animation & Fluid Interaction Engine
 */

(function () {
    'use strict';

    // --- CONFIG & STATE ---
    const CONFIG = {
        githubUser: 'm7sh',
        cacheKey: 'm7sh_gh_data_v2',
        cacheDuration: 1000 * 60 * 30, // 30 minutes
        defaultTheme: 'obsidian',
        themes: ['obsidian', 'everpuccin', 'matrix', 'cyberpunk']
    };

    const state = {
        theme: localStorage.getItem('m7sh_theme') || CONFIG.defaultTheme,
        soundEnabled: localStorage.getItem('m7sh_sound_enabled') === 'true',
        matrixActive: false,
        commandHistory: [],
        historyIndex: -1,
        activeRepoFilter: 'all',
        reposData: []
    };

    // --- AUDIO SYNTHESIZER (Web Audio API) ---
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.initialized = false;
        }

        init() {
            if (this.initialized) return;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                    this.initialized = true;
                }
            } catch (e) {
                console.warn('AudioContext not supported', e);
            }
        }

        playTone(freqStart, freqEnd, type = 'sine', duration = 0.04, maxGain = 0.03) {
            if (!state.soundEnabled) return;
            this.init();
            if (!this.ctx) return;
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
                if (freqEnd && freqEnd !== freqStart) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), this.ctx.currentTime + duration);
                }

                gain.gain.setValueAtTime(maxGain, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {}
        }

        tick() {
            this.playTone(1400, 800, 'sine', 0.025, 0.015);
        }

        blip() {
            this.playTone(480, 960, 'triangle', 0.06, 0.04);
        }

        key() {
            this.playTone(600 + Math.random() * 300, 200, 'triangle', 0.02, 0.012);
        }

        theme() {
            this.playTone(320, 640, 'sine', 0.12, 0.04);
            setTimeout(() => this.playTone(640, 1280, 'sine', 0.15, 0.03), 60);
        }

        success() {
            [440, 554.37, 659.25, 880].forEach((f, idx) => {
                setTimeout(() => this.playTone(f, f * 1.05, 'sine', 0.15, 0.04), idx * 70);
            });
        }
    }

    const sound = new SoundEngine();

    // --- TOAST NOTIFICATIONS ---
    function showToast(msg, icon = '✓') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span style="color: var(--primary); font-weight: bold;">${icon}</span> <span>${msg}</span>`;
        container.appendChild(toast);

        sound.blip();

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, 3200);
    }

    // --- THEME ENGINE ---
    function setTheme(themeName) {
        if (!CONFIG.themes.includes(themeName)) return;
        state.theme = themeName;
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('m7sh_theme', themeName);
        sound.theme();

        const themeBtnText = document.getElementById('theme-btn-label');
        if (themeBtnText) {
            themeBtnText.textContent = themeName.charAt(0).toUpperCase() + themeName.slice(1);
        }

        showToast(`Theme: ${themeName}`, '🎨');
    }

    function cycleTheme() {
        const currentIndex = CONFIG.themes.indexOf(state.theme);
        const nextIndex = (currentIndex + 1) % CONFIG.themes.length;
        setTheme(CONFIG.themes[nextIndex]);
    }

    // --- INTERACTIVE FLUID & PARTICLE CANVAS ---
    class FluidCanvas {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.numParticles = 75;
            this.mouse = { x: -1000, y: -1000, vx: 0, vy: 0, lastX: 0, lastY: 0, isHover: false };
            this.width = 0;
            this.height = 0;

            this.init();
        }

        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());

            // Populate particles
            this.particles = [];
            for (let i = 0; i < this.numParticles; i++) {
                this.particles.push({
                    x: Math.random() * this.width,
                    y: Math.random() * this.height,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: (Math.random() - 0.5) * 0.7,
                    radius: Math.random() * 2.2 + 0.8,
                    baseAlpha: Math.random() * 0.5 + 0.2,
                    alpha: 0.3,
                    colorVariant: Math.random()
                });
            }

            // Mouse tracking
            window.addEventListener('mousemove', (e) => {
                this.mouse.vx = e.clientX - this.mouse.lastX;
                this.mouse.vy = e.clientY - this.mouse.lastY;
                this.mouse.lastX = e.clientX;
                this.mouse.lastY = e.clientY;
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
                this.mouse.isHover = true;
            });

            window.addEventListener('mouseleave', () => {
                this.mouse.isHover = false;
                this.mouse.x = -1000;
                this.mouse.y = -1000;
            });

            this.animate();
        }

        resize() {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width * window.devicePixelRatio;
            this.canvas.height = this.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        animate() {
            this.ctx.clearRect(0, 0, this.width, this.height);

            const computedStyle = getComputedStyle(document.documentElement);
            const primaryColor = computedStyle.getPropertyValue('--primary').trim() || '#8b5cf6';
            const secondaryColor = computedStyle.getPropertyValue('--secondary').trim() || '#06b6d4';

            // Connect nearby particles with luminous lines
            const maxDistance = 140;
            for (let i = 0; i < this.particles.length; i++) {
                const p1 = this.particles[i];

                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDistance) {
                        const alpha = (1 - dist / maxDistance) * 0.18;
                        this.ctx.beginPath();
                        this.ctx.moveTo(p1.x, p1.y);
                        this.ctx.lineTo(p2.x, p2.y);
                        this.ctx.strokeStyle = `rgba(${p1.colorVariant > 0.5 ? '139, 92, 246' : '6, 182, 212'}, ${alpha})`;
                        this.ctx.lineWidth = 0.75;
                        this.ctx.stroke();
                    }
                }
            }

            // Update & draw particles
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];

                // Mouse influence / repulsion
                if (this.mouse.isHover) {
                    const dx = p.x - this.mouse.x;
                    const dy = p.y - this.mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = 130;

                    if (dist < minDist && dist > 0) {
                        const force = (minDist - dist) / minDist;
                        p.vx += (dx / dist) * force * 0.8;
                        p.vy += (dy / dist) * force * 0.8;
                        p.alpha = Math.min(0.9, p.baseAlpha + force * 0.5);
                    }
                }

                // Dampen velocities
                p.vx *= 0.985;
                p.vy *= 0.985;

                // Base motion
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges seamlessly
                if (p.x < 0) p.x = this.width;
                if (p.x > this.width) p.x = 0;
                if (p.y < 0) p.y = this.height;
                if (p.y > this.height) p.y = 0;

                // Particle glow & drawing
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = p.colorVariant > 0.5 ? primaryColor : secondaryColor;
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fill();
            }

            this.ctx.globalAlpha = 1.0;
            requestAnimationFrame(() => this.animate());
        }
    }

    // --- OSCILLOSCOPE SIMULATION CANVAS (ECE Bento Card) ---
    class OscilloscopeCanvas {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.width = this.canvas.offsetWidth || 300;
            this.height = this.canvas.offsetHeight || 120;
            this.phase = 0;
            this.freq = 0.04;
            this.targetFreq = 0.04;
            this.amp = 35;
            this.targetAmp = 35;

            this.init();
        }

        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());

            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const nx = (e.clientX - rect.left) / rect.width;
                const ny = (e.clientY - rect.top) / rect.height;
                this.targetFreq = 0.02 + nx * 0.08;
                this.targetAmp = 15 + (1 - ny) * 35;
            });

            this.canvas.addEventListener('mouseleave', () => {
                this.targetFreq = 0.04;
                this.targetAmp = 32;
            });

            this.animate();
        }

        resize() {
            if (!this.canvas) return;
            this.width = this.canvas.offsetWidth;
            this.height = this.canvas.offsetHeight;
            this.canvas.width = this.width * window.devicePixelRatio;
            this.canvas.height = this.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        animate() {
            if (!this.canvas) return;
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Interpolate toward targets
            this.freq += (this.targetFreq - this.freq) * 0.08;
            this.amp += (this.targetAmp - this.amp) * 0.08;
            this.phase += 0.06;

            // Draw oscilloscope grid
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            this.ctx.lineWidth = 1;
            const step = 20;
            for (let x = 0; x < this.width; x += step) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }
            for (let y = 0; y < this.height; y += step) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.width, y);
                this.ctx.stroke();
            }

            // Draw center baseline
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height / 2);
            this.ctx.lineTo(this.width, this.height / 2);
            this.ctx.stroke();

            // Draw live sine wave
            const computedStyle = getComputedStyle(document.documentElement);
            const accent = computedStyle.getPropertyValue('--accent').trim() || '#10b981';

            this.ctx.beginPath();
            this.ctx.lineWidth = 2.5;
            this.ctx.strokeStyle = accent;
            this.ctx.shadowColor = accent;
            this.ctx.shadowBlur = 10;

            const midY = this.height / 2;
            for (let x = 0; x < this.width; x++) {
                const y = midY + Math.sin(x * this.freq + this.phase) * this.amp + Math.cos(x * (this.freq * 0.5) - this.phase) * (this.amp * 0.2);
                if (x === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            requestAnimationFrame(() => this.animate());
        }
    }

    // --- FULLSCREEN MATRIX RAIN CANVAS ---
    class MatrixRain {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.columns = 0;
            this.drops = [];
            this.chars = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789ABCDEFλπΩ≈';
            this.fontSize = 15;
            this.running = false;

            this.init();
        }

        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }

        resize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.columns = Math.floor(this.canvas.width / this.fontSize);
            this.drops = [];
            for (let i = 0; i < this.columns; i++) {
                this.drops[i] = Math.floor(Math.random() * -100);
            }
        }

        toggle(force) {
            state.matrixActive = force !== undefined ? force : !state.matrixActive;
            if (state.matrixActive) {
                this.canvas.classList.add('active');
                if (!this.running) {
                    this.running = true;
                    this.animate();
                }
                showToast('Matrix Rain Mode: ENGAGED 🕶️', '⚡');
            } else {
                this.canvas.classList.remove('active');
                this.running = false;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                showToast('Matrix Rain Mode: Standby', '✓');
            }
        }

        animate() {
            if (!this.running) return;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            const computed = getComputedStyle(document.documentElement);
            const primary = computed.getPropertyValue('--primary').trim() || '#00ff66';

            this.ctx.fillStyle = primary;
            this.ctx.font = `${this.fontSize}px monospace`;

            for (let i = 0; i < this.drops.length; i++) {
                const char = this.chars[Math.floor(Math.random() * this.chars.length)];
                const x = i * this.fontSize;
                const y = this.drops[i] * this.fontSize;

                this.ctx.fillText(char, x, y);

                if (y > this.canvas.height && Math.random() > 0.975) {
                    this.drops[i] = 0;
                }
                this.drops[i]++;
            }

            requestAnimationFrame(() => this.animate());
        }
    }

    // --- CUSTOM FLUID MORPHING CURSOR ---
    function initCustomCursor() {
        const dot = document.querySelector('.custom-cursor-dot');
        const outline = document.querySelector('.custom-cursor-outline');
        if (!dot || !outline) return;

        let mouseX = -100, mouseY = -100;
        let outlineX = -100, outlineY = -100;

        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        });

        function renderCursor() {
            outlineX += (mouseX - outlineX) * 0.18;
            outlineY += (mouseY - outlineY) * 0.18;
            outline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
            requestAnimationFrame(renderCursor);
        }
        renderCursor();

        const interactiveElements = 'a, button, input, textarea, .interactive-pill, .cmd-badge, .repo-card, .bento-card, .channel-card, .filter-chip, .swatch-pill';
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest(interactiveElements)) {
                document.body.classList.add('hovering-interactive');
                sound.tick();
            }
        });
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest(interactiveElements)) {
                document.body.classList.remove('hovering-interactive');
            }
        });
    }

    // --- 3D TILT EFFECT FOR CARDS ---
    function init3DTilt() {
        const tiltCards = document.querySelectorAll('.hero-3d-card, .bento-card, .repo-card');

        tiltCards.forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -8;
                const rotateY = ((x - centerX) / centerX) * 8;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
                card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
                card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            });
        });
    }

    // --- INTERACTIVE TERMINAL ENGINE ---
    function initTerminal(matrixEngine) {
        const terminalInput = document.getElementById('terminal-cli-input');
        const terminalHistory = document.getElementById('terminal-history-box');
        const terminalBody = document.querySelector('.terminal-body');
        if (!terminalInput || !terminalHistory) return;

        const commands = {
            help: () => `
Available system commands:
  • <span class="term-prompt">whoami</span>       : Profile overview & credentials
  • <span class="term-prompt">neofetch</span>     : Omarchy / Arch Linux system specs
  • <span class="term-prompt">repos</span>        : GitHub repositories & projects
  • <span class="term-prompt">skills</span>       : Technical stack & disciplines
  • <span class="term-prompt">contact</span>      : Reach out & contact links
  • <span class="term-prompt">theme [name]</span>  : Switch theme (obsidian, everpuccin, matrix, cyberpunk)
  • <span class="term-prompt">matrix</span>       : Toggle digital matrix rain simulation
  • <span class="term-prompt">sound</span>        : Toggle sound feedback (current: ${state.soundEnabled ? 'ON' : 'OFF'})
  • <span class="term-prompt">clear</span>        : Clear terminal output
  • <span class="term-prompt">sudo</span>         : Execute superuser privilege
`,
            whoami: () => `
<span class="term-prompt">User:</span> Mohammed Musharaf (m7sh)
<span class="term-prompt">Current Role:</span> Analyst @ Insurance Firm (Bangalore, India · 2026—Present)
<span class="term-prompt">Prior Role:</span> Junior Planning Engineer (Saudi Arabia · 2024—2025)
<span class="term-prompt">Education:</span> B.E. in Electronics & Communication (VTU Belagavi · 2019—2023)
<span class="term-prompt">Affiliation:</span> Member @ IEEE
<span class="term-prompt">Focus:</span> Corporate analytics by day; Linux customization, Omarchy ricing & open-source tooling by night.
`,
            neofetch: () => `
<div style="display:flex; gap: 20px; align-items: center; flex-wrap: wrap;">
<pre style="color: var(--primary); font-family: monospace; font-size: 0.8rem; margin: 0;">
       /\\         <b>musharaf</b>@<b>omarchy</b>
      /  \\        ----------------
     /\\   \\       <b>OS</b>: Omarchy Linux x86_64
    /      \\      <b>Host</b>: Custom Rice Machine
   /   ,,   \\     <b>Kernel</b>: 6.12.0-zen-arch
  /   |  |  -\\    <b>Uptime</b>: 42 days, 13 hours
 /_-''    ''-_\\   <b>Shell</b>: zsh / bash
                  <b>WM</b>: Hyprland (Wayland)
                  <b>Theme</b>: everpuccin-m7sh [Catppuccin + Everforest]
                  <b>Terminal</b>: Ghostty / Kitty
                  <b>CPU</b>: Intel / AMD Multi-Core
                  <b>Role</b>: Analyst @ Insurance Firm (Bangalore, India)
                  <b>Prior</b>: Jr. Planning Engineer (Saudi Arabia)
                  <b>Degree</b>: B.E. in ECE, VTU Belagavi (2019-2023)
</pre>
</div>
`,
            skills: () => `
<span class="term-prompt">[Hardware & ECE]:</span> Embedded C, MATLAB, Digital Signal Processing, Circuit Design, Microcontrollers, IEEE standards.
<span class="term-prompt">[Software & Web]:</span> Python, C, Java, JavaScript, QML, HTML5/CSS3, Bash, Git.
<span class="term-prompt">[Linux & Systems]:</span> Omarchy, Hyprland, Wayland, Dotfile Architecture, Ricing, Systemd, Neovim.
`,
            repos: () => `
Highlighted Repositories (<a href="https://github.com/m7sh" target="_blank" style="color:var(--primary); text-decoration: underline;">github.com/m7sh</a>):
  • <a href="https://github.com/m7sh/mush-omarchy-cricket" target="_blank" style="color:var(--secondary);">mush-omarchy-cricket</a> : Live cricket scores desktop widget for Omarchy/Hyprland (QML).
  • <a href="https://github.com/m7sh/everpuccin-m7sh" target="_blank" style="color:var(--secondary);">everpuccin-m7sh</a>       : Omarchy aesthetic theme blend of Catppuccin & Everforest.
  • <a href="https://github.com/m7sh/Desktop-Voice-Assistant" target="_blank" style="color:var(--secondary);">Desktop-Voice-Assistant</a>: Python voice-controlled intelligent automation tool.
  • <a href="https://github.com/m7sh/hogwarts-night" target="_blank" style="color:var(--secondary);">hogwarts-night</a>         : Dark atmospheric cyber-nocturnal CSS styling.
  • <a href="https://github.com/m7sh/m7sh" target="_blank" style="color:var(--secondary);">m7sh</a>                   : High-performance portfolio website & engine.
`,
            contact: () => `
<span class="term-prompt">Email:</span>    <a href="mailto:mdmusharaf720@gmail.com" style="color:var(--text);">mdmusharaf720@gmail.com</a>
<span class="term-prompt">GitHub:</span>   <a href="https://github.com/m7sh" target="_blank" style="color:var(--primary);">github.com/m7sh</a>
<span class="term-prompt">Twitter:</span>  <a href="https://twitter.com/i_musharaf725" target="_blank" style="color:var(--secondary);">twitter.com/i_musharaf725</a>
<span class="term-prompt">LinkedIn:</span> <a href="https://www.linkedin.com/in/mohammed-musharaf-122523220/" target="_blank" style="color:var(--secondary);">mohammed-musharaf-122523220</a>
`,
            theme: (arg) => {
                if (!arg) return `Usage: theme [obsidian | everpuccin | matrix | cyberpunk]\nCurrent: ${state.theme}`;
                const chosen = arg.toLowerCase().trim();
                if (CONFIG.themes.includes(chosen)) {
                    setTheme(chosen);
                    return `Theme set to: <span class="term-prompt">${chosen}</span>`;
                }
                return `Unknown theme '${chosen}'. Available: ${CONFIG.themes.join(', ')}`;
            },
            matrix: () => {
                if (matrixEngine) {
                    matrixEngine.toggle();
                    return state.matrixActive ? 'Matrix code rain simulation: ACTIVE' : 'Matrix code rain simulation: INACTIVE';
                }
                return 'Matrix engine unavailable.';
            },
            sound: () => {
                state.soundEnabled = !state.soundEnabled;
                localStorage.setItem('m7sh_sound_enabled', state.soundEnabled);
                const soundBtn = document.getElementById('sound-toggle-btn');
                if (soundBtn) {
                    soundBtn.innerHTML = state.soundEnabled ? '<i data-lucide="volume-2"></i> <span>SFX ON</span>' : '<i data-lucide="volume-x"></i> <span>SFX OFF</span>';
                    if (window.lucide) window.lucide.createIcons();
                }
                if (state.soundEnabled) sound.success();
                return `Sound effects: <span class="term-prompt">${state.soundEnabled ? 'ENABLED' : 'DISABLED'}</span>`;
            },
            clear: () => {
                terminalHistory.innerHTML = '';
                return null;
            },
            sudo: () => {
                return '<span style="color:#ff5f56;">Permission denied: nice try, but you are not in the sudoers file! 🛡️</span>';
            },
            date: () => new Date().toUTCString(),
            uptime: () => 'Omarchy uptime: 42 days, 13 hours, 37 minutes'
        };

        function appendLine(html, isCmd = false, cmdText = '') {
            const row = document.createElement('div');
            row.className = 'term-line';
            if (isCmd) {
                row.innerHTML = `<span class="term-prompt">musharaf@omarchy:~$</span> <span class="term-cmd">${escapeHtml(cmdText)}</span>`;
            } else {
                row.innerHTML = `<div class="term-response">${html}</div>`;
            }
            terminalHistory.appendChild(row);
            if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
        }

        function executeCommand(rawInput) {
            const trimmed = rawInput.trim();
            if (!trimmed) return;

            appendLine('', true, trimmed);
            state.commandHistory.push(trimmed);
            state.historyIndex = state.commandHistory.length;

            const [cmd, ...args] = trimmed.split(' ');
            const lowerCmd = cmd.toLowerCase();

            if (commands[lowerCmd]) {
                const response = commands[lowerCmd](args.join(' '));
                if (response !== null) {
                    appendLine(response);
                }
            } else {
                appendLine(`Command not found: <span style="color:#ff5f56;">${escapeHtml(trimmed)}</span>. Type <span class="term-prompt">help</span> for a list of commands.`);
            }

            sound.key();
        }

        // Initial neofetch
        appendLine(commands.neofetch());
        appendLine('Type <span class="term-prompt">help</span> to view available interactive commands or click quick chips below.');

        terminalInput.addEventListener('keydown', (e) => {
            sound.key();

            if (e.key === 'Enter') {
                executeCommand(terminalInput.value);
                terminalInput.value = '';
            } else if (e.key === 'ArrowUp') {
                if (state.historyIndex > 0) {
                    state.historyIndex--;
                    terminalInput.value = state.commandHistory[state.historyIndex] || '';
                }
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                if (state.historyIndex < state.commandHistory.length - 1) {
                    state.historyIndex++;
                    terminalInput.value = state.commandHistory[state.historyIndex] || '';
                } else {
                    state.historyIndex = state.commandHistory.length;
                    terminalInput.value = '';
                }
                e.preventDefault();
            }
        });

        // Quick badges click
        document.querySelectorAll('.cmd-badge').forEach((badge) => {
            badge.addEventListener('click', () => {
                const cmd = badge.getAttribute('data-cmd');
                if (cmd) {
                    terminalInput.value = cmd;
                    executeCommand(cmd);
                    terminalInput.focus();
                }
            });
        });
    }

    // --- GITHUB TELEMETRY & REPOS FETCHING ---
    const FALLBACK_REPOS = [
        {
            name: 'mush-omarchy-cricket',
            html_url: 'https://github.com/m7sh/mush-omarchy-cricket',
            description: 'Live real-time cricket score & match widget for Omarchy / Hyprland Linux desktops.',
            language: 'QML',
            stargazers_count: 1,
            forks_count: 0,
            topics: ['omarchy', 'hyprland', 'qml', 'linux-rice', 'cricket'],
            category: 'linux'
        },
        {
            name: 'everpuccin-m7sh',
            html_url: 'https://github.com/m7sh/everpuccin-m7sh',
            description: 'A curated Omarchy aesthetic theme based on Catppuccin + Forest color schemes.',
            language: 'CSS',
            stargazers_count: 1,
            forks_count: 0,
            topics: ['omarchy-theme', 'catppuccin', 'everforest', 'hyprland', 'rice'],
            category: 'linux'
        },
        {
            name: 'Desktop-Voice-Assistant',
            html_url: 'https://github.com/m7sh/Desktop-Voice-Assistant',
            description: 'Python desktop assistant for hands-free system control, voice commands & automation.',
            language: 'Python',
            stargazers_count: 1,
            forks_count: 0,
            topics: ['python', 'voice-assistant', 'automation', 'desktop-tool'],
            category: 'python'
        },
        {
            name: 'm7sh',
            html_url: 'https://github.com/m7sh/m7sh',
            description: 'High-speed interactive developer portfolio with fluid physics and cyber terminal aesthetics.',
            language: 'HTML',
            stargazers_count: 1,
            forks_count: 0,
            topics: ['portfolio', 'interactive', 'animations', 'canvas', 'fluid'],
            category: 'web'
        },
        {
            name: 'hogwarts-night',
            html_url: 'https://github.com/m7sh/hogwarts-night',
            description: 'Nocturnal deep cyber-gothic CSS color palette & styling theme.',
            language: 'CSS',
            stargazers_count: 1,
            forks_count: 0,
            topics: ['css', 'theme', 'dark-mode'],
            category: 'linux'
        },
        {
            name: 'About',
            html_url: 'https://github.com/m7sh/About',
            description: 'Core configuration dotfiles and profile specs for GitHub & terminal environment.',
            language: 'Shell',
            stargazers_count: 0,
            forks_count: 0,
            topics: ['config', 'dotfiles', 'github-profile'],
            category: 'linux'
        }
    ];

    async function loadGitHubTelemetry() {
        const reposContainer = document.getElementById('repos-container');
        if (!reposContainer) return;

        let repos = FALLBACK_REPOS;
        let publicReposCount = 6;
        let totalStars = 4;
        let lastCommitText = 'Active this week';

        try {
            const cached = localStorage.getItem(CONFIG.cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CONFIG.cacheDuration) {
                    repos = parsed.repos;
                    publicReposCount = parsed.publicReposCount;
                    totalStars = parsed.totalStars;
                    lastCommitText = parsed.lastCommitText;
                }
            } else {
                const [userRes, repoRes] = await Promise.all([
                    fetch(`https://api.github.com/users/${CONFIG.githubUser}`),
                    fetch(`https://api.github.com/users/${CONFIG.githubUser}/repos?per_page=100&sort=updated`)
                ]);

                if (userRes.ok && repoRes.ok) {
                    const userData = await userRes.json();
                    const reposData = await repoRes.json();

                    if (Array.isArray(reposData) && reposData.length > 0) {
                        publicReposCount = userData.public_repos || reposData.length;
                        totalStars = reposData.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);

                        repos = reposData.map((r) => {
                            let cat = 'web';
                            const desc = (r.description || '').toLowerCase();
                            const name = (r.name || '').toLowerCase();
                            const lang = (r.language || '').toLowerCase();

                            if (desc.includes('omarchy') || desc.includes('theme') || name.includes('omarchy') || lang === 'qml' || lang === 'shell') {
                                cat = 'linux';
                            } else if (lang === 'python' || desc.includes('voice') || desc.includes('ai')) {
                                cat = 'python';
                            }

                            return {
                                name: r.name,
                                html_url: r.html_url,
                                description: r.description || 'Open source engineering project maintained by m7sh.',
                                language: r.language || 'Code',
                                stargazers_count: r.stargazers_count || 0,
                                forks_count: r.forks_count || 0,
                                topics: r.topics && r.topics.length ? r.topics : [r.language || 'source'],
                                category: cat,
                                updated_at: r.updated_at
                            };
                        });

                        localStorage.setItem(CONFIG.cacheKey, JSON.stringify({
                            timestamp: Date.now(),
                            repos,
                            publicReposCount,
                            totalStars,
                            lastCommitText
                        }));
                    }
                }
            }
        } catch (e) {
            console.warn('Using curated fallback GitHub telemetry', e);
        }

        state.reposData = repos;

        animateCounter('telemetry-repos-count', publicReposCount);
        animateCounter('telemetry-stars-count', totalStars);
        animateCounter('telemetry-languages-count', 6);
        const commitEl = document.getElementById('telemetry-last-commit');
        if (commitEl) commitEl.textContent = lastCommitText;

        renderRepos(repos);
    }

    function animateCounter(id, targetValue) {
        const el = document.getElementById(id);
        if (!el) return;

        let current = 0;
        const duration = 1200;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            current = Math.floor(ease * targetValue);
            el.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = targetValue;
            }
        }
        requestAnimationFrame(step);
    }

    const LANG_COLORS = {
        QML: '#2ecc71',
        Python: '#3572A5',
        CSS: '#563d7c',
        HTML: '#e34c26',
        JavaScript: '#f1e05a',
        Shell: '#89e051',
        C: '#555555',
        Java: '#b07219',
        Default: '#8b5cf6'
    };

    function renderRepos(repos) {
        const container = document.getElementById('repos-container');
        if (!container) return;

        const filtered = state.activeRepoFilter === 'all'
            ? repos
            : repos.filter(r => r.category === state.activeRepoFilter);

        container.innerHTML = '';

        filtered.forEach((repo) => {
            const card = document.createElement('a');
            card.href = repo.html_url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.className = 'repo-card';

            const langColor = LANG_COLORS[repo.language] || LANG_COLORS.Default;
            const tagsHtml = (repo.topics || []).slice(0, 3).map(t => `<span class="repo-tag">#${t}</span>`).join('');

            card.innerHTML = `
                <div class="repo-card-top">
                    <h3 class="repo-title">
                        <i data-lucide="folder-git-2" style="width:18px; height:18px; color:var(--primary);"></i>
                        <span>${escapeHtml(repo.name)}</span>
                    </h3>
                    <i data-lucide="arrow-up-right" class="repo-external-icon" style="width:18px; height:18px;"></i>
                </div>
                <p class="repo-desc">${escapeHtml(repo.description || 'Open source engineering repository.')}</p>
                <div class="repo-tags">${tagsHtml}</div>
                <div class="repo-footer">
                    <div class="repo-lang">
                        <span class="lang-dot" style="background-color: ${langColor};"></span>
                        <span>${escapeHtml(repo.language || 'Source')}</span>
                    </div>
                    <div class="repo-stats">
                        <span class="repo-stat-item"><i data-lucide="star" style="width:13px; height:13px;"></i> ${repo.stargazers_count}</span>
                        <span class="repo-stat-item"><i data-lucide="git-fork" style="width:13px; height:13px;"></i> ${repo.forks_count}</span>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
        init3DTilt();
    }

    function initRepoFilters() {
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.activeRepoFilter = chip.getAttribute('data-filter') || 'all';
                sound.blip();
                renderRepos(state.reposData);
            });
        });
    }

    // --- COMMAND PALETTE (⌘K / Ctrl+K) ---
    function initCommandPalette(matrixEngine) {
        const backdrop = document.getElementById('command-palette-backdrop');
        const input = document.getElementById('palette-input');
        const resultsContainer = document.getElementById('palette-results');
        const openBtn = document.getElementById('open-palette-btn');
        if (!backdrop || !input || !resultsContainer) return;

        const paletteItems = [
            { label: 'Jump to Hero', section: '#hero', icon: 'zap', group: 'Navigation' },
            { label: 'Explore Bento Grid (ECE & Ricing)', section: '#bento', icon: 'cpu', group: 'Navigation' },
            { label: 'View GitHub Repositories', section: '#repos', icon: 'git-branch', group: 'Navigation' },
            { label: 'Launch Interactive Terminal', section: '#terminal', icon: 'terminal', group: 'Navigation' },
            { label: 'View Engineering Roadmap', section: '#timeline', icon: 'milestone', group: 'Navigation' },
            { label: 'Get in Touch / Contact Form', section: '#contact', icon: 'mail', group: 'Navigation' },
            { label: 'Switch Theme: Obsidian Cyber', action: () => setTheme('obsidian'), icon: 'moon', group: 'Theme' },
            { label: 'Switch Theme: Everpuccin', action: () => setTheme('everpuccin'), icon: 'leaf', group: 'Theme' },
            { label: 'Switch Theme: Matrix Emerald', action: () => setTheme('matrix'), icon: 'binary', group: 'Theme' },
            { label: 'Switch Theme: Cyberpunk Neon', action: () => setTheme('cyberpunk'), icon: 'sun', group: 'Theme' },
            { label: 'Toggle Matrix Digital Rain', action: () => matrixEngine && matrixEngine.toggle(), icon: 'code', group: 'Fun' },
            { label: 'Toggle Sound Effects (SFX)', action: () => {
                state.soundEnabled = !state.soundEnabled;
                localStorage.setItem('m7sh_sound_enabled', state.soundEnabled);
                showToast(`Sound FX: ${state.soundEnabled ? 'ON' : 'OFF'}`);
            }, icon: 'volume-2', group: 'Settings' },
            { label: 'Open GitHub Profile (@m7sh)', action: () => window.open('https://github.com/m7sh', '_blank'), icon: 'external-link', group: 'Social' },
            { label: 'Copy Email to Clipboard', action: () => copyEmail(), icon: 'copy', group: 'Quick Actions' }
        ];

        let filteredItems = [...paletteItems];
        let selectedIndex = 0;

        function openPalette() {
            backdrop.classList.add('active');
            input.value = '';
            filteredItems = [...paletteItems];
            selectedIndex = 0;
            renderResults();
            sound.blip();
            setTimeout(() => input.focus(), 50);
        }

        function closePalette() {
            backdrop.classList.remove('active');
            input.blur();
        }

        function renderResults() {
            resultsContainer.innerHTML = '';

            let currentGroup = '';
            filteredItems.forEach((item, idx) => {
                if (item.group !== currentGroup) {
                    currentGroup = item.group;
                    const groupTitle = document.createElement('div');
                    groupTitle.className = 'palette-group-title';
                    groupTitle.textContent = currentGroup;
                    resultsContainer.appendChild(groupTitle);
                }

                const row = document.createElement('div');
                row.className = `palette-item ${idx === selectedIndex ? 'active' : ''}`;
                row.innerHTML = `
                    <div class="palette-item-left">
                        <i data-lucide="${item.icon}" style="width:16px; height:16px; color:var(--primary);"></i>
                        <span>${item.label}</span>
                    </div>
                    <i data-lucide="corner-down-left" style="width:14px; height:14px; opacity:0.5;"></i>
                `;

                row.addEventListener('click', () => {
                    executeItem(item);
                });

                resultsContainer.appendChild(row);
            });

            if (window.lucide) window.lucide.createIcons();
        }

        function executeItem(item) {
            closePalette();
            if (item.action) {
                item.action();
            } else if (item.section) {
                const target = document.querySelector(item.section);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }

        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filteredItems = paletteItems.filter(item => item.label.toLowerCase().includes(query) || item.group.toLowerCase().includes(query));
            selectedIndex = 0;
            renderResults();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % Math.max(1, filteredItems.length);
                renderResults();
                sound.tick();
                e.preventDefault();
            } else if (e.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + filteredItems.length) % Math.max(1, filteredItems.length);
                renderResults();
                sound.tick();
                e.preventDefault();
            } else if (e.key === 'Enter') {
                if (filteredItems[selectedIndex]) {
                    executeItem(filteredItems[selectedIndex]);
                }
                e.preventDefault();
            } else if (e.key === 'Escape') {
                closePalette();
            }
        });

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (backdrop.classList.contains('active')) closePalette();
                else openPalette();
            } else if (e.key === 'Escape' && backdrop.classList.contains('active')) {
                closePalette();
            }
        });

        if (openBtn) openBtn.addEventListener('click', openPalette);
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) closePalette();
        });
    }

    // --- QUICK COPY EMAIL ---
    function copyEmail() {
        const email = 'mdmusharaf720@gmail.com';
        navigator.clipboard.writeText(email).then(() => {
            showToast('Copied: mdmusharaf720@gmail.com', '📋');
            triggerConfetti();
        }).catch(() => {
            showToast('Email: mdmusharaf720@gmail.com', '✉️');
        });
    }

    // --- CANVASES CONFETTI TRIGGER ---
    function triggerConfetti() {
        if (window.confetti) {
            window.confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.8 },
                colors: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
            });
        }
    }

    // --- LENIS SMOOTH INERTIA SCROLL ---
    function initSmoothScroll() {
        if (typeof window.Lenis !== 'undefined') {
            const lenis = new window.Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                direction: 'vertical',
                gestureDirection: 'vertical',
                smooth: true,
                mouseMultiplier: 1,
                smoothTouch: false
            });

            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        }
    }

    // --- CONTACT FORM HANDLER ---
    function initContactForm() {
        const form = document.getElementById('portfolio-contact-form');
        if (!form) return;

        form.addEventListener('submit', function (e) {
            sound.success();
            triggerConfetti();
            showToast('Message transmitted successfully! 🚀', '✓');
        });
    }

    // --- HELPER UTILITIES ---
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- KINETIC TEXT SCRAMBLER ---
    function initScrambleText() {
        const glyphs = 'abcdefghijklmnopqrstuvwxyz0123456789_#@%';
        const headers = document.querySelectorAll('.scramble-hover');

        headers.forEach((header) => {
            const original = header.textContent;
            header.addEventListener('mouseenter', () => {
                let iteration = 0;
                const interval = setInterval(() => {
                    header.textContent = original
                        .split('')
                        .map((char, index) => {
                            if (index < iteration) return original[index];
                            if (char === ' ') return ' ';
                            return glyphs[Math.floor(Math.random() * glyphs.length)];
                        })
                        .join('');

                    if (iteration >= original.length) {
                        clearInterval(interval);
                        header.textContent = original;
                    }
                    iteration += 1 / 2;
                }, 25);
            });
        });
    }

    // --- BOOTSTRAP APPLICATION ---
    document.addEventListener('DOMContentLoaded', () => {
        setTheme(state.theme);

        const fluid = new FluidCanvas('fluid-canvas');
        const oscilloscope = new OscilloscopeCanvas('oscilloscope-canvas');
        const matrix = new MatrixRain('matrix-canvas');

        initCustomCursor();
        init3DTilt();
        initTerminal(matrix);
        loadGitHubTelemetry();
        initRepoFilters();
        initCommandPalette(matrix);
        initSmoothScroll();
        initContactForm();
        initScrambleText();

        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) themeBtn.addEventListener('click', cycleTheme);

        const soundBtn = document.getElementById('sound-toggle-btn');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                state.soundEnabled = !state.soundEnabled;
                localStorage.setItem('m7sh_sound_enabled', state.soundEnabled);
                soundBtn.innerHTML = state.soundEnabled ? '<i data-lucide="volume-2"></i> <span>SFX ON</span>' : '<i data-lucide="volume-x"></i> <span>SFX OFF</span>';
                if (window.lucide) window.lucide.createIcons();
                if (state.soundEnabled) sound.success();
                showToast(`Sound FX: ${state.soundEnabled ? 'ENABLED 🔊' : 'MUTED 🔇'}`);
            });
        }

        document.querySelectorAll('.swatch-pill').forEach((swatch) => {
            swatch.addEventListener('click', () => {
                const t = swatch.getAttribute('data-theme-choice');
                if (t) setTheme(t);
            });
        });

        document.querySelectorAll('.copy-email-trigger').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                copyEmail();
            });
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    });

})();
