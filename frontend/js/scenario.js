// const ScenarioLab = (() => {
//   let chart;

//   function render(scenarios) {
//     const ctx = document.getElementById("scenarioChart");
//     if (chart) chart.destroy();
//     chart = new Chart(ctx, {
//       type: "bar",
//       data: {
//         labels: scenarios.map(s => s.scenario),
//         datasets: [
//           {
//             label: "Avg Residual Risk Score",
//             data: scenarios.map(s => s.avg_residual_risk_score),
//             backgroundColor: "#ef5b6b",
//             borderRadius: 6,
//             yAxisID: "y"
//           },
//           {
//             label: "Avg Recovery Ratio (%)",
//             data: scenarios.map(s => (s.avg_recovery_ratio * 100).toFixed(1)),
//             backgroundColor: "#29c9a3",
//             borderRadius: 6,
//             yAxisID: "y"
//           }
//         ]
//       },
//       options: {
//         scales: { y: { beginAtZero: true } },
//         plugins: { legend: { position: "bottom" } }
//       }
//     });

//     const tbody = document.querySelector("#scenarioTable tbody");
//     tbody.innerHTML = scenarios.map(s => `
//       <tr>
//         <td>${s.scenario}</td>
//         <td>${fmt.pct(s.avg_recovery_ratio)}</td>
//         <td>${s.avg_residual_risk_score}</td>
//         <td>${s.critical_pct}%</td>
//         <td>${fmt.currencyCompact(s.portfolio_value_at_risk)}</td>
//       </tr>
//     `).join("");
//   }

//   async function init(data) {
//     render(data.scenario_results);
//   }

//   return { init };
// })();






const ScenarioLab = (() => {

let chart;

function render(scenarios) {


if (!Array.isArray(scenarios) || scenarios.length === 0) {
  console.warn("[ScenarioLab] No scenario results available.");
  return;
}

const ctx = document.getElementById("scenarioChart");

if (!ctx) {
  console.warn("[ScenarioLab] scenarioChart not found.");
  return;
}

if (chart) {
  chart.destroy();
}

chart = new Chart(ctx, {
  type: "bar",

  data: {
    labels: scenarios.map(s => s.scenario),

    datasets: [

      {
        label: "Avg Residual Risk Score",

        data: scenarios.map(
          s => s.avg_residual_risk_score ?? 0
        ),

        backgroundColor: "#ef5b6b",
        borderRadius: 6,
        yAxisID: "y"
      },

      {
        label: "Avg Recovery Ratio (%)",

        data: scenarios.map(
          s => ((s.avg_recovery_ratio ?? 0) * 100).toFixed(1)
        ),

        backgroundColor: "#29c9a3",
        borderRadius: 6,
        yAxisID: "y"
      }

    ]
  },

  options: {
    responsive: true,
    maintainAspectRatio: false,

    scales: {
      y: {
        beginAtZero: true
      }
    },

    plugins: {
      legend: {
        position: "bottom"
      }
    }
  }
});


const tbody = document.querySelector("#scenarioTable tbody");

if (!tbody) {
  console.warn("[ScenarioLab] scenarioTable tbody not found.");
  return;
}

tbody.innerHTML = scenarios.map(s => `
  <tr>
    <td>${s.scenario ?? "--"}</td>

    <td>
      ${
        typeof fmt !== "undefined" && fmt.pct
          ? fmt.pct(s.avg_recovery_ratio)
          : `${((s.avg_recovery_ratio ?? 0) * 100).toFixed(1)}%`
      }
    </td>

    <td>
      ${s.avg_residual_risk_score ?? "--"}
    </td>

    <td>
      ${s.critical_pct ?? "--"}%
    </td>

    <td>
      ${
        typeof fmt !== "undefined" && fmt.currencyCompact
          ? fmt.currencyCompact(s.portfolio_value_at_risk)
          : "--"
      }
    </td>
  </tr>
`).join("");


}

async function init(data) {


if (!data) {
  console.warn("[ScenarioLab] No data supplied.");
  return;
}

render(data.scenario_results);


}

return {
init
};

})();










