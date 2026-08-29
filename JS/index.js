// It is a total mess :) pls prepare mentally before proceeding
// at least i tried my best
// pls dont judge me

//import { RenderHandler } from "./RenderVis"

const $id = elementId => document.getElementById(elementId);
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

const canvas = $id('visualizer');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const audioFileInput = $id('audioFile');
const subtitleFileInput = $id('subtitleFile');
const timeSlider = $id('timeSlider');
const volumeSlider = $id('volumeSlider');
const pausePlayButton = $id('pause-play-button');
const songListContainer = $id('songList-Container');
const subListContainer = $id('subtitlesList-Container');
const eqSlidersContainer = $id('eq-sliders');
const subtitlesDiv = $id('Subtitles');
const subtitlesOptionsDiv = $id('SubtitlesOptions');
const audioTimeText = $id('audio-currentTime');
const dropdownVizType = $id('visualizerType');
const eqPresetSelect = $id("eqPresetSelect");
const visualizerMF = $id('visualizerMF');
const visualizerQL = $id('visualizerQL');
const visualizerSL = $id('visualizerSL');
const playbackSpeedInput = $id('playback-speed');
const subtitleOffsetInput = $id("subtitleOffset");
const chooseAudioLabel = $id('ChooseaudioFileLabel');
const controlsEl = $id('controls'); console.error("Roses are Red, Violets are Blue \n Unexpected '{' on line 32"); // humor
const subtitleTextEl = $id('subtitleText');
const subtitleStyleCheckbox = $id('subtitlePlainStyle');
const songListTotalPlayTimeText = $id('songList-totalPlayTime');
const songItemTemplate = $id('songItemTemplate');
const subtitleItemTemplate = $id('subtitleItemTemplate');
const songListBtn = $id("songListBtn");
const subListBtn = $id("subListBtn");
const eqBtn = $id("eqBtn");
const subBtn = $id("subBtn");
const subOptionsBtn = $id("subOptionsBtn");
const eqResetBtn = $id("eqResetBtn");
const eqPresetSetBtn = $id("eqPresetSetBtn");
const eqSliderLink = $id("eqSliderLink");
const eqSliderLinkModes = $id("eqSliderLinkModes");
const eqPresetSaveBtn = $id("eqPresetSaveBtn");
const eqPresetRemoveBtn = $id("eqPresetRemoveBtn");
const subUnloadSubBtn = $id("subUnloadSubBtn");
const subAutoFindBtn = $id("subAutoFindBtn");
const vizPauseVizBtn = $id("vizPauseVizBtn");
const playPreviousButton = $id("play-previous-button");
const playNextButton = $id("play-next-button");
const playNextRandomButton = $id("play-next-random-button");
const subtitleFontSize = $id("subtitleFontSize");
const subtitleFont = $id("subtitleFont");
const removeAllSounds = $id("removeAllSounds");
const removeAllSubtitles = $id("removeAllSubtitles");
const topListBtn = $id("topListBtn");
const songList = $id("songList");
const subtitlesList = $id("subtitlesList");
const songSearch = $id("songSearch");
const subSearch = $id("subSearch");
const eqSliderLinkQsize = $id("eqSliderLinkQsize");
const effectsContainer = $id("effectsContainer");
const otherEffectsBtn = $id("otherEffectsBtn");
const otherEffectsDiv = $id("otherEffects");
const eqMaxDbInput = $id("eqMaxDbInput");
const canvasContainer = $id("canvasContainer");
const showControlsBtn = $id('showControlsBtn');
const pipButton = $id("pipButton");
const visualizerOptionsDiv = $id("VisualizerOptions");
const subVizOptBtn = $id("subVizOptBtn");
const radioUrl = $id("radioUrl");
const radioAddUrl = $id("radioAddUrl");
const radioBtn = $id("radioBtn");
const radioWin = $id("radioWin");
const metroTapTempoButton = $id("metroTapTempoButton");
const metroBpmInput = $id("metroBpmInput");
const metroFirstBeat = $id("metroFirstBeat");
const metroEnabled = $id("metroEnabled");
const metroBeatsPerBar = $id("metroBeatsPerBar");
const metroVolume = $id("metroVolume");
const metroBtn = $id("metroBtn");
const metronomeWin = $id("metronomeWin");

const dialog = {
    alert: (message, targetEl) => TooltipDialog.info(targetEl, message),
    confirm: (message, targetEl, btn = 0) => TooltipDialog.confirm(targetEl, message, btn),
    prompt: (message, defaultValue = "", targetEl) => TooltipDialog.prompt(targetEl, message, defaultValue)
};

const SAMPLE_BYTES = 64 * 1024;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const videoEl = document.createElement("video");
videoEl.muted = false;
videoEl.playsInline = true;
videoEl.preservesPitch = false;
videoEl.style.display = "none";
document.body.appendChild(videoEl);

const mediaSource = audioCtx.createMediaElementSource(videoEl);

// dont question it
const pageOriginalTitle = document.title;

//---------- Config stuff ----------//
const useFileArtwork = true //// Use the artwork of the file if available

