// // // document.addEventListener("DOMContentLoaded", async () => {
// // //   const navItems = document.querySelectorAll(".nav-item");
// // //   const views = document.querySelectorAll(".view");

// // //   function showView(name) {
// // //     navItems.forEach(n => n.classList.toggle("active", n.dataset.view === name));
// // //     views.forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
// // //   }

// // //   navItems.forEach(item => {
// // //     item.addEventListener("click", () => showView(item.dataset.view));
// // //   });

// // //   document.getElementById("refreshBtn").addEventListener("click", async () => {
// // //     await Dashboard.load();
// // //   });

// // //   // Initial load
// // //   try {
// // //     const data = await Dashboard.load();
// // //     await Explorer.init();
// // //     await ScenarioLab.init(data);
// // //     Chat.init();
// // //   } catch (e) {
// // //     console.error(e);
// // //     document.getElementById("kpiGrid").innerHTML =
// // //       `<div class="kpi-card"><div class="kpi-label">Backend unreachable</div>
// // //        <div class="kpi-value" style="font-size:15px; color:var(--danger);">
// // //        Start the Flask API (python backend/app.py) on http://localhost:5000, then refresh this page.
// // //        </div></div>`;
// // //   }
// // // });








// // document.addEventListener("DOMContentLoaded", async () => {
// //   const navItems = document.querySelectorAll(".nav-item");
// //   const views = document.querySelectorAll(".view");

// //   function showView(name, updateUrl = true) {
// //     navItems.forEach(item => {
// //       item.classList.toggle(
// //         "active",
// //         item.dataset.view === name
// //       );
// //     });

// //     const current = document.querySelector(".view.active");

// //     if (current && current.id !== `view-${name}`) {
// //       current.classList.remove("active");
// //     }

// //     requestAnimationFrame(() => {
// //       views.forEach(view => {
// //         view.classList.toggle(
// //           "active",
// //           view.id === `view-${name}`
// //         );
// //       });
// //     });

// //     if (updateUrl) {
// //       history.replaceState(
// //         { view: name },
// //         "",
// //         `#${name}`
// //       );
// //     }

// //     window.scrollTo({
// //       top: 0,
// //       behavior: "smooth"
// //     });
// //   }

// //   /* -------------------------------------------------------
// //      Navigation
// //      ------------------------------------------------------- */

// //   navItems.forEach(item => {
// //     item.addEventListener("click", () => {
// //       showView(item.dataset.view);
// //     });
// //   });

// //   /* Restore current view from URL */
// //   const initialView =
// //     window.location.hash.replace("#", "") ||
// //     navItems[0]?.dataset.view ||
// //     "dashboard";

// //   showView(initialView, false);

// //   window.addEventListener("popstate", () => {
// //     const view =
// //       window.location.hash.replace("#", "") ||
// //       "dashboard";

// //     showView(view, false);
// //   });

// //   /* -------------------------------------------------------
// //      Refresh
// //      ------------------------------------------------------- */

// //   const refreshBtn =
// //     document.getElementById("refreshBtn");

// //   if (refreshBtn) {
// //     refreshBtn.addEventListener("click", async () => {
// //       refreshBtn.disabled = true;

// //       const original = refreshBtn.innerHTML;

// //       refreshBtn.innerHTML = "↻ REFRESHING";

// //       refreshBtn.style.opacity = ".65";

// //       try {
// //         await Dashboard.load();
// //       } catch (error) {
// //         console.error(error);
// //       } finally {
// //         setTimeout(() => {
// //           refreshBtn.disabled = false;
// //           refreshBtn.innerHTML = original;
// //           refreshBtn.style.opacity = "";
// //         }, 500);
// //       }
// //     });
// //   }

// //   /* -------------------------------------------------------
// //      Keyboard navigation
// //      ------------------------------------------------------- */

// //   document.addEventListener("keydown", event => {
// //     /*
// //       1 = Dashboard
// //       2 = Explorer
// //       3 = Scenario Lab
// //       4 = AI Copilot
// //     */

// //     if (
// //       event.target.matches("input, textarea, select")
// //     ) {
// //       return;
// //     }

// //     const shortcuts = {
// //       "1": "dashboard",
// //       "2": "explorer",
// //       "3": "scenario",
// //       "4": "chat"
// //     };

// //     if (shortcuts[event.key]) {
// //       showView(shortcuts[event.key]);
// //     }

// //     /* ESC closes agreement detail */
// //     if (event.key === "Escape") {
// //       const backdrop =
// //         document.getElementById(
// //           "detailModalBackdrop"
// //         );

// //       if (backdrop?.classList.contains("active")) {
// //         backdrop.classList.remove("active");
// //       }
// //     }
// //   });

// //   /* -------------------------------------------------------
// //      Initial data load
// //      ------------------------------------------------------- */

// //   try {
// //     const data = await Dashboard.load();

// //     await Explorer.init();

// //     await ScenarioLab.init(data);