// /* ============================================================
//    SCENARIO LAB / DIGITAL TWIN
//    Self-contained module.
//    Does NOT modify Dashboard.load() or other dashboard modules.
//    ============================================================ */

// const ScenarioLab = (() => {

//   let chart = null;
//   let currentData = null;
//   let baselineData = null;

//   const API_BASE =
//     window.API_BASE ||
//     window.location.origin;

//   /* ------------------------------------------------------------
//      Helpers
//      ------------------------------------------------------------ */

//   function byId(id) {
//     return document.getElementById(id);
//   }

//   function number(value, fallback = null) {
//     const n = Number(value);
//     return Number.isFinite(n) ? n : fallback;
//   }

//   function pct(value, decimals = 1) {
//     const n = number(value);

//     if (n === null) return "--";

//     // API may return either 0.371 or 37.1
//     const normalized = Math.abs(n) <= 1 ? n * 100 : n;

//     return `${normalized.toFixed(decimals)}%`;
//   }

//   function signedPct(value, decimals = 1) {
//     const n = number(value);

//     if (n === null) return "--";

//     const normalized = Math.abs(n) <= 1 ? n * 100 : n;

//     const sign = normalized > 0 ? "+" : "";

//     return `${sign}${normalized.toFixed(decimals)}%`;
//   }

//   function signedNumber(value, decimals = 2) {
//     const n = number(value);

//     if (n === null) return "--";

//     const sign = n > 0 ? "+" : "";

//     return `${sign}${n.toFixed(decimals)}`;
//   }

//   function currency(value) {
//     const n = number(value);

//     if (n === null) return "--";

//     if (Math.abs(n) >= 10000000) {
//       return `₹${(n / 10000000).toFixed(2)} Cr`;
//     }

//     if (Math.abs(n) >= 100000) {
//       return `₹${(n / 100000).toFixed(2)} L`;
//     }

//     return `₹${n.toLocaleString("en-IN", {
//       maximumFractionDigits: 0
//     })}`;
//   }

//   function setText(id, value) {
//     const el = byId(id);

//     if (el) {
//       el.textContent = value;
//     }
//   }

//   function setStatus(text) {
//     const el = byId("scenarioEngineStatus");

//     if (!el) return;

//     const strong = el.querySelector("strong");

//     if (strong) {
//       strong.textContent = text;
//     } else {
//       el.textContent = text;
//     }
//   }

//   /* ------------------------------------------------------------
//      Slider display
//      ------------------------------------------------------------ */

//   function updateSliderLabels() {

//     const ltv = byId("ltvSlider");
//     const recovery = byId("recoverySlider");
//     const residual = byId("residualSlider");
//     const pricing = byId("pricingSlider");
//     const tenure = byId("tenureSlider");

//     if (ltv) {
//       setText("ltvValue", `${Number(ltv.value).toFixed(1)}%`);
//     }

//     if (recovery) {
//       const v = Number(recovery.value);
//       setText("recoveryValue", `${v > 0 ? "+" : ""}${v}%`);
//     }

//     if (residual) {
//       const v = Number(residual.value);
//       setText("residualValue", `${v > 0 ? "+" : ""}${v}%`);
//     }

//     if (pricing) {
//       const v = Number(pricing.value);
//       setText("pricingValue", `${v > 0 ? "+" : ""}${v}%`);
//     }

//     if (tenure) {
//       const v = Number(tenure.value);
//       setText("tenureValue", `${v > 0 ? "+" : ""}${v} mo`);
//     }
//   }

//   /* ------------------------------------------------------------
//      Read controls
//      ------------------------------------------------------------ */

//   function getControls() {

//     return {
//       asset_model:
//         byId("scenarioAssetModel")?.value || "ALL",

//       ltv:
//         number(byId("ltvSlider")?.value, 86.5),

//       recovery_adjustment:
//         number(byId("recoverySlider")?.value, 0),

//       residual_adjustment:
//         number(byId("residualSlider")?.value, 0),

//       pricing_adjustment:
//         number(byId("pricingSlider")?.value, 0),

//       tenure_adjustment:
//         number(byId("tenureSlider")?.value, 0)
//     };
//   }

