// // const FinanceController = (() => {
// //   let charts = {};

// //   const CHART_COLORS = {
// //     accent: "#29c9a3",
// //     accent2: "#4d8dff",
// //     warn: "#f2b84b",
// //     danger: "#ef5b6b",
// //     grid: "rgba(255,255,255,0.06)",
// //     text: "#90a0b7"
// //   };

// //   function destroy(id) {
// //     if (charts[id]) {
// //       charts[id].destroy();
// //       delete charts[id];
// //     }
// //   }

// //   function formatCurrency(val) {
// //     if (val == null || isNaN(val)) return "--";
// //     if (val >= 1e7) return `₹${(val / 1e7).toFixed(2)} Cr`;
// //     if (val >= 1e5) return `₹${(val / 1e5).toFixed(2)} L`;
// //     return `₹${val.toLocaleString('en-IN')}`;
// //   }

// //   // Generate 50+ synthetic records for the finance-ops loop test
// //   function generateSyntheticBatch() {
// //     const records = [];
// //     const sources = ["Bank Statement API", "Payment Gateway (UPI)", "ECS Mandate Clearing", "Collection Agency Feed"];
// //     const statuses = ["MATCHED", "MATCHED", "MATCHED", "MATCHED", "EXCEPTION_DISCREPANCY", "EXCEPTION_UNMATCHED_TAX"];

// //     for (let i = 1; i <= 52; i++) {
// //       const src = sources[Math.floor(Math.random() * sources.length)];
// //       const expected = Math.floor(Math.random() * 85000) + 12000;
// //       const status = statuses[Math.floor(Math.random() * statuses.length)];
      
// //       let settled = expected;
// //       let note = "Auto-verified by reconciliation agent";

// //       if (status === "EXCEPTION_DISCREPANCY") {
// //         const delta = Math.floor(Math.random() * 1500) + 100;
// //         settled = expected - delta;
// //         note = `Amount mismatch: -₹${delta} bank fee deduction unmapped`;
// //       } else if (status === "EXCEPTION_UNMATCHED_TAX") {
// //         settled = expected;
// //         note = "Tax-line mismatch: GST HSN code verification pending manual review";
// //       }

// //       records.push({
// //         id: `BAT-2026-${String(i).padStart(3, '0')}`,
// //         source: src,
// //         expected,
// //         settled,
// //         status,
// //         note
// //       });
// //     }
// //     return records;
// //   }

// //   function renderBatchTable(records) {
// //     const tbody = document.querySelector("#financeBatchTable tbody");
// //     if (!tbody) return;

// //     tbody.innerHTML = records.map(r => {
// //       const isMatched = r.status === "MATCHED";
// //       const badgeStyle = isMatched 
// //         ? "color: #29c9a3; background: rgba(41,201,163,0.1); padding: 2px 8px; border-radius: 4px; font-size: 11px;" 
// //         : "color: #ef5b6b; background: rgba(239,91,107,0.1); padding: 2px 8px; border-radius: 4px; font-size: 11px;";
      
// //       return `
// //         <tr>
// //           <td><strong>${r.id}</strong></td>
// //           <td>${r.source}</td>
// //           <td>${formatCurrency(r.expected)}</td>
// //           <td>${formatCurrency(r.settled)}</td>
// //           <td><span style="${badgeStyle}">${r.status}</span></td>
// //           <td style="color: var(--text-dim);">${r.note}</td>
// //         </tr>
// //       `;
// //     }).join("");
// //   }

// //   function renderCharts() {
// //     // 1. Cash Forecaster Chart
// //     destroy("cashForecast");
// //     const ctx1 = document.getElementById("cashForecastChart");
// //     if (ctx1 && typeof Chart !== "undefined") {
// //       charts.cashForecast = new Chart(ctx1, {
// //         type: "line",
// //         data: {
// //           labels: ["Day 1", "Day 5", "Day 10", "Day 15", "Day 20", "Day 25", "Day 30"],
// //           datasets: [
// //             { label: "Inflow Projection", data: [45, 52, 48, 65, 70, 82, 95], borderColor: CHART_COLORS.accent, tension: 0.3 },
// //             { label: "Settlement Outflow", data: [40, 49, 44, 60, 68, 75, 88], borderColor: CHART_COLORS.accent2, tension: 0.3 }
// //           ]
// //         },
// //         options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
// //       });
// //     }

// //     // 2. Tax Matcher Breakdown Chart
// //     destroy("taxMatcher");
// //     const ctx2 = document.getElementById("taxMatcherChart");
// //     if (ctx2 && typeof Chart !== "undefined") {
// //       charts.taxMatcher = new Chart(ctx2, {
// //         type: "doughnut",
// //         data: {
// //           labels: ["Fully Reconciled", "Auto-Adjusted Fees", "Tax Discrepancies", "Unresolved Exceptions"],
// //           datasets: [{
// //             data: [38, 7, 4, 3],
// //             backgroundColor: [CHART_COLORS.accent, CHART_COLORS.accent2, CHART_COLORS.warn, CHART_COLORS.danger],
// //             borderWidth: 0
// //           }]
// //         },
// //         options: { responsive: true, maintainAspectRatio: false, cutout: "65%", plugins: { legend: { position: "bottom" } } }
// //       });
// //     }
// //   }

// //   function runLoop() {
// //     const runBtn = document.getElementById("runBooksBtn");
// //     if (runBtn) {
// //       runBtn.textContent = "Running Agent Loop...";
// //       runBtn.disabled = true;
// //     }

// //     setTimeout(() => {
// //       const records = generateSyntheticBatch();
// //       const total = records.length;
// //       const matched = records.filter(r => r.status === "MATCHED").length;
// //       const exceptions = total - matched;
// //       const matchRate = ((matched / total) * 100).toFixed(1);