// //     Chat.init();

// //   } catch (e) {
// //     console.error(e);

// //     const grid =
// //       document.getElementById("kpiGrid");

// //     if (grid) {
// //       grid.innerHTML = `
// //         <div class="kpi-card"
// //              style="grid-column:1/-1;">
// //           <div class="kpi-label">
// //             SYSTEM STATUS
// //           </div>

// //           <div class="kpi-value"
// //                style="
// //                  color:var(--danger);
// //                  font-size:14px;
// //                  line-height:1.5;
// //                ">
// //             BACKEND UNREACHABLE
// //           </div>

// //           <div style="
// //             margin-top:10px;
// //             color:var(--text-dim);
// //             font-family:var(--mono);
// //             font-size:10px;
// //           ">
// //             Start the Flask API on localhost:5000
// //             and refresh the terminal.
// //           </div>
// //         </div>
// //       `;
// //     }
// //   }
// // });






// document.addEventListener("DOMContentLoaded", async () => {
//   const navItems = document.querySelectorAll(".nav-item");
//   const views = document.querySelectorAll(".view");

//   function showView(name, updateUrl = true) {
//     navItems.forEach(item => {
//       item.classList.toggle(
//         "active",
//         item.dataset.view === name
//       );
//     });

//     const current = document.querySelector(".view.active");

//     if (current && current.id !== `view-${name}`) {
//       current.classList.remove("active");
//     }

//     requestAnimationFrame(() => {
//       views.forEach(view => {
//         view.classList.toggle(
//           "active",
//           view.id === `view-${name}`
//         );
//       });
//     });

//     if (updateUrl) {
//       history.replaceState(
//         { view: name },
//         "",
//         `#${name}`
//       );
//     }

//     window.scrollTo({
//       top: 0,
//       behavior: "smooth"
//     });
//   }

//   /* -------------------------------------------------------
//      Navigation & View State
//      ------------------------------------------------------- */

//   navItems.forEach(item => {
//     item.addEventListener("click", () => {
//       showView(item.dataset.view);
//     });
//   });

//   /* Restore current view from URL */
//   const initialView =
//     window.location.hash.replace("#", "") ||
//     navItems[0]?.dataset.view ||
//     "dashboard";

//   showView(initialView, false);

//   window.addEventListener("popstate", () => {
//     const view =
//       window.location.hash.replace("#", "") ||
//       "dashboard";

//     showView(view, false);
//   });

//   /* -------------------------------------------------------
//      Refresh Action
//      ------------------------------------------------------- */

//   const refreshBtn = document.getElementById("refreshBtn");

//   if (refreshBtn) {
//     refreshBtn.addEventListener("click", async () => {
//       refreshBtn.disabled = true;

//       const original = refreshBtn.innerHTML;

//       refreshBtn.innerHTML = "↻ REFRESHING";

//       refreshBtn.style.opacity = ".65";

//       try {
//         await Dashboard.load();
//       } catch (error) {
//         console.error("Refresh error:", error);
//       } finally {
//         setTimeout(() => {
//           refreshBtn.disabled = false;
//           refreshBtn.innerHTML = original;
//           refreshBtn.style.opacity = "";
//         }, 500);
//       }
//     });
//   }

//   /* -------------------------------------------------------
//      Keyboard Navigation
//      ------------------------------------------------------- */

//   document.addEventListener("keydown", event => {
//     /*
//       1 = Dashboard
//       2 = Explorer
//       3 = Scenario Lab
//       4 = AI Copilot
//     */

//     if (event.target.matches("input, textarea, select")) {
//       return;
//     }

//     const shortcuts = {
//       "1": "dashboard",
//       "2": "explorer",
//       "3": "scenario",
//       "4": "chat"
//     };

//     if (shortcuts[event.key]) {
//       showView(shortcuts[event.key]);
//     }

//     /* ESC closes agreement detail modal */
//     if (event.key === "Escape") {
//       const backdrop = document.getElementById("detailModalBackdrop");

//       if (backdrop?.classList.contains("active")) {
//         backdrop.classList.remove("active");
//       }
//     }
//   });

//   /* -------------------------------------------------------
//      UI Modules Initialization
//      Binding Chat listeners early so controls remain responsive
//      even if the initial backend connection fails.
//      ------------------------------------------------------- */

//   try {
//     Chat.init();
//   } catch (err) {
//     console.error("Chat initialization error:", err);
//   }

//   /* -------------------------------------------------------
//      Initial Data Load
//      ------------------------------------------------------- */

//   try {
//     const data = await Dashboard.load();

//     if (typeof Explorer !== "undefined" && Explorer.init) {
//       await Explorer.init();
//     }

//     if (typeof ScenarioLab !== "undefined" && ScenarioLab.init) {
//       await ScenarioLab.init(data);
//     }

//   } catch (e) {
//     console.error("Backend connection failed during startup:", e);

//     const grid = document.getElementById("kpiGrid");

