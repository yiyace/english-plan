"use strict";
/* ---------- 工具 ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const fmt = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => fmt(new Date());
const addDays = (s, n) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return fmt(d); };
const diffDays = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);

/* ---------- 状态 ---------- */
const KEY = "eng_plan_v1";
const DEFAULTS = () => ({ start: today(), perDay: 6, perDayPhr: 2, cards: {}, wIntro: 0, pIntro: 0, introDate: "",
  checks: {}, pron: {}, clI: 0, lab: {}, hv: {}, voice: "", logs: [], custom: [], done: { ph: {}, gr: {} } });
let S = (() => { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j) return Object.assign(DEFAULTS(), j); } catch (e) {} return DEFAULTS(); })();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
save();

/* ---------- 语音：朗读 & 识别 ---------- */
let voice = null;
function enVoices() { return speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); }
function pickVoice() {
  const vs = enVoices();
  voice = vs.find(v => v.name === S.voice)
    || vs.find(v => v.localService && /en-US/i.test(v.lang))
    || vs.find(v => v.localService)
    || vs.find(v => /en-US/i.test(v.lang))
    || vs[0] || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = () => { pickVoice(); if (document.getElementById("view") && typeof render === "function") render(); }; }
/* ---- 预先生成的真人级音频（优先），找不到才用浏览器自带语音 ---- */
let MAN = null, manDone = false, curAudio = null, sayTok = 0;
fetch("audio/manifest.json").then(r => r.ok ? r.json() : null).then(j => { MAN = j; if (j) j.wset = new Set(j.w); }).catch(() => {}).finally(() => { manDone = true; if (document.getElementById("view") && typeof render === "function") render(); });
const normT = t => String(t).replace(/\s+/g, " ").trim();
function clipFor(text) {
  if (!MAN) return null;
  const t = normT(text);
  if (MAN.s[t]) return "audio/s/" + MAN.s[t] + ".mp3";
  const w = t.toLowerCase();
  if (MAN.wset.has(w)) return "audio/w/" + w.replace(/'/g, "_").replace(/ /g, "-") + ".mp3";
  return null;
}
function stopAll() { sayTok++; try { speechSynthesis.cancel(); } catch (e) {} if (curAudio) { try { curAudio.pause(); } catch (e) {} curAudio = null; } }
function playClip(url, rate) {
  return new Promise(res => {
    const a = new Audio(url); a.playbackRate = rate || 1; a.preservesPitch = true;
    a.onended = () => res(true); a.onerror = () => res(false);
    curAudio = a; a.play().catch(() => res(false));
  });
}
function say(text, rate) {
  stopAll(); const tok = sayTok;
  const t = normT(text), rt = rate && rate < 0.8 ? 0.7 : 1;
  let urls = null;
  const whole = clipFor(t);
  if (whole) urls = [whole];
  else { const parts = (t.match(/[^.!?]+[.!?]*/g) || [t]).map(p => p.trim()).filter(Boolean); const us = parts.map(clipFor); if (us.length && us.every(Boolean)) urls = us; }
  if (!urls) return ttsSay(t, rate);
  (async () => { for (const u of urls) { if (tok !== sayTok) return; const ok = await playClip(u, rt); if (ok === false) { if (tok === sayTok) ttsSay(t, rate); return; } } })();
}
function ttsSay(text, rate) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const parts = (String(text).match(/[^.!?]+[.!?]*/g) || [String(text)]).map(p => p.trim()).filter(Boolean);
  setTimeout(() => {
    speechSynthesis.resume();
    parts.forEach(p => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = "en-US"; u.rate = rate || 0.9; if (voice) u.voice = voice;
      speechSynthesis.speak(u);
    });
  }, 80);
}
const hasEnglishVoice = () => enVoices().length > 0;
const hasLocalEnglish = () => enVoices().some(v => v.localService);
function voiceTip() {
  if (!manDone || MAN || !("speechSynthesis" in window) || hasLocalEnglish()) return "";
  return `<div class="card2 warnbox"><b>⚠ 这台电脑没有安装英语语音包</b>
  <p>现在听到的声音要么很慢（在线声音），要么根本没声音。免费安装只需 1 分钟：</p>
  <p>Windows 设置 → 时间和语言 → 语音 → <b>添加语音</b> → 搜索“English (United States)” → 安装。装好后<b>重启本窗口</b>，再到“我的 → 发音人”里选 David / Zira / Mark。</p></div>`;
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function listen(cb) {
  if (!SR) { cb(null, "unsupported"); return null; }
  const r = new SR(); r.lang = "en-US"; r.interimResults = true; r.continuous = true;
  let text = "";
  r.onresult = e => { let t = ""; for (const x of e.results) t += x[0].transcript + " "; text = t; cb({ text, final: false }); };
  r.onerror = e => cb(null, e.error);
  r.onend = () => cb({ text, final: true });
  try { r.start(); } catch (e) { cb(null, "error"); return null; }
  return r;
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter(Boolean);
function score(target, said) {           // 最长公共子序列对齐，标出每个词是否读对
  const a = norm(target), b = norm(said), n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false); let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  const raw = target.split(/\s+/).filter(w => norm(w).length);
  const words = raw.map((w, k) => ({ w, ok: hit[k] }));
  const h = hit.filter(Boolean).length;
  return { acc: n ? Math.round(h / n * 100) : 0, words };
}
const wordsHtml = r => r.words.map(x => `<span class="${x.ok ? "ok" : "bad"}">${esc(x.w)}</span>`).join(" ");

/* ---------- 卡片库 ---------- */
function buildQueues() {
  const core = DATA.core.map((c, i) => ({ id: "c" + i, en: c[0], zh: c[1], ex: c[2], deck: "核心词" }));
  const mach = DATA.mach.map((c, i) => ({ id: "m" + i, en: c[0], zh: c[1], ex: c[2], deck: "行业词" }));
  const words = core.slice(0, 40);
  let a = 40, b = 0;
  while (a < core.length || b < mach.length) {
    for (let k = 0; k < 2 && a < core.length; k++) words.push(core[a++]);
    for (let k = 0; k < 2 && b < mach.length; k++) words.push(mach[b++]);
  }
  (DATA.extraWords || []).forEach((c, i) => words.push({ id: "x" + i, en: c[0], zh: c[1], ex: c[2], deck: "行业词" }));
  (DATA.extraWords3 || []).forEach((c, i) => words.push({ id: "y" + i, en: c[0], zh: c[1], ex: c[2], deck: "沟通词" }));
  (DATA.extraWords4 || []).forEach((c, i) => words.push({ id: "z" + i, en: c[0], zh: c[1], ex: c[2], deck: "A2常用词" }));
  (DATA.extraWords5 || []).forEach((c, i) => words.push({ id: "v" + i, en: c[0], zh: c[1], ex: c[2], deck: "进阶词" }));
  (DATA.extraWords6 || []).forEach((c, i) => words.push({ id: "t" + i, en: c[0], zh: c[1], ex: c[2], deck: "B1词与短语动词" }));
  (DATA.extraWords7 || []).forEach((c, i) => words.push({ id: "s" + i, en: c[0], zh: c[1], ex: c[2], deck: "B1话题词" }));
  const phrases = DATA.phrases.concat(DATA.extraPhrases || [], DATA.extraPhrases3 || [], DATA.extraPhrases4 || [], DATA.extraPhrases5 || [], DATA.extraPhrases6 || [], DATA.extraPhrases7 || []).map((c, i) => ({ id: "p" + i, en: c[0], zh: c[1], ex: "", deck: "外贸句型" }));
  return { words, phrases };
}
const Q = buildQueues();
const CARD = {};
function rebuildIndex() {
  Object.keys(CARD).forEach(k => delete CARD[k]);
  Q.words.concat(Q.phrases).forEach(c => CARD[c.id] = c);
  S.custom.forEach(c => CARD[c.id] = c);
  (DATA.dialogues || []).forEach((dl, di) => dl.k.forEach(k => { const l = dl.lines[k]; CARD["g" + di + "_" + k] = { id: "g" + di + "_" + k, en: l[1], zh: l[2], ex: "", deck: "对话句型" }; }));
}
rebuildIndex();

function introduceNew() {
  const t = today();
  if (S.introDate === t) return 0;
  let n = 0;
  const take = (arr, idxKey, cnt) => {
    for (let k = 0; k < cnt && S[idxKey] < arr.length; k++, S[idxKey]++) {
      const c = arr[S[idxKey]]; if (!S.cards[c.id]) { S.cards[c.id] = { ef: 2.5, int: 0, rep: 0, due: t, lapses: 0 }; n++; }
    }
  };
  take(Q.words, "wIntro", S.perDay);
  take(Q.phrases, "pIntro", S.perDayPhr);
  S.custom.forEach(c => { if (!S.cards[c.id]) S.cards[c.id] = { ef: 2.5, int: 0, rep: 0, due: t, lapses: 0 }; });
  S.introDate = t; save(); return n;
}
const dueIds = () => Object.keys(S.cards).filter(id => CARD[id] && S.cards[id].due <= today());
function grade(id, q) {
  const c = S.cards[id];
  if (q < 3) { c.rep = 0; c.int = 1; c.lapses++; }
  else { c.rep++; c.int = c.rep === 1 ? 1 : c.rep === 2 ? 3 : Math.round(c.int * c.ef); if (q === 5) c.int = Math.round(c.int * 1.3); }
  c.ef = Math.max(1.3, c.ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  c.due = q < 3 ? today() : addDays(today(), c.int);
  save();
}

/* ---------- 今日计划 ---------- */
const dayIdx = () => Math.max(1, diffDays(S.start, today()) + 1);
const monthOf = d => Math.floor((d - 1) / 30) + 1;
const phaseOf = d => { const m = monthOf(d); return m <= 3 ? 0 : m <= 9 ? 1 : m <= 15 ? 2 : 3; };
const GSTEPS = ["学习要点，大声读例句（可点🔊）", "抄写例句一遍，并造 3 个自己的句子", "做翻译练习（先自己想，再看答案）", "复习本课，写 3 句和你工作相关的句子"];
const OUT0 = ["录音：用英语介绍自己和公司（先写稿，再读）", "看周围的物品，大声说 10 个英文名称", "写 3 句：今天做了什么（用过去时）", "用 I would like / Could you 造 5 个客户请求句", "把一张图纸的信息说出来：材料、尺寸、数量"];
const OUT1 = ["用模板回一封询价邮件（3–5 句），读出来", "录音 1 分钟：描述一个你做的零件", "写：问客户 3 个关于图纸的问题", "写：告诉客户交期和付款方式", "写：解释一个延误并道歉"];
const OUT2 = ["与 AI 语音对话 10 分钟（客户电话角色扮演）", "复述今天听到的内容 3 句话", "写一封 100 词邮件并自查语法", "口语：模拟谈价格 3 分钟（录音自评）"];
const IELTS_DAY = { 1: "听力", 2: "阅读", 3: "写作", 4: "口语", 5: "词汇+语法", 6: "模考一部分", 0: "复习+周测" };
function blocks(d) {
  const ph = phaseOf(d), dow = new Date().getDay();
  const pi = (d - 1) % DATA.phonemes.length, p = DATA.phonemes[pi];
  const gi = Math.floor((d - 1) / 4) % DATA.grammar.length, gs = (d - 1) % 4;
  const ri = ph === 0 ? (d - 1) % 3 : (d - 1) % DATA.passages.length;
  const sun = dow === 0;
  const read = { id: "m5", min: 10, t: sun ? "周测：朗读并记录准确率" : "朗读测试：" + DATA.passages[ri].t, d: sun ? "选一篇没读熟的，朗读并看准确率。目标：比上周高。" : "先听示范，再读。看红色的词，反复练。", go: ["learn", "read", ri] };
  const M = [], E = [];
  const cardB = { id: "m2", min: 20, t: "单词卡：新词 + 复习", d: "新词先听音、看词、再想意思。别死记硬背，多读例句。", go: ["cards"] };
  const evCards = { id: "e1", min: 10, t: "复习到期的卡片", d: "晚上再过一遍当天新词，记忆更牢。", go: ["cards"] };
  const evPhr = { id: "e2", min: 10, t: "外贸句型跟读", d: "点 🔊 听，再点 🎤 跟读，看分数。", go: ["learn", "phrases"] };
  if (ph <= 1) {
    const N = (DATA.dialogues || []).length, di = (d - 1) % N, di1 = (d - 2 + N) % N, round = Math.floor((d - 1) / N);
    const dl = DATA.dialogues[di], kl = dl.lines[dl.k[0]][1];
    const note = round === 0 ? "" : "（第 " + (round + 1) + " 轮：这次尽量不看原文）";
    M.push({ id: "m1", min: 10, t: "听辨训练：20 题", d: "先练耳朵：听一个词，选是哪个。每题换一个人的声音。耳朵分得清，嘴巴才读得准。", go: ["clinic", "hvpt"] });
    M.push({ id: "m2", min: 10, t: `发音：/${p[0]}/ + 弱项词`, d: `${p[2]} 然后练你的弱项词（对着镜子看口型）。`, go: ["clinic", "pairs"] });
    M.push({ id: "m3", min: 25, t: `精听①②：${dl.t}${note}`, d: "第一步：不看文字，听 2–3 遍，试着回答问题。第二步：看原文和中文，弄懂每一句。", go: ["lab", di, "blind"] });
    M.push({ id: "m4", min: 20, t: "精听③④：跟读 + 听写", d: "逐句跟读并看评分；再听写 5 句，找出你听不出来的地方。", go: ["lab", di, "shadow"] });
    M.push({ id: "m5", min: 15, t: "单词卡：新词 + 复习", d: "新卡片看词听音；老卡片会变成填空和中译英：要想出来，不是看出来。", go: ["cards"] });
    M.push(sun
      ? { id: "m6", min: 10, t: "周测：朗读并记录准确率", d: "选一篇没读熟的，朗读并看准确率。目标：比上周高。", go: ["learn", "read", ri] }
      : { id: "m6", min: 10, t: `语法：第 ${gi + 1} 课 ${DATA.grammar[gi].t.replace(/^\d+ /, "")}`, d: `第 ${gs + 1}/4 天：${GSTEPS[gs]}`, go: ["learn", "grammar", gi] });
    E.push({ id: "e1", min: 10, t: "复习到期的卡片", d: "晚上再过一遍，记忆更牢。", go: ["cards"] });
    E.push({ id: "e2", min: 10, t: `重听昨天的对话：${DATA.dialogues[di1].t}`, d: "盲听一遍，不看原文，检查自己还能听懂多少。", go: ["lab", di1, "blind"] });
    E.push({ id: "e3", min: 10, t: "输出任务", d: sun
      ? "把这周写的句子整理好，发给 Claude 请它逐句批改，并把错误记在本子上。"
      : `用对话里的“${kl}”造 2 个关于你自己工作的新句子，写下来并大声读 3 遍。` });
  } else if (ph === 2) {
    M.push({ id: "m1", min: 20, t: "口语：跟读 + 录音自评", d: "选一段 1 分钟英文，影子跟读 3 遍；最后一遍用手机录音，回听找出 3 个问题。", go: ["learn", "phrases"] });
    M.push(cardB);
    M.push({ id: "m3", min: 20, t: "写作：邮件", d: "按模板写一封完整邮件（报价 / 交期 / 问题处理），写完检查：时态、单复数、拼写。" });
    M.push({ id: "m4", min: 20, t: "听力：B1 材料", d: "BBC 6 Minute English 或 VOA Level 3：先盲听 1 遍，再看稿，再听 2 遍。" });
    M.push(read);
    E.push(evCards, evPhr);
    E.push({ id: "e3", min: 10, t: "输出任务", d: OUT2[d % OUT2.length] });
  } else {
    const k = IELTS_DAY[dow];
    M.push({ id: "m1", min: 20, t: "口语：Part 1/2 练习", d: "抽一个话题，限时 2 分钟说完，录音，回听并改进。" });
    M.push(cardB);
    M.push({ id: "m3", min: 20, t: `今日主项：${k}`, d: "按周一听力、周二阅读、周三写作、周四口语、周五词汇语法、周六模考、周日复习轮转。做完一定要订正错题。" });
    M.push({ id: "m4", min: 20, t: "雅思听力：Section 精听", d: "做一个 Section，对答案，再看原文逐句精听错题。" });
    M.push(read);
    E.push(evCards, evPhr);
    E.push({ id: "e3", min: 10, t: "错题 / 写作修改", d: "整理今天的错题与生词，或把写作按反馈重写一遍。" });
  }
  return { M, E, ph };
}
const checked = (d, id) => !!(S.checks[d] && S.checks[d][id]);
function minutesDone(date, bs) { return bs.reduce((s, b) => s + (S.checks[date] && S.checks[date][b.id] ? b.min : 0), 0); }
function streak() {
  const d0 = dayIdx(); let n = 0, date = today();
  for (let k = 0; k < 400; k++) {
    const di = diffDays(S.start, date) + 1; if (di < 1) break;
    const bs = [].concat(...Object.values(blocksFor(di)).filter(Array.isArray));
    const done = minutesDone(date, bs) >= 90;
    if (done) n++; else if (date !== today()) break;
    date = addDays(date, -1);
  }
  return n;
}
function blocksFor(d) { const b = blocks(d); return { M: b.M, E: b.E }; }

/* ---------- 视图 ---------- */
let V = { tab: "today", sub: "phonics", arg: 0 };
const CS = { q: [], i: 0, shown: false, total: 0, ok: 0, active: false };
const RD = { i: 0, rec: null, res: null, live: "" };
const PH = { res: null };
let recObj = null;

function go(tab, sub, arg) { V.tab = tab; if (sub !== undefined) V.sub = sub; if (arg !== undefined) V.arg = arg; render(); window.scrollTo(0, 0); }

function render() {
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("on", b.dataset.tab === V.tab));
  const el = $("#view");
  el.innerHTML = (typeof runBar === "function" ? runBar() : "") + ({ today: vToday, cards: vCards, clinic: vClinic, learn: vLearn, plan: vPlan, me: vMe, lab: vLab, task: vTask })[V.tab]();
}

function vToday() {
  const d = dayIdx(), { M, E, ph } = blocks(d), t = today();
  const names = ["地基", "基础+行业", "外贸沟通", "雅思冲刺"];
  const total = [...M, ...E].reduce((s, b) => s + b.min, 0), done = minutesDone(t, [...M, ...E]);
  const row = b => `<div class="blk ${checked(t, b.id) ? "done" : ""}">
    <label class="chk"><input type="checkbox" data-chk="${b.id}" ${checked(t, b.id) ? "checked" : ""}><span></span></label>
    <div class="bt"><b>${esc(b.t)}</b> <i>${b.min}分钟</i><p>${esc(b.d)}</p>${b.go ? `<button class="sm" data-go='${JSON.stringify(b.go)}'>去练习 →</button>` : ""}</div></div>`;
  return voiceTip() + `<h1>第 ${d} 天 <small>第 ${monthOf(d)} 个月 · ${names[ph]}阶段</small></h1>
  <div class="bar"><div style="width:${Math.round(done / total * 100)}%"></div></div>
  <p class="muted">今日完成 ${done} / ${total} 分钟 · 连续打卡 ${streak()} 天</p>
  <button class="big" data-run="start">▶ 开始今日训练（一键引导）</button>
  <p class="muted"><button class="sm2" data-go='["plan"]'>路线图与学习方法</button> 不想一键引导，也可以在下面自己选着做。</p>
  <h2>☀ 上午（90 分钟）</h2>${M.map(row).join("")}
  <h2>🌙 晚上（30 分钟）</h2>${E.map(row).join("")}
  <p class="muted">小提示：每天的任务不要拖到明天。只要做完，哪怕只有一半时间，也好过不开始。</p>`;
}

function clozeRe(c) { const w = c.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); return new RegExp("\\b" + w + "(?:s|es|ed|d|ing)?\\b", "i"); }
function clozeOf(c) { return c.ex.replace(clozeRe(c), "_____"); }
function cardMode(id) {
  const c = CARD[id], st = S.cards[id];
  if (!c || !st || st.rep < 2) return "recog";
  if (c.deck === "外贸句型" || c.deck === "对话句型") return "prod";
  if (c.ex && clozeRe(c).test(c.ex)) return "cloze";
  return "prod";
}
function vCards() {
  if (!CS.active) {
    const nNew = introduceNew(); const due = dueIds().length;
    const all = Object.keys(S.cards).length;
    return `<h1>单词卡</h1><div class="card2"><p>今天新词已加入 <b>${nNew || "（已加入过）"}</b>；待复习共 <b>${due}</b> 张。</p>
    <p class="muted">累计学过 ${all} 张。系统按“遗忘曲线”安排复习，你只需诚实地选择“忘了 / 模糊 / 记得 / 很熟”。</p>
    <button class="big" data-act="cardstart" ${due ? "" : "disabled"}>${due ? "开始复习" : "今天没有卡片了 🎉"}</button></div>`;
  }
  if (CS.i >= CS.q.length) {
    CS.active = false;
    return `<h1>完成 🎉</h1><div class="card2"><p>本轮完成 ${CS.total} 张，记得 ${CS.ok} 张。</p><button class="big" data-go='["today"]'>回到今日计划</button></div>`;
  }
  const id = CS.q[CS.i], c = CARD[id], mode = cardMode(id);
  const left = CS.q.length - CS.i;
  const modeName = { recog: "认读", cloze: "填空（想出这个词）", prod: "中译英（想出英文）" }[mode];
  let front = "";
  if (mode === "recog") front = `<div class="en">${esc(c.en)}</div><div><button class="ic" data-say="${esc(c.en)}">🔊</button><button class="ic" data-say-slow="${esc(c.en)}">🐢</button></div>`;
  else if (mode === "cloze") front = `<div class="sent">${esc(clozeOf(c))}</div><p class="muted">提示：${esc(c.zh)}</p><p class="muted">想一想：空格里该填哪个英文词？</p>`;
  else front = `<div class="zhbig">${esc(c.zh)}</div><p class="muted">用英语怎么说？先想，再点“显示答案”。</p>`;
  let back = "";
  if (CS.shown) {
    if (mode === "recog") back = `<div class="zh">${esc(c.zh)}</div>${c.ex ? `<div class="ex">${esc(c.ex)} <button class="ic" data-say="${esc(c.ex)}">🔊</button></div>` : ""}`;
    else back = `<div class="en">${esc(c.en)}</div><div class="zh">${esc(c.zh)}</div>${c.ex ? `<div class="ex">${esc(c.ex)}</div>` : ""}<div><button class="ic" data-say="${esc(c.ex || c.en)}">🔊</button><button class="ic" data-say-slow="${esc(c.ex || c.en)}">🐢</button></div>`;
  }
  return `<h1>单词卡 <small>剩 ${left} 张</small></h1>
  <div class="card2 flash"><span class="tag">${esc(c.deck || "自定义")}</span> <span class="tag">${modeName}</span>
   ${front}${back}
   ${CS.shown ? `<div class="rate"><button class="r1" data-rate="1">忘了</button><button class="r3" data-rate="3">模糊</button><button class="r4" data-rate="4">记得</button><button class="r5" data-rate="5">很熟</button></div>`
   : `<button class="big" data-act="reveal">显示答案</button>`}
  </div>`;
}

