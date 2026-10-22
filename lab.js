"use strict";
/* ============================================================
   精听实验室 · 听辨训练 · 一键引导
   依赖 app.js / clinic.js 里的：S, DATA, CARD, say, ttsSay, playClip, stopAll, listen, score,
   wordsHtml, esc, render, go, dayIdx, today, save, blocks, checked, SR, CL
   ============================================================ */
S.lab = S.lab || {}; S.hv = S.hv || {};
const LB = { i: null, step: "blind", li: 0, sh: null, shAcc: [], dc: null, zh: true };
const HV = { voices: [], words: null, trial: null, n: 0, ok: 0, N: 20, done: false, fb: null, wrong: {}, last: "" };
const RUN = { on: false, i: 0, steps: [], st: 0 };
let lbTok = 0;

/* ---- 包装 go / stopAll ---- */
const _go = go;
go = function (tab, sub, arg) {
  if (tab === "lab") {
    if (sub === undefined) LB.i = null;
    else { LB.i = +sub; LB.step = arg || "blind"; LB.li = 0; LB.sh = null; LB.dc = null; LB.shAcc = []; }
  }
  if (tab === "clinic" && sub === "hvpt") { CL.mode = "hvpt"; hvReset(); }
  if (tab === "clinic" && sub === "pairs") { CL.mode = "pairs"; CL.i = S.clI || 0; CL.res = null; }
  stopAll();
  return _go(tab, sub === "hvpt" || sub === "pairs" ? undefined : sub, arg);
};
const _stop = stopAll;
stopAll = function () { lbTok++; _stop(); };

/* ---- 小工具 ---- */
const dlgUrl = (di, li) => "audio/d/" + di + "_" + li + ".mp3";
const NDLG = () => (DATA.dialogues || []).length;
const todayDlg = () => (dayIdx() - 1) % NDLG();
function mark(li) { document.querySelectorAll(".dl").forEach(e => e.classList.toggle("playing", +e.dataset.li === li)); }
async function lbPlayAll(di, rate) {
  stopAll(); const tok = ++lbTok; const lines = DATA.dialogues[di].lines;
  for (let li = 0; li < lines.length; li++) {
    if (tok !== lbTok) return;
    mark(li);
    const ok = await playClip(dlgUrl(di, li), rate);
    if (tok !== lbTok) return;
    if (ok === false) { ttsSay(lines[li][1], 0.9); await new Promise(r => setTimeout(r, 2000)); }
    await new Promise(r => setTimeout(r, 400));
  }
  if (tok === lbTok) mark(-1);
}
async function lbPlayLine(di, li, rate) {
  const l = DATA.dialogues[di] && DATA.dialogues[di].lines[li]; if (!l) return;
  stopAll(); const tok = lbTok;
  const ok = await playClip(dlgUrl(di, li), rate);
  if (ok === false && tok === lbTok) ttsSay(l[1], 0.9);
}
function addDialogueCards(di) {
  const d = DATA.dialogues[di]; let n = 0;
  d.k.forEach(k => { const id = "g" + di + "_" + k; if (CARD[id] && !S.cards[id]) { S.cards[id] = { ef: 2.5, int: 0, rep: 0, due: today(), lapses: 0 }; n++; } });
  if (n) save(); return n;
}
function asrOnce(on) {
  if (!SR) { on({ err: "unsupported" }); return null; }
  const r = new SR(); r.lang = "en-US"; r.interimResults = false; r.continuous = false; r.maxAlternatives = 3;
  let got = false; on("preparing");
  r.onaudiostart = () => on("listening");
  r.onspeechend = () => { try { r.stop(); } catch (e) {} };
  r.onresult = e => { got = true; on({ text: e.results[0][0].transcript }); };
  r.onerror = e => { got = true; on({ err: e.error }); };
  r.onend = () => { if (!got) on({ err: "no-speech" }); };
  try { r.start(); } catch (e) { on({ err: "error" }); }
  return r;
}
const errMsg = e => e === "no-speech" ? "没听到声音，请靠近麦克风再试。" : e === "unsupported" ? "这个浏览器不支持语音识别（电脑用 Edge / Chrome，iPhone 用 Safari）。" : "识别失败：" + esc(e) + "（需要联网，并允许麦克风）";

