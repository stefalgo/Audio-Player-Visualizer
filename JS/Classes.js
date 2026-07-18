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

        this.tooltip.innerHTML = target.dataset.tip;

        const tooltipHeight = this.tooltip.offsetHeight;
        const tooltipWidth = this.tooltip.offsetWidth;
        const margin = 10;

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
        this.content = win.querySelector(".window-content");
        this.bar = win.querySelector(".window-topbar");
        this.onFocusCallback = null;

        if (!this.bar) return;

        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        this.minimized = false;

        this.win.style.position = "absolute";
        this.bar.style.cursor = "grab";

        this.win.addEventListener("pointerdown", this.onFocus);

        this.bar.insertAdjacentHTML("beforeend", `
            <span>
                <button class="button minimize">-</button>
                <button class="button close">X</button>
            </span>
        `);

        this.minimizeBtn = this.bar.querySelector(".minimize");
        this.closeBtn = this.bar.querySelector(".close");

        this.minimizeBtn.addEventListener("click", this.onMinimize);
        this.closeBtn.addEventListener("click", this.onClose);

        this.bar.addEventListener("pointerdown", this.onPointerDown);
        window.addEventListener("pointermove", this.onPointerMove);
        window.addEventListener("pointerup", this.onPointerUp);
        window.addEventListener("pointercancel", this.onPointerUp);
        window.addEventListener("resize", this.keepInsideViewport);
    }

    keepInsideViewport = () => {
        if (getComputedStyle(this.win).display === "none") return;
        const rect = this.win.getBoundingClientRect();
        let x = rect.left;
        let y = rect.top;
        const maxX = window.innerWidth - this.win.offsetWidth;
        const maxY = window.innerHeight - this.win.offsetHeight;
        x = Math.max(0, Math.min(maxX, x));
        y = Math.max(0, Math.min(maxY, y));
        this.win.style.left = `${x}px`;
        this.win.style.top = `${y}px`;
        this.win.style.right = "auto";
        this.win.style.bottom = "auto";
    };

    onMinimize = () => {
        const hidden = getComputedStyle(this.content).display === "none";
        this.minimized = hidden;
        this.content.style.display = this.minimized ? "" : "none";
        this.minimizeBtn.innerText = this.minimized ? "-" : "+";
        if (this.minimized) {
            this.keepInsideViewport();
        }
    };

    onClose = () => {
        this.win.style.display = "none";
    };

    onFocus = () => {
        this.onFocusCallback?.(this);
    };

    onPointerDown = (e) => {
        if (e.target.closest(".minimize, .close")) return;
        e.preventDefault();
        const rect = this.win.getBoundingClientRect();
        this.win.style.left = `${rect.left}px`;
        this.win.style.top = `${rect.top}px`;
        this.win.style.right = "auto";
        this.win.style.bottom = "auto";
        this.dragging = true;
        this.offsetX = e.clientX - rect.left;
        this.offsetY = e.clientY - rect.top;
        this.bar.style.cursor = "grabbing";
        this.bar.setPointerCapture(e.pointerId);
        this.onFocus();
        document.body.style.userSelect = "none";
    };

    onPointerMove = (e) => {
        if (!this.dragging) return;
        let x = e.clientX - this.offsetX;
        let y = e.clientY - this.offsetY;
        this.win.style.left = `${x}px`;
        this.win.style.top = `${y}px`;
        this.keepInsideViewport();
    };

    onPointerUp = () => {
        if (!this.dragging) return;
        this.dragging = false;
        this.bar.style.cursor = "grab";
        document.body.style.userSelect = "";
    };

    destroy() {
        this.win.removeEventListener("pointerdown", this.onFocus);
        this.bar.removeEventListener("pointerdown", this.onPointerDown);
        window.removeEventListener("pointermove", this.onPointerMove);
        window.removeEventListener("pointerup", this.onPointerUp);
        window.removeEventListener("pointercancel", this.onPointerUp);
        this.minimizeBtn.removeEventListener("click", this.onMinimize);
        this.closeBtn.removeEventListener("click", this.onClose);
        window.removeEventListener("resize", this.keepInsideViewport);
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
            if (isTypingOrEditing()) return;
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

        this.dragStartGains = [];

        this.linkSliders = false;
        this.linkType = "quad";
        this.linkQ = 4;

        this.linkFunction = (distance) => {
            const x = Math.min(distance / this.linkQ, 1);
            return 1 - this.ease(x, this.linkType);
        };
    }

    ease(t, type) {
        switch (type) {
            case "linear":
                return t;
            case "sine":
                return 1 - Math.cos((t * Math.PI) / 2);
            case "quad":
                return t * t;
            case "cubic":
                return t * t * t;
            case "quart":
                return t * t * t * t;
            case "quint":
                return t * t * t * t * t;
            case "back":
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return c3 * t * t * t - c1 * t * t;
            case "circ":
                return 1 - Math.sqrt(1 - t * t);
            case "expo":
                return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
            default:
                return t;
        }
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
        const leds = this.leds;
        const step = this.sliderH / leds;
        const index = this.centerIndex - g;
        return this.top() + index * step + step / 2;
    }

    yToGain(y) {
        const leds = this.leds;
        const step = this.sliderH / leds;
        const index = Math.round((y - this.top() - step / 2) / step);
        return this.centerIndex - index;
    }

    formatFreq(f) {
        return f >= 1000 ? (f / 1000) + ' k' : `${f} `;
    }

    hit(x, y) {
        for (let i = 0; i < this.bands.length; i++) {
            const sx = this.x(i);
            const sy = this.top();
            const offset = 10;
            if (x > sx - 18 && x < sx + 18 && y > sy - offset && y < sy + this.sliderH + offset) return i;
        }
        return -1;
    }

    down(e) {
        const m = this.mouse(e);
        const i = this.hit(m.x, m.y);
        if (i !== -1) {
            this.active = i;
            this.dragging = true;
            this.dragStartGains = this.bands.map(b => b.gain);
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
        const delta = g - this.dragStartGains[i];
        this.bands[i].gain = g;
        if (this.linkSliders) {
            for (let n = 0; n < this.bands.length; n++) {
                if (n === i) continue;
                const distance = Math.abs(n - i);
                const amount = this.linkFunction(distance);
                let newGain = this.dragStartGains[n] + (delta * amount);
                newGain = Math.round(newGain);
                newGain = Math.max(
                    -this.range,
                    Math.min(this.range, newGain)
                );
                this.bands[n].gain = newGain;
            }
        }
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

class TooltipDialog {
    static confirm(targetEl, message = "よろしいですか？", btn = 0) {
        return new TooltipDialog(targetEl, {
            type: "confirm",
            message,
            btn
        }).show();
    }
    static prompt(targetEl, message = "値を入力してください", defaultValue = "", btn = 0) {
        return new TooltipDialog(targetEl, {
            type: "prompt",
            message,
            defaultValue,
            btn
        }).show();
    }
    static info(targetEl, message = "") {
        return new TooltipDialog(targetEl, {
            type: "info",
            message
        }).show();
    }

    constructor(targetEl, {
        type,
        message,
        btn = 0,
        defaultValue = ""
    }) {
        this.targetEl = targetEl;
        this.type = type;
        this.message = message;
        this.btn = btn;
        this.defaultValue = defaultValue;
        this.box = null;
        this.resolve = null;
    }

    show() {
        return new Promise((resolve) => {
            this.resolve = resolve;
            const existing = document.getElementById("tc-confirm");
            if (existing) existing.remove();
            this.box = document.createElement("div");
            this.box.id = "tc-confirm";
            this.render();
            document.body.appendChild(this.box);
            this.cache();
            this.styleButtons();
            this.position();
            this.bindEvents();

            setTimeout(() => {
                if (this.type === "prompt") {
                    this.input?.focus();
                    this.input?.select();
                } else {
                    (this.btn === 0 ? this.okBtn : this.cancelBtn)?.focus();
                }
            }, 0);

            setTimeout(() => {
                document.addEventListener("mousedown", this.outsideHandler);
            }, 0);
        });
    }

    render() {
        if (this.type === "confirm") {
            this.box.innerHTML = `
                <div id="tc-msg">${this.message}</div>
                <div class="tc-btns">
                    <button id="tc-ok" class="tc-btn ok button">はい</button>
                    <button id="tc-cancel" class="tc-btn cancel button">いいえ</button>
                </div>
            `;
        }

        else if (this.type === "prompt") {
            this.box.innerHTML = `
                <div id="tc-msg">${this.message}</div>
                <div class="tc-btns">
                    <input id="tc-input" class="button" type="text" value="${this.defaultValue}">
                    <button id="tc-ok" class="tc-btn ok button">確定</button>
                    <button id="tc-cancel" class="tc-btn cancel button">キャンセル</button>
                </div>
            `;
        }

        else if (this.type === "info") {
            this.box.innerHTML = `
                <div id="tc-msg">${this.message}</div>
                <div class="tc-btns">
                    <button id="tc-ok" class="tc-btn ok button">OK</button>
                </div>
            `;
        }
    }

    cache() {
        this.okBtn = this.box.querySelector("#tc-ok");
        this.cancelBtn = this.box.querySelector("#tc-cancel");
        this.input = this.box.querySelector("#tc-input");
    }

    styleButtons() {
        const green = "hsla(130, 100%, 50%, 0.2)";
        const grey = "hsla(0, 0%, 40%, 0.2)";
        if (this.okBtn) this.okBtn.style.background = this.btn === 0 ? green : grey;
        if (this.cancelBtn) this.cancelBtn.style.background = this.btn === 0 ? grey : green;
    }

    position() {
        if (!this.targetEl) {
            this.box.style.left = `50%`;
            this.box.style.top = `5px`;
            this.box.style.transform = `translateX(-50%)`;
            return;
        }
        const rect = this.targetEl.getBoundingClientRect();
        const margin = 10;
        const width = this.box.offsetWidth;
        const height = this.box.offsetHeight;
        const maxX = window.scrollX + window.innerWidth;
        const fitsBelow = rect.bottom + height + margin < window.innerHeight;
        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + margin;

        if (left + width > maxX) left = maxX - width - margin;
        if (left < window.scrollX + margin) left = window.scrollX + margin;
        if (!fitsBelow) top = rect.top + window.scrollY - height - margin;

        this.box.style.left = `${left}px`;
        this.box.style.top = `${top}px`;
    }

    bindEvents() {
        const cleanup = () => {
            this.box.remove();
            document.removeEventListener("mousedown", this.outsideHandler);
        };

        if (this.okBtn) {
            this.okBtn.onclick = () => {
                cleanup();
                if (this.type === "prompt") {
                    const val = this.input.value.trim();
                    this.resolve(val === "" ? false : val);
                } else {
                    this.resolve(true);
                }
            };
        }

        if (this.cancelBtn) {
            this.cancelBtn.onclick = () => {
                cleanup();
                this.resolve(false);
            };
        }

        if (this.type === "prompt") {
            this.input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    cleanup();
                    const val = this.input.value.trim();
                    this.resolve(val === "" ? false : val);
                }
                if (e.key === "Escape") {
                    cleanup();
                    this.resolve(false);
                }
            });
        }

        this.outsideHandler = (e) => {
            if (!this.box.contains(e.target)) {
                this.box.remove();
                document.removeEventListener("mousedown", this.outsideHandler);
                this.resolve(false);
            }
        };
    }
}