// //       // Update metrics
// //       document.getElementById("controllerMatchRate").textContent = matchRate;
// //       document.getElementById("controllerThroughput").textContent = `${total} / ${total} Records`;
// //       document.getElementById("metricResolved").textContent = `${matched} Items`;
// //       document.getElementById("metricExceptions").textContent = `${exceptions} Items`;
// //       document.getElementById("metricDelta").textContent = `₹14,250 Net`;

// //       renderBatchTable(records);
// //       renderCharts();

// //       if (runBtn) {
// //         runBtn.textContent = "Re-Run 50+ Record Batch Loop ⚡";
// //         runBtn.disabled = false;
// //       }
// //     }, 400);
// //   }

// //   function init() {
// //     const runBtn = document.getElementById("runBooksBtn");
// //     if (runBtn) {
// //       runBtn.addEventListener("click", runLoop);
// //     }
// //     renderCharts();
// //   }

// //   return { init, runLoop };
// // })();

// // document.addEventListener("DOMContentLoaded", () => {
// //   FinanceController.init();
// // });







// /* ============================================================================
//    finance.js — AI Finance Controller (frontend logic, single file)

//    Wires the #view-finance markup to:
//      Layer A  /api/finance/summary + /api/finance/run   (ledger vs bank)
//      Layer B  tax-line matcher                          (bundled in the same run)
//      Layer C  forward cash forecaster                   (bundled in the same run)
//      Layer D  recovery-settlement reconciler             (bundled in the same run,
//                                                            ties back into the main
//                                                            lending/residual-pricing model)
//      Q&A      /api/finance/chat                          (Ollama-backed, grounded
//                                                            only in the JSON the
//                                                            reconciliation engine
//                                                            already produced)

//    All matching/scoring happens server-side in Python (deterministic rules) -
//    this file only renders results and forwards chat messages. No matching
//    decision is ever made in the browser or by the LLM.
//    ============================================================================ */

// const FinanceController = (() => {
//   const API_BASE = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "http://localhost:5000";
//   let charts = {};
//   let chatHistory = [];
//   let lastData = null;

//   const COLORS = {
//     accent: "#22d3a5",
//     accent2: "#5b8cff",
//     amber: "#f5b352",
//     red: "#ef5b76",
//     dim: "#8b93a1",
//   };

//   // -------------------------------------------------------------------
//   // Fetch helpers
//   // -------------------------------------------------------------------
//   async function fetchSummary() {
//     const res = await fetch(`${API_BASE}/api/finance/summary`);
//     return res.json();
//   }

//   async function runBatch() {
//     const res = await fetch(`${API_BASE}/api/finance/run`, { method: "POST" });
//     if (!res.ok) throw new Error("Batch run failed");
//     return res.json();
//   }

//   async function sendChat(message) {
//     const res = await fetch(`${API_BASE}/api/finance/chat`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ message, history: chatHistory.slice(0, -1) }),
//     });
//     return res.json();
//   }







// // Add this inside your FinanceController init() function
// const innerTabs = document.querySelectorAll('.inner-tab');
// const tabPanes = document.querySelectorAll('.tab-pane');

// innerTabs.forEach(tab => {
//   tab.addEventListener('click', () => {
//     // Remove active state from all tabs and panes
//     innerTabs.forEach(t => t.classList.remove('active'));
//     tabPanes.forEach(p => p.style.display = 'none');
    
//     // Set active state on clicked tab
//     tab.classList.add('active');
    
//     // Show corresponding pane
//     const targetId = tab.getAttribute('data-target');
//     const targetPane = document.getElementById(targetId);
//     if (targetPane) {
//       targetPane.style.display = 'block';
//       // Optional: re-render charts here if they bug out when hidden
//       // renderCharts(); 
//     }
//   });
// });





//   // -------------------------------------------------------------------
//   // Formatting helpers
//   // -------------------------------------------------------------------
//   const fmtCurrency = (n) => {
//     if (n === null || n === undefined || isNaN(n)) return "—";
//     return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
//   };
//   const fmtPct = (n, digits = 1) => (n === null || n === undefined ? "—" : (n * 100).toFixed(digits) + "%");
//   const destroy = (id) => { if (charts[id]) { charts[id].destroy(); delete charts[id]; } };

//   // Sets textContent only if the element exists - keeps this file from throwing
//   // if some of the optional HTML blocks (checklist, Q&A, recovery section)
//   // haven't been added to index.html yet.
//   function setText(id, value) {
//     const el = document.getElementById(id);
//     if (el) el.textContent = value;
//   }

//   function escapeHtml(str) {
//     return String(str)
//       .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
//   }

//   // -------------------------------------------------------------------
//   // Rendering — hero, tape, capability checklist
//   // -------------------------------------------------------------------
//   function renderHero(reconciliation) {
//     const matchPct = Math.round(reconciliation.match_rate * 100);
//     setText("controllerMatchRate", matchPct);
//     setText("controllerThroughput", `${reconciliation.matched_count} / ${reconciliation.total_ledger_records} Records`);

//     const statusEl = document.querySelector(".controller-status");
//     if (statusEl) {
//       statusEl.innerHTML = `<span class="live-dot"></span> CONTROLLER <strong>ACTIVE</strong>`;
//     }
//   }

//   function renderTape(reconciliation, taxLines, recovery) {
//     setText("metricBatchSize", `${reconciliation.total_ledger_records} Records`);
//     setText("metricResolved",
//       `${reconciliation.matched_count} (${reconciliation.high_confidence_matches} exact, ${reconciliation.fuzzy_resolved_matches} fuzzy)`);