/* ============ 视图：精听实验室 ============ */
function vLab() {
  if (LB.i === null || LB.i === undefined) return labList();
  const d = DATA.dialogues[LB.i];
  const steps = [["blind", "① 盲听"], ["read", "② 精读"], ["shadow", "③ 跟读"], ["dict", "④ 听写"]];
  const tabs = `<div class="sub">${steps.map(s => `<button class="${LB.step === s[0] ? "on" : ""}" data-lb="step:${s[0]}">${s[1]}</button>`).join("")}</div>`;
  return `<button class="sm" data-lb="list">← 全部对话</button><h1>${esc(d.t)} <small>${esc(d.sc)}</small></h1>${tabs}` +
    ({ blind: labBlind, read: labRead, shadow: labShadow, dict: labDict })[LB.step](d);
}
function labList() {
  const t = todayDlg();
  const items = DATA.dialogues.map((d, i) => {
    const r = S.lab[i];
    return `<button class="gi ${r && r.done ? "dn" : ""} ${i === t ? "on" : ""}" data-lb="open:${i}">${i + 1}. ${esc(d.t)} ${r && r.done ? "✓" : ""} ${i === t ? "（今日）" : ""}</button>`;
  }).join("");
  const done = Object.values(S.lab).filter(x => x.done).length;
  return `<h1>精听实验室 <small>${done}/${NDLG()} 段</small></h1>
  <div class="card2"><b>怎么练（每段 25–45 分钟，效果最好）</b>
  <p class="muted">① 盲听：先不看文字，听 2–3 遍，回答问题 → ② 精读：看原文和中文，弄懂每一句 → ③ 跟读：逐句模仿并看评分 → ④ 听写：听一句写一句，找出耳朵的弱点。<br>隔天再盲听一遍，检验自己是不是真的听懂了。</p>
  <button class="big" data-lb="open:${t}">▶ 开始今日对话：${esc(DATA.dialogues[t].t)}</button></div>
  <h2>全部对话</h2><div class="glist">${items}</div>
  <p class="muted">这些对话由易到难，全部来自真实外贸场景。后面每个月我会继续补充新对话，并逐渐加长。</p>`;
}
function labBlind(d) {
  return `<div class="card2"><p><b>先别看文字。</b>听 2–3 遍，试着回答下面的问题。听不懂的地方先放过，抓住大意就好。</p>
  <button class="micbtn" data-lb="playall:1">▶ 播放整段对话</button>
  <div class="actrow"><button data-lb="playall:0.75">🐢 慢速播放</button><button data-lb="stop">⏹ 停止</button></div>
  <h3>听完回答（用中文说出答案即可，再点开核对）</h3>
  ${d.q.map(q => `<details class="dr"><summary>${esc(q[0])}</summary><p><b>${esc(q[1])}</b></p></details>`).join("")}
  <button class="big" data-lb="step:read">我听过了，看原文 →</button></div>`;
}
function labRead(d) {
  const n = addDialogueCards(LB.i);
  const rows = d.lines.map((l, i) => `<div class="dl" data-li="${i}"><span class="sp ${l[0]}">${l[0] === "Y" ? "你" : "对方"}</span>
   <div class="dtxt"><b>${esc(l[1])}</b>${d.k.includes(i) ? ' <span class="star">★</span>' : ""}${LB.zh ? `<br><span class="muted">${esc(l[2])}</span>` : ""}</div>
   <button class="ic" data-lb="line:${i}:1">🔊</button><button class="ic" data-lb="line:${i}:0.7">🐢</button></div>`).join("");
  return `<div class="card2"><div class="actrow"><button data-lb="playall:1">▶ 全部播放</button><button data-lb="zh">中文：${LB.zh ? "开" : "关"}</button></div>
  ${rows}
  <p class="muted">★ 是重点句${n ? `，已自动加入单词卡（${n} 张）` : "，已在你的单词卡里"}。点任何一个英文单词可以查意思。</p>
  <button class="big" data-lb="step:shadow">下一步：跟读 →</button></div>`;
}
function labShadow(d) {
  const li = LB.li, l = d.lines[li], last = li === d.lines.length - 1, r = LB.sh;
  let res = "";
  if (r && r.err) res = `<p class="warn">${errMsg(r.err)}</p>`;
  else if (r && r.s) res = `<div class="verdict ${r.acc >= 85 ? "v-ok" : r.acc >= 60 ? "v-near" : "v-bad"}"><b>${r.acc}%</b><div class="passage">${wordsHtml(r.s)}</div><p class="muted">系统听到：${esc(r.text)}。红色词：再听一遍，慢速跟读。</p></div>`;
  const avg = LB.shAcc.filter(x => x !== undefined);
  return `<div class="card2 flash"><span class="tag">${li + 1} / ${d.lines.length}</span>
   <div class="sent">${esc(l[1])}</div><p class="muted">${esc(l[2])}</p>
   <div class="actrow"><button data-lb="line:${li}:1">🔊 听</button><button data-lb="line:${li}:0.7">🐢 慢速</button></div>
   <button class="micbtn ${r === "listening" ? "rec" : r === "preparing" ? "wait" : ""}" data-lb="shadow">${r === "listening" ? "🎧 现在请说！" : r === "preparing" ? "⏳ 麦克风准备中…" : "🎤 跟读这一句"}</button>
   ${res}
   <div class="actrow"><button data-lb="prev" ${li ? "" : "disabled"}>← 上一句</button>${last ? `<button data-lb="step:dict">进入听写 →</button>` : `<button data-lb="next">下一句 →</button>`}</div>
   <p class="muted">小技巧：先听两遍，第三遍时和录音“同时”开口（影子跟读）。重点模仿节奏和重音，而不是一个词一个词读。${avg.length ? "本段平均 " + Math.round(avg.reduce((a, b) => a + b, 0) / avg.length) + "%" : ""}</p></div>`;
}
function dcInit(d) {
  const idx = d.lines.map((_, i) => i).sort(() => Math.random() - .5).slice(0, Math.min(5, d.lines.length)).sort((a, b) => a - b);
  LB.dc = { order: idx, pos: 0, acc: [], res: null, finished: false };
  setTimeout(() => lbPlayLine(LB.i, idx[0], 1), 200);
}
function labDict(d) {
  if (!LB.dc) dcInit(d);
  const D = LB.dc;
  if (D.finished) {
    const avg = Math.round(D.acc.reduce((a, b) => a + b, 0) / D.acc.length);
    const sh = LB.shAcc.filter(x => x !== undefined), shAvg = sh.length ? Math.round(sh.reduce((a, b) => a + b, 0) / sh.length) : null;
    return `<div class="card2"><h2>这段完成了 🎉</h2><p>听写平均 <b>${avg}%</b>${shAvg !== null ? `，跟读平均 <b>${shAvg}%</b>` : ""}。</p>
    <p class="muted">${avg >= 85 ? "听得很清楚。明天晚上盲听一遍巩固，再进入下一段。" : "有些地方还听不清：回到“精读”把错的句子听 3 遍，再做一次听写。"}</p>
    <div class="actrow"><button data-lb="redo">再做一次听写</button><button data-lb="list">回到对话列表</button></div></div>`;
  }
  const li = D.order[D.pos], l = d.lines[li], r = D.res;
  return `<div class="card2 flash"><span class="tag">听写 ${D.pos + 1} / ${D.order.length}</span>
   <p class="muted">听一句，把听到的写下来（不用管大小写和标点）。听不出来就多听几遍，再写。</p>
   <div class="actrow"><button data-lb="dline">🔊 再听</button><button data-lb="dline:0.7">🐢 慢速</button></div>
   <textarea id="dcin" rows="2" placeholder="在这里输入你听到的英文" autocapitalize="off" autocomplete="off" spellcheck="false" ${r ? "disabled" : ""}>${r ? esc(r.typed) : ""}</textarea>
   ${r ? `<div class="verdict ${r.acc >= 85 ? "v-ok" : r.acc >= 60 ? "v-near" : "v-bad"}"><b>${r.acc}%</b><div class="passage">${wordsHtml(r.s)}</div><p class="muted">${esc(l[2])}</p></div>
   <button class="big" data-lb="dnext">${D.pos + 1 >= D.order.length ? "完成 →" : "下一句 →"}</button>`
   : `<button class="big" data-lb="dcheck">检查答案</button>`}</div>`;
}