class WallpaperSwitcher {
    constructor(container) {
        this.container = container;
        this.current;
        this.topActive = false;

        this.w1 = this.container.querySelector(".wallpaper1");
        this.w2 = this.container.querySelector(".wallpaper2");
    }

    random(wallpapers) {
        return wallpapers[Math.random() * wallpapers.length | 0];
    }

    nextRandom(wallpapers) {
        let next;
        do next = this.random(wallpapers);
        while (next === this.current && wallpapers.length > 1);

        this.apply(next);
    }

    nextIndex(wallpapers, i) {
        if (i < 0 || i >= wallpapers.length) return;
        this.apply(wallpapers[i]);
    }

    setWallpaper(element, wallpaper) {
        element.style.backgroundImage = `url("${wallpaper.src}")`;
        element.style.backgroundSize = wallpaper.size ?? "";
        element.style.backgroundPositionY = wallpaper.offset ?? "";
    }

    apply(wallpaper) {
        const top = this.topActive ? this.w1 : this.w2;
        const bottom = this.topActive ? this.w2 : this.w1;

        this.setWallpaper(top, wallpaper);

        requestAnimationFrame(() => {
            top.style.opacity = 1;
            bottom.style.opacity = 0;
        });

        this.current = wallpaper;
        this.topActive = !this.topActive;
    }
}