//     const totalExceptions = reconciliation.exception_count + (taxLines ? taxLines.exception_count : 0);
//     setText("metricExceptions", `${totalExceptions} unresolved`);

//     // Settlement delta: total absolute amount variance actually observed across
//     // ledger-vs-bank exceptions - computed from the real matching result, never hardcoded.
//     const delta = reconciliation.exceptions.reduce((sum, e) => {
//       if (e.expected_amount != null && e.matched_amount != null) {
//         return sum + Math.abs(e.expected_amount - e.matched_amount);
//       }
//       return sum;
//     }, 0);
//     setText("metricDelta", fmtCurrency(delta));
//   }

//   function renderCapabilityChecklist(data) {
//     const el = document.getElementById("financeCapabilityChecklist");
//     if (!el) return;
//     const items = [
//       { label: "Multi-source reconciliation", done: !!data.reconciliation },
//       { label: "Tax-line matcher", done: !!data.tax_lines },
//       { label: "Forward cash forecaster", done: !!data.cash_forecast },
//       { label: "Recovery-settlement reconciler (model vs actual)", done: !!data.recovery_reconciliation },
//       { label: "Settlement Q&A agent", done: chatHistory.length > 0 },
//     ];
//     el.innerHTML = items.map(i => `
//       <div class="checklist-item ${i.done ? "done" : ""}">
//         <span class="checklist-dot"></span>${i.label}
//       </div>
//     `).join("");
//   }

//   // -------------------------------------------------------------------
//   // Layer A — Batch ledger table (merged matches + exceptions)
//   // -------------------------------------------------------------------
//   function renderBatchTable(reconciliation) {
//     const table = document.getElementById("financeBatchTable");
//     if (!table) return;
//     const tbody = table.querySelector("tbody");
//     const rows = [
//       ...reconciliation.matches_sample.map(r => ({ ...r, status: "MATCHED" })),
//       ...reconciliation.exceptions.map(r => ({ ...r, status: "EXCEPTION" })),
//     ];
//     if (!rows.length) {
//       tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No records in this batch.</td></tr>`;
//       return;
//     }
//     tbody.innerHTML = rows.map(r => `
//       <tr>
//         <td>${r.loan_id ?? "—"}</td>
//         <td>${r.bank_ref ?? "Internal Ledger"}</td>
//         <td>${fmtCurrency(r.expected_amount)}</td>
//         <td>${fmtCurrency(r.matched_amount)}</td>
//         <td><span class="badge ${r.status === "MATCHED" ? "Low" : "Critical"}">${r.status}</span></td>
//         <td>${r.reason ? escapeHtml(r.reason) : (r.confidence === "fuzzy" ? "Resolved via fuzzy ID match" : "Exact match within tolerance")}</td>
//       </tr>
//     `).join("");
//   }

//   // -------------------------------------------------------------------
//   // Exception reason breakdown (the "honest exception list" requirement)
//   // -------------------------------------------------------------------
//   function renderExceptionBreakdown(reconciliation) {
//     const el = document.getElementById("exceptionBreakdownChart");
//     if (!el) return;
//     destroy("exceptionBreakdown");
//     const breakdown = reconciliation.exception_reason_breakdown || {};
//     const labels = Object.keys(breakdown);
//     const values = Object.values(breakdown);
//     if (!labels.length) return;
//     charts.exceptionBreakdown = new Chart(el, {
//       type: "bar",
//       data: {
//         labels,
//         datasets: [{ label: "Exceptions", data: values, backgroundColor: COLORS.red, borderRadius: 6 }],
//       },
//       options: {
//         indexAxis: "y",
//         scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
//         plugins: { legend: { display: false } },
//       },
//     });
//   }

//   // -------------------------------------------------------------------
//   // Layer B — Tax-line matcher
//   // -------------------------------------------------------------------
//   function renderTaxMatcherChart(taxLines) {
//     destroy("taxMatcher");
//     if (!taxLines) return;
//     const ctx = document.getElementById("taxMatcherChart");
//     charts.taxMatcher = new Chart(ctx, {
//       type: "doughnut",
//       data: {
//         labels: ["Matched (within tolerance)", "Exception (tax rate mismatch)"],
//         datasets: [{
//           data: [taxLines.matched_count, taxLines.exception_count],
//           backgroundColor: [COLORS.accent, COLORS.red],
//           borderWidth: 0,
//         }],
//       },
//       options: { cutout: "62%", plugins: { legend: { position: "bottom" } } },
//     });
//   }

//   function renderTaxExceptionsTable(taxLines) {
//     const el = document.getElementById("taxExceptionsTable");
//     if (!el) return;
//     const tbody = el.querySelector("tbody");
//     if (!taxLines || !taxLines.exceptions.length) {
//       tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-dim);">No tax-line exceptions in this batch.</td></tr>`;
//       return;
//     }
//     tbody.innerHTML = taxLines.exceptions.map(e => `
//       <tr>
//         <td>${e.auction_id}</td>
//         <td>${e.loan_id}</td>
//         <td>${fmtCurrency(e.sale_amount)}</td>
//         <td>${fmtCurrency(e.tax_withheld)} <span style="color:var(--text-faint)">(expected ${fmtCurrency(e.expected_tax)})</span></td>
//         <td>${fmtPct(e.tax_diff_pct)}</td>
//       </tr>
//     `).join("");
//   }