const SUBS = [["phonics", "发音"], ["grammar", "语法"], ["read", "朗读"], ["phrases", "外贸句型"]];
function vLearn() {
  const tabs = `<div class="sub">${SUBS.map(s => `<button class="${V.sub === s[0] ? "on" : ""}" data-sub="${s[0]}">${s[1]}</button>`).join("")}</div>`;
  return tabs + ({ phonics: vPhonics, grammar: vGrammar, read: vRead, phrases: vPhrases })[V.sub]();
}

function vPhonics() {
  const i = V.arg || 0, p = DATA.phonemes[i];
  const grid = DATA.phonemes.map((x, k) => `<button class="ph ${k === i ? "on" : ""} ${S.done.ph[k] ? "dn" : ""}" data-ph="${k}">${esc(x[0])}</button>`).join("");
  return `<h1>44 个音标 <small>已掌握 ${Object.keys(S.done.ph).length}/44</small></h1><div class="grid">${grid}</div>
  <div class="card2"><div class="sym">/${esc(p[0])}/ <small>${esc(p[1])}</small></div><p>${esc(p[2])}</p>
  ${p[3].map(w => `<div class="wrow"><b>${esc(w)}</b><button class="ic" data-say="${esc(w)}">🔊</button><button class="ic" data-say-slow="${esc(w)}">🐢</button><button class="ic" data-speak="${esc(w)}" data-out="pho">🎤</button></div>`).join("")}
  <div id="pho" class="res">${PH.res || ""}</div>
  <label class="chk2"><input type="checkbox" data-phdone="${i}" ${S.done.ph[i] ? "checked" : ""}> 我已经能读准这个音</label></div>
  <p class="muted">口型提示：对着镜子看自己的嘴型，对比 Cambridge Dictionary 或 Rachel's English 的视频。单词识别用的是手机/浏览器自带语音识别，仅供参考。</p>`;
}

