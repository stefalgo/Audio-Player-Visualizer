class AudioEffect {
    constructor(ctx) {
        this.ctx = ctx;
        this.input = ctx.createGain();
        this.output = ctx.createGain();

    }

    connect(node) {
        this.output.connect(node);
        return node;
    }

    disconnect() {
        try {
            this.output.disconnect();
        } catch { }
    }

    destroy() {
        try {
            this.input.disconnect();
        } catch { }

        try {
            this.output.disconnect();
        } catch { }
    }
}

class EffectChain {
    constructor(ctx) {
        this.ctx = ctx;
        this.input = ctx.createGain();
        this.output = ctx.createGain();
        this.effects = [];
    }

    add(name, effect) {
        const previous = this.effects.length > 0 ? this.effects[this.effects.length - 1].effect.output : this.input;
        previous.connect(effect.input);
        this.effects.push({
            name,
            effect
        });
        return effect;
    }

    get(name) {
        return this.effects.find(e => e.name === name)?.effect ?? null;
    }

    connectOutput() {
        try {
            this.output.disconnect();
        } catch { }
        const last = this.effects.length > 0 ? this.effects[this.effects.length - 1].effect.output : this.input;
        last.connect(this.output);
    }

    connectInput(node) {
        node.connect(this.input);
    }

    forEach(callback) {
        this.effects.forEach(callback);
    }

    [Symbol.iterator]() {
        return this.effects.values();
    }

    destroy() {
        this.effects.forEach(({ effect }) => {
            effect.destroy();
        });
        this.effects.length = 0;
        try { this.input.disconnect(); } catch { }
    }
}

class EqualizerEffect extends AudioEffect {
    constructor(ctx, bands, gains = []) {
        super(ctx);
        this.filters = [];
        this.input.disconnect();
        let node = this.input;
        bands.forEach((freq, i) => {
            const filter = ctx.createBiquadFilter();
            filter.type = "peaking";
            filter.frequency.value = freq;
            filter.Q.value = 2;
            filter.gain.value = gains[i] ?? 0;
            node.connect(filter);
            node = filter;
            this.filters.push(filter);
        });
        node.connect(this.output);
    }

    setBand(index, gain) {
        if (this.filters[index]) {
            this.filters[index].gain.value = gain;
        }
    }

    destroy() {
        this.filters.forEach(filter => {
            try {
                filter.disconnect();
            } catch { }
        });
        this.filters.length = 0;
        super.destroy();
    }
}

class ReverbEffect extends AudioEffect {
    constructor(ctx, duration = 2, decay = 2) {
        super(ctx);
        this.input.disconnect();
        this.convolver = ctx.createConvolver();
        this.reverbGain = ctx.createGain();
        this.reverbGain.gain.value = 0;
        this.convolver.buffer = this.createImpulseResponse(
            ctx,
            duration,
            decay
        );
        this.input.connect(this.output);
        this.input.connect(this.convolver);
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.output);
        this.enabled = false;
        this.amount = 50;
    }

    createImpulseResponse(ctx, duration, decay) {
        const length = ctx.sampleRate * duration;
        const impulse = ctx.createBuffer(
            2,
            length,
            ctx.sampleRate
        );

        for (let channel = 0; channel < 2; channel++) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(
                    1 - i / length,
                    decay
                );
            }
        }
        return impulse;
    }

    setAmount(percent) {
        this.amount = percent;
        if (this.enabled) {
            this.reverbGain.gain.value = percent / 100;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.reverbGain.gain.value = enabled ? this.amount / 100 : 0;
    }

    getControls() {
        return [
            {
                type: "checkbox",
                label: "Reverb",
                value: this.enabled,
                onChange: value => this.setEnabled(value)
            },
            {
                type: "slider",
                label: "Amount",
                unit: "%",
                min: 0,
                max: 100,
                step: 1,
                value: this.amount,
                onChange: value => this.setAmount(value)
            }
        ];
    }

    destroy() {
        try { this.convolver.disconnect(); } catch { }
        try { this.reverbGain.disconnect(); } catch { }
        super.destroy();
    }
}

class CompressorEffect extends AudioEffect {
    constructor(ctx) {
        super(ctx);
        this.compressor = ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        this.enabled = true;
        this.setEnabled(this.enabled);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.input.disconnect();
        this.compressor.disconnect();
        if (enabled) {
            this.input.connect(this.compressor);
            this.compressor.connect(this.output);
        } else {
            this.input.connect(this.output);
        }
    }

    getControls() {
        return [
            {
                type: "checkbox",
                label: "Compressor",
                value: this.enabled,
                onChange: value => this.setEnabled(value)
            }
        ];
    }

    destroy() {
        try { this.compressor.disconnect(); } catch { }
        super.destroy();
    }
}


class FrequencyFilterEffect extends AudioEffect {
    constructor(ctx, minFrequency = 100, maxFrequency = 2000) {
        super(ctx);

        this.input.disconnect();
        this.highPass = ctx.createBiquadFilter();
        this.highPass.type = "highpass";
        this.highPass.Q.value = Math.SQRT1_2;

        this.lowPass = ctx.createBiquadFilter();
        this.lowPass.type = "lowpass";
        this.lowPass.Q.value = Math.SQRT1_2;

        this.input.connect(this.highPass);
        this.highPass.connect(this.lowPass);
        this.lowPass.connect(this.output);

        this.enabled = false;
        this.minFrequency = minFrequency;
        this.maxFrequency = maxFrequency;

        this.setFrequencies(minFrequency, maxFrequency);
        this.setEnabled(false);
    }

    setFrequencies(minFrequency, maxFrequency) {
        const nyquist = this.ctx.sampleRate / 2;
        const min = Math.max(10, Math.min(minFrequency, nyquist));
        const max = Math.max(10, Math.min(maxFrequency, nyquist));

        this.minFrequency = Math.min(min, max);
        this.maxFrequency = Math.max(min, max);

        const now = this.ctx.currentTime;

        this.highPass.frequency.setTargetAtTime(
            this.minFrequency,
            now,
            0.015
        );

        this.lowPass.frequency.setTargetAtTime(
            this.maxFrequency,
            now,
            0.015
        );
    }

    setMinFrequency(value) {
        this.setFrequencies(value, this.maxFrequency);
    }

    setMaxFrequency(value) {
        this.setFrequencies(this.minFrequency, value);
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        const now = this.ctx.currentTime;
        if (enabled) {
            this.input.disconnect();
            this.input.connect(this.highPass);
        } else {
            this.input.disconnect();
            this.input.connect(this.output);
        }
    }

    getControls() {
        return [
            {
                type: "checkbox",
                label: "Frequency Filter",
                value: this.enabled,
                onChange: value => this.setEnabled(value)
            },
            {
                type: "slider",
                label: "Low cutoff",
                unit: " Hz",
                min: 20,
                max: 2000,
                step: 10,
                value: this.minFrequency,
                onChange: value => this.setMinFrequency(value)
            },
            {
                type: "slider",
                label: "High cutoff",
                unit: " Hz",
                min: 100,
                max: Math.min(20000, this.ctx.sampleRate / 2),
                step: 50,
                value: this.maxFrequency,
                onChange: value => this.setMaxFrequency(value)
            }
        ];
    }

    destroy() {
        try { this.highPass.disconnect(); } catch { }
        try { this.lowPass.disconnect(); } catch { }
        super.destroy();
    }
}
