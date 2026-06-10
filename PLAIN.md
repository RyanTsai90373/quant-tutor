# Study Plan: Build a Personal Quant Research Tutor

## Context

You want a side project that's *useful*, *fun*, touches a stack you don't normally use (Python + TS + Docker), and produces "dot-connecting" moments without the burnout of LevelDB. The shape: a standalone web app where you converse with an LLM agent, it finds a quant strategy paper relevant to what you're curious about, teaches you the core idea, runs a backtest on your Taiwan market data (Shioaji), and shows you the results in a chart panel. You then discuss the results and iterate.

This is the product:

```
┌─────────────────────────────────┬──────────────────────────────────┐
│   CHAT                          │   VIZ / REPORT                   │
│   (you ↔ agent)                 │   (charts, tables, paper excerpts)│
└─────────────────────────────────┴──────────────────────────────────┘
```

Audience: one — you. No auth, no multi-user, no public deployment required. The whole point is *your* learning, *your* data, *your* curiosity loop.

**Why this is faster than LevelDB.** You will *not* be hand-coding most of this. The LevelDB clone is a deliberate exercise in typing every line yourself so the systems concepts compound. This project is the opposite: AI scaffolds and implements, you make architectural decisions, read the output, understand each piece, and validate by running. The learning lives in *reading code AI wrote*, *deciding what to ask next*, and *running real backtests on real data*.

That said: don't let AI ship code you don't understand. The discipline below is how you keep the learning real.

---

## What "done" looks like (trunk)

A web app you can run with `docker compose up` that does this end-to-end:

1. You type a curiosity ("I want to understand cross-sectional momentum").
2. Agent asks 1–2 clarifying questions, then proposes a relevant paper (you paste one in MVP; agent searches in stretch).
3. Agent teaches the core idea in 5–10 chat turns with one or two schematic figures on the right.
4. Agent proposes a backtest spec — universe, signal, holding period, cost model — and asks you to approve or edit.
5. Backtest runs on your Taiwan data (TWSE/TPEX bars and/or ticks via Shioaji historical dumps).
6. Right panel fills with equity curve, drawdown, monthly returns heatmap, key stats.
7. You can ask follow-ups ("what if long-only?", "what about TPEX only?") and the agent reruns variants.
8. Session is saved to SQLite; you can revisit it next week.

That's it. Doing this *well* — with backtests you trust and a teaching flow that actually teaches — is a complete project.

---

## The Approach: Tracer-Bullet, AI Pair-Coded

Same philosophy as the LevelDB plan: ratchet a running app forward one capability at a time. The traps to avoid here are different though.

**The two traps for an AI-implemented project:**

1. **"Vibe-coding" — accept whatever AI emits and move on.** You ship a working app you don't understand. When it breaks (and it will break — agents hallucinate strategy details, backtests have look-ahead bugs, charts mislabel axes) you can't debug. The whole project becomes a black box.
2. **"All-at-once" — describe the entire system in one prompt and let AI scaffold the whole thing.** You get 3000 lines of mediocre code that almost works. You can't tell which 200 lines are wrong. You restart.

**Instead: ratchet, just like LevelDB.** Each phase adds *one capability* to the running app. Each phase ends with a thing you can demo and a test you can run. Each phase, you:

- Spec the task in plain English to the AI.
- Let it scaffold.
- **Read the output. For every non-trivial decision, ask AI to justify it.** "Why DuckDB and not SQLite for this?" "Why did you pick this fee model?" "Why is the rebalance loop structured this way?"
- Make the call yourself; tell AI to adjust if you disagree.
- Run it. Validate it. *Then* move on.

**Operating discipline:**

- **Plain-English spec before any code.** Each task below ends with a one-paragraph spec you'd paste into a fresh AI session. Write it yourself before reading AI's first draft of the code.
- **Read every file AI produces, at least once.** No black-box files. If a file is too long to read, it's too long to ship — ask AI to split it.
- **For every external library AI introduces, write down in one sentence what it does** before continuing. (`vectorbt is a vectorized backtesting library that runs strategies as numpy operations rather than event loops.`) If you can't write that sentence, you don't understand the dependency.
- **Validate with running, not reading.** A passing unit test + a chart you can eyeball beats "the code looks right" every time. Backtest bugs hide brilliantly in code that looks right.
- **Predict before peeking — applied to AI's output.** Before opening a file AI wrote, write down in three sentences what you'd expect it to contain. Diff against reality. The gap is where the learning is.

