//import { RenderHandler } from "./RenderVis"
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const audioFileInput = document.getElementById('audioFile');
const subtitleFileInput = document.getElementById('subtitleFile')
const timeSlider = document.getElementById('timeSlider');
const volumeSlider = document.getElementById('volumeSlider');
const pausePlayButton = document.getElementById('pause-play-button');
const songListContainer = document.getElementById('SongList-Container');
const subListContainer = document.getElementById('SubtitlesList-Container');
const eqSlidersContainer = document.getElementById('eq-sliders');
const subtitlesDiv = document.getElementById('Subtitles');
const audioTimeText = document.getElementById('audio-currentTime');
const dropdownVizType = document.getElementById('visualizerType');
const eqPresetSelect = document.getElementById("eqPresetSelect");
const visualizerMF = document.getElementById('visualizerMF');
const visualizerQL = document.getElementById('visualizerQL');
const visualizerSL = document.getElementById('visualizerSL');
const playbackSpeedInput = document.getElementById('playback-speed');
const chooseAudioLabel = document.getElementById('ChooseaudioFileLabel');
const controlsEl = document.getElementById('controls');
const subtitleTextEl = document.getElementById('subtitleText');
const songListTotalPlayTimeText = document.getElementById('songList-totalPlayTime');
const SAMPLE_BYTES = 64 * 1024;

// It is a total mess :) pls prepare mentally before proceeding
// at least i tried my best
// pls dont judge me


// Make sure this error stays at line 32
console.error("Roses are Red, Violets are Blue \n Unexpected '{' on line 32");

const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
// dont question it
const pageOriginalTitle = document.title

