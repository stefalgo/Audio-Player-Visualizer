// this took a long while to make
// also it is a mess too so yeah

// And the descriptions on the methods are still not done

// Base class
class Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audioCtx = audioCtx;
        this.config = config;
    }

    render() {
        throw new Error('render() must be implemented by subclass');
    }

    /**
     * Set a single configuration property for this renderer
     * @param {string} key - Configuration key
     * @param {*} value - Configuration value
     * @returns {Renderer} Returns this for chaining
     */
    setConfig(key, value) {
        this.config[key] = value;
        return this;
    }

    /**
     * Set multiple configuration properties at once
     * @param {Object} configObj - Object with config key-value pairs
     * @returns {Renderer} Returns this for chaining
     */
    setConfigs(configObj) {
        Object.assign(this.config, configObj);
        return this;
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Configuration value
     */
    getConfig(key, defaultValue = undefined) {
        return this.config.hasOwnProperty(key) ? this.config[key] : defaultValue;
    }

    /**
     * Merge configs (deep merge for nested objects)
     * @param {Object} configObj - Object with config key-value pairs to merge
     * @returns {Renderer} Returns this for chaining
     */
    mergeConfigs(configObj) {
        for (const key in configObj) {
            if (typeof this.config[key] === 'object' && typeof configObj[key] === 'object' && !Array.isArray(configObj[key])) {
                Object.assign(this.config[key], configObj[key]);
            } else {
                this.config[key] = configObj[key];
            }
        }
        return this;
    }
}

// bar render
class BarRenderer extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);
        this.sensitivity = config.sensitivity || 2;
        this.maxFrequency = config.maxFrequency || 16000;
    }

    /**
     * Main render method
     * @param {Uint8Array} data - Frequency data
     * @param {AnalyserNode} analyser - Analyser node
     * @param {number} sensitivity - Custom sensitivity value
     * @param {number} maxFrequency - Custom max frequency
     */
    render(data, analyser, sensitivity = this.sensitivity, maxFrequency = this.maxFrequency) {
        const localCtx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        localCtx.clearRect(0, 0, cw, ch);

        const binWidth = this.audioCtx.sampleRate / analyser.fftSize;
        const minIndex = Math.floor(1 / binWidth);
        const maxIndex = Math.min(Math.ceil(maxFrequency / binWidth), data.length - 1);

        const slicedData = data.subarray(minIndex, maxIndex);
        const len = slicedData.length || 1;
        const barW = cw / len;

        let x = 0;
        for (let i = 0; i < len; i++) {
            const v = slicedData[i];
            const h = v * sensitivity;

            const ratio = i / len;
            const r = Math.min(255, Math.floor(h + 25 * ratio));
            const g = Math.min(255, Math.floor(250 * ratio));

            localCtx.fillStyle = 'rgb(' + r + ',' + g + ',50)';
            localCtx.fillRect(x, ch - h, barW, h);

            x += barW + 1;
        }
    }
}

// Waterfall render
class WaterfallRenderer extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);
        this.sensitivity = config.sensitivity || 2;
        this.maxFrequency = config.maxFrequency || 16000;
        this.analyserSmoothing = config.analyserSmoothing || 0.8;
    }

    /**
     * Waterfall render method
     * @param {Uint8Array} data - Frequency data
     * @param {AnalyserNode} analyser - Analyser node
     * @param {number} sensitivity - Custom sensitivity
     * @param {number} maxFrequency - Custom max frequency
     */
    render(data, analyser, sensitivity = this.sensitivity, maxFrequency = this.maxFrequency, analyserSmoothing = this.analyserSmoothing) {
        try {
            this.ctx.drawImage(this.canvas, -1, 0);
        } catch (e) {
            const img = this.ctx.getImageData(1, 0, this.canvas.width - 1, this.canvas.height);
            this.ctx.putImageData(img, 0, 0);
        }

        const sr = this.audioCtx.sampleRate;
        const nyq = sr / 2;
        const lowerFrex = 1;
        const heigherFrex = maxFrequency;

        analyser.smoothingTimeConstant = analyserSmoothing;

        const minI = Math.floor(lowerFrex / nyq * data.length);
        const maxI = Math.floor(heigherFrex / nyq * data.length);

        for (let y = 0; y <= this.canvas.height; y++) {
            const idx = minI + Math.floor((y / this.canvas.height) * (maxI - minI));
            const v = data[idx];
            const a = v / 255;

            const baseR = v * sensitivity + 25 * (idx / data.length);
            const baseG = 250 * (idx / data.length);

            const r = Math.min(255, baseR * a);
            const g = Math.min(255, baseG * a);

            this.ctx.fillStyle = `rgb(${r},${g},50)`;
            this.ctx.fillRect(this.canvas.width - 1, this.canvas.height - y, 1, 1);
        }
    }
}

