// ── Element references ──────────────────────────────────────────────
const appShell = document.getElementById("appShell");
const navRail = document.getElementById("navRail");
const navList = document.getElementById("navList");
const navToggle = document.getElementById("navToggle");
const navBackdrop = document.getElementById("navBackdrop");
const envStatus = document.getElementById("envStatus");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");
const themeSwitch = document.getElementById("themeSwitch");

const chat = document.getElementById("chat");
const chatEmpty = document.getElementById("chatEmpty");
const exampleChips = document.getElementById("exampleChips");
const composerForm = document.getElementById("composerForm");
const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
const examplesBtn = document.getElementById("examplesBtn");
const examplesPopover = document.getElementById("examplesPopover");
const examplesList = document.getElementById("examplesList");

const provider = document.getElementById("provider");
const apiKey = document.getElementById("apiKey");
const toggleApiKey = document.getElementById("toggleApiKey");
const topK = document.getElementById("topK");
const topKBadge = document.getElementById("topKBadge");
const resetBtn = document.getElementById("resetBtn");

const inspectorTitle = document.getElementById("inspectorTitle");
const inspectorSubtitle = document.getElementById("inspectorSubtitle");
const statusPill = document.getElementById("statusPill");
const errorBanner = document.getElementById("errorBanner");
const errorMessage = document.getElementById("errorMessage");
const errorRetryBtn = document.getElementById("errorRetryBtn");
const inspectorTabs = document.getElementById("inspectorTabs");
const statusStepper = document.getElementById("statusStepper");
const summaryText = document.getElementById("summaryText");
const chartContainer = document.getElementById("chartContainer");
const table = document.getElementById("table");
const rowCount = document.getElementById("rowCount");
const sqlEditorElement = document.getElementById("sqlEditor");
const copySqlBtn = document.getElementById("copySqlBtn");
const rerunSqlBtn = document.getElementById("rerunSqlBtn");
const sqlHint = document.getElementById("sqlHint");
const qualityPane = document.getElementById("qualityPane");
const schemaBlock = document.getElementById("schemaBlock");
const schemaPageBlock = document.getElementById("schemaPageBlock");
const downloadCsvBtn = document.getElementById("downloadCsvBtn");
const shareLinkBtn = document.getElementById("shareLinkBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const historySearch = document.getElementById("historySearch");
const historyTableBody = document.getElementById("historyTableBody");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// ── Constants ────────────────────────────────────────────────────────
const PAGE_META = {
  workspace: { title: "Workspace", subtitle: "Ask a business question in plain English." },
  history: { title: "History", subtitle: "Every question asked in this session." },
  schema: { title: "Schema", subtitle: "What the retrieval step sends to the model." },
  settings: { title: "Settings", subtitle: "Provider, retrieval and appearance preferences." },
};

const pipelineSteps = [
  { key: "retrieve_schema", label: "Retrieve schemas" },
  { key: "generate_sql", label: "Generate SQL" },
  { key: "execute_sql", label: "Execute SQL" },
  { key: "self_correct", label: "Self-correct (if needed)" },
  { key: "generate_visual_and_summary", label: "Generate output" },
  { key: "graceful_failure", label: "Graceful failure" },
];

const CHART_TYPE_LABELS = {
  bar: "Bar",
  line: "Line",
  pie: "Pie",
  histogram: "Histogram",
  table: "Table",
  metric: "KPI",
};

const exampleTemplates = [
  "Which department has the highest average salary?",
  "Show total project budget by department.",
  "How many employees are on leave by department?",
  "List active projects with assigned employee count.",
  "Average base salary by job title.",
  "Top 5 cities by employee count.",
  "Projects ending this year with total budget.",
  "Employees hired after 2022 by department.",
  "Average bonus by pay grade.",
  "Department headcount and average salary.",
];

// ── State ────────────────────────────────────────────────────────────
let currentPage = "workspace";
let resultsHistory = [];
let activeResultIndex = -1;
let turnCount = 0;
let lastQuestion = "";
let lastSchema = "";
let sqlEditor = null;
let originalSql = "";
let markedLines = [];
let historyFilter = "all";

// ── Theme ────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  if (themeLabel) themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  if (themeSwitch) themeSwitch.checked = isDark;
  try {
    localStorage.setItem("nl2sql-theme", theme);
  } catch (error) {
    // localStorage unavailable (private browsing, etc.) — theme just won't persist.
  }
}