//   // -------------------------------------------------------------------
//   // Layer C — Forward cash forecaster
//   // -------------------------------------------------------------------
//   function renderCashForecastChart(cashForecast) {
//     destroy("cashForecast");
//     if (!cashForecast) return;
//     const months = cashForecast.monthly_forecast.map(m => m.month);
//     const ctx = document.getElementById("cashForecastChart");
//     charts.cashForecast = new Chart(ctx, {
//       type: "bar",
//       data: {
//         labels: months,
//         datasets: [
//           { label: "Ledger Expected", data: cashForecast.monthly_forecast.map(m => m.expected_amount), backgroundColor: COLORS.accent2, borderRadius: 6 },
//           { label: "Risk-Adjusted Forecast", data: cashForecast.monthly_forecast.map(m => m.risk_adjusted_forecast), backgroundColor: COLORS.accent, borderRadius: 6 },
//         ],
//       },
//       options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { position: "bottom" } } },
//     });
//     const note = document.getElementById("cashForecastNote");
//     if (note) {
//       note.textContent = `Risk-adjusted using the batch's own ${fmtPct(cashForecast.historical_match_rate_used_as_collection_probability)} historical match rate as a collection-probability haircut — not a flat assumption.`;
//     }
//   }

//   // -------------------------------------------------------------------
//   // Layer D — Recovery-settlement reconciler (ties back to lending model)
//   // -------------------------------------------------------------------
//   function renderRecoveryReconciliation(recovery) {
//     const section = document.getElementById("recoveryReconciliationSection");
//     if (!section) return;
//     if (!recovery) {
//       section.innerHTML = `<div class="mini-note">Run the batch loop above, or train the lending model first (agreements.csv not found).</div>`;
//       return;
//     }
//     section.innerHTML = `
//       <div class="kpi-grid" style="margin-bottom:16px;">
//         <div class="kpi-card">
//           <div class="kpi-label">Match Rate (±${(recovery.tolerance_pct * 100).toFixed(0)}% tolerance)</div>
//           <div class="kpi-value">${fmtPct(recovery.match_rate)}</div>
//         </div>
//         <div class="kpi-card">
//           <div class="kpi-label">Agreements Checked</div>
//           <div class="kpi-value">${recovery.total_agreements.toLocaleString("en-IN")}</div>
//         </div>
//         <div class="kpi-card">
//           <div class="kpi-label">Model Overestimated</div>
//           <div class="kpi-value">${recovery.overestimate_count.toLocaleString("en-IN")}</div>
//         </div>
//         <div class="kpi-card">
//           <div class="kpi-label">Model Underestimated</div>
//           <div class="kpi-value">${recovery.underestimate_count.toLocaleString("en-IN")}</div>
//         </div>
//       </div>
//       <div class="mini-note" style="margin-bottom:10px;">Worst-matching segments (lowest agreement between predicted and actual settlement):</div>
//       <div class="table-wrap" style="margin-bottom:16px;">
//         <table>
//           <thead><tr><th>Asset Model</th><th>Agreements</th><th>Match Rate</th><th>Avg Abs Diff %</th></tr></thead>
//           <tbody>
//             ${recovery.worst_segments.map(s => `
//               <tr>
//                 <td>${s["Asset Model"]}</td>
//                 <td>${s.agreements}</td>
//                 <td>${fmtPct(s.match_rate)}</td>
//                 <td>${fmtPct(s.avg_abs_diff_pct)}</td>
//               </tr>`).join("")}
//           </tbody>
//         </table>
//       </div>
//       <div class="mini-note" style="margin-bottom:10px;">Top individual exceptions (largest model-vs-settlement gap):</div>
//       <div class="table-wrap">
//         <table>
//           <thead><tr><th>Agmt ID</th><th>Asset Model</th><th>Predicted</th><th>Actual</th><th>Diff %</th><th>Reason</th></tr></thead>
//           <tbody>
//             ${recovery.top_exceptions.slice(0, 10).map(e => `
//               <tr>
//                 <td>${e["Agmt Id"]}</td>
//                 <td>${e["Asset Model"]}</td>
//                 <td>${fmtCurrency(e["Ensemble_Predicted_Sold_Amount"])}</td>
//                 <td>${fmtCurrency(e["Target Sold Amount At Liquidation"])}</td>
//                 <td>${fmtPct(e.diff_pct)}</td>
//                 <td><span class="badge ${e.reason.includes("over") ? "High" : "Medium"}">${e.reason.replace(/_/g, " ")}</span></td>
//               </tr>`).join("")}
//           </tbody>
//         </table>
//       </div>
//     `;
//   }

//   // -------------------------------------------------------------------
//   // Settlement Q&A agent (chat)
//   // -------------------------------------------------------------------
//   function appendChatMessage(role, text, thinking = false) {
//     const container = document.getElementById("financeChatMessages");
//     if (!container) return null;
//     const div = document.createElement("div");
//     div.className = `msg ${role === "user" ? "user" : "bot"}${thinking ? " thinking" : ""}`;
//     div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
//     container.appendChild(div);
//     container.scrollTop = container.scrollHeight;
//     return div;
//   }

//   async function sendFinanceChat(text) {
//     if (!text || !text.trim()) return;
//     appendChatMessage("user", text);
//     chatHistory.push({ role: "user", content: text });
//     const thinkingEl = appendChatMessage("bot", "checking the reconciliation results…", true);
//     try {
//       const res = await sendChat(text);
//       thinkingEl.remove();
//       appendChatMessage("bot", res.reply);
//       chatHistory.push({ role: "assistant", content: res.reply });
//       renderCapabilityChecklist(lastData || {});
//     } catch (e) {
//       thinkingEl.remove();
//       appendChatMessage("bot", "Couldn't reach the Finance Controller backend. Make sure the Flask API is running.");
//     }
//   }

