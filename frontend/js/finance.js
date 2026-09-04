// const FinanceController = (() => {
//   let charts = {};

//   const CHART_COLORS = {
//     accent: "#29c9a3",
//     accent2: "#4d8dff",
//     warn: "#f2b84b",
//     danger: "#ef5b6b",
//     grid: "rgba(255,255,255,0.06)",
//     text: "#90a0b7"
//   };

//   function destroy(id) {
//     if (charts[id]) {
//       charts[id].destroy();
//       delete charts[id];
//     }
//   }

//   function formatCurrency(val) {
//     if (val == null || isNaN(val)) return "--";
//     if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
//     if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
//     return `₹${val.toLocaleString('en-IN')}`;
//   }

//   // Generate 50+ synthetic records for the finance-ops loop test
//   function generateSyntheticBatch() {
//     const records = [];
//     const sources = ["Bank Statement API", "Payment Gateway (UPI)", "ECS Mandate Clearing", "Collection Agency Feed"];
//     const statuses = ["MATCHED", "MATCHED", "MATCHED", "MATCHED", "EXCEPTION_DISCREPANCY", "EXCEPTION_UNMATCHED_TAX"];

//     for (let i = 1; i <= 52; i++) {
//       const src = sources[Math.floor(Math.random() * sources.length)];
//       const expected = Math.floor(Math.random() * 85000) + 12000;
//       const status = statuses[Math.floor(Math.random() * statuses.length)];
      
//       let settled = expected;
//       let note = "Auto-verified by reconciliation agent";

//       if (status === "EXCEPTION_DISCREPANCY") {
//         const delta = Math.floor(Math.random() * 1500) + 100;
//         settled = expected - delta;
//         note = `Amount mismatch: -₹${delta} bank fee deduction unmapped`;
//       } else if (status === "EXCEPTION_UNMATCHED_TAX") {
//         settled = expected;
//         note = "Tax-line mismatch: GST HSN code verification pending manual review";
//       }

//       records.push({
//         id: `BAT-2026-${String(i).padStart(3, '0')}`,
//         source: src,
//         expected,
//         settled,
//         status,
//         note
//       });
//     }
//     return records;
//   }

//   function renderBatchTable(records) {
//     const tbody = document.querySelector("#financeBatchTable tbody");
//     if (!tbody) return;

//     tbody.innerHTML = records.map(r => {
//       const isMatched = r.status === "MATCHED";
//       const badgeStyle = isMatched 
//         ? "color: #29c9a3; background: rgba(41,201,163,0.1); padding: 2px 8px; border-radius: 4px; font-size: 11px;" 
//         : "color: #ef5b6b; background: rgba(239,91,107,0.1); padding: 2px 8px; border-radius: 4px; font-size: 11px;";
      
//       return `
//         <tr>
//           <td><strong>${r.id}</strong></td>
//           <td>${r.source}</td>
//           <td>${formatCurrency(r.expected)}</td>
//           <td>${formatCurrency(r.settled)}</td>
//           <td><span style="${badgeStyle}">${r.status}</span></td>
//           <td style="color: var(--text-dim);">${r.note}</td>
//         </tr>
//       `;
//     }).join("");
//   }

//   function renderCharts() {
//     // 1. Cash Forecaster Chart
//     destroy("cashForecast");
//     const ctx1 = document.getElementById("cashForecastChart");
//     if (ctx1 && typeof Chart !== "undefined") {
//       charts.cashForecast = new Chart(ctx1, {
//         type: "line",
//         data: {
//           labels: ["Day 1", "Day 5", "Day 10", "Day 15", "Day 20", "Day 25", "Day 30"],
//           datasets: [
//             { label: "Inflow Projection", data: [45, 52, 48, 65, 70, 82, 95], borderColor: CHART_COLORS.accent, tension: 0.3 },
//             { label: "Settlement Outflow", data: [40, 49, 44, 60, 68, 75, 88], borderColor: CHART_COLORS.accent2, tension: 0.3 }
//           ]
//         },
//         options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
//       });
//     }

//     // 2. Tax Matcher Breakdown Chart
//     destroy("taxMatcher");
//     const ctx2 = document.getElementById("taxMatcherChart");
//     if (ctx2 && typeof Chart !== "undefined") {
//       charts.taxMatcher = new Chart(ctx2, {
//         type: "doughnut",
//         data: {
//           labels: ["Fully Reconciled", "Auto-Adjusted Fees", "Tax Discrepancies", "Unresolved Exceptions"],
//           datasets: [{
//             data: [38, 7, 4, 3],
//             backgroundColor: [CHART_COLORS.accent, CHART_COLORS.accent2, CHART_COLORS.warn, CHART_COLORS.danger],
//             borderWidth: 0
//           }]
//         },
//         options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { position: "bottom" } } }
//       });
//     }
//   }

