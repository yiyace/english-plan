"use strict";
/* ---------- 发音诊所（依赖 app.js 里的 S, Q, SR, say, score, wordsHtml, esc, render, dayIdx, voice） ---------- */
const CL = { mode: "pairs", i: (S.clI || 0), res: null };
const REC = { mr: null, chunks: [], url: null, on: false };

function itemFor(w) {
  for (const p of DATA.pairs) {
    if (p[0] === w) return { w, other: p[1], tip: p[2], tag: p[3] };
    if (p[1] === w) return { w, other: p[0], tip: p[2], tag: p[3] };
  }
  return { w };
}
function clItems() {
  if (CL.mode === "weak") return Object.entries(S.pron).filter(([k, v]) => v.n >= 2 && v.ok / v.n < 0.7).map(([k]) => itemFor(k));
  if (CL.mode === "sent") return Q.phrases.concat(S.custom.filter(c => /\s/.test(c.en))).map(p => ({ w: p.en, zh: p.zh, sent: true }));
  const out = [];
  DATA.pairs.forEach(p => {
    out.push({ w: p[0], other: p[1], tip: p[2], tag: p[3] });
    out.push({ w: p[1], other: p[0], tip: p[2], tag: p[3] });
  });
  return out;
}
const clCur = () => { const it = clItems(); return it.length ? it[CL.i % it.length] : null; };

function hintFor(w) {
  const h = [], l = w.toLowerCase();
  if (/th/.test(l)) h.push("th：舌尖轻放在上下齿之间吹气，不要读成 s / z / d。");
  if (/v/.test(l)) h.push("v：上齿轻咬下唇，声带振动，不要读成 w。");
  if (/^w|[aeiou]w/.test(l)) h.push("w：嘴唇圆起来，不要碰牙。");
  if (/r/.test(l)) h.push("r：舌头向后卷但不碰上颚，嘴唇略圆；不要读成 l 或中文“日”。");
  if (/[bdgkpt]$/.test(l)) h.push("词尾辅音要轻轻收住，不要多加“特 / 的 / 克”这样的元音。");
  if (/ng$/.test(l)) h.push("ng：舌后部抬起，鼻腔出气，不要加 g 的音。");
  return h.slice(0, 2);
}

function vClinic() {
  const ms = [["hvpt", "听辨训练"], ["pairs", "易混词"], ["weak", "我的弱项"], ["sent", "句子"]];
  const tabs = `<div class="sub">${ms.map(m => `<button class="${CL.mode === m[0] ? "on" : ""}" data-clmode="${m[0]}">${m[1]}</button>`).join("")}</div>`;
  const d = dayIdx(), pi = (d - 1) % 44, p = DATA.phonemes[pi];
  const top = `<div class="card2"><b>今日重点音 /${esc(p[0])}/</b> <span class="muted">${esc(p[1])}</span><p class="muted">${esc(p[2])} <button class="sm" data-go='["learn","phonics",${pi}]'>看例词</button></p></div>`;
  if (CL.mode === "hvpt") return `<h1>发音诊所</h1>${tabs}` + vHv();
  const it = clCur();
  if (!it) return `<h1>发音诊所</h1>${tabs}${top}<div class="card2"><p>还没有弱项记录。先在“易混词”里多练几个，错得多的词会自动出现在这里。</p></div>`;
  const total = clItems().length;
  const st = S.pron[it.w] ? `练过 ${S.pron[it.w].n} 次，读对 ${S.pron[it.w].ok} 次` : "还没练过";
  const hint = it.sent ? [] : hintFor(it.w);
  return `<h1>发音诊所 <small>${CL.i % total + 1} / ${total}</small></h1>${tabs}${top}
  <div class="card2 flash"><span class="tag">${esc(it.tag || (it.sent ? "句子" : "单词"))}</span>
   <div class="${it.sent ? "sent" : "bigword"}">${esc(it.w)}</div>
   ${!it.sent && zhOf(it.w) ? `<p class="zhbig">${esc(zhOf(it.w))}</p>` : ""}
   ${it.zh ? `<p class="muted">${esc(it.zh)}</p>` : ""}
   ${it.other ? `<p>容易混淆： <b>${esc(it.other)}</b> <span class="muted">${esc(zhOf(it.other))}</span> <button class="ic" data-say="${esc(it.other)}">🔊</button></p>` : ""}
   ${it.tip ? `<p class="tipbox">💡 ${esc(it.tip)}</p>` : ""}
   ${hint.length ? `<p class="tipbox">${hint.map(esc).join("<br>")}</p>` : ""}
   <div class="actrow"><button data-claction="say">🔊 标准音</button><button data-claction="slow">🐢 慢速</button></div>
   <button class="micbtn ${CL.res === "listening" ? "rec" : CL.res === "preparing" ? "wait" : ""}" data-claction="score">${CL.res === "listening" ? "🎧 现在请说！" : CL.res === "preparing" ? "⏳ 麦克风准备中…先别说" : "🎤 说一遍，看我读得对不对"}</button>
   ${clResHtml(it)}
   <div class="actrow"><button data-claction="rec">${REC.on ? "⏹ 停止录音" : "⏺ 录下我的声音"}</button>${REC.url ? `<button data-claction="cmp">▶ 标准音 → 我的录音</button>` : ""}</div>
   ${REC.url ? `<audio controls src="${REC.url}"></audio>` : ""}
   <p class="muted">${st}</p>
   <div class="actrow"><button data-clnav="-1">← 上一个</button><button data-clnav="1">下一个 →</button></div>
  </div>`;
}