function vGrammar() {
  const i = V.arg || 0, g = DATA.grammar[i];
  const list = DATA.grammar.map((x, k) => `<button class="gi ${k === i ? "on" : ""} ${S.done.gr[k] ? "dn" : ""}" data-gr="${k}">${esc(x.t)}</button>`).join("");
  return `<h1>语法课 <small>${Object.keys(S.done.gr).length}/${DATA.grammar.length} 课</small></h1>
  <details ${i === 0 && !V.arg ? "open" : ""}><summary>全部课程</summary><div class="glist">${list}</div></details>
  <div class="card2"><h2>${esc(g.t)}</h2><ul>${g.pts.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
  <h3>例句</h3>${g.ex.map(e => `<div class="wrow"><div><b>${esc(e[0])}</b><br><span class="muted">${esc(e[1])}</span></div><button class="ic" data-say="${esc(e[0])}">🔊</button></div>`).join("")}
  <h3>翻译练习（先想再点）</h3>${g.drills.map(e => `<details class="dr"><summary>${esc(e[0])}</summary><p><b>${esc(e[1])}</b> <button class="ic" data-say="${esc(e[1])}">🔊</button></p></details>`).join("")}
  <label class="chk2"><input type="checkbox" data-grdone="${i}" ${S.done.gr[i] ? "checked" : ""}> 本课完成</label></div>`;
}