const EQ_PRESETS = {
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

const EQ_BANDS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const RETRO_CENTER_FREQS = [
    31,
    63, 80, 100, 125, 160, 200, 250, 315,
    400, 500, 630, 800, 1000, 1250, 1600, 2000,
    2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500,
    16000
];

let user_eq_presets = JSON.parse(localStorage.getItem("USER_EQ_PRESETS") || "{}");

let analyser, analyserL, analyserR, dataL, dataR;
let source, gainNode, buffer, startTime;
let playbackRate = 1.0;
let volume = volumeSlider.value;
let eqFilters = [];
let eqState = EQ_BANDS.map(() => 0);
let playbackLowFreq = 0;
let playbackHighFreq = 0;
let playbackHPFilter = null;
let playbackLPFilter = null;
let files = [];
let subtitleList = []; // {_fingerprint, title, subs}
let selectedSubtitle = ''; // _fingerprint
let currentSelectedFile = ''; // _fingerprint
let currentViz = dropdownVizType.value;
let freqData, freqDataFloat, timeData;
let pauseViz = false;
let soundEnded = false;
let playSoundList = false;
let playRandom = false;
let loopMode = 0;
let loopCounter = 0;

// REMEMBER powers of 2 or something like that
let analyserffsize = 1024 * (2 ** (visualizerQL.value - 1));//8192;//4096;//2048//1024;
let analyserSmoothing = visualizerSL.value;

let subtitleLastIndex = 0;
let fftChangeTimeout = null; // debounce when changing the fftsize
let resizeTimeout = null; // debounce thing for updateing the canvas on window resize or something like that

//------------------------------------------------------------------------------------------------

const randomSongs = new HumanRandom()

const renderHandler = new RenderHandler(canvas, ctx, audioCtx, {
    sensitivity: 2,
    maxFrequency: 16000,
    analyserSmoothing: analyserSmoothing,
    retroCenterFreqs: RETRO_CENTER_FREQS
});

const equalizer = new CanvasEQ(document.getElementById('eq'), EQ_BANDS, 12);

//------------------------------------------------------------------------------------------------

function getElapsedTime() {
    if (!audioCtx || !buffer) return 0;
    if (audioCtx.state === 'running' && source && startTime !== undefined && startTime !== null) {
        return (audioCtx.currentTime - startTime) * playbackRate;
    }
    return Number(timeSlider.value * buffer.duration) || 0;
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

// e
function setPlaybackRate(rate) {
    rate = Number(rate) || 1.0;
    const cur = getElapsedTime();
    playbackRate = rate;
    if (source && source.playbackRate) {
        try { source.playbackRate.value = playbackRate; } catch (e) { }
        if (audioCtx) startTime = audioCtx.currentTime - cur / playbackRate;
    }
    return playbackRate;
}

function timeToSeconds(t) {
    const p = t.split(":").map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return 0;
}

function formatTime(s, format = '{hh} : {mm} : {ss} . {mls}') {
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
    for (let i = 0; i < headBytes.length; i++) mix(headBytes[i]);
    for (let i = 0; i < tailBytes.length; i++) mix(tailBytes[i]);
    const lm = file.lastModified || 0;
    for (let shift = 0; shift < 4; shift++) mix((size >> (shift * 8)) & 0xff);
    for (let shift = 0; shift < 4; shift++) mix((lm >> (shift * 8)) & 0xff);
    return (hash >>> 0).toString(16);
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

function cleanupGraph() {
    if (source) {
        try { source.stop(); } catch { }
        try { source.disconnect(); } catch { }
        source = null;
    }
    if (eqFilters.length) {
        eqFilters.forEach(f => {
            try { f.disconnect(); } catch { }
        });
        eqFilters = [];
    }
    if (playbackHPFilter) {
        try { playbackHPFilter.disconnect(); } catch { }
        playbackHPFilter = null;
    }
    if (playbackLPFilter) {
        try { playbackLPFilter.disconnect(); } catch { }
        playbackLPFilter = null;
    }
    if (gainNode) {
        try { gainNode.disconnect(); } catch { }
        gainNode = null;
    }
}

//----------------------------------------------------------------------------------------------------------------------

function addFilesToSongList(filesSelected) {
    filesSelected.forEach((file, index) => {
        const songDiv = document.createElement('div');
        const left = document.createElement('div');
        const right = document.createElement('div');
        const playButton = document.createElement('button');
        const deleteButton = document.createElement('button');
        const title = document.createElement('span');
        const metadata = document.createElement('span');

        songDiv.classList.add('songItem');
        songDiv.setAttribute('data-file-name', file._fingerprint);

        playButton.classList.add('button', 'songItemPlayButton');
        playButton.style.cssText = 'margin: 5px;';
        playButton.addEventListener('click', () => {
            if (currentSelectedFile === file._fingerprint) {
                togglePlayPause();
            } else {
                currentSelectedFile = file._fingerprint;
                loadFile(file);
            }
        });

        deleteButton.textContent = 'Remove';
        deleteButton.classList.add('button');
        deleteButton.style.cssText = 'margin: 5px;';
        deleteButton.addEventListener('click', async () => {
            if (await tooltipConfirm(deleteButton, "この曲をプレイリストから外しますか？", 1)) removeFile(file);
        });

        title.innerText = file.name;
        title.dataset.tip = file.name;

        metadata.innerText = `${formatTime(file._duration, '{hh}:{mm}:{ss}')} | UID=${file._fingerprint}`;

        left.classList.add('songLeft');
        right.classList.add('songRight');
        title.classList.add('songTitle');
        metadata.classList.add('songMetadata');

        left.appendChild(title);
        left.appendChild(metadata);
        right.appendChild(playButton);
        right.appendChild(deleteButton);
        songDiv.appendChild(left);
        songDiv.appendChild(right);

        songListContainer.appendChild(songDiv);
    });
}

function addSubtitleFilesToList(filesSelected) {
    filesSelected.forEach((file) => {
        if (document.querySelector(`[data-file-name="${file._fingerprint}"]`)) {
            return;
        }
        const subDiv = document.createElement('div');
        const buttonDiv = document.createElement('div');
        const selectButton = document.createElement('button');
        const deleteButton = document.createElement('button');
        const title = document.createElement('span');

        subDiv.classList.add('SubtitleItem');
        subDiv.setAttribute('data-file-name', file._fingerprint);

        selectButton.textContent = 'Select';
        selectButton.classList.add('button');
        selectButton.style.cssText = 'margin: 5px;';

        selectButton.addEventListener('click', () => {
            selectedSubtitle = file._fingerprint;
        });

        deleteButton.textContent = 'Remove';
        deleteButton.classList.add('button');
        deleteButton.style.cssText = 'margin: 5px;';

        deleteButton.addEventListener('click', async () => {
            if (await tooltipConfirm(deleteButton, "この字幕トラックをリストから外しますか？", 1)) {
                const index = subtitleList.findIndex(item => item._fingerprint === file._fingerprint);
                if (index !== -1) subtitleList.splice(index, 1);
                if (selectedSubtitle === file._fingerprint) selectedSubtitle = '';
                subDiv.remove();
            }
        });

        title.style.cssText = 'margin: 5px; background-color: #0000003b';
        title.innerText = file.title;
        title.dataset.tip = file.title;

        buttonDiv.appendChild(selectButton);
        buttonDiv.appendChild(deleteButton);
        subDiv.appendChild(title);
        subDiv.appendChild(buttonDiv);

        subListContainer.appendChild(subDiv);
    });
}

//----------------------------------------------------------------------------------------------------------------------
// Subtitle stuff

function decodeHtml(str) {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
}

function parseYoutubeTags(text) {
    if (!text) return text;
    const tagStyles = {
        'b': 'font-weight: bold;',
        'i': 'font-style: italic;',
        'u': 'text-decoration: underline;',
        'c': 'color: #FFFFFF;',
        's': 'text-decoration: line-through;',
        'font': 'font-family: Arial;',
    };
    const colorMap = {
        'yellow': '#FFFF00',
        'blue': '#0000FF',
        'cyan': '#00FFFF',
        'green': '#00FF00',
        'magenta': '#FF00FF',
        'red': '#FF0000',
        'white': '#FFFFFF',
        'black': '#000000',
    };

    let result = text;

    result = result.replace(/<c#([0-9A-Fa-f]{6})>(.*?)<\/c>/g, (match, hex, content) => {
        return `<span style="color: #${hex};">${content}</span>`;
    });

    result = result.replace(/<b>(.*?)<\/b>/gi, '<span style="font-weight: bold;">$1</span>');
    result = result.replace(/<i>(.*?)<\/i>/gi, '<span style="font-style: italic;">$1</span>');
    result = result.replace(/<u>(.*?)<\/u>/gi, '<span style="text-decoration: underline;">$1</span>');
    result = result.replace(/<s>(.*?)<\/s>/gi, '<span style="text-decoration: line-through;">$1</span>');
    result = result.replace(/<font\s+name=['"]([^'"]+)['"](.*?)<\/font>/gi, (match, fontName, content) => {
        return `<span style="font-family: '${fontName}';">${content}</span>`;
    });

    result = result.replace(/<c>(.*?)<\/c>/gi, '<span>$1</span>');

    return result;
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
    const styleMatch = text.match(/Style:\s*([\s\S]*?)(?=\n##|\n\d{2}:\d{2})/);
    const styleBlock = styleMatch ? styleMatch[1] : '';
    const styleMap = {};
    const cssRegex = /::cue\(([^)]+)\)\s*\{\s*([^}]+)\}/g;
    let match;

    while ((match = cssRegex.exec(styleBlock)) !== null) {
        const selector = match[1].trim();
        const cssRules = match[2].trim();
        styleMap[selector] = cssRules;
    }

    const subtitleRegex = /(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})\s*([\s\S]*?)(?=\n\d{2}:\d{2}:\d{2}\.\d{3}\s*-->|$)/g;
    const subtitles = [];

    while ((match = subtitleRegex.exec(text)) !== null) {
        const start = match[1];
        const end = match[2];
        let content = match[3].trim();

        content = content.replace(/<c\.(\w+)>(.*?)<\/c>/gi, (tagMatch, className, tagContent) => {
            const selector = `c.${className}`;
            const style = styleMap[selector] || '';
            return `<span style="${style}">${tagContent}</span>`;
        });

        subtitles.push({
            start: timeToSeconds(start),
            end: timeToSeconds(end),
            text: content
        });
    }
    return subtitles;
}

async function loadSubtitles(files) {
    const addedSubtitles = [];

    for (const file of files) {
        file._fingerprint = await fileFingerprint(file);

        const title = file.name;
        if (subtitleList.some(s => s._fingerprint === file._fingerprint)) {
            console.warn(`Subtitle file "${title}" already exists. Skipping duplicate.`);
            continue;
        }

        const text = await file.text();
        let subs = [];

        if (text.trim().startsWith('WEBVTT')) {
            subs = parseWebVTT(text);
        } else {
            subs = parseSRT(text);
        }

        const subtitleData = {
            _fingerprint: file._fingerprint,
            title,
            subs
        };
        subtitleList.push(subtitleData);
        addedSubtitles.push(subtitleData);
    }
    addSubtitleFilesToList(addedSubtitles);
    return subtitleList;
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
        //------------------------------------
        return s;
    };

    const currentName = normalizeForCompare(file.name, { isSubtitle: false });

    let bestFp = null;
    let bestScore = 0;
    const a = currentName.split(" ").filter(Boolean);

    if (a.length === 0) return "NO_SUB";

    for (const entry of subtitleList) {
        const rawTitle = entry.title || '';
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
    console.log("Found subtitle :", found ? found.title : bestFp, bestScore, bestFp);
    return bestFp;
}

//selectedSubtitle = _fingerprint
function showSubtitle(timeSeconds, selectedSubtitle) {
    const h3 = subtitleTextEl;
    const title = document.getElementById("subtitle-title");

    let subs = null;
    let subKey = null;
    let subTitle = null;

    const entry = subtitleList.find(e => e._fingerprint === selectedSubtitle);
    if (entry) {
        subKey = entry._fingerprint;
        subTitle = entry.title;
        subs = entry.subs;
    }

    const allSubItems = document.querySelectorAll('.SubtitleItem');

    allSubItems.forEach(el => {
        el.classList.toggle(
            'active',
            el.dataset.fileName === entry?._fingerprint
        );
    });

    if (!subs || subs.length === 0) {
        const noSubText = "字幕 - No subtitles";
        if (h3.innerHTML !== "No subtitles") h3.innerHTML = "No subtitles";
        if (title.innerText !== noSubText) {
            title.innerText = noSubText;
            title.dataset.tip = '';
        }
        return null;
    }

    const titleText = `字幕 - ${subTitle || subKey}`;
    if (title.innerText !== titleText) {
        title.innerText = titleText;
        title.dataset.tip = titleText;
    }

    let startIdx = subtitleLastIndex || 0;
    if (startIdx >= subs.length) startIdx = 0;

    for (let offset = 0; offset < subs.length; offset++) {
        const i = (startIdx + offset) % subs.length;
        const s = subs[i];
        if (timeSeconds >= s.start && timeSeconds <= s.end) {
            subtitleLastIndex = i;
            const parsed = parseYoutubeTags(s.text) || "";
            if (h3.innerHTML !== parsed) {
                h3.innerHTML = parsed;
            }
            if (h3.style.display !== 'block') h3.style.display = 'block';
            return s.text;
        }
    }

    h3.innerHTML = "";
    return null;
}

function forceFindSub() {
    const bestKey = getSubtitle(getFileByIdentifier(currentSelectedFile));
    selectedSubtitle = bestKey;
    subtitleLastIndex = 0;
}

//----------------------------------------------------------------------------------------------------------------------

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - (controlsEl ? controlsEl.offsetHeight : 0);
}

