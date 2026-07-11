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
        effect.output.disconnect();
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
            filter.Q.value = 4.3;
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
        this.input.disconnect();
        this.compressor = ctx.createDynamicsCompressor();
        this.input.connect(this.compressor);
        this.compressor.connect(this.output);
        this.enabled = false;
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.compressor.ratio.value = enabled ? 12 : 1;
    }

    getControls() {
        return [
            {
                type: "checkbox",
                label: "Compressor",
                value: this.enabled,
                onChange: v => this.setEnabled(v)
            }
        ];
    }

    destroy() {
        try {
            this.compressor.disconnect();
        } catch { }
        super.destroy();
    }
}