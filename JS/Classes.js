class AudioBands {
    static getBandPower(data, iLow, iHigh) {
        let power = 0;
        for (let i = iLow; i <= iHigh; i++) {
            power += Math.pow(10, data[i] / 10);
        }
        return power;
    }

    static powerToDb(power) {
        return power > 0 ? 10 * Math.log10(power) : -90;
    }

    static normalizeDb(db, minDb, maxDb) {
        let n = (db - minDb) / (maxDb - minDb);
        return Math.max(0, Math.min(1, n));
    }

    static curve(x) {
        x = Math.max(0, x - 0.02);
        x = Math.log10(1 + 9 * x);
        return Math.pow(x, 2.4);
    }

    static processBand(data, iLow, iHigh, minDb, maxDb) {
        const power = this.getBandPower(data, iLow, iHigh);
        const db = this.powerToDb(power);
        const norm = this.normalizeDb(db, minDb, maxDb);
        return this.curve(norm);
    }

    static peakHoldUpdate({
        level,
        holdArray,
        timerArray,
        index,
        now,
        holdTime,
        releaseSpeed
    }) {
        if (level > holdArray[index]) {
            holdArray[index] = level;
            timerArray[index] = now;
        } else if (now - timerArray[index] > holdTime) {
            holdArray[index] = Math.max(
                level,
                holdArray[index] - releaseSpeed
            );
        }
    }
}

class SliderProgress {
    constructor(slider) {
        if (!(slider instanceof HTMLElement)) {
            throw new Error("SliderProgress expects a DOM element");
        }

        this.slider = slider;

        if (this.getMax() <= this.getMin()) return;

        this.update = this.update.bind(this);

        this.init();
    }

    getMin() {
        return Number(this.slider.min ?? 0);
    }

    getMax() {
        return Number(this.slider.max ?? 100);
    }

    init() {
        this.update();

        this.slider.addEventListener("input", this.update);

        const proto = Object.getPrototypeOf(this.slider);
        const descriptor = Object.getOwnPropertyDescriptor(proto, "value");

        if (!descriptor || !descriptor.set) return;

        Object.defineProperty(this.slider, "value", {
            get: descriptor.get,
            set: (v) => {
                descriptor.set.call(this.slider, v);
                this.update();
            }
        });
    }

    update() {
        const min = this.getMin();
        const max = this.getMax();
        const value = Number(this.slider.value);

        if (max <= min) return;

        const percent = ((value - min) / (max - min)) * 100;

        this.slider.style.setProperty("--value", `${percent}%`);
    }
}

class TooltipManager {
    constructor() {
        this.tooltip = document.createElement('div');
        this.tooltip.classList.add('tooltip');
        document.body.appendChild(this.tooltip);

        this.activeElement = null;

        this.updateTooltip = this.updateTooltip.bind(this);
        this.hideTooltip = this.hideTooltip.bind(this);
        this.tipObserver = new MutationObserver(() => {
            if (this.activeElement) {
                this.tooltip.textContent = this.activeElement.dataset.tip || "";
            }
        });

        this.init();
    }

    init() {
        document.addEventListener('mousemove', this.updateTooltip);
        document.addEventListener('mouseout', this.hideTooltip);
    }

    hideTooltip(event) {
        if (this.activeElement && !event.relatedTarget?.closest('[data-tip]')) {
            this.tooltip.style.visibility = 'hidden';
            this.tooltip.style.opacity = '0';
            this.activeElement = null;
        }
    }

    updateTooltip(event) {
        const target = event.target.closest('[data-tip]');

        if (!target || target.dataset.tip === '') {
            this.tooltip.style.visibility = 'hidden';
            this.tooltip.style.opacity = '0';

            this.tipObserver.disconnect();
            this.activeElement = null;

            return;
        }

        if (target !== this.activeElement) {
            this.tipObserver.disconnect();

            this.tipObserver.observe(target, {
                attributes: true,
                attributeFilter: ['data-tip']
            });

            this.activeElement = target;
        }

        this.tooltip.textContent = target.dataset.tip;

        const tooltipHeight = this.tooltip.offsetHeight;
        const tooltipWidth = this.tooltip.offsetWidth;
        const margin = 10

        let top = event.pageY + 20;
        let left = event.pageX + 10;

        if (top + tooltipHeight + margin > window.scrollY + window.innerHeight) {
            top = event.pageY - tooltipHeight - margin;
        }

        if (left + tooltipWidth + margin > window.scrollX + window.innerWidth) {
            left = window.scrollX + window.innerWidth - tooltipWidth - margin;
        }

        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.visibility = 'visible';
        this.tooltip.style.opacity = '1';
    }