function vRead() {
  const i = RD.i, p = DATA.passages[i];
  const hist = S.logs.filter(l => l.type === "read" && l.ref === i).slice(-5).map(l => `${l.date} ${l.acc}%`).join(" · ");
  return `<h1>朗读测试 <small>仿 Reading Coach</small></h1>
  <div class="sub2">${DATA.passages.map((x, k) => `<button class="${k === i ? "on" : ""}" data-rd="${k}">${esc(x.t)}</button>`).join("")}</div>
  <div class="card2"><div class="passage">${RD.res ? wordsHtml(RD.res) : esc(p.text)}</div>
  ${S.showZh !== false ? `<div class="zhbox">${esc(p.zh || "")}</div>` : ""}
  <div><button class="sm" data-say-slow="${esc(p.text)}">🔊 示范（慢）</button> <button class="sm" data-say="${esc(p.text)}">🔊 示范（正常）</button> <button class="sm" data-act="zhtoggle">中文翻译：${S.showZh !== false ? "开" : "关"}</button></div>
  <button class="big ${RD.rec ? "rec" : ""}" data-act="readtoggle">${RD.rec ? "⏹ 读完了，点这里评分" : "🎤 开始朗读"}</button>
  ${SR ? "" : `<p class="warn">当前浏览器不支持语音识别。请用电脑上的 Edge / Chrome，或 iPhone 的 Safari。也可以手动记录：<br><input id="manacc" type="number" placeholder="准确率%" min="0" max="100"> <button class="sm" data-act="manlog">保存</button></p>`}
  <div class="res">${RD.live ? "识别到：" + esc(RD.live) : ""}${RD.res ? `<h2>准确率 ${RD.acc}%</h2><p class="muted">绿色=读对，红色=没识别到（可能没读或读错了），点 🔊 再听一遍对比。</p>` : ""}</div>
  <p class="muted">${hist ? "最近成绩：" + hist : ""}</p></div>`;
}