function initTheme() {
  let theme = "light";
  try {
    theme = localStorage.getItem("nl2sql-theme") || "light";
  } catch (error) {
    theme = "light";
  }
  if (theme !== "light" && theme !== "dark") theme = "light";
  applyTheme(theme);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  applyTheme(isDark ? "light" : "dark");
}

themeToggle?.addEventListener("click", toggleTheme);
themeSwitch?.addEventListener("change", () => {
  applyTheme(themeSwitch.checked ? "dark" : "light");
});

// ── Navigation / page router ────────────────────────────────────────
function closeMobileNav() {
  appShell.classList.remove("app-shell--nav-open");
}

function showPage(pageId) {
  currentPage = pageId;
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.toggle("hidden", section.dataset.page !== pageId);
  });
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === pageId);
  });
  const meta = PAGE_META[pageId] || PAGE_META.workspace;
  pageTitle.textContent = meta.title;
  pageSubtitle.textContent = meta.subtitle;
  closeMobileNav();

  if (pageId === "history") renderHistoryPage();
  if (pageId === "schema") renderSchemaPage();
}

navList.addEventListener("click", (event) => {
  const btn = event.target.closest(".nav-item[data-page]");
  if (!btn) return;
  showPage(btn.dataset.page);
});

navToggle?.addEventListener("click", () => {
  appShell.classList.toggle("app-shell--nav-open");
});

navBackdrop?.addEventListener("click", closeMobileNav);