const EQ_PRESETS = { //// The built-in presets for the equalizer
    General: {
        Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        Loudness: [6, 5, 4, 2, 0, 0, 2, 4, 6, 7],
        HiFi: [3, 2, 1, 0, 0, 0, 1, 2, 3, 4],
        Warm: [3, 4, 3, 2, 1, 0, -1, -2, -2, -3],
    },

    Bass: {
        BassBoost: [8, 7, 6, 4, 2, 0, -2, -3, -4, -4],
        BassCut: [-8, -7, -6, -4, -2, 0, 2, 3, 4, 4],
        SubBassBoost: [10, 8, 5, 2, 0, -1, -2, -3, -3, -4],
    },

    Treble: {
        TrebleBoost: [-3, -2, -1, 0, 0, 1, 3, 5, 7, 8],
        TrebleCut: [3, 3, 2, 1, 0, -1, -3, -5, -7, -8],
        Bright: [-2, -1, 0, 1, 2, 3, 5, 6, 7, 8],
    },

    Vocals: {
        Vocal: [-2, -1, 0, 2, 4, 5, 4, 2, 1, 0],
        Speech: [-3, -2, -1, 2, 4, 5, 3, 1, 0, -1],
    },

    Genres: {
        Rock: [5, 5, 3, 1, -1, 0, 2, 4, 5, 5],
        Pop: [-1, 0, 2, 3, 4, 3, 1, 0, -1, -2],
        Jazz: [2, 2, 1, 2, 3, 2, 1, 2, 3, 4],
        Classical: [2, 2, 1, 1, 0, 1, 2, 3, 4, 5],
        Dance: [7, 6, 4, 2, 0, -1, 2, 4, 6, 7],
        Electronic: [7, 6, 4, 2, 0, -2, 2, 5, 7, 8],
    },

    Taste: {
        VShape: [8, 7, 5, 2, -2, -3, -1, 2, 5, 7],
        Smile: [6, 5, 3, 1, -1, -2, 0, 2, 4, 6],
        FlatPlus: [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
    }
};

const EQ_BANDS = [ //// Bands that the equalizer will use
    31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000
];

const RETRO_CENTER_FREQS = [ //// What freqs. will be shown on the retro render
    31,
    63, 80, 100, 125, 160, 200, 250, 315,
    400, 500, 630, 800, 1000, 1250, 1600, 2000,
    2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
    16000
];

let PLAYERCONFIG = {
    playback: {
        rate: 1.0, /// 1.0: Normal, <1: slow, >1: fast
        volume: volumeSlider.value, /// 0.0 - 1.0
        lowFreq: 0, /// Not used yet
        highFreq: 0 /// Not used yet
    },
    playbackList: {
        playMode: 0, /// 0: off, 1: autoplay, 2: random
        loopMode: 0 /// 0: off, 1: loop once, 2: loop forever
    },
    visualizer: {
        paused: false,
        current: dropdownVizType.value
    },
    metronome: { // initial config
        canvas: document.getElementById("metronomeCanvas"),
        bpm: Number(metroBpmInput.value), //188, //101, // 132, // 116, // 178,
        firstBeat: Number(metroFirstBeat.value), //0, //0, // 0.15, // 0.78, // 0.56,
        beatsPerBar: Number(metroBeatsPerBar.value), //4
        volume: Number(metroVolume.value / 100), //0.4,
        // sections: [
        //     { bar: 2, name: "Intro" },
        //     { bar: 10, name: "Verse" },
        //     { bar: 26, name: "Pre-Chorus" },
        //     { bar: 36, name: "Chorus" },
        //     { bar: 52, name: "Inter" },
        //     { bar: 56, name: "Verse" },
        //     { bar: 74, name: "Chorus" },
        //     { bar: 90, name: "Pre-Solo" },
        //     { bar: 98, name: "Solo" },
        //     { bar: 108, name: "Chorus" },
        //     { bar: 138, name: "Outro" },
        // ]
        // onBeat: (info) => {
        //     console.log("//-----Metronome-----//");
        //     console.log(info);
        //     console.log(info.beat, "BPM");
        //     console.log(info.beatInBar, "Bar Beat");
        //     console.log(info.bar, "Bar");
        // }
    },
    maxRenderFps: 60,
    timeTextMode: 0 /// 0: current / duration, 1: current / time left
};

let user_eq_presets = JSON.parse(localStorage.getItem("USER_EQ_PRESETS") || "{}");
//----------------------------------//

let isSeeking = false;
let pendingSeek = 0;

let analyser, analyserL, analyserR, dataL, dataR;
let gainNode;
let effectChain = null;
let eqState = EQ_BANDS.map(() => 0);
let files = [];
let subtitleList = []; // {_fingerprint, title, subs}
let selectedSubtitle = ''; // _fingerprint
let lastSubtitleFingerprint = '';
let currentSelectedFile = ''; // _fingerprint
let freqData, freqDataFloat, timeData;
let currentLoadToken = 0; // e

let playbackHPFilter = null;
let playbackLPFilter = null;
let soundEnded = false;
let loopCounter = 0;

// REMEMBER powers of 2 or something like that
let analyserffsize = 1024 * (2 ** (visualizerQL.value - 1));//8192;//4096;//2048//1024;
let analyserSmoothing = visualizerSL.value;

let subtitleLastIndex = 0;
let fftChangeTimeout = null; // debounce when changing the fftsize
let resizeTimeout = null; // debounce thing for updateing the canvas on window resize or something like that
let lastProgress = -1;
let lastRenderTimestamp = 0;

gainNode = audioCtx.createGain();
gainNode.gain.value = PLAYERCONFIG.playback.volume;

mediaSource.connect(gainNode);
//------------------------------------------------------------------------------------------------

const randomSongs = new HumanRandom()

const renderHandler = new RenderHandler(canvas, ctx, audioCtx, {
    sensitivity: 2,
    maxFrequency: 16000,
    analyserSmoothing: analyserSmoothing,
    retroCenterFreqs: RETRO_CENTER_FREQS
});

const equalizer = new CanvasEQ($id('eq'), EQ_BANDS, 12);

const languageNames = new Intl.DisplayNames(["en"], {
    type: "language",
});

const metro = new Metronome(videoEl, {
    ...PLAYERCONFIG.metronome
});

//const subtitleEditor = new SubtitleEditor("SubtitleEditorWindow");

const timeline = new Timeline(
    $id("timeline"),
    {
        min: 0,
        max: 1,
        step: 0.001,
        onHover(time) {
            timeline.element.dataset.tip = time === "Live" ? "Live" : formatTime(time * videoEl.duration / PLAYERCONFIG.playback.rate);
        },
        onSeek(time) {
            if (!videoEl.duration) return;
            isSeeking = true;
            pendingSeek = time * videoEl.duration;

        },
        onSeekFinish() {
            isSeeking = false;
            if (!videoEl.duration) return;
            videoEl.currentTime = pendingSeek;
        }
    }
);

const tapTempo = new TapTempo(metroTapTempoButton);

const pipVideo = document.createElement("video");
pipVideo.playsInline = true;
pipVideo.style.display = "none";
document.body.appendChild(pipVideo);
const canvasStream = canvas.captureStream(30);
pipVideo.srcObject = canvasStream;

//------------------------------------------------------------------------------------------------
function buildEffectsUI() {
    effectsContainer.innerHTML = "";
    effectChain.forEach(({ name, effect }) => {
        if (!effect.getControls) return;
        const controls = effect.getControls();
        const label = document.createElement("label");
        label.className = "effectItem";
        controls.forEach(control => {
            if (control.type === "checkbox") {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "checkbox";
                checkbox.checked = control.value;
                checkbox.addEventListener("change", () =>
                    control.onChange(checkbox.checked)
                );
                const text = document.createElement("span");
                text.textContent = control.label;
                label.append(
                    checkbox,
                    text
                );
            }

            if (control.type === "slider") {
                const text = document.createElement("span");
                text.textContent = control.label;
                const slider = document.createElement("input");
                slider.type = "range";
                slider.className = "slider";
                slider.min = control.min;
                slider.max = control.max;
                slider.step = control.step;
                slider.value = control.value;
                slider.dataset.tip = control.value;
                slider.addEventListener("input", () => {
                    const value = Number(slider.value);
                    control.onChange(value);
                    slider.dataset.tip = value;
                });
                label.append(
                    text,
                    slider
                );
            }
        });
        effectsContainer.appendChild(label);
    });
}

function createSplitAnalyser(sourceNode, fftSize = 1024, smoothing = 0) {
    const splitter = audioCtx.createChannelSplitter(2);

    sourceNode.connect(splitter);

    const analyserL = audioCtx.createAnalyser();
    const analyserR = audioCtx.createAnalyser();

    analyserL.fftSize = fftSize;
    analyserR.fftSize = fftSize;
    analyserL.smoothingTimeConstant = smoothing;
    analyserR.smoothingTimeConstant = smoothing;

    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);

    const dataL = new Float32Array(analyserL.fftSize);
    const dataR = new Float32Array(analyserR.fftSize);

    return { analyserL, analyserR, dataL, dataR };
}

function createAnalyser(node) {
    if (analyser) {
        try {
            analyser.disconnect();
        } catch { }
    }
    ({ analyserL, analyserR, dataL, dataR } = createSplitAnalyser(
        node,
        analyserffsize,
        analyserSmoothing
    ));
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = analyserffsize;
    analyser.smoothingTimeConstant = analyserSmoothing;
    node.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    freqDataFloat = new Float32Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
}

function setupEffects() {
    effectChain = new EffectChain(audioCtx);
    effectChain.add(
        "eq",
        new EqualizerEffect(
            audioCtx,
            EQ_BANDS
        )
    );
    effectChain.add(
        "compressor",
        new CompressorEffect(audioCtx)
    );
    effectChain.add(
        "reverb",
        new ReverbEffect(
            audioCtx,
            2.5,
            3
        )
    );

    effectChain.connectInput(gainNode);
    effectChain.connectOutput();
    createAnalyser(effectChain.output);

    buildEffectsUI();
}

function getArtworkURL(picture) {
    if (!picture || !picture.data) return null;
    const blob = new Blob(
        [new Uint8Array(picture.data)],
        { type: picture.format }
    );
    return URL.createObjectURL(blob);
}

async function updateMediaSession({
    title = "",
    artist = "",
    album = "",
    artwork = null,
} = {}) {
    if (!("mediaSession" in navigator)) return;
    const metadata = {
        title,
        artist,
        album,
    };
    if (artwork) {
        metadata.artwork = [{
            src: artwork,
            sizes: "512x512",
            type: "image/png"
        }];
    }
    navigator.mediaSession.metadata = new MediaMetadata(metadata);
}

function getElapsedTime(ignoreSeek) {
    if (!videoEl || !videoEl.duration) return 0;
    return isSeeking && !ignoreSeek ? pendingSeek : videoEl.currentTime;
}

function getMediaDuration(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const media = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
        media.preload = 'metadata';
        media.src = url;
        media.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(media.duration);
        };
        media.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load media metadata'));
        };
    });
}

function getSupportedMediaFormats() {
    const audio = document.createElement("audio");
    const video = document.createElement("video");

    const formats = {
        video: [
            ["mp4", "video/mp4"],
            ["m4v", "video/x-m4v"],
            ["webm", "video/webm"],
            ["mkv", "video/x-matroska"],
            ["avi", "video/x-msvideo"],
            ["mov", "video/quicktime"],
            ["ogv", "video/ogg"],
            ["mpeg", "video/mpeg"],
            ["mpg", "video/mpeg"],
            ["ts", "video/mp2t"],
            ["m2ts", "video/mp2t"],
            ["3gp", "video/3gpp"],
            ["3g2", "video/3gpp2"],
            ["flv", "video/x-flv"],
            ["wmv", "video/x-ms-wmv"]
        ],
        audio: [
            ["mp3", "audio/mpeg"],
            ["wav", "audio/wav"],
            ["flac", "audio/flac"],
            ["m4a", "audio/mp4"],
            ["aac", "audio/aac"],
            ["ogg", "audio/ogg"],
            ["oga", "audio/ogg"],
            ["opus", "audio/opus"],
            ["webm", "audio/webm"],
            ["wma", "audio/x-ms-wma"],
            ["aiff", "audio/aiff"],
            ["aif", "audio/aiff"],
            ["alac", "audio/mp4"],
            ["amr", "audio/amr"],
            ["au", "audio/basic"],
            ["mid", "audio/midi"],
            ["midi", "audio/midi"]
        ]
    };

    const alwaysLikelyAudio = [
        ".opus",
        ".flac",
        ".ogg",
        ".wav"
    ];

    const check = (element, mime) => {
        const result = element.canPlayType(mime);
        return result === "probably" || result === "maybe";
    };

    return {
        video: formats.video
            .filter(([_, mime]) => check(video, mime))
            .map(([ext]) => "." + ext)
            .sort(),

        audio: formats.audio
            .filter(([ext, mime]) =>
                check(audio, mime) || alwaysLikelyAudio.includes("." + ext)
            )
            .map(([ext]) => "." + ext)
            .sort()
    };
}

// e
function setPlaybackRate(rate) {
    rate = Number(rate) || 1.0;
    PLAYERCONFIG.playback.rate = rate;
    if (videoEl) {
        videoEl.playbackRate = PLAYERCONFIG.playback.rate;
    }
    return PLAYERCONFIG.playback.rate;
}

function timeToSeconds(t) {
    if (!t) return 0;

    t = t.trim();
    t = t.replace(",", ".");

    const parts = t.split(":");
    let h = 0, m = 0, s = 0;

    if (parts.length === 3) {
        h = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        s = parseFloat(parts[2]);
    } else if (parts.length === 2) {
        m = parseInt(parts[0], 10);
        s = parseFloat(parts[1]);
    } else {
        return 0;
    }

    return h * 3600 + m * 60 + s;
}