//----------------------------------------------------------------------------------------------------------------------

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
    ({ analyserL, analyserR, dataL, dataR } = createSplitAnalyser(node, analyserffsize, analyserSmoothing));

    analyser = audioCtx.createAnalyser();

    analyser.fftSize = analyserffsize;
    analyser.smoothingTimeConstant = analyserSmoothing;

    //analyser.minDecibels = -90;
    //analyser.maxDecibels = -20;

    node.connect(analyser);
    analyser.connect(audioCtx.destination);

    freqData = new Uint8Array(analyser.frequencyBinCount);
    freqDataFloat = new Float32Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
}

function updateAnalyser() {
    freqData = new Uint8Array(analyser.frequencyBinCount);
    freqDataFloat = new Float32Array(analyser.frequencyBinCount);
    timeData = new Uint8Array(analyser.fftSize);
    dataL = new Float32Array(analyserL.fftSize);
    dataR = new Float32Array(analyserR.fftSize);
}

//----------------------------------------------------------------------------------------------------------------------

function playFrom(offset) {
    cleanupGraph();
    stopAudio(false, false);
    audioCtx.resume();
    source = audioCtx.createBufferSource();
    source.buffer = buffer;

    try { source.playbackRate.value = playbackRate; } catch (e) { }; // Im evil

    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;

    eqFilters = EQ_BANDS.map((freq, i) => {
        const f = audioCtx.createBiquadFilter();
        f.type = 'peaking';
        f.frequency.value = freq;
        f.Q.value = 4.3;
        f.gain.value = eqState[i];
        return f;
    });

    source.connect(gainNode);
    let node = gainNode;
    eqFilters.forEach(filt => { node.connect(filt); node = filt; });

    // some testing stuff
    // if (playbackLowFreq && playbackLowFreq > 0) {
    //     playbackHPFilter = audioCtx.createBiquadFilter();
    //     playbackHPFilter.type = 'highpass';
    //     playbackHPFilter.frequency.value = playbackLowFreq;
    //     node.connect(playbackHPFilter);
    //     node = playbackHPFilter;
    // }
    // if (playbackHighFreq && playbackHighFreq > 0) {
    //     playbackLPFilter = audioCtx.createBiquadFilter();
    //     playbackLPFilter.type = 'lowpass';
    //     playbackLPFilter.frequency.value = playbackHighFreq;
    //     node.connect(playbackLPFilter);
    //     node = playbackLPFilter;
    // }

    createAnalyser(node);

    startTime = audioCtx.currentTime - (offset / Math.max(0.0001, playbackRate));
    source.start(0, offset);
    pausePlayButton.dataset.state = 'pause';
}