// ── Utilities ────────────────────────────────────────────────────────
function formatRelativeTime(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function updateRelativeTimes() {
  document.querySelectorAll("[data-time]").forEach((node) => {
    const timestamp = Number(node.dataset.time || "0");
    if (!timestamp) return;
    node.textContent = formatRelativeTime(timestamp);
  });
}

function updateTopKBadge() {
  if (topKBadge) topKBadge.textContent = topK.value;
}

function setEnvStatus(ok) {
  envStatus.classList.toggle("is-error", !ok);
  const label = envStatus.querySelector("span:not(.status-dot)");
  if (label) label.textContent = ok ? "Ready" : "Attention";
}

function encodeState(state) {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

function decodeState(encoded) {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

// ── Inspector tabs ───────────────────────────────────────────────────
function setInspectorTab(tabId) {
  document.querySelectorAll(".inspector-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".inspector-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.dataset.pane === tabId);
  });
  if (tabId === "sql" && sqlEditor) sqlEditor.refresh();
}

inspectorTabs.addEventListener("click", (event) => {
  const btn = event.target.closest(".inspector-tab");
  if (!btn) return;
  setInspectorTab(btn.dataset.tab);
});

// ── Conversation turns ───────────────────────────────────────────────
function createTurn(questionText, index) {
  const turn = document.createElement("div");
  turn.className = "turn";
  turn.dataset.turn = String(index);

  const userMsg = document.createElement("div");
  userMsg.className = "msg msg-user";
  const userMeta = document.createElement("div");
  userMeta.className = "msg-meta";
  const badge = document.createElement("span");
  badge.className = "query-badge";
  badge.textContent = `Query #${index}`;
  const timeStamp = document.createElement("span");
  timeStamp.dataset.time = String(Date.now());
  timeStamp.textContent = formatRelativeTime(Number(timeStamp.dataset.time));
  userMeta.appendChild(badge);
  userMeta.appendChild(timeStamp);
  const userText = document.createElement("div");
  userText.className = "msg-text";
  userText.textContent = questionText;
  userMsg.appendChild(userMeta);
  userMsg.appendChild(userText);

  const assistantMsg = document.createElement("div");
  assistantMsg.className = "msg msg-assistant";
  assistantMsg.addEventListener("click", () => {
    const resultIndex = Number(turn.dataset.resultIndex);
    if (!Number.isNaN(resultIndex) && resultIndex >= 0) {
      renderResult(resultIndex);
      markActiveTurn(turn);
    }
  });

  const assistantMeta = document.createElement("div");
  assistantMeta.className = "msg-meta";
  const assistantLabel = document.createElement("span");
  assistantLabel.textContent = "Assistant";
  const assistantTime = document.createElement("span");
  assistantTime.dataset.time = String(Date.now());
  assistantTime.textContent = formatRelativeTime(Number(assistantTime.dataset.time));
  assistantMeta.appendChild(assistantLabel);
  assistantMeta.appendChild(assistantTime);

  const pipelineRow = document.createElement("div");
  pipelineRow.className = "turn-pipeline";
  pipelineRow.innerHTML = '<span class="spinner"></span>';
  const pipelineText = document.createElement("span");
  pipelineText.textContent = "Thinking...";
  pipelineRow.appendChild(pipelineText);

  const summary = document.createElement("p");
  summary.className = "summary-text hidden";

  const details = document.createElement("button");
  details.type = "button";
  details.className = "view-details-link hidden";
  details.textContent = "View full result \u2192";
  details.addEventListener("click", (event) => {
    event.stopPropagation();
    const resultIndex = Number(turn.dataset.resultIndex);
    if (!Number.isNaN(resultIndex) && resultIndex >= 0) {
      renderResult(resultIndex);
      markActiveTurn(turn);
    }
  });

  assistantMsg.appendChild(assistantMeta);
  assistantMsg.appendChild(pipelineRow);
  assistantMsg.appendChild(summary);
  assistantMsg.appendChild(details);

  turn.appendChild(userMsg);
  turn.appendChild(assistantMsg);
  chat.appendChild(turn);
  chat.scrollTop = chat.scrollHeight;
  chatEmpty.classList.add("hidden");

  return { turn, pipelineRow, pipelineText, summary, details };
}

function markActiveTurn(activeTurn) {
  document.querySelectorAll(".msg-assistant").forEach((el) => el.classList.remove("is-active"));
  activeTurn?.querySelector(".msg-assistant")?.classList.add("is-active");
}

function setTurnComplete(turnRefs, result, resultIndex) {
  turnRefs.turn.dataset.resultIndex = String(resultIndex);
  turnRefs.pipelineRow.remove();
  turnRefs.summary.textContent =
    result.summary || (result.error ? result.error.message : "No summary returned.");
  turnRefs.summary.classList.remove("hidden");
  turnRefs.details.classList.remove("hidden");
}

// ── Stepper ──────────────────────────────────────────────────────────
function renderStepper(statusUpdates) {
  statusStepper.innerHTML = "";
  const updateMap = new Map();
  statusUpdates.forEach((update) => updateMap.set(update.node, update));
  const lastUpdate = statusUpdates[statusUpdates.length - 1];

  pipelineSteps.forEach((step) => {
    const li = document.createElement("li");
    li.className = "step";
    const update = updateMap.get(step.key);
    const isLast = lastUpdate && lastUpdate.node === step.key;
    li.classList.add(update ? (isLast ? "active" : "complete") : "pending");

    const dot = document.createElement("span");
    dot.className = "step-dot";
    const label = document.createElement("span");
    label.textContent = step.label;
    li.appendChild(dot);
    li.appendChild(label);

    if (update && !isLast && typeof update.elapsed_s === "number") {
      const time = document.createElement("span");
      time.className = "step-time";
      time.textContent = `${update.elapsed_s}s`;
      li.appendChild(time);
    }
    statusStepper.appendChild(li);
  });
}

// ── Data table ───────────────────────────────────────────────────────
function buildTable(result) {
  table.innerHTML = "";
  if (!result || !result.columns || !result.rows) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No rows returned.";
    table.appendChild(empty);
    rowCount.textContent = "";
    return;
  }

  const tableEl = document.createElement("table");
  tableEl.className = "data-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  result.columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  tableEl.appendChild(thead);

  const tbody = document.createElement("tbody");
  result.rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell === null ? "" : String(cell);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  tableEl.appendChild(tbody);
  table.appendChild(tableEl);
  rowCount.textContent = `${result.row_count ?? result.rows.length} row(s)`;
}

// ── Charts ───────────────────────────────────────────────────────────
function renderChartInPane(pane, figure) {
  if (!figure || !figure.data) {
    pane.innerHTML = "";
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No data for this chart type.";
    pane.appendChild(empty);
    return;
  }
  Plotly.newPlot(pane, figure.data, figure.layout || {}, {
    displaylogo: false,
    responsive: true,
  });
}