function vPhrases() {
  const all = DATA.phrases;
  return `<h1>外贸句型 <small>${all.length} 句</small></h1><p class="muted">每句：先 🔊 听，再 🎤 跟读，再盖住中文自己说出来。</p>` +
   all.map((p, i) => `<div class="card2 phr"><div class="wrow"><div><b>${esc(p[0])}</b><br><span class="muted">${esc(p[1])}</span></div>
   <button class="ic" data-say="${esc(p[0])}">🔊</button><button class="ic" data-say-slow="${esc(p[0])}">🐢</button><button class="ic" data-speak="${esc(p[0])}" data-out="ph${i}">🎤</button></div>
   <div id="ph${i}" class="res"></div></div>`).join("");
}

function vPlan() {
  const d = dayIdx(), ph = phaseOf(d);
  return (typeof methodCard === "function" ? methodCard() : "") + `<h1>24 个月路线图</h1><p class="muted">今天是第 ${d} 天（共约 730 天），第 ${monthOf(d)} 个月。</p>` +
   DATA.roadmap.map((r, i) => `<div class="card2 ${i === ph ? "cur" : ""}"><h2>${esc(r.name)} ${i === ph ? "<span class='tag'>当前</span>" : ""}</h2><p><b>${esc(r.level)}</b></p>
   <ul>${r.goals.map(g => `<li>${esc(g)}</li>`).join("")}</ul><p>🎯 <b>重点：</b>${esc(r.focus)}</p><p>✅ <b>阶段检测：</b>${esc(r.test)}</p></div>`).join("") +
   `<h2>免费资源（无需付费/绑卡）</h2>` + DATA.resources.map(r => `<div class="card2"><a href="${r.u}" target="_blank" rel="noopener">${esc(r.n)}</a><p class="muted">${esc(r.d)}</p></div>`).join("") +
   `<div class="card2"><h2>现实预期</h2><p>每天 120 分钟 × 24 个月 ≈ 1400 小时。从零基础到雅思 6.0 通常需要约 1000–1200 小时的有效学习，所以目标可以达到，但前提是<b>每天坚持 + 有输出 + 有反馈</b>。写作和口语最容易卡住，从第 10 个月起要持续找人 / AI 批改。</p></div>`;
}