// Stops the audio
function stopAudio(clearCanvas, pauseCtx) {
    if (source) {
        source.stop();
        if (pauseCtx) {
            audioCtx.suspend();
            pausePlayButton.dataset.state = 'play';
        }
        if (clearCanvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function loadFile(file) {
    if (!file) return;

    const allSongItems = document.querySelectorAll('.songItem');

    selectedSubtitle = getSubtitle(file);
    subtitleLastIndex = 0;
    loopCounter = 0;

    allSongItems.forEach(el => {
        el.classList.toggle(
            'active',
            el.dataset.fileName === file?._fingerprint
        );
    });

    randomSongs.remember(file);

    const reader = new FileReader();

    reader.onload = () => {
        audioCtx.decodeAudioData(reader.result, buf => {
            buffer = buf;
            playFrom(0);
            if (chooseAudioLabel) chooseAudioLabel.textContent = file.name;
            document.title = `${file.name} - ${pageOriginalTitle}`;
            console.log(`Loaded file: ${file.name}`);
        }, error => {
            console.error('[ERROR 1] failed decoding audio data:', error);
        });
    };

    reader.readAsArrayBuffer(file);
}

function togglePlayPause() {
    if (!audioCtx || !buffer) return;
    const elapsed = getElapsedTime();
    const sliderAtEnd = Math.abs(+timeSlider.value * buffer.duration - buffer.duration) < 0.1;
    if (audioCtx.state === 'running') {
        stopAudio(false, true);
        timeSlider.value = elapsed / buffer.duration;
    } else {
        audioCtx.resume();
        playFrom(+timeSlider.value * buffer.duration);
    }
    if (elapsed >= buffer.duration - 0.5 && sliderAtEnd) playFrom(0);
}

function playNext(jump = 1, loop = true) {
    if (!audioCtx || !buffer) return;
    let idx = findIndexByIdentifier(currentSelectedFile);
    if (idx === -1) idx = 0;
    const nextIdx = idx + jump;
    if (!loop && (nextIdx < 0 || nextIdx >= files.length)) return;
    idx = loop ? (nextIdx + files.length) % files.length : nextIdx;
    currentSelectedFile = files[idx]._fingerprint;
    loadFile(files[idx]);
}

function loadRandom() {
    const randomSong = randomSongs.pick(files);
    if (randomSong) {
        currentSelectedFile = randomSong._fingerprint;
        loadFile(randomSong);
    }
}

function jumpAt(time = 5) {
    if (!audioCtx || !buffer) return;
    let t = getElapsedTime() + time;
    t = t >= 0 ? t : 0
    if (t >= buffer.duration) playNext(1, true);
    else {
        if (audioCtx.state === 'running') playFrom(t);
        else {
            stopAudio(false, true);
            audioTimeText.textContent = formatTime(t) + ' / ' + formatTime(buffer.duration);
            timeSlider.value = t / buffer.duration
        }
    }
}

//----------------------------------------------------------------------------------------------------------------------

async function addFiles(filesARG) {
    const selectedFiles = Array.from(filesARG);
    audioFileInput.value = "";

    const newFiles = selectedFiles.filter(file => file.type.startsWith('audio/') || file.type.startsWith('video/'));

    if (newFiles.length === 0) return;

    for (const file of newFiles) {
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
        console.warn('[WARNING 1] This file does not exist in the array.');
        return;
    }

    if (!audioCtx || audioCtx.state !== 'running') {
        currentSelectedFile = file._fingerprint;
        loadFile(file);
    }

    updateTotalDurationText();

    console.log('Selected audio/video files:');
    //files.forEach(f => console.log(`${f._fingerprint} ${f.name} (size: ${f.size} bytes, modified: ${new Date(f.lastModified).toISOString()})`));
    console.log(files);
}

function removeFile(file) {
    if (!file) return; // 

    const index = files.findIndex(f => f._fingerprint === file._fingerprint);
    if (index !== -1) {
        files.splice(index, 1);
    }

    const selector = file._fingerprint ? `[data-file-name="${file._fingerprint}"]` : null;
    if (selector) {
        const songItem = document.querySelector(selector);
        if (songItem) songItem.remove();
    }

    try {
        randomSongs.forget(file);
    } catch (e) {
        console.warn('[WARNING 2] Failed to remove file from history:', e);
    }

    if (currentSelectedFile === file._fingerprint) {
        try {
            stopAudio(true, true);
        } catch (e) {
            console.warn('Failed to stop audio:', e);
        }

        buffer = null;
        startTime = 0;
        selectedSubtitle = '';
        timeSlider.value = 0;

        if (chooseAudioLabel) {
            chooseAudioLabel.textContent = 'No file selected';
        }
        document.title = pageOriginalTitle;

        if (source) {
            try {
                source.stop();
            } catch (e) {
                console.warn('Failed to stop audio source:', e);
            }
            source = null;
        }
    }

    updateTotalDurationText();
    console.log(`File ${file.name} has been removed.`);
}

//----------------------------------------------------------------------------------------------------------------------

// Main loop
function commonLoop() {
    if (!audioCtx || !buffer) return;
    const elapsed = getElapsedTime();

    if (audioCtx.state === 'running') {
        if (elapsed < buffer.duration) {
            timeSlider.value = elapsed / buffer.duration;
        }
    }

    if ((!audioCtx || elapsed >= buffer.duration) && !soundEnded) {
        soundEnded = true;
        stopAudio(false, true);
        if (loopMode === 1) {
            if (loopCounter === 0) {
                loopCounter = 1;
                playFrom(0);
            } else {
                loopCounter = 0;
                if (playRandom) {
                    loadRandom();
                } else if (playSoundList) {
                    playNext(1, false);
                }
            }
        } else if (loopMode === 2) {
            if (playSoundList) {
                playNext(1);
            } else {
                playFrom(0);
            }
        } else {
            if (playRandom) {
                loadRandom();
            } else if (playSoundList) {
                playNext(1, false);
            }
        }
    }

    if (elapsed < buffer.duration && soundEnded) {
        soundEnded = false;
    }
}

// Render stuff loop
function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (!analyser || !audioCtx || !buffer) return;
    const elapsed = getElapsedTime();

    if (!window._lastSubtitleCheck) window._lastSubtitleCheck = 0;
    const SUBTITLE_CHECK_INTERVAL = 200; // ms
    const now = performance.now();
    if (now - window._lastSubtitleCheck >= SUBTITLE_CHECK_INTERVAL) {
        window._lastSubtitleCheck = now;
        showSubtitle(elapsed, selectedSubtitle);
    }

    const timeText = formatTime(elapsed / playbackRate) + ' / ' + formatTime(buffer.duration / playbackRate);
    if (audioTimeText.textContent !== timeText) {
        audioTimeText.textContent = timeText
    }

    const timeColor = playbackRate < 1 ? '#ff4d4d' : playbackRate > 1 ? '#4dff4d' : '';
    if (audioTimeText.style.color !== timeColor) {
        audioTimeText.style.color = timeColor;
    }

    let lastProgress = -1;

    const progress = Math.round((elapsed / buffer.duration) * 1000) / 10;

    if (progress !== lastProgress) {
        songListContainer.style.setProperty('--audioElapsed', progress + '%');
        lastProgress = progress;
    }


    if (audioCtx.state === 'running') {
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

    if (!pauseViz) {
        switch (currentViz) {
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

            default:
                console.warn(`Unknown visualizer: ${currentViz}`);
        }
    }
}

//----------------------------------------------------------------------------------------------------------------------

function volumeChanged() {
    const linearValue = volumeSlider.value; // 0 to 1.25

    if (gainNode) {
        gainNode.gain.value = linearValue;
    }

    volume = linearValue

    const dB = linearValue === 0 ? -Infinity : 20 * Math.log10(linearValue);
    const dbDisplay = `${dB.toFixed(1)} dB`;

    document.getElementById("audio-volume").innerText = `Volume: ${dB > 0 ? '+' : ''}${dbDisplay}`;
    volumeSlider.dataset.tip = `Volume: ${Math.floor(volumeSlider.value * 100)}%`
}

function setPlaybackFreqRange(lowHz = 0, highHz = 0) {
    playbackLowFreq = Number(lowHz) || 0;
    playbackHighFreq = Number(highHz) || 0;
    if (audioCtx && buffer && audioCtx.state === 'running') {
        playFrom(getElapsedTime());
    }
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
            name.endsWith(".txt");
    });

    if (subtitleFiles.length > 0) {
        const subs = await loadSubtitles(subtitleFiles);
        console.log("Subtitles loaded:", subs);
    }

    addFiles(files);
});