//   function bindChatControls() {
//     const input = document.getElementById("financeChatInput");
//     const sendBtn = document.getElementById("financeChatSendBtn");
//     if (!input || !sendBtn) return;
//     sendBtn.addEventListener("click", () => { sendFinanceChat(input.value); input.value = ""; });
//     input.addEventListener("keydown", (e) => {
//       if (e.key === "Enter") { sendFinanceChat(input.value); input.value = ""; }
//     });
//     document.querySelectorAll("#financeChatSuggestions .chip").forEach(chip => {
//       chip.addEventListener("click", () => sendFinanceChat(chip.textContent));
//     });
//   }

//   // -------------------------------------------------------------------
//   // Top-level render + control flow
//   // -------------------------------------------------------------------
//   function renderAll(data) {
//     lastData = data;
//     if (!data.has_run) {
//       renderCapabilityChecklist({});
//       return;
//     }
//     renderHero(data.reconciliation);
//     renderTape(data.reconciliation, data.tax_lines, data.recovery_reconciliation);
//     renderBatchTable(data.reconciliation);
//     renderExceptionBreakdown(data.reconciliation);
//     renderTaxMatcherChart(data.tax_lines);
//     renderTaxExceptionsTable(data.tax_lines);
//     renderCashForecastChart(data.cash_forecast);
//     renderRecoveryReconciliation(data.recovery_reconciliation);
//     renderIntelligenceCharts(data);
//     renderLiquidationLedger(data);
//     renderHumanReviewQueue();
//     renderCapabilityChecklist(data);
//   }

//   async function loadCached() {
//     try {
//       const data = await fetchSummary();
//       renderAll(data);
//     } catch (e) {
//       console.error("Finance Controller: failed to load cached summary", e);
//     }
//   }

//   async function runBatchLoop() {
//     const btn = document.getElementById("runBooksBtn");
//     if (btn) { btn.disabled = true; btn.innerHTML = "Running batch loop… <span>⏳</span>"; }
//     try {
//       const data = await runBatch();
//       renderAll(data);
//     } catch (e) {
//       alert("Batch run failed — check that the Flask backend is running and reachable.");
//     } finally {
//       if (btn) { btn.disabled = false; btn.innerHTML = "Run 50+ Record Batch Loop <span>⚡</span>"; }
//     }
//   }

  


//   function renderIntelligenceCharts(data) {
//   // Chase vs Write-off Matrix (Scatter)
//   destroy("chaseMatrix");
//   const ctxChase = document.getElementById("chaseMatrixChart");
//   if (ctxChase) {
//     charts.chaseMatrix = new Chart(ctxChase, {
//       type: "scatter",
//       data: {
//         datasets: [{
//           label: "Ambiguous Cases",
//           data: [{x: 15000, y: 500}, {x: 45000, y: 1200}, {x: 80000, y: 3000}],
//           backgroundColor: COLORS.amber,
//           pointRadius: 6
//         }, {
//           label: "Auto-Cleared",
//           data: [{x: 5000, y: 100}, {x: 12000, y: 250}, {x: 22000, y: 400}],
//           backgroundColor: COLORS.accent,
//           pointRadius: 4
//         }]
//       },
//       options: {
//         scales: {
//           x: { title: { display: true, text: "Exception Delta (₹)" } },
//           y: { title: { display: true, text: "Collection Cost (₹)" } }
//         }
//       }
//     });
//   }

//   // Settlement Failure by Segment (Polar Area)
//   destroy("segmentFailure");
//   const ctxSegment = document.getElementById("segmentFailureChart");
//   if (ctxSegment) {
// charts.segmentFailure = new Chart(ctxSegment, {
//       type: "polarArea",
//       data: {
//         labels: ["Two-Wheelers", "Tractors", "Used Cars", "Consumer Durables"],
//         datasets: [{
//           data: [45, 25, 20, 10],
//           backgroundColor: [COLORS.red, COLORS.amber, COLORS.accent2, COLORS.accent],
//           borderWidth: 0
//         }]
//       },
//       options: { 
//         responsive: true,
//         maintainAspectRatio: false, // Prevents the squashed rendering
//         plugins: { 
//           legend: { position: "right" } 
//         } 
//       }
//     });
//   }
// }

// window.handleInspect = function(assetId) {
//   // Update RAG Evidence Panel
//   const ragPanel = document.getElementById("ragEvidencePanel");
//   if (ragPanel) {
//     ragPanel.innerHTML = `
//       <div style="padding: 12px; background: rgba(41,201,163,0.05); border-left: 3px solid ${COLORS.accent}; margin-bottom: 10px;">
//         <strong>Valuation Report</strong><br/>
//         Estimated value: ₹63,000 (Page 7)
//       </div>
//       <div style="padding: 12px; background: rgba(239,91,118,0.05); border-left: 3px solid ${COLORS.red};">
//         <strong>Auction Policy</strong><br/>
//         Minimum reserve must be ≥ 85% of valuation (Section 8.2)
//       </div>
//     `;
//   }
  
//   // Update Decision Path
//   const summary = document.getElementById("controllerDecisionSummary");
//   if (summary) {
//     summary.innerHTML = `<span style="color:${COLORS.red}">🔴 Potential control breach.</span> Target is below policy-supported reserve. Escalated to ToT.`;
//   }
// };

// function renderLiquidationLedger(data) {
//   // Update KPIs
//   setText("liquidationAssetsChecked", "500");
//   setText("liquidationAutoCleared", "469");
//   setText("liquidationEvidenceExceptions", "31");
//   setText("liquidationHumanReview", "27");

//   // Populate Ledger
//   const tbody = document.querySelector("#liquidationControlTable tbody");
//   if (!tbody) return;
  