**Working setup:**

```bash
cd ~
mkdir quant-tutor && cd quant-tutor
git init
# move plain.md and STUDY_PLAN.md in:
mv ~/tmp/plain.md ~/tmp/STUDY_PLAN.md .
# scaffold structure as you go; don't pre-create empty dirs
```

---

## Task Format

Every task uses this structure:

> **Spec to give AI:** The one-paragraph prompt you'd hand a fresh AI session. Write this yourself before pasting.
> **What:** One-sentence component description.
> **Why this exists in the system:** The problem it solves.
> **Decisions you make (not AI):** The architectural calls that should not be delegated.
> **Concept primer:** Specific docs/papers/blog posts to read so you actually understand what AI builds.
> **What you'll see at the end:** The concrete artifact / demo.
> **Validation:** What proves it works.
> **Dot-connecting moments to expect:** Where the "oh, that's the same idea as X" feeling shows up.
> **Time estimate (with AI):** Honest range of *your* time.

---

## Phase 0 — Hello loop (half day)

**Capability gained:** A chat box in a browser that streams responses from Claude. No tools, no data, no agent — just the wire.

**Why this phase exists:** Lock in the I/O substrate (FastAPI ↔ React ↔ Anthropic streaming) before any agent or backtest logic touches it. Every later capability plugs into this wire.

### 0.1 — Project scaffold + Anthropic round-trip

- **Spec to give AI:** "Scaffold a Python FastAPI backend and a TypeScript + React + Vite frontend in a monorepo. Backend exposes one POST endpoint `/chat` that accepts `{messages: [...]}` and streams a response from Claude (use the Anthropic Python SDK, model `claude-sonnet-4-6`, with `messages.stream`). Frontend has a single chat panel that posts user input and renders streamed assistant tokens. No tools, no system prompt yet."
- **Decisions you make:**
  - Python package manager: `uv` (fast, modern) vs `poetry` (more conventional). Default `uv`.
  - Frontend: Vite + React + TypeScript. No framework debates.
  - Streaming transport: SSE (simpler) vs WebSocket (bidirectional). **Default SSE** — you only stream server → client in this phase.
- **Concept primer:** Anthropic SDK docs, specifically `messages.stream`. Read the "streaming" example end-to-end. ~15 minutes.
- **What you'll see at the end:** Type "hello," get a streamed response token-by-token. Reload page, history is gone (that's fine for now).
- **Validation:** Manual — type a few prompts.
- **Dot-connecting moments:** SSE is a wire format. Token-by-token streaming is the same idea as your LevelDB log records: a framing layer over a byte stream. You'll see HTTP chunked encoding for the first time as a thing you actually built.
- **Time:** half day.

**Exit Phase 0 when:** the chat works.

---

## Phase 1 — Market data layer (2–3 days)

**Capability gained:** Your Taiwan market data, ingested once and queryable forever via a clean Python function. Independent of the app — you should be able to query bars/ticks from a Jupyter notebook.

**Why this phase exists:** Backtests need data. Pull this out of the critical path early. If your data layer is slow or buggy, every downstream task suffers — and you'll blame the backtest engine instead of the data.

### 1.1 — Shioaji historical ingest

- **Spec to give AI:** "Write a one-shot Python script that uses the Shioaji API to dump historical daily and minute bars for a configurable list of Taiwan symbols (TWSE + TPEX + a few futures contracts) over a configurable date range, into Parquet files partitioned by symbol and year. Also dump transaction tick data for the most recent N trading days, partitioned by symbol and date. Use the Shioaji skill in this Claude Code session for the API specifics."
- **Decisions you make:**
  - Storage format: **Parquet** (columnar, fast scans, plays well with DuckDB). Don't accept CSV or pickle.
  - Partitioning: by symbol + year for bars; by symbol + date for ticks. This is cache-friendly for typical backtest scan patterns.
  - Universe: start small — TW50 constituents + a couple of futures. You can widen later.
