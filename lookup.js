"use strict";
/* ---------- 点词查询：点击任意英文单词 → 发音 + 中文详解；拖选一句话 → 翻译整句 ---------- */

// 常用功能词：中文释义 + 详细讲解（离线，立刻显示）
const FUNC = {
  "a": ["一个", "不定冠词，用在<b>可数名词单数</b>前，表示“一个/某一个”。后面单词发音以辅音开头用 a：a part、a drawing。"],
  "an": ["一个", "和 a 一样，但用在<b>元音音素开头</b>的词前：an order、an hour（h 不发音，所以用 an）。"],
  "the": ["这个；那个（特指）", "定冠词，指说话双方都知道的那个：Please send <b>the</b> drawing（那张我们谈过的图纸）。独一无二的东西也用 the：the sun。"],
  "to": ["到；去；为了；（不定式标志）", "三种常见用法：①方向：go <b>to</b> China；②to + 动词原形（不定式）：I want <b>to</b> ask；③对象：send it <b>to</b> me。"],
  "of": ["…的", "表示所属或组成：the price <b>of</b> the part（零件的价格），a box <b>of</b> screws（一盒螺丝）。"],
  "in": ["在…里；在（月份/年/国家）", "大范围用 in：<b>in</b> China、<b>in</b> May、<b>in</b> 2026；还表示“在…之内”：<b>in</b> ten days（十天后/十天内）。"],
  "on": ["在…上；在（某一天）", "<b>on</b> Monday、<b>on</b> the table（表面接触）。<b>on</b> time = 准时。"],
  "at": ["在（具体点）", "具体时间和地点：<b>at</b> 8:00、<b>at</b> the factory、<b>at</b> the port。"],
  "for": ["为了；给；（持续）", "①目的/对象：This is <b>for</b> you；②时间长度：<b>for</b> ten days（持续十天）；③for example（例如）。"],
  "with": ["用；和…一起；带有", "<b>with</b> steel（用钢）、<b>with</b> you（和你）、a part <b>with</b> a hole（带孔的零件）。"],
  "from": ["来自；从", "起点或来源：I am <b>from</b> China；<b>from</b> Monday to Friday（从周一到周五）。"],
  "by": ["通过；在…之前；乘（交通工具）", "<b>by</b> express（用快递）；<b>by</b> Friday（最晚周五前）；<b>by</b> sea（海运）。"],
  "and": ["和；并且", "连接并列的词或句子：steel <b>and</b> aluminum。"],
  "but": ["但是", "表示转折：It is good, <b>but</b> expensive（好，但是贵）。"],
  "or": ["或者", "表示选择：air <b>or</b> sea?（空运还是海运？）"],
  "if": ["如果", "条件句：<b>If</b> you order 500 pieces, the price will be lower。if 从句用现在时，主句用 will。"],
  "because": ["因为", "引出原因：The price is high <b>because</b> the material is expensive。注意中文“因为…所以…”，英语里 because 和 so 不能同时用。"],
  "so": ["所以；那么；很", "①结果：It is hard, <b>so</b> it takes time；②程度：so good（那么好）。"],
  "that": ["那个；引导从句的“that”", "①指示：<b>that</b> is too expensive（那个太贵了）；②引导从句：I think <b>that</b> it is OK（可省略）。"],
  "this": ["这个", "指近处或刚提到的：<b>This</b> is a sample（这是个样品）。复数是 these。"],
  "these": ["这些", "this 的复数：<b>These</b> are the parts."],
  "those": ["那些", "that 的复数：<b>Those</b> parts are ready."],
  "it": ["它", "指代事物：Where is the sample? <b>It</b> is on the table。也可作形式主语：<b>It</b> takes ten days。"],
  "i": ["我", "第一人称单数主语，永远大写：<b>I</b> work in a factory。"],
  "you": ["你；你们", "第二人称，单复数同形：Do <b>you</b> have a drawing?"],
  "he": ["他", "第三人称男性主语；动词要加 s：<b>He</b> works here。"],
  "she": ["她", "第三人称女性主语；动词要加 s：<b>She</b> checks the parts。"],
  "we": ["我们", "<b>We</b> make metal parts。"],
  "they": ["他们；它们", "<b>They</b> need ten parts。动词不加 s。"],
  "me": ["我（宾格）", "作宾语：Send it to <b>me</b>；Call <b>me</b>。"],
  "him": ["他（宾格）", "作宾语：Ask <b>him</b>。"],
  "her": ["她（宾格）；她的", "Ask <b>her</b>（宾格）；<b>her</b> name（物主）。"],
  "us": ["我们（宾格）", "Send <b>us</b> the file。"],
  "them": ["他们（宾格）", "Tell <b>them</b>。"],
  "my": ["我的", "<b>my</b> company（后面接名词）。"],
  "your": ["你的；你们的", "<b>your</b> drawing。"],
  "his": ["他的", "<b>his</b> order。"],
  "our": ["我们的", "<b>our</b> factory。"],
  "their": ["他们的", "<b>their</b> price。"],
  "its": ["它的", "<b>its</b> size（注意没有撇号；it's = it is）。"],
  "what": ["什么", "疑问词：<b>What</b> is the material? 也可以说 What time / What size。"],
  "where": ["哪里", "<b>Where</b> is your factory?"],
  "when": ["什么时候；当…时", "<b>When</b> do you need it? / Call me <b>when</b> you are ready."],
  "who": ["谁", "<b>Who</b> is the buyer?"],
  "why": ["为什么", "<b>Why</b> is the price different?"],
  "how": ["怎样；多么", "<b>How</b> are you? / <b>How</b> many（多少个）/ <b>How</b> much（多少钱）/ <b>How</b> long（多久）。"],
  "which": ["哪一个", "在有限选择中问：<b>Which</b> material do you prefer?"],
  "can": ["能；可以", "情态动词，后面接动词原形，没有人称变化：We <b>can</b> make it。否定 cannot / can't。"],
  "could": ["能；可以（更礼貌）", "<b>Could</b> you send the file? 比 Can you 更礼貌，常用于请求。也是 can 的过去式。"],
  "will": ["将；会", "表示将来或承诺：I <b>will</b> send it tomorrow。否定 won't。"],
  "would": ["会；愿意（更礼貌）", "I <b>would</b> like a quotation（我想要一份报价）。<b>Would</b> you like…? 是礼貌的邀请。"],
  "should": ["应该", "<b>You should</b> check the drawing（你应该检查图纸）。"],
  "must": ["必须", "<b>must</b> + 动词原形，语气强：You <b>must</b> wear gloves。"],
  "may": ["可以；可能", "<b>May</b> I ask a question?（我可以问个问题吗？）也表示可能：It <b>may</b> rain。"],
  "not": ["不；没有", "否定词，放在助动词/be 后面：do <b>not</b> / is <b>not</b>。缩写 n't。"],
  "no": ["不；没有；无", "①回答：No, thank you；②修饰名词：<b>no</b> problem（没问题）。"],
  "yes": ["是；对", "肯定回答：<b>Yes</b>, we can。"],
  "do": ["做；（助动词）", "①实义动词：<b>do</b> the work；②助动词：用来构成一般现在时的否定和疑问：<b>Do</b> you need a sample? I <b>do</b> not know。主语是 I/you/we/they 用 do。"],
  "does": ["（助动词）do 的第三人称单数", "主语是 he/she/it/单数名词时，疑问和否定用 does：<b>Does</b> he work here? She <b>does</b> not work on Sunday。注意用了 does，后面的动词<b>不再加 s</b>。"],
  "did": ["（助动词）do 的过去式", "一般过去时的疑问和否定：<b>Did</b> you receive the sample? I <b>did</b> not receive it。后面动词用原形。"],
  "don't": ["do not 的缩写", "否定助动词：We <b>don't</b> make plastic parts。后面接动词原形。"],
  "doesn't": ["does not 的缩写", "第三人称单数的否定：She <b>doesn't</b> work on Sunday。后面动词原形，不加 s。"],
  "didn't": ["did not 的缩写", "过去时否定：I <b>didn't</b> get your email。"],
  "can't": ["cannot 的缩写", "不能：We <b>can't</b> make this tolerance。"],
  "won't": ["will not 的缩写", "将不会：We <b>won't</b> change the price。"],
  "isn't": ["is not 的缩写", "The part <b>isn't</b> steel。"],
  "aren't": ["are not 的缩写", "They <b>aren't</b> ready。"],
  "i'm": ["I am 的缩写", "<b>I'm</b> a machinist。"],
  "it's": ["it is / it has 的缩写", "<b>It's</b> ready（它好了）。注意 its（它的）没有撇号。"],
  "he's": ["he is / he has 的缩写", "<b>He's</b> the buyer。"],
  "she's": ["she is / she has 的缩写", "<b>She's</b> in the office。"],
  "we're": ["we are 的缩写", "<b>We're</b> in China。"],
  "they're": ["they are 的缩写", "<b>They're</b> ready。"],
  "you're": ["you are 的缩写", "<b>You're</b> welcome。"],
  "that's": ["that is 的缩写", "<b>That's</b> right。"],
  "what's": ["what is 的缩写", "<b>What's</b> the price?"],
  "let's": ["let us 的缩写", "<b>Let's</b> start（我们开始吧）。"],
  "am": ["是（I 的 be 动词）", "只和 I 连用：I <b>am</b> Li。"],
  "is": ["是（单数）", "he/she/it/单数名词用 is：The part <b>is</b> aluminum。"],
  "are": ["是（复数/你）", "you/we/they/复数名词用 are：We <b>are</b> in China。"],
  "was": ["是（过去，单数）", "am/is 的过去式：The part <b>was</b> late。"],
  "were": ["是（过去，复数）", "are 的过去式：They <b>were</b> ready。"],
  "be": ["是；成为", "be 动词原形，用在 will/can/to 之后：It will <b>be</b> ready。"],
  "been": ["是（完成时）", "have/has + <b>been</b>：We have <b>been</b> here for ten years。"],
  "have": ["有；已经（完成时助动词）", "①有：We <b>have</b> ten machines；②have + 过去分词构成现在完成时：I <b>have</b> sent the file。"],
  "has": ["有（第三人称单数）", "he/she/it 用 has：He <b>has</b> a drawing。"],
  "had": ["有（过去式）", "have 的过去式：We <b>had</b> a problem。"],
  "there": ["那里；（存在）", "<b>There is</b> a burr（有毛刺）/ <b>There are</b> ten parts。表示“某处存在…”。"],
  "some": ["一些", "用于肯定句：I need <b>some</b> help。疑问和否定句常用 any。"],
  "any": ["任何；一些", "用于疑问和否定：Do you have <b>any</b> questions? We don't have <b>any</b> stock。"],
  "much": ["许多（不可数）", "用于否定和疑问：How <b>much</b> is it? We don't have <b>much</b> time。"],
  "many": ["许多（可数）", "How <b>many</b> pieces? We have <b>many</b> machines。"],
  "very": ["很；非常", "加强形容词/副词：<b>very</b> good。"],
  "too": ["太；也", "①太…：<b>too</b> expensive（太贵）；②也：Me <b>too</b>。"],
  "also": ["也", "We <b>also</b> make plastic parts（放在动词前/be后）。"],
  "just": ["刚刚；只是", "I have <b>just</b> sent it（我刚发出）。"],
  "then": ["然后；那么", "First cut, <b>then</b> polish。"],
  "than": ["比", "比较级后用：Aluminum is lighter <b>than</b> steel。"],
  "about": ["关于；大约", "①关于：a question <b>about</b> the price；②大约：<b>about</b> ten days。"],
  "as": ["作为；像；当…时", "<b>as</b> soon as possible（尽快）；as requested（按要求）。"],
  "up": ["向上", "常构成短语动词：set <b>up</b>（设置）、follow <b>up</b>（跟进）。"],
  "out": ["出去；外面", "常构成短语动词：run <b>out</b> of（用完）、carry <b>out</b>（执行）。"],
  "into": ["进入；变成", "Put the part <b>into</b> the box。"],
  "after": ["在…之后", "<b>after</b> inspection（检验后）。"],
  "before": ["在…之前", "<b>before</b> shipping（发货前）。"],
  "please": ["请", "放在请求句里更礼貌：<b>Please</b> send me the file。"],
  "thank": ["感谢", "Thank you / Thanks。<b>Thank</b> you for your email（谢谢你的邮件）。"],
  "thanks": ["谢谢", "比 thank you 随意：<b>Thanks</b> for your help。"],
  "hello": ["你好", "通用问候，电话里也说 Hello。"],
  "hi": ["嗨；你好", "比 hello 随意，邮件开头可用 Hi Anna,。"]
};