function clResHtml(it) {
  const r = CL.res; if (!r || r === "listening" || r === "preparing") return "";
  if (r.err) {
    const m = r.err === "no-speech" ? "没听到声音，请靠近麦克风再试。"
      : r.err === "unsupported" ? "这个浏览器不支持语音识别。电脑用 Edge / Chrome，iPhone 用 Safari（不要用主屏幕图标打开）。"
      : "识别失败：" + esc(r.err) + "（需要联网，并允许麦克风）";
    return `<p class="warn">${m}</p>`;
  }
  if (r.sent) return `<div class="verdict ${r.acc >= 85 ? "v-ok" : r.acc >= 60 ? "v-near" : "v-bad"}"><b>${r.acc}%</b><div class="passage">${wordsHtml(r.s)}</div><p class="muted">红色词没识别出来：先慢速听，再单独练它们。系统听到的是：${esc(r.heard)}</p></div>`;
  const cls = r.v === "ok" ? "v-ok" : r.v === "near" ? "v-near" : "v-bad";
  const msg = r.v === "ok" ? "✅ 读对了！系统听到的是 “" + esc(r.top) + "”"
    : r.v === "near" ? "⚠ 接近了。系统首先听到 “" + esc(r.top) + "”。再清楚一点。"
    : "❌ 系统听到的是 “" + esc(r.top) + "”，目标是 “" + esc(it.w) + "”。";
  const swap = r.v === "bad" && it.other && r.top === it.other.toLowerCase()
    ? `<p class="tipbox">你把 <b>${esc(it.w)}</b> 读成了 <b>${esc(it.other)}</b>。${esc(it.tip || "")}</p>` : "";
  return `<div class="verdict ${cls}">${msg}${r.conf ? `<br><span class="muted">把握度 ${r.conf}%</span>` : ""}${swap}</div>`;
}

function clAction(a) {
  const it = clCur(); if (!it) return;
  if (a === "say") return say(it.w, 0.9);
  if (a === "slow") return say(it.w, 0.55);
  if (a === "rec") return clRecord();
  if (a === "score") return clScore(it);
  if (a === "cmp") {
    stopAll();
    const after = () => setTimeout(() => { try { new Audio(REC.url).play(); } catch (e) {} }, 300);
    const u = clipFor(it.w);
    if (u) { playClip(u, 1).then(after); return; }
    const ut = new SpeechSynthesisUtterance(it.w); ut.lang = "en-US"; ut.rate = 0.85; if (voice) ut.voice = voice;
    ut.onend = after; speechSynthesis.speak(ut);
  }
}

function clScore(it) {
  if (!SR) { CL.res = { err: "unsupported" }; return render(); }
  speechSynthesis.cancel();
  CL.res = "preparing"; render();
  const r = new SR(); r.lang = "en-US"; r.maxAlternatives = 5; r.interimResults = false; r.continuous = !!it.sent;
  let got = false;
  r.onaudiostart = () => { if (CL.res === "preparing") { CL.res = "listening"; render(); } };
  if (!it.sent) r.onspeechend = () => { try { r.stop(); } catch (e) {} };
  r.onresult = e => {
    got = true;
    if (it.sent) {
      let t = ""; for (const x of e.results) t += x[0].transcript + " ";
      const s = score(it.w, t);
      CL.res = { sent: true, acc: s.acc, s, heard: t.trim() }; clStat(it.w, s.acc >= 85); render();
      try { r.stop(); } catch (er) {} return;
    }
    const alts = Array.from(e.results[0]).map(a => ({ t: a.transcript.trim().toLowerCase().replace(/[^a-z' ]/g, ""), c: a.confidence }));
    if (!alts[0].t) { CL.res = { err: "no-speech" }; render(); return; }
    const target = it.w.toLowerCase();
    const v = alts[0].t === target ? "ok" : alts.some(a => a.t === target) ? "near" : "bad";
    CL.res = { v, top: alts[0].t, conf: alts[0].c ? Math.round(alts[0].c * 100) : 0 };
    clStat(it.w, v === "ok"); render();
  };
  r.onerror = e => { got = true; CL.res = { err: e.error }; render(); };
  r.onend = () => { if (!got && (CL.res === "listening" || CL.res === "preparing")) { CL.res = { err: "no-speech" }; render(); } };
  try { r.start(); } catch (e) { CL.res = { err: "error" }; render(); }
  if (it.sent) setTimeout(() => { try { r.stop(); } catch (e) {} }, 15000);
}
function clStat(w, ok) { const o = S.pron[w] || (S.pron[w] = { n: 0, ok: 0 }); o.n++; if (ok) o.ok++; save(); }

async function clRecord() {
  try {
    if (REC.on && REC.mr) { REC.mr.stop(); return; }
    const st = await navigator.mediaDevices.getUserMedia({ audio: true });
    REC.chunks = []; const mr = new MediaRecorder(st);
    mr.ondataavailable = e => REC.chunks.push(e.data);
    mr.onstop = () => {
      st.getTracks().forEach(t => t.stop());
      if (REC.url) URL.revokeObjectURL(REC.url);
      REC.url = URL.createObjectURL(new Blob(REC.chunks, { type: mr.mimeType })); REC.on = false; render();
    };
    mr.start(); REC.mr = mr; REC.on = true; render();
    setTimeout(() => { if (REC.on) mr.stop(); }, 10000);
  } catch (e) { REC.on = false; alert("无法录音：请允许麦克风权限。iPhone 需要用 https 网址并在 Safari 里打开。"); }
}
