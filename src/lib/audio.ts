let currentMusic: { osc: OscillatorNode; gain: GainNode; ctx: AudioContext } | null = null;
let currentMusicType: string | null = null;

export const playMusic = (type: 'arcade' | 'casino' | 'gameplay' | 'boss' | 'win' | 'menu') => {
  if (currentMusicType === type) return;
  
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  if (currentMusic) {
    const oldMusic = currentMusic;
    oldMusic.gain.gain.exponentialRampToValueAtTime(0.001, oldMusic.ctx.currentTime + 1);
    setTimeout(() => {
      oldMusic.osc.stop();
      oldMusic.osc.disconnect();
    }, 1000);
  }

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 2);

  const now = ctx.currentTime;
  currentMusicType = type;

  switch (type) {
    case 'menu':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      for (let i = 0; i < 200; i++) {
        const t = now + i * 0.8;
        osc.frequency.setValueAtTime([440, 493.88, 523.25, 392.00][i % 4], t);
      }
      break;
    case 'arcade':
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      for (let i = 0; i < 200; i++) {
        const t = now + i * 0.2;
        osc.frequency.setValueAtTime([150, 200, 250, 300, 200, 150, 100, 150][i % 8], t);
      }
      break;
    case 'casino':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      for (let i = 0; i < 200; i++) {
        const t = now + i * 1.0;
        osc.frequency.setValueAtTime([100, 120, 150, 130, 110, 140][i % 6], t);
      }
      break;
    case 'gameplay':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      for (let i = 0; i < 200; i++) {
        const t = now + i * 0.15;
        osc.frequency.setValueAtTime([200, 250, 300, 220, 280, 240, 260, 210][i % 8], t);
      }
      break;
    case 'boss':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      for (let i = 0; i < 200; i++) {
        const t = now + i * 0.1;
        osc.frequency.setValueAtTime([80, 90, 70, 100, 60, 110][i % 6], t);
      }
      break;
    case 'win':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      for (let i = 0; i < 50; i++) {
        const t = now + i * 0.1;
        osc.frequency.setValueAtTime([523.25, 659.25, 783.99, 1046.50][i % 4], t);
      }
      break;
  }

  osc.start();
  currentMusic = { osc, gain, ctx };
};

export const stopMusic = () => {
  if (currentMusic) {
    currentMusic.gain.gain.exponentialRampToValueAtTime(0.001, currentMusic.ctx.currentTime + 0.5);
    const oldMusic = currentMusic;
    setTimeout(() => {
      oldMusic.osc.stop();
      oldMusic.osc.disconnect();
    }, 500);
    currentMusic = null;
  }
};

export const playSound = (
  typeOrFreq: 'jump' | 'shoot' | 'coin' | 'hit' | 'gameover' | 'win' | number,
  oscType: OscillatorType = 'sine',
  duration: number = 0.1
) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const now = ctx.currentTime;
  
  if (typeof typeOrFreq === 'string') {
    switch (typeOrFreq) {
      case 'jump':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'shoot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'coin':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.setValueAtTime(1600, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'gameover':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'win':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(500, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        osc.frequency.setValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  } else {
    osc.type = oscType;
    osc.frequency.setValueAtTime(typeOrFreq, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }
};
