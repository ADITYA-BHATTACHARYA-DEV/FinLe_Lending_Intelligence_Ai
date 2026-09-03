const ScenarioLab = (() => {
  let chart;

  function render(scenarios) {
    const ctx = document.getElementById("scenarioChart");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: scenarios.map(s => s.scenario),
        datasets: [
          {
            label: "Avg Residual Risk Score",
            data: scenarios.map(s => s.avg_residual_risk_score),
            backgroundColor: "#ef5b6b",
            borderRadius: 6,
            yAxisID: "y"
          },
          {
            label: "Avg Recovery Ratio (%)",
            data: scenarios.map(s => (s.avg_recovery_ratio * 100).toFixed(1)),
            backgroundColor: "#29c9a3",
            borderRadius: 6,
            yAxisID: "y"
          }
        ]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: "bottom" } }
      }
    });

    const tbody = document.querySelector("#scenarioTable tbody");
    tbody.innerHTML = scenarios.map(s => `
      <tr>
        <td>${s.scenario}</td>
        <td>${fmt.pct(s.avg_recovery_ratio)}</td>
        <td>${s.avg_residual_risk_score}</td>
        <td>${s.critical_pct}%</td>
        <td>${fmt.currencyCompact(s.portfolio_value_at_risk)}</td>
      </tr>
    `).join("");
  }

  async function init(data) {
    render(data.scenario_results);
  }

  return { init };
})();