function formatTime(s, format = '{hh} : {mm} : {ss} . {mls}') {
    s = Number.isFinite(Number(s)) ? Number(s) : 0;
    const negative = s < 0;
    s = Math.abs(s);
    const t = Math.floor(s);
    const hh = String(Math.floor(t / 3600)).padStart(2, '0');
    const mm = String(Math.floor(t / 60) % 60).padStart(2, '0');
    const ss = String(t % 60).padStart(2, '0');
    const mls = String(Math.floor((s - t) * 1000)).padStart(3, '0');
    const map = { hh, mm, ss, mls };
    return format.replace(/\{(hh|mm|ss|mls)\}/g, (_, key) => map[key]);
}

function updateTotalDurationText() {
    let totalDuration = 0;
    for (const file of files) totalDuration += file._duration || 0;
    const avgTime = files.length ? totalDuration / files.length : 0;
    songListTotalPlayTimeText.innerHTML = `Total: ${formatTime(totalDuration, '{hh}:{mm}:{ss}')} | Avg: ${formatTime(avgTime, '{hh}:{mm}:{ss}')}`;
}

function getLanguage(fileName) {
    const match = fileName.match(/\.([^.]+)\.vtt$/i);
    if (!match) return "Other";

    const tag = match[1];

    const validTag = /^[a-z]{2,3}(?:-[A-Z]{2}|-[A-Z][a-z]{3}|-[a-z]{4})?$/;
    if (!validTag.test(tag)) return tag;

    try {
        return languageNames.of(tag);
    } catch {
        return "Other";
    }
}

function getSubtitleMimeType(filename) {
    const mime = {
        vtt: "text/vtt",
        srt: "text/plain",
        ass: "text/plain",
        ssa: "text/plain",
        srv1: "application/xml",
        srv2: "application/xml",
        srv3: "application/xml",
        ttml: "application/ttml+xml",
    };
    return mime[filename.split(".").pop().toLowerCase()] ?? "text/plain";
}

//----------------------------------------------------------------------------------------------------------------------

// fingerprint files
async function fileFingerprint(file) {
    const size = file.size || 0;
    const headBytes = new Uint8Array(await file.slice(0, Math.min(SAMPLE_BYTES, size)).arrayBuffer());
    const tailBytes = new Uint8Array(await file.slice(Math.max(0, size - SAMPLE_BYTES), size).arrayBuffer());
    let hash = 2166136261;
    const mix = (b) => {
        hash ^= b;
        hash = Math.imul(hash, 16777619);
    };
    for (const b of headBytes) mix(b);
    for (const b of tailBytes) mix(b);
    const sizeBig = BigInt(size);
    const lmBig = BigInt(file.lastModified || 0);
    for (let shift = 0; shift < 8; shift++) { mix(Number((sizeBig >> BigInt(shift * 8)) & 0xffn)); }
    for (let shift = 0; shift < 8; shift++) { mix(Number((lmBig >> BigInt(shift * 8)) & 0xffn)); }
    return `${size}-${file.lastModified || 0}-${(hash >>> 0).toString(16)}`;
}

function getFileByIdentifier(id) {
    if (id === undefined || id === null) return null;
    if (typeof id === 'number') return files[id] || null;
    if (typeof id === 'string') {
        const byFp = files.find(f => f._fingerprint === id);
        if (byFp) return byFp;
        const n = Number(id);
        if (!Number.isNaN(n) && Number.isFinite(n)) return files[n] || null;
        return files.find(f => f.name === id) || null;
    }
    return null;
}

function findIndexByIdentifier(id) {
    const f = getFileByIdentifier(id);
    return f ? files.indexOf(f) : -1;
}

//----------------------------------------------------------------------------------------------------------------------
//// not used anymore
// function cleanupGraph() {
//     if (source) {
//         try { source.stop(); } catch { }
//         try { source.disconnect(); } catch { }
//         source = null;
//     }
//     if (playbackHPFilter) {
//         try { playbackHPFilter.disconnect(); } catch { }
//         playbackHPFilter = null;
//     }
//     if (playbackLPFilter) {
//         try { playbackLPFilter.disconnect(); } catch { }
//         playbackLPFilter = null;
//     }
//     if (gainNode) {
//         try { gainNode.disconnect(); } catch { }
//         gainNode = null;
//     }
// }

//----------------------------------------------------------------------------------------------------------------------

function addFilesToSongList(filesSelected) {
    filesSelected.forEach((file) => {
        const clone = songItemTemplate.content.cloneNode(true);
        const songDiv = clone.querySelector('.songItem');
        const cover = clone.querySelector('.songCover');
        const title = clone.querySelector('.songName');
        const artist = clone.querySelector('.songArtist');
        const album = clone.querySelector('.songAlbum');
        const extension = clone.querySelector('.songExtension');
        const metadata = clone.querySelector('.songInfo');
        const playButton = clone.querySelector('.songItemPlayButton');
        const deleteButton = clone.querySelector('.songItemDeleteButton');
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const fileExt = file.name.replace(/^.*\./, "");
        const artwork = file._artworkURL;
        const songTitle = file._metadata?.title ? file._metadata.title : fileName;

        songDiv.dataset.fileName = file._fingerprint;
        title.textContent = songTitle;
        title.dataset.tip = songTitle;
        extension.textContent = file._metadata?.title ? `[${file._metadata.track}]` : `.${fileExt}`;
        artist.textContent = file._metadata?.artist;
        album.textContent = file._metadata?.album;
        if (artwork) {
            cover.src = artwork;
            cover.alt = `Song Artwork: ${songTitle}`;
        } else {
            cover.style.display = 'none';
        }
        metadata.textContent = `${file._duration !== 'Live' ? formatTime(file._duration, '{hh}:{mm}:{ss}') : 'Live'} | Type="${file.type}"`;

        playButton.addEventListener('click', () => {
            if (currentSelectedFile === file._fingerprint) {
                togglePlayPause();
            } else {
                loadFile(file);
            }
        });

        deleteButton.addEventListener('click', async () => {
            if (await dialog.confirm("この曲をプレイリストから外しますか？", deleteButton, 1)) {
                removeFile(file);
            }
        });

        songListContainer.appendChild(clone);
    });
}

function addSubtitleFilesToList(filesSelected) {
    filesSelected.forEach((file) => {
        if ($(`[data-file-name="${file._fingerprint}"]`)) return;
        const clone = subtitleItemTemplate.content.cloneNode(true);
        const subDiv = clone.querySelector('.subtitleItem');
        const title = clone.querySelector('.subtitleTitle');
        const extension = clone.querySelector('.subtitleExtension');
        const metadata = clone.querySelector('.subInfo');
        const selectButton = clone.querySelector('.subtitleSelectButton');
        const deleteButton = clone.querySelector('.subtitleDeleteButton');
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        const fileExt = file.name.replace(/^.*\./, "");

        subDiv.dataset.fileName = file._fingerprint;
        title.textContent = fileName;
        title.dataset.tip = fileName;
        extension.textContent = `.${fileExt}`;
        metadata.textContent = `Type="${file._type}" | ${file._language}`;

        selectButton.addEventListener('click', () => {
            selectedSubtitle = selectedSubtitle === file._fingerprint ? "" : file._fingerprint;
        });

        deleteButton.addEventListener('click', async () => {
            if (await dialog.confirm("この字幕トラックをリストから外しますか？", deleteButton, 1)) {
                removeSubtitle(file._fingerprint);
            }
        });

        subListContainer.appendChild(clone);
    });
}

//----------------------------------------------------------------------------------------------------------------------
// Subtitle stuff

function removeHtmlTags(str) {
    const div = document.createElement("div");
    div.innerHTML = str;
    return div.textContent || div.innerText || "";
}

function stripTags(str) {
    return (str || "").replace(/<[^>]*>/g, "");
}

function parseSRT(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const subs = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line.includes("-->")) {
            const [start, end] = line.split("-->").map(s => s.trim());
            i++;
            let textLines = [];
            while (i < lines.length && lines[i].trim() !== "") {
                textLines.push(lines[i]);
                i++;
            }
            subs.push({
                start: timeToSeconds(start),
                end: timeToSeconds(end),
                text: textLines.join(" ").trim()
            });
        }
        i++;
    }
    return subs;
}

function parseWebVTT(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const styleMap = {};
    let i = 0;

    while (i < lines.length) {
        const l = lines[i].trim();
        if (!l || l === "WEBVTT" || l.startsWith("NOTE")) {
            i++;
            continue;
        }
        break;
    }

    const out = [];
    while (i < lines.length) {
        let line = lines[i].trim();

        if (!line) {
            i++;
            continue;
        }
        if (!line.includes("-->")) {
            i++;
            continue;
        }
        let [start, end] = line.split("-->").map(x =>
            x.trim().split(" ")[0]
        );
        i++;
        let txt = [];
        while (i < lines.length && lines[i].trim() !== "") {
            txt.push(lines[i]);
            i++;
        }
        let content = txt.join("<br>");
        out.push({
            start: timeToSeconds(start),
            end: timeToSeconds(end),
            text: content
        });

        i++;
    }
    return out;
}

function assTimeToSeconds(time) {
    const parts = time.trim().split(":");
    if (parts.length !== 3) return 0;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
}

function stripASSTags(text) {
    return text
        .replace(/\{[^{}]*\}/g, "")
        .replace(/\\N/g, "\n")
        .replace(/\\n/g, "\n")
        .replace(/\\h/g, "\u00A0")
        .replace(/\\~/g, " ")
        .replace(/\\r[^\\}]*/g, "");
}