//   function runLoop() {
//     const runBtn = document.getElementById("runBooksBtn");
//     if (runBtn) {
//       runBtn.textContent = "Running Agent Loop...";
//       runBtn.disabled = true;
//     }

//     setTimeout(() => {
//       const records = generateSyntheticBatch();
//       const total = records.length;
//       const matched = records.filter(r => r.status === "MATCHED").length;
//       const exceptions = total - matched;
//       const matchRate = ((matched / total) * 100).toFixed(1);

//       // Update metrics
//       document.getElementById("controllerMatchRate").textContent = matchRate;
//       document.getElementById("controllerThroughput").textContent = `${total} / ${total} Records`;
//       document.getElementById("metricResolved").textContent = `${matched} Items`;
//       document.getElementById("metricExceptions").textContent = `${exceptions} Items`;
//       document.getElementById("metricDelta").textContent = `₹14,250 Net`;

//       renderBatchTable(records);
//       renderCharts();

//       if (runBtn) {
//         runBtn.textContent = "Re-Run 50+ Record Batch Loop ⚡";
//         runBtn.disabled = false;
//       }
//     }, 400);
//   }

//   function init() {
//     const runBtn = document.getElementById("runBooksBtn");
//     if (runBtn) {
//       runBtn.addEventListener("click", runLoop);
//     }
//     renderCharts();
//   }

//   return { init, runLoop };
// })();

// document.addEventListener("DOMContentLoaded", () => {
//   FinanceController.init();
// });







/* ============================================================================
   finance.js — AI Finance Controller (frontend logic, single file)

   Wires the #view-finance markup to:
     Layer A  /api/finance/summary + /api/finance/run   (ledger vs bank)
     Layer B  tax-line matcher                          (bundled in the same run)
     Layer C  forward cash forecaster                   (bundled in the same run)
     Layer D  recovery-settlement reconciler             (bundled in the same run,
                                                           ties back into the main
                                                           lending/residual-pricing model)
     Q&A      /api/finance/chat                          (Ollama-backed, grounded
                                                           only in the JSON the
                                                           reconciliation engine
                                                           already produced)

   All matching/scoring happens server-side in Python (deterministic rules) -
   this file only renders results and forwards chat messages. No matching
   decision is ever made in the browser or by the LLM.
   ============================================================================ */