class SubtitleEditor {
    constructor(winId) {
        this.win = document.getElementById(winId);

        this.list = this.win.querySelector("#subList");
        this.out = this.win.querySelector("#subOut");
        this.start = this.win.querySelector("#subStart");
        this.end = this.win.querySelector("#subEnd");
        this.text = this.win.querySelector("#subText");
        this.btnSave = this.win.querySelector("#subSaveBtn");
        this.btnClear = this.win.querySelector("#subClearBtn");
        this.btnExport = this.win.querySelector("#subExportBtn");
        this.btnAdd = this.win.querySelector("#subAddBtn");
        this.btnRemove = this.win.querySelector("#subRemoveBtn");

        this.data = [];
        this.sel = -1;

        this.bind();
    }

    bind() {
        this.btnSave.onclick = () => this.save();
        this.btnClear.onclick = () => this.clear();
        this.btnExport.onclick = () => this.export();
        this.btnAdd.onclick = () => this.add();
        this.btnRemove.onclick = () => this.remove();
    }

    load(arr) {
        this.data = arr || [];
        this.sel = -1;
        this.render();
    }

    render() {
        this.list.innerHTML = "";
        this.data.forEach((s, i) => {
            const d = document.createElement("div");
            const active = i === this.sel ? "background:#2a2a2a" : "";
            d.style.cssText = "padding:5px;border-bottom:1px solid #222;cursor:pointer;" + active;
            d.innerHTML = `${s.start.toFixed(2)} → ${s.end.toFixed(2)}<br>` + `${this.escape(s.text.slice(0, 50))}`;
            d.onclick = () => this.select(i);
            this.list.appendChild(d);
        });
    }