function parseASSTags(text) {
    const tags = {};
    const groups = text.match(/\{[^{}]*\}/g) || [];
    for (const group of groups) {
        const content = group.slice(1, -1);
        let index = 0;
        while (index < content.length) {
            if (content[index] !== "\\") {
                index++;
                continue;
            }
            index++;
            const nameMatch = content.slice(index).match(/^[A-Za-z]+/);
            if (!nameMatch) {
                continue;
            }
            const name = nameMatch[0];
            index += name.length;
            let args = "";
            if (content[index] === "(") {
                const end = content.indexOf(")", index);
                if (end !== -1) {
                    args = content.slice(index + 1, end);
                    index = end + 1;
                }
            } else {
                while (
                    index < content.length &&
                    /[0-9A-Za-z&.+#(),-]/.test(content[index])
                ) {
                    args += content[index];
                    index++;
                }
            }
            switch (name) {
                case "r":
                    tags.resetStyle = args || true;
                    break;
                case "an":
                    tags.alignment = Number(args);
                    break;
                case "pos": {
                    const [x, y] = args.split(",").map(Number);
                    if (!Number.isNaN(x) && !Number.isNaN(y)) {
                        tags.pos = { x, y };
                    }
                    break;
                }
                case "move": {
                    const v = args.split(",").map(Number);
                    if (v.length >= 6) {
                        tags.move = {
                            x1: v[0],
                            y1: v[1],
                            x2: v[2],
                            y2: v[3],
                            t1: v[4],
                            t2: v[5],
                        };
                    }
                    break;
                }
                case "org": {
                    const [x, y] = args.split(",").map(Number);
                    if (!Number.isNaN(x) && !Number.isNaN(y)) {
                        tags.org = { x, y };
                    }
                    break;
                }
                case "fad": {
                    const [a, b] = args.split(",").map(Number);
                    tags.fade = {
                        in: a / 1000,
                        out: b / 1000,
                    };
                    break;
                }
                case "fs":
                    tags.fontSize = Number(args);
                    break;
                case "fn":
                    tags.fontName = args;
                    break;
                case "b":
                    tags.bold = Number(args) !== 0;
                    break;
                case "i":
                    tags.italic = Number(args) !== 0;
                    break;
                case "u":
                    tags.underline = Number(args) !== 0;
                    break;
                case "s":
                    tags.strike = Number(args) !== 0;
                    break;
                case "fscx":
                    tags.scaleX = Number(args) / 100;
                    break;
                case "fscy":
                    tags.scaleY = Number(args) / 100;
                    break;
                case "bord":
                    tags.outline = Number(args);
                    break;
                case "shad":
                    tags.shadow = Number(args);
                    break;
                case "blur":
                case "be":
                    tags.blur = Number(args);
                    break;
                case "frz":
                    tags.rotation = Number(args);
                    break;
                case "1c":
                case "c":
                    tags.primaryColour = args;
                    break;
                case "2c":
                    tags.secondaryColour = args;
                    break;
                case "3c":
                    tags.outlineColour = args;
                    break;
                case "4c":
                    tags.shadowColour = args;
                    break;
                case "t": {
                    const values = args.split(",");
                    if (values.length >= 3) {
                        tags.transform = {
                            t1: Number(values[0]) || 0,
                            t2: Number(values[1]) || 0,
                            commands: values.slice(2).join(","),
                        };
                    }
                    break;
                }
                case "k":
                case "K":
                case "kf":
                case "ko": {
                    const value = Number(args);

                    if (!Number.isNaN(value)) {
                        tags.karaoke ??= [];
                        tags.karaoke.push({
                            duration: value / 100,
                            type: name,
                        });
                    }

                    break;
                }
            }
        }
    }
    return tags;
}

function parseASS(text) {
    const lines = text.replace(/\r/g, "").split("\n");
    const assOptions = {
        scriptInfo: {},
        projectGarbage: {},
        styles: {
            format: [],
            styles: [],
            stylesByName: {}
        }
    };

    const subs = [];
    let section = "";
    let eventFormat = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(";"))
            continue;
        if (line.startsWith("[") && line.endsWith("]")) {
            section = line.slice(1, -1);
            continue;
        }
        switch (section) {
            case "Script Info": {
                const idx = line.indexOf(":");
                if (idx !== -1) {
                    const key = line.slice(0, idx).trim();
                    const value = line.slice(idx + 1).trim();

                    assOptions.scriptInfo[key] = value;
                }
                break;
            }
            case "Aegisub Project Garbage": {
                const idx = line.indexOf(":");
                if (idx !== -1) {
                    const key = line.slice(0, idx).trim();
                    const value = line.slice(idx + 1).trim();
                    assOptions.projectGarbage[key] = value;
                }
                break;
            }
            case "V4+ Styles": {
                if (line.startsWith("Format:")) {
                    assOptions.styles.format =
                        line.slice(7)
                            .split(",")
                            .map(v => v.trim());
                }
                else if (line.startsWith("Style:")) {
                    const values = line.slice(6)
                        .split(",")
                        .map(v => v.trim());
                    const style = {};
                    assOptions.styles.format.forEach((key, i) => {
                        style[key] = values[i] ?? "";
                    });
                    assOptions.styles.styles.push(style);
                    if (style.Name) {
                        assOptions.styles.stylesByName[style.Name] = style;
                    }
                }
                break;
            }
            case "Events": {
                if (line.startsWith("Format:")) {
                    eventFormat =
                        line.slice(7)
                            .split(",")
                            .map(v => v.trim());

                }
                else if (
                    line.startsWith("Dialogue:") ||
                    line.startsWith("Comment:")
                ) {
                    const type = line.startsWith("Dialogue:") ? "Dialogue" : "Comment";
                    const data = line.slice(type.length + 1);
                    const parts = [];
                    let rest = data;
                    for (
                        let i = 0;
                        i < eventFormat.length - 1;
                        i++
                    ) {
                        const comma = rest.indexOf(",");
                        if (comma === -1) {
                            parts.push(rest);
                            rest = "";
                        }
                        else {
                            parts.push(rest.slice(0, comma));
                            rest = rest.slice(comma + 1);
                        }
                    }

                    parts.push(rest);

                    const obj = {
                        Type: type
                    };

                    eventFormat.forEach((key, i) => {
                        obj[key] = (parts[i] ?? "").trim();
                    });

                    obj.start = assTimeToSeconds(obj.Start);
                    obj.end = assTimeToSeconds(obj.End);

                    if (obj.Layer !== undefined) {
                        obj.Layer = Number(obj.Layer);
                    }
                    obj.style = assOptions.styles.stylesByName[obj.Style] ?? null;
                    obj.rawText = obj.Text;
                    obj.tags = parseASSTags(obj.Text);
                    obj.text = stripASSTags(obj.Text);
                    subs.push(obj);
                }
                break;
            }
        }
    }
    return { assOptions, subs };
}

async function loadSubtitles(files) {
    const addedSubtitles = [];
    for (const file of files) {
        file._fingerprint = await fileFingerprint(file);

        const name = file.name;
        if (subtitleList.some(s => s._fingerprint === file._fingerprint)) {
            console.warn(`Subtitle file "${name}" already exists. Skipping duplicate.`);
            continue;
        }

        file._type = getSubtitleMimeType(name);
        file._language = `language/${getLanguage(name)}`;

        const text = await file.text();
        let subs = [];
        let assOptions = null;
        const lowerName = name.toLowerCase();
        const trimmed = text.trimStart();
        if (trimmed.startsWith("WEBVTT")) {
            subs = parseWebVTT(text);

        } else if (
            lowerName.endsWith(".ass") ||
            lowerName.endsWith(".ssa") ||
            trimmed.startsWith("[Script Info]")
        ) {
            const parsed = parseASS(text);
            subs = parsed.subs;
            assOptions = parsed.assOptions;

        } else {
            subs = parseSRT(text);
        }

        const subtitleData = {
            _fingerprint: file._fingerprint,
            _type: file._type,
            _language: file._language,
            name,
            subs,
            ...(assOptions && { assOptions })
        };

        subtitleList.push(subtitleData);
        addedSubtitles.push(subtitleData);
    }

    addSubtitleFilesToList(addedSubtitles);

    forceFindSub();
    return subtitleList;
}

function removeSubtitle(fingerprint) {
    const index = subtitleList.findIndex(item => item._fingerprint === fingerprint);
    const el = $(`[data-file-name="${fingerprint}"]`);
    if (index !== -1) subtitleList.splice(index, 1);
    if (selectedSubtitle === fingerprint) selectedSubtitle = '';
    el.remove();
}

function getSubtitle(file) {
    if (!file || !file.name) return "NO_SUB";

    const normalizeForCompare = (name, { isSubtitle = false } = {}) => {
        if (!name) return "";
        let s = String(name).toLowerCase().trim();
        s = s.replace(/.*[\/]/, "");
        if (isSubtitle) {
            s = s.replace(/\.[a-z0-9-]+\.(vtt|srt|txt|sub|ass|sbv)$/i, "");
            s = s.replace(/\.(vtt|srt|txt|sub|ass|sbv)$/i, "");
        } else {
            s = s.replace(/\.[^/.]+$/, "");
        }
        s = s.replace(/[^\p{L}\p{N}\s_-]/gu, "")
        return s;
    };

    const currentName = normalizeForCompare(file.name, { isSubtitle: false });

    let bestFp = null;
    let bestScore = 0;
    const a = currentName.split(" ").filter(Boolean);

    if (a.length === 0) return "NO_SUB";

    for (const entry of subtitleList) {
        const rawTitle = entry.name || '';
        const cleaned = normalizeForCompare(rawTitle, { isSubtitle: true });
        const b = cleaned.split(" ").filter(Boolean);

        if (b.length === 0) continue;

        let matches = 0;
        for (const word of a) {
            if (b.includes(word)) matches++;
        }

        const score = matches / Math.max(a.length, b.length);
        if (score > bestScore) {
            bestScore = score;
            bestFp = entry._fingerprint;
        }
    }

    if (bestScore < 0.5 || !bestFp) return "NO_SUB";

    const found = subtitleList.find(e => e._fingerprint === bestFp);
    console.log("Found subtitle :", found ? found.name : bestFp, bestScore, bestFp);
    return bestFp;
}

