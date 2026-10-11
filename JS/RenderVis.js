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
        if (this.config[key] !== value) {
            this.config[key] = value
            return this;
        } else {
            return
        };
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
        this.minFrequency = 20;
        this.spectrumLevels = new Float32Array(0);
    }

    /**
     * Main render method
     * @param {Uint8Array} data - Frequency data
     * @param {AnalyserNode} analyser - Analyser node
     * @param {number} sensitivity - Custom sensitivity value
     * @param {number} maxFrequency - Custom max frequency
     */
    render(data, analyser, sensitivity = this.sensitivity, maxFrequency = this.maxFrequency) {
        const { canvas, ctx } = this;
        const width = canvas.width;
        const height = canvas.height;
        const sampleRate = this.audioCtx?.sampleRate || 0;
        if (!width || !height || !data?.length || !sampleRate || !analyser?.fftSize) return;

        const left = Math.min(58, width * 0.2);
        const right = width - Math.min(18, width * 0.05);
        const top = Math.min(24, height * 0.08);
        const bottom = height - Math.min(34, height * 0.12);
        const plotWidth = Math.max(1, right - left);
        const plotHeight = Math.max(1, bottom - top);
        const nyquist = sampleRate / 2;
        const minFrequency = Math.min(this.minFrequency, nyquist / 2);
        const maxHz = Math.max(minFrequency * 1.01, Math.min(Number(maxFrequency) || this.maxFrequency, nyquist));
        const binWidth = sampleRate / analyser.fftSize;
        const lowDb = Number.isFinite(analyser.minDecibels) ? analyser.minDecibels : -100;
        const highDb = Number.isFinite(analyser.maxDecibels) ? analyser.maxDecibels : -30;
        const gainDb = 20 * Math.log10(Math.max(0.01, Number(sensitivity) || 1));
        const displayFloorDb = -90;
        const displayRangeDb = 90;
        const logMin = Math.log(minFrequency);
        const logRange = Math.log(maxHz) - logMin;
        const sampleCount = Math.ceil(plotWidth);
        if (this.spectrumLevels.length !== sampleCount + 1) {
            this.spectrumLevels = new Float32Array(sampleCount + 1);
        }

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#080d13";
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.font = "10px sans-serif";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 1;
        for (let division = 0; division <= 3; division++) {
            const ratio = division / 3;
            const y = top + ratio * plotHeight;
            const db = -displayRangeDb * ratio;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.strokeStyle = division === 3
                ? "rgba(185, 205, 220, 0.25)"
                : "rgba(185, 205, 220, 0.11)";
            ctx.stroke();
            ctx.fillStyle = "#8293a1";
            ctx.textAlign = "right";
            ctx.fillText(`${db} dB`, left - 8, y);
        }

        const firstDecade = Math.floor(Math.log10(minFrequency));
        const lastDecade = Math.ceil(Math.log10(maxHz));
        for (let decade = firstDecade; decade <= lastDecade; decade++) {
            const decadeHz = 10 ** decade;
            for (let multiple = 1; multiple <= 9; multiple++) {
                const frequency = multiple * decadeHz;
                if (frequency < minFrequency || frequency > maxHz) continue;
                const isMajor = multiple === 1;
                const isLabeled = isMajor || multiple === 2 || multiple === 5;
                const x = Math.round(left + ((Math.log(frequency) - logMin) / logRange) * plotWidth) + 0.5;
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, bottom);
                ctx.strokeStyle = isMajor
                    ? "rgba(185, 205, 220, 0.3)"
                    : multiple === 2 || multiple === 5
                        ? "rgba(185, 205, 220, 0.18)"
                        : "rgba(185, 205, 220, 0.07)";
                ctx.lineWidth = isMajor ? 1.25 : 1;
                ctx.stroke();
                if (!isLabeled) continue;

                ctx.fillStyle = "#8293a1";
                ctx.textBaseline = "top";
                const label = frequency >= 1000
                    ? `${frequency / 1000} kHz`
                    : `${frequency} Hz`;
                ctx.textAlign = Math.abs(x - left) < 12
                    ? "left"
                    : Math.abs(right - x) < 12
                        ? "right"
                        : "center";
                ctx.fillText(label, x, bottom + 8);
            }
        }

        for (let column = 0; column <= sampleCount; column++) {
            const ratio = column / sampleCount;
            const frequency = Math.exp(logMin + ratio * logRange);
            const bin = Math.max(0, Math.min(data.length - 1, frequency / binWidth));
            const lowerBin = Math.floor(bin);
            const upperBin = Math.min(data.length - 1, lowerBin + 1);
            const amount = bin - lowerBin;
            const value = data[lowerBin] * (1 - amount) + data[upperBin] * amount;
            const db = lowDb + (value / 255) * (highDb - lowDb) + gainDb;
            const level = Math.max(0, Math.min(1, (db - displayFloorDb) / displayRangeDb));
            this.spectrumLevels[column] = level;
        }

        ctx.beginPath();
        for (let column = 0; column <= sampleCount; column++) {
            const x = left + (column / sampleCount) * plotWidth;
            const y = bottom - this.spectrumLevels[column] * plotHeight;
            if (column === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.lineTo(right, bottom);
        ctx.lineTo(left, bottom);
        ctx.closePath();
        ctx.fillStyle = "rgba(215, 166, 106, 0.12)";
        ctx.fill();

        ctx.beginPath();
        for (let column = 0; column <= sampleCount; column++) {
            const x = left + (column / sampleCount) * plotWidth;
            const y = bottom - this.spectrumLevels[column] * plotHeight;
            if (column === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = "#d7b27f";
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
    }
}

// Waterfall render
class WaterfallRenderer extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);
        this.sensitivity = config.sensitivity || 2;
        this.maxFrequency = config.maxFrequency || 16000;
        this.analyserSmoothing = config.analyserSmoothing || 0.8;
        this.historyCanvas = document.createElement("canvas");
        this.historyCtx = this.historyCanvas.getContext("2d");
        this.overviewCanvas = document.createElement("canvas");
        this.overviewCtx = this.overviewCanvas.getContext("2d");
        this.overviewCanvas.width = 160 * 1.5;
        this.overviewCanvas.height = 72 * 1.5;
        this.overviewDirty = true;
        this.historyFilled = 0;
        this.historySeconds = 120;
        this.visibleSeconds = 30;
        this.zoom = 1;
        this.panSeconds = 0;
        this.dbFloor = -90;
        this.dbRange = 60;
        this.contrast = 1.4;
        this.frozen = false;
        this.peakHoldEnabled = false;
        this.showEdgeSpectrum = true;
        this.panLocked = false;
        this.showMap = 1;
        this.plotLeft = 54;
        this.plotPaddingLeft = 20;
        this.plotPaddingRight = 48;
        this.plotTop = 24;
        this.plotBottom = 26;
        this.minFrequency = 20;
        this.axisWidth = this.plotLeft;
        this.plotStart = this.plotLeft + this.plotPaddingLeft;
        this.plotWidth = 1;
        this.headerHeight = this.plotTop;
        this.frequencyViewMin = null;
        this.frequencyViewMax = null;
        this.lastTime = null;
        this.historySampleRate = 0;
        this.historyTopFrequency = 0;
        this.scrollRemainder = 0;
        this.pointer = null;
        this.dragStart = null;
        this.overviewBounds = null;
        this.isActive = false;
        this.peakLevels = null;
        this.peakPositions = null;
        this.colorStops = [
            [0.04, 9, 15, 30],
            [0.12, 20, 47, 92],
            [0.28, 22, 120, 165],
            [0.48, 37, 190, 165],
            [0.68, 240, 207, 91],
            [0.86, 255, 128, 58],
            [1, 255, 245, 220]
        ];
        this._bindInteractions();
    }

    _bindInteractions() {
        const canvas = this.canvas;
        canvas.addEventListener("pointermove", event => {
            const rect = canvas.getBoundingClientRect();
            this.pointer = {
                x: (event.clientX - rect.left) * canvas.width / rect.width,
                y: (event.clientY - rect.top) * canvas.height / rect.height
            };
            if (this.dragStart && this.isActive) {
                if (!this.panLocked) {
                    if (this.dragStart.mode === "overview") {
                        this._panFromOverview(this.pointer.x, this.pointer.y, this.dragStart);
                    } else {
                        const deltaX = this.pointer.x - this.dragStart.x;
                        const deltaY = this.pointer.y - this.dragStart.y;
                        this.panSeconds = this._clampPan(this.dragStart.panSeconds + deltaX / Math.max(1, this.plotWidth) * this._visibleSpan());
                        const frequencyShift = deltaY / Math.max(1, this.plotHeight) * this.dragStart.frequencySpan;
                        [this.frequencyViewMin, this.frequencyViewMax] = this._clampFrequencyView(
                            this.dragStart.frequencyMin + frequencyShift,
                            this.dragStart.frequencyMax + frequencyShift,
                            this.dragStart.baseMin,
                            this.dragStart.baseMax
                        );
                    }
                }
                this.overviewDirty = true;
            }
            this._updateCursor();
        });
        canvas.addEventListener("pointerleave", () => {
            if (!this.dragStart) {
                this.pointer = null;
                this._updateCursor();
            }
        });
        canvas.addEventListener("pointerdown", event => {
            if (!this.isActive || this.panLocked || event.button !== 0) return;
            const rect = canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) * canvas.width / rect.width;
            const y = (event.clientY - rect.top) * canvas.height / rect.height;
            const bounds = this.overviewBounds;
            if (bounds && x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
                const viewport = bounds.viewport;
                const insideViewport = x >= viewport.x && x <= viewport.x + viewport.width &&
                    y >= viewport.y && y <= viewport.y + viewport.height;
                this.dragStart = {
                    mode: "overview",
                    offsetX: insideViewport ? x - (viewport.x + viewport.width / 2) : 0,
                    offsetY: insideViewport ? y - (viewport.y + viewport.height / 2) : 0,
                    bounds,
                    visibleSpan: this._visibleSpan(),
                    frequencySpan: (this.frequencyViewMax ?? this.baseMaxFrequency) -
                        (this.frequencyViewMin ?? this.baseMinFrequency),
                    baseMin: this.baseMinFrequency,
                    baseMax: this.baseMaxFrequency
                };
                canvas.style.cursor = "grabbing";
                canvas.setPointerCapture(event.pointerId);
                this._panFromOverview(x, y, this.dragStart);
                this._updateCursor();
                return;
            }
            this.dragStart = {
                x,
                y,
                panSeconds: this.panSeconds
            };
            this.dragStart.frequencyMin = this.frequencyViewMin ?? this.baseMinFrequency;
            this.dragStart.frequencyMax = this.frequencyViewMax ?? this.baseMaxFrequency;
            this.dragStart.frequencySpan = this.dragStart.frequencyMax - this.dragStart.frequencyMin;
            this.dragStart.baseMin = this.baseMinFrequency;
            this.dragStart.baseMax = this.baseMaxFrequency;
            this._updateCursor();
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener("pointerup", event => {
            this.dragStart = null;
            this._updateCursor();
            if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        });
        canvas.addEventListener("pointercancel", () => {
            this.dragStart = null;
            this._updateCursor();
        });
        canvas.addEventListener("wheel", event => {
            if (!this.isActive) return;
            const rect = canvas.getBoundingClientRect();
            const pointerX = (event.clientX - rect.left) * canvas.width / rect.width;
            const pointerY = (event.clientY - rect.top) * canvas.height / rect.height;
            if (
                pointerX < this.plotStart || pointerX > this.plotRight ||
                pointerY < this.headerHeight || pointerY > this.headerHeight + this.plotHeight
            ) return;

            event.preventDefault();
            const zoomFactor = event.deltaY < 0 ? 1.25 : 0.8;
            const overview = this.overviewBounds;
            const overOverview = this._isPointerOverOverview(pointerX, pointerY);
            const currentMin = this.frequencyViewMin ?? this.baseMinFrequency;
            const currentMax = this.frequencyViewMax ?? this.baseMaxFrequency;
            if (event.shiftKey) {
                const currentRange = currentMax - currentMin;
                const anchorY = this.panLocked
                    ? 1
                    : overOverview
                        ? (pointerY - overview.y) / overview.height
                        : (pointerY - this.headerHeight) / Math.max(1, this.plotHeight);
                const anchorFrequency = this.panLocked
                    ? currentMin
                    : overOverview
                        ? overview.topFrequency - anchorY * (overview.topFrequency - overview.minFrequency)
                        : currentMax - anchorY * currentRange;
                const nextRange = currentRange / zoomFactor;
                [this.frequencyViewMin, this.frequencyViewMax] = this._clampFrequencyView(
                    anchorFrequency - (1 - anchorY) * nextRange,
                    anchorFrequency + anchorY * nextRange,
                    this.baseMinFrequency,
                    this.baseMaxFrequency
                );
            } else {
                const currentSpan = this._visibleSpan();
                const anchorX = this.panLocked
                    ? 1
                    : overOverview
                        ? (pointerX - overview.x) / overview.width
                        : (pointerX - this.plotStart) / Math.max(1, this.plotWidth);
                const anchorTime = this.panLocked
                    ? this.panSeconds
                    : overOverview
                        ? (1 - anchorX) * this.historySeconds
                        : this.panSeconds + (1 - anchorX) * currentSpan;
                this.zoom = Math.max(1, Math.min(64, this.zoom * zoomFactor));
                const nextSpan = this._visibleSpan();
                this.panSeconds = this._clampPan(anchorTime - (1 - anchorX) * nextSpan);
            }
            this.overviewDirty = true;
        }, { passive: false });
    }

    _panFromOverview(pointerX, pointerY, drag) {
        const { bounds, visibleSpan, frequencySpan, baseMin, baseMax, offsetX, offsetY } = drag;
        const centerX = Math.max(0, Math.min(bounds.width, pointerX - bounds.x - offsetX));
        const centerY = Math.max(0, Math.min(bounds.height, pointerY - bounds.y - offsetY));
        const centerTimeRatio = centerX / bounds.width;
        this.panSeconds = this._clampPan(
            this.historySeconds - centerTimeRatio * this.historySeconds - visibleSpan / 2
        );

        const baseRange = baseMax - baseMin;
        const centerFrequency = baseMax - (centerY / bounds.height) * baseRange;
        [this.frequencyViewMin, this.frequencyViewMax] = this._clampFrequencyView(
            centerFrequency - frequencySpan / 2,
            centerFrequency + frequencySpan / 2,
            baseMin,
            baseMax
        );
    }

    _updateCursor() {
        if (!this.isActive) {
            this.canvas.style.cursor = "";
            return;
        }
        if (this.dragStart) {
            this.canvas.style.cursor = "grabbing";
            return;
        }
        const overOverview = !this.panLocked && this.pointer &&
            this._isPointerOverOverview(this.pointer.x, this.pointer.y);
        this.canvas.style.cursor = overOverview ? "grab" : "crosshair";
    }

    _isPointerOverOverview(x, y) {
        const bounds = this.overviewBounds;
        return !!bounds &&
            x >= bounds.x && x <= bounds.x + bounds.width &&
            y >= bounds.y && y <= bounds.y + bounds.height;
    }

    setPanLocked(locked) {
        this.panLocked = Boolean(locked);
        if (this.panLocked) this.dragStart = null;
        this._updateCursor();
    }

    _visibleSpan() {
        return Math.min(this.historySeconds, this.visibleSeconds / Math.max(1, this.zoom));
    }

    _clampPan(value) {
        const panSeconds = Number.isFinite(value) ? value : 0;
        return Math.max(0, Math.min(this.historySeconds - this._visibleSpan(), panSeconds));
    }

    _clampFrequencyView(minFrequency, maxFrequency, baseMin, baseMax) {
        const baseRange = Math.max(1, baseMax - baseMin);
        const minRange = Math.max(1, baseRange / 16);
        const range = Math.min(baseRange, Math.max(minRange, maxFrequency - minFrequency));
        const min = Math.max(baseMin, Math.min(baseMax - range, minFrequency));
        return [min, min + range];
    }

    setActive(active) {
        this.isActive = active;
        this._updateCursor();
    }

    clearHistory() {
        if (this.historyCtx && this.historyCanvas.width && this.historyCanvas.height) {
            this.historyCtx.clearRect(0, 0, this.historyCanvas.width, this.historyCanvas.height);
        }
        this.peakLevels?.fill(0);
        this.peakPositions?.fill(-1);
        this.lastTime = null;
        this.scrollRemainder = 0;
        this.historyHead = 0;
        this.historyFilled = 0;
        this.overviewDirty = true;
        this.panSeconds = 0;
    }

    /**
     * Waterfall render method
     * @param {Uint8Array} data - Frequency data
     * @param {AnalyserNode} analyser - Analyser node
     * @param {number} sensitivity - Custom sensitivity
     * @param {number} maxFrequency - Custom max frequency
     */
    render(data, analyser, sensitivity = this.sensitivity, maxFrequency = this.maxFrequency, analyserSmoothing = this.analyserSmoothing, playbackTime = performance.now() / 1000) {
        const { canvas, ctx, historyCanvas, historyCtx } = this;
        const width = canvas.width;
        const height = canvas.height;
        if (!width || !height || !data?.length || !historyCtx) return;

        const axisWidth = Math.min(this.plotLeft, Math.max(34, width * 0.14));
        const headerHeight = Math.min(this.plotTop, Math.max(18, height * 0.08));
        const footerHeight = Math.min(this.plotBottom, Math.max(18, height * 0.08));
        const plotStart = Math.min(width - 1, axisWidth + this.plotPaddingLeft);
        const plotRight = Math.max(plotStart + 1, width - this.plotPaddingRight);
        const nextPlotWidth = plotRight - plotStart;
        const nextPlotHeight = Math.max(1, height - headerHeight - footerHeight);
        this.axisWidth = axisWidth;
        this.plotStart = plotStart;
        this.plotRight = plotRight;
        this.plotWidth = nextPlotWidth;
        this.plotHeight = nextPlotHeight;
        this.headerHeight = headerHeight;
        const historyHeight = data.length;
        const desiredHistoryWidth = Math.min(8192, Math.max(nextPlotWidth * 2, this.historySeconds * 60));
        const historyWidth = Math.min(desiredHistoryWidth, Math.max(1, Math.floor(16_777_216 / historyHeight)));
        if (historyCanvas.width !== historyWidth || historyCanvas.height !== historyHeight) {
            historyCanvas.width = historyWidth;
            historyCanvas.height = historyHeight;
            this.peakLevels = new Float32Array(historyHeight);
            this.peakPositions = new Float32Array(historyHeight);
            this.peakPositions.fill(-1);
            this.lastTime = null;
            this.panSeconds = 0;
            this.scrollRemainder = 0;
            this.historyHead = 0;
            this.historyFilled = 0;
            this.overviewDirty = true;
        }

        const sampleRate = this.audioCtx?.sampleRate || 0;
        if (!sampleRate) return;
        const nyquist = sampleRate / 2;
        const minFrequency = Math.min(this.minFrequency, nyquist / 2);
        const topFrequency = Math.max(
            minFrequency * 1.01,
            Math.min(Number(maxFrequency) || this.maxFrequency, nyquist)
        );
        if (
            (this.historySampleRate && this.historySampleRate !== sampleRate) ||
            (this.historyTopFrequency && this.historyTopFrequency !== topFrequency)
        ) {
            this.clearHistory();
        }
        this.historySampleRate = sampleRate;
        this.historyTopFrequency = topFrequency;
        this.baseMinFrequency = minFrequency;
        this.baseMaxFrequency = topFrequency;
        if (this.frequencyViewMin === null || this.frequencyViewMax === null) {
            this.frequencyViewMin = minFrequency;
            this.frequencyViewMax = topFrequency;
        } else {
            [this.frequencyViewMin, this.frequencyViewMax] = this._clampFrequencyView(
                this.frequencyViewMin,
                this.frequencyViewMax,
                minFrequency,
                topFrequency
            );
        }
        analyser.smoothingTimeConstant = analyserSmoothing;

        const now = Number.isFinite(playbackTime) ? playbackTime : performance.now() / 1000;
        let deltaTime = this.lastTime === null ? 1 / 60 : now - this.lastTime;
        this.lastTime = now;
        if (deltaTime < 0 || deltaTime > 1) {
            //this.clearHistory();
            this.lastTime = now;
            deltaTime = 0;
        }

        const pixelsPerSecond = historyCanvas.width / this.historySeconds;
        let shift = 0;
        if (!this.frozen && deltaTime > 0) {
            this.scrollRemainder += deltaTime * pixelsPerSecond;
            shift = Math.floor(this.scrollRemainder);
            this.scrollRemainder -= shift;
        }
        shift = Math.min(shift, historyCanvas.width);

        const palette = this.colorStops;
        const frequencyRange = topFrequency - minFrequency;
        const gainDb = 20 * Math.log10(Math.max(0.01, Number(sensitivity) || 1));
        const imageData = shift > 0 ? historyCtx.createImageData(shift, historyHeight) : null;
        const elapsedForPeaks = Math.max(0, deltaTime);
        const peakDecay = Math.pow(10, -elapsedForPeaks / 2);
        const minDecibels = Number.isFinite(analyser.minDecibels) ? analyser.minDecibels : -100;
        const maxDecibels = Number.isFinite(analyser.maxDecibels) ? analyser.maxDecibels : -30;

        if (shift > 0) {
            for (let y = 0; y < historyHeight; y++) {
                const bin = historyHeight - 1 - y;
                const db = minDecibels + (data[bin] / 255) * (maxDecibels - minDecibels) + gainDb;
                const normalized = Math.max(0, Math.min(1, (db - this.dbFloor) / this.dbRange));
                const level = Math.pow(normalized, 1 / Math.max(0.25, this.contrast));
                let red = palette[0][1];
                let green = palette[0][2];
                let blue = palette[0][3];
                for (let i = 1; i < palette.length; i++) {
                    if (level <= palette[i][0]) {
                        const previous = palette[i - 1];
                        const current = palette[i];
                        const amount = Math.max(0, Math.min(1, (level - previous[0]) / (current[0] - previous[0])));
                        red = previous[1] + (current[1] - previous[1]) * amount;
                        green = previous[2] + (current[2] - previous[2]) * amount;
                        blue = previous[3] + (current[3] - previous[3]) * amount;
                        break;
                    }
                }
                let pixel = y * shift * 4;
                for (let x = 0; x < shift; x++, pixel += 4) {
                    imageData.data[pixel] = red;
                    imageData.data[pixel + 1] = green;
                    imageData.data[pixel + 2] = blue;
                    imageData.data[pixel + 3] = 255;
                }
                if (this.peakHoldEnabled && !this.frozen) {
                    this.peakLevels[y] *= peakDecay;
                    if (level >= this.peakLevels[y]) {
                        this.peakLevels[y] = level;
                        this.peakPositions[y] = (this.historyHead + shift - 1) % historyCanvas.width;
                    }
                }
            }
        } else if (this.peakHoldEnabled && !this.frozen) {
            for (let y = 0; y < historyHeight; y++) {
                this.peakLevels[y] *= peakDecay;
                if (this.peakLevels[y] < 0.01) {
                    this.peakPositions[y] = -1;
                }
            }
        }
        if (imageData) {
            const firstWidth = Math.min(shift, historyCanvas.width - this.historyHead);
            historyCtx.putImageData(imageData, this.historyHead, 0, 0, 0, firstWidth, historyHeight);
            if (firstWidth < shift) {
                historyCtx.putImageData(imageData, 0, 0, firstWidth, 0, shift - firstWidth, historyHeight);
            }
            this.historyHead = (this.historyHead + shift) % historyCanvas.width;
            this.historyFilled = Math.min(historyCanvas.width, this.historyFilled + shift);
            this.overviewDirty = true;
        }

        ctx.fillStyle = "#080d13";
        ctx.fillRect(0, 0, width, height);
        const visibleSpan = this._visibleSpan();
        const sourceWidth = Math.max(1, historyCanvas.width * visibleSpan / this.historySeconds);
        const panPixels = this.panSeconds * pixelsPerSecond;
        const sourceLeft = ((this.historyHead - panPixels - sourceWidth) % historyCanvas.width + historyCanvas.width) % historyCanvas.width;
        const firstWidth = Math.min(sourceWidth, historyCanvas.width - sourceLeft);
        const firstDestinationWidth = nextPlotWidth * firstWidth / sourceWidth;
        const viewFrequencyRange = this.frequencyViewMax - this.frequencyViewMin;
        const sourceY = Math.max(0, (nyquist - this.frequencyViewMax) / nyquist * historyHeight);
        const sourceHeight = Math.min(
            historyHeight - sourceY,
            Math.max(1, viewFrequencyRange / nyquist * historyHeight)
        );
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(historyCanvas, sourceLeft, sourceY, firstWidth, sourceHeight, plotStart, headerHeight, firstDestinationWidth, nextPlotHeight);
        if (firstWidth < sourceWidth) {
            const secondWidth = sourceWidth - firstWidth;
            ctx.drawImage(historyCanvas, 0, sourceY, secondWidth, sourceHeight, plotStart + firstDestinationWidth, headerHeight, nextPlotWidth - firstDestinationWidth, nextPlotHeight);
        }
        const spectrumWidth = width - plotRight;
        if (this.showEdgeSpectrum && spectrumWidth > 0 && this.historyFilled > 0) {
            const spectrumX = Math.floor(
                ((sourceLeft + sourceWidth - 1) % historyCanvas.width + historyCanvas.width) % historyCanvas.width
            );
            ctx.drawImage(
                historyCanvas,
                spectrumX, sourceY, 1, sourceHeight,
                plotRight, headerHeight, spectrumWidth, nextPlotHeight
            );
            ctx.fillStyle = "rgba(3, 8, 14, 0.9)";
            ctx.fillRect(plotRight - 2, headerHeight, 4, nextPlotHeight);
            ctx.fillStyle = "rgba(255, 94, 94, 0.9)";
            ctx.fillRect(plotRight - 1, headerHeight, 1, nextPlotHeight);
        }
        ctx.restore();

        if (this.peakHoldEnabled && this.peakPositions) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(plotStart, headerHeight, nextPlotWidth, nextPlotHeight);
            ctx.clip();
            for (let y = 0; y < historyHeight; y++) {
                const position = this.peakPositions[y];
                if (position < 0) continue;
                const distance = (position - sourceLeft + historyCanvas.width) % historyCanvas.width;
                if (distance > sourceWidth) continue;
                const frequency = (historyHeight - 1 - y) * nyquist / historyHeight;
                if (frequency < this.frequencyViewMin || frequency > this.frequencyViewMax) continue;
                const x = plotStart + (distance / sourceWidth) * nextPlotWidth;
                const peakY = headerHeight + ((this.frequencyViewMax - frequency) / viewFrequencyRange) * nextPlotHeight;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.9, 0.25 + this.peakLevels[y] * 0.65)})`;
                ctx.fillRect(x, peakY, 2, 1);
            }
            ctx.restore();
        }

        const formatFrequency = frequency => frequency >= 1000
            ? `${Number.isInteger(frequency / 1000) ? frequency / 1000 : (frequency / 1000).toFixed(1)} kHz`
            : `${Math.round(frequency)} Hz`;
        ctx.save();
        ctx.font = "10px sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#aab8c5";
        ctx.fillText("FREQUENCY", 8, headerHeight / 2);
        ctx.fillStyle = "#7d909f";
        const frequencyDivisions = 8;
        for (let division = 0; division <= frequencyDivisions; division++) {
            const ratio = division / frequencyDivisions;
            const frequency = this.frequencyViewMax - viewFrequencyRange * ratio;
            const y = headerHeight + ratio * (nextPlotHeight - 1);
            ctx.beginPath();
            ctx.moveTo(plotStart, y);
            ctx.lineTo(plotRight, y);
            ctx.strokeStyle = "rgba(185, 205, 220, 0.16)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.textAlign = "right";
            ctx.fillText(formatFrequency(frequency), axisWidth - 8, y);
        }

        for (let division = 1; division < 8; division++) {
            const x = plotStart + (nextPlotWidth * division) / 8;
            ctx.beginPath();
            ctx.moveTo(x, headerHeight);
            ctx.lineTo(x, headerHeight + nextPlotHeight);
            ctx.strokeStyle = "rgba(185, 205, 220, 0.08)";
            ctx.stroke();
        }

        ctx.fillStyle = "#7d909f";
        ctx.textAlign = "center";
        const timeDivisions = 4;
        for (let division = 0; division <= timeDivisions; division++) {
            const ratio = division / timeDivisions;
            const x = plotStart + ratio * nextPlotWidth;
            const secondsAgo = this.panSeconds + (1 - ratio) * visibleSpan;
            ctx.beginPath();
            ctx.moveTo(x, headerHeight + nextPlotHeight);
            ctx.lineTo(x, height - footerHeight + 2);
            ctx.strokeStyle = "rgba(185, 205, 220, 0.2)";
            ctx.stroke();
            ctx.fillText(`-${secondsAgo.toFixed(1)} s`, x, height - footerHeight / 2);
        }
        if (this.frozen) {
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffcf3c";
            ctx.fillText("<<History Frozen>>", plotStart + nextPlotWidth / 2, headerHeight / 2);
        }

        const isFrequencyZoomed = viewFrequencyRange < frequencyRange - 1;
        const isTimePanned = this.panSeconds > 0.01;
        const isTimeZoomed = this.zoom > 1.001;
        this.overviewBounds = null;
        if (((isFrequencyZoomed || isTimePanned || isTimeZoomed) && this.showMap===1) || this.showMap===2) {
            this._drawOverview({
                ctx,
                historyCanvas,
                plotStart,
                headerHeight,
                plotWidth: nextPlotWidth,
                plotHeight: nextPlotHeight,
                minFrequency,
                topFrequency,
                nyquist,
                visibleSpan,
                sourceLeft
            });
        }

        if (this.pointer && this.isActive) {
            const px = this.pointer.x;
            const py = this.pointer.y;
            if (px >= plotStart && px <= plotRight && py >= headerHeight && py <= headerHeight + nextPlotHeight) {
                const overview = this.overviewBounds;
                const overOverview = overview &&
                    px >= overview.x && px <= overview.x + overview.width &&
                    py >= overview.y && py <= overview.y + overview.height;
                if (overOverview) {
                    const xRatio = (px - overview.x) / overview.width;
                    const yRatio = (py - overview.y) / overview.height;
                    const frequency = overview.topFrequency -
                        yRatio * (overview.topFrequency - overview.minFrequency);
                    const secondsAgo = (1 - xRatio) * overview.historySeconds;
                    ctx.beginPath();
                    ctx.moveTo(px, overview.y);
                    ctx.lineTo(px, overview.y + overview.height);
                    ctx.moveTo(overview.x, py);
                    ctx.lineTo(overview.x + overview.width, py);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
                    ctx.stroke();
                    const readout = `${formatFrequency(frequency)}   -${secondsAgo.toFixed(1)} s`;
                    const readoutWidth = ctx.measureText(readout).width + 16;
                    const readoutX = Math.min(
                        overview.x + overview.width - readoutWidth - 2,
                        Math.max(overview.x + 2, px + 8)
                    );
                    const readoutY = py - overview.y < overview.height / 2
                        ? py + 18
                        : py - 8;
                    ctx.fillStyle = "rgba(5, 10, 16, 0.92)";
                    ctx.fillRect(readoutX, readoutY - 10, readoutWidth, 20);
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "left";
                    ctx.fillText(readout, readoutX + 8, readoutY);
                } else {
                    const xRatio = (px - plotStart) / nextPlotWidth;
                    const yRatio = (py - headerHeight) / nextPlotHeight;
                    const frequency = this.frequencyViewMax - yRatio * viewFrequencyRange;
                    const secondsAgo = this.panSeconds + (1 - xRatio) * visibleSpan;
                    ctx.beginPath();
                    ctx.moveTo(px, headerHeight);
                    ctx.lineTo(px, headerHeight + nextPlotHeight);
                    ctx.moveTo(plotStart, py);
                    ctx.lineTo(plotRight, py);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
                    ctx.stroke();
                    const readout = `${formatFrequency(frequency)}   -${secondsAgo.toFixed(2)} s`;
                    const readoutWidth = ctx.measureText(readout).width + 16;
                    const readoutX = Math.min(plotRight - readoutWidth - 4, Math.max(plotStart + 4, px + 10));
                    const readoutY = Math.max(headerHeight + 16, py - 14);
                    ctx.fillStyle = "rgba(5, 10, 16, 0.88)";
                    ctx.fillRect(readoutX, readoutY - 10, readoutWidth, 20);
                    ctx.fillStyle = "#ffffff";
                    ctx.textAlign = "left";
                    ctx.fillText(readout, readoutX + 8, readoutY);
                }
            }
        }

        ctx.restore();
    }

    _drawOverview({ ctx, historyCanvas, plotStart, headerHeight, plotWidth, plotHeight, minFrequency, topFrequency, nyquist, visibleSpan, sourceLeft }) {
        const overviewCtx = this.overviewCtx;
        const overviewWidth = this.overviewCanvas.width;
        const overviewHeight = this.overviewCanvas.height;
        const overviewX = plotStart + 8;
        const overviewY = headerHeight + plotHeight - overviewHeight - 8;
        if (overviewY <= headerHeight || overviewX + overviewWidth > plotStart + plotWidth) {
            this.overviewBounds = null;
            return;
        }

        if (this.overviewDirty && overviewCtx) {
            overviewCtx.fillStyle = "#080d13";
            overviewCtx.fillRect(0, 0, overviewWidth, overviewHeight);
            if (this.historyFilled > 0) {
                const sourceY = Math.max(0, (nyquist - topFrequency) / nyquist * historyCanvas.height);
                const sourceHeight = Math.min(
                    historyCanvas.height - sourceY,
                    Math.max(1, (topFrequency - minFrequency) / nyquist * historyCanvas.height)
                );
                const sourceWidth = historyCanvas.width;
                if (this.historyFilled < sourceWidth) {
                    const destinationWidth = overviewWidth * this.historyFilled / sourceWidth;
                    overviewCtx.drawImage(
                        historyCanvas,
                        0, sourceY, this.historyFilled, sourceHeight,
                        overviewWidth - destinationWidth, 0, destinationWidth, overviewHeight
                    );
                } else {
                    const firstWidth = sourceWidth - this.historyHead;
                    const firstDestinationWidth = overviewWidth * firstWidth / sourceWidth;
                    overviewCtx.drawImage(
                        historyCanvas,
                        this.historyHead, sourceY, firstWidth, sourceHeight,
                        0, 0, firstDestinationWidth, overviewHeight
                    );
                    if (this.historyHead > 0) {
                        overviewCtx.drawImage(
                            historyCanvas,
                            0, sourceY, this.historyHead, sourceHeight,
                            firstDestinationWidth, 0, overviewWidth - firstDestinationWidth, overviewHeight
                        );
                    }
                }
            }
            this.overviewDirty = false;
        }

        ctx.fillStyle = "rgba(4, 8, 14, 0.88)";
        ctx.fillRect(overviewX - 3, overviewY - 3, overviewWidth + 6, overviewHeight + 6);
        ctx.drawImage(this.overviewCanvas, overviewX, overviewY);

        const baseFrequencyRange = Math.max(1, topFrequency - minFrequency);
        const viewFrequencyRange = this.frequencyViewMax - this.frequencyViewMin;
        const viewLeft = overviewX + (this.historySeconds - this.panSeconds - visibleSpan) / this.historySeconds * overviewWidth;
        const viewWidth = visibleSpan / this.historySeconds * overviewWidth;
        const viewTop = overviewY + (topFrequency - this.frequencyViewMax) / baseFrequencyRange * overviewHeight;
        const viewHeight = Math.max(2, viewFrequencyRange / baseFrequencyRange * overviewHeight);
        const maxVisibleSpan = Math.min(this.historySeconds, this.visibleSeconds);
        const maxViewWidth = maxVisibleSpan / this.historySeconds * overviewWidth;
        const maxViewLeft = Math.max(
            overviewX,
            Math.min(overviewX + overviewWidth - maxViewWidth,
                overviewX + (this.historySeconds - this.panSeconds - maxVisibleSpan) /
                    this.historySeconds * overviewWidth)
        );
        const maxViewRight = maxViewLeft + maxViewWidth;
        const viewport = {
            x: viewLeft,
            y: viewTop,
            width: viewWidth,
            height: viewHeight
        };
        this.overviewBounds = {
            x: overviewX,
            y: overviewY,
            width: overviewWidth,
            height: overviewHeight,
            historySeconds: this.historySeconds,
            minFrequency,
            topFrequency,
            viewport
        };

        ctx.save();
        ctx.fillStyle = "rgba(80, 220, 255, 0.07)";
        ctx.fillRect(maxViewLeft, overviewY, maxViewRight - maxViewLeft, overviewHeight);
        ctx.setLineDash([3, 2]);
        ctx.strokeStyle = "#ffcf3c";
        ctx.lineWidth = 1;
        ctx.strokeRect(maxViewLeft + 0.5, overviewY + 0.5, maxViewRight - maxViewLeft - 1, overviewHeight - 1);
        ctx.setLineDash([]);
        ctx.restore();

        ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx.fillRect(viewLeft, viewTop, viewWidth, viewHeight);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(viewLeft + 0.5, viewTop + 0.5, Math.max(1, viewWidth - 1), Math.max(1, viewHeight - 1));
        ctx.strokeStyle = "#ffcf3c";
        ctx.lineWidth = 1;
        ctx.strokeRect(overviewX - 2.5, overviewY - 2.5, overviewWidth + 5, overviewHeight + 5);
    }
}

// Wave render or something like that
class WaveRenderer extends Renderer {
    constructor(...args) {
        super(...args);
        this.envelopeMin = [new Float32Array(0), new Float32Array(0)];
        this.envelopeMax = [new Float32Array(0), new Float32Array(0)];
    }

    /**
     * Wave render method
     * @param {Uint8Array|Float32Array} data - Time domain data
     * @param {AnalyserNode} analyser - Analyser node
     */
    render(data, analyser) {
        const { canvas, ctx } = this;
        const w = canvas.width;
        const h = canvas.height;
        if (!w || !h || !data?.length) return;

        const leftData = typeof dataL !== "undefined" ? dataL : data;
        const rightData = typeof dataR !== "undefined" ? dataR : data;
        const channels = [
            { data: leftData, label: "LEFT", color: "#46d9e8" },
            { data: rightData, label: "RIGHT", color: "#ffb454" }
        ];
        const plotLeft = Math.min(58, w * 0.2);
        const plotRight = w - Math.min(16, w * 0.05);
        const plotWidth = Math.max(1, plotRight - plotLeft);
        const headerHeight = Math.min(28, h * 0.16);
        const footerHeight = Math.min(26, h * 0.14);
        const laneGap = Math.min(12, h * 0.06);
        const laneHeight = Math.max(1, (h - headerHeight - footerHeight - laneGap) / 2);
        const sampleRate = this.audioCtx?.sampleRate || 0;

        if (this.envelopeMin[0].length !== Math.ceil(plotWidth)) {
            const envelopeWidth = Math.ceil(plotWidth);
            this.envelopeMin = [new Float32Array(envelopeWidth), new Float32Array(envelopeWidth)];
            this.envelopeMax = [new Float32Array(envelopeWidth), new Float32Array(envelopeWidth)];
        }

        ctx.save();
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "#080d13";
        ctx.fillRect(0, 0, w, h);

        ctx.font = "10px sans-serif";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 1;

        channels.forEach(({ data: channelData, label, color }, channelIndex) => {
            const laneTop = headerHeight + channelIndex * (laneHeight + laneGap);
            const laneBottom = laneTop + laneHeight;
            const centerY = laneTop + laneHeight / 2;
            const amplitude = Math.max(1, laneHeight * 0.38);

            ctx.fillStyle = "#aebdca";
            ctx.fillText(label, 14, laneTop + 3);

            let peak = 0;
            let squareSum = 0;
            const envelopeMin = this.envelopeMin[channelIndex];
            const envelopeMax = this.envelopeMax[channelIndex];
            const isFloatData = channelData instanceof Float32Array;
            const envelopeWidth = envelopeMin.length;
            for (let column = 0; column < envelopeWidth; column++) {
                const start = Math.floor(column * channelData.length / envelopeWidth);
                const end = Math.max(start + 1, Math.floor((column + 1) * channelData.length / envelopeWidth));
                let columnMin = Infinity;
                let columnMax = -Infinity;
                for (let i = start; i < end; i++) {
                    const raw = channelData[i];
                    const sample = Number.isFinite(raw)
                        ? Math.max(-1, Math.min(1, isFloatData ? raw : (raw - 128) / 128))
                        : 0;
                    const magnitude = Math.abs(sample);
                    if (magnitude > peak) peak = magnitude;
                    squareSum += sample * sample;
                    if (sample < columnMin) columnMin = sample;
                    if (sample > columnMax) columnMax = sample;
                }
                envelopeMin[column] = columnMin;
                envelopeMax[column] = columnMax;
            }

            const rms = Math.sqrt(squareSum / channelData.length);
            const toDb = value => value > 0 ? `${(20 * Math.log10(value)).toFixed(1)} dB` : "-Inf dB";
            ctx.textAlign = "right";
            ctx.fillStyle = "#778895";
            ctx.fillText(`PK ${toDb(peak)}   RMS ${toDb(rms)}`, plotRight, laneTop + 3);
            ctx.textAlign = "left";

            for (let division = 0; division <= 8; division++) {
                const x = plotLeft + (plotWidth * division) / 8;
                ctx.beginPath();
                ctx.moveTo(x, laneTop + 10);
                ctx.lineTo(x, laneBottom - 2);
                ctx.strokeStyle = division === 0 || division === 8
                    ? "rgba(150, 175, 195, 0.2)"
                    : "rgba(150, 175, 195, 0.09)";
                ctx.stroke();
            }

            for (let division = -2; division <= 2; division++) {
                const y = centerY - (division / 2) * amplitude;
                ctx.beginPath();
                ctx.moveTo(plotLeft, y);
                ctx.lineTo(plotRight, y);
                ctx.strokeStyle = division === 0
                    ? "rgba(190, 210, 225, 0.3)"
                    : "rgba(150, 175, 195, 0.11)";
                ctx.stroke();
            }

            ctx.save();
            ctx.beginPath();
            ctx.rect(plotLeft, laneTop + 10, plotWidth, Math.max(1, laneHeight - 12));
            ctx.clip();

            const envelopeStepX = plotWidth / Math.max(1, envelopeMin.length - 1);
            ctx.beginPath();
            ctx.moveTo(plotLeft, centerY - envelopeMax[0] * amplitude);
            for (let column = 1; column < envelopeMax.length; column++) {
                ctx.lineTo(plotLeft + column * envelopeStepX, centerY - envelopeMax[column] * amplitude);
            }
            for (let column = envelopeMin.length - 1; column >= 0; column--) {
                ctx.lineTo(plotLeft + column * envelopeStepX, centerY - envelopeMin[column] * amplitude);
            }
            ctx.closePath();
            ctx.fillStyle = channelIndex === 0
                ? "rgba(70, 217, 232, 0.08)"
                : "rgba(255, 180, 84, 0.08)";
            ctx.fill();

            ctx.lineJoin = "bevel";
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        });

        if (sampleRate > 0) {
            const durationMs = (leftData.length / sampleRate) * 1000;
            const tickCount = 4;
            ctx.textAlign = "center";
            ctx.fillStyle = "#778895";
            for (let tick = 0; tick <= tickCount; tick++) {
                const x = plotLeft + (plotWidth * tick) / tickCount;
                ctx.fillText(`${((durationMs * tick) / tickCount).toFixed(1)} ms`, x, h - footerHeight / 2);
            }
        }
        ctx.restore();
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

    filterSample(sample, previous, amount) {
        return previous + amount * (sample - previous);
    }

    resize() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (!w || !h) return;
        if (
            this.phosphorCanvas.width === w &&
            this.phosphorCanvas.height === h &&
            this._gridCache?.width === w &&
            this._gridCache?.height === h
        ) return;
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
        if (!g) return;
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

    findTrigger(data, windowSize = data.length) {
        if (!data?.length || windowSize <= 0 || windowSize >= data.length) return 0;
        for (let i = 1; i < data.length; i++) {
            if (
                i + windowSize <= data.length &&
                data[i - 1] < this.triggerLevel &&
                data[i] >= this.triggerLevel
            ) {
                return i;
            }
        }
        return 0;
    }

    render(dataL, dataR) {
        if (!dataL?.length || !dataR?.length) return;
        const ctx = this.ctx;
        const pctx = this.phosphorCtx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const sampleRate = this.audioCtx?.sampleRate;
        if (!w || !h || !sampleRate || !pctx) return;

        this.resize();
        const cx = w * 0.5;
        const cy = h * 0.5;
        const scale = Math.min(cx, cy) * 0.9;

        const timeDiv = Number.isFinite(this.timeDiv) ? Math.max(0, this.timeDiv) : 0.01;
        const windowSize = Math.max(1, Math.min(dataL.length, Math.floor(sampleRate * timeDiv)));
        const start = this.findTrigger(dataL, windowSize);
        const end = Math.min(dataL.length, start + windowSize);
        const sampleCount = end - start;
        if (!sampleCount) return;

        const decay = Number.isFinite(this.decay) ? this.decay : 0.88;
        const fade = Math.max(0, Math.min(1, 1 - decay));
        pctx.globalCompositeOperation = 'destination-out';
        pctx.fillStyle = `rgba(0,0,0,${fade})`;
        pctx.fillRect(0, 0, w, h);

        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        if (this._gridCache) {
            ctx.drawImage(this._gridCache, 0, 0);
        }

        pctx.globalCompositeOperation = 'lighter';
        pctx.beginPath();
        const pointLimit = Math.max(2, Math.floor(Number.isFinite(this.maxPoints) ? this.maxPoints : 2000));
        const step = Math.max(1, Math.ceil(sampleCount / pointLimit));
        const gain = Number.isFinite(this.voltsDiv) ? this.voltsDiv * 2 : 2;
        const curve = Number.isFinite(this.curvature) ? this.curvature : 0;
        const bandwidth = Number.isFinite(this.bandwidth)
            ? Math.max(0, Math.min(1, this.bandwidth))
            : 0.5;
        let filteredL = this._lpL;
        let filteredR = this._lpR;
        let firstPoint = true;

        for (let i = start; i < end; i += step) {
            const rawL = dataL[i];
            const rawR = dataR[Math.min(i, dataR.length - 1)];
            const sampleL = Number.isFinite(rawL) ? rawL * gain : 0;
            const sampleR = Number.isFinite(rawR) ? rawR * gain : 0;
            filteredL = this.filterSample(sampleL, filteredL, bandwidth);
            filteredR = this.filterSample(sampleR, filteredR, bandwidth);

            const dx = filteredL;
            const dy = -filteredR;
            const distortion = 1 + curve * (dx * dx + dy * dy);
            const px = cx + dx * scale * distortion + this.noise() * 0.2;
            const py = cy + dy * scale * distortion + this.noise() * 0.2;
            if (firstPoint) {
                pctx.moveTo(px, py);
                firstPoint = false;
            } else {
                pctx.lineTo(px, py);
            }
        }
        pctx.strokeStyle = 'rgba(0,255,140,0.25)';
        pctx.lineWidth = 1.2;
        pctx.stroke();

        this._lpL = filteredL;
        this._lpR = filteredR;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.phosphorCanvas, 0, 0);

        const g = ctx.createRadialGradient(cx, cy, scale * 0.2, cx, cy, scale);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.72)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }
}

// Retro audio spectrum visualizer thing
class RetroRenderer extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);
        this.config = config;
        this.peakHold = null;
        this.peakTimer = null;
        this.videoCanvas = document.createElement('canvas');
        this.videoCtx = this.videoCanvas.getContext('2d', { willReadFrequently: true });
        this.VIS_MIN_DB = config.visMinDb ?? -90;
        this.VIS_MAX_DB = config.visMaxDb ?? -20;
        // this.config.videoFG = true;
        // this.config.useLuminance = true;
    }

    formatFreq(f) {
        return f >= 1000 ? (f / 1000) + ' k' : `${f} `;
    }

    render(floatData, analyser, videoEl) {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        const LED_HEIGHT = 5;
        const LED_PITCH = 10;
        const BANDS = this.config.retroCenterFreqs.length;
        const headerH = 20;
        const ledAreaH = ch - headerH;
        const LEDS = Math.max(20, Math.floor(ledAreaH / LED_PITCH));
        // const usableX = 0;
        const usableY = headerH + 5;
        // const usableW = cw;
        const usableH = ledAreaH - 15;
        const actualPitch = (usableH - LED_HEIGHT) / (LEDS - 1);
        const nyquist = analyser.context.sampleRate / 2;
        const moduleW = cw / BANDS;
        const padX = 10;
        const dBGutter = 30;
        let videoPixels = null;
        if (videoEl) videoPixels = this.getVideoPixels(videoEl, BANDS, LEDS);

        if (!this.peakHold) {
            this.peakHold = new Array(BANDS).fill(0);
        }
        if (!this.peakTimer) {
            this.peakTimer = new Array(BANDS).fill(0);
        }

        const ratioPow = Math.pow(2, 1 / 6);
        const now = performance.now();

        for (let i = 0; i < BANDS; i++) {
            const fCenter = this.config.retroCenterFreqs[i];
            const toIndex = (f) => Math.floor((f / nyquist) * floatData.length);
            const fLow = Math.max(20, fCenter / ratioPow);
            const fHigh = Math.min(nyquist, fCenter * ratioPow);
            const iLow = toIndex(fLow);
            const iHigh = toIndex(fHigh);
            const value = AudioBands.processBand(
                floatData,
                iLow,
                iHigh,
                this.VIS_MIN_DB,
                this.VIS_MAX_DB,
            );
            const level = value * LEDS;
            AudioBands.peakHoldUpdate({
                level: Math.min(level, LEDS - 1),
                holdArray: this.peakHold,
                timerArray: this.peakTimer,
                index: i,
                now,
                holdTime: 700,
                releaseSpeed: 0.3,
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
            ctx.fillText(`${this.formatFreq(fCenter)}Hz`, ledX, 14);

            for (let l = 0; l < LEDS; l++) {
                const y = usableY + usableH - LED_HEIGHT - l * actualPitch;
                const norm = l / (LEDS - 1);
                let r = 0, g = 255, b = 70;
                let pixelColor = null;
                let active = null;
                if (videoPixels && videoPixels[i] && videoPixels[i][l]) {
                    active = this.config.useLuminance ? videoPixels[i][l].active : l < level || l === peakLevel;
                    pixelColor = videoPixels[i][l].color;
                }

                if (norm > 0.6) {
                    r = 255;
                    g = Math.floor(255 * (1 - norm));
                } else if (norm > 0.3) {
                    r = Math.floor(255 * norm);
                    g = 255;
                }
                ctx.fillStyle = active ? (this.config.videoFG && pixelColor ? `rgb(${pixelColor.r},${pixelColor.g},${pixelColor.b})` : `rgb(${r},${g},${b})`) : "rgba(25,25,25,0.35)";
                ctx.fillRect(ledX, y, ledW, LED_HEIGHT);
            }

            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.font = "9px monospace";
            const dbStep = 10;
            const startDb = Math.ceil(this.VIS_MIN_DB / dbStep) * dbStep;
            const endDb = Math.floor(this.VIS_MAX_DB / dbStep) * dbStep;

            for (let dbMark = startDb; dbMark <= endDb; dbMark += dbStep) {
                const norm = (dbMark - this.VIS_MIN_DB) / (this.VIS_MAX_DB - this.VIS_MIN_DB);
                const ledIndex = Math.round(norm * (LEDS - 1));
                const y = usableY + usableH - LED_HEIGHT / 2 - ledIndex * actualPitch;
                ctx.fillText(dbMark.toString(), x + moduleW - 28, y + 3);
            }
        }
    }

    getVideoPixels(videoEl, numBands, numLeds) {
        this.videoCanvas.width = numBands;
        this.videoCanvas.height = numLeds;

        try {
            this.videoCtx.drawImage(videoEl, 0, 0, numBands, numLeds);
        } catch (e) {
            return null;
        }

        const imageData = this.videoCtx.getImageData(0, 0, numBands, numLeds);
        const data = imageData.data;
        const pixelStates = Array.from({ length: numBands }, () =>
            Array.from({ length: numLeds }, () => false)
        );
        for (let band = 0; band < numBands; band++) {
            for (let led = 0; led < numLeds; led++) {
                const pixelIndex = ((numLeds - 1 - led) * numBands + band) * 4;
                const r = data[pixelIndex];
                const g = data[pixelIndex + 1];
                const b = data[pixelIndex + 2];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                pixelStates[band][led] = {
                    active: this.config.useColor ? (r > 0 || g > 0 || b > 0) : luminance > 128,
                    color: { r, g, b }
                };
            }
        }
        return pixelStates;
    }
}

// some video render (still WIP)
class VideoRender extends Renderer {
    constructor(canvas, ctx, audioCtx, config = {}) {
        super(canvas, ctx, audioCtx, config);
        this.subtitleCanvas = document.createElement("canvas");
        this.subtitleCanvas.id = "assSubtitleOverlay";
        this.subtitleCanvas.style.background = "transparent";
        this.subtitleCanvas.style.pointerEvents = "none";
        this.subtitleCanvas.style.display = "none";
        this.subtitleCanvas.getContext("2d", { willReadFrequently: true });
        this.canvas.parentElement?.appendChild(this.subtitleCanvas);
        this.assRenderer = null;
        this.assTrackFingerprint = null;
        this.assFailedFingerprint = null;
        this.assRendererDisposed = false;
        this.assRendererReady = false;
        this.assCurrentTime = 0;
        this.assCanvasWidth = 0;
        this.assCanvasHeight = 0;
    }
    render(videoEl, subtitleData = null, subtitleOffset = 0) {
        const ctx = this.ctx;
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        if (!ctx || canvasW <= 0 || canvasH <= 0) return;

        ctx.clearRect(0, 0, canvasW, canvasH);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvasW, canvasH);
        if (!videoEl) {
            this._hideASSOverlay();
            return;
        }

        const videoW = videoEl.videoWidth;
        const videoH = videoEl.videoHeight;
        if (!(videoW > 0) || !(videoH > 0) || !Number.isFinite(videoW) || !Number.isFinite(videoH)) {
            this._hideASSOverlay();
            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `${Math.floor(canvasH * 0.08)}px Arial`;
            ctx.fillStyle = "white";
            ctx.fillText(
                videoEl.src ? "♪ オーディオのみ ♪" : "No Media",
                canvasW / 2,
                canvasH / 2
            );
            ctx.restore();
            return;
        }
        if (videoEl.readyState < 2) {
            this._hideASSOverlay();
            return;
        }

        let fgScale;
        if (videoW / videoH > canvasW / canvasH) {
            fgScale = canvasW / videoW;
        } else {
            fgScale = canvasH / videoH;
        }
        const fgW = videoW * fgScale;
        const fgH = videoH * fgScale;
        const fgX = (canvasW - fgW) / 2;
        const fgY = (canvasH - fgH) / 2;

        if (this.config.ForegroundVideo) {
            this.bgCanvas ??= document.createElement("canvas");
            this.bgCtx ??= this.bgCanvas.getContext("2d");
            if (this.bgCtx) {
                const bw = Math.max(1, Math.round(canvasW * 0.3));
                const bh = Math.max(1, Math.round(canvasH * 0.3));
                if (this.bgCanvas.width !== bw || this.bgCanvas.height !== bh) {
                    this.bgCanvas.width = bw;
                    this.bgCanvas.height = bh;
                }
                const bgScale = Math.max(bw / videoW, bh / videoH);
                const drawW = videoW * bgScale;
                const drawH = videoH * bgScale;
                const bx = (bw - drawW) / 2;
                const by = (bh - drawH) / 2;
                this.bgCtx.clearRect(0, 0, bw, bh);
                this.bgCtx.drawImage(videoEl, bx, by, drawW, drawH);
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.drawImage(this.bgCanvas, 0, 0, canvasW, canvasH);
                ctx.restore();
            }
        }
        ctx.drawImage(videoEl, fgX, fgY, fgW, fgH);
        if (typeof subtitleData?.assContent === "string") {
            const videoRect = {
                x: fgX,
                y: fgY,
                width: fgW,
                height: fgH,
                sourceWidth: videoW,
                sourceHeight: videoH,
            };
            this._renderASSWithLibass(subtitleData, videoEl.currentTime - subtitleOffset, videoRect);
        } else {
            this._hideASSOverlay();
            if (subtitleData?.subs) {
                this.renderASS(subtitleData, videoEl.currentTime, {
                    x: fgX,
                    y: fgY,
                    width: fgW,
                    height: fgH,
                    sourceWidth: videoW,
                    sourceHeight: videoH,
                });
            }
        }
    }

    _renderASSWithLibass(subtitleData, time, videoRect) {
        const parent = this.canvas.parentElement;
        const canvasBounds = this.canvas.getBoundingClientRect();
        const parentBounds = parent?.getBoundingClientRect();
        if (!parent || !canvasBounds.width || !canvasBounds.height || !parentBounds) return;

        const pixelScaleX = canvasBounds.width / this.canvas.width;
        const pixelScaleY = canvasBounds.height / this.canvas.height;
        const width = Math.max(1, Math.round(videoRect.width));
        const height = Math.max(1, Math.round(videoRect.height));
        this.subtitleCanvas.style.left = `${canvasBounds.left - parentBounds.left + videoRect.x * pixelScaleX}px`;
        this.subtitleCanvas.style.top = `${canvasBounds.top - parentBounds.top + videoRect.y * pixelScaleY}px`;
        this.subtitleCanvas.style.width = `${videoRect.width * pixelScaleX}px`;
        this.subtitleCanvas.style.height = `${videoRect.height * pixelScaleY}px`;
        this.subtitleCanvas.style.display = "block";
        this.assCurrentTime = time;

        if (width !== this.assCanvasWidth || height !== this.assCanvasHeight) {
            this.assCanvasWidth = width;
            this.assCanvasHeight = height;
            if (this.assRenderer) {
                this.assRenderer.resize(width, height);
            } else {
                this.subtitleCanvas.width = width;
                this.subtitleCanvas.height = height;
            }
        }

        const fingerprint = subtitleData._fingerprint || subtitleData.name || subtitleData.assContent;
        if (fingerprint !== this.assTrackFingerprint) {
            this.assFailedFingerprint = null;
            if (this.assRenderer && !this.assRendererDisposed) {
                this.assRenderer.setTrack(subtitleData.assContent);
            } else if (typeof SubtitlesOctopus === "function") {
                this.assRenderer = null;
                try {
                    this.assRenderer = new SubtitlesOctopus({
                        canvas: this.subtitleCanvas,
                        subContent: subtitleData.assContent,
                        workerUrl: new URL("./JS/vendor/libass-wasm/subtitles-octopus-worker.js", document.baseURI).href,
                        legacyWorkerUrl: new URL("./JS/vendor/libass-wasm/subtitles-octopus-worker-legacy.js", document.baseURI).href,
                        fallbackFont: new URL("./JS/vendor/libass-wasm/default.woff2", document.baseURI).href,
                        targetFps: 30,
                        onReady: () => {
                            if (this.assFailedFingerprint === fingerprint) return;
                            this.assRendererReady = true;
                            this.assRenderer.setCurrentTime(this.assCurrentTime);
                        },
                        onError: error => {
                            console.error(
                                "ASS subtitle renderer failed; using the basic Canvas subtitle renderer.",
                                error?.message || error
                            );
                            this.assFailedFingerprint = fingerprint;
                            this.assRendererDisposed = true;
                            this.assRendererReady = false;
                            this.subtitleCanvas.style.display = "none";
                        },
                    });
                    this.assRendererDisposed = false;
                    this.assRendererReady = false;
                } catch (error) {
                    console.error("Could not start the ASS subtitle renderer; using the basic Canvas subtitle renderer.", error);
                    this.assFailedFingerprint = fingerprint;
                    this.assRendererDisposed = true;
                    this.assRendererReady = false;
                    this.subtitleCanvas.style.display = "none";
                }
            } else {
                console.error("ASS subtitle renderer script is unavailable; using the basic Canvas subtitle renderer.");
                this.assFailedFingerprint = fingerprint;
            }
            this.assTrackFingerprint = fingerprint;
        }

        if (this.assRenderer && this.assRendererReady && this.assFailedFingerprint !== fingerprint) {
            this.assRenderer.setCurrentTime(time);
        } else {
            this.subtitleCanvas.style.display = "none";
            this.renderASS(subtitleData, time, videoRect);
        }
    }

    _hideASSOverlay() {
        this.subtitleCanvas.style.display = "none";
        if (this.assRenderer && this.assRendererReady && !this.assRendererDisposed && this.assTrackFingerprint !== null) {
            this.assRenderer.freeTrack();
            this.assTrackFingerprint = null;
        }
    }

    hideASSOverlay() {
        this._hideASSOverlay();
    }

    renderASS(subtitleData, time, videoRect = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height }) {
        const active = subtitleData.subs
            .filter(
                (sub) => sub.Type === "Dialogue" && time >= sub.start && time <= sub.end,
            )
            .sort((a, b) => Number(a.Layer ?? 0) - Number(b.Layer ?? 0));
        if (!active.length) return;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(videoRect.x, videoRect.y, videoRect.width, videoRect.height);
        this.ctx.clip();
        for (const sub of active) {
            this.drawASSLine({
                ...sub,
                assOptions: subtitleData.assOptions,
                currentTime: time,
                videoRect,
            });
        }
        this.ctx.restore();
    }

    drawASSLine(sub) {
        const ctx = this.ctx;
        const tags = sub.tags || {};
        const assInfo = sub.assOptions?.scriptInfo || {};
        const videoRect = sub.videoRect || { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
        const styleName = typeof tags.resetStyle === "string" ? tags.resetStyle : null;
        const style = (styleName && sub.assOptions?.styles?.stylesByName?.[styleName]) || sub.style || {};
        const playResX = Number(assInfo.PlayResX) || videoRect.sourceWidth || 1920;
        const playResY = Number(assInfo.PlayResY) || videoRect.sourceHeight || 1080;
        const scaleX = videoRect.width / playResX;
        const scaleY = videoRect.height / playResY;
        const fontName = tags.fontName || style.Fontname || "Arial";
        const baseFontSize = Number(tags.fontSize ?? style.Fontsize ?? 48);
        const bold = tags.bold ?? Number(style.Bold) !== 0;
        const italic = tags.italic ?? Number(style.Italic) !== 0;
        const underline = tags.underline ?? Number(style.Underline) !== 0;
        const strike = tags.strike ?? Number(style.StrikeOut) !== 0;
        const rawScaleX = Number(tags.scaleX ?? (Number(style.ScaleX) || 100) / 100);
        const rawScaleY = Number(tags.scaleY ?? (Number(style.ScaleY) || 100) / 100);
        const scaleFactorX = Number.isFinite(rawScaleX) && rawScaleX !== 0 ? rawScaleX : 1;
        const scaleFactorY = Number.isFinite(rawScaleY) && rawScaleY !== 0 ? rawScaleY : 1;
        const fontSize = baseFontSize * scaleY;
        if (!Number.isFinite(fontSize) || fontSize <= 0) return;
        ctx.save();
        ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${Math.max(1, fontSize)}px "${fontName}"`;
        ctx.letterSpacing = `${Number(tags.spacing ?? style.Spacing ?? 0) * scaleX}px`;
        ctx.textRendering = "geometricPrecision";
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.miterLimit = 2;
        let alpha = 1;
        if (tags.fade) {
            const t = sub.currentTime - sub.start;
            const length = sub.end - sub.start;
            if (t < tags.fade.in) {
                alpha = t / tags.fade.in;
            }
            if (length - t < tags.fade.out) {
                alpha = Math.min(alpha, (length - t) / tags.fade.out);
            }
        }
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        let alignment = Number(tags.alignment ?? style.Alignment ?? 2);
        if (sub.assOptions?.styles?.legacy) {
            const legacyAlignmentMap = { 5: 7, 6: 8, 7: 9, 9: 4, 10: 5, 11: 6 };
            alignment = legacyAlignmentMap[alignment] ?? alignment;
        }
        const safeAlignment = Number.isInteger(alignment) && alignment >= 1 && alignment <= 9
            ? alignment
            : 2;
        const eventMarginL = Number(sub.MarginL);
        const eventMarginR = Number(sub.MarginR);
        const eventMarginV = Number(sub.MarginV);
        const styleMarginL = style.MarginL !== "" && style.MarginL != null ? Number(style.MarginL) : NaN;
        const styleMarginR = style.MarginR !== "" && style.MarginR != null ? Number(style.MarginR) : NaN;
        const styleMarginV = style.MarginV !== "" && style.MarginV != null ? Number(style.MarginV) : NaN;
        const marginL = (eventMarginL > 0 ? eventMarginL : Number.isFinite(styleMarginL) ? styleMarginL : 10) * scaleX;
        const marginR = (eventMarginR > 0 ? eventMarginR : Number.isFinite(styleMarginR) ? styleMarginR : 10) * scaleX;
        const marginV = (eventMarginV > 0 ? eventMarginV : Number.isFinite(styleMarginV) ? styleMarginV : 10) * scaleY;
        let x;
        let y;
        switch (safeAlignment) {
            case 1:
            case 4:
            case 7:
                ctx.textAlign = "left";
                x = videoRect.x + marginL;
                break;
            case 3:
            case 6:
            case 9:
                ctx.textAlign = "right";
                x = videoRect.x + videoRect.width - marginR;
                break;
            default:
                ctx.textAlign = "center";
                x = videoRect.x + videoRect.width / 2;
        }
        if (safeAlignment <= 3) {
            ctx.textBaseline = "bottom";
            y = videoRect.y + videoRect.height - marginV;
        } else if (safeAlignment <= 6) {
            ctx.textBaseline = "middle";
            y = videoRect.y + videoRect.height / 2;
        } else {
            ctx.textBaseline = "top";
            y = videoRect.y + marginV;
        }
        if (tags.pos) {
            x = videoRect.x + tags.pos.x * scaleX;
            y = videoRect.y + tags.pos.y * scaleY;
        }
        if (tags.move) {
            const move = tags.move;
            const moveEnd = Number.isFinite(move.t2) ? move.t2 : (sub.end - sub.start) * 1000;
            const duration = Math.max(0.001, (moveEnd - move.t1) / 1000);
            const progress = Math.max(0, Math.min(1, (sub.currentTime - sub.start - move.t1 / 1000) / duration));
            x = videoRect.x + (move.x1 + (move.x2 - move.x1) * progress) * scaleX;
            y = videoRect.y + (move.y1 + (move.y2 - move.y1) * progress) * scaleY;
        }
        const originX = tags.org ? videoRect.x + tags.org.x * scaleX : x;
        const originY = tags.org ? videoRect.y + tags.org.y * scaleY : y;
        ctx.translate(originX, originY);
        const rotation = Number(tags.rotation ?? style.Angle ?? 0);
        if (rotation) {
            ctx.rotate((rotation * Math.PI) / 180);
        }
        if (scaleFactorX !== 1 || scaleFactorY !== 1) {
            ctx.scale(scaleFactorX, scaleFactorY);
        }
        ctx.translate(-originX, -originY);
        const outline = Math.max(0, Number(tags.outline ?? style.Outline ?? 0) * scaleY);
        const shadow = Math.max(0, Number(tags.shadow ?? style.Shadow ?? 0));
        const shadowX = shadow * scaleX;
        const shadowY = shadow * scaleY;
        const blur = Math.max(0, Number(tags.blur ?? 0)) * Math.max(scaleX, scaleY);
        const outlineColor = this.assColor(tags.outlineColour || style.OutlineColour || "&H00000000&", tags.outlineAlpha ?? tags.alpha);
        const shadowColor = this.assColor(tags.shadowColour || style.BackColour || style.SecondaryColour || "&H00000000&", tags.shadowAlpha ?? tags.alpha);
        const fillColor = this.assColor(tags.primaryColour || style.PrimaryColour || "&H00FFFFFF&", tags.primaryAlpha ?? tags.alpha);
        const lines = String(sub.text || "")
            .replace(/\\h/g, "\u00a0")
            .replace(/\\N/g, "\n")
            .replace(/\\n/g, "\n")
            .split("\n");
        const maxLineWidth = Math.max(1, (videoRect.width - marginL - marginR) / Math.abs(scaleFactorX));
        const wrapStyle = Number(tags.wrapStyle ?? assInfo.WrapStyle ?? 0);
        const wrappedLines = [];
        for (const paragraph of lines) {
            if (wrapStyle === 2 || ctx.measureText(paragraph).width <= maxLineWidth) {
                wrappedLines.push(paragraph);
                continue;
            }
            let line = "";
            for (const character of Array.from(paragraph)) {
                if (ctx.measureText(line + character).width <= maxLineWidth || !line) {
                    line += character;
                } else {
                    const lastSpace = line.lastIndexOf(" ");
                    if (lastSpace >= 0) {
                        wrappedLines.push(line.slice(0, lastSpace).trimEnd());
                        line = `${line.slice(lastSpace + 1).trimStart()}${character}`;
                    } else {
                        wrappedLines.push(line);
                        line = character;
                    }
                }
            }
            wrappedLines.push(line);
        }
        const lineHeight = fontSize * 1.2;
        const blockHeight = lineHeight * wrappedLines.length;
        const firstBaseline = safeAlignment <= 3
            ? y - lineHeight * (wrappedLines.length - 1)
            : safeAlignment <= 6
                ? y - blockHeight / 2 + fontSize
                : y + fontSize;
        ctx.textBaseline = "alphabetic";
        if (shadow > 0) {
            ctx.fillStyle = shadowColor;
            for (let i = 0; i < wrappedLines.length; i++) {
                const yy = firstBaseline + i * lineHeight;
                ctx.fillText(wrappedLines[i], x + shadowX, yy + shadowY);
            }
        }
        if (blur > 0) {
            ctx.save();
            ctx.filter = `blur(${blur}px)`;
            ctx.fillStyle = fillColor;
            for (let i = 0; i < wrappedLines.length; i++) {
                const yy = firstBaseline + i * lineHeight;
                ctx.fillText(wrappedLines[i], x, yy);
            }
            ctx.restore();
        }
        ctx.lineWidth = outline;
        ctx.strokeStyle = outlineColor;
        ctx.fillStyle = fillColor;
        for (let i = 0; i < wrappedLines.length; i++) {
            const yy = firstBaseline + i * lineHeight;
            if (outline > 0) {
                ctx.strokeText(wrappedLines[i], x, yy);
            }
            ctx.fillText(wrappedLines[i], x, yy);
        }
        if (underline || strike) {
            ctx.strokeStyle = fillColor;
            ctx.lineWidth = Math.max(1, fontSize * 0.08);
            ctx.beginPath();
            for (let i = 0; i < wrappedLines.length; i++) {
                const yy = firstBaseline + i * lineHeight;
                const textWidth = ctx.measureText(wrappedLines[i]).width || 0;
                const lineStart = safeAlignment % 3 === 1
                    ? x
                    : safeAlignment % 3 === 0
                        ? x - textWidth
                        : x - textWidth / 2;
                if (underline) {
                    ctx.moveTo(lineStart, yy + fontSize * 0.08);
                    ctx.lineTo(lineStart + textWidth, yy + fontSize * 0.08);
                }
                if (strike) {
                    ctx.moveTo(lineStart, yy - fontSize * 0.35);
                    ctx.lineTo(lineStart + textWidth, yy - fontSize * 0.35);
                }
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    assColor(value, alphaOverride) {
        if (!value) return "rgba(255,255,255,1)";
        const cleaned = String(value).trim().replace(/^&H/i, "").replace(/&$/, "").replace(/^#/, "");
        if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(cleaned)) return "rgba(255,255,255,1)";
        const hasAlpha = cleaned.length === 8;
        const alphaValue = alphaOverride == null
            ? (hasAlpha ? parseInt(cleaned.slice(0, 2), 16) : 0)
            : parseInt(String(alphaOverride).replace(/^&H/i, "").replace(/&$/, ""), 16);
        const color = hasAlpha ? cleaned.slice(2) : cleaned;
        const blue = parseInt(color.slice(0, 2), 16);
        const green = parseInt(color.slice(2, 4), 16);
        const red = parseInt(color.slice(4, 6), 16);
        const alpha = Number.isFinite(alphaValue) ? Math.max(0, Math.min(255, alphaValue)) : 0;
        return `rgba(${red}, ${green}, ${blue}, ${1 - alpha / 255})`;
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
            retro: new RetroRenderer(canvas, ctx, audioCtx, config),
            video: new VideoRender(canvas, ctx, audioCtx, config),
        };
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