// Wave render or something like that
class WaveRenderer extends Renderer {
    /**
     * Wave render method
     * @param {Uint8Array|Float32Array} data - Time domain data
     * @param {AnalyserNode} analyser - Analyser node
     */
    render(data, analyser) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.beginPath();
        const sliceW = this.canvas.width / data.length;

        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = v * this.canvas.height / 2;
            const x = i * sliceW;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }

        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
}

// I saw a video with someone using some old oscilloscope and played sound on it
// so i made this
class SoundTraceRenderer extends Renderer {
    constructor(...args) {
        super(...args);

        this.phosphorCanvas = document.createElement('canvas');
        this.phosphorCtx = this.phosphorCanvas.getContext('2d');

        this.decay = 0.88;
        this.curvature = 0.05;

        this.timeDiv = 0.01;
        this.voltsDiv = 1.0;

        // bandwidth filter
        this._lpL = 0;
        this._lpR = 0;
        this.bandwidth = 0.5; //0.15 / 0 = smooth 1 = raw

        this.triggerLevel = 0;
        this.maxPoints = 2000;

        // noise
        this._seed = 1;

        this._gridCache = null;
    }

    noise() {
        this._seed = (this._seed * 1664525 + 1013904223) | 0;
        return ((this._seed >>> 0) / 4294967295) - 0.5;
    }

    filterSample(l, r) {
        const a = this.bandwidth;
        this._lpL = this._lpL + a * (l - this._lpL);
        this._lpR = this._lpR + a * (r - this._lpR);
        return [this._lpL, this._lpR];
    }

    resize() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (!w || !h) return;
        this.phosphorCanvas.width = w;
        this.phosphorCanvas.height = h;
        this._buildGridCache();
    }

    _buildGridCache() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (!w || !h) return;
        const off = document.createElement('canvas');
        off.width = w;
        off.height = h;
        const g = off.getContext('2d');
        const cx = w * 0.5;
        const cy = h * 0.5;
        const scale = Math.min(cx, cy) * 0.9;
        const major = 10;
        const minor = 5;

        g.fillStyle = 'rgba(0,255,140,0.06)';

        for (let i = 0; i <= major; i++) {
            const t = i / major;

            const x = cx - scale + t * scale * 2;
            const y = cy - scale + t * scale * 2;

            g.fillRect(x, cy - scale, 1, scale * 2);
            g.fillRect(cx - scale, y, scale * 2, 1);
        }

        g.fillStyle = 'rgba(0,255,140,0.02)';

        for (let i = 0; i <= major * minor; i++) {
            const t = i / (major * minor);

            const x = cx - scale + t * scale * 2;
            const y = cy - scale + t * scale * 2;

            g.fillRect(x, cy - scale, 1, scale * 2);
            g.fillRect(cx - scale, y, scale * 2, 1);
        }

        g.fillStyle = 'rgba(0,255,140,0.18)';
        g.fillRect(cx - scale, cy - 1, scale * 2, 2);
        g.fillRect(cx - 1, cy - scale, 2, scale * 2);

        this._gridCache = off;
    }

    findTrigger(data) {
        for (let i = 1; i < data.length; i++) {
            if (data[i - 1] < this.triggerLevel && data[i] >= this.triggerLevel) {
                return i;
            }
        }
        return 0;
    }

    render(dataL, dataR) {
        if (!dataL || !dataR) return;

        const ctx = this.ctx;
        const pctx = this.phosphorCtx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (!w || !h) return;
        const cx = w * 0.5;
        const cy = h * 0.5;
        const scale = Math.min(cx, cy) * 0.9;

        if (this.phosphorCanvas.width !== w || this.phosphorCanvas.height !== h) {
            this.phosphorCanvas.width = w;
            this.phosphorCanvas.height = h;
            this._buildGridCache();
        }

        const sampleRate = this.audioCtx.sampleRate;
        const windowSize = (sampleRate * this.timeDiv) | 0;

        let start = this.findTrigger(dataL);
        if (start + windowSize > dataL.length) start = 0;

        pctx.globalCompositeOperation = 'source-over';
        pctx.fillStyle = `rgba(0,0,0,${1 - this.decay})`;
        pctx.fillRect(0, 0, w, h);

        pctx.globalCompositeOperation = 'source-over';
        if (this._gridCache) {
            pctx.drawImage(this._gridCache, 0, 0);
        }

        pctx.globalCompositeOperation = 'lighter';
        pctx.beginPath();

        const step = Math.max(1, (windowSize / this.maxPoints) | 0);
        const gain = this.voltsDiv * 2.0;
        let x, y, px, py;

        for (let i = start; i < start + windowSize; i += step) {
            const l = dataL[i] * gain;
            const r = dataR[i] * gain;
            const [fl, fr] = this.filterSample(l, r);

            x = fl * scale;
            y = -fr * scale;

            const dx = (cx + x - cx) / cx;
            const dy = (cy + y - cy) / cy;
            const f = 1 + this.curvature * (dx * dx + dy * dy);

            px = cx + dx * cx * f;
            py = cy + dy * cy * f;

            px += this.noise() * 0.2;
            py += this.noise() * 0.2;

            if (i === start) pctx.moveTo(px, py);
            else pctx.lineTo(px, py);
        }

        pctx.strokeStyle = 'rgba(0,255,140,0.25)';
        pctx.lineWidth = 1.2;
        pctx.stroke();

        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(this.phosphorCanvas, 0, 0);

        const g = ctx.createRadialGradient(cx, cy, scale * 0.2, cx, cy, scale);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.72)');

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }
}


