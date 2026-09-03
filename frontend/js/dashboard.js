const Dashboard = (() => {
  let charts = {};
  let lastData = null;

  const CHART_COLORS = {
    accent: "#29c9a3",
    accent2: "#4d8dff",
    warn: "#f2b84b",
    danger: "#ef5b6b",
    grid: "rgba(255,255,255,0.06)",
    text: "#90a0b7"
  };

  Chart.defaults.color = CHART_COLORS.text;
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";
  Chart.defaults.borderColor = CHART_COLORS.grid;

  function destroy(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
  }

  function renderKPIs(summary) {
    const cards = [
      { label: "Total Agreements", value: summary.total_agreements.toLocaleString("en-IN") },
      { label: "Portfolio Risk Score", value: summary.portfolio_residual_risk_score, suffix: "/100" },
      { label: "Avg Recovery Ratio", value: fmt.pct(summary.avg_recovery_ratio) },
      { label: "Total Loan Book", value: fmt.currencyCompact(summary.total_loan_amount) },
      { label: "Predicted Recovery", value: fmt.currencyCompact(summary.total_predicted_recovery) },
      { label: "Total Expected Loss", value: fmt.currencyCompact(summary.total_expected_loss) },
      { label: "Avg LTV (Curr → Rec)", value: `${fmt.pct(summary.avg_ltv_current, 0)} → ${fmt.pct(summary.avg_ltv_recommended, 0)}` },
      { label: "Avg Rate (Curr → Rec)", value: `${summary.avg_rate_current}% → ${summary.avg_rate_recommended}%` },
    ];
    const grid = document.getElementById("kpiGrid");
    grid.innerHTML = cards.map(c => `
      <div class="kpi-card">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}${c.suffix || ""}</div>
      </div>
    `).join("");
  }

  function renderRiskBandChart(dist) {
    destroy("riskBand");
    const ctx = document.getElementById("riskBandChart");
    charts.riskBand = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Low", "Medium", "High", "Critical"],
        datasets: [{
          data: [dist.Low, dist.Medium, dist.High, dist.Critical],
          backgroundColor: [CHART_COLORS.accent, CHART_COLORS.accent2, CHART_COLORS.warn, CHART_COLORS.danger],
          borderWidth: 0,
        }]
      },
      options: {
        plugins: { legend: { position: "bottom", labels: { padding: 16 } } },
        cutout: "62%"
      }
    });
  }

  function renderModelCompareChart(models) {
    destroy("modelCompare");
    const ctx = document.getElementById("modelCompareChart");
    charts.modelCompare = new Chart(ctx, {
      type: "bar",
      data: {
        labels: models.value_models.map(m => m.model),
        datasets: [
          { label: "MAPE (%)", data: models.value_models.map(m => (m.mape * 100).toFixed(2)), backgroundColor: CHART_COLORS.accent2, borderRadius: 6 },
        ]
      },
      options: {
        scales: {
          y: { beginAtZero: true, grid: { color: CHART_COLORS.grid }, title: { display: true, text: "MAPE %" } },
          x: { grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
    document.getElementById("riskModelNote").innerHTML =
      `Risk classifier: AUC-ROC <b>${models.risk_model.auc_roc}</b> · Precision <b>${models.risk_model.precision}</b> · Recall <b>${models.risk_model.recall}</b>`;
  }

  function renderSegmentRiskChart(segments) {
    destroy("segmentRisk");
    const top = segments.slice(0, 8);
    const ctx = document.getElementById("segmentRiskChart");
    charts.segmentRisk = new Chart(ctx, {
      type: "bar",
      data: {
        labels: top.map(s => s.asset_model),
        datasets: [{
          label: "Avg Residual Risk Score",
          data: top.map(s => s.avg_residual_risk_score),
          backgroundColor: top.map(s => s.avg_residual_risk_score > 55 ? CHART_COLORS.danger : s.avg_residual_risk_score > 40 ? CHART_COLORS.warn : CHART_COLORS.accent),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: "y",
        scales: { x: { beginAtZero: true, max: 100 }, y: { grid: { display: false } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderShapChart(features) {
    destroy("shap");
    const ctx = document.getElementById("shapChart");
    charts.shap = new Chart(ctx, {
      type: "bar",
      data: {
        labels: features.map(f => f.feature),
        datasets: [{
          label: "Mean |SHAP value|",
          data: features.map(f => f.importance),
          backgroundColor: CHART_COLORS.accent,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: "y",
        scales: { x: { beginAtZero: true }, y: { grid: { display: false } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderTrainingCurve(history) {
    destroy("trainingCurve");
    const ctx = document.getElementById("trainingCurveChart");
    const epochs = history.loss.map((_, i) => i + 1);
    charts.trainingCurve = new Chart(ctx, {
      type: "line",
      data: {
        labels: epochs,
        datasets: [
          { label: "Train Loss", data: history.loss, borderColor: CHART_COLORS.accent2, backgroundColor: "transparent", tension: 0.3, pointRadius: 0 },
          { label: "Val Loss", data: history.val_loss, borderColor: CHART_COLORS.warn, backgroundColor: "transparent", tension: 0.3, pointRadius: 0 },
        ]
      },
      options: {
        scales: { x: { title: { display: true, text: "Epoch" }, grid: { display: false } }, y: { title: { display: true, text: "MSE (scaled)" } } },
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  function renderLendingTermsChart(summary) {
    destroy("lendingTerms");
    const ctx = document.getElementById("lendingTermsChart");
    charts.lendingTerms = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Avg LTV (%)", "Avg Rate (%)", "Avg Tenure (mo)"],
        datasets: [
          { label: "Current", data: [summary.avg_ltv_current * 100, summary.avg_rate_current, summary.avg_tenure_current], backgroundColor: CHART_COLORS.accent2, borderRadius: 6 },
          { label: "Recommended", data: [summary.avg_ltv_recommended * 100, summary.avg_rate_recommended, summary.avg_tenure_recommended], backgroundColor: CHART_COLORS.accent, borderRadius: 6 },
        ]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: "bottom" } }
      }
    });
  }

  function renderMacroForecastChart(timeseries) {
    destroy("macroForecast");
    if (!timeseries || !timeseries.monthly_series || !timeseries.monthly_series.length) return;

    const history = timeseries.monthly_series.map(m => m.avg_recovery_ratio);
    const historyLabels = timeseries.monthly_series.map(m => `${m["Sold Date Month"]}/${m["Sold Date Year"]}`);
    const futureLabels = ["+1M", "+2M", "+3M"];
    const allLabels = [...historyLabels, ...futureLabels];

    const pad = (arr) => [...Array(history.length - 1).fill(null), history[history.length - 1], ...arr];

    const ctx = document.getElementById("macroForecastChart");
    charts.macroForecast = new Chart(ctx, {
      type: "line",
      data: {
        labels: allLabels,
        datasets: [
          {
            label: "Historical Avg Recovery Ratio",
            data: [...history, null, null, null],
            borderColor: CHART_COLORS.text,
            backgroundColor: "transparent",
            tension: 0.25,
            pointRadius: 2,
          },
          {
            label: "SARIMAX Forecast",
            data: pad(timeseries.sarimax_forecast_next_3 || []),
            borderColor: CHART_COLORS.accent2,
            backgroundColor: "transparent",
            borderDash: [6, 4],
            tension: 0.25,
            pointRadius: 3,
          },
          {
            label: "Lagged LightGBM Forecast",
            data: pad(timeseries.lagged_lightgbm_forecast_next_3 || []),
            borderColor: CHART_COLORS.warn,
            backgroundColor: "transparent",
            borderDash: [2, 3],
            tension: 0.25,
            pointRadius: 3,
          },
          {
            label: "LSTM Forecast (Deep Learning)",
            data: pad(timeseries.lstm_forecast_next_3 || []),
            borderColor: CHART_COLORS.accent,
            backgroundColor: "transparent",
            borderDash: [1, 1],
            tension: 0.25,
            pointRadius: 3,
          },
        ]
      },
      options: {
        scales: { y: { title: { display: true, text: "Avg Recovery Ratio" } }, x: { grid: { display: false } } },
        plugins: { legend: { position: "bottom" } }
      }
    });

    document.getElementById("macroForecastNote").innerHTML =
      `Next-3-month forecasts &mdash; SARIMAX: ${(timeseries.sarimax_forecast_next_3 || []).map(v => v.toFixed(3)).join(", ")} ·
       LightGBM: ${(timeseries.lagged_lightgbm_forecast_next_3 || []).map(v => v.toFixed(3)).join(", ")} ·
       LSTM: ${(timeseries.lstm_forecast_next_3 || []).map(v => v.toFixed(3)).join(", ")}`;
  }

  function renderLstmLossChart(timeseries) {
    destroy("lstmLoss");
    const hist = timeseries && timeseries.lstm_training_history;
    const ctx = document.getElementById("lstmLossChart");
    if (!hist || !hist.loss || !hist.loss.length) {
      ctx.parentElement.querySelector(".mini-note")?.remove();
      const note = document.createElement("div");
      note.className = "mini-note";
      note.textContent = hist && hist.note ? hist.note : "LSTM history unavailable.";
      ctx.parentElement.appendChild(note);
      return;
    }
    charts.lstmLoss = new Chart(ctx, {
      type: "line",
      data: {
        labels: hist.loss.map((_, i) => i + 1),
        datasets: [{ label: "LSTM Training Loss (MSE, scaled)", data: hist.loss, borderColor: CHART_COLORS.accent, backgroundColor: "transparent", tension: 0.3, pointRadius: 0 }]
      },
      options: {
        scales: { x: { title: { display: true, text: "Epoch" }, grid: { display: false } }, y: { title: { display: true, text: "MSE (scaled)" } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderTopSegmentsTable(segments) {
    const tbody = document.querySelector("#topSegmentsTable tbody");
    tbody.innerHTML = segments.slice(0, 8).map(s => `
      <tr>
        <td>${s.asset_model}</td>
        <td>${s.agreements.toLocaleString("en-IN")}</td>
        <td>${s.avg_residual_risk_score.toFixed(1)}</td>
        <td>${fmt.pct(s.avg_recovery_ratio)}</td>
        <td>${s.avg_health_index.toFixed(1)}</td>
      </tr>
    `).join("");
  }

  function updateOllamaStatus(available) {
    const el = document.getElementById("ollamaStatus");
    el.classList.toggle("online", available);
    el.classList.toggle("offline", !available);
    el.innerHTML = `<span class="dot"></span> Ollama ${available ? "online (llama3.1)" : "offline"}`;
  }

async function load() {

    console.log("[Dashboard] requesting API...");

    const data = await Api.dashboard();

    console.log("[Dashboard] API response:", data);

    lastData = data;

    console.log("[Dashboard] rendering KPIs...");
    renderKPIs(data);

    console.log("[Dashboard] rendering risk band...");
    renderRiskBand(data);

    console.log("[Dashboard] rendering model comparison...");
    renderModelComparison(data);

    console.log("[Dashboard] rendering segment risk...");
    renderSegmentRisk(data);

    console.log("[Dashboard] rendering SHAP...");
    renderShap(data);

    console.log("[Dashboard] rendering training...");
    renderTraining(data);

    console.log("[Dashboard] rendering lending...");
    renderLending(data);

    console.log("[Dashboard] rendering macro...");
    renderMacro(data);

    console.log("[Dashboard] rendering top segments...");
    renderTopSegments(data);

    console.log("[Dashboard] ALL RENDERING COMPLETE");

    return data;
}

  return { load, get lastData() { return lastData; } };
})();