/* ============ 视图：听辨训练 ============ */
fetch("audio/hv.json").then(r => r.ok ? r.json() : null).then(j => { if (j) { HV.voices = j.voices; HV.words = j.words; if (V.tab === "clinic" && CL.mode === "hvpt") render(); } }).catch(() => {});
const hvUrl = (voice, w) => voice === "Aria" ? "audio/w/" + w.toLowerCase() + ".mp3" : "audio/h/" + voice + "/" + w + ".mp3";
function hvReset() { HV.trial = null; HV.n = 0; HV.ok = 0; HV.done = false; HV.fb = null; HV.wrong = {}; }
function hvNew() {
  const pairs = DATA.pairs;
  const wts = pairs.map((p, i) => { const h = S.hv[i]; return h && h.n ? 1 + 4 * (1 - h.ok / h.n) : 2; });
  let r = Math.random() * wts.reduce((a, b) => a + b, 0), pi = 0;
  for (; pi < wts.length - 1; pi++) { r -= wts[pi]; if (r <= 0) break; }
  const target = Math.random() < 0.5 ? 0 : 1;
  const vs = HV.voices.filter(v => v !== HV.last); const voice = vs[Math.floor(Math.random() * vs.length)]; HV.last = voice;
  HV.trial = { pi, target, voice, order: Math.random() < 0.5 ? [0, 1] : [1, 0] }; HV.fb = null;
  setTimeout(hvPlay, 80);
}
async function hvPlay(which) {
  const t = HV.trial; if (!t) return;
  const w = DATA.pairs[t.pi][which === undefined ? t.target : which];
  stopAll(); const tok = lbTok;
  for (let k = 0; k < HV.voices.length; k++) {
    const ok = await playClip(hvUrl(t.voice, w), 1);
    if (tok !== lbTok) return;
    if (ok !== false) return true;
    t.voice = HV.voices[(HV.voices.indexOf(t.voice) + 1) % HV.voices.length];
  }
  ttsSay(w, 0.9);
}
async function hvBoth() { const t = HV.trial; if (!t) return; const o = 1 - t.target; await hvPlay(t.target); await new Promise(r => setTimeout(r, 300)); if (HV.trial === t) await hvPlay(o); }
function hvChoose(ix) {
  const t = HV.trial; if (!t || HV.fb) return;
  const ok = ix === t.target, h = S.hv[t.pi] || (S.hv[t.pi] = { n: 0, ok: 0 });
  h.n++; if (ok) h.ok++; HV.n++; if (ok) HV.ok++; else HV.wrong[t.pi] = (HV.wrong[t.pi] || 0) + 1;
  HV.fb = { ok, chosen: ix }; save(); render();
  if (ok) setTimeout(() => { if (HV.trial === t) hvAdvance(); }, 900); else hvBoth();
}
function hvAdvance() { if (HV.n >= HV.N) { HV.done = true; HV.trial = null; } else hvNew(); render(); }
function vHv() {
  if (!HV.words) return `<div class="card2"><p>听辨训练文件加载中…（需要通过网址打开；如果一直不出现，请刷新）</p></div>`;
  const pairs = DATA.pairs;
  if (HV.done) {
    const bad = Object.entries(HV.wrong).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pi, c]) => `<li><b>${esc(pairs[pi][0])}</b> / <b>${esc(pairs[pi][1])}</b>：错了 ${c} 次。${esc(pairs[pi][2])}</li>`).join("");
    const allN = Object.values(S.hv).reduce((a, h) => a + h.n, 0);
    return `<div class="card2"><h2>本轮完成：${HV.ok} / ${HV.N} 题正确（${Math.round(HV.ok / HV.N * 100)}%）</h2>
    ${bad ? `<p>这几组最容易听错：</p><ul>${bad}</ul>` : `<p>全部听对了！太棒了。</p>`}
    <p class="muted">累计听辨 ${allN} 题。正确率达到 90% 以上的组，系统会自动减少出现次数。</p>
    <div class="actrow"><button data-hva="again">再来 20 题</button><button data-clmode="pairs">去练这些词的发音</button></div></div>`;
  }
  if (!HV.trial) hvNew();
  const t = HV.trial, pr = pairs[t.pi], fb = HV.fb;
  const btns = t.order.map(ix => `<button class="hvbtn ${fb ? (ix === t.target ? "okb" : ix === fb.chosen ? "badb" : "") : ""}" data-hvc="${ix}" ${fb ? "disabled" : ""}>${esc(pr[ix])}</button>`).join("");
  return `<div class="card2 flash"><span class="tag">第 ${HV.n + 1} / ${HV.N} 题 · 正确 ${HV.ok}</span>
   <p><b>听一个词，选你听到的是哪一个</b><br><span class="muted">每一题都会换一个人的声音。分不清很正常，多练几次耳朵就会变灵。</span></p>
   <div class="hvrow">${btns}</div>
   ${fb ? `<div class="verdict ${fb.ok ? "v-ok" : "v-bad"}">${fb.ok ? "✅ 对了" : "❌ 不对：刚才读的是 <b>" + esc(pr[t.target]) + "</b>"}<p class="muted">${esc(pr[2])}</p></div>
     ${fb.ok ? "" : `<div class="actrow"><button data-hva="both">🔊 再对比听一遍</button><button data-hva="next">下一题 →</button></div>`}`
   : `<button class="micbtn" data-hva="replay">▶ 再听一次</button>`}
  </div>`;
}