- **Concept primer:** Skim Parquet's columnar layout (any "what is Parquet" intro, ~10 min). The "columnar = read only the columns you need" idea is *exactly* the CSAPP memory-hierarchy lesson applied to disk.
- **What you'll see at the end:** A `data/` directory of Parquet files, total size in the low GBs.
- **Validation:** Spot-check a few symbols in a notebook: counts match expected trading days, OHLC values look sane.
- **Dot-connecting moments:** Columnar storage IS the locality-of-reference story from CSAPP. Watching DuckDB scan only 2 of 8 columns and finish in 50ms is the moment.
- **Time:** 1 day.

### 1.2 — Query interface

- **Spec to give AI:** "Write a small Python module `data.py` exposing `query_bars(symbol, start, end, freq) → DataFrame` and `query_ticks(symbol, date) → DataFrame`. Use DuckDB to query the Parquet files. Cache the DuckDB connection. Add cross-section helpers: `universe_at(date) → list[str]` and `panel(symbols, start, end, freq) → DataFrame` (wide format)."
- **Decisions you make:**
  - Query engine: **DuckDB over Parquet** (fast, zero-config, no server). Don't accept SQLite (slower on columnar scans) or a real DB (overkill).
  - DataFrame: pandas (default — every backtest lib speaks pandas). Polars is faster but breaks ecosystem compatibility for now.
- **Concept primer:** DuckDB docs "Querying Parquet" page. 10 minutes.
- **What you'll see at the end:** `query_bars("2330", "2020-01-01", "2024-12-31", "1d")` returns a clean DataFrame in <1 second.
- **Validation:** Notebook test: pull TSMC daily bars, plot close price. Visually sane.
- **Dot-connecting moments:** A query engine is just a tree walker that pushes predicates down to the storage. You'll see this when DuckDB skips entire row groups based on a `WHERE date > ...` clause.
- **Time:** half day.

**Exit Phase 1 when:** you can query your data from a notebook in one line and trust the result.

---

## Phase 2 — Backtest engine (3–5 days)

**Capability gained:** Any strategy expressed as a "signal function" can be backtested on your data, producing equity curve + summary stats. Pure Python, no agent integration yet.

**Why this phase exists:** This is the *correctness foundation* of the entire project. If your backtest has look-ahead bias or wrong cost accounting, every paper you "validate" will be wrong. Get this right standalone before wiring it to an agent.

### 2.1 — Minimal backtest function

- **Spec to give AI:** "Write a Python function `backtest(prices: DataFrame, signal: DataFrame, cost_bps: float, rebalance: str) → BacktestResult` where prices is a wide DataFrame (rows=dates, cols=symbols, values=close), signal is a same-shape DataFrame of target weights (rows summing to 1 for long-only, between -1 and 1 for long-short), cost_bps is per-side transaction cost, rebalance is 'D'/'W'/'M'. Output: equity curve series, monthly returns, summary stats (annualized return, vol, Sharpe, max drawdown, hit rate). Vectorized — no Python loops over dates. No external backtesting library; implement it from scratch in numpy/pandas. ~150 lines target."
- **Decisions you make:**
  - **Roll your own first, don't import vectorbt or bt.** Reason: you must understand every line of the P&L computation. You can swap in a library *after* you've validated yours matches theirs on a toy case.
  - Returns model: simple arithmetic returns for now. Log returns are a stretch refinement.
  - Survivorship: ignore for MVP, document the caveat. Survivorship-bias-free is a Phase 9 polish item.
  - Look-ahead: **signal at date T uses only data ≤ T-1**. Enforce this in the code with an explicit shift; have a comment that says so.
