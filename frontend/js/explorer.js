const Explorer = (() => {

  let state = {
    search: "",
    riskBand: "All",
    assetModel: "All",
    sortBy: "Residual_Risk_Score",
    sortDir: "desc",
    limit: 25,
    offset: 0,
    total: 0
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function initFilters() {

    console.log("[Explorer] Loading filters...");

    const filters = await Api.filters();

    console.log("[Explorer] Filters:", filters);

    const riskSel =
      document.getElementById("riskBandFilter");

    const modelSel =
      document.getElementById("assetModelFilter");

    if (!riskSel) {
      throw new Error(
        "Explorer: #riskBandFilter not found in HTML"
      );
    }

    if (!modelSel) {
      throw new Error(
        "Explorer: #assetModelFilter not found in HTML"
      );
    }

    const riskBands =
      filters.risk_bands || [];

    const assetModels =
      filters.asset_models || [];

    riskSel.innerHTML =
      riskBands.map(r => `
        <option value="${escapeHtml(r)}">
          ${r === "All" ? "All Risk Bands" : escapeHtml(r)}
        </option>
      `).join("");

    modelSel.innerHTML =
      assetModels.map(m => `
        <option value="${escapeHtml(m)}">
          ${m === "All" ? "All Asset Models" : escapeHtml(m)}
        </option>
      `).join("");

    /*
     * Make sure the initial selections match JS state.
     */
    riskSel.value = state.riskBand;
    modelSel.value = state.assetModel;
  }

  function renderRows(rows) {

    const tbody =
      document.querySelector("#agreementsTable tbody");

    if (!tbody) {
      throw new Error(
        "Explorer: #agreementsTable tbody not found"
      );
    }

    console.log(
      `[Explorer] Rendering ${rows.length} agreement rows`
    );

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9"
              style="
                text-align:center;
                padding:40px;
                color:var(--text-dim);
              ">
            No agreements match the current filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(r => {

      const agmtId =
        r["Agmt Id"];

      const assetModel =
        r["Asset Model"];

      const riskBand =
        r["Risk_Band"];

      const riskScore =
        Number(r["Residual_Risk_Score"]);

      const predictedSale =
        r["Predicted_Sold_Amount"];

      const recommendedLtv =
        r["Recommended_LTV"];

      const recommendedPricing =
        r["Recommended_Pricing"];

      const recommendedTenure =
        r["Recommended_Tenure"];

      return `
        <tr data-id="${escapeHtml(agmtId)}">

          <td>
            <strong>${escapeHtml(agmtId)}</strong>
          </td>

          <td>
            ${escapeHtml(assetModel)}
          </td>

          <td>
            <span class="badge ${escapeHtml(riskBand)}">
              ${escapeHtml(riskBand)}
            </span>
          </td>

          <td>
            ${
              Number.isFinite(riskScore)
                ? riskScore.toFixed(1)
                : "—"
            }
          </td>

          <td>
            ${fmt.currency(predictedSale)}
          </td>

          <td>
            ${fmt.pct(recommendedLtv, 0)}
          </td>

          <td>
            ${
              recommendedPricing == null ||
              isNaN(recommendedPricing)
                ? "—"
                : Number(recommendedPricing).toFixed(2) + "%"
            }
          </td>

          <td>
            ${escapeHtml(recommendedTenure)} mo
          </td>

          <td class="row-arrow">
            ›
          </td>

        </tr>
      `;

    }).join("");

    tbody
      .querySelectorAll("tr[data-id]")
      .forEach(tr => {

        tr.addEventListener("click", () => {
          openDetail(tr.dataset.id);
        });

      });
  }

  function updatePager() {

    const pageInfo =
      document.getElementById("pageInfo");

    const prev =
      document.getElementById("prevPage");

    const next =
      document.getElementById("nextPage");

    const page =
      Math.floor(state.offset / state.limit) + 1;

    const totalPages =
      Math.max(
        1,
        Math.ceil(state.total / state.limit)
      );

    if (pageInfo) {
      pageInfo.textContent =
        `Page ${page} of ${totalPages} · ` +
        `${state.total.toLocaleString("en-IN")} agreements`;
    }

    if (prev) {
      prev.disabled =
        state.offset === 0;
    }

    if (next) {
      next.disabled =
        state.offset + state.limit >= state.total;
    }

    /*
     * Update the "RECORDS" metric in the Explorer.
     */
    const metricValues =
      document.querySelectorAll(
        ".explorer-metric-value"
      );

    if (metricValues.length > 0) {
      metricValues[0].textContent =
        state.total.toLocaleString("en-IN");
    }
  }

  async function refresh() {

    console.log(
      "[Explorer] Requesting agreements:",
      state
    );

    const data =
      await Api.agreements({
        search: state.search,
        riskBand: state.riskBand,
        assetModel: state.assetModel,
        sortBy: state.sortBy,
        sortDir: state.sortDir,
        limit: state.limit,
        offset: state.offset
      });

    console.log(
      "[Explorer] Agreements response:",
      data
    );

    if (!data) {
      throw new Error(
        "Agreements API returned no data"
      );
    }

    state.total =
      Number(data.total || 0);

    renderRows(
      Array.isArray(data.rows)
        ? data.rows
        : []
    );

    updatePager();

    return data;
  }

  async function safeRefresh() {

    try {

      await refresh();

    } catch (error) {

      console.error(
        "[Explorer] Refresh failed:",
        error
      );

      const tbody =
        document.querySelector(
          "#agreementsTable tbody"
        );

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9"
                style="
                  text-align:center;
                  padding:36px;
                  color:var(--danger);
                ">
              <strong>AGREEMENT API ERROR</strong>
              <br>
              <span style="
                display:block;
                margin-top:8px;
                color:var(--text-dim);
                font-size:12px;
              ">
                ${escapeHtml(error.message)}
              </span>
            </td>
          </tr>
        `;
      }
    }
  }

  async function openDetail(agmtId) {

    const backdrop =
      document.getElementById(
        "detailModalBackdrop"
      );

    const content =
      document.getElementById(
        "detailModalContent"
      );

    if (!backdrop || !content) {
      console.error(
        "[Explorer] Detail modal elements missing"
      );
      return;
    }

    backdrop.classList.add("active");

    content.innerHTML = `
      <div class="detail-loading">
        Loading agreement ${escapeHtml(agmtId)}…
      </div>
    `;

    try {

      const data =
        await Api.agreementDetail(agmtId);

      const a =
        data.agreement;

      content.innerHTML = `
        <h2 style="margin:0 0 4px;">
          ${escapeHtml(a["Agmt Id"])}
          <span
            class="badge ${escapeHtml(a["Risk_Band"])}"
            style="margin-left:8px;">
            ${escapeHtml(a["Risk_Band"])}
          </span>
        </h2>

        <p style="
          color:var(--text-dim);
          margin:0 0 12px;
          font-size:13px;
        ">
          ${escapeHtml(a["Asset Model"])}
          ·
          ${escapeHtml(a["Asset Fuel Type"])}
          ·
          ${escapeHtml(a["Cust Region"])},
          ${escapeHtml(a["Cust State"])}
        </p>

        <div class="detail-grid">

          <div class="k">Residual Risk Score</div>
          <div class="v">
            ${a["Residual_Risk_Score"]} / 100
          </div>

          <div class="k">Predicted Sold Amount</div>
          <div class="v">
            ${fmt.currency(a["Predicted_Sold_Amount"])}
          </div>

          <div class="k">DL Model Prediction</div>
          <div class="v">
            ${fmt.currency(a["DL_Predicted_Sold_Amount"])}
          </div>

          <div class="k">Ensemble Prediction</div>
          <div class="v">
            ${fmt.currency(a["Ensemble_Predicted_Sold_Amount"])}
          </div>

          <div class="k">Actual Sold Amount</div>
          <div class="v">
            ${fmt.currency(
              a["Target Sold Amount At Liquidation"]
            )}
          </div>

          <div class="k">Recovery Ratio</div>
          <div class="v">
            ${fmt.pct(a["Recovery_Ratio"])}
          </div>

          <div class="k">Asset Health Index</div>
          <div class="v">
            ${Number(
              a["Asset_Health_Index"]
            ).toFixed(1)}
          </div>

          <div class="k">Segment Risk Index</div>
          <div class="v">
            ${a["Segment_Risk_Index"]}
          </div>

          <div class="k">12M Forecast</div>
          <div class="v">
            ${fmt.currency(
              a["Residual_Value_Forecast_12M"]
            )}
          </div>

          <div class="k">24M Forecast</div>
          <div class="v">
            ${fmt.currency(
              a["Residual_Value_Forecast_24M"]
            )}
          </div>

          <div class="k">36M Forecast</div>
          <div class="v">
            ${fmt.currency(
              a["Residual_Value_Forecast_36M"]
            )}
          </div>

          <div class="k">Profitability Score</div>
          <div class="v">
            ${Number(
              a["Profitability_Score"]
            ).toFixed(2)}
          </div>

        </div>

        <h3 style="
          margin:20px 0 6px;
          font-size:14px;
        ">
          Lending Recommendation
        </h3>

        <div class="detail-grid">

          <div class="k">
            LTV (current → recommended)
          </div>

          <div class="v">
            ${fmt.pct(a["LTV"], 1)}
            →
            ${fmt.pct(a["Recommended_LTV"], 1)}
          </div>

          <div class="k">
            Rate (current → recommended)
          </div>

          <div class="v">
            ${a["Cust Net IRR"]}%
            →
            ${a["Recommended_Pricing"]}%
          </div>

          <div class="k">
            Tenure (current → recommended)
          </div>

          <div class="v">
            ${a["Tenure"]}
            →
            ${a["Recommended_Tenure"]} mo
          </div>

        </div>

        <h3 style="
          margin:20px 0 6px;
          font-size:14px;
        ">
          Top Risk Drivers (SHAP)
        </h3>

        <div class="driver-list">

          ${(data.top_risk_drivers || [])
            .map(d => `
              <div class="driver-row">

                <span>
                  ${escapeHtml(d.feature)}
                </span>

                <span class="impact ${
                  d.impact >= 0 ? "pos" : "neg"
                }">
                  ${d.impact >= 0 ? "+" : ""}
                  ${d.impact}
                </span>

              </div>
            `)
            .join("")}

        </div>

        <button
          class="btn-ghost"
          style="
            margin-top:16px;
            width:100%;
          "
          onclick="Explorer.askCopilot('${escapeHtml(a["Agmt Id"])}')">

          💬 Ask AI Copilot about
          ${escapeHtml(a["Agmt Id"])}

        </button>
      `;

    } catch (e) {

      console.error(
        "[Explorer] Detail error:",
        e
      );

      content.innerHTML = `
        <p style="color:var(--danger);">
          Could not load agreement details.
        </p>

        <p style="
          color:var(--text-dim);
          font-size:12px;
        ">
          ${escapeHtml(e.message)}
        </p>
      `;
    }
  }

  function closeDetail() {

    const backdrop =
      document.getElementById(
        "detailModalBackdrop"
      );

    if (backdrop) {
      backdrop.classList.remove("active");
    }
  }

  function askCopilot(agmtId) {

    closeDetail();

    const chatNav =
      document.querySelector(
        '.nav-item[data-view="chat"]'
      );

    if (chatNav) {
      chatNav.click();
    }

    if (window.Chat) {
      Chat.sendMessage(
        `Explain the risk profile and lending recommendation for ${agmtId}`
      );
    }
  }

  function bindControls() {

    console.log(
      "[Explorer] Binding controls..."
    );

    const searchInput =
      document.getElementById("searchInput");

    const riskBandFilter =
      document.getElementById("riskBandFilter");

    const assetModelFilter =
      document.getElementById("assetModelFilter");

    const sortBySelect =
      document.getElementById("sortBySelect");

    const prevPage =
      document.getElementById("prevPage");

    const nextPage =
      document.getElementById("nextPage");

    const closeModalBtn =
      document.getElementById("closeModalBtn");

    const modalBackdrop =
      document.getElementById(
        "detailModalBackdrop"
      );

    /*
     * None of these should prevent the Explorer
     * from loading its data.
     */

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        e => {
          state.search = e.target.value;
          state.offset = 0;
          safeRefresh();
        }
      );
    } else {
      console.warn(
        "[Explorer] #searchInput not found"
      );
    }

    if (riskBandFilter) {
      riskBandFilter.addEventListener(
        "change",
        e => {
          state.riskBand = e.target.value;
          state.offset = 0;
          safeRefresh();
        }
      );
    }

    if (assetModelFilter) {
      assetModelFilter.addEventListener(
        "change",
        e => {
          state.assetModel = e.target.value;
          state.offset = 0;
          safeRefresh();
        }
      );
    }

    if (sortBySelect) {
      sortBySelect.addEventListener(
        "change",
        e => {
          state.sortBy = e.target.value;
          state.offset = 0;
          safeRefresh();
        }
      );
    }

    if (prevPage) {
      prevPage.addEventListener(
        "click",
        () => {
          state.offset =
            Math.max(
              0,
              state.offset - state.limit
            );

          safeRefresh();
        }
      );
    }

    if (nextPage) {
      nextPage.addEventListener(
        "click",
        () => {
          if (
            state.offset + state.limit <
            state.total
          ) {
            state.offset += state.limit;
            safeRefresh();
          }
        }
      );
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener(
        "click",
        closeDetail
      );
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener(
        "click",
        e => {
          if (
            e.target.id ===
            "detailModalBackdrop"
          ) {
            closeDetail();
          }
        }
      );
    }
  }

  async function init() {

    console.log(
      "[Explorer] ===== INIT ====="
    );

    bindControls();

    await initFilters();

    await refresh();

    console.log(
      "[Explorer] ===== READY ====="
    );
  }

  return {
    init,
    refresh,
    openDetail,
    askCopilot
  };

})();