const IRREG = { went: "go", gone: "go", made: "make", sent: "send", got: "get", gave: "give", given: "give", took: "take", taken: "take", saw: "see", seen: "see", bought: "buy", told: "tell", knew: "know", known: "know", thought: "think", paid: "pay", came: "come", wrote: "write", written: "write", did: "do", done: "do", men: "man", children: "child", better: "good", best: "good", worse: "bad", worst: "bad", ran: "run", found: "find", kept: "keep", left: "leave", met: "meet", built: "build", cut: "cut", lost: "lose", brought: "bring", began: "begin", begun: "begin", broke: "break", broken: "break", chose: "choose", chosen: "choose", spoke: "speak", spoken: "speak", understood: "understand", held: "hold", sold: "sell", fed: "feed", felt: "feel", heard: "hear", said: "say", stood: "stand", taught: "teach" };

let DC = (() => { try { return JSON.parse(localStorage.getItem("eng_dict_v1")) || {}; } catch (e) { return {}; } })();
const dcSave = () => { try { localStorage.setItem("eng_dict_v1", JSON.stringify(DC)); } catch (e) {} };

function lemmas(w) {
  const o = [w];
  if (IRREG[w]) o.push(IRREG[w]);
  if (/ies$/.test(w)) o.push(w.slice(0, -3) + "y");
  if (/es$/.test(w)) o.push(w.slice(0, -2));
  if (/s$/.test(w)) o.push(w.slice(0, -1));
  if (/ed$/.test(w)) { o.push(w.slice(0, -2), w.slice(0, -1)); if (/(.)\1ed$/.test(w)) o.push(w.slice(0, -3)); if (/ied$/.test(w)) o.push(w.slice(0, -3) + "y"); }
  if (/ing$/.test(w)) { o.push(w.slice(0, -3), w.slice(0, -3) + "e"); if (/(.)\1ing$/.test(w)) o.push(w.slice(0, -4)); }
  if (/ly$/.test(w)) o.push(w.slice(0, -2));
  if (/er$/.test(w)) o.push(w.slice(0, -2), w.slice(0, -1));
  if (/est$/.test(w)) o.push(w.slice(0, -3), w.slice(0, -2));
  return [...new Set(o.filter(x => x.length > 1 || x === "a" || x === "i"))];
}
function localLookup(w) {
  const idx = {};
  Object.values(CARD).forEach(c => { const k = c.en.toLowerCase(); if (!idx[k]) idx[k] = c; });
  const cands = lemmas(w);
  let func = null, card = null, base = w;
  for (const c of cands) { if (!func && FUNC[c]) { func = FUNC[c]; if (c !== w) base = c; } if (!card && idx[c]) { card = idx[c]; if (c !== w) base = c; } }
  if (FUNC[w]) { func = FUNC[w]; base = w; }
  if (idx[w]) { card = idx[w]; base = w; }
  return { func, card, base };
}