//   /* ------------------------------------------------------------
//      Reset
//      ------------------------------------------------------------ */

//   function resetControls() {

//     const defaults = {
//       ltv: 86.5,
//       recovery_adjustment: 0,
//       residual_adjustment: 0,
//       pricing_adjustment: 0,
//       tenure_adjustment: 0
//     };

//     if (byId("ltvSlider")) {
//       byId("ltvSlider").value = defaults.ltv;
//     }

//     if (byId("recoverySlider")) {
//       byId("recoverySlider").value =
//         defaults.recovery_adjustment;
//     }

//     if (byId("residualSlider")) {
//       byId("residualSlider").value =
//         defaults.residual_adjustment;
//     }

//     if (byId("pricingSlider")) {
//       byId("pricingSlider").value =
//         defaults.pricing_adjustment;
//     }

//     if (byId("tenureSlider")) {
//       byId("tenureSlider").value =
//         defaults.tenure_adjustment;
//     }

//     updateSliderLabels();

//     document
//       .querySelectorAll(".scenario-preset")
//       .forEach(btn => btn.classList.remove("active"));

//     document
//       .querySelector('.scenario-preset[data-preset="baseline"]')
//       ?.classList.add("active");

//     clearSimulation();

//     setStatus("DIGITAL TWIN READY");
//   }

//   /* ------------------------------------------------------------
//      Presets
//      ------------------------------------------------------------ */

//   const PRESETS = {

//     baseline: {
//       ltv: 86.5,
//       recovery_adjustment: 0,
//       residual_adjustment: 0,
//       pricing_adjustment: 0,
//       tenure_adjustment: 0
//     },

//     conservative: {
//       ltv: 70,
//       recovery_adjustment: 5,
//       residual_adjustment: 3,
//       pricing_adjustment: 2,
//       tenure_adjustment: -6
//     },

//     recovery_stress: {
//       ltv: 86.5,
//       recovery_adjustment: -15,
//       residual_adjustment: 0,
//       pricing_adjustment: 0,
//       tenure_adjustment: 0
//     },

//     residual_shock: {
//       ltv: 86.5,
//       recovery_adjustment: 0,
//       residual_adjustment: -15,
//       pricing_adjustment: 0,
//       tenure_adjustment: 0
//     },

//     combined_stress: {
//       ltv: 90,
//       recovery_adjustment: -20,
//       residual_adjustment: -15,
//       pricing_adjustment: -5,
//       tenure_adjustment: 12
//     }
//   };

//   function applyPreset(name) {

//     const preset = PRESETS[name];

//     if (!preset) return;

//     const values = {
//       ltv: preset.ltv,
//       recovery_adjustment:
//         preset.recovery_adjustment,
//       residual_adjustment:
//         preset.residual_adjustment,
//       pricing_adjustment:
//         preset.pricing_adjustment,
//       tenure_adjustment:
//         preset.tenure_adjustment
//     };

//     if (byId("ltvSlider")) {
//       byId("ltvSlider").value = values.ltv;
//     }

//     if (byId("recoverySlider")) {
//       byId("recoverySlider").value =
//         values.recovery_adjustment;
//     }

//     if (byId("residualSlider")) {
//       byId("residualSlider").value =
//         values.residual_adjustment;
//     }

//     if (byId("pricingSlider")) {
//       byId("pricingSlider").value =
//         values.pricing_adjustment;
//     }

//     if (byId("tenureSlider")) {
//       byId("tenureSlider").value =
//         values.tenure_adjustment;
//     }

//     updateSliderLabels();

//     document
//       .querySelectorAll(".scenario-preset")
//       .forEach(btn => btn.classList.remove("active"));

//     document
//       .querySelector(
//         `.scenario-preset[data-preset="${name}"]`
//       )
//       ?.classList.add("active");
//   }

//   /* ------------------------------------------------------------
//      Clear current simulation
//      ------------------------------------------------------------ */

//   function clearSimulation() {

//     setText("baselineRecovery", "--");
//     setText("twinRecovery", "--");
//     setText("twinRecoveryDelta", "--");