// Full waveform
// THIS IS NOT OPTIMIZED
class FullWaveformRenderer extends Renderer {
    /**
     * Full Waveform render method
     * @param {AudioBuffer} buffer - Audio buffer
     * @param {number} time - Current playback time
     */
    render(buffer, time) {
        if (!buffer) return;

        time = time / buffer.duration;

        const width = this.canvas.width;
        const height = this.canvas.height;
        const L = buffer.getChannelData(0);
        const R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;

        this.ctx.clearRect(0, 0, width, height);
        this.ctx.beginPath();

        const samplesPerPixel = Math.floor(L.length / width);
        const padding = 10;
        const laneHeight = R ? (height - padding * 3) / 2 : height - padding * 2;
        const centerL = padding + laneHeight / 2;
        const centerR = R ? padding * 2 + laneHeight * 1.5 : null;
        const scale = laneHeight / 2;

        for (let x = 0; x < width; x++) {
            const start = x * samplesPerPixel;
            const end = start + samplesPerPixel;

            let minL = 1, maxL = -1;
            for (let i = start; i < end && i < L.length; i++) {
                const s = L[i];
                if (s < minL) minL = s;
                if (s > maxL) maxL = s;
            }

            this.ctx.moveTo(x, centerL + minL * scale);
            this.ctx.lineTo(x, centerL + maxL * scale);

            if (R) {
                let minR = 1, maxR = -1;
                for (let i = start; i < end && i < R.length; i++) {
                    const s = R[i];
                    if (s < minR) minR = s;
                    if (s > maxR) maxR = s;
                }

                this.ctx.moveTo(x, centerR + minR * scale);
                this.ctx.lineTo(x, centerR + maxR * scale);
            }
        }

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        const x = time * this.canvas.width;

        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);

        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
}