/* ---- 网络查询（免费，无需账号）---- */
async function getJSON(url) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 7000);
  try { const r = await fetch(url, { signal: ac.signal }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; } finally { clearTimeout(t); }
}
const hasZh = s => /[一-龥]/.test(s || "");
async function mmTranslate(q) {
  const j = await getJSON("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(q) + "&langpair=en|zh-CN");
  if (!j || !j.responseData) return [];
  const out = [];
  const add = s => { if (s && hasZh(s) && !/MYMEMORY|[*#<>]/i.test(s) && s.length <= 40 && !out.includes(s.trim())) out.push(s.trim()); };
  add(j.responseData.translatedText);
  (j.matches || []).forEach(m => add(m.translation));
  return out.slice(0, 4);
}
// ARPAbet（Datamuse 提供的读音）→ 国际音标
const ARPA = { AA: "ɑː", AE: "æ", AH: "ʌ", AO: "ɔː", AW: "aʊ", AY: "aɪ", B: "b", CH: "tʃ", D: "d", DH: "ð", EH: "e", ER: "ɜːr", EY: "eɪ", F: "f", G: "g", HH: "h", IH: "ɪ", IY: "iː", JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", OW: "oʊ", OY: "ɔɪ", P: "p", R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", UH: "ʊ", UW: "uː", V: "v", W: "w", Y: "j", Z: "z", ZH: "ʒ" };
function arpaToIpa(str) {
  const ph = str.trim().split(/\s+/).map(p => ({ b: p.replace(/\d/, ""), s: (p.match(/\d/) || [""])[0] }));
  const isV = p => /^(AA|AE|AH|AO|AW|AY|EH|ER|EY|IH|IY|OW|OY|UH|UW)$/.test(p.b);
  const out = ph.map(p => (p.b === "AH" && p.s === "0") ? "ə" : (p.b === "ER" && p.s === "0") ? "ɚ" : (ARPA[p.b] || ""));
  const marks = {};
  ph.forEach((p, i) => {
    if (!isV(p) || (p.s !== "1" && p.s !== "2")) return;
    let k = i; while (k > 0 && !isV(ph[k - 1])) k--;
    const cl = i - k; let take = Math.min(cl, 2);
    if (cl >= 3 && ph[i - 3].b === "S") take = 3;
    marks[i - take] = p.s === "1" ? "ˈ" : "ˌ";
  });
  return "/" + out.map((s, i) => (marks[i] || "") + s).join("") + "/";
}
const stripHtml = s => String(s || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "").replace(/\.mw-parser-output[^{]*\{[^}]*\}/g, "").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
const FORM_RE = /\b(?:past tense|past participle|simple past|present participle|third-person singular|plural|comparative|superlative|gerund|alternative form|participle)[^.]*? of ([a-z-]+)\s*\.?$/i;
async function netWord(w, base) {
  const key = "w3:" + base;
  if (DC[key]) return DC[key];
  const res = { ipa: "", defs: [], zh: [] };
  const [wk, dm, zh] = await Promise.all([
    getJSON("https://en.wiktionary.org/api/rest_v1/page/definition/" + encodeURIComponent(base)),
    getJSON("https://api.datamuse.com/words?sp=" + encodeURIComponent(base) + "&md=r&max=1"),
    mmTranslate(base)
  ]);
  res.zh = zh;
  if (Array.isArray(dm) && dm[0] && dm[0].word === base) { const t = (dm[0].tags || []).find(x => /^pron:/.test(x)); if (t) res.ipa = arpaToIpa(t.slice(5)); }
  if (wk && wk.en) wk.en.slice(0, 3).forEach(m => {
    const d = (m.definitions || []).find(x => stripHtml(x.definition).length > 3); if (!d) return;
    res.defs.push({ pos: (m.partOfSpeech || "").toLowerCase(), en: stripHtml(d.definition), ex: stripHtml((d.examples || [])[0] || "") });
  });
  const fm = res.defs[0] && FORM_RE.exec(res.defs[0].en);
  if (fm && fm[1].toLowerCase() !== base) {            // 变形词（过去式/复数等）：用原形的释义
    const r2 = await netWord(fm[1].toLowerCase(), fm[1].toLowerCase());
    const merged = { ipa: res.ipa || r2.ipa, defs: r2.defs, zh: r2.zh, form: res.defs[0].en, lemma: fm[1].toLowerCase() };
    if (merged.ipa || merged.defs.length || merged.zh.length) { DC[key] = merged; dcSave(); }
    return merged;
  }
  if (res.defs[0]) { const t = await mmTranslate(res.defs[0].en); if (t[0]) res.defs[0].zh = t[0]; }
  if (res.ipa || res.defs.length || res.zh.length) { DC[key] = res; dcSave(); }
  return res;
}

/* ---- 面板 ---- */
let dictToken = 0;
function sheet() {
  let el = document.getElementById("dict");
  if (!el) { el = document.createElement("div"); el.id = "dict"; el.className = "dictsheet"; document.body.appendChild(el); }
  return el;
}
const POS = { noun: "名词", verb: "动词", adjective: "形容词", adverb: "副词", preposition: "介词", conjunction: "连词", pronoun: "代词", interjection: "感叹词", exclamation: "感叹词" };
function paint(st) {
  const el = sheet(); el.style.display = "block";
  const zhLines = st.zh && st.zh.length ? st.zh : [];
  el.innerHTML = `<div class="dhead"><div><b class="dw">${esc(st.word)}</b> ${st.ipa ? `<span class="dipa">${esc(st.ipa)}</span>` : ""}
    ${st.base && st.base !== st.word.toLowerCase() ? `<span class="muted">（原形：${esc(st.base)}）</span>` : ""}</div>
    <div><button class="ic" data-dsay="1">🔊</button><button class="ic" data-dsay="slow">🐢</button><button class="ic" data-dclose="1">✕</button></div></div>
   ${zhLines.length ? `<div class="dzh">${zhLines.map(esc).join("；")}</div>` : (st.loading ? `<div class="muted">查询中…</div>` : "")}
   ${st.form ? `<div class="ddetail">📌 这是变形词：${esc(st.form)}。上面的中文是原形 <b>${esc(st.lemma)}</b> 的意思。</div>` : ""}
   ${st.detail ? `<div class="ddetail">${st.detail}</div>` : ""}
   ${st.ex ? `<div class="dex">例句：${esc(st.ex)} <button class="ic" data-dsayex="1">🔊</button></div>` : ""}
   ${(st.defs || []).map(d => `<div class="dden"><span class="tag">${esc(POS[d.pos] || d.pos || "")}</span> ${esc(d.en)}${d.zh ? `<br><span class="muted">≈ ${esc(d.zh)}（机器翻译，仅供参考）</span>` : ""}${d.ex ? `<br><i class="muted">${esc(d.ex)}</i>` : ""}</div>`).join("")}
   ${st.phrase ? `<p class="muted">${st.zh && st.zh.length ? "机器翻译，仅供参考。" : st.loading ? "" : "没有查到翻译，请检查网络。"}</p>` : ""}
   ${st.offline ? `<p class="muted">当前离线或查询失败，只显示本地内容。</p>` : ""}
   <div class="actrow">${st.addable ? `<button data-dadd="1">＋ 加入单词卡</button>` : ""}</div>`;
  el.onclick = ev => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.dclose) closeDict();
    else if (b.dataset.dsay) say(st.word, b.dataset.dsay === "slow" ? 0.55 : 0.9);
    else if (b.dataset.dsayex) say(st.ex, 0.9);
    else if (b.dataset.dadd) {
      const zh = (st.zh && st.zh[0]) || ""; if (!zh) return alert("还没有中文释义，暂时不能加入。");
      addCustom(st.base || st.word.toLowerCase(), zh, st.ex || ""); b.textContent = "✓ 已加入单词卡"; b.disabled = true;
    }
  };
}
function closeDict() { const el = document.getElementById("dict"); if (el) el.style.display = "none"; dictToken++; }

async function openWord(raw) {
  const w = raw.toLowerCase(), token = ++dictToken;
  const L = localLookup(w);
  const st = { word: raw, base: L.base, zh: [], detail: L.func ? L.func[1] : "", ex: L.card ? L.card.ex : "", defs: [], loading: true, addable: false };
  if (L.func) st.zh.push(L.func[0]);
  if (L.card && L.card.zh && !st.zh.length) st.zh.push(L.card.zh);
  else if (L.card && L.card.zh) st.detail += `<div class="muted">本系统词库：${esc(L.card.zh)}</div>`;
  paint(st); say(raw, 0.9);
  if (!navigator.onLine) { st.loading = false; st.offline = true; paint(st); return; }
  const net = await netWord(w, L.base);
  if (token !== dictToken) return;
  st.loading = false; st.ipa = net.ipa; st.defs = net.defs || []; st.form = net.form; st.lemma = net.lemma;
  if (!st.zh.length) st.zh = net.zh || [];
  st.addable = !L.card && !L.func && st.zh.length > 0;
  st.offline = !net.ipa && !net.defs.length && !(net.zh || []).length && !st.zh.length;
  paint(st);
}
async function openPhrase(text) {
  const token = ++dictToken;
  const st = { word: text, zh: [], loading: true, phrase: true, defs: [] };
  paint(st); say(text, 0.9);
  const key = "p:" + text.toLowerCase();
  let zh = DC[key];
  if (!zh) { zh = await mmTranslate(text); if (zh.length) { DC[key] = zh; dcSave(); } }
  if (token !== dictToken) return;
  st.zh = zh; st.loading = false; paint(st);
}

/* ---- 在点击位置找到单词 ---- */
function wordAt(x, y) {
  let r = null;
  if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
  else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); r.collapse(true); } }
  if (!r || r.startContainer.nodeType !== 3) return null;
  const t = r.startContainer.textContent; let i = r.startOffset;
  const isW = ch => /[A-Za-z']/.test(ch || "");
  if (!isW(t[i]) && isW(t[i - 1])) i--;
  if (!isW(t[i])) return null;
  let a = i, b = i;
  while (a > 0 && isW(t[a - 1])) a--;
  while (b < t.length - 1 && isW(t[b + 1])) b++;
  const w = t.slice(a, b + 1).replace(/^'+|'+$/g, "");
  if (!/[A-Za-z]/.test(w)) return null;
  const wr = document.createRange(); wr.setStart(r.startContainer, a); wr.setEnd(r.startContainer, b + 1);
  const hit = [...wr.getClientRects()].some(q => x >= q.left - 2 && x <= q.right + 2 && y >= q.top - 2 && y <= q.bottom + 2);
  return hit ? w : null;
}

document.addEventListener("click", e => {
  if (e.target.closest("#dict, nav")) return;
  if (e.target.closest("button, input, textarea, select, summary, a, label")) return;
  if (!e.target.closest("#view")) return;
  const sel = window.getSelection(), st = sel && !sel.isCollapsed ? sel.toString().trim() : "";
  if (st && /[A-Za-z]/.test(st) && st.length <= 120 && /\s/.test(st)) return openPhrase(st);
  const w = wordAt(e.clientX, e.clientY);
  if (w) openWord(w); else closeDict();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeDict(); });
document.addEventListener("DOMContentLoaded", () => {
  try {
    if (!localStorage.getItem("eng_hint_dict")) {
      localStorage.setItem("eng_hint_dict", "1");
      const t = document.createElement("div"); t.className = "toast";
      t.textContent = "💡 点击任意英文单词：听发音 + 看中文详解。拖选一句话可以翻译整句。";
      document.body.appendChild(t); setTimeout(() => t.remove(), 9000); t.onclick = () => t.remove();
    }
  } catch (e) {}
});