    destroy() {
        document.removeEventListener('mousemove', this.updateTooltip);
        document.removeEventListener('mouseout', this.hideTooltip);
        this.tooltip.remove();
    }
}

class MovableWindow {
    constructor(win) {
        this.win = win;
        this.bar = win.querySelector(".window-topbar");

        if (!this.bar) return;

        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        this.win.style.position = "absolute";
        this.bar.style.cursor = "grab";

        this.bar.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
    }

    onMouseDown = (e) => {
        this.dragging = true;

        const rect = this.win.getBoundingClientRect();

        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;

        this.bar.style.cursor = "grabbing";

        const computed = window.getComputedStyle(this.win);
        const right = computed.right !== "auto";
        const bottom = computed.bottom !== "auto";

        if (right || bottom) {
            this.win.style.left = rect.left + "px";
            this.win.style.top = rect.top + "px";
            this.win.style.right = "auto";
            this.win.style.bottom = "auto";
        }

        document.body.style.userSelect = "none";
    };

    onMouseMove = (e) => {
        if (!this.dragging) return;

        const w = this.win.offsetWidth;
        const h = this.win.offsetHeight;

        const maxX = window.innerWidth - w;
        const maxY = window.innerHeight - h;

        let x = e.clientX - this.offsetX;
        let y = e.clientY - this.offsetY;

        x = Math.max(0, Math.min(maxX, x));
        y = Math.max(0, Math.min(maxY, y));

        this.win.style.left = `${x}px`;
        this.win.style.top = `${y}px`;
    };

    onMouseUp = () => {
        if (!this.dragging) return;

        this.dragging = false;
        this.bar.style.cursor = "grab";
        document.body.style.userSelect = "";
    };

    destroy() {
        this.bar.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
    }
}

class LoopToggle {
    constructor(button, states, onChange, initialMode = states[0], labels = {}) {
        this.button = button;
        this.states = states;
        this.labels = labels;
        this.onChange = onChange;

        this.index = Math.max(0, states.indexOf(initialMode));

        this.button.addEventListener("click", () => this.next());

        this.render();
    }

    next() {
        this.index = (this.index + 1) % this.states.length;
        this.render();
    }

    render() {
        const mode = this.getMode();

        this.button.dataset.mode = mode;
        this.button.dataset.tip = this.labels[mode] ?? mode;

        if (this.onChange) {
            this.onChange(mode);
        }
    }

    getMode() {
        return this.states[this.index];
    }

    setMode(mode) {
        const i = this.states.indexOf(mode);

        if (i !== -1) {
            this.index = i;
            this.render();
        }
    }
}

class HumanRandom {
    constructor({
        memorySize = 5,
        getKey = item => item
    } = {}) {
        this.memorySize = memorySize;
        this.getKey = getKey;
        this.history = [];
    }

    remember(item) {
        const key = this.getKey(item);
        this.history = this.history.filter(k => k !== key);
        this.history.push(key);
        while (this.history.length > this.memorySize) {
            this.history.shift();
        }
    }

    pick(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return null;
        }
        const itemKeys = new Set(items.map(item => this.getKey(item)));
        this.history = this.history.filter(key => itemKeys.has(key));
        let available = items.filter(item => !this.history.includes(this.getKey(item)));

        if (available.length === 0) {
            available = [...items];
        }

        const selected = available[Math.floor(Math.random() * available.length)];
        this.remember(selected);
        return selected;
    }

    setMemory(num) {
        this.memorySize = Math.floor(num / 2)
    }

    forget(item) {
        const key = this.getKey(item);
        this.history = this.history.filter(k => k !== key);
    }
}