//     if (grid) {
//       grid.innerHTML = `
//         <div class="kpi-card" style="grid-column:1/-1;">
//           <div class="kpi-label">
//             SYSTEM STATUS
//           </div>

//           <div class="kpi-value"
//                style="
//                  color:var(--danger);
//                  font-size:14px;
//                  line-height:1.5;
//                ">
//             BACKEND UNREACHABLE
//           </div>

//           <div style="
//             margin-top:10px;
//             color:var(--text-dim);
//             font-family:var(--mono);
//             font-size:10px;
//           ">
//             Start the Flask API on http://localhost:5000 and refresh the page.
//           </div>
//         </div>
//       `;
//     }
//   }
// });



document.addEventListener("DOMContentLoaded", async () => {
    console.log("[EPIC] Starting application...");

    const navItems = document.querySelectorAll(".nav-item");
    const views = document.querySelectorAll(".view");

    function showView(name) {
        navItems.forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.view === name
            );
        });

        views.forEach(view => {
            view.classList.toggle(
                "active",
                view.id === `view-${name}`
            );
        });
    }

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            showView(item.dataset.view);
        });
    });

    const refreshBtn = document.getElementById("refreshBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", async () => {
            try {
                await Dashboard.load();
            } catch (error) {
                console.error("[EPIC] Refresh failed:", error);
            }
        });
    }

    try {
        console.log("[EPIC] Calling /api/dashboard...");

        const data = await Api.dashboard();

        console.log("[EPIC] Dashboard API returned:", data);

        if (!data) {
            throw new Error("Dashboard API returned no data");
        }

        /*
         * IMPORTANT:
         * Load dashboard separately so a rendering error
         * isn't incorrectly reported as "backend unreachable".
         */
        try {
          document.addEventListener("DOMContentLoaded", async () => {
  console.log("[EPIC] Application starting...");

  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  function showView(name) {
    navItems.forEach(item => {
      item.classList.toggle("active", item.dataset.view === name);
    });

    views.forEach(view => {
      view.classList.toggle("active", view.id === `view-${name}`);
    });
  }

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      showView(item.dataset.view);
    });
  });

  const refreshBtn = document.getElementById("refreshBtn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      try {
        await Dashboard.load();
      } catch (error) {
        console.error("[EPIC] Refresh failed:", error);
      }
    });
  }

  try {
    console.log("[EPIC] Loading dashboard...");

    const data = await Dashboard.load();

    console.log("[EPIC] Dashboard loaded:", data);

    try {
      await Explorer.init();
      console.log("[EPIC] Explorer initialized.");
    } catch (error) {
      console.error("[EPIC] Explorer failed:", error);
    }

    try {
      await ScenarioLab.init(data);
      console.log("[EPIC] Scenario Lab initialized.");
    } catch (error) {
      console.error("[EPIC] Scenario Lab failed:", error);
    }

    try {
      Chat.init();
      console.log("[EPIC] Chat initialized.");
    } catch (error) {
      console.error("[EPIC] Chat failed:", error);
    }

    console.log("[EPIC] Application ready.");

  } catch (error) {
    console.error("[EPIC] REAL ERROR:", error);
    console.error(error.stack);

    const kpiGrid = document.getElementById("kpiGrid");

    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">SYSTEM ERROR</div>
          <div class="kpi-value"
               style="
                 font-size:14px;
                 color:var(--danger);
                 line-height:1.6;
               ">
            ${error.message || error}
          </div>
        </div>
      `;
    }
  }
});
            console.log("[EPIC] Dashboard rendered.");
        } catch (error) {
            console.error(
                "[EPIC] Dashboard RENDERING ERROR:",
                error
            );

            throw new Error(
                "Dashboard rendering failed: " +
                error.message
            );
        }

        try {
            await Explorer.init();
            console.log("[EPIC] Explorer initialized.");
        } catch (error) {
            console.error(
                "[EPIC] Explorer initialization failed:",
                error
            );
        }

        try {
            await ScenarioLab.init(data);
            console.log("[EPIC] Scenario Lab initialized.");
        } catch (error) {
            console.error(
                "[EPIC] Scenario initialization failed:",
                error
            );
        }

        try {
            Chat.init();
            console.log("[EPIC] Chat initialized.");
        } catch (error) {
            console.error(
                "[EPIC] Chat initialization failed:",
                error
            );
        }

        console.log("[EPIC] Application ready.");

    } catch (error) {

        console.error(
            "[EPIC] APPLICATION ERROR:",
            error
        );

        const kpiGrid =
            document.getElementById("kpiGrid");

        if (kpiGrid) {
            kpiGrid.innerHTML = `
                <div class="kpi-card">
                    <div class="kpi-label">
                        SYSTEM ERROR
                    </div>

                    <div class="kpi-value"
                         style="
                           font-size:14px;
                           color:var(--danger);
                           line-height:1.6;
                         ">
                        ${error.message || error}
                    </div>
                </div>
            `;
        }
    }
});