//     setText("baselineRisk", "--");
//     setText("twinRisk", "--");
//     setText("twinRiskDelta", "--");

//     setText("baselineHealth", "--");
//     setText("twinHealth", "--");
//     setText("twinHealthDelta", "--");

//     setText("baselineVaR", "--");
//     setText("twinVaR", "--");
//     setText("twinVaRDelta", "--");

//     setText("impactLtv", "--");
//     setText("impactRecovery", "--");
//     setText("impactRisk", "--");
//     setText("impactHealth", "--");
//     setText("impactVaR", "--");

//     setText(
//       "twinSignal",
//       "Run a scenario to generate a residual intelligence signal."
//     );

//     setText(
//       "twinDecisionBasis",
//       "Baseline → Scenario → Delta"
//     );

//     setText(
//       "twinMonitoring",
//       "No scenario has been evaluated."
//     );

//     setText(
//       "twinFeedback",
//       "Compare simulated outcomes with realized portfolio outcomes."
//     );

//     if (chart) {
//       chart.destroy();
//       chart = null;
//     }

//     currentData = null;
//   }

//   /* ------------------------------------------------------------
//      Extract metric from different possible API structures
//      ------------------------------------------------------------ */

//   function metric(obj, keys) {

//     if (!obj) return null;

//     for (const key of keys) {

//       if (
//         Object.prototype.hasOwnProperty.call(obj, key) &&
//         obj[key] != null
//       ) {
//         return number(obj[key]);
//       }
//     }

//     return null;
//   }

//   /* ------------------------------------------------------------
//      Normalize backend response
//      ------------------------------------------------------------ */

//   function normalizeTwinResponse(data) {

//     if (!data) return null;

//     const baseline =
//       data.baseline ||
//       data.base ||
//       data.baseline_state ||
//       {};

//     const scenario =
//       data.scenario ||
//       data.simulated ||
//       data.scenario_state ||
//       {};

//     const delta =
//       data.delta ||
//       data.deltas ||
//       {};

//     return {
//       baseline: {
//         ltv: metric(baseline, [
//           "avg_ltv",
//           "avg_ltv_current",
//           "ltv"
//         ]),

//         recovery: metric(baseline, [
//           "avg_recovery_ratio",
//           "recovery_ratio",
//           "recovery"
//         ]),

//         risk: metric(baseline, [
//           "avg_residual_risk_score",
//           "residual_risk_score",
//           "risk"
//         ]),

//         health: metric(baseline, [
//           "avg_health_index",
//           "health_index",
//           "health"
//         ]),

//         var: metric(baseline, [
//           "portfolio_value_at_risk",
//           "value_at_risk",
//           "var"
//         ])
//       },

//       scenario: {
//         ltv: metric(scenario, [
//           "avg_ltv",
//           "avg_ltv_current",
//           "ltv"
//         ]),

//         recovery: metric(scenario, [
//           "avg_recovery_ratio",
//           "recovery_ratio",
//           "recovery"
//         ]),

//         risk: metric(scenario, [
//           "avg_residual_risk_score",
//           "residual_risk_score",
//           "risk"
//         ]),

//         health: metric(scenario, [
//           "avg_health_index",
//           "health_index",
//           "health"
//         ]),

//         var: metric(scenario, [
//           "portfolio_value_at_risk",
//           "value_at_risk",
//           "var"
//         ])
//       },

//       delta: {
//         ltv: metric(delta, [
//           "avg_ltv",
//           "ltv"
//         ]),

//         recovery: metric(delta, [
//           "avg_recovery_ratio",
//           "recovery_ratio",
//           "recovery"
//         ]),

//         risk: metric(delta, [
//           "avg_residual_risk_score",
//           "residual_risk_score",
//           "risk"
//         ]),

//         health: metric(delta, [
//           "avg_health_index",
//           "health_index",
//           "health"
//         ]),

//         var: metric(delta, [
//           "portfolio_value_at_risk",
//           "value_at_risk",
//           "var"
//         ])
//       },

//       raw: data
//     };
//   }

//   /* ------------------------------------------------------------
//      Render comparison
//      ------------------------------------------------------------ */

//   function renderComparison(result) {

//     if (!result) return;