dropdownVizType.addEventListener('change', () => {
    currentViz = dropdownVizType.value;
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

timeSlider.addEventListener('input', () => {
    if (!audioCtx || !buffer) return;
    const t = +timeSlider.value * buffer.duration;
    if (audioCtx.state === 'running') playFrom(t);
    else {
        stopAudio(false, true);
        audioTimeText.textContent = formatTime(t) + ' / ' + formatTime(buffer.duration);
    }
});

playbackSpeedInput.addEventListener('input', () => {
    setPlaybackRate(Number(playbackSpeedInput.value) || 1);
})

//----------------------------------------------------------------------------------------------------------------------

document.addEventListener("keydown", (e) => {
    if (isTypingOrEditing()) return;

    // if (e.code === "Space") {
    //     e.preventDefault();
    //     togglePlayPause();
    // }

    if (e.code === "ArrowRight") jumpAt(5);
    if (e.code === "ArrowLeft") jumpAt(-5);
});

//yeah....

document.getElementById("songListBtn").addEventListener("click", () => {
    document.getElementById('SongList').style.display = document.getElementById('SongList').style.display === 'none' ? 'block' : 'none';
})

document.getElementById("subListBtn").addEventListener("click", () => {
    document.getElementById('SubtitlesList').style.display = document.getElementById('SubtitlesList').style.display === 'none' ? 'block' : 'none';
})

document.getElementById("eqBtn").addEventListener("click", () => {
    eqSlidersContainer.style.display = eqSlidersContainer.style.display === 'none' ? 'block' : 'none';
})

document.getElementById("subBtn").addEventListener("click", () => {
    subtitlesDiv.style.display = subtitlesDiv.style.display === 'none' ? 'block' : 'none';
})

document.getElementById("eqResetBtn").addEventListener("click", () => {
    equalizer.reset();
})

document.getElementById("eqPresetSetBtn").addEventListener("click", () => {
    equalizer.loadPreset(JSON.parse(eqPresetSelect.value))
})

document.getElementById("eqPresetSaveBtn").addEventListener("click", async () => {
    const name = await tooltipConfirm(
        eqPresetSaveBtn,
        "プリセット名を入力してください",
        0,
        "prompt"
    );
    if (!name || !name.trim()) return;
    const values = equalizer.getData().map(v => v.gain);
    saveEQPreset(name.trim(), values);
    eqPresetsDropdown();
});

document.getElementById("eqPresetRemoveBtn").addEventListener("click", async () => {
    const selected = eqPresetSelect.options[eqPresetSelect.selectedIndex];
    if (!selected) return;
    const optGroup = selected.parentElement;
    if (!optGroup || optGroup.label !== "User presets") {
        await tooltipConfirm(eqPresetRemoveBtn, "ユーザーが保存したプリセットのみ削除できます", 0, "info");
        return;
    }
    const name = selected.textContent;
    const ok = await tooltipConfirm(
        eqPresetRemoveBtn,
        "選択したプリセットを削除しますか？",
        1
    );
    if (!ok) return;
    removeEQPreset(name);
});

document.getElementById("subUnloadSubBtn").addEventListener("click", () => {
    selectedSubtitle = '';
})

document.getElementById("subAutoFindBtn").addEventListener("click", () => {
    forceFindSub();
})

document.getElementById("vizPauseVizBtn").addEventListener("click", () => {
    pauseViz = !pauseViz;
})

document.getElementById("play-previous-button").addEventListener("click", () => {
    playNext(-1);
})

document.getElementById("play-next-button").addEventListener("click", () => {
    playNext(1);
})

document.getElementById("play-next-random-button").addEventListener("click", () => {
    loadRandom();
})

document.getElementById("removeAllSounds").addEventListener("click", async () => {
    const ok = await tooltipConfirm(document.getElementById("removeAllSounds"), "プレイリストをクリアしますか？", 1);
    if (!ok) return;
    while (files.length > 0) {
        removeFile(files[0]);
    }
});

document.getElementById("topListBtn").addEventListener("click", () => {
    if (files.length > 0) {
        currentSelectedFile = files[0]._fingerprint;
        loadFile(files[0]);
    }
})

pausePlayButton.addEventListener("click", (e) => {
    togglePlayPause();
})

equalizer.onChange((data) => {
    data.forEach((band, i) => {
        eqState[i] = band.gain;

        const filter = eqFilters.find(b => b.frequency.value === band.freq);
        if (filter) filter.gain.value = band.gain;
    });
});

//----------------------------------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const tooltips = new TooltipManager();
    const movableWindows = [...document.querySelectorAll(".movable-window")].map(win => new MovableWindow(win));
    const playModeToggle = new LoopToggle(
        document.getElementById("playModeBtn"),
        ["none", "playList", "random"],
        (mode) => {
            const modes = {
                none: { playSoundList: false, playRandom: false },
                playList: { playSoundList: true, playRandom: false },
                random: { playSoundList: false, playRandom: true }
            };

            const config = modes[mode];

            playSoundList = config.playSoundList;
            playRandom = config.playRandom;
        },
        "none",
        {
            none: "",
            playList: "",
            random: ""
        }
    );

    const loopModeToggle = new LoopToggle(
        document.getElementById("loopModeBtn"),
        ["none", "loopOnce", "loop"],
        (mode) => {
            loopMode = {
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

    document.querySelectorAll(".slider.time").forEach(el => {
        new SliderProgress(el);
    });

    visualizerMF.setAttribute('data-tip', `Visualizer max frequency: ${visualizerMF.value} Hz`);
    visualizerQL.setAttribute('data-tip', `Visualizer quality: ${analyserffsize} fftSize`);
    visualizerSL.setAttribute('data-tip', `Visualizer smoothing: ${analyserSmoothing * 100}%`);

    eqPresetsDropdown();

    resizeCanvas();
    volumeChanged();

    window.addEventListener('resize', () => { clearTimeout(resizeTimeout); resizeTimeout = setTimeout(resizeCanvas, 100); });

    setInterval(commonLoop, 16);
    renderLoop();
});
