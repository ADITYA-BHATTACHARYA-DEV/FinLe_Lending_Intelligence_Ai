const DigitalTwin = (() => {
  let currentResult = null;
  const baseline = {
    ltv: 86.5,
    recovery: 0.371,
    risk: 40.295,
    health: 78.215,
    var: 123456789
  };

  // =========================================================
  // FORMATTERS
  // =========================================================
  function pct(value, decimals = 1) {
    return `${Number(value).toFixed(decimals)}%`;
  }

  function ratioPct(value, decimals = 1) {
    return `${(Number(value) * 100).toFixed(decimals)}%`;
  }

  function currency(value) {
    value = Number(value);

    if (value >= 1e7) {
      return `₹${(value / 1e7).toFixed(2)} Cr`;
    }

    if (value >= 1e5) {
      return `₹${(value / 1e5).toFixed(2)} L`;
    }

    return `₹${value.toLocaleString("en-IN")}`;
  }

  function signed(value, decimals = 1, suffix = "") {
    value = Number(value);

    if (value > 0) {
      return `+${value.toFixed(decimals)}${suffix}`;
    }

    return `${value.toFixed(decimals)}${suffix}`;
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function value(id, fallback = 0) {
    const element = document.getElementById(id);

    if (!element) {
      return fallback;
    }

    const parsed = Number(element.value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  // =========================================================
  // CONTROLS
  // =========================================================
  function readControls() {
    return {
      asset_model: document.getElementById("twinAssetModel")?.value || "ALL",
      ltv: value("twinLtv", baseline.ltv),
      recovery_adjustment: value("twinRecovery", 0),
      residual_adjustment: value("twinResidual", 0),
      pricing_adjustment: value("twinPricing", 0),
      tenure_adjustment: value("twinTenure", 0)
    };
  }

  // =========================================================
  // SLIDER UI
  // =========================================================
  function updateLabels() {
    const ltv = value("twinLtv", baseline.ltv);
    const recovery = value("twinRecovery");
    const residual = value("twinResidual");
    const pricing = value("twinPricing");
    const tenure = value("twinTenure");

    setText("twinLtvValue", pct(ltv));
    setText("twinRecoveryValue", signed(recovery, 0, "%"));
    setText("twinResidualValue", signed(residual, 0, "%"));
    setText("twinPricingValue", signed(pricing, 2, "%"));
    setText("twinTenureValue", signed(tenure, 0, " months"));

    updateSliderFill("twinLtv");
    updateSliderFill("twinRecovery");
    updateSliderFill("twinResidual");
    updateSliderFill("twinPricing");
    updateSliderFill("twinTenure");
  }

  function updateSliderFill(id) {
    const slider = document.getElementById(id);

    if (!slider) return;

    const min = Number(slider.min);
    const max = Number(slider.max);
    const current = Number(slider.value);

    const percentage = ((current - min) / (max - min)) * 100;

    slider.style.background = `linear-gradient(
      90deg,
      #29c9a3 0%,
      #29c9a3 ${percentage}%,
      rgba(255,255,255,.10) ${percentage}%,
      rgba(255,255,255,.10) 100%
    )`;
  }

  // =========================================================
  // SIMULATION
  // =========================================================
  function simulate(c) {
    const ltvDelta = c.ltv - baseline.ltv;
    const recoveryAdjustment = c.recovery_adjustment / 100;
    const residualAdjustment = c.residual_adjustment / 100;

    let recovery =
      baseline.recovery +
      recoveryAdjustment * 0.20 -
      residualAdjustment * 0.08 -
      (ltvDelta / 100) * 0.025;

    recovery = Math.max(0, Math.min(1, recovery));

    let risk =
      baseline.risk +
      ltvDelta * 0.08 -
      recoveryAdjustment * 18 +
      residualAdjustment * 22 +
      c.tenure_adjustment * 0.08 -
      c.pricing_adjustment * 0.30;

    risk = Math.max(0, Math.min(100, risk));

    let health =
      baseline.health -
      (risk - baseline.risk) * 0.45 +
      (recovery - baseline.recovery) * 30;

    health = Math.max(0, Math.min(100, health));

    let multiplier =
      1 +
      (risk - baseline.risk) / 100 -
      (recovery - baseline.recovery) * 0.75;

    multiplier = Math.max(0.5, multiplier);

    const simulatedVaR = baseline.var * multiplier;

    return {
      baseline: {
        ltv: baseline.ltv,
        recovery: baseline.recovery,
        risk: baseline.risk,
        health: baseline.health,
        var: baseline.var
      },
      simulated: {
        ltv: c.ltv,
        recovery,
        risk,
        health,
        var: simulatedVaR
      },
      delta: {
        ltv: c.ltv - baseline.ltv,
        recovery: recovery - baseline.recovery,
        risk: risk - baseline.risk,
        health: health - baseline.health,
        var: simulatedVaR - baseline.var
      },
      controls: c
    };
  }

  // =========================================================
  // RENDER
  // =========================================================
  function render(result) {
    currentResult = result;

    const b = result.baseline;
    const s = result.simulated;
    const d = result.delta;

    setText("twinBaselineRecovery", ratioPct(b.recovery));
    setText("twinSimRecovery", ratioPct(s.recovery));
    setText("twinRecoveryDelta", signed(d.recovery * 100, 1, " pp"));

    setText("twinBaselineRisk", b.risk.toFixed(2));
    setText("twinSimRisk", s.risk.toFixed(2));
    setText("twinRiskDelta", signed(d.risk, 2));

    setText("twinBaselineHealth", b.health.toFixed(2));
    setText("twinSimHealth", s.health.toFixed(2));
    setText("twinHealthDelta", signed(d.health, 2));

    setText("twinBaselineVaR", currency(b.var));
    setText("twinSimVaR", currency(s.var));
    setText("twinVaRDelta", signed(d.var, 0));

    setText("twinImpactLtv", signed(d.ltv, 1, " pp"));
    setText("twinImpactRecovery", signed(d.recovery * 100, 1, " pp"));
    setText("twinImpactRisk", signed(d.risk, 2));
    setText("twinImpactHealth", signed(d.health, 2));
    setText("twinImpactVaR", signed(d.var, 0));

    renderIntelligence(result);
    setStatus("DIGITAL TWIN COMPLETE");
  }

  // =========================================================
  // INTELLIGENCE
  // =========================================================
  function renderIntelligence(result) {
    const d = result.delta;

    let signal = "No material change detected";
    let decision = "Maintain baseline assumptions";
    let monitoring = "Continue monitoring baseline metrics";
    let feedback = "Awaiting observed portfolio outcome";

    if (d.recovery < -0.02) {
      signal = "Recovery compression detected";
      decision = "Review recovery assumptions";
      monitoring = "Monitor recovery ratio and residual risk";
    } else if (d.risk > 3) {
      signal = "Residual risk score increased";
      decision = "Review lending and residual-value assumptions";
      monitoring = "Monitor residual risk score";
    } else if (d.var > baseline.var * 0.05) {
      signal = "Portfolio value-at-risk increased";
      decision = "Review scenario before applying changes";
      monitoring = "Monitor portfolio value-at-risk";
    } else if (d.recovery > 0.02) {
      signal = "Recovery improvement simulated";
      decision = "Compare simulated recovery with baseline";
      monitoring = "Monitor realized recovery";
    }

    setText("twinSignal", signal);
    setText("twinDecisionBasis", decision);
    setText("twinMonitoring", monitoring);
    setText("twinFeedback", feedback);
  }

  // =========================================================
  // STATUS
  // =========================================================
  function setStatus(text) {
    const status = document.getElementById("digitalTwinStatus");

    if (!status) return;

    status.innerHTML = `
      <span class="live-dot"></span>
      ${text}
    `;
  }

  // =========================================================
  // PRESETS
  // =========================================================
  function preset(name) {
    const settings = {
      baseline: {
        ltv: 86.5,
        recovery: 0,
        residual: 0,
        pricing: 0,
        tenure: 0
      },
      conservative: {
        ltv: 70,
        recovery: 0,
        residual: 0,
        pricing: 1,
        tenure: -6
      },
      recovery: {
        ltv: 86.5,
        recovery: -15,
        residual: 0,
        pricing: 0,
        tenure: 0
      },
      residual: {
        ltv: 86.5,
        recovery: 0,
        residual: -15,
        pricing: 0,
        tenure: 0
      },
      combined: {
        ltv: 70,
        recovery: -15,
        residual: -15,
        pricing: 1,
        tenure: -6
      }
    };

    const p = settings[name];

    if (!p) return;

    document.getElementById("twinLtv").value = p.ltv;
    document.getElementById("twinRecovery").value = p.recovery;
    document.getElementById("twinResidual").value = p.residual;
    document.getElementById("twinPricing").value = p.pricing;
    document.getElementById("twinTenure").value = p.tenure;

    document.querySelectorAll("[data-twin-preset]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.twinPreset === name
      );
    });

    updateLabels();
    run();
  }

  // =========================================================
  // RUN
  // =========================================================
  function run() {
    const button = document.getElementById("runTwinBtn");

    if (button) {
      button.disabled = true;
      button.innerHTML = "SIMULATING <span>⟳</span>";
    }

    setStatus("DIGITAL TWIN RUNNING");

    setTimeout(() => {
      try {
        const controls = readControls();
        const result = simulate(controls);
        render(result);

        console.log("[DigitalTwin] Simulation result:", result);
      } catch (error) {
        console.error("[DigitalTwin] Error:", error);
        setStatus("DIGITAL TWIN ERROR");
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = "RUN DIGITAL TWIN <span>⚡</span>";
        }
      }
    }, 500);
  }

  // =========================================================
  // RESET
  // =========================================================
  function reset() {
    preset("baseline");

    [
      "twinBaselineRecovery",
      "twinSimRecovery",
      "twinRecoveryDelta",
      "twinBaselineRisk",
      "twinSimRisk",
      "twinRiskDelta",
      "twinBaselineHealth",
      "twinSimHealth",
      "twinHealthDelta",
      "twinBaselineVaR",
      "twinSimVaR",
      "twinVaRDelta",
      "twinImpactLtv",
      "twinImpactRecovery",
      "twinImpactRisk",
      "twinImpactHealth",
      "twinImpactVaR"
    ].forEach(id => {
      setText(id, "--");
    });

    setText("twinSignal", "Waiting for simulation");
    setText("twinDecisionBasis", "No decision generated");
    setText("twinMonitoring", "Monitoring inactive");
    setText("twinFeedback", "Awaiting simulated outcome");

    setStatus("DIGITAL TWIN READY");
    currentResult = null;
  }

  // =========================================================
  // EVENT BINDING
  // =========================================================
  function bind() {
    const sliderIds = [
      "twinLtv",
      "twinRecovery",
      "twinResidual",
      "twinPricing",
      "twinTenure"
    ];

    sliderIds.forEach(id => {
      const slider = document.getElementById(id);
      if (!slider) return;
      slider.addEventListener("input", updateLabels);
    });

    document.querySelectorAll("[data-twin-preset]").forEach(button => {
      button.addEventListener("click", () =>
        preset(button.dataset.twinPreset)
      );
    });

    const runButton = document.getElementById("runTwinBtn");
    if (runButton) {
      runButton.addEventListener("click", run);
    }

    const resetButton = document.getElementById("resetTwinBtn");
    if (resetButton) {
      resetButton.addEventListener("click", reset);
    }

    updateLabels();
    run();

    console.log("[DigitalTwin] Standalone module loaded successfully.");
  }

  // =========================================================
  // INIT
  // =========================================================
  function init() {
    if (!document.getElementById("view-digital-twin")) {
      return;
    }

    bind();
  }

  return {
    init,
    run,
    reset,
    getResult: () => currentResult
  };
})();

document.addEventListener("DOMContentLoaded", DigitalTwin.init);