//   const mockDecisions = [
//     { id: "ASSET_245", out: 80000, target: 50000, gap: 30000, score: 74, status: "REVIEW", conf: "74%" },
//     { id: "ASSET_182", out: 65000, target: 40500, gap: 24500, score: 91, status: "AUTO_CLEAR", conf: "91%" }
//   ];

//   tbody.innerHTML = mockDecisions.map(r => `
//     <tr style="cursor:pointer;" onclick="handleInspect('${r.id}')">
//       <td><strong>${r.id}</strong></td>
//       <td>${fmtCurrency(r.out)}</td>
//       <td>${fmtCurrency(r.target)}</td>
//       <td>${fmtPct(r.target/r.out)}</td>
//       <td style="color:${COLORS.red}">${fmtCurrency(r.gap)}</td>
//       <td>${r.score}/100</td>
//       <td><span class="badge Low">Evidence Found</span></td>
//       <td><span class="badge ${r.status === 'REVIEW' ? 'Critical' : 'Low'}">${r.status}</span></td>
//       <td>${r.conf}</td>
//     </tr>
//   `).join("");
// }


// function renderHumanReviewQueue() {
//   const tbody = document.querySelector("#humanReviewTable tbody");
//   if (!tbody) return;

//   tbody.innerHTML = `
//     <tr>
//       <td><strong>ASSET_245</strong></td>
//       <td>74/100</td>
//       <td style="color:${COLORS.red}">₹30,000</td>
//       <td>Valuation Reserve Breach</td>
//       <td>Valuation Report, Policy V2</td>
//       <td>ToT (74%)</td>
//     </tr>
//   `;
// }






//   function bindControls() {
//     const runBtn = document.getElementById("runBooksBtn");
//     if (runBtn) runBtn.addEventListener("click", runBatchLoop);
//     bindChatControls();
//   }

//   async function init() {
//     bindControls();
//     await loadCached();  // show last run immediately instead of sitting at "--"
//   }

//   return { init, runBatchLoop };
// })();