//selectedSubtitle = _fingerprint
function showSubtitle(timeSeconds) {
    const h3 = subtitleTextEl;
    timeSeconds -= Number(subtitleOffsetInput.value || 0) / 1000;
    const entry = subtitleList.find(e => e._fingerprint === selectedSubtitle);
    const titleEl = $id("subtitle-title");
    if (!entry || !entry.subs?.length) {
        if (h3.innerHTML !== "") h3.innerHTML = "";
        const title = "字幕 - No subtitles";
        if (titleEl.textContent !== title) {
            titleEl.textContent = title;
            titleEl.dataset.tip = title;
        }
        if (lastSubtitleFingerprint !== null) {
            lastSubtitleFingerprint = null;
            $$('.subtitleItem.active').forEach(el => {
                el.classList.remove('active');
            });
        }
        return null;
    }
    if (lastSubtitleFingerprint !== entry._fingerprint) {
        lastSubtitleFingerprint = entry._fingerprint;
        const titleText = `字幕 - ${entry.name || entry._fingerprint}`;
        titleEl.textContent = titleText;
        titleEl.dataset.tip = titleText;
        $$('.subtitleItem').forEach(el => {
            el.classList.toggle(
                'active',
                el.dataset.fileName === entry._fingerprint
            );
        });
    }
    const subs = entry.subs;
    let i = subtitleLastIndex || 0;
    if (i >= subs.length) i = 0;
    for (let j = 0; j < subs.length; j++) {
        const s = subs[i];
        if (timeSeconds >= s.start && timeSeconds <= s.end) {
            subtitleLastIndex = i;
            const text = subtitleStyleCheckbox.checked ? removeHtmlTags(s.text || "") : (s.text || "");
            if (h3.textContent !== stripTags(text)) {
                h3.innerHTML = text;
            }
            if (h3.style.display !== "block") {
                h3.style.display = "block";
            }
            return s.text;
        }
        i = (i + 1) % subs.length;
    }
    if (h3.innerHTML !== "") h3.innerHTML = "";
    return null;
}

function forceFindSub() {
    const bestKey = getSubtitle(getFileByIdentifier(currentSelectedFile));
    selectedSubtitle = bestKey;
    subtitleLastIndex = 0;
}

//----------------------------------------------------------------------------------------------------------------------

function resizeCanvas() {
    const rect = canvasContainer.getBoundingClientRect();
    const maxWidth = 1920;
    const maxHeight = 1080;
    let width = rect.width;
    let height = rect.height;
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
}
//----------------------------------------------------------------------------------------------------------------------

function updateAnalyser() {
    freqData = new Uint8Array(analyser.frequencyBinCount);
    freqDataFloat = new Float32Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
    dataL = new Float32Array(analyserL.fftSize);
    dataR = new Float32Array(analyserR.fftSize);
}

//----------------------------------------------------------------------------------------------------------------------

function playFrom(offset) {
    audioCtx.resume();

    videoEl.currentTime = offset;
    videoEl.playbackRate = PLAYERCONFIG.playback.rate;

    videoEl.play().catch(err => {
        console.warn("Video play failed:", err);
    });
}

