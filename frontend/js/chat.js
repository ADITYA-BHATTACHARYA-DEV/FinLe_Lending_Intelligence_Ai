// // const Chat = (() => {
// //   let history = [];

// //   function appendMessage(role, text, thinking = false) {
// //     const container = document.getElementById("chatMessages");
// //     const div = document.createElement("div");
// //     div.className = `msg ${role === "user" ? "user" : "bot"}${thinking ? " thinking" : ""}`;
// //     div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
// //     container.appendChild(div);
// //     container.scrollTop = container.scrollHeight;
// //     return div;
// //   }

// //   function escapeHtml(str) {
// //     return str
// //       .replace(/&/g, "&amp;")
// //       .replace(/</g, "&lt;")
// //       .replace(/>/g, "&gt;")
// //       .replace(/\n/g, "<br>");
// //   }

// //   async function sendMessage(text) {
// //     if (!text || !text.trim()) return;
// //     appendMessage("user", text);
// //     history.push({ role: "user", content: text });

// //     const thinkingEl = appendMessage("bot", "thinking…", true);

// //     try {
// //       const res = await Api.chat(text, history.slice(0, -1));
// //       thinkingEl.remove();
// //       appendMessage("bot", res.reply);
// //       history.push({ role: "assistant", content: res.reply });
// //     } catch (e) {
// //       thinkingEl.remove();
// //       appendMessage("bot", "Sorry, I couldn't reach the backend. Make sure the Flask API is running on http://localhost:5000.");
// //     }
// //   }

// //   function init() {
// //     const input = document.getElementById("chatInput");
// //     const sendBtn = document.getElementById("chatSendBtn");

// //     sendBtn.addEventListener("click", () => {
// //       sendMessage(input.value);
// //       input.value = "";
// //     });
// //     input.addEventListener("keydown", (e) => {
// //       if (e.key === "Enter") {
// //         sendMessage(input.value);
// //         input.value = "";
// //       }
// //     });
// //     document.querySelectorAll(".chip").forEach(chip => {
// //       chip.addEventListener("click", () => {
// //         sendMessage(chip.textContent);
// //       });
// //     });
// //   }

// //   return { init, sendMessage };
// // })();




// const Chat = (() => {
//   let history = [];
//   let sending = false;

//   function escapeHtml(str) {
//     return String(str)
//       .replace(/&/g, "&amp;")
//       .replace(/</g, "&lt;")
//       .replace(/>/g, "&gt;")
//       .replace(/\n/g, "<br>");
//   }

//   function appendMessage(role, text, thinking = false) {
//     const container = document.getElementById("chatMessages");

//     if (!container) {
//       console.error("#chatMessages not found");
//       return null;
//     }

//     const div = document.createElement("div");

//     div.className =
//       `msg ${role === "user" ? "user" : "bot"}${thinking ? " thinking" : ""}`;

//     div.innerHTML = `
//       <div class="msg-bubble">
//         ${escapeHtml(text)}
//       </div>
//     `;

//     container.appendChild(div);
//     container.scrollTop = container.scrollHeight;

//     return div;
//   }

//   async function sendMessage(text) {
//     text = String(text || "").trim();

//     if (!text || sending) {
//       return;
//     }

//     sending = true;

//     const input = document.getElementById("chatInput");
//     const sendBtn = document.getElementById("chatSendBtn");

//     if (input) input.disabled = true;
//     if (sendBtn) sendBtn.disabled = true;

//     appendMessage("user", text);

//     history.push({
//       role: "user",
//       content: text
//     });

//     const thinkingEl = appendMessage(
//       "bot",
//       "Analyzing portfolio context…",
//       true
//     );

//     try {
//       const res = await Api.chat(
//         text,
//         history.slice(0, -1)
//       );

//       if (thinkingEl) {
//         thinkingEl.remove();
//       }

//       if (!res || !res.reply) {
//         throw new Error("Empty response from chat API");
//       }

//       appendMessage("bot", res.reply);

//       history.push({
//         role: "assistant",
//         content: res.reply
//       });

//     } catch (error) {
//       console.error("Copilot error:", error);

//       if (thinkingEl) {
//         thinkingEl.remove();
//       }

//       appendMessage(
//         "bot",
//         "Copilot is unavailable. Check that Flask is running on port 5000 and Ollama is running on port 11434."
//       );

//     } finally {
//       sending = false;

//       if (input) {
//         input.disabled = false;
//         input.focus();
//       }

//       if (sendBtn) {
//         sendBtn.disabled = false;
//       }
//     }
//   }

//   function init() {
//     const input = document.getElementById("chatInput");
//     const sendBtn = document.getElementById("chatSendBtn");

//     if (!input || !sendBtn) {
//       console.error(
//         "Chat initialization failed: #chatInput or #chatSendBtn missing."
//       );
//       return;
//     }

//     sendBtn.addEventListener("click", () => {
//       const value = input.value;
//       input.value = "";
//       sendMessage(value);
//     });

//     input.addEventListener("keydown", event => {
//       if (event.key === "Enter" && !event.shiftKey) {
//         event.preventDefault();

//         const value = input.value;
//         input.value = "";

//         sendMessage(value);
//       }
//     });

//     document.querySelectorAll(".chip").forEach(chip => {
//       chip.addEventListener("click", () => {
//         sendMessage(chip.textContent.trim());
//       });
//     });

//     console.log("EPIC Copilot initialized");
//   }

//   return {
//     init,
//     sendMessage
//   };
// })();







const Chat = (() => {
  let history = [];
  let sending = false;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  function appendMessage(role, text, thinking = false) {
    const container = document.getElementById("chatMessages");
    if (!container) return null;

    const div = document.createElement("div");
    div.className = `msg ${role === "user" ? "user" : "bot"}${thinking ? " thinking" : ""}`;
    div.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  async function sendMessage(text) {
    text = String(text || "").trim();
    if (!text || sending) return;

    sending = true;

    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("chatSendBtn");

    if (input) input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    appendMessage("user", text);
    history.push({ role: "user", content: text });

    const thinkingEl = appendMessage("bot", "Analyzing portfolio context…", true);

    try {
      const res = await Api.chat(text, history.slice(0, -1));
      thinkingEl?.remove();

      if (!res || !res.reply) throw new Error("Empty response from chat API");

      appendMessage("bot", res.reply);
      history.push({ role: "assistant", content: res.reply });
    } catch (error) {
      console.error("Copilot error:", error);
      thinkingEl?.remove();
      appendMessage("bot", "Copilot is unreachable. Verify Flask is running on port 5000 and Ollama on port 11434.");
    } finally {
      sending = false;
      if (input) {
        input.disabled = false;
        input.focus();
      }
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  function init() {
    const input = document.getElementById("chatInput");
    const sendBtn = document.getElementById("chatSendBtn");

    if (!input || !sendBtn) {
      console.error("Chat init failed: #chatInput or #chatSendBtn missing from DOM.");
      return;
    }

    sendBtn.onclick = (e) => {
      e.preventDefault();
      const val = input.value;
      input.value = "";
      sendMessage(val);
    };

    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const val = input.value;
        input.value = "";
        sendMessage(val);
      }
    };

    document.querySelectorAll(".chip").forEach(chip => {
      chip.onclick = () => sendMessage(chip.textContent.trim());
    });
  }

  return { init, sendMessage };
})();