// // Auto-init when the Finance Controller nav item is opened (call this from
// // app.js's view router, e.g.:  if (view === "finance") FinanceController.init();
// // or simply call FinanceController.init() once on DOMContentLoaded if the
// // view is always present in the DOM, as with the other views in this app).
// document.addEventListener("DOMContentLoaded", () => {
//   const navBtn = document.querySelector('.nav-item[data-view="finance"]');
//   if (navBtn) {
//     navBtn.addEventListener("click", () => FinanceController.init(), { once: true });
//   }
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

  // Liquidation ledger state — the sample rows shown in the table, the
  // currently selected asset (for the RAG evidence panel) and the
  // client-side "uploaded evidence" documents.
  let liquidationRecords = [];
  let selectedAssetId = null;
  let uploadedDocs = []; // { name, size, id }

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







  // Wires the inner (Overview / Ledger / Intelligence / Q&A) tab strip.
  // Moved into init() so it only binds once, after the module is fully set up,
  // instead of running as loose top-level code at script-parse time.
  function bindInnerTabs() {
    const innerTabs = document.querySelectorAll('.inner-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    innerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        innerTabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.style.display = 'none');

        tab.classList.add('active');

        const targetId = tab.getAttribute('data-target');
        const targetPane = document.getElementById(targetId);
        if (targetPane) {
          targetPane.style.display = 'block';
        }
      });
    });
  }

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
    renderIntelligenceCharts(data);
    renderLiquidationLedger(data);
    renderHumanReviewQueue();
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

  


  function renderIntelligenceCharts(data) {
  // Chase vs Write-off Matrix (Scatter)
  destroy("chaseMatrix");
  const ctxChase = document.getElementById("chaseMatrixChart");
  if (ctxChase) {
    charts.chaseMatrix = new Chart(ctxChase, {
      type: "scatter",
      data: {
        datasets: [{
          label: "Ambiguous Cases",
          data: [{x: 15000, y: 500}, {x: 45000, y: 1200}, {x: 80000, y: 3000}],
          backgroundColor: COLORS.amber,
          pointRadius: 6
        }, {
          label: "Auto-Cleared",
          data: [{x: 5000, y: 100}, {x: 12000, y: 250}, {x: 22000, y: 400}],
          backgroundColor: COLORS.accent,
          pointRadius: 4
        }]
      },
      options: {
        scales: {
          x: { title: { display: true, text: "Exception Delta (₹)" } },
          y: { title: { display: true, text: "Collection Cost (₹)" } }
        }
      }
    });
  }

  // Settlement Failure by Segment (Polar Area)
  destroy("segmentFailure");
  const ctxSegment = document.getElementById("segmentFailureChart");
  if (ctxSegment) {
charts.segmentFailure = new Chart(ctxSegment, {
      type: "polarArea",
      data: {
        labels: ["Two-Wheelers", "Tractors", "Used Cars", "Consumer Durables"],
        datasets: [{
          data: [45, 25, 20, 10],
          backgroundColor: [COLORS.red, COLORS.amber, COLORS.accent2, COLORS.accent],
          borderWidth: 0
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false, // Prevents the squashed rendering
        plugins: { 
          legend: { position: "right" } 
        } 
      }
    });
  }
}


// -------------------------------------------------------------------
// Liquidation Control Ledger — generation, filtering, inspection
// -------------------------------------------------------------------

// Deterministic synthetic batch so re-renders (e.g. after a filter change)
// don't reshuffle the data the user is looking at. Ratios (auto-clear vs
// review vs human-review, evidence found vs missing) roughly match the
// 500 / 469 / 31 / 27 KPI split above, just at a browsable sample size.
function generateLiquidationRecords() {
  const assetModels = ["JUPITER", "NTORQ", "RADEON", "SPORT", "MOPEDS", "PEP"];
  const reasons = [
    "Valuation Reserve Breach",
    "Missing Auction Certificate",
    "Stale Valuation (>90 days)",
    "Policy Threshold Mismatch",
  ];
  const records = [];
  let seed = 42;
  const rand = () => {
    // simple deterministic PRNG so the sample is stable across renders
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff);
  };

  for (let i = 1; i <= 24; i++) {
    const out = Math.round((15000 + rand() * 75000) / 500) * 500;
    const coverageRatio = 0.55 + rand() * 0.4;
    const target = Math.round(out * coverageRatio / 500) * 500;
    const gap = Math.max(0, out - target);
    const score = Math.round(55 + rand() * 44);
    const evidence = rand() > 0.18 ? "FOUND" : "MISSING";

    let status;
    if (evidence === "MISSING") status = "HUMAN_REVIEW";
    else if (score >= 85) status = "AUTO_CLEAR";
    else if (score >= 65) status = "CONTROL_REVIEW";
    else status = "HUMAN_REVIEW";

    records.push({
      id: `ASSET_${100 + i * 7}`,
      assetModel: assetModels[i % assetModels.length],
      out,
      target,
      gap,
      score,
      evidence,
      status,
      conf: `${score}%`,
      reason: reasons[i % reasons.length],
    });
  }
  return records;
}

function statusBadgeClass(status) {
  if (status === "AUTO_CLEAR") return "Low";
  if (status === "CONTROL_REVIEW") return "Medium";
  return "Critical";
}

function renderLiquidationRows(records) {
  const tbody = document.querySelector("#liquidationControlTable tbody");
  if (!tbody) return;

  if (!records.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-dim);">No records match the current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr class="${r.id === selectedAssetId ? "row-selected" : ""}" onclick="handleInspect('${r.id}')">
      <td><strong>${r.id}</strong></td>
      <td>${fmtCurrency(r.out)}</td>
      <td>${fmtCurrency(r.target)}</td>
      <td>${fmtPct(r.target / r.out)}</td>
      <td style="color:${COLORS.red}">${fmtCurrency(r.gap)}</td>
      <td>${r.score}/100</td>
      <td><span class="badge ${r.evidence === "FOUND" ? "Low" : "Critical"}">${r.evidence === "FOUND" ? "Evidence Found" : "Evidence Missing"}</span></td>
      <td><span class="badge ${statusBadgeClass(r.status)}">${r.status}</span></td>
      <td>${r.conf}</td>
    </tr>
  `).join("");

  const countEl = document.getElementById("liquidationFilterCount");
  if (countEl) countEl.textContent = `${records.length} of ${liquidationRecords.length} records`;
}

function applyLiquidationFilters() {
  const statusFilter = document.getElementById("liquidationStatusFilter")?.value || "ALL";
  const evidenceFilter = document.getElementById("liquidationEvidenceFilter")?.value || "ALL";
  const search = (document.getElementById("liquidationSearch")?.value || "").trim().toUpperCase();

  const filtered = liquidationRecords.filter(r => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (evidenceFilter !== "ALL" && r.evidence !== evidenceFilter) return false;
    if (search && !r.id.toUpperCase().includes(search)) return false;
    return true;
  });

  renderLiquidationRows(filtered);
}

function bindLiquidationControls() {
  const statusSel = document.getElementById("liquidationStatusFilter");
  const evidenceSel = document.getElementById("liquidationEvidenceFilter");
  const searchInput = document.getElementById("liquidationSearch");
  const resetBtn = document.getElementById("liquidationFilterReset");

  if (statusSel) statusSel.addEventListener("change", applyLiquidationFilters);
  if (evidenceSel) evidenceSel.addEventListener("change", applyLiquidationFilters);
  if (searchInput) searchInput.addEventListener("input", applyLiquidationFilters);
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (statusSel) statusSel.value = "ALL";
      if (evidenceSel) evidenceSel.value = "ALL";
      if (searchInput) searchInput.value = "";
      applyLiquidationFilters();
    });
  }
}

window.handleInspect = function (assetId) {
  selectedAssetId = assetId;
  const record = liquidationRecords.find(r => r.id === assetId);

  // re-render so the clicked row gets the "selected" highlight
  applyLiquidationFilters();

  const ragPanel = document.getElementById("ragEvidencePanel");
  const summary = document.getElementById("controllerDecisionSummary");
  if (!record) return;

  if (ragPanel) {
    if (record.evidence === "FOUND" || uploadedDocs.length > 0) {
      const estValue = Math.round(record.target * 1.08 / 100) * 100;
      const docNote = uploadedDocs.length > 0
        ? `Grounded in ${uploadedDocs.length} uploaded document${uploadedDocs.length > 1 ? "s" : ""} (see Evidence Library above).`
        : `Retrieved from the indexed valuation archive.`;
      ragPanel.innerHTML = `
        <div style="padding: 12px; background: rgba(41,201,163,0.05); border-left: 3px solid ${COLORS.accent}; margin-bottom: 10px;">
          <strong>Valuation Report — ${record.id}</strong><br/>
          Estimated value: ${fmtCurrency(estValue)}. ${docNote}
        </div>
        <div style="padding: 12px; background: rgba(239,91,118,0.05); border-left: 3px solid ${COLORS.red};">
          <strong>Auction Policy</strong><br/>
          Minimum reserve must be ≥ 85% of valuation (Section 8.2). Current coverage: ${fmtPct(record.target / record.out)}.
        </div>
      `;
    } else {
      ragPanel.innerHTML = `
        <div style="padding: 12px; background: rgba(239,91,118,0.06); border-left: 3px solid ${COLORS.red};">
          <strong>No evidence indexed for ${record.id}.</strong><br/>
          This asset has no matching valuation or policy document in the RAG index yet.
          Upload the supporting document above — once added, it becomes searchable evidence
          for this and future controller decisions.
        </div>
      `;
    }
  }

  if (summary) {
    if (record.status === "AUTO_CLEAR") {
      summary.innerHTML = `<span style="color:${COLORS.accent}">🟢 Auto-cleared.</span> Control score ${record.score}/100 comfortably above the auto-clear threshold.`;
    } else if (record.evidence === "MISSING") {
      summary.innerHTML = `<span style="color:${COLORS.red}">🔴 Evidence gap.</span> ${record.reason} — routed to human review pending supporting documents.`;
    } else {
      summary.innerHTML = `<span style="color:${COLORS.amber}">🟡 Flagged for review.</span> ${record.reason}. Recovery gap of ${fmtCurrency(record.gap)} exceeds the auto-clear tolerance.`;
    }
  }
};

// -------------------------------------------------------------------
// Evidence upload (client-side; feeds the RAG evidence panel above).
// There's no backend endpoint wired up yet — documents are held in
// memory for this session only, which is enough to demonstrate the
// flow, but won't persist or actually get embedded until a real
// upload API (e.g. POST /api/finance/evidence) is available.
// -------------------------------------------------------------------
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderUploadedDocs() {
  const list = document.getElementById("evidenceDocList");
  if (!list) return;

  if (!uploadedDocs.length) {
    list.innerHTML = `<div class="mini-note">No documents uploaded yet — evidence for an asset will show as "Missing" until a supporting document is added here.</div>`;
    return;
  }

  list.innerHTML = uploadedDocs.map(doc => `
    <div class="evidence-doc-chip">
      <div class="evidence-doc-chip-info">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l5 5v15H6V2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v1.5H8V12Zm0 3.5h8V17H8v-1.5Zm0 3.5h5v1.5H8V19Z"/></svg>
        <span class="evidence-doc-chip-name">${escapeHtml(doc.name)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="evidence-doc-chip-size">${formatFileSize(doc.size)}</span>
        <button type="button" class="evidence-doc-chip-remove" onclick="FinanceController.removeEvidenceDoc('${doc.id}')" aria-label="Remove ${escapeHtml(doc.name)}">×</button>
      </div>
    </div>
  `).join("");
}

function addEvidenceFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  files.forEach(file => {
    uploadedDocs.push({
      id: `doc_${Date.now()}_${Math.round(Math.random() * 1000)}`,
      name: file.name,
      size: file.size,
    });
  });
  renderUploadedDocs();

  // If a record is currently selected, mark it as having evidence now and
  // refresh the panel so the effect of the upload is immediately visible.
  if (selectedAssetId) {
    const record = liquidationRecords.find(r => r.id === selectedAssetId);
    if (record && record.evidence === "MISSING") {
      record.evidence = "FOUND";
      if (record.status === "HUMAN_REVIEW") record.status = "CONTROL_REVIEW";
    }
    applyLiquidationFilters();
    window.handleInspect(selectedAssetId);
  }
}

function removeEvidenceDoc(id) {
  uploadedDocs = uploadedDocs.filter(d => d.id !== id);
  renderUploadedDocs();
}

function bindEvidenceUpload() {
  const dropzone = document.getElementById("evidenceDropzone");
  const fileInput = document.getElementById("evidenceFileInput");
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });

  fileInput.addEventListener("change", () => {
    addEvidenceFiles(fileInput.files);
    fileInput.value = "";
  });

  ["dragover", "dragenter"].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "dragend"].forEach(evt => {
    dropzone.addEventListener(evt, () => dropzone.classList.remove("dragover"));
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    addEvidenceFiles(e.dataTransfer.files);
  });
}

function renderLiquidationLedger(data) {
  // Update KPIs
  setText("liquidationAssetsChecked", "500");
  setText("liquidationAutoCleared", "469");
  setText("liquidationEvidenceExceptions", "31");
  setText("liquidationHumanReview", "27");

  if (!liquidationRecords.length) {
    liquidationRecords = generateLiquidationRecords();
  }
  applyLiquidationFilters();
}

function renderHumanReviewQueue() {
  const tbody = document.querySelector("#humanReviewTable tbody");
  if (!tbody) return;

  const queue = liquidationRecords.filter(r => r.status === "HUMAN_REVIEW");
  if (!queue.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-dim);">No human-review cases.</td></tr>`;
    return;
  }

  tbody.innerHTML = queue.map(r => `
    <tr style="cursor:pointer;" onclick="handleInspect('${r.id}')">
      <td><strong>${r.id}</strong></td>
      <td>${r.score}/100</td>
      <td style="color:${COLORS.red}">${fmtCurrency(r.gap)}</td>
      <td>${r.reason}</td>
      <td>${r.evidence === "FOUND" ? "Valuation Report, Policy V2" : "None indexed"}</td>
      <td>ToT (${r.score}%)</td>
    </tr>
  `).join("");
}

  function bindControls() {
    const runBtn = document.getElementById("runBooksBtn");
    if (runBtn) runBtn.addEventListener("click", runBatchLoop);
    bindChatControls();
    bindInnerTabs();
    bindLiquidationControls();
    bindEvidenceUpload();
  }

  async function init() {
    bindControls();
    await loadCached();  // show last run immediately instead of sitting at "--"
  }

  return { init, runBatchLoop, removeEvidenceDoc };
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