//     const b = result.baseline;
//     const s = result.scenario;
//     const d = result.delta;

//     setText(
//       "baselineRecovery",
//       pct(b.recovery)
//     );

//     setText(
//       "twinRecovery",
//       pct(s.recovery)
//     );

//     setText(
//       "twinRecoveryDelta",
//       d.recovery !== null
//         ? signedPct(d.recovery)
//         : "--"
//     );

//     setText(
//       "baselineRisk",
//       b.risk !== null ? b.risk.toFixed(2) : "--"
//     );

//     setText(
//       "twinRisk",
//       s.risk !== null ? s.risk.toFixed(2) : "--"
//     );

//     setText(
//       "twinRiskDelta",
//       d.risk !== null
//         ? signedNumber(d.risk)
//         : "--"
//     );

//     setText(
//       "baselineHealth",
//       b.health !== null ? b.health.toFixed(2) : "--"
//     );

//     setText(
//       "twinHealth",
//       s.health !== null ? s.health.toFixed(2) : "--"
//     );

//     setText(
//       "twinHealthDelta",
//       d.health !== null
//         ? signedNumber(d.health)
//         : "--"
//     );

//     setText(
//       "baselineVaR",
//       currency(b.var)
//     );

//     setText(
//       "twinVaR",
//       currency(s.var)
//     );

//     if (d.var !== null) {
//       setText(
//         "twinVaRDelta",
//         currency(d.var)
//       );
//     }

//     const controls = getControls();

//     setText(
//       "impactLtv",
//       d.ltv !== null
//         ? signedPct(d.ltv)
//         : `${controls.ltv.toFixed(1)}%`
//     );

//     setText(
//       "impactRecovery",
//       d.recovery !== null
//         ? signedPct(d.recovery)
//         : "--"
//     );

//     setText(
//       "impactRisk",
//       d.risk !== null
//         ? signedNumber(d.risk)
//         : "--"
//     );

//     setText(
//       "impactHealth",
//       d.health !== null
//         ? signedNumber(d.health)
//         : "--"
//     );

//     setText(
//       "impactVaR",
//       d.var !== null
//         ? currency(d.var)
//         : "--"
//     );
//   }

//   /* ------------------------------------------------------------
//      Proactive intelligence
//      ------------------------------------------------------------ */

//   function renderIntelligence(result) {

//     if (!result) return;

//     const d = result.delta;

//     let signal = "Scenario evaluated";

//     if (
//       d.recovery !== null &&
//       d.recovery < 0
//     ) {
//       signal = "Recovery compression detected";
//     }

//     if (
//       d.risk !== null &&
//       d.risk > 0
//     ) {
//       signal = "Residual risk metric increased";
//     }

//     if (
//       d.var !== null &&
//       d.var > 0
//     ) {
//       signal = "Value-at-risk increased";
//     }

//     if (
//       d.recovery !== null &&
//       d.recovery < 0 &&
//       d.risk !== null &&
//       d.risk > 0
//     ) {
//       signal =
//         "Recovery compression with increased residual-risk metric";
//     }

//     setText("twinSignal", signal);

//     setText(
//       "twinDecisionBasis",
//       "Baseline → Scenario → Delta → Signal"
//     );

//     setText(
//       "twinMonitoring",
//       "Monitor the simulated recovery, residual-risk and value-at-risk deltas against realized portfolio outcomes."
//     );

//     setText(
//       "twinFeedback",
//       "After realization, compare the simulated state with actual portfolio performance and feed the variance back into the scenario engine."
//     );
//   }

//   /* ------------------------------------------------------------
//      Chart
//      ------------------------------------------------------------ */

//   function renderChart(result) {

//     const canvas = byId("scenarioChart");

//     if (!canvas || typeof Chart === "undefined") {
//       return;
//     }

//     if (chart) {
//       chart.destroy();
//       chart = null;
//     }

//     const b = result.baseline;
//     const s = result.scenario;

//     chart = new Chart(canvas, {

//       type: "bar",

//       data: {

//         labels: [
//           "Recovery %",
//           "Residual Risk",
//           "Health Index"
//         ],

//         datasets: [

