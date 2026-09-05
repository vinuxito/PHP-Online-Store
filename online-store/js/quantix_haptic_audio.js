/**
 * js2/quantix_haptic_audio.js — Quantix Synthesized Luxury Audio Engine
 * Real-time Web Audio API synthesis without external audio files.
 */

(function(window) {
  let ctx = null;
  let audioEnabled = true;

  function getAudioContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  const QuantixHapticAudio = {
    toggle: function(forceState) {
      if (typeof forceState !== 'undefined') {
        audioEnabled = Boolean(forceState);
      } else {
        audioEnabled = !audioEnabled;
      }
      return audioEnabled;
    },

    isEnabled: function() {
      return audioEnabled;
    },

    // Crisp mechanical precision dial click (Notch sound)
    playDialTick: function() {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;

      try {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, audio.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, audio.currentTime + 0.012);
        gain.gain.setValueAtTime(0.06, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.012);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.012);
      } catch (e) {}
    },

    // Solid vault latch click (Switch ON/OFF)
    playVaultSwitch: function(isOn) {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;

      try {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        const startFreq = isOn ? 280 : 420;
        const endFreq = isOn ? 480 : 160;
        osc.frequency.setValueAtTime(startFreq, audio.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, audio.currentTime + 0.06);
        gain.gain.setValueAtTime(0.09, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.06);
      } catch (e) {}
    },

    // Resonant crystal vacuum seal (Save / Teleport / Aura apply)
    playCrystalChime: function() {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;

      try {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audio.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, audio.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 0.18);
      } catch (e) {}
    },

    // Atmospheric Signature Audio (Custom Web Audio synthesizer for each atmosphere)
    playAtmosphereChime: function(theme) {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;

      try {
        const now = audio.currentTime;
        if (theme === 'gold') {
          [523.25, 659.25, 783.99].forEach((freq, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.03);
            gain.gain.setValueAtTime(0.04, now + idx * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start(now + idx * 0.03);
            osc.stop(now + 0.35);
          });
        } else if (theme === 'cyberpunk') {
          [440, 880, 1760].forEach((freq, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.025);
            gain.gain.setValueAtTime(0.035, now + idx * 0.025);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start(now + idx * 0.025);
            osc.stop(now + 0.22);
          });
        } else if (theme === 'minimalist' || theme === 'light') {
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1480, now);
          osc.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (theme === 'emerald') {
          [440, 554.37, 659.25].forEach((freq, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            gain.gain.setValueAtTime(0.04, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start(now + idx * 0.04);
            osc.stop(now + 0.3);
          });
        } else if (theme === 'amethyst') {
          [392, 587.33, 880].forEach((freq, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.03);
            gain.gain.setValueAtTime(0.045, now + idx * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start(now + idx * 0.03);
            osc.stop(now + 0.38);
          });
        } else if (theme === 'crimson') {
          [261.63, 329.63, 523.25].forEach((freq, idx) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.035);
            gain.gain.setValueAtTime(0.05, now + idx * 0.035);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            osc.connect(gain);
            gain.connect(audio.destination);
            osc.start(now + idx * 0.035);
            osc.stop(now + 0.32);
          });
        } else {
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start(now);
          osc.stop(now + 0.25);
        }
      } catch (e) {}
    },

    playSpecularTick: function() {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;
      try {
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(3200, now);
        osc.frequency.exponentialRampToValueAtTime(4400, now + 0.03);
        gain.gain.setValueAtTime(0.015, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.035);
      } catch (e) {}
    },

    playPrismSlide: function(freqRatio) {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;
      try {
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        const baseFreq = 440 + (freqRatio || 0.5) * 880;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        gain.gain.setValueAtTime(0.012, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } catch (e) {}
    },

    playEssenceDrop: function() {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;
      try {
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(2400, now + 0.08);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      } catch (e) {}
    },

    // Fine precision mechanical ratchet click (Disassembly / Explode step)
    playRatchet: function() {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;
      try {
        const now = audio.currentTime;
        [0, 0.015, 0.03].forEach((delay, idx) => {
          const osc = audio.createOscillator();
          const gain = audio.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(3200 - idx * 400, now + delay);
          gain.gain.setValueAtTime(0.04, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.008);
          osc.connect(gain);
          gain.connect(audio.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.008);
        });
      } catch (e) {}
    },

    // Synesthetic Web Audio signature for finishes
    playFinishChime: function(finishId, customFreq) {
      if (!audioEnabled) return;
      const audio = getAudioContext();
      if (!audio) return;
      try {
        const now = audio.currentTime;
        let freq = customFreq || 528;
        if (finishId === 'obsidian_stealth' || finishId === 'cast_iron_gray') freq = 432;
        else if (finishId === 'liquid_gold' || finishId === 'brass_valve') freq = 528;
        else if (finishId === 'titanium_frost' || finishId === 'danfoss_blue') freq = 639;
        else if (finishId === 'rose_champagne') freq = 741;

        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } catch (e) {}
    }
  };

  window.QuantixHapticAudio = QuantixHapticAudio;
})(window);
