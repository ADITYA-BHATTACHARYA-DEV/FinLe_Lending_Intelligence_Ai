// Base URL of the Flask backend. Change if you run the API on a different host/port.
const API_BASE = "";

const Api = {
  async dashboard() {
    const res = await fetch(`${API_BASE}/api/dashboard`);
    if (!res.ok) throw new Error("Failed to load dashboard data");
    return res.json();
  },

  async filters() {
    const res = await fetch(`${API_BASE}/api/filters`);
    return res.json();
  },

  async agreements({ search = "", riskBand = "All", assetModel = "All", sortBy = "Residual_Risk_Score", sortDir = "desc", limit = 25, offset = 0 } = {}) {
    const params = new URLSearchParams({
      search, risk_band: riskBand, asset_model: assetModel,
      sort_by: sortBy, sort_dir: sortDir, limit, offset
    });
    const res = await fetch(`${API_BASE}/api/agreements?${params}`);
    return res.json();
  },

  async agreementDetail(agmtId) {
    const res = await fetch(`${API_BASE}/api/agreement/${encodeURIComponent(agmtId)}`);
    if (!res.ok) throw new Error("Agreement not found");
    return res.json();
  },

  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  },

  async chat(message, history) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });
    return res.json();
  }
};

// Shared formatting helpers
const fmt = {
  currency(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  },
  currencyCompact(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr";
    if (abs >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L";
    return "₹" + Number(n).toLocaleString("en-IN");
  },
  pct(n, digits = 1) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return (n * 100).toFixed(digits) + "%";
  },
  num(n, digits = 1) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toFixed(digits);
  }
};