- **Concept primer:** Read *exactly one* article on common backtest mistakes — the [QuantConnect "Backtesting Bias" page](https://www.quantconnect.com/) or any "7 backtest mistakes" blog. 20 min. The point: know what could be wrong before you write the code.
- **What you'll see at the end:** A function that runs in <1 second on 10 years of TW50 daily data.
- **Validation:** **Critical** — write two sanity strategies:
  1. `signal = 0` everywhere → equity curve flat at 1.0 (no PnL, no costs).
  2. `signal = perfect foresight (tomorrow's return sign)` → equity curve hockey-stick. If it isn't astronomical, you have a look-ahead bug.
- **Dot-connecting moments:** Vectorized vs loop-based backtest = SIMD vs scalar. You'll feel the speedup. The "shift signal by 1 to avoid look-ahead" line will reappear in your head every time you read another paper.
- **Time:** 2–3 days. Don't rush.

### 2.2 — First real strategy: cross-sectional momentum

- **Spec to give AI:** "Implement Jegadeesh-Titman 1993 cross-sectional momentum as a signal function for the backtest engine: rank stocks by trailing 12-month return (skip the most recent 1 month), long top decile, short bottom decile, equal-weighted, monthly rebalance. Run it on TWSE constituents 2015–2024. Output the BacktestResult and a saved equity-curve plot to `out/momentum_twse.png`."
- **Decisions you make:**
  - Universe: TWSE-listed survivors (acknowledge the survivorship caveat in comments).
  - Decile cutoffs: at each rebalance date, recompute. Don't accept a fixed list.
- **Concept primer:** Skim the Jegadeesh-Titman 1993 abstract + section 1. 20 min. You need just enough to know what you're replicating.
- **What you'll see at the end:** A PNG of the equity curve. Probably *not* a hockey stick — Taiwan momentum is weaker than US. That's interesting data, not a bug.
- **Validation:** The PNG looks like a plausible equity curve. Sharpe is positive but modest. Drawdowns exist.
- **Dot-connecting moments:** First time you'll feel "I just replicated an academic paper on my own data." The feeling that researchable strategies are *small* — a few lines of pandas — is itself worth the phase.
- **Time:** 1 day.

**Exit Phase 2 when:** both sanity strategies pass, and the momentum result looks reasonable.

---

## Phase 3 — First tool call (2 days)

**Capability gained:** The agent loop. The Claude model in your `/chat` endpoint can now *call* `run_backtest(spec)` and report results back to you. No charts yet, no paper handling — just the spine.

**Why this phase exists:** The agent loop is the heart of the system. Once it works with one tool, adding tools is straightforward. Get the loop right with one tool before adding noise.

### 3.1 — Agent loop with one tool

- **Spec to give AI:** "Replace the simple `messages.create` call in `/chat` with an agent loop. Use the Anthropic Python SDK's tool-use feature. Register one tool: `run_backtest(spec: dict) → dict` where the spec contains universe/signal_type/start/end/cost_bps/rebalance and the result has summary stats and the path to a saved equity-curve PNG. The loop should: send messages + tools to Claude, if response is `end_turn` finish, if response contains `tool_use` blocks dispatch each to Python, append tool_result blocks, loop. Stream both assistant text and tool-use events to the frontend over SSE. Show tool calls in the chat as 'Agent ran backtest…' status lines. Use the claude-api skill in this Claude Code session for the SDK specifics; make sure prompt caching is enabled on the system prompt and tool definitions."
- **Decisions you make:**
  - **Tool execution model:** synchronous Python calls inside the request handler. Don't accept a job queue / Celery — overkill at this stage.
  - **Prompt caching:** the system prompt and tool definitions get a `cache_control: ephemeral` marker. You'll watch your cache hits in the response usage object; this is the moment you'll learn what prompt caching actually does.
  - **Max iterations:** cap the loop at ~12 turns so a runaway agent can't burn through your budget.
  - **One signal type for now:** the tool only knows how to run cross-sectional momentum (Phase 2.2). Other signals come in Phase 5.
- **Concept primer:** Anthropic's "Tool use" guide. Read until you understand `stop_reason == "tool_use"` vs `"end_turn"`. ~30 min.
- **What you'll see at the end:** You type "run a momentum backtest on TWSE for 2020-2024 with 0.3% cost." Agent responds with a status line, runs the backtest, comes back with the stats summary.
- **Validation:** End-to-end manual test. Then a deliberately broken spec ("run a strategy on Mars") — agent should refuse / ask clarifying questions, not crash.
- **Dot-connecting moments:** The agent loop is a *state machine with an external oracle (Claude)*. You'll viscerally feel that "agent" is not magic — it's `while True: ask LLM what to do, do it, repeat`. Prompt caching == LSM memtable for prompts: you cache the warm part, append the cold part.
- **Time:** 1.5 days.

**Exit Phase 3 when:** a one-line user request becomes a tool call that becomes a stat readback.

---

## Phase 4 — Charts in the right panel (2–3 days)

**Capability gained:** When the agent calls `render_chart(...)`, the right panel updates. Backtests now produce visual output, not just text.

**Why this phase exists:** Numbers aren't insight; charts are. The right-panel viz is what makes this a tutor and not a CLI.

### 4.1 — Right-panel chart component + render_chart tool

- **Spec to give AI:** "Add a right-panel React component that renders charts. Use `uPlot` for time-series (equity curves, drawdown) and `Observable Plot` for everything else (heatmaps, bar charts). Backend gets a new tool `render_chart(kind: str, data: dict, title: str)` where kind ∈ {equity_curve, drawdown, monthly_heatmap, bar_compare, stats_table}. The tool returns a chart_id; the frontend listens for chart events on SSE and appends them to the right panel as a vertical stack. Each chart has a title and a small caption the agent provides."
- **Decisions you make:**
  - Chart libraries: `uPlot` for fast time-series (it's tiny + canvas-based + blazing). `Observable Plot` for declarative everything-else. Don't accept Plotly (heavy) or recharts (slow on long series).
  - Charts are streamed as JSON payloads, rendered client-side. Don't accept server-rendered PNGs in production — interactive zoom is the point.
- **Concept primer:** uPlot demos page, ~10 minutes browsing. You're not learning the API, you're seeing what it can do.
- **What you'll see at the end:** Run a backtest in chat; equity curve appears on the right; stats table appears below it.
- **Validation:** Run the same backtest twice with different cost models. Two equity curves appear, you can tell them apart.
- **Dot-connecting moments:** Side-by-side chat and viz is what makes this a *tool* and not a chatbot. You'll feel the difference within the first session.
- **Time:** 2 days.

---

## Phase 5 — Paper ingestion (3–4 days)

**Capability gained:** You paste an arXiv URL (or upload a PDF). Agent reads it, proposes a backtest spec, you approve, it runs. The product becomes "what you described to me," not "preset menu."

**Why this phase exists:** Paper → spec is the agentic step that makes this *yours*. Without it, you have a fancy backtest UI.

### 5.1 — Fetch + extract tools

- **Spec to give AI:** "Add two tools: `fetch_paper(url_or_arxiv_id) → {title, abstract, full_text, sections}` and `extract_strategy(paper_text) → spec` where spec is the same shape as `run_backtest`'s input. For arxiv: use their API to get metadata + PDF, then `pypdf` for text extraction. For non-arxiv PDFs: accept a local path. `extract_strategy` is itself a Claude call with a structured system prompt that forces it to quote the paper for every parameter and return null for any parameter not stated."
- **Decisions you make:**
  - Citation discipline: extract_strategy *must* quote the paper for each parameter. If it can't, that parameter is null and the agent asks you to fill it in. This is the single most important defense against hallucinated parameters.
  - PDF source: arXiv only for MVP. SSRN scraping is a stretch goal.
  - Text extraction: `pypdf` is fine for most papers. Mathpix / pdfplumber are stretch for equation-heavy papers.
- **Concept primer:** arXiv API docs (5 min); pypdf quickstart (5 min).
- **What you'll see at the end:** Paste `arxiv.org/abs/2207.04415`. Agent reads it, summarizes, proposes a spec, asks you to confirm.
- **Validation:** Try 3 papers. For each, the proposed spec is plausible and the quotes match the source.
- **Dot-connecting moments:** Forcing the model to quote-or-null is a *protocol* you invent. It's the same technique a compiler uses with structured errors — "I can't proceed because this token is missing." Hallucination as a missing-symbol problem.
- **Time:** 2–3 days.

### 5.2 — Approve-and-run flow

- **Spec to give AI:** "After `extract_strategy`, the agent should send the spec back to the user as a structured block (render in chat as a small editable form) and wait for approval before calling `run_backtest`. User can edit any field. On approval, agent proceeds."
- **Decisions you make:**
  - UI for approval: inline form in the chat thread vs. a modal. **Inline form** — the conversation is the unit of state.
  - Default fee/slippage: pick numbers appropriate for TWSE retail (~0.3% per side total commission + tax for stocks). Document the assumption.
- **What you'll see at the end:** Paper → spec → editable form → run → charts. Full vertical slice.
- **Validation:** A friend / GPT can use it without instructions and end up with a backtest.
- **Time:** 1 day.

**Exit Phase 5 when:** paste-a-paper-get-a-backtest works for 3 different papers.

---

## Phase 6 — Teaching mode (2–3 days)

**Capability gained:** Before the backtest, the agent *teaches* the core idea. The flow from the product walkthrough becomes real.

**Why this phase exists:** The "tutor" half of "personal quant research tutor." Without it, you're a backtest tool.

### 6.1 — Teaching system prompt + schematic figures

- **Spec to give AI:** "Add a teaching phase between paper extraction and spec proposal. Update the system prompt: after extracting a strategy, the agent should explain the core idea in 5–10 short chat turns aimed at someone with strong programming background but limited finance theory. Use plain language, define jargon, and explicitly call `render_chart` with `kind='schematic'` (you'll add this) to illustrate the idea with a stylized, NOT-data-driven chart. Then propose the spec. The full system prompt should be heavily prompt-cached."
- **Decisions you make:**
  - The teaching pace and depth: 5–10 turns is the right ballpark. Longer and you'll skim; shorter and it's not teaching.
  - Schematic figures: matplotlib SVG generated by the tool from agent-provided structured data. Don't accept "agent generates raw SVG strings" — that's a hallucination vector.
- **Concept primer:** Read 2 explanations of momentum from different sources (a paper abstract and a blog post). Notice what *both* mention vs. what only one mentions. The intersection is the "core idea." Your agent's teaching pass should reach for the intersection.
- **What you'll see at the end:** The session walkthrough from your spec, end-to-end.
- **Validation:** Pick a strategy you don't actually know (e.g., "betting against beta"). Run the flow. Can you explain it to a friend after the session? If yes, the teaching works.
- **Dot-connecting moments:** Writing a teaching-mode system prompt is *programming the model's persona*. You're using natural language as a configuration language. Watch how small wording changes shift behavior — same idea as compiler flags.
- **Time:** 2 days.

**Exit Phase 6 when:** the session walkthrough in `plain.md`-style works for real.

---

## Phase 7 — Session persistence (2 days)

**Capability gained:** Sessions survive page reloads and accumulate over time. You build a library.

**Why this phase exists:** Without persistence, you can't *revisit* a session a week later — the whole long-term value of the tutor evaporates.

### 7.1 — SQLite-backed session store

- **Spec to give AI:** "Add SQLite persistence. Tables: `sessions(id, created_at, title, last_active)`, `messages(id, session_id, role, content_json, ts)`, `tool_calls(id, session_id, tool_name, args_json, result_json, ts)`, `charts(id, session_id, kind, data_json, title, ts)`. New endpoints: `GET /sessions`, `GET /sessions/{id}`, `POST /sessions/{id}/messages`. Frontend has a left sidebar listing sessions; clicking one loads the full chat + viz state."
- **Decisions you make:**
  - SQLite is non-negotiable — you wrote LevelDB; you know what a key-value store gives you and what an ordered embedded DB gives you. SQLite is the right shape.
  - Schema migrations: keep it stupid. Single `init.sql` script. No Alembic yet.
- **Concept primer:** None new — you know SQL.
- **What you'll see at the end:** Multiple sessions in a sidebar, click to switch.
- **Validation:** Start a session, close the tab, reopen, all state restored.
- **Dot-connecting moments:** **This is your LevelDB callback.** You'll use SQLite here and feel the gap between what *you* built (an embedded LSM with no SQL) and what SQLite is (an embedded B-tree with SQL). You'll appreciate both more.
- **Time:** 1.5 days.

**Exit Phase 7 when:** sessions persist. Trunk is essentially complete.

---

## Phase 8 — Paper discovery (3–5 days, semi-trunk)

**Capability gained:** You no longer need to bring a paper. You describe what you're curious about, agent searches and proposes candidates.

**Why this phase exists:** This is the original "find papers" feature from your spec. It's last in trunk because the rest of the pipeline must be solid before retrieval matters — otherwise you'll ship a great paper-finder that produces broken backtests.

### 8.1 — Curated catalog of strategies

- **Spec to give AI:** "Build a JSON catalog at `data/strategies.json` of ~30 well-known strategies summarized from public sources (Quantpedia free section + classic factor papers). Each entry: `{id, name, family, holding_period, instruments, paper_url, one_line_summary, three_paragraph_summary, default_spec}`. Don't crawl — populate by feeding Quantpedia's free strategy index URLs to an AI extraction pass and curating the output by hand. Loaded at app startup."
- **Decisions you make:**
  - Size: 30 is enough for an MVP. More is busywork.
  - Hand-curation: **yes**. Spend an evening reading the auto-extracted catalog and fixing entries. Garbage in, garbage out.
- **What you'll see at the end:** A JSON file with 30 strategy summaries you'd actually recommend.
- **Time:** 1–2 days.

### 8.2 — Search + recommend tool

- **Spec to give AI:** "Add `search_strategies(query: str, k: int=3) → list[strategy_card]` that does semantic search over the catalog. Embed each entry's summary at startup using Voyage or Anthropic embeddings; embed the query at runtime; return top-k by cosine similarity. Update the system prompt so when the user expresses curiosity and hasn't pasted a paper, the agent calls `search_strategies` and proposes 2–3 options."
- **Decisions you make:**
  - Embeddings provider: pick one with a Python SDK and a free tier (Voyage or Cohere; both work).
  - Storage of embeddings: in-memory numpy array, recomputed at startup. Don't accept a vector DB — 30 entries is a numpy dot product.
- **Concept primer:** "What is a sentence embedding" — 10 min skim of any tutorial. Just enough to know it's a vector and cosine similarity ranks them.
- **What you'll see at the end:** "I want to learn about value strategies" → agent suggests 3 candidates.
- **Validation:** 5 varied queries. Are the top-3 always plausible?
- **Dot-connecting moments:** Embeddings as *content-addressable storage*. Cosine similarity is just normalized dot product. You're building a tiny IR system from scratch.
- **Time:** 1–2 days.

### 8.3 — arXiv live search (stretch within stretch)

- Defer until trunk feels solid. The catalog covers 90% of "I want to study X" queries.

---

## Phase 9 — Docker + ship (1–2 days)

**Capability gained:** `docker compose up` from a fresh clone gets the whole thing running. Portable, ship-able.

**Why this phase exists:** A side project you can't run from scratch in 5 minutes dies the next time your environment changes.

### 9.1 — docker-compose with two services

- **Spec to give AI:** "Add a `docker-compose.yml` with two services: `backend` (Python image, FastAPI) and `frontend` (Node image, Vite dev server in development; or a static build served by nginx in production). Mount `./data` as a volume into backend. ANTHROPIC_API_KEY and other secrets from a `.env` file (provide `.env.example`). One command from clone → running app."
- **Decisions you make:**
  - Dev vs prod composition: two compose files (`docker-compose.yml` for dev with hot-reload, `docker-compose.prod.yml` for production).
  - Volumes: `./data` is the only persistent state outside the container. Make sure SQLite db lives there too.
- **What you'll see at the end:** `git clone && cp .env.example .env && docker compose up` → open `localhost:5173` → working app.
- **Validation:** Clone the repo into a new directory and prove it works without your dev env.
- **Dot-connecting moments:** Docker layers = filesystem overlays = the same idea as your LevelDB SSTables (immutable layers + a recent mutable layer on top).
- **Time:** 1 day.

---

## Phase 10 — Measure + reflect (1 day)

**Capability gained:** A short writeup. What you built, what surprised you, what's slow, what you'd build next.

**Why this phase exists:** Reflection consolidates the learning. Also: when school + recruiting happen, this writeup is your handle on the project.

- 2–3 pages.
- Include: total cost of running the app for a month (Anthropic bill), 3 sessions you ran and what you learned, 3 surprises, 3 things you'd build next.

**Time:** 1 day.

---

## Stretch Goals (prioritized)

If trunk is done and you still want to play:

1. **Live arXiv q-fin search** — the agent can call out to arxiv's API, AI-rank candidates against your query. 2 days.
2. **Multi-strategy comparison view** — run N papers' backtests over the same period, show a small-multiples grid. 1–2 days.
3. **Survivorship-bias-free universe** — track delisted symbols too. Real research-grade. 2–3 days.
4. **Paper PDF figure extraction** — when teaching, pull the actual figure from the paper. 1 day with a decent PDF lib.
5. **K8s deploy on a single-node cluster** — overkill for one user but you said you want to learn K8s. Use `k3s` on a VPS. 2 days.
6. **Local LLM fallback** — wire Llama-3.x via Ollama as a no-cost dev mode. Quality drops sharply on tool use, expect to mostly keep Claude. 1 day.
7. **Notifications** — when arxiv q-fin posts new candidates matching your saved interests. 1–2 days.

---

## Total Effort, Honest

| Phase | Your time (with AI implementing) |
|---|---|
| 0 — Hello loop | 0.5 day |
| 1 — Market data | 1.5 days |
| 2 — Backtest engine | 3 days |
| 3 — First tool call | 1.5 days |
| 4 — Charts | 2 days |
| 5 — Paper ingestion | 3 days |
| 6 — Teaching mode | 2 days |
| 7 — Persistence | 1.5 days |
| 8 — Discovery (catalog + search) | 3 days |
| 9 — Docker | 1 day |
| 10 — Measure + reflect | 1 day |
| **Trunk total** | **~20 days** |
| Stretch goals | up to +10 days |

At 1–3 hours/day of evenings + occasional weekend sprint, **plan for 4–8 weeks calendar time**. The variance is mostly about how deep you go into the *papers* you replicate, not the code.

---

## Done Definition (trunk only)

- [ ] `docker compose up` from a fresh clone yields a working app
- [ ] Pasting an arXiv URL produces an editable backtest spec
- [ ] The teaching pass explains the core idea before the backtest runs
- [ ] Backtest runs on real TW data and produces an equity curve + stats
- [ ] Schematic + result charts render in the right panel
- [ ] Sessions persist; you can revisit one from last week
- [ ] At least 3 published strategies replicated, with notes on whether each works on TWSE/TPEX
- [ ] One reflection writeup

That's a complete project. Stretch is bonus.

---

## What You'll Learn (the honest summary)

- **Agent loops as state machines.** The thing people call "AI agents" is a small loop with three states. Once you've written it, it stops being magic.
- **Streaming protocols (SSE / WebSocket).** Token streaming, tool-call streaming, chart payload streaming — same shape three times. You'll never look at chunked HTTP the same again.
- **Columnar storage and predicate pushdown.** Parquet + DuckDB will reframe what you thought "querying a table" meant.
- **Vectorized computation.** Writing a backtest in numpy/pandas without loops is the same instinct as SIMD-friendly C++. You'll see why pandas exists.
- **Embeddings as content-addressable retrieval.** A tiny vector search engine over 30 entries demystifies the whole RAG ecosystem.
- **Prompt caching as a memory hierarchy.** Cached system prompt = L1; per-message tokens = main memory. The CSAPP framing applies remarkably cleanly.
- **Why backtest correctness is hard.** Look-ahead, survivorship, costs, slippage — each is its own footgun. You'll develop respect for the people who do this for real.
- **What an academic strategy looks like in 100 lines of code.** Most published strategies are 5 lines of pandas + a paragraph of conditions. Demystifying.

And the meta-skill: **directing an AI to build real software while staying in the loop on every decision that matters.** That's the skill of the next decade. Everything else is downstream.