/* ============ 一键引导 ============ */
function startRun() {
  const d = dayIdx(), b = blocks(d), t = today();
  RUN.steps = [...b.M, ...b.E].filter(x => !checked(t, x.id));
  if (!RUN.steps.length) { alert("今天的任务已经全部完成了 🎉"); return; }
  RUN.on = true; RUN.i = 0; runEnter();
}
function runEnter() {
  const b = RUN.steps[RUN.i]; RUN.st = Date.now();
  if (b.go) go(...b.go); else go("task");
}
function runNext() {
  const b = RUN.steps[RUN.i], t = today();
  (S.checks[t] = S.checks[t] || {})[b.id] = true; save();
  RUN.i++;
  if (RUN.i >= RUN.steps.length) { RUN.on = false; go("today"); alert("🎉 今天的训练全部完成！好好休息，明天继续。"); return; }
  runEnter();
}
function runBar() {
  if (!RUN.on) return "";
  const b = RUN.steps[RUN.i]; if (!b) return "";
  return `<div class="runbar"><div><b>步骤 ${RUN.i + 1}/${RUN.steps.length}</b> · ${esc(b.t)}<br><span class="muted">建议 ${b.min} 分钟 · 计时 <b id="runclock">${fmtClock(b)}</b></span></div>
  <div><button class="sm" data-run="next">完成 → 下一步</button> <button class="sm2" data-run="exit">退出</button></div></div>`;
}
function fmtClock(b) {
  const el = Math.floor((Date.now() - RUN.st) / 1000), rem = b.min * 60 - el, a = Math.abs(rem);
  return (rem < 0 ? "超时 " : "剩 ") + Math.floor(a / 60) + ":" + String(a % 60).padStart(2, "0");
}
setInterval(() => { if (!RUN.on) return; const c = document.getElementById("runclock"), b = RUN.steps[RUN.i]; if (c && b) c.textContent = fmtClock(b); }, 1000);
function vTask() {
  const b = RUN.on ? RUN.steps[RUN.i] : null;
  if (!b) return `<div class="card2"><p>没有进行中的任务。</p><button class="big" data-go='["today"]'>回到今日计划</button></div>`;
  return `<h1>${esc(b.t)}</h1><div class="card2"><p style="font-size:18px;line-height:1.8">${esc(b.d)}</p><p class="muted">这一项不需要打开页面：按说明做完，再点上面的“完成 → 下一步”。</p></div>`;
}