// Retro audio spectrum visualizer thing
class RetroRenderer extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);

        this.config = config;
        this.peakHold = null;
        this.peakTimer = null;

        this.VIS_MIN_DB = config.visMinDb ?? -90;
        this.VIS_MAX_DB = config.visMaxDb ?? -20;
    }

    render(floatData, analyser) {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        const BANDS = this.config.retroCenterFreqs.length;
        const LEDS = 50;
        const nyquist = analyser.context.sampleRate / 2;
        const moduleW = cw / BANDS;
        const padX = 10;
        const headerH = 22;
        const dBGutter = 30;
        const ledAreaH = ch - headerH;
        const ledH = ledAreaH / LEDS;
        if (!this.peakHold) this.peakHold = new Array(BANDS).fill(0);

        if (!this.peakTimer) this.peakTimer = new Array(BANDS).fill(0);

        const ratioPow = Math.pow(2, 1 / 6);
        const now = performance.now();

        for (let i = 0; i < BANDS; i++) {
            const fCenter = this.config.retroCenterFreqs[i];
            const fLow = Math.max(20, fCenter / ratioPow);
            const fHigh = Math.min(16000, fCenter * ratioPow);
            const iLow = Math.floor((fLow / nyquist) * floatData.length);
            const iHigh = Math.floor((fHigh / nyquist) * floatData.length);
            const value = AudioBands.processBand(
                floatData,
                iLow,
                iHigh,
                this.VIS_MIN_DB,
                this.VIS_MAX_DB
            );

            const level = Math.floor(value * LEDS);

            AudioBands.peakHoldUpdate({
                level,
                holdArray: this.peakHold,
                timerArray: this.peakTimer,
                index: i,
                now,
                holdTime: 700,
                releaseSpeed: 0.3
            });

            const peakLevel = Math.floor(this.peakHold[i]);
            const x = i * moduleW;
            const ledX = x + padX;
            const ledW = moduleW - padX * 2 - dBGutter;

            ctx.fillStyle = "rgba(18,18,18,0.45)";
            ctx.fillRect(x + 2, 0, moduleW - 4, ch);

            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.strokeRect(x + 2, 0, moduleW - 4, ch);

            ctx.fillStyle = "rgba(230,230,230,0.85)";
            ctx.font = "10px monospace";
            ctx.fillText(`${fCenter} Hz`, ledX, 14);

            for (let l = 0; l < LEDS; l++) {
                const y = headerH + ledAreaH - (l + 1) * ledH;
                const active = l < level || l === peakLevel;
                const norm = l / LEDS;

                let r = 0, g = 255, b = 70;

                if (norm > 0.6) {
                    r = 255;
                    g = Math.floor(255 * (1 - norm));
                } else if (norm > 0.3) {
                    r = Math.floor(255 * norm);
                    g = 255;
                }

                ctx.fillStyle = active ? `rgb(${r},${g},${b})` : "rgba(25,25,25,0.35)";
                ctx.fillRect(ledX, y + 1, ledW, ledH - 3);
            }

            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.font = "9px monospace";

            const range = this.VIS_MAX_DB - this.VIS_MIN_DB;
            const dbStep = 10;
            const startDb = Math.ceil(this.VIS_MIN_DB / dbStep) * dbStep;
            const endDb = Math.floor(this.VIS_MAX_DB / dbStep) * dbStep;

            for (let dbMark = startDb; dbMark <= endDb; dbMark += dbStep) {

                const norm = (dbMark - this.VIS_MIN_DB) / (this.VIS_MAX_DB - this.VIS_MIN_DB);
                const ledIndex = Math.round(norm * (LEDS - 1));
                const y = headerH + ledAreaH - (ledIndex + 0.5) * ledH;

                ctx.fillText(
                    dbMark.toString(),
                    x + moduleW - 28,
                    y + 3
                );
            }
        }
    }
}

// Testing some stuff
class VideoRender extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);
        this.lastHardSync = 0;
    }

    render(videoEl) {
        if (!videoEl || !buffer) return;
        const elapsed = getElapsedTime();
        const drift = videoEl.currentTime - elapsed;

        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (
            Math.abs(drift) > 0.25 && // 0.10
            performance.now() - this.lastHardSync > 500 // 300
        ) {
            videoEl.currentTime = elapsed;
            this.lastHardSync = performance.now();
        }

        if (audioCtx.state === "running") {
            if (videoEl.paused) {
                videoEl.play().catch(() => { });
            }
        } else {
            if (!videoEl.paused) {
                videoEl.pause();
            }
        }

        if (videoEl.readyState < 2) return;

        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const videoW = videoEl.videoWidth;
        const videoH = videoEl.videoHeight;
        const scale = canvasH / videoH;
        const drawW = videoW * scale;
        const offsetX = (canvasW - drawW) / 2;

        this.ctx.drawImage(videoEl, offsetX, 0, drawW, canvasH);
    }
}

// Render handler
class RenderHandler {
    constructor(canvas, ctx, audioCtx, config = {}) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.audioCtx = audioCtx;
        this.config = config;

        this.renderers = {
            bar: new BarRenderer(canvas, ctx, audioCtx, config),
            waterfall: new WaterfallRenderer(canvas, ctx, audioCtx, config),
            wave: new WaveRenderer(canvas, ctx, audioCtx, config),
            soundTrace: new SoundTraceRenderer(canvas, ctx, audioCtx, config),
            fullWaveform: new FullWaveformRenderer(canvas, ctx, audioCtx, config),
            retro: new RetroRenderer(canvas, ctx, audioCtx, config),
            video: new VideoRender(canvas, ctx, audioCtx, config),
        };

        this.bar = this.renderers.bar;
        this.waterfall = this.renderers.waterfall;
        this.wave = this.renderers.wave;
        this.soundTrace = this.renderers.soundTrace;
        this.fullWaveform = this.renderers.fullWaveform;
        this.retro = this.renderers.retro;
        this.video = this.renderers.video;
    }

    /**
     * Get a specific renderer by name
     * @param {string} name - Name of the renderer
     * @returns {Renderer} The requested renderer
     */
    getRenderer(name) {
        return this.renderers[name];
    }

    /**
     * Get list of available renderers
     */
    getAvailableRenderers() {
        return Object.keys(this.renderers);
    }
}