function vMe() {
  const cs = Object.values(S.cards);
  const mature = cs.filter(c => c.int >= 21).length;
  const reads = S.logs.filter(l => l.type === "read" || l.type === "coach");
  const last = reads.slice(-8).reverse().map(l => `<tr><td>${l.date}</td><td>${l.type === "coach" ? "Reading Coach" : "App朗读"}</td><td>${esc(l.note || "")}</td><td><b>${l.acc}%</b></td></tr>`).join("");
  return `<h1>我的进度</h1>
  <div class="stats"><div><b>${dayIdx()}</b>学习天数</div><div><b>${streak()}</b>连续打卡</div><div><b>${cs.length}</b>学过的卡</div><div><b>${mature}</b>已牢固</div></div>
  <div class="card2"><h2>Reading Coach 记录</h2>
   <p class="muted">每月用 Microsoft Reading Coach 测一次，把准确率记在这里。起点：Level 1，67 词，59%。</p>
   <input id="rcacc" type="number" placeholder="准确率 %" min="0" max="100"> <input id="rcnote" placeholder="备注，如 Level 1" >
   <button class="sm" data-act="rclog">保存</button>
   <table>${last || "<tr><td class='muted'>还没有记录</td></tr>"}</table></div>
  <div class="card2"><h2>添加自己的词/句</h2><p class="muted">把真实客户邮件里的生词、常用句加进来，最有用。</p>
   <input id="cen" placeholder="英文"><input id="czh" placeholder="中文"><input id="cex" placeholder="例句（可选）">
   <button class="sm" data-act="addcard">添加</button>
   <p class="muted">批量导入：每行一条，用英文逗号分隔：英文,中文,例句</p><textarea id="cbulk" rows="3"></textarea><button class="sm" data-act="bulk">导入</button></div>
  <div class="card2"><h2>设置</h2>
   <p>开始日期：<input id="sdate" type="date" value="${S.start}"> <button class="sm" data-act="setdate">保存</button></p>
   <p>每天新词数：<input id="spd" type="number" min="1" max="20" value="${S.perDay}"> 句型：<input id="spp" type="number" min="0" max="10" value="${S.perDayPhr}"> <button class="sm" data-act="setper">保存</button></p></div>
  <div class="card2"><h2>发音人</h2>${voiceTip()}<p class="muted">选“本地”的声音点击后立刻出声；“在线”的更自然，但要联网生成，会有明显延迟。</p>
   <select id="vsel">${enVoices().map(v => `<option value="${esc(v.name)}" ${voice && v.name === voice.name ? "selected" : ""}>${esc(v.name)} ${v.localService ? "（本地·快）" : "（在线·慢）"}</option>`).join("")}</select>
   <button class="sm" data-act="voicetest">试听</button></div>
  <div class="card2"><h2>备份 / 换设备</h2><p class="muted">进度只保存在这个浏览器里。换电脑或手机时：先在旧设备“导出”，复制文字，在新设备粘贴“导入”。建议每周导出一次存到微信文件传输助手。</p>
   <button class="sm" data-act="export">导出</button> <button class="sm" data-act="import">导入</button>
   <textarea id="bk" rows="4" placeholder="这里显示或粘贴备份文字"></textarea></div>`;
}