function renderMultiChart(container, figures, autoChartType) {
  container.innerHTML = "";
  const types = Object.keys(figures || {});
  if (types.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No chart available.";
    container.appendChild(empty);
    return;
  }

  const activeType = autoChartType && types.includes(autoChartType) ? autoChartType : types[0];
  const tabBar = document.createElement("div");
  tabBar.className = "chart-tab-bar";
  const paneContainer = document.createElement("div");
  paneContainer.className = "chart-panes";

  types.forEach((type) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chart-tab-btn" + (type === activeType ? " active" : "");
    btn.textContent = CHART_TYPE_LABELS[type] || type;

    const pane = document.createElement("div");
    pane.className = "chart-tab-pane" + (type === activeType ? " active" : "");

    let rendered = false;
    if (type === activeType) {
      renderChartInPane(pane, figures[type]);
      rendered = true;
    }

    btn.addEventListener("click", () => {
      tabBar.querySelectorAll(".chart-tab-btn").forEach((b) => b.classList.remove("active"));
      paneContainer.querySelectorAll(".chart-tab-pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      pane.classList.add("active");
      if (!rendered) {
        renderChartInPane(pane, figures[type]);
        rendered = true;
      }
      const plotEl = pane.querySelector(".js-plotly-plot");
      if (plotEl) Plotly.relayout(plotEl, { autosize: true });
    });

    tabBar.appendChild(btn);
    paneContainer.appendChild(pane);
  });

  container.appendChild(tabBar);
  container.appendChild(paneContainer);
}

// ── Quality / judge ──────────────────────────────────────────────────
function judgeScoreToPercent(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, (value / 5) * 100));
}

function renderJudge(target, judge) {
  target.innerHTML = "";
  if (!judge) {
    const placeholder = document.createElement("p");
    placeholder.className = "rationale";
    placeholder.textContent = "No quality score available for this response.";
    target.appendChild(placeholder);
    return;
  }

  const percent = judgeScoreToPercent(judge.overall_score) ?? 0;
  const summaryRow = document.createElement("div");
  summaryRow.className = "confidence-summary";
  const score = document.createElement("div");
  score.className = "confidence-score";
  score.textContent = judgeScoreToPercent(judge.overall_score) === null
    ? "--"
    : `${Number(judge.overall_score).toFixed(1)}/5`;
  const bar = document.createElement("div");
  bar.className = "confidence-bar";
  const fill = document.createElement("span");
  fill.style.width = `${percent}%`;
  bar.appendChild(fill);
  summaryRow.appendChild(score);
  summaryRow.appendChild(bar);
  target.appendChild(summaryRow);

  const breakdown = document.createElement("div");
  breakdown.className = "judge-breakdown";
  [
    ["Correctness", judge.correctness],
    ["Relevance", judge.relevance],
    ["Clarity", judge.clarity],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    item.className = "judge-metric";
    const name = document.createElement("span");
    name.className = "judge-metric-label";
    name.textContent = label;
    const val = document.createElement("span");
    val.className = "judge-metric-value";
    val.textContent = typeof value === "number" && Number.isFinite(value) ? `${value}/5` : "--";
    item.appendChild(name);
    item.appendChild(val);
    breakdown.appendChild(item);
  });
  target.appendChild(breakdown);

  const rationale = document.createElement("p");
  rationale.className = "rationale";
  rationale.textContent = judge.rationale || "No rationale provided.";
  target.appendChild(rationale);
}

// ── SQL editor ───────────────────────────────────────────────────────
function clearChangedLines() {
  markedLines.forEach((handle) => {
    if (handle) sqlEditor.removeLineClass(handle, "background", "line-changed");
  });
  markedLines = [];
}

function updateChangedLines() {
  if (!sqlEditor) return;
  clearChangedLines();
  const currentLines = sqlEditor.getValue().split("\n");
  const originalLines = originalSql.split("\n");
  const maxLines = Math.max(originalLines.length, currentLines.length);
  let changed = false;

  for (let i = 0; i < maxLines; i += 1) {
    if ((currentLines[i] || "") !== (originalLines[i] || "")) {
      markedLines.push(sqlEditor.addLineClass(i, "background", "line-changed"));
      changed = true;
    }
  }
  sqlHint.textContent = changed ? "Edited SQL detected." : "";
}