// Stops the audio
function stopAudio(clearCanvas, pauseCtx) {
    videoEl.pause();
    if (clearCanvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function loadFile(file) {
    if (!file) return;
    const loadToken = ++currentLoadToken;
    const songElement = $(`.songItem[data-file-name="${file._fingerprint}"]`);
    $$('.songItem').forEach(el => {
        el.classList.remove('loading');
    });
    songElement?.classList.add('loading');
    songElement?.classList.remove('error');
    chooseAudioLabel.textContent = `Loading ${file.name}...`;

    videoEl.pause();
    videoEl.removeAttribute("src");
    videoEl.load();

    if (videoEl._objectURL) {
        URL.revokeObjectURL(videoEl._objectURL);
        videoEl._objectURL = null;
    }
    let url;

    if (file.type === "radio" && file.url) {
        videoEl.crossOrigin = "anonymous";
        url = file.url;
    } else {
        videoEl.crossOrigin = null;
        url = URL.createObjectURL(file);
        videoEl._objectURL = url;
    }

    videoEl.src = url;
    videoEl.load();
    videoEl.addEventListener("loadeddata", () => {
        if (loadToken !== currentLoadToken) return;
        videoEl.currentTime = 0;
        $$('.songItem').forEach(el => {
            el.classList.remove('active', 'loading');
        });
        songElement?.classList.add('active');
        currentSelectedFile = file._fingerprint;
        selectedSubtitle = getSubtitle(file);
        subtitleLastIndex = 0;
        loopCounter = 0;
        randomSongs.remember(file);
        chooseAudioLabel.textContent = file.name;
        document.title = `${file.name} - ${pageOriginalTitle}`;
        playFrom(0);

        updateMediaSession({
            title: file._metadata?.title ?? file.name,
            artist: file._metadata?.artist ?? "--",
            album: file._metadata?.album ?? "--",
            artwork: file?._artworkURL ?? null
        });
    }, { once: true });
}

function togglePlayPause() {
    if (!videoEl.duration) return;
    if (!videoEl.paused) {
        stopAudio(false, true);
    } else {
        audioCtx.resume();

        videoEl.play().catch(err => {
            console.warn(err);
        });
    }
}

function playNext(jump = 1, loop = true) {
    if (!audioCtx || !videoEl.src) return;
    let idx = findIndexByIdentifier(currentSelectedFile);
    if (idx === -1) idx = 0;
    const nextIdx = idx + jump;
    if (!loop && (nextIdx < 0 || nextIdx >= files.length)) return;
    idx = loop ? (nextIdx + files.length) % files.length : nextIdx;
    loadFile(files[idx]);
}

function loadRandom() {
    const randomSong = randomSongs.pick(files);
    if (randomSong) {
        loadFile(randomSong);
    }
}

function jumpAt(time = 5) {
    if (!videoEl.duration) return;
    let t = videoEl.currentTime + time;
    if (t < 0) t = 0;
    if (t >= videoEl.duration) {
        if (!PLAYERCONFIG.playbackList.playMode === 1) {
            playNext(1, true);
        }
        return;
    }
    videoEl.currentTime = t;
}

//----------------------------------------------------------------------------------------------------------------------

function getTags(file) {
    return new Promise((resolve, reject) => {
        jsmediatags.read(file, {
            onSuccess: function (tag) {
                resolve(tag.tags);
            },
            onError: function (error) {
                reject(error);
            }
        });
    });
}

async function addFiles(filesARG) {
    const selectedFiles = Array.from(filesARG);
    audioFileInput.value = "";

    const newFiles = selectedFiles.filter(file => file.type.startsWith('audio/') || file.type.startsWith('video/'));

    if (newFiles.length === 0) return;

    for (const file of newFiles) {
        try {
            const tags = await getTags(file);
            file._metadata = tags;
            file._artworkURL = useFileArtwork ? getArtworkURL(tags?.picture) : null;
        } catch (error) {
            //console.log("No metadata:", file.name);
            file._metadata = {};
            file._artworkURL = null;
        }
        file._fingerprint = await fileFingerprint(file);
        file._duration = await getMediaDuration(file);
    }

    const uniqueNewFiles = newFiles.filter(file => { return !files.some(existing => existing._fingerprint === file._fingerprint); });

    if (uniqueNewFiles.length === 0) return;
    files = files.concat(uniqueNewFiles);
    addFilesToSongList(uniqueNewFiles);
    randomSongs.setMemory(files.length)
    const file = uniqueNewFiles[0];
    if (!file) {
        console.warn('This file does not exist in the array.');
        return;
    }

    if (!audioCtx || videoEl.paused) {
        loadFile(file);
    }

    updateTotalDurationText();

    console.log('Selected audio/video files:');
    //files.forEach(f => console.log(`${f._fingerprint} ${f.name} (size: ${f.size} bytes, modified: ${new Date(f.lastModified).toISOString()})`));
    console.log(files);
}

async function addRadioUrl(url) {
    if (!url || typeof url !== "string") return;
    url = url.trim();
    if (!url) return;
    const radio = {
        name: url,
        url: url,
        type: "radio",
        _metadata: {},
        _artworkURL: null,
        _fingerprint: `radio:${url}`,
        _duration: "Live"
    };
    if (files.some(existing => existing._fingerprint === radio._fingerprint)) return;
    files.push(radio);
    addFilesToSongList([radio]);
    randomSongs.setMemory(files.length);
    if (!audioCtx || videoEl.paused) {
        loadFile(radio);
    }
    updateTotalDurationText();
    console.log("Added radio station:", radio);
}

async function isMediaStream(url) {
    try {
        const response = await fetch(url, {
            method: "HEAD",
            redirect: "follow"
        });
        if (!response.ok) {
            return false;
        }
        const contentType = response.headers.get("content-type")?.toLowerCase() || "";
        const validTypes = [
            "audio/",
            "video/",
            "application/ogg",
            "application/vnd.apple.mpegurl",
            "application/x-mpegurl",
            "application/x-mpegurl",
            "audio/mpegurl"
        ];
        return validTypes.some(type => contentType.startsWith(type));
    } catch (err) {
        console.warn("Could not test stream:", err);
        return false;
    }
}

function removeFile(file) {
    if (!file) return;
    const index = files.findIndex(f => f._fingerprint === file._fingerprint);
    const el = $(`[data-file-name="${file._fingerprint}"]`);
    if (index !== -1) files.splice(index, 1);
    if (el) el.remove();
    randomSongs.forget(file);
    const isCurrent = currentSelectedFile === file._fingerprint;
    if (file._artworkURL) {
        URL.revokeObjectURL(file._artworkURL);
        file._artworkURL = null;
    }
    if (isCurrent) {
        currentLoadToken++;
        stopAudio(true, true);
        if (videoEl._objectURL) {
            URL.revokeObjectURL(videoEl._objectURL);
            videoEl._objectURL = null;
        }
        videoEl.removeAttribute("src");
        videoEl.load();
        currentSelectedFile = '';
        selectedSubtitle = '';
        subtitleLastIndex = 0;
        soundEnded = false;
        timeline.setValue(0);
        if (chooseAudioLabel) {
            chooseAudioLabel.textContent = 'No file selected';
        }
        document.title = pageOriginalTitle;
    }

    updateTotalDurationText();
    console.log(`File ${file.name} has been removed.`);
}

//----------------------------------------------------------------------------------------------------------------------

// Main loop
function commonLoop() {
    if (!audioCtx || !videoEl.duration) return;
    const elapsed = getElapsedTime(true);
    if (!videoEl.paused && videoEl.duration) {
        timeline.setValue(Math.min(1, elapsed / videoEl.duration));
        timeline.setLive(videoEl.duration === Infinity);
    }

    if (elapsed >= videoEl.duration && !soundEnded) {
        soundEnded = true;
        stopAudio(false, true);

        if (PLAYERCONFIG.playbackList.loopMode === 1) {
            if (loopCounter === 0) {
                loopCounter = 1;
                playFrom(0);
            } else {
                loopCounter = 0;

                if (PLAYERCONFIG.playbackList.playMode === 2) {
                    loadRandom();
                } else if (PLAYERCONFIG.playbackList.playMode === 1) {
                    playNext(1, false);
                }
            }
        } else if (PLAYERCONFIG.playbackList.loopMode === 2) {
            if (PLAYERCONFIG.playbackList.playMode === 1) {
                playNext(1);
            } else {
                playFrom(0);
            }
        } else {
            if (PLAYERCONFIG.playbackList.playMode === 2) {
                loadRandom();
            } else if (PLAYERCONFIG.playbackList.playMode === 1) {
                playNext(1, false);
            }
        }
    }

    if (elapsed < videoEl.duration && soundEnded) {
        soundEnded = false;
    }
}

// Render stuff loop
function renderLoop() {
    requestAnimationFrame(renderLoop);
    const now = performance.now();
    const minFrameTime = 1000 / PLAYERCONFIG.maxRenderFps;
    if (now - lastRenderTimestamp < minFrameTime) return;
    lastRenderTimestamp = now;
    if (!analyser || !audioCtx) return;
    const elapsed = getElapsedTime(true);

    if (!window._lastSubtitleCheck) window._lastSubtitleCheck = 0;
    const SUBTITLE_CHECK_INTERVAL = 50; // ms
    if (now - window._lastSubtitleCheck >= SUBTITLE_CHECK_INTERVAL) {
        window._lastSubtitleCheck = now;
        showSubtitle(elapsed);
    }

    let timeText;

    if (videoEl.duration === Infinity) {
        timeText = `${formatTime(elapsed / PLAYERCONFIG.playback.rate)} / Live`;
    } else if (PLAYERCONFIG.timeTextMode === 0) {
        timeText = `${formatTime(elapsed / PLAYERCONFIG.playback.rate)} / ${formatTime(videoEl.duration / PLAYERCONFIG.playback.rate)}`;
    } else if (PLAYERCONFIG.timeTextMode === 1) {
        timeText = `${formatTime(elapsed / PLAYERCONFIG.playback.rate)} / -${formatTime((elapsed - videoEl.duration) / PLAYERCONFIG.playback.rate)}`;
    } else {
        timeText = '';
    }

    if (audioTimeText.textContent !== timeText) {
        audioTimeText.textContent = timeText
    }

    const timeColor = PLAYERCONFIG.playback.rate < 1 ? '#ff4d4d' : PLAYERCONFIG.playback.rate > 1 ? '#4dff4d' : '';
    if (audioTimeText.style.color !== timeColor) {
        audioTimeText.style.color = timeColor;
    }

    const progress = Math.round(((elapsed / (videoEl.duration || 1)) * 1000)) / 10;

    if (progress !== lastProgress) {
        songListContainer.style.setProperty('--audioElapsed', progress + '%');
        lastProgress = progress;
    }


    if (!videoEl.paused) {
        analyser.getByteFrequencyData(freqData);
        analyser.getFloatFrequencyData(freqDataFloat);
        analyser.getByteTimeDomainData(timeData);
        analyserL.getFloatTimeDomainData(dataL);
        analyserR.getFloatTimeDomainData(dataR);
    } else {
        freqDataFloat.fill(analyser.minDecibels - 50);
        freqData.fill(0);
        timeData.fill(128);
    }

    equalizer.visualize(freqDataFloat, analyser);
    metro.render();

    if (!PLAYERCONFIG.visualizer.paused) {
        switch (PLAYERCONFIG.visualizer.current) {
            case 'bar':
                renderHandler.bar.render(freqData, analyser, 2, visualizerMF.value, analyserSmoothing);
                break;

            case 'waterfall':
                renderHandler.waterfall.render(freqData, analyser, 2, visualizerMF.value, analyserSmoothing);
                break;

            case 'waveform':
                renderHandler.wave.render(timeData);
                break;

            case 'soundTrace':
                renderHandler.soundTrace.render(dataL, dataR);
                break;

            case 'retro':
                renderHandler.retro.render(freqDataFloat, analyser);
                break;

            case 'video':
                const track = subtitleList.find(
                    sub => sub._fingerprint === selectedSubtitle
                );
                renderHandler.video.render(videoEl, track);
                break;

            default:
                console.warn(`Unknown visualizer: ${PLAYERCONFIG.visualizer.current}`);
        }
    }
}

//----------------------------------------------------------------------------------------------------------------------

function volumeChanged() {
    const linearValue = Number(volumeSlider.value);
    if (gainNode) {
        gainNode.gain.value = linearValue;
    }
    PLAYERCONFIG.playback.volume = linearValue;
    const dB = linearValue <= 0 ? -Infinity : 20 * Math.log10(linearValue);
    const dbDisplay = dB === -Infinity ? "-inf dB" : `${dB >= 0 ? "+" : ""}${dB.toFixed(1)} dB`;
    $id("audio-volume").innerText = `Volume: ${dbDisplay}`;
    volumeSlider.dataset.tip = `Volume: ${Math.round(linearValue * 100)}%`;
}

function isTypingOrEditing() {
    const el = document.activeElement;
    return (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        el?.isContentEditable
    );
}

function eqPresetsDropdown(preselectedName = null) {
    eqPresetSelect.innerHTML = "";
    for (const [categoryName, presets] of Object.entries(EQ_PRESETS)) {
        const group = document.createElement("optgroup");
        group.label = categoryName;
        for (const [presetName, values] of Object.entries(presets)) {
            const option = document.createElement("option");
            option.value = JSON.stringify(values);
            option.textContent = presetName;
            group.appendChild(option);
        }
        eqPresetSelect.appendChild(group);
    }
    const group = document.createElement("optgroup");
    group.label = "User presets";
    for (const [presetName, values] of Object.entries(user_eq_presets)) {
        const option = document.createElement("option");
        option.value = JSON.stringify(values);
        option.textContent = presetName;
        group.appendChild(option);
    }
    eqPresetSelect.appendChild(group);
}

function saveEQPreset(name, values) {
    user_eq_presets[name] = values;
    localStorage.setItem("USER_EQ_PRESETS", JSON.stringify(user_eq_presets));
    eqPresetsDropdown(name);
}

function removeEQPreset(name) {
    delete user_eq_presets[name];
    localStorage.setItem("USER_EQ_PRESETS", JSON.stringify(user_eq_presets));
    const fallback = Object.keys(user_eq_presets)[0] || null;
    eqPresetsDropdown(fallback);
}

audioFileInput.addEventListener('change', e => {
    addFiles(e.target.files);
});

radioAddUrl.addEventListener("click", async e => {
    const url = radioUrl.value.trim();
    if (!url) return;
    const valid = await isMediaStream(url);
    if (!valid) {
        console.warn("Not a recognised media stream:", url);
        dialog.alert("That URL doesn't appear to be a radio/audio/video stream.", radioAddUrl);
        return;
    }
    await addRadioUrl(url);
});

radioUrl.addEventListener("click", () => {
    radioUrl.select();
});

subtitleFileInput.addEventListener('change', async (e) => {
    const subs = await loadSubtitles(e.target.files);
    console.log("Subtitles loaded:", subs);
});

window.addEventListener('dragover', e => {
    e.preventDefault();
});

window.addEventListener("drop", async (e) => {
    e.preventDefault();
    if (!e.dataTransfer || e.dataTransfer.files.length === 0) return;
    const files = Array.from(e.dataTransfer.files);
    const subtitleFiles = files.filter(file => {
        const name = file.name.toLowerCase();
        return name.endsWith(".vtt") ||
            name.endsWith(".srt") ||
            name.endsWith(".ssa") ||
            name.endsWith(".ass");
    });

    if (subtitleFiles.length > 0) {
        const subs = await loadSubtitles(subtitleFiles);
        console.log("Subtitles loaded:", subs);
    }

    addFiles(files);
});

dropdownVizType.addEventListener('change', () => {
    PLAYERCONFIG.visualizer.current = dropdownVizType.value;
});

visualizerMF.addEventListener('input', () => {
    visualizerMF.dataset.tip = `Visualizer max frequency: ${visualizerMF.value} Hz`;
});

visualizerQL.addEventListener('input', () => {
    const v = +visualizerQL.value;
    const newSize = 1024 * (2 ** (v - 1));
    visualizerQL.dataset.tip = `Visualizer quality: ${newSize} fftSize`;

    clearTimeout(fftChangeTimeout);
    fftChangeTimeout = setTimeout(() => {
        analyserffsize = newSize;
        if (analyser) {
            analyserL.fftSize = analyserffsize;
            analyserR.fftSize = analyserffsize;
            analyser.fftSize = analyserffsize;
            updateAnalyser();
        }
    }, 300);
});

visualizerSL.addEventListener('input', () => {
    analyserSmoothing = visualizerSL.value;
    visualizerSL.dataset.tip = `Visualizer smoothing: ${analyserSmoothing * 100}%`;
    if (analyser) {
        analyserL.smoothingTimeConstant = analyserSmoothing;
        analyserR.smoothingTimeConstant = analyserSmoothing;
        analyser.smoothingTimeConstant = analyserSmoothing;
        updateAnalyser();
    }
});

volumeSlider.addEventListener('input', () => {
    volumeChanged();
});

playbackSpeedInput.addEventListener('input', () => {
    setPlaybackRate(Number(playbackSpeedInput.value) || 1);
});

//----------------------------------------------------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
    if (isTypingOrEditing()) return;
    if (e.code === "ArrowRight") jumpAt(5);
    if (e.code === "ArrowLeft") jumpAt(-5);
});