class SpaceController {
    constructor({ onTap, onHoldStart, onHoldEnd, holdDelay = 200 } = {}) {
        this.onTap = onTap;
        this.onHoldStart = onHoldStart;
        this.onHoldEnd = onHoldEnd;
        this.holdDelay = holdDelay;
        this.spaceHeld = false;
        this.timer = null;
    }

    keydown = (e) => {
        if (isTypingOrEditing()) return;
        if (e.code !== "Space") return;
        e.preventDefault();
        if (e.repeat) return;
        this.spaceHeld = false;
        this.timer = setTimeout(() => {
            this.spaceHeld = true;
            this.onHoldStart?.();
        }, this.holdDelay);
    };

    keyup = (e) => {
        if (e.code !== "Space") return;
        clearTimeout(this.timer);
        if (this.spaceHeld) {
            this.onHoldEnd?.();
        } else {
            this.onTap?.();
        }
    };

    attach() {
        document.addEventListener("keydown", this.keydown);
        document.addEventListener("keyup", this.keyup);
    }

    detach() {
        document.removeEventListener("keydown", this.keydown);
        document.removeEventListener("keyup", this.keyup);
        clearTimeout(this.timer);
    }
}

class CanvasEQ {
    constructor(canvas, freqs, range = 12) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.freqs = freqs;
        this.range = range;
        this.width = 650;
        this.height = 320;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.sliderH = 260;
        this.bands = freqs.map(f => ({ freq: f, gain: 0 }));
        this.active = -1;
        this.dragging = false;
        this.onChangeCallbacks = [];
        this.bind();
        this.loop();
    }

    onChange(fn) {
        this.onChangeCallbacks.push(fn);
    }

    bind() {
        this.canvas.addEventListener('mousedown', e => this.down(e));
        this.canvas.addEventListener('mousemove', e => this.move(e));
        window.addEventListener('mouseup', () => this.dragging = false);
    }

    mouse(e) {
        const r = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (this.width / r.width),
            y: (e.clientY - r.top) * (this.height / r.height)
        };
    }

    x(i) {
        const spacing = this.width / (this.bands.length + 1);
        return spacing * (i + 1);
    }

    top() {
        return this.height / 2 - this.sliderH / 2;
    }

    get leds() { return (this.range * 2) + 1; }
    get centerIndex() { return this.range; }

    gainToY(g) {
        const mid = this.height / 2;
        return mid - (g / this.range) * (this.sliderH / 2);
    }

    yToGain(y) {
        const mid = this.height / 2;
        return -((y - mid) / (this.sliderH / 2)) * this.range;
    }

    formatFreq(f) {
        return f >= 1000 ? (f / 1000) + 'k' : f;
    }

    hit(x, y) {
        for (let i = 0; i < this.bands.length; i++) {
            const sx = this.x(i);
            const sy = this.top();
            if (x > sx - 18 && x < sx + 18 && y > sy && y < sy + this.sliderH) return i;
        }
        return -1;
    }

    down(e) {
        const m = this.mouse(e);
        const i = this.hit(m.x, m.y);
        if (i !== -1) {
            this.active = i;
            this.dragging = true;
            this.update(m);
        }
    }

    move(e) {
        if (!this.dragging) return;
        this.update(this.mouse(e));
    }

    emitChange() {
        const data = this.getData();

        for (const fn of this.onChangeCallbacks) {
            fn(data);
        }
    }

    update(m) {
        const i = this.active;
        let g = this.yToGain(m.y);
        g = Math.round(g);
        g = Math.max(-this.range, Math.min(this.range, g));
        this.bands[i].gain = g;
        this.emitChange();
    }

    drawLEDs(x, gain, top) {
        const ctx = this.ctx;
        const leds = this.leds;
        const center = this.centerIndex;
        const step = this.sliderH / leds;

        for (let i = 0; i < leds; i++) {
            const y = top + i * step + step / 2;
            let color = '#151515';
            if (i === center) color = '#444';
            if (gain > 0 && i < center && i >= center - gain) color = '#00ff66';
            if (gain < 0 && i > center && i <= center + Math.abs(gain)) color = '#ff3355';
            ctx.fillStyle = color;
            ctx.fillRect(x - 10, y - step / 2 + 1, 3, step - 2);
        }
    }

    drawSlider(i, gain) {
        const ctx = this.ctx;
        const x = this.x(i);
        const top = this.top();
        const mid = this.height / 2;
        const sliderX = x + 2;
        const ledX = x - 14;

        ctx.fillStyle = '#0000007a';
        ctx.fillRect(ledX - 20, top - 8, 55, this.height)
        this.drawLEDs(ledX, gain, top);

        ctx.fillStyle = '#161616';
        ctx.fillRect(sliderX, top, 8, this.sliderH);

        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(sliderX - 2, mid);
        ctx.lineTo(sliderX + 10, mid);
        ctx.stroke();

        const leds = this.leds;
        const step = this.sliderH / leds;

        ctx.strokeStyle = '#3a3a3a';

        for (let i = 0; i < leds; i++) {
            const y = top + i * step + step / 2;
            ctx.beginPath();
            ctx.moveTo(sliderX - 8, y);
            ctx.lineTo(ledX, y);
            ctx.stroke();
        }

        const y = this.gainToY(gain);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(sliderX - 3, y - 3, 14, 6);

        ctx.strokeStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(ledX - 20, top - 8);
        ctx.lineTo(sliderX + 20, top - 8);
        ctx.stroke();

        ctx.textAlign = 'center';

        ctx.fillStyle = gain === 0 ? '#888' : (gain > 0 ? '#00ff66' : '#ff3355');
        ctx.font = '11px monospace';
        ctx.fillText((gain > 0 ? '+' : '') + gain + ' dB', sliderX - 10, this.height / 2 + this.sliderH / 2 + 18);

        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(this.formatFreq(this.freqs[i]) + 'Hz', sliderX - 10, this.height / 2 - this.sliderH / 2 - 16);
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        for (let i = 0; i < this.bands.length; i++) {
            this.drawSlider(i, this.bands[i].gain);
        }
    }

    loop() {
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    getData() {
        return this.bands.map(b => ({ freq: b.freq, gain: b.gain }));
    }

    reset() {
        for (let i = 0; i < this.bands.length; i++) {
            this.bands[i].gain = 0;
        }
        this.emitChange();
    }

    loadPreset(gainList) {
        for (let i = 0; i < this.bands.length; i++) {
            this.bands[i].gain = gainList[i];
        }
        this.emitChange();
    }

    visualize(data, analyser) {
        const leds = this.leds;
        const step = this.sliderH / leds;
        const nyquist = analyser.context.sampleRate / 2;
        const ratioPow = Math.pow(2, 1 / 6);

        if (!this.peakHold) this.peakHold = new Array(this.bands.length).fill(0);

        if (!this.peakTimer) this.peakTimer = new Array(this.bands.length).fill(0);

        const now = performance.now();

        for (let i = 0; i < this.bands.length; i++) {

            const x = this.x(i);
            const top = this.top();
            const ledX = x - 14;
            const sliderX = x + 2;
            const fCenter = this.bands[i].freq;
            const fLow = Math.max(20, fCenter / ratioPow);
            const fHigh = Math.min(16000, fCenter * ratioPow);
            const toIndex = (f) => Math.floor((f / nyquist) * data.length);
            const iLow = toIndex(fLow);
            const iHigh = toIndex(fHigh);

            const value = AudioBands.processBand(
                data,
                iLow,
                iHigh,
                this.VIS_MIN_DB ?? -90,
                this.VIS_MAX_DB ?? -20
            );

            const level = Math.floor(value * leds);

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

            for (let l = 0; l < leds; l++) {

                const y = top + this.sliderH - (l + 1) * step + step / 2;

                const active = l < level || l === peakLevel;

                const norm = l / leds;

                let r = 0, g = 255, b = 70;

                if (norm > 0.6) {
                    r = 255;
                    g = Math.floor(255 * (1 - norm));
                } else if (norm > 0.3) {
                    r = Math.floor(255 * norm);
                    g = 255;
                }

                this.ctx.strokeStyle = active ? `rgb(${r},${g},${b})` : 'rgba(25,25,25,0.35)';

                this.ctx.lineWidth = active ? 2 : 1;
                this.ctx.beginPath();
                this.ctx.moveTo(ledX, y);
                this.ctx.lineTo(sliderX - 7, y);
                this.ctx.stroke();
            }
        }
    }
}

function tooltipConfirm(targetEl, message = "よろしいですか？", btn = 0, type = "confirm") {
    return new Promise((resolve) => {
        const existing = document.getElementById("tc-confirm");
        if (existing) existing.remove();
        const box = document.createElement("div");
        box.id = "tc-confirm";
        let okBtn, cancelBtn, input;

        if (type === "confirm") {
            box.innerHTML = `
                <div id="tc-msg">${message}</div>
                <div class="tc-btns">
                    <button class="tc-btn ok button" id="tc-ok">はい</button>
                    <button class="tc-btn cancel button" id="tc-cancel">いいえ</button>
                </div>
            `;
        }
        else if (type === "prompt") {
            box.innerHTML = `
                <div id="tc-msg">${message}</div>
                <div class="tc-btns">
                    <input type="text" class="button" id="tc-input">
                    <button class="tc-btn ok button" id="tc-ok">確定</button>
                    <button class="tc-btn cancel button" id="tc-cancel">キャンセル</button>
                </div>
            `;
        }
        else if (type === "info") {
            box.innerHTML = `
                <div id="tc-msg">${message}</div>
                <div class="tc-btns">
                    <button class="tc-btn ok button" id="tc-ok">OK</button>
                </div>
            `;
        }

        document.body.appendChild(box);

        okBtn = box.querySelector("#tc-ok");
        cancelBtn = box.querySelector("#tc-cancel");
        input = box.querySelector("#tc-input");

        const btnGreenColor = 'hsla(130, 100%, 50%, 0.2)';
        const btnGreyColor = 'hsla(0, 0%, 40%, 0.2)';

        if (okBtn) okBtn.style.background = btn === 0 ? btnGreenColor : btnGreyColor;
        if (cancelBtn) cancelBtn.style.background = btn === 0 ? btnGreyColor : btnGreenColor;

        setTimeout(() => {
            if (type === "prompt") {
                input?.focus();
                return;
            }

            if (btn === 0) {
                okBtn?.focus();
            } else {
                cancelBtn?.focus();
            }
        }, 0);

        const rect = targetEl.getBoundingClientRect();
        const margin = 10;
        const width = box.offsetWidth;
        const height = box.offsetHeight;
        const maxX = window.scrollX + window.innerWidth;
        const fitsBelow = rect.bottom + height + margin < window.innerHeight;

        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + margin;

        if (left + width > maxX) left = maxX - width - margin;
        if (left < window.scrollX + margin) left = window.scrollX + margin;
        if (!fitsBelow) top = rect.top + window.scrollY - height - margin;

        box.style.left = `${left}px`;
        box.style.top = `${top}px`;

        const cleanup = () => {
            box.remove();
            document.removeEventListener("mousedown", outside);
        };

        if (okBtn) {
            okBtn.onclick = () => {
                cleanup();
                if (type === "prompt") {
                    const value = input.value.trim();
                    resolve(value === "" ? false : value);
                } else {
                    resolve(true);
                }
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                cleanup();
                resolve(type === "prompt" ? false : false);
            };
        }

        if (type === "prompt" && input) {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const value = input.value.trim();
                    cleanup();
                    resolve(value === "" ? false : value);
                }

                if (e.key === "Escape") {
                    cleanup();
                    resolve(false);
                }
            });
        }

        const outside = (e) => {
            if (!box.contains(e.target)) {
                cleanup();
                resolve(type === "prompt" ? false : false);
            }
        };

        setTimeout(() => {
            document.addEventListener("mousedown", outside);
        }, 0);
    });
}