function setSqlValue(sql) {
  if (!sqlEditor) return;
  originalSql = sql || "";
  sqlEditor.setValue(originalSql);
  clearChangedLines();
  sqlHint.textContent = "";
}

function initSqlEditor() {
  sqlEditor = CodeMirror.fromTextArea(sqlEditorElement, {
    mode: "text/x-sql",
    lineNumbers: true,
    theme: document.documentElement.getAttribute("data-theme") === "dark" ? "material-palenight" : "default",
    lineWrapping: true,
  });
  sqlEditor.on("change", updateChangedLines);
}

// ── Result rendering (inspector) ─────────────────────────────────────
function showErrorBanner(error) {
  if (!error) {
    errorBanner.classList.add("hidden");
    return;
  }
  errorBanner.classList.remove("hidden");
  errorMessage.textContent = error.message;
}

function renderResult(index) {
  if (index < 0 || index >= resultsHistory.length) return;
  const result = resultsHistory[index];
  activeResultIndex = index;

  inspectorTitle.textContent = `Result #${index + 1}`;
  inspectorSubtitle.textContent = result.question || "";
  statusPill.textContent = result.error ? "Failed" : "Completed";
  statusPill.className = "pill " + (result.error ? "pill-error" : "pill-success");

  renderStepper(result.status_updates || []);
  summaryText.textContent = result.summary || (result.error ? result.error.message : "No summary returned.");
  renderMultiChart(chartContainer, result.figures, result.chart_type_auto);

  setSqlValue(result.sql_query || "");
  buildTable(result.db_result);
  renderJudge(qualityPane, result.judge_score);

  lastSchema = result.schema_context || "";
  schemaBlock.textContent = lastSchema || "No schema retrieved for this query.";
  schemaPageBlock.textContent = lastSchema || "Ask a question in the Workspace to see retrieved schema here.";

  showErrorBanner(result.error);
}

function clearInspector() {
  inspectorTitle.textContent = "Result #0";
  inspectorSubtitle.textContent = "Run a question to see results here.";
  statusPill.textContent = "Idle";
  statusPill.className = "pill pill-neutral";
  renderStepper([]);
  summaryText.textContent = "";
  chartContainer.innerHTML = "";
  setSqlValue("");
  table.innerHTML = "";
  rowCount.textContent = "";
  qualityPane.innerHTML = "";
  schemaBlock.textContent = "No schema retrieved yet.";
  schemaPageBlock.textContent = "Ask a question in the Workspace to see retrieved schema here.";
  showErrorBanner(null);
}

// ── History page ─────────────────────────────────────────────────────
function matchesHistoryFilter(result) {
  if (historyFilter === "ok") return !result.error;
  if (historyFilter === "error") return Boolean(result.error);
  return true;
}

function renderHistoryPage() {
  const query = (historySearch?.value || "").trim().toLowerCase();
  historyTableBody.innerHTML = "";

  const rows = resultsHistory
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => matchesHistoryFilter(result))
    .filter(({ result }) => !query || (result.question || "").toLowerCase().includes(query))
    .reverse();

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "empty-note";
    td.textContent = "No queries match this view yet.";
    tr.appendChild(td);
    historyTableBody.appendChild(tr);
    return;
  }

  rows.forEach(({ result, index }) => {
    const tr = document.createElement("tr");

    const statusTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = "pill " + (result.error ? "pill-error" : "pill-success");
    pill.textContent = result.error ? "Failed" : "OK";
    statusTd.appendChild(pill);

    const questionTd = document.createElement("td");
    questionTd.className = "history-question-cell";
    questionTd.title = result.question || "";
    questionTd.textContent = result.question || "";

    const timeTd = document.createElement("td");
    timeTd.textContent = formatRelativeTime(result.timestamp || Date.now());

    const actionTd = document.createElement("td");
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "btn btn-sm btn-ghost";
    viewBtn.textContent = "View";
    viewBtn.addEventListener("click", () => {
      showPage("workspace");
      renderResult(index);
      const turnEl = document.querySelector(`.turn[data-result-index="${index}"]`);
      markActiveTurn(turnEl);
      turnEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    actionTd.appendChild(viewBtn);

    tr.appendChild(statusTd);
    tr.appendChild(questionTd);
    tr.appendChild(timeTd);
    tr.appendChild(actionTd);
    historyTableBody.appendChild(tr);
  });
}

historySearch?.addEventListener("input", renderHistoryPage);

document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    historyFilter = chip.dataset.filter;
    renderHistoryPage();
  });
});