//----------------------------------------------------------------------------------------------------------------------

function toggleWindow(el) {
    el.style.display = el.style.display === "none" ? "block" : "none";
}

songListBtn.addEventListener("click", () => toggleWindow(songList));
subListBtn.addEventListener("click", () => toggleWindow(subtitlesList));
eqBtn.addEventListener("click", () => toggleWindow(eqSlidersContainer));
subBtn.addEventListener("click", () => toggleWindow(subtitlesDiv));
subOptionsBtn.addEventListener("click", () => toggleWindow(subtitlesOptionsDiv));
otherEffectsBtn.addEventListener("click", () => toggleWindow(otherEffectsDiv));
subVizOptBtn.addEventListener("click", () => toggleWindow(visualizerOptionsDiv));
radioBtn.addEventListener("click", () => toggleWindow(radioWin));
metroBtn.addEventListener("click", () => toggleWindow(metronomeWin));

//----------------------------------------------------------------------------------------------------------------------

eqResetBtn.addEventListener("click", () => {
    equalizer.reset();
});

eqPresetSetBtn.addEventListener("click", () => {
    equalizer.loadPreset(JSON.parse(eqPresetSelect.value));
});

eqSliderLink.addEventListener("change", () => {
    equalizer.linkSliders = eqSliderLink.checked;
});

eqSliderLinkModes.addEventListener("input", () => {
    equalizer.linkType = eqSliderLinkModes.value;
});

eqSliderLinkQsize.addEventListener("input", () => {
    equalizer.linkQ = eqSliderLinkQsize.value;
    eqSliderLinkQsize.dataset.tip = eqSliderLinkQsize.value;
});

eqPresetSaveBtn.addEventListener("click", async () => {
    const selected = eqPresetSelect.options[eqPresetSelect.selectedIndex];
    let name = await dialog.prompt(
        "プリセット名を入力してください",
        selected ? selected.textContent : "",
        eqPresetSaveBtn,
        0
    );
    if (!name || !name.trim()) return;
    const values = equalizer.getData().map(v => v.gain);
    const nameExists = Object.values(EQ_PRESETS).some(category =>
        Object.hasOwn(category, name)
    );
    name = nameExists ? `${name} User` : name;
    name = name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\p{L}\p{N}_-]/gu, "")
        .slice(0, 50);

    if (user_eq_presets[name]) {
        const ok = await dialog.confirm(
            `「${name}」プリセットを上書きしますか？`,
            eqPresetSaveBtn,
            1
        );
        if (!ok) return;
    }
    saveEQPreset(name, values);
    eqPresetsDropdown();
    const option = [...eqPresetSelect.options].find(o => o.text === name);
    if (option) {
        option.selected = true;
        eqPresetSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
});

eqPresetRemoveBtn.addEventListener("click", async () => {
    const selected = eqPresetSelect.options[eqPresetSelect.selectedIndex];
    if (!selected) return;
    const group = selected.parentElement;
    if (!group || group.label !== "User presets") {
        await dialog.alert("ユーザーが保存したプリセットのみ削除できます", eqPresetRemoveBtn, 0);
        return;
    }
    const ok = await dialog.confirm(
        "選択したプリセットを削除しますか？",
        eqPresetRemoveBtn,
        1
    );
    if (!ok) return;
    removeEQPreset(selected.textContent);
});

subUnloadSubBtn.addEventListener("click", () => {
    selectedSubtitle = "";
});

subAutoFindBtn.addEventListener("click", () => {
    forceFindSub();
});

vizPauseVizBtn.addEventListener("click", () => {
    PLAYERCONFIG.visualizer.paused = !PLAYERCONFIG.visualizer.paused;
});

playPreviousButton.addEventListener("click", () => {
    playNext(-1);
});

playNextButton.addEventListener("click", () => {
    playNext(1);
});

playNextRandomButton.addEventListener("click", () => {
    loadRandom();
});

subtitleFontSize.addEventListener("input", () => {
    subtitleTextEl.style.fontSize = `${subtitleFontSize.value}px`;
});

subtitleFont.addEventListener("change", (e) => {
    if (e.target.value === "default") {
        subtitleTextEl.style.removeProperty("font-family");
    } else {
        subtitleTextEl.style.fontFamily = e.target.value;
    }
});

removeAllSounds.addEventListener("click", async () => {
    const ok = await dialog.confirm("プレイリストをクリアしますか？", removeAllSounds, 1);
    if (!ok) return;
    if (files.length > 1) {
        files.filter(file => file._fingerprint !== currentSelectedFile).forEach(removeFile);
    } else {
        files.forEach(removeFile);
    }
});

removeAllSubtitles.addEventListener("click", async () => {
    const ok = await dialog.confirm("字幕をリストから外しますか？", removeAllSubtitles, 1);
    if (!ok) return;
    if (subtitleList.length > 1) {
        subtitleList.filter(file => file._fingerprint !== selectedSubtitle).forEach(file => removeSubtitle(file._fingerprint));
    } else {
        subtitleList.forEach(file => removeSubtitle(file._fingerprint));
    }
});

topListBtn.addEventListener("click", () => {
    if (files.length > 0) {
        loadFile(files[0]);
    }
});

pausePlayButton.addEventListener("click", () => {
    togglePlayPause();
});

songSearch.addEventListener("input", () => {
    const searchTerm = songSearch.value.toLowerCase().trim();
    const matchingFingerprints = files.filter(file => file.name.toLowerCase().includes(searchTerm)).map(file => file._fingerprint);

    $$(".songItem").forEach(item => {
        const fingerprint = item.dataset.fileName;
        item.style.display = matchingFingerprints.includes(fingerprint) ? "" : "none";
    });
});

subSearch.addEventListener("input", () => {
    const searchTerm = subSearch.value.toLowerCase().trim();
    const matchingFingerprints = subtitleList.filter(sub => sub.name.toLowerCase().includes(searchTerm)).map(sub => sub._fingerprint);
    $$(".subtitleItem").forEach(item => {
        const fingerprint = item.dataset.fileName;
        item.style.display = matchingFingerprints.includes(fingerprint) ? "" : "none";
    });
});

$$(".searchBar").forEach(searchBar => {
    searchBar.addEventListener("keydown", e => {
        if (e.key === "Enter") e.target.blur();
    });
});

pipButton.addEventListener("click", async () => {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await pipVideo.play();
            await pipVideo.requestPictureInPicture();
            //await videoEl.requestPictureInPicture();
        }
    } catch (error) {
        //console.log("[PiP failed]\n", error);
        await dialog.alert("この動画はピクチャーインピクチャーに対応していません", pipButton);
    }
});

pipVideo.addEventListener("enterpictureinpicture", () => {
    pipButton.dataset.inpip = "yes";
    canvas.style.visibility = "hidden";
    canvas.width = 1920;
    canvas.height = 1080;
});

pipVideo.addEventListener("leavepictureinpicture", () => {
    pipButton.dataset.inpip = "no";
    canvas.style.removeProperty("visibility");
    resizeCanvas();
});

audioTimeText.addEventListener("click", () => {
    PLAYERCONFIG.timeTextMode = PLAYERCONFIG.timeTextMode === 1 ? 0 : 1;
})