/* ---------- 事件 ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest("button, input, summary"); if (!t) return;
  const D = t.dataset;
  if (D.tab) return go(D.tab);
  if (D.go) { const a = JSON.parse(D.go); return go(a[0], a[1], a[2]); }
  if (D.sub) { V.sub = D.sub; V.arg = 0; return render(); }
  if (D.say !== undefined) return say(D.say, 0.95);
  if (D.saySlow !== undefined) return say(D.sayslow, 0.6);
  if (D.speak !== undefined) return speakCheck(t);
  if (D.ph !== undefined) { V.arg = +D.ph; PH.res = ""; return render(); }
  if (D.gr !== undefined) { V.arg = +D.gr; return render(); }
  if (D.rd !== undefined) { RD.i = +D.rd; RD.res = null; RD.live = ""; return render(); }
  if (D.rate) { grade(CS.q[CS.i], +D.rate); if (+D.rate >= 4) CS.ok++; if (+D.rate < 3) CS.q.push(CS.q[CS.i]); CS.i++; CS.shown = false; render(); const nc = CARD[CS.q[CS.i]]; if (nc && cardMode(CS.q[CS.i]) === "recog") say(nc.en); return; }
  if (D.clmode) { CL.mode = D.clmode; CL.i = CL.mode === "pairs" ? S.clI : 0; CL.res = null; return render(); }
  if (D.clnav) { CL.i = Math.max(0, CL.i + +D.clnav); if (CL.mode === "pairs") { S.clI = CL.i; save(); } CL.res = null; return render(); }
  if (D.claction) return clAction(D.claction);
  const act = D.act; if (!act) return;
  if (act === "cardstart") { CS.q = dueIds().sort(() => Math.random() - .5); CS.i = 0; CS.total = CS.q.length; CS.ok = 0; CS.shown = false; CS.active = true; render(); const c = CARD[CS.q[0]]; if (c && cardMode(CS.q[0]) === "recog") say(c.en); }
  else if (act === "reveal") { CS.shown = true; render(); const cc = CARD[CS.q[CS.i]]; if (cc && cardMode(CS.q[CS.i]) !== "recog") say(cc.ex || cc.en); }
  else if (act === "readtoggle") readToggle();
  else if (act === "zhtoggle") { S.showZh = S.showZh === false; save(); render(); }
  else if (act === "voicetest") say("Thank you for your inquiry. Please send me your drawing.", 0.95);
  else if (act === "manlog") { const v = +$("#manacc").value; S.logs.push({ type: "read", ref: RD.i, date: today(), acc: v, note: DATA.passages[RD.i].t }); save(); render(); }
  else if (act === "rclog") { const v = $("#rcacc").value; if (v === "") return; S.logs.push({ type: "coach", date: today(), acc: +v, note: $("#rcnote").value }); save(); render(); }
  else if (act === "addcard") { const en = $("#cen").value.trim(), zh = $("#czh").value.trim(); if (!en || !zh) return; addCustom(en, zh, $("#cex").value.trim()); render(); }
  else if (act === "bulk") { $("#cbulk").value.split("\n").forEach(l => { const p = l.split(","); if (p.length >= 2 && p[0].trim()) addCustom(p[0].trim(), p[1].trim(), (p[2] || "").trim()); }); render(); }
  else if (act === "setdate") { if ($("#sdate").value) { S.start = $("#sdate").value; save(); render(); } }
  else if (act === "setper") { S.perDay = Math.max(1, +$("#spd").value || 6); S.perDayPhr = Math.max(0, +$("#spp").value || 0); save(); render(); }
  else if (act === "export") { $("#bk").value = JSON.stringify(S); $("#bk").select(); }
  else if (act === "import") { try { const j = JSON.parse($("#bk").value); S = Object.assign(DEFAULTS(), j); save(); rebuildIndex(); alert("导入成功"); render(); } catch (er) { alert("格式不对，请粘贴完整的备份文字"); } }
});
document.addEventListener("change", e => {
  const D = e.target.dataset;
  if (e.target.id === "vsel") { S.voice = e.target.value; save(); pickVoice(); say("Thank you for your inquiry.", 0.95); return; }
  if (D.chk) { const t = today(); (S.checks[t] = S.checks[t] || {})[D.chk] = e.target.checked; save(); render(); }
  if (D.phdone !== undefined) { e.target.checked ? S.done.ph[D.phdone] = 1 : delete S.done.ph[D.phdone]; save(); render(); }
  if (D.grdone !== undefined) { e.target.checked ? S.done.gr[D.grdone] = 1 : delete S.done.gr[D.grdone]; save(); render(); }
});
function addCustom(en, zh, ex) {
  const id = "u" + Date.now() + Math.floor(Math.random() * 1000);
  S.custom.push({ id, en, zh, ex, deck: "自定义" });
  S.cards[id] = { ef: 2.5, int: 0, rep: 0, due: today(), lapses: 0 };
  rebuildIndex(); save();
}
function speakCheck(btn) {
  const target = btn.dataset.speak, out = document.getElementById(btn.dataset.out);
  if (recObj) { try { recObj.stop(); } catch (e) {} recObj = null; }
  if (!SR) { out.innerHTML = "<span class='warn'>此浏览器不支持语音识别（电脑请用 Edge/Chrome，iPhone 用 Safari）。</span>"; return; }
  out.textContent = "请说…";
  recObj = listen((r, err) => {
    if (err) { out.innerHTML = "<span class='warn'>识别失败：" + esc(err) + "（需要联网并允许麦克风）</span>"; return; }
    if (r.final) { const s = score(target, r.text); out.innerHTML = wordsHtml(s) + ` <b>${s.acc}%</b>`; if (btn.dataset.out === "pho") PH.res = out.innerHTML; recObj = null; }
    else out.textContent = "识别中：" + r.text;
  });
  setTimeout(() => { if (recObj) try { recObj.stop(); } catch (e) {} }, 8000);
}
function readToggle() {
  if (RD.rec) { try { RD.rec.stop(); } catch (e) {} return; }
  RD.res = null; RD.live = "";
  RD.rec = listen((r, err) => {
    if (err) { RD.rec = null; RD.live = ""; render(); if (err !== "no-speech" && err !== "aborted") alert("识别失败：" + err + "。需要联网并允许麦克风。"); return; }
    RD.live = r.text;
    if (r.final) {
      RD.rec = null; const p = DATA.passages[RD.i], s = score(p.text, r.text); RD.res = s; RD.acc = s.acc;
      S.logs.push({ type: "read", ref: RD.i, date: today(), acc: s.acc, note: p.t }); save();
    }
    render();
  });
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  render();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
});
