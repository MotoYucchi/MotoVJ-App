// MotoVJ v3 — All Effects Bundle
// Each effect: { create() → { render(ctx, w, h), unmount?() } }
'use strict';
(function() {
  const VJEffects = window.VJEffects = {};

  // ═════════════════════════════════════
  //  VizBars — Frequency bar visualizer
  // ═════════════════════════════════════
  VJEffects['viz-bars'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const barCount = p.barCount || 48;
          const gap = p.gap || 2;
          const mirror = p.mirror ?? 1;
          const glowSize = p.glow || 8;
          const barW = (w / barCount) - gap;
          const fft = VJ.fft.center;

          for (let i = 0; i < barCount; i++) {
            const fi = Math.floor((i / barCount) * 256);
            const val = fft[fi] / 255;
            const barH = val * h * 0.45;
            const hue = (i / barCount) * 120 + VJ.time * 30;
            const color = VJ.baseColor(0.8 + val * 0.2);

            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = glowSize * val;

            const x = i * (barW + gap);
            if (mirror) {
              ctx.fillRect(x, h / 2 - barH, barW, barH);
              ctx.fillRect(x, h / 2, barW, barH);
            } else {
              ctx.fillRect(x, h - barH, barW, barH);
            }
          }
          ctx.shadowBlur = 0;
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  VizCircular — Circular FFT display
  // ═════════════════════════════════════
  VJEffects['viz-circular'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const radius = p.radius || 150;
          const lineW = p.lineWidth || 3;
          const segments = p.segments || 128;
          const cx = w / 2, cy = h / 2;
          const fft = VJ.fft.center;

          ctx.beginPath();
          ctx.lineWidth = lineW;
          ctx.strokeStyle = VJ.baseColor(0.9);
          ctx.shadowColor = VJ.baseColor(0.5);
          ctx.shadowBlur = 10;

          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
            const fi = Math.floor((i / segments) * 256);
            const val = fft[fi] / 255;
            const r = radius + val * radius * 0.6;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  VizWaveform — Audio waveform
  // ═════════════════════════════════════
  VJEffects['viz-waveform'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const amp = p.amplitude || 1;
          const lineW = p.lineWidth || 2;
          const fft = VJ.fft.center;

          ctx.beginPath();
          ctx.lineWidth = lineW;
          ctx.strokeStyle = VJ.baseColor(0.9);
          ctx.shadowColor = VJ.baseColor(0.4);
          ctx.shadowBlur = 8;

          for (let i = 0; i < 256; i++) {
            const x = (i / 256) * w;
            const val = (fft[i] / 255 - 0.5) * amp;
            const y = h / 2 + val * h * 0.4;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  GeoSpiral — Geometric spiral
  // ═════════════════════════════════════
  VJEffects['geo-spiral'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const arms = p.arms || 4;
          const speed = p.speed || 1;
          const spread = p.spread || 0.5;
          const cx = w / 2, cy = h / 2;
          const maxR = Math.min(w, h) * 0.45;
          const bass = VJ.fft.bass;

          ctx.lineWidth = 2;
          ctx.strokeStyle = VJ.baseColor(0.7 + bass * 0.3);
          ctx.shadowColor = VJ.baseColor(0.3);
          ctx.shadowBlur = 6;

          for (let a = 0; a < arms; a++) {
            ctx.beginPath();
            const offset = (a / arms) * Math.PI * 2;
            for (let i = 0; i < 200; i++) {
              const t = i / 200;
              const angle = offset + t * Math.PI * 6 * spread + VJ.time * speed;
              const r = t * maxR * (1 + bass * 0.3);
              const x = cx + Math.cos(angle) * r;
              const y = cy + Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  GeoGrid — Reactive grid pattern
  // ═════════════════════════════════════
  VJEffects['geo-grid'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const cols = p.cols || 12;
          const rows = p.rows || 8;
          const react = p.reactivity || 1;
          const cellW = w / cols, cellH = h / rows;
          const fft = VJ.fft.center;

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const fi = Math.floor((c / cols) * 128 + (r / rows) * 128);
              const val = (fft[fi] || 0) / 255 * react;
              const size = Math.max(2, val * Math.min(cellW, cellH) * 0.8);
              const alpha = 0.2 + val * 0.8;
              const cx = c * cellW + cellW / 2;
              const cy = r * cellH + cellH / 2;

              ctx.fillStyle = VJ.baseColor(alpha);
              ctx.beginPath();
              ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  GeoLines — Reactive lines
  // ═════════════════════════════════════
  VJEffects['geo-lines'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const count = p.count || 10;
          const baseWidth = p.lineWidth || 5;
          const angle = (p.angle || 0) * Math.PI / 180;
          const spread = p.spread || 0.5;
          const bass = VJ.fft.bass;
          
          ctx.save();
          ctx.translate(w/2, h/2);
          ctx.rotate(angle);
          
          const totalW = w * 2;
          
          for(let i=0; i<count; i++) {
            const t = i / Math.max(1, count - 1) - 0.5;
            const yPos = t * h * spread;
            const width = baseWidth * (1 + bass * 2);
            
            ctx.fillStyle = VJ.baseColor(0.5 + bass * 0.5);
            ctx.fillRect(-totalW/2, yPos - width/2, totalW, width);
          }
          
          ctx.restore();
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  PtclBurst — Particle burst
  // ═════════════════════════════════════
  VJEffects['ptcl-burst'] = {
    create() {
      const particles = [];
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const count = p.count || 100;
          const speed = p.speed || 2;
          const size = p.size || 4;
          const life = p.life || 2;
          const bass = VJ.fft.bass;

          // Spawn on beat
          if (bass > 0.6 && particles.length < count) {
            const cx = w / 2, cy = h / 2;
            for (let i = 0; i < 10; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = (0.5 + Math.random()) * speed * 100;
              particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: life,
                maxLife: life,
                size: size * (0.5 + Math.random()),
              });
            }
          }

          // Update & draw
          for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx * VJ.dt;
            pt.y += pt.vy * VJ.dt;
            pt.vx *= 0.98;
            pt.vy *= 0.98;
            pt.life -= VJ.dt;

            if (pt.life <= 0) { particles.splice(i, 1); continue; }

            const alpha = pt.life / pt.maxLife;
            ctx.fillStyle = VJ.baseColor(alpha);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  PtclFire — Fire particles
  // ═════════════════════════════════════
  VJEffects['ptcl-fire'] = {
    create() {
      const particles = [];
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const intensity = p.intensity || 1;
          const fireW = (p.width || 0.5) * w;
          const fireH = (p.height || 0.6) * h;
          const bass = VJ.fft.bass;

          // Spawn
          const spawnCount = Math.floor(3 + bass * intensity * 8);
          for (let i = 0; i < spawnCount; i++) {
            particles.push({
              x: w / 2 + (Math.random() - 0.5) * fireW,
              y: h,
              vy: -(100 + Math.random() * 200) * intensity,
              vx: (Math.random() - 0.5) * 40,
              life: 1 + Math.random(),
              maxLife: 1 + Math.random(),
              size: 3 + Math.random() * 6,
            });
          }

          // Limit
          while (particles.length > 500) particles.shift();

          for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.x += pt.vx * VJ.dt;
            pt.y += pt.vy * VJ.dt;
            pt.vy += 20 * VJ.dt; // slight upward decel
            pt.vx += (Math.random() - 0.5) * 10 * VJ.dt;
            pt.life -= VJ.dt;
            if (pt.life <= 0) { particles.splice(i, 1); continue; }

            const t = 1 - pt.life / pt.maxLife;
            const hue = t * 60; // yellow → red
            const alpha = (1 - t) * 0.8;
            ctx.fillStyle = `hsla(${hue}, 100%, ${50 + t * 20}%, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.size * (1 - t * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  PtclSnow — Snow particles
  // ═════════════════════════════════════
  VJEffects['ptcl-snow'] = {
    create() {
      const flakes = [];
      let initialized = false;
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const count = p.count || 150;
          const speed = p.speed || 1;
          const size = p.size || 3;

          if (!initialized || flakes.length !== count) {
            flakes.length = 0;
            for (let i = 0; i < count; i++) {
              flakes.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: (0.5 + Math.random()) * size,
                speed: (0.3 + Math.random() * 0.7) * speed,
                drift: (Math.random() - 0.5) * 0.5,
              });
            }
            initialized = true;
          }

          for (const f of flakes) {
            f.y += f.speed * 50 * VJ.dt;
            f.x += Math.sin(VJ.time * f.drift * 2) * 20 * VJ.dt;
            if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
            if (f.x < -10) f.x = w + 10;
            if (f.x > w + 10) f.x = -10;

            ctx.fillStyle = VJ.baseColor(0.6 + f.size / size * 0.4);
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  MtnStarfield — Starfield motion
  // ═════════════════════════════════════
  VJEffects['mtn-starfield'] = {
    create() {
      const stars = [];
      let initialized = false;
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const starCount = p.starCount || 300;
          const speed = p.speed || 2;
          const cx = w / 2, cy = h / 2;
          const bass = VJ.fft.bass;

          if (!initialized || stars.length !== starCount) {
            stars.length = 0;
            for (let i = 0; i < starCount; i++) {
              stars.push({
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
                z: Math.random(),
              });
            }
            initialized = true;
          }

          const spd = speed * (1 + bass * 2);
          for (const star of stars) {
            star.z -= spd * VJ.dt * 0.3;
            if (star.z <= 0.001) {
              star.x = (Math.random() - 0.5) * 2;
              star.y = (Math.random() - 0.5) * 2;
              star.z = 1;
            }

            const sx = cx + (star.x / star.z) * w * 0.5;
            const sy = cy + (star.y / star.z) * h * 0.5;
            const size = Math.max(0.5, (1 - star.z) * 3);
            const alpha = (1 - star.z);

            ctx.fillStyle = VJ.baseColor(alpha);
            ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  MtnTunnel — Tunnel effect (pseudo-3D)
  // ═════════════════════════════════════
  VJEffects['mtn-tunnel'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const rings = p.rings || 8;
          const speed = p.speed || 1.5;
          const sides = p.sides || 6;
          const cx = w / 2, cy = h / 2;
          const maxR = Math.min(w, h) * 0.5;
          const bass = VJ.fft.bass;

          ctx.lineWidth = 1.5;

          for (let r = 0; r < rings; r++) {
            const t = ((r / rings) + VJ.time * speed * 0.1) % 1;
            const radius = t * maxR;
            const alpha = (1 - t) * 0.8;

            ctx.strokeStyle = VJ.baseColor(alpha);
            ctx.beginPath();
            for (let s = 0; s <= sides; s++) {
              const angle = (s / sides) * Math.PI * 2 + VJ.time * 0.3;
              const x = cx + Math.cos(angle) * radius * (1 + bass * 0.2);
              const y = cy + Math.sin(angle) * radius * (1 + bass * 0.2);
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  BgPlasma — Plasma background
  // ═════════════════════════════════════
  VJEffects['bg-plasma'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const speed = p.speed || 1;
          const scale = p.scale || 5;
          const complexity = p.complexity || 3;
          const t = VJ.time * speed;
          const step = 8;

          for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
              const nx = x / w * scale, ny = y / h * scale;
              let val = Math.sin(nx + t) + Math.sin(ny + t * 0.7);
              if (complexity >= 2) val += Math.sin(nx + ny + t * 0.5);
              if (complexity >= 3) val += Math.sin(Math.sqrt(nx * nx + ny * ny) + t);
              val = (val + complexity + 1) / (complexity * 2 + 2);
              const hue = val * 360 + t * 30;
              ctx.fillStyle = `hsla(${hue}, 80%, 40%, 0.8)`;
              ctx.fillRect(x, y, step, step);
            }
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  BgGradient — Animated gradient
  // ═════════════════════════════════════
  VJEffects['bg-gradient'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const speed = p.speed || 0.5;
          const sat = p.saturation || 70;
          const light = p.lightness || 25;
          const t = VJ.time * speed;

          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, `hsl(${(t * 60) % 360}, ${sat}%, ${light}%)`);
          grad.addColorStop(0.5, `hsl(${(t * 60 + 120) % 360}, ${sat}%, ${light}%)`);
          grad.addColorStop(1, `hsl(${(t * 60 + 240) % 360}, ${sat}%, ${light}%)`);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  FxStrobe — Strobe flash
  // ═════════════════════════════════════
  VJEffects['fx-strobe'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const rate = p.rate || 10;
          const intensity = p.intensity || 0.8;
          const on = Math.sin(VJ.time * rate * Math.PI) > 0;
          if (on) {
            ctx.fillStyle = `rgba(255,255,255,${intensity})`;
            ctx.fillRect(0, 0, w, h);
          }
        }
      };
    }
  };

  // ═════════════════════════════════════
  //  FxGlitch — Glitch effect (post-process)
  // ═════════════════════════════════════
  VJEffects['fx-glitch'] = {
    create() {
      return {
        render(ctx, w, h) {
          const p = VJ.params;
          const intensity = p.intensity || 0;
          const sliceCount = p.sliceCount || 5;
          const rgbSplit = p.rgbSplit || 0;
          const bw = p.bw || 0;
          const noiseLevel = p.noise || 0;
          const bass = VJ.fft.bass;

          if (bass < 0.1 && intensity === 0) return;
          const amount = intensity + bass * 0.5;

          // B/W filter
          if (bw > 0.5) {
            ctx.filter = 'grayscale(100%)';
            ctx.drawImage(ctx.canvas, 0, 0);
            ctx.filter = 'none';
          }

          // Random horizontal slices
          for (let i = 0; i < sliceCount; i++) {
            const sliceY = Math.random() * h;
            const sliceH = 5 + Math.random() * 50 * amount;
            const offset = (Math.random() - 0.5) * 100 * amount;

            try {
              const imgData = ctx.getImageData(0, Math.floor(sliceY), w, Math.floor(sliceH));
              ctx.putImageData(imgData, Math.floor(offset), Math.floor(sliceY));
            } catch (e) { /* security */ }
          }

          // RGB shift
          if (rgbSplit > 0) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = rgbSplit;
            ctx.drawImage(ctx.canvas, 10 * rgbSplit * amount * 10, 0);
            ctx.drawImage(ctx.canvas, -10 * rgbSplit * amount * 10, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          }

          // Noise
          if (noiseLevel > 0) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.2 * noiseLevel})`;
            ctx.fillRect(0, 0, w, h);
          }
        }
      };
    }
  };

})();