const FinanceController = (() => {
  const API_BASE = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "http://localhost:5000";
  let charts = {};
  let chatHistory = [];
  let lastData = null;

  const COLORS = {
    accent: "#22d3a5",
    accent2: "#5b8cff",
    amber: "#f5b352",
    red: "#ef5b76",
    dim: "#8b93a1",
  };

  // -------------------------------------------------------------------
  // Fetch helpers
  // -------------------------------------------------------------------
  async function fetchSummary() {
    const res = await fetch(`${API_BASE}/api/finance/summary`);
    return res.json();
  }

  async function runBatch() {
    const res = await fetch(`${API_BASE}/api/finance/run`, { method: "POST" });
    if (!res.ok) throw new Error("Batch run failed");
    return res.json();
  }

  async function sendChat(message) {
    const res = await fetch(`${API_BASE}/api/finance/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: chatHistory.slice(0, -1) }),
    });
    return res.json();
  }







// Add this inside your FinanceController init() function
const innerTabs = document.querySelectorAll('.inner-tab');
const tabPanes = document.querySelectorAll('.tab-pane');

innerTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active state from all tabs and panes
    innerTabs.forEach(t => t.classList.remove('active'));
    tabPanes.forEach(p => p.style.display = 'none');
    
    // Set active state on clicked tab
    tab.classList.add('active');
    
    // Show corresponding pane
    const targetId = tab.getAttribute('data-target');
    const targetPane = document.getElementById(targetId);
    if (targetPane) {
      targetPane.style.display = 'block';
      // Optional: re-render charts here if they bug out when hidden
      // renderCharts(); 
    }
  });
});





  // -------------------------------------------------------------------
  // Formatting helpers
  // -------------------------------------------------------------------
  const fmtCurrency = (n) => {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  };
  const fmtPct = (n, digits = 1) => (n === null || n === undefined ? "—" : (n * 100).toFixed(digits) + "%");
  const destroy = (id) => { if (charts[id]) { charts[id].destroy(); delete charts[id]; } };

  // Sets textContent only if the element exists - keeps this file from throwing
  // if some of the optional HTML blocks (checklist, Q&A, recovery section)
  // haven't been added to index.html yet.
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  }

  // -------------------------------------------------------------------
  // Rendering — hero, tape, capability checklist
  // -------------------------------------------------------------------
  function renderHero(reconciliation) {
    const matchPct = Math.round(reconciliation.match_rate * 100);
    setText("controllerMatchRate", matchPct);
    setText("controllerThroughput", `${reconciliation.matched_count} / ${reconciliation.total_ledger_records} Records`);

    const statusEl = document.querySelector(".controller-status");
    if (statusEl) {
      statusEl.innerHTML = `<span class="live-dot"></span> CONTROLLER <strong>ACTIVE</strong>`;
    }
  }

  function renderTape(reconciliation, taxLines, recovery) {
    setText("metricBatchSize", `${reconciliation.total_ledger_records} Records`);
    setText("metricResolved",
      `${reconciliation.matched_count} (${reconciliation.high_confidence_matches} exact, ${reconciliation.fuzzy_resolved_matches} fuzzy)`);

    const totalExceptions = reconciliation.exception_count + (taxLines ? taxLines.exception_count : 0);
    setText("metricExceptions", `${totalExceptions} unresolved`);

    // Settlement delta: total absolute amount variance actually observed across
    // ledger-vs-bank exceptions - computed from the real matching result, never hardcoded.
    const delta = reconciliation.exceptions.reduce((sum, e) => {
      if (e.expected_amount != null && e.matched_amount != null) {
        return sum + Math.abs(e.expected_amount - e.matched_amount);
      }
      return sum;
    }, 0);
    setText("metricDelta", fmtCurrency(delta));
  }

  function renderCapabilityChecklist(data) {
    const el = document.getElementById("financeCapabilityChecklist");
    if (!el) return;
    const items = [
      { label: "Multi-source reconciliation", done: !!data.reconciliation },
      { label: "Tax-line matcher", done: !!data.tax_lines },
      { label: "Forward cash forecaster", done: !!data.cash_forecast },
      { label: "Recovery-settlement reconciler (model vs actual)", done: !!data.recovery_reconciliation },
      { label: "Settlement Q&A agent", done: chatHistory.length > 0 },
    ];
    el.innerHTML = items.map(i => `
      <div class="checklist-item ${i.done ? "done" : ""}">
        <span class="checklist-dot"></span>${i.label}
      </div>
    `).join("");
  }

  // -------------------------------------------------------------------
  // Layer A — Batch ledger table (merged matches + exceptions)
  // -------------------------------------------------------------------
  function renderBatchTable(reconciliation) {
    const table = document.getElementById("financeBatchTable");
    if (!table) return;
    const tbody = table.querySelector("tbody");
    const rows = [
      ...reconciliation.matches_sample.map(r => ({ ...r, status: "MATCHED" })),
      ...reconciliation.exceptions.map(r => ({ ...r, status: "EXCEPTION" })),
    ];
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No records in this batch.</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.loan_id ?? "—"}</td>
        <td>${r.bank_ref ?? "Internal Ledger"}</td>
        <td>${fmtCurrency(r.expected_amount)}</td>
        <td>${fmtCurrency(r.matched_amount)}</td>
        <td><span class="badge ${r.status === "MATCHED" ? "Low" : "Critical"}">${r.status}</span></td>
        <td>${r.reason ? escapeHtml(r.reason) : (r.confidence === "fuzzy" ? "Resolved via fuzzy ID match" : "Exact match within tolerance")}</td>
      </tr>
    `).join("");
  }

  // -------------------------------------------------------------------
  // Exception reason breakdown (the "honest exception list" requirement)
  // -------------------------------------------------------------------
  function renderExceptionBreakdown(reconciliation) {
    const el = document.getElementById("exceptionBreakdownChart");
    if (!el) return;
    destroy("exceptionBreakdown");
    const breakdown = reconciliation.exception_reason_breakdown || {};
    const labels = Object.keys(breakdown);
    const values = Object.values(breakdown);
    if (!labels.length) return;
    charts.exceptionBreakdown = new Chart(el, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: "Exceptions", data: values, backgroundColor: COLORS.red, borderRadius: 6 }],
      },
      options: {
        indexAxis: "y",
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  // -------------------------------------------------------------------
  // Layer B — Tax-line matcher
  // -------------------------------------------------------------------
  function renderTaxMatcherChart(taxLines) {
    destroy("taxMatcher");
    if (!taxLines) return;
    const ctx = document.getElementById("taxMatcherChart");
    charts.taxMatcher = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Matched (within tolerance)", "Exception (tax rate mismatch)"],
        datasets: [{
          data: [taxLines.matched_count, taxLines.exception_count],
          backgroundColor: [COLORS.accent, COLORS.red],
          borderWidth: 0,
        }],
      },
      options: { cutout: "62%", plugins: { legend: { position: "bottom" } } },
    });
  }

  function renderTaxExceptionsTable(taxLines) {
    const el = document.getElementById("taxExceptionsTable");
    if (!el) return;
    const tbody = el.querySelector("tbody");
    if (!taxLines || !taxLines.exceptions.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No tax-line exceptions in this batch.</td></tr>`;
      return;
    }
    tbody.innerHTML = taxLines.exceptions.map(e => `
      <tr>
        <td>${e.auction_id}</td>
        <td>${e.loan_id}</td>
        <td>${fmtCurrency(e.sale_amount)}</td>
        <td>${fmtCurrency(e.tax_withheld)} <span style="color:var(--text-faint)">(expected ${fmtCurrency(e.expected_tax)})</span></td>
        <td>${fmtPct(e.tax_diff_pct)}</td>
      </tr>
    `).join("");
  }

  // -------------------------------------------------------------------
  // Layer C — Forward cash forecaster
  // -------------------------------------------------------------------
  function renderCashForecastChart(cashForecast) {
    destroy("cashForecast");
    if (!cashForecast) return;
    const months = cashForecast.monthly_forecast.map(m => m.month);
    const ctx = document.getElementById("cashForecastChart");
    charts.cashForecast = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Ledger Expected", data: cashForecast.monthly_forecast.map(m => m.expected_amount), backgroundColor: COLORS.accent2, borderRadius: 6 },
          { label: "Risk-Adjusted Forecast", data: cashForecast.monthly_forecast.map(m => m.risk_adjusted_forecast), backgroundColor: COLORS.accent, borderRadius: 6 },
        ],
      },
      options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { position: "bottom" } } },
    });
    const note = document.getElementById("cashForecastNote");
    if (note) {
      note.textContent = `Risk-adjusted using the batch's own ${fmtPct(cashForecast.historical_match_rate_used_as_collection_probability)} historical match rate as a collection-probability haircut — not a flat assumption.`;
    }
  }

  // -------------------------------------------------------------------
  // Layer D — Recovery-settlement reconciler (ties back to lending model)
  // -------------------------------------------------------------------
  function renderRecoveryReconciliation(recovery) {
    const section = document.getElementById("recoveryReconciliationSection");
    if (!section) return;
    if (!recovery) {
      section.innerHTML = `<div class="mini-note">Run the batch loop above, or train the lending model first (agreements.csv not found).</div>`;
      return;
    }
    section.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:16px;">
        <div class="kpi-card">
          <div class="kpi-label">Match Rate (±${(recovery.tolerance_pct * 100).toFixed(0)}% tolerance)</div>
          <div class="kpi-value">${fmtPct(recovery.match_rate)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Agreements Checked</div>
          <div class="kpi-value">${recovery.total_agreements.toLocaleString("en-IN")}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Model Overestimated</div>
          <div class="kpi-value">${recovery.overestimate_count.toLocaleString("en-IN")}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Model Underestimated</div>
          <div class="kpi-value">${recovery.underestimate_count.toLocaleString("en-IN")}</div>
        </div>
      </div>
      <div class="mini-note" style="margin-bottom:10px;">Worst-matching segments (lowest agreement between predicted and actual settlement):</div>
      <div class="table-wrap" style="margin-bottom:16px;">
        <table>
          <thead><tr><th>Asset Model</th><th>Agreements</th><th>Match Rate</th><th>Avg Abs Diff %</th></tr></thead>
          <tbody>
            ${recovery.worst_segments.map(s => `
              <tr>
                <td>${s["Asset Model"]}</td>
                <td>${s.agreements}</td>
                <td>${fmtPct(s.match_rate)}</td>
                <td>${fmtPct(s.avg_abs_diff_pct)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="mini-note" style="margin-bottom:10px;">Top individual exceptions (largest model-vs-settlement gap):</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Agmt ID</th><th>Asset Model</th><th>Predicted</th><th>Actual</th><th>Diff %</th><th>Reason</th></tr></thead>
          <tbody>
            ${recovery.top_exceptions.slice(0, 10).map(e => `
              <tr>
                <td>${e["Agmt Id"]}</td>
                <td>${e["Asset Model"]}</td>
                <td>${fmtCurrency(e["Ensemble_Predicted_Sold_Amount"])}</td>
                <td>${fmtCurrency(e["Target Sold Amount At Liquidation"])}</td>
                <td>${fmtPct(e.diff_pct)}</td>
                <td><span class="badge ${e.reason.includes("over") ? "High" : "Medium"}">${e.reason.replace(/_/g, " ")}</span></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // -------------------------------------------------------------------
  // Settlement Q&A agent (chat)
  // -------------------------------------------------------------------
  function appendChatMessage(role, text, thinking = false) {
    const container = document.getElementById("financeChatMessages");
    if (!container) return null;
    const div = document.createElement("div");
    div.className = `msg ${role === "user" ? "user" : "bot"}${thinking ? " thinking" : ""}`;
    div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  async function sendFinanceChat(text) {
    if (!text || !text.trim()) return;
    appendChatMessage("user", text);
    chatHistory.push({ role: "user", content: text });
    const thinkingEl = appendChatMessage("bot", "checking the reconciliation results…", true);
    try {
      const res = await sendChat(text);
      thinkingEl.remove();
      appendChatMessage("bot", res.reply);
      chatHistory.push({ role: "assistant", content: res.reply });
      renderCapabilityChecklist(lastData || {});
    } catch (e) {
      thinkingEl.remove();
      appendChatMessage("bot", "Couldn't reach the Finance Controller backend. Make sure the Flask API is running.");
    }
  }

  function bindChatControls() {
    const input = document.getElementById("financeChatInput");
    const sendBtn = document.getElementById("financeChatSendBtn");
    if (!input || !sendBtn) return;
    sendBtn.addEventListener("click", () => { sendFinanceChat(input.value); input.value = ""; });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { sendFinanceChat(input.value); input.value = ""; }
    });
    document.querySelectorAll("#financeChatSuggestions .chip").forEach(chip => {
      chip.addEventListener("click", () => sendFinanceChat(chip.textContent));
    });
  }

  // -------------------------------------------------------------------
  // Top-level render + control flow
  // -------------------------------------------------------------------
  function renderAll(data) {
    lastData = data;
    if (!data.has_run) {
      renderCapabilityChecklist({});
      return;
    }
    renderHero(data.reconciliation);
    renderTape(data.reconciliation, data.tax_lines, data.recovery_reconciliation);
    renderBatchTable(data.reconciliation);
    renderExceptionBreakdown(data.reconciliation);
    renderTaxMatcherChart(data.tax_lines);
    renderTaxExceptionsTable(data.tax_lines);
    renderCashForecastChart(data.cash_forecast);
    renderRecoveryReconciliation(data.recovery_reconciliation);
    renderCapabilityChecklist(data);
  }

  async function loadCached() {
    try {
      const data = await fetchSummary();
      renderAll(data);
    } catch (e) {
      console.error("Finance Controller: failed to load cached summary", e);
    }
  }

  async function runBatchLoop() {
    const btn = document.getElementById("runBooksBtn");
    if (btn) { btn.disabled = true; btn.innerHTML = "Running batch loop… <span>⏳</span>"; }
    try {
      const data = await runBatch();
      renderAll(data);
    } catch (e) {
      alert("Batch run failed — check that the Flask backend is running and reachable.");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = "Run 50+ Record Batch Loop <span>⚡</span>"; }
    }
  }

  function bindControls() {
    const runBtn = document.getElementById("runBooksBtn");
    if (runBtn) runBtn.addEventListener("click", runBatchLoop);
    bindChatControls();
  }

  async function init() {
    bindControls();
    await loadCached();  // show last run immediately instead of sitting at "--"
  }

  return { init, runBatchLoop };
})();

// Auto-init when the Finance Controller nav item is opened (call this from
// app.js's view router, e.g.:  if (view === "finance") FinanceController.init();
// or simply call FinanceController.init() once on DOMContentLoaded if the
// view is always present in the DOM, as with the other views in this app).
document.addEventListener("DOMContentLoaded", () => {
  const navBtn = document.querySelector('.nav-item[data-view="finance"]');
  if (navBtn) {
    navBtn.addEventListener("click", () => FinanceController.init(), { once: true });
  }
});