clearHistoryBtn?.addEventListener("click", () => {
  resultsHistory = [];
  activeResultIndex = -1;
  renderHistoryPage();
});

// ── Schema page ──────────────────────────────────────────────────────
function renderSchemaPage() {
  schemaPageBlock.textContent = lastSchema || "Ask a question in the Workspace to see retrieved schema here.";
}

// ── Query execution ──────────────────────────────────────────────────
async function runQuery(options = {}) {
  const question = (options.question || questionInput.value).trim();
  const sqlOverride = options.sqlOverride || null;
  if (!question) return;

  showPage("workspace");
  lastQuestion = question;
  turnCount += 1;
  const turnRefs = createTurn(question, turnCount);
  markActiveTurn(turnRefs.turn);
  questionInput.value = "";
  questionInput.style.height = "auto";
  clearInspector();
  statusPill.textContent = "Running";
  statusPill.className = "pill pill-info";

  sendBtn.disabled = true;
  sendBtn.textContent = "Running...";

  const currentStatusUpdates = [];
  const turnTimestamp = Date.now();

  try {
    const response = await fetch("/api/query/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        provider: provider.value,
        api_key: apiKey.value || null,
        top_k: Number(topK.value),
        sql_override: sqlOverride,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Request failed");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        let eventData;
        try {
          eventData = JSON.parse(part.slice(6));
        } catch {
          continue;
        }

        if (eventData.type === "node_update") {
          currentStatusUpdates.push({
            node: eventData.node,
            message: eventData.message,
            elapsed_s: eventData.elapsed_s,
          });
          turnRefs.pipelineText.textContent = eventData.message;
          renderStepper(currentStatusUpdates);
        } else if (eventData.type === "done") {
          const errorPayload = eventData.error_type
            ? {
                type: eventData.error_type,
                message: eventData.error_message || "Something went wrong.",
                trace: eventData.error_trace || "",
              }
            : null;

          const result = {
            question,
            timestamp: turnTimestamp,
            status: eventData.status || "completed",
            status_updates: eventData.status_updates || currentStatusUpdates,
            sql_query: eventData.sql_query || "",
            summary: eventData.summary || "",
            db_result: eventData.db_result || null,
            figures: eventData.figures || {},
            chart_type_auto: eventData.chart_type_auto || "table",
            schema_context: eventData.schema_context || "",
            judge_score: eventData.judge_score || null,
            error: errorPayload,
          };

          const resultIndex = resultsHistory.push(result) - 1;
          setTurnComplete(turnRefs, result, resultIndex);
          renderResult(resultIndex);
        } else if (eventData.type === "error") {
          throw new Error(eventData.message || "Stream error");
        }
      }
    }
  } catch (error) {
    const fallback = {
      question,
      timestamp: turnTimestamp,
      status: "failed",
      status_updates: currentStatusUpdates,
      sql_query: "",
      summary: "",
      db_result: null,
      figures: {},
      chart_type_auto: "table",
      schema_context: "",
      judge_score: null,
      error: {
        type: "unknown_error",
        message: error.message || "Something went wrong.",
        trace: error.message || "",
      },
    };
    const resultIndex = resultsHistory.push(fallback) - 1;
    setTurnComplete(turnRefs, fallback, resultIndex);
    renderResult(resultIndex);
    setEnvStatus(false);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Run";
    updateRelativeTimes();
    if (currentPage === "history") renderHistoryPage();
  }
}

composerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runQuery();
});

questionInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    runQuery();
  }
});

questionInput.addEventListener("input", () => {
  questionInput.style.height = "auto";
  questionInput.style.height = `${questionInput.scrollHeight}px`;
});

errorRetryBtn.addEventListener("click", () => runQuery({ question: lastQuestion }));
rerunSqlBtn.addEventListener("click", () =>
  runQuery({ question: lastQuestion, sqlOverride: sqlEditor.getValue() }),
);