/* ============ 学习方法说明 ============ */
function methodCard() {
  return `<div class="card2"><h2>为什么这样学</h2>
  <ol class="method">
   <li><b>先听懂，再开口。</b>语言研究最一致的结论：能听懂的大量输入是进步的发动机。所以每天最长的一段是“精听”：一段你能听懂 80–90% 的对话，反复吃透。</li>
   <li><b>耳朵先于嘴巴。</b>发音不准，根源常是听不出差别。听辨训练用 5 个不同的声音反复练最容易混的词（ship / sheep），再去练嘴。</li>
   <li><b>用“想出来”代替“看出来”。</b>单词卡刚学时只看词、听音；熟了以后自动变成填空、中译英，必须自己回想，记忆才牢。</li>
   <li><b>跟读 + 听写。</b>跟读练节奏和重音；听写暴露“你以为听懂了其实没有”的地方，是提升听力最快的办法之一。</li>
   <li><b>间隔复习。</b>卡片按遗忘规律安排；每晚再盲听一遍昨天的对话。</li>
   <li><b>输出 + 反馈。</b>每天用学到的句子造自己的句子；每周把写的句子发给 Claude 批改，错误才会被纠正。</li>
   <li><b>少做选择。</b>点“开始今日训练”，系统按顺序带你做完，不用想下一步干什么。</li>
  </ol><p class="muted">现实预期：从零基础到能和客户顺畅沟通，进步是“听懂 → 能说短句 → 能说段落”的过程。头 2–3 个月会感觉慢，之后会明显加速。坚持每天做，比一次做很多更重要。</p></div>`;
}