//           {
//             label: "Baseline",

//             data: [
//               b.recovery !== null
//                 ? (
//                     Math.abs(b.recovery) <= 1
//                       ? b.recovery * 100
//                       : b.recovery
//                   )
//                 : 0,

//               b.risk ?? 0,

//               b.health ?? 0
//             ],

//             backgroundColor:
//               "#4d8dff",

//             borderRadius: 6
//           },

//           {
//             label: "Simulated",

//             data: [
//               s.recovery !== null
//                 ? (
//                     Math.abs(s.recovery) <= 1
//                       ? s.recovery * 100
//                       : s.recovery
//                   )
//                 : 0,

//               s.risk ?? 0,

//               s.health ?? 0
//             ],

//             backgroundColor:
//               "#29c9a3",

//             borderRadius: 6
//           }

//         ]

//       },

//       options: {

//         responsive: true,

//         maintainAspectRatio: false,

//         scales: {
//           y: {
//             beginAtZero: true
//           }
//         },

//         plugins: {
//           legend: {
//             position: "bottom"
//           }
//         }
//       }
//     });
//   }

//   /* ------------------------------------------------------------
//      Legacy scenario table
//      ------------------------------------------------------------ */

//   function renderLegacyScenarioTable(data) {

//     const tbody =
//       document.querySelector("#scenarioTable tbody");

//     if (!tbody) return;

//     const scenarios =
//       data?.scenario_results ||
//       data?.scenarios ||
//       [];

//     if (!Array.isArray(scenarios)) {
//       return;
//     }

//     tbody.innerHTML = scenarios.map(s => {

//       const recovery =
//         number(s.avg_recovery_ratio);

//       const risk =
//         number(s.avg_residual_risk_score);

//       const critical =
//         number(s.critical_pct);

//       const varValue =
//         number(s.portfolio_value_at_risk);

//       return `
//         <tr>
//           <td>${s.scenario || "--"}</td>
//           <td>${pct(recovery)}</td>
//           <td>${risk !== null ? risk.toFixed(2) : "--"}</td>
//           <td>${critical !== null ? pct(critical) : "--"}</td>
//           <td>${currency(varValue)}</td>
//         </tr>
//       `;

//     }).join("");
//   }

//   /* ------------------------------------------------------------
//      Digital Twin API
//      ------------------------------------------------------------ */

//   async function runDigitalTwin() {

//     const controls = getControls();

//     setStatus("SIMULATING");

//     const button = byId("runTwinBtn");

//     if (button) {
//       button.disabled = true;
//       button.dataset.originalText =
//         button.textContent;

//       button.textContent =
//         "Running Digital Twin...";
//     }

//     try {

//       const response = await fetch(
//         `${API_BASE}/api/finance/digital-twin`,
//         {
//           method: "POST",

//           headers: {
//             "Content-Type":
//               "application/json"
//           },

//           body: JSON.stringify(controls)
//         }
//       );

//       if (!response.ok) {
//         throw new Error(
//           `Digital Twin API returned ${response.status}`
//         );
//       }

//       const data =
//         await response.json();

//       const normalized =
//         normalizeTwinResponse(data);

//       if (!normalized) {
//         throw new Error(
//           "Digital Twin returned an invalid response."
//         );
//       }

//       currentData = normalized;

//       renderComparison(normalized);
//       renderIntelligence(normalized);
//       renderChart(normalized);

//       setStatus("TWIN ACTIVE");

//     } catch (error) {

//       console.error(
//         "[ScenarioLab] Digital Twin error:",
//         error
//       );

//       setStatus("ENGINE ERROR");

//       setText(
//         "twinSignal",
//         "Digital Twin simulation could not be completed."
//       );

//       setText(
//         "twinDecisionBasis",
//         "API response unavailable"
//       );

//       setText(
//         "twinMonitoring",
//         "Check the backend Digital Twin endpoint and retry."
//       );

//     } finally {

//       if (button) {

//         button.disabled = false;

//         button.textContent =
//           button.dataset.originalText ||
//           "Run Digital Twin";
//       }
//     }
//   }

