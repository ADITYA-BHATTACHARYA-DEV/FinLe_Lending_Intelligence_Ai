const Explorer = (() => {
  let state = { search: "", riskBand: "All", assetModel: "All", sortBy: "Residual_Risk_Score", sortDir: "desc", limit: 25, offset: 0, total: 0 };

  async function initFilters() {
    const filters = await Api.filters();
    const riskSel = document.getElementById("riskBandFilter");
    const modelSel = document.getElementById("assetModelFilter");
    riskSel.innerHTML = filters.risk_bands.map(r => `<option value="${r}">${r === "All" ? "All Risk Bands" : r}</option>`).join("");
    modelSel.innerHTML = filters.asset_models.map(m => `<option value="${m}">${m === "All" ? "All Asset Models" : m}</option>`).join("");
  }

  function renderRows(rows) {
    const tbody = document.querySelector("#agreementsTable tbody");
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r["Agmt Id"]}">
        <td>${r["Agmt Id"]}</td>
        <td>${r["Asset Model"]}</td>
        <td><span class="badge ${r["Risk_Band"]}">${r["Risk_Band"]}</span></td>
        <td>${Number(r["Residual_Risk_Score"]).toFixed(1)}</td>
        <td>${fmt.currency(r["Predicted_Sold_Amount"])}</td>
        <td>${fmt.pct(r["Recommended_LTV"], 0)}</td>
        <td>${Number(r["Recommended_Pricing"]).toFixed(2)}%</td>
        <td>${r["Recommended_Tenure"]} mo</td>
        <td>›</td>
      </tr>
    `).join("");
    tbody.querySelectorAll("tr").forEach(tr => {
      tr.addEventListener("click", () => openDetail(tr.dataset.id));
    });
  }

  function updatePager() {
    const page = Math.floor(state.offset / state.limit) + 1;
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    document.getElementById("pageInfo").textContent = `Page ${page} of ${totalPages} · ${state.total.toLocaleString("en-IN")} agreements`;
    document.getElementById("prevPage").disabled = state.offset === 0;
    document.getElementById("nextPage").disabled = state.offset + state.limit >= state.total;
  }

  async function refresh() {
    const data = await Api.agreements({
      search: state.search, riskBand: state.riskBand, assetModel: state.assetModel,
      sortBy: state.sortBy, sortDir: state.sortDir, limit: state.limit, offset: state.offset
    });
    state.total = data.total;
    renderRows(data.rows);
    updatePager();
  }

  async function openDetail(agmtId) {
    const backdrop = document.getElementById("detailModalBackdrop");
    const content = document.getElementById("detailModalContent");
    backdrop.classList.add("active");
    content.innerHTML = "Loading…";
    try {
      const data = await Api.agreementDetail(agmtId);
      const a = data.agreement;
      content.innerHTML = `
        <h2 style="margin:0 0 4px;">${a["Agmt Id"]} <span class="badge ${a["Risk_Band"]}" style="margin-left:8px;">${a["Risk_Band"]}</span></h2>
        <p style="color:var(--text-dim); margin:0 0 12px; font-size:13px;">${a["Asset Model"]} · ${a["Asset Fuel Type"]} · ${a["Cust Region"]}, ${a["Cust State"]}</p>

        <div class="detail-grid">
          <div class="k">Residual Risk Score</div><div class="v">${a["Residual_Risk_Score"]} / 100</div>
          <div class="k">Predicted Sold Amount</div><div class="v">${fmt.currency(a["Predicted_Sold_Amount"])}</div>
          <div class="k">DL Model Prediction</div><div class="v">${fmt.currency(a["DL_Predicted_Sold_Amount"])}</div>
          <div class="k">Ensemble Prediction</div><div class="v">${fmt.currency(a["Ensemble_Predicted_Sold_Amount"])}</div>
          <div class="k">Actual Sold Amount</div><div class="v">${fmt.currency(a["Target Sold Amount At Liquidation"])}</div>
          <div class="k">Recovery Ratio</div><div class="v">${fmt.pct(a["Recovery_Ratio"])}</div>
          <div class="k">Asset Health Index</div><div class="v">${Number(a["Asset_Health_Index"]).toFixed(1)}</div>
          <div class="k">Segment Risk Index</div><div class="v">${a["Segment_Risk_Index"]}</div>
          <div class="k">12M Forecast</div><div class="v">${fmt.currency(a["Residual_Value_Forecast_12M"])}</div>
          <div class="k">24M Forecast</div><div class="v">${fmt.currency(a["Residual_Value_Forecast_24M"])}</div>
          <div class="k">36M Forecast</div><div class="v">${fmt.currency(a["Residual_Value_Forecast_36M"])}</div>
          <div class="k">Profitability Score</div><div class="v">${Number(a["Profitability_Score"]).toFixed(2)}</div>
        </div>

        <h3 style="margin:20px 0 6px; font-size:14px;">Lending Recommendation</h3>
        <div class="detail-grid">
          <div class="k">LTV (current → recommended)</div><div class="v">${fmt.pct(a["LTV"], 1)} → ${fmt.pct(a["Recommended_LTV"], 1)}</div>
          <div class="k">Rate (current → recommended)</div><div class="v">${a["Cust Net IRR"]}% → ${a["Recommended_Pricing"]}%</div>
          <div class="k">Tenure (current → recommended)</div><div class="v">${a["Tenure"]} → ${a["Recommended_Tenure"]} mo</div>
        </div>

        <h3 style="margin:20px 0 6px; font-size:14px;">Top Risk Drivers (SHAP)</h3>
        <div class="driver-list">
          ${data.top_risk_drivers.map(d => `
            <div class="driver-row">
              <span>${d.feature}</span>
              <span class="impact ${d.impact >= 0 ? 'pos' : 'neg'}">${d.impact >= 0 ? '+' : ''}${d.impact}</span>
            </div>
          `).join("")}
        </div>
        <button class="btn-ghost" style="margin-top:16px; width:100%;" onclick="Explorer.askCopilot('${a["Agmt Id"]}')">💬 Ask AI Copilot about ${a["Agmt Id"]}</button>
      `;
    } catch (e) {
      content.innerHTML = `<p>Could not load agreement details.</p>`;
    }
  }

  function closeDetail() {
    document.getElementById("detailModalBackdrop").classList.remove("active");
  }

  function askCopilot(agmtId) {
    closeDetail();
    document.querySelector('.nav-item[data-view="chat"]').click();
    Chat.sendMessage(`Explain the risk profile and lending recommendation for ${agmtId}`);
  }

  function bindControls() {
    document.getElementById("searchInput").addEventListener("input", (e) => {
      state.search = e.target.value; state.offset = 0; refresh();
    });
    document.getElementById("riskBandFilter").addEventListener("change", (e) => {
      state.riskBand = e.target.value; state.offset = 0; refresh();
    });
    document.getElementById("assetModelFilter").addEventListener("change", (e) => {
      state.assetModel = e.target.value; state.offset = 0; refresh();
    });
    document.getElementById("sortBySelect").addEventListener("change", (e) => {
      state.sortBy = e.target.value; state.offset = 0; refresh();
    });
    document.getElementById("prevPage").addEventListener("click", () => {
      state.offset = Math.max(0, state.offset - state.limit); refresh();
    });
    document.getElementById("nextPage").addEventListener("click", () => {
      state.offset = state.offset + state.limit; refresh();
    });
    document.getElementById("closeModalBtn").addEventListener("click", closeDetail);
    document.getElementById("detailModalBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "detailModalBackdrop") closeDetail();
    });
  }

  async function init() {
    bindControls();
    await initFilters();
    await refresh();
  }

  return { init, refresh, openDetail, askCopilot };
})();