    fillEditor() {
        if (this.sel < 0) return;
        const s = this.data[this.sel];
        this.start.value = s.start;
        this.end.value = s.end;
        this.text.value = s.text;
    }

    select(i) {
        this.sel = i;
        this.fillEditor();
        this.render();
    }

    add() {
        const last = this.data[this.data.length - 1];
        const item = {
            start: this.start.value !== "" ? +this.start.value : (last ? last.end : 0),
            end: this.end.value !== "" ? +this.end.value : (last ? last.end + 2 : 1),
            text: this.text.value.trim() || "new subtitle"
        };

        this.data.push(item);
        this.sel = this.data.length - 1;
        this.render();
        this.fillEditor();
    }

    remove() {
        if (this.sel < 0) return;

        this.data.splice(this.sel, 1);
        this.sel = -1;
        this.render();
        this.start.value = "";
        this.end.value = "";
        this.text.value = "";
    }

    save() {
        if (this.sel < 0) return;
        const s = this.data[this.sel];
        s.start = +this.start.value;
        s.end = +this.end.value;
        s.text = this.text.value;
        this.render();
    }

    clear() {
        this.data = [];
        this.sel = -1;
        this.list.innerHTML = "";
        this.out.value = "";
    }

    export() {
        let t = "";
        this.data.forEach((s, i) => {
            t += `${i + 1}\n`;
            t += `${this.fmt(s.start)} --> ${this.fmt(s.end)}\n`;
            t += `${s.text}\n\n`;
        });
        this.out.value = t;
        this.out.select();
        document.execCommand("copy");
    }

    fmt(s) { // format time thing
        const h = String(s / 3600 | 0).padStart(2, "0");
        const m = String(s % 3600 / 60 | 0).padStart(2, "0");
        const ss = (s % 60).toFixed(3).padStart(6, "0");
        return `${h}:${m}:${ss.replace(".", ",")}`;
    }

    escape(t) {
        return t.replace(/[&<>"']/g, m => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[m]));
    }
}