//   /* ------------------------------------------------------------
//      Baseline loader
//      ------------------------------------------------------------ */

//   async function loadBaseline(data) {

//     /*
//       If the dashboard already has portfolio data, use it.

//       This allows ScenarioLab to work even before the new
//       Digital Twin endpoint is available.
//     */

//     if (!data) return;

//     const summary =
//       data.portfolio_summary ||
//       data.summary ||
//       {};

//     const baseline = {
//       avg_ltv:
//         number(summary.avg_ltv_current),

//       avg_recovery_ratio:
//         number(summary.avg_recovery_ratio),

//       avg_residual_risk_score:
//         number(summary.portfolio_residual_risk_score),

//       avg_health_index:
//         number(summary.avg_health_index),

//       portfolio_value_at_risk:
//         number(summary.total_expected_loss)
//     };

//     baselineData = baseline;

//     /*
//       Populate baseline immediately when available.
//     */

//     if (baseline.avg_recovery_ratio !== null) {
//       setText(
//         "baselineRecovery",
//         pct(baseline.avg_recovery_ratio)
//       );
//     }

//     if (baseline.avg_residual_risk_score !== null) {
//       setText(
//         "baselineRisk",
//         baseline.avg_residual_risk_score.toFixed(2)
//       );
//     }

//     if (baseline.avg_health_index !== null) {
//       setText(
//         "baselineHealth",
//         baseline.avg_health_index.toFixed(2)
//       );
//     }

//     if (baseline.portfolio_value_at_risk !== null) {
//       setText(
//         "baselineVaR",
//         currency(baseline.portfolio_value_at_risk)
//       );
//     }
//   }

//   /* ------------------------------------------------------------
//      Event binding
//      ------------------------------------------------------------ */

//   function bindControls() {

//     [
//       "ltvSlider",
//       "recoverySlider",
//       "residualSlider",
//       "pricingSlider",
//       "tenureSlider"
//     ].forEach(id => {

//       const el = byId(id);

//       if (!el) return;

//       el.addEventListener(
//         "input",
//         updateSliderLabels
//       );
//     });

//     document
//       .querySelectorAll(".scenario-preset")
//       .forEach(button => {

//         button.addEventListener(
//           "click",
//           () => {

//             const preset =
//               button.dataset.preset;

//             applyPreset(preset);
//           }
//         );

//       });

//     byId("resetTwinBtn")
//       ?.addEventListener(
//         "click",
//         resetControls
//       );

//     byId("runTwinBtn")
//       ?.addEventListener(
//         "click",
//         runDigitalTwin
//       );

//     byId("scenarioAssetModel")
//       ?.addEventListener(
//         "change",
//         () => {

//           /*
//             Changing the asset model does not automatically
//             fabricate a new result.

//             User explicitly runs the Twin.
//           */

//           setStatus("READY TO SIMULATE");
//         }
//       );
//   }

//   /* ------------------------------------------------------------
//      Public initialization
//      ------------------------------------------------------------ */

//   async function init(data = null) {

//     /*
//       Guard: Scenario section may not exist on every page.
//     */

//     if (!byId("view-scenario")) {
//       return;
//     }

//     updateSliderLabels();

//     bindControls();

//     if (data) {
//       await loadBaseline(data);

//       /*
//         Preserve existing Scenario Lab data if available.
//       */

//       renderLegacyScenarioTable(data);
//     }

//     setStatus("DIGITAL TWIN READY");

//     console.log(
//       "[ScenarioLab] Digital Twin initialized."
//     );
//   }

//   return {
//     init,
//     run: runDigitalTwin,
//     reset: resetControls,
//     getControls
//   };

// })();


// /* ============================================================
//    SAFE INITIALIZATION
//    ============================================================ */

// document.addEventListener(
//   "DOMContentLoaded",
//   () => {

//     /*
//       Do NOT assume Dashboard is already loaded.
//       If Dashboard exists, use its cached data.
//     */

//     let dashboardData = null;

//     try {
//       dashboardData =
//         Dashboard?.lastData || null;
//     } catch (e) {
//       dashboardData = null;
//     }

//     ScenarioLab.init(dashboardData);

//   }
// );