/* ============ 事件 ============ */
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const D = b.dataset;
  if (D.run) { if (D.run === "start") startRun(); else if (D.run === "next") runNext(); else if (D.run === "exit") { RUN.on = false; stopAll(); go("today"); } return; }
  if (D.hvc !== undefined) return hvChoose(+D.hvc);
  if (D.hva) {
    if (D.hva === "replay") hvPlay(); else if (D.hva === "both") hvBoth();
    else if (D.hva === "next") hvAdvance(); else if (D.hva === "again") { hvReset(); render(); }
    return;
  }
  if (!D.lb) return;
  const [cmd, a1, a2] = D.lb.split(":");
  if (cmd === "open") { LB.i = +a1; LB.step = "blind"; LB.li = 0; LB.sh = null; LB.dc = null; LB.shAcc = []; stopAll(); render(); window.scrollTo(0, 0); }
  else if (cmd === "list") { LB.i = null; stopAll(); render(); }
  else if (cmd === "step") { LB.step = a1; LB.li = 0; LB.sh = null; if (a1 === "dict") LB.dc = null; stopAll(); render(); window.scrollTo(0, 0); }
  else if (cmd === "playall") lbPlayAll(LB.i, +a1 || 1);
  else if (cmd === "stop") { stopAll(); mark(-1); }
  else if (cmd === "line") lbPlayLine(LB.i, +a1, +a2 || 1);
  else if (cmd === "zh") { LB.zh = !LB.zh; render(); }
  else if (cmd === "next") { LB.li++; LB.sh = null; stopAll(); render(); setTimeout(() => lbPlayLine(LB.i, LB.li, 1), 150); }
  else if (cmd === "prev") { LB.li = Math.max(0, LB.li - 1); LB.sh = null; stopAll(); render(); }
  else if (cmd === "shadow") {
    const li = LB.li, d = DATA.dialogues[LB.i]; stopAll();
    asrOnce(st => {
      if (st === "preparing" || st === "listening") LB.sh = st;
      else if (st.err) LB.sh = { err: st.err };
      else { const s = score(d.lines[li][1], st.text); LB.sh = { acc: s.acc, s, text: st.text }; LB.shAcc[li] = Math.max(LB.shAcc[li] || 0, s.acc); }
      if (LB.step === "shadow" && LB.li === li) render();
    });
  }
  else if (cmd === "dline") { const D2 = LB.dc; lbPlayLine(LB.i, D2.order[D2.pos], +a1 || 1); }
  else if (cmd === "dcheck") {
    const D2 = LB.dc, d = DATA.dialogues[LB.i], li = D2.order[D2.pos], typed = (document.getElementById("dcin").value || "").trim();
    const s = score(d.lines[li][1], typed); D2.res = { acc: s.acc, s, typed }; D2.acc[D2.pos] = s.acc; render();
  }
  else if (cmd === "dnext") {
    const D2 = LB.dc; D2.pos++; D2.res = null;
    if (D2.pos >= D2.order.length) {
      D2.finished = true; const avg = Math.round(D2.acc.reduce((x, y) => x + y, 0) / D2.acc.length);
      const sh = LB.shAcc.filter(x => x !== undefined); S.lab[LB.i] = { done: true, date: today(), dict: avg, sh: sh.length ? Math.round(sh.reduce((x, y) => x + y, 0) / sh.length) : null }; save();
    } else setTimeout(() => lbPlayLine(LB.i, D2.order[D2.pos], 1), 150);
    render();
  }
  else if (cmd === "redo") { LB.dc = null; render(); }
});