eqMaxDbInput.addEventListener("change", () => {
    const min = Number(eqMaxDbInput.min);
    const max = Number(eqMaxDbInput.max);
    let value = Number(eqMaxDbInput.value);
    if (Number.isNaN(value)) return;
    value = Math.max(min, Math.min(max, value));
    eqMaxDbInput.value = value;
    equalizer.range = value;
});

equalizer.onChange(data => {
    const eq = effectChain.get("eq");
    data.forEach((band, i) => {
        eqState[i] = band.gain;
        eq.setBand(i, band.gain);
    });
});

tapTempo.onBpmChange((bpm) => {
    metro.stop();
    metroEnabled.checked = false;
    metroBpmInput.value = bpm;
    metro.setBpm(bpm);
});

metroFirstBeat.addEventListener("change", () => {
    metro.setFirstBeat(Number(metroFirstBeat.value));
});

metroEnabled.addEventListener("change", () => {
    metroEnabled.checked ? metro.start() : metro.stop();
});

metroBpmInput.addEventListener("change", () => {
    const parseBpm = (value) => {
        const match = value.replace(/\s/g, "").match(/^(\d+(?:\.\d+)?)\s*([*/+-])\s*(\d+(?:\.\d+)?)$/);
        if (!match) {
            const bpm = Number(value);
            return Number.isFinite(bpm) && bpm > 0 ? bpm : null;
        }
        const [, a, operator, b] = match;
        const x = Number(a);
        const y = Number(b);
        switch (operator) {
            case "*": return x * y;
            case "/": return y !== 0 ? x / y : null;
            case "+": return x + y;
            case "-": return x - y;
        }
    }
    const bpm = parseBpm(metroBpmInput.value);
    if (bpm === null) {
        metroBpmInput.value = metro.bpm;
        return;
    };
    metro.setBpm(bpm);
    metroBpmInput.value = bpm;
    metroBpmInput.placeholder = bpm;
});

metroBeatsPerBar.addEventListener("change", () => {
    metro.beatsPerBar = Number(metroBeatsPerBar.value);
})

metroVolume.addEventListener("change", () => {
    metro.volume = Number(metroVolume.value / 100);
})

$$('.metroNudgeBtn').forEach((el) => {
    const value = el.dataset.metroNudge.trim();
    el.addEventListener("click", () => {
        let nudge;
        if (value.startsWith("set ")) {
            const seconds = Number.parseFloat(value.slice(4));
            if (!Number.isFinite(seconds)) return;
            metro.firstBeat = seconds;
            metro.resync();
        } else if (/beats?$/.test(value)) {
            const beats = Number.parseFloat(value);
            if (!Number.isFinite(beats)) return;
            nudge = beats * metro.beatLength;
            metro.nudge(nudge);
        } else {
            nudge = Number(value);
            if (!Number.isFinite(nudge)) return;
            metro.nudge(nudge);
        }
        metroFirstBeat.value = metro.firstBeat;
    });
});

$$('.metroBpmNudgeBtn').forEach((el) => {
    const value = el.dataset.metroBpmNudg.trim();
    el.addEventListener("click", () => {
        let nudge;
        if (value.startsWith("set ")) {
            const seconds = Number.parseFloat(value.slice(4));
            if (!Number.isFinite(seconds)) return;
            metro.setBpm(seconds);
        } else {
            nudge = Number(value);
            if (!Number.isFinite(nudge)) return;
            metro.setBpm(metro.bpm + nudge);
        }
        metroBpmInput.value = metro.bpm;
    });
});

//----------------------------------------------------------------------------------------------------------------------
function updatePlayButton() {
    if (!pausePlayButton) return;
    pausePlayButton.dataset.state = videoEl.paused ? "play" : "pause";
}

function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', async () => {
        await videoEl.play();
        await pipVideo.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
        videoEl.pause();
        pipVideo.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        jumpAt(-offset);
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        jumpAt(offset);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
        playNext(-1);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext(1);
    });
}

videoEl.addEventListener("play", () => {
    pipVideo.play();
    navigator.mediaSession.playbackState = "playing";
    updatePlayButton();
});

videoEl.addEventListener("pause", () => {
    pipVideo.pause();
    navigator.mediaSession.playbackState = "paused";
    updatePlayButton();
});

videoEl.addEventListener("ended", updatePlayButton);

function createFocusHandler(movableWindows) {
    return function focusWindow(window) {
        const index = movableWindows.indexOf(window);
        movableWindows.splice(index, 1);
        movableWindows.push(window);
        movableWindows.forEach((w, i) => {
            w.win.style.zIndex = 1000 + i;
        });
    };
}

function isBrowserFullscreen() {
    // return (
    //     window.innerWidth === screen.width &&
    //     window.innerHeight === screen.height
    // );
    return window.matchMedia('(display-mode: fullscreen)').matches;
}
window.addEventListener("resize", () => {
    if (isBrowserFullscreen()) {
        controlsEl.classList.add("hidden");
        controlsEl.style.cssText = 'position: absolute;';
        showControlsBtn.hidden = false;
    } else {
        controlsEl.classList.remove("hidden");
        controlsEl.style.cssText = '';
        showControlsBtn.hidden = true;
    }
});

showControlsBtn.addEventListener('click', () => {
    controlsEl.classList.toggle("hidden");
})

window.addEventListener("mousemove", (e) => {
    if (!isBrowserFullscreen()) return;
    if (e.clientY <= 20) {
        controlsEl.classList.remove("hidden");
    }
    const rect = controlsEl.getBoundingClientRect();
    const insideWithBuffer = e.clientY <= rect.bottom + 20;
    if (!insideWithBuffer && !controlsEl.classList.contains("hidden")) {
        controlsEl.classList.add("hidden");
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const tooltips = new TooltipManager();
    const movableWindows = [...$$(".movable-window")].map(
        win => new MovableWindow(win, Number(win.dataset.controls ?? 3))
    );
    // const focusWindow = createFocusHandler(movableWindows);
    // movableWindows.forEach(win => {
    //     win.onFocusCallback = focusWindow;
    // });

    const playModeToggle = new LoopToggle(
        $id("playModeBtn"),
        ["none", "playList", "random"],
        (mode) => {
            PLAYERCONFIG.playbackList.playMode = {
                none: 0,
                playList: 1,
                random: 2
            }[mode];
        },
        "none",
        {
            none: "",
            playList: "",
            random: ""
        }
    );

    const loopModeToggle = new LoopToggle(
        $id("loopModeBtn"),
        ["none", "loopOnce", "loop"],
        (mode) => {
            PLAYERCONFIG.playbackList.loopMode = {
                none: 0,
                loopOnce: 1,
                loop: 2
            }[mode];
        },
        "none",
        {
            none: "",
            loopOnce: "",
            loop: ""
        }
    );

    const spaceBar = new SpaceController({
        onTap: togglePlayPause,
        onHoldStart: () => setPlaybackRate(2),
        onHoldEnd: () => setPlaybackRate(Number(playbackSpeedInput.value) || 1)
    });

    spaceBar.attach();

    visualizerMF.setAttribute('data-tip', `Visualizer max frequency: ${visualizerMF.value} Hz`);
    visualizerQL.setAttribute('data-tip', `Visualizer quality: ${analyserffsize} fftSize`);
    visualizerSL.setAttribute('data-tip', `Visualizer smoothing: ${analyserSmoothing * 100}%`);

    const wallpapers = [
        {
            src: "./Media/PlayerWallpapers/playerWallpaper.jpg",
            size: "1000px",
            offset: "-90px"
        },
        {
            src: "./Media/PlayerWallpapers/playerWallpaper2.jpg",
            size: "1000px",
            offset: "-90px"
        },
        {
            src: "./Media/PlayerWallpapers/playerWallpaper3.jpg",
            size: "1300px",
            offset: "-100px"
        },
        {
            src: "./Media/PlayerWallpapers/playerWallpaper4.jpg",
            size: "1000px",
            offset: "-270px"
        },
        {
            src: "./Media/PlayerWallpapers/playerWallpaper5.jpg",
            size: "1000px",
            offset: "-150px"
        }
    ];

    const wallpaperswitch = new WallpaperSwitcher($id("wallpaper"));
    wallpapers.forEach(wallpaper => {
        const img = new Image();
        img.fetchPriority = "low";
        img.src = wallpaper.src;
        img.decode()
            .then(() => {
                //console.log(`${wallpaper.src} ready`);
                wallpaper.ready = true;
            })
        // .catch(() => {
        //     console.log(`${wallpaper.src} failed to decode`);
        // });
        wallpaper.image = img;
    });

    const formats = getSupportedMediaFormats();
    chooseAudioLabel.dataset.tip = `
        <b>Audio</b><br>
        ${formats.audio.join(", ")}
        <hr>
        <b>Video</b><br>
        ${formats.video.join(", ")}
    `;

    eqPresetsDropdown();
    resizeCanvas();
    setupEffects();
    setupMediaSession();
    volumeChanged();

    audioCtx?.suspend();

    //window.addEventListener('resize', () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(resizeCanvas, 100); });

    const observer = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    });
    observer.observe($id("canvasContainer"));

    setInterval(() => {
        wallpaperswitch.nextRandom(wallpapers);
    }, 63000);

    // const runCommonLoop = () => {
    //     commonLoop();
    //     requestAnimationFrame(runCommonLoop);
    // };
    // runCommonLoop();
    // renderLoop();
    setInterval(commonLoop, 1000 / PLAYERCONFIG.maxRenderFps);

    renderLoop();
});