// ── Toolbar actions ──────────────────────────────────────────────────
function downloadCsv() {
  const result = resultsHistory[activeResultIndex];
  if (!result || !result.db_result) return;
  const { columns, rows } = result.db_result;
  if (!columns || !rows) return;
  const csvRows = [columns.join(",")];
  rows.forEach((row) => {
    const escaped = row.map((cell) => {
      const text = cell === null ? "" : String(cell);
      if (text.includes(",") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    });
    csvRows.push(escaped.join(","));
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nl2sql-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function copySqlFromEditor(targetButton) {
  const text = sqlEditor ? sqlEditor.getValue().trim() : "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (targetButton) {
      const original = targetButton.textContent;
      targetButton.textContent = "Copied";
      setTimeout(() => {
        targetButton.textContent = original;
      }, 1200);
    }
  } catch (error) {
    if (targetButton) targetButton.textContent = "Failed";
  }
}

function copyShareLink() {
  const state = {
    question: lastQuestion,
    provider: provider.value,
    top_k: Number(topK.value),
    sql: sqlEditor ? sqlEditor.getValue() : "",
  };
  const url = new URL(window.location.href);
  url.searchParams.set("state", encodeState(state));
  navigator.clipboard.writeText(url.toString());
}

function openFullscreen() {
  const target = table.querySelector("table") ? table : chartContainer;
  if (target && target.requestFullscreen) target.requestFullscreen();
}

downloadCsvBtn.addEventListener("click", downloadCsv);
copySqlBtn.addEventListener("click", () => copySqlFromEditor(copySqlBtn));
shareLinkBtn.addEventListener("click", copyShareLink);
fullscreenBtn.addEventListener("click", openFullscreen);

// ── Examples ─────────────────────────────────────────────────────────
function populateExamples() {
  [examplesList, exampleChips].forEach((container) => {
    if (!container) return;
    container.innerHTML = "";
  });

  exampleTemplates.forEach((templateText) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-btn";
    button.textContent = templateText;
    button.addEventListener("click", () => {
      questionInput.value = templateText;
      examplesPopover.classList.add("hidden");
      questionInput.focus();
    });
    examplesList.appendChild(button);
  });

  exampleTemplates.slice(0, 4).forEach((templateText) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = templateText;
    chip.addEventListener("click", () => {
      questionInput.value = templateText;
      questionInput.focus();
    });
    exampleChips.appendChild(chip);
  });
}

examplesBtn.addEventListener("click", () => {
  examplesPopover.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
  if (!examplesPopover.contains(event.target) && event.target !== examplesBtn) {
    examplesPopover.classList.add("hidden");
  }
});

// ── Settings bindings ────────────────────────────────────────────────
topK.addEventListener("input", updateTopKBadge);

toggleApiKey?.addEventListener("click", () => {
  const isHidden = apiKey.type === "password";
  apiKey.type = isHidden ? "text" : "password";
});

resetBtn.addEventListener("click", () => {
  chat.innerHTML = "";
  chat.appendChild(chatEmpty);
  chatEmpty.classList.remove("hidden");
  resultsHistory = [];
  activeResultIndex = -1;
  turnCount = 0;
  clearInspector();
  renderHistoryPage();
});

// ── Shared state from URL ───────────────────────────────────────────
function applySharedState() {
  const params = new URLSearchParams(window.location.search);
  const stateParam = params.get("state");
  if (!stateParam) return;
  const state = decodeState(stateParam);
  if (!state) return;
  if (state.provider) provider.value = state.provider;
  if (state.top_k) topK.value = String(state.top_k);
  if (state.question) questionInput.value = state.question;
  if (state.sql && sqlEditor) setSqlValue(state.sql);
  updateTopKBadge();
}

// ── Resize handling ──────────────────────────────────────────────────
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.querySelectorAll(".js-plotly-plot").forEach((el) => {
      if (typeof Plotly !== "undefined") Plotly.relayout(el, { autosize: true });
    });
  }, 150);
});

// ── Init ─────────────────────────────────────────────────────────────
initTheme();
initSqlEditor();
populateExamples();
updateTopKBadge();
clearInspector();
applySharedState();
setInterval(updateRelativeTimes, 60000);
