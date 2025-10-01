 import React, { useState, useEffect, useCallback, useRef } from "https://esm.sh/react@18";
  import ReactDOM from "https://esm.sh/react-dom@18/client";
  import { MessageCircle, Send, X, Wine } from "https://esm.sh/lucide-react@0.263.0?bundle";
  import { marked } from "https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js";
  import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.7.2/dist/socket.io.esm.min.js";
window.BOTTLR_SOCKET_URL = "https://nishantbundela.com";
// window.BOTTLR_SOCKET_PATH = "/socket.io"; // optional if default

  // ---------- CONFIG ----------
  // Prefer same-origin unless you override:
  const ORIGIN = window.location.origin;
  const BACKEND_CONFIG = {
    // If you’re running locally:
    // socketUrl: "http://localhost:8080",
    // If deployed:
		
    socketUrl: (window.BOTTLR_SOCKET_URL ?? ORIGIN),
    socketPath: (window.BOTTLR_SOCKET_PATH ?? "/socket.io"),
    // (Optional) REST base for users/chats/messages if you expose them:
    restBase: (window.BOTTLR_REST_BASE ?? ORIGIN)
  };

  // ---------- MARKED LINK SANITIZER ----------
  marked.use({
    renderer: {
      link(href, title, text) {
        const titleAttr = title ? ` title="${title}"` : "";
        let processedHref = href;
        try {
          const currentDomain = window.location.hostname;
          if (href && href.startsWith("http")) {
            const linkUrl = new URL(href);
            if (linkUrl.hostname === currentDomain) {
              processedHref = linkUrl.pathname + linkUrl.search + linkUrl.hash;
            }
          }
        } catch (_) {
          processedHref = href;
        }
        let linkClass = "";
        if (processedHref && processedHref.includes("/product/")) {
          linkClass = ' class="product-link"';
        }
        return `<a href="${processedHref}"${titleAttr}${linkClass} target="_self" rel="noopener noreferrer">${text}</a>`;
      },
    },
  });

  // ---------- BASIC LAYOUT WRAPPER ----------
  (function () {
    const isMobile = () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileUA = mobileRegex.test(ua);
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      const isMobileScreen = window.screen.width <= 768;
      return isMobileUA || (hasTouch && isSmallScreen) || isMobileScreen;
    };
    if (isMobile()) {
      console.log("📱 Mobile device detected - Bottlr widget disabled");
      return;
    }
    console.log("💻 Desktop device detected - Loading Bottlr widget");

    const bodyChildren = Array.from(document.body.childNodes);
    const wrapper = document.createElement("div");
    wrapper.id = "bottlr-wrapper";
    Object.assign(wrapper.style, { display: "flex", width: "100vw", height: "100vh", margin: "0", padding: "0" });

    const siteContainer = document.createElement("div");
    siteContainer.id = "bottlr-site-container";
    Object.assign(siteContainer.style, { flex: "1 1 100%", height: "100vh", overflow: "auto", boxSizing: "border-box" });

    const widgetContainer = document.createElement("div");
    widgetContainer.id = "bottlr-widget-container";
    Object.assign(widgetContainer.style, { flex: "0 0 0", height: "100vh", boxSizing: "border-box", overflow: "hidden" });

    bodyChildren.forEach((n) => siteContainer.appendChild(n));
    document.body.innerHTML = "";
    Object.assign(document.body.style, { margin: "0", padding: "0" });
    document.body.appendChild(wrapper);
    wrapper.appendChild(siteContainer);
    wrapper.appendChild(widgetContainer);

    const style = document.createElement("style");
    style.textContent = `
      html, body { margin:0; padding:0; overflow:hidden; height:100vh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
      .bottlr-widget-button {
        position:fixed; bottom:20px; right:20px; width:60px; height:60px; border-radius:50%;
        background:linear-gradient(135deg,#00FF7F 0%,#00E066 100%);
        display:flex; align-items:center; justify-content:center; box-shadow:0 8px 25px rgba(0,255,127,.4);
        cursor:pointer; border:none; transition:all .3s ease; z-index:9999; animation:pulse 2s infinite;
      }
      @keyframes pulse {
        0% { box-shadow: 0 8px 25px rgba(0,255,127,.4); }
        50% { box-shadow: 0 8px 25px rgba(0,255,127,.6), 0 0 0 10px rgba(0,255,127,.1); }
        100% { box-shadow: 0 8px 25px rgba(0,255,127,.4); }
      }
      .bottlr-widget-button:hover { transform:scale(1.1); box-shadow:0 10px 30px rgba(0,255,127,.6); }

      .bottlr-widget-card {
        width:100%; height:100%; display:flex; flex-direction:column;
        background:radial-gradient(50% 50% at 50% 50%, #99F3B4 0%, #fff 80%);
        box-shadow:-8px 0 24px rgba(0,0,0,.1); border-left:1px solid #d1fae5;
      }
      .bottlr-widget-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(0,0,0,.1); color:#1a1a1a; }
      .bottlr-widget-header h3 { margin:0; font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px; }
      .bottlr-close-btn { background:transparent; border:none; color:#1a1a1a; cursor:pointer; padding:8px; border-radius:6px; }
      .bottlr-close-btn:hover { background:rgba(0,0,0,.1); }

      .bottlr-widget-msgs { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; background:transparent; }
      .bottlr-msg { max-width:85%; animation:slideIn .3s ease-out; }
      @keyframes slideIn { from { opacity:0; transform:translateY(10px);} to { opacity:1; transform:translateY(0);} }
      .bottlr-msg.user { align-self:flex-end; margin-left:auto; }
      .bottlr-msg.bot { align-self:flex-start; }
      .bottlr-msg-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
      .bottlr-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; flex-shrink:0; }
      .bottlr-avatar.bot { background:#000; color:#00FF7F; }
      .bottlr-avatar.user { background:#e5e7eb; color:#374151; }
      .bottlr-msg-content { padding:16px 20px; border-radius:16px; line-height:1.5; font-size:15px; background:rgba(211,211,211,.30); backdrop-filter:blur(12px); color:#000; }
      .bottlr-msg-content a { color:#266064; text-decoration:none; } .bottlr-msg-content a:hover { text-decoration:underline; }
      .bottlr-msg-content p { margin:12px 0; } .bottlr-msg-content ul, .bottlr-msg-content ol { margin:16px 0; padding-left:20px; }
      .bottlr-msg-content img { max-width:100%; height:auto; display:block; margin:12px auto; border-radius:8px; }

      .bottlr-product-card { background:rgba(211,211,211,.30); backdrop-filter:blur(12px); border-radius:16px; padding:20px; margin:16px 0; text-align:center; width:300px; }
      .bottlr-product-category { font-size:18px; font-weight:700; margin-bottom:16px; }
      .bottlr-product-image { width:90%; height:auto; display:block; margin:0 auto 16px auto; border-radius:8px; }
      .bottlr-product-name { font-size:16px; font-weight:600; margin:12px 0; line-height:1.3; }
      .bottlr-product-button { width:100%; background:#00FF7F; color:#000; border:none; border-radius:25px; padding:16px 20px; font-size:16px; font-weight:700; cursor:pointer; transition:all .2s; margin-top:12px; box-shadow:0 2px 8px rgba(0,255,127,.2); }
      .bottlr-product-button:hover { background:#00E066; transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,255,127,.4); }

      .bottlr-options { margin-top:16px; display:flex; flex-direction:column; gap:12px; }
      .bottlr-option-btn { width:100%; background:rgba(0,0,0,.80); color:#fff; border:none; border-radius:16px; padding:16px 20px; cursor:pointer; transition:all .2s; text-align:left; font-size:15px; font-weight:600; display:flex; align-items:center; gap:12px; }
      .bottlr-option-btn:hover { background:#333; transform:translateY(-2px); }

      .bottlr-input-area { padding:16px; background:rgba(187,237,200,.40); backdrop-filter:blur(12px); border-top:1px solid rgba(0,0,0,.1); }
      .bottlr-input-container { display:flex; gap:12px; align-items:center; }
      .bottlr-input { flex:1; border:2px solid #5E5E5E; border-radius:18px; padding:12px 16px; resize:none; outline:none; font-size:15px; max-height:120px; min-height:44px; transition:border-color .2s; background:transparent; }
      .bottlr-input:focus { border-color:#00FF7F; } .bottlr-input::placeholder { color:#5e5e5e; }
      .bottlr-send-btn { width:50px; height:50px; border-radius:16px; background:transparent; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; }
      .bottlr-send-btn:hover { transform:scale(1.05); background:rgba(0,0,0,.1); }
      .bottlr-send-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

      .bottlr-typing { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#E3E6E2; border-radius:16px; width:fit-content; }
      .bottlr-typing-dots { display:flex; gap:4px; }
      .bottlr-typing-dot { width:8px; height:8px; background:#00FF7F; border-radius:50%; animation:bounce 1.4s infinite ease-in-out both; }
      .bottlr-typing-dot:nth-child(1){ animation-delay:-0.32s; } .bottlr-typing-dot:nth-child(2){ animation-delay:-0.16s; }
      @keyframes bounce { 0%,80%,100%{ transform:scale(0);} 40%{ transform:scale(1);} }

      .bottlr-status { padding:8px 16px; font-size:12px; color:#666; text-align:center; background:rgba(0,0,0,.05); border-radius:8px; margin:8px 0; }
      .bottlr-progress { width:100%; height:4px; background:#e0e0e0; border-radius:2px; overflow:hidden; margin:8px 0; }
      .bottlr-progress-bar { height:100%; background:#00FF7F; transition:width .3s ease; }

      .bottlr-widget-msgs::-webkit-scrollbar { width:6px; }
      .bottlr-widget-msgs::-webkit-scrollbar-thumb { background:rgba(0,0,0,.2); border-radius:3px; }
      .bottlr-widget-msgs::-webkit-scrollbar-thumb:hover { background:rgba(0,0,0,.3); }

      @media (max-width:768px){ #bottlr-site-container{ flex:0 0 0!important; } #bottlr-widget-container{ flex:1 1 100%!important; } }
    `;
    document.head.appendChild(style);

    const openWidget = () => {
      if (window.innerWidth <= 768) { siteContainer.style.flex = "0 0 0"; widgetContainer.style.flex = "1 1 100%"; }
      else { siteContainer.style.flex = "0 0 70vw"; widgetContainer.style.flex = "0 0 30vw"; }
    };
    const closeWidget = () => { siteContainer.style.flex = "1 1 100%"; widgetContainer.style.flex = "0 0 0"; };

    const root = document.createElement("div");
    root.id = "bottlr-chat-root";
    root.style.height = "100%";
    widgetContainer.appendChild(root);

    // ---------- Helpers ----------
    function ProductCard({ category, imageUrl, name, price, url, buttonText = "Add to Cart" }) {
      const handleProductClick = useCallback(() => {
        if (!url) return;
        let targetPath = url;
        try {
          const currentDomain = window.location.hostname;
          if (url.startsWith("http")) {
            const linkUrl = new URL(url);
            if (linkUrl.hostname === currentDomain) {
              targetPath = linkUrl.pathname + linkUrl.search + linkUrl.hash;
            }
          }
        } catch (_) { targetPath = url; }
        history.pushState({}, "", targetPath);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }, [url]);

      return React.createElement(
        "div", { className: "bottlr-product-card" },
        category && React.createElement("div", { className: "bottlr-product-category" }, category),
        imageUrl && React.createElement("img", { src: imageUrl, alt: name || "Product", className: "bottlr-product-image" }),
        name && React.createElement("div", { className: "bottlr-product-name" }, name),
        React.createElement("button", { className: "bottlr-product-button", onClick: handleProductClick }, `${buttonText}${price ? ` ${price}` : ""}`)
      );
    }

    function TypingIndicator() {
      return React.createElement(
        "div", { className: "bottlr-typing" },
        React.createElement("span", { style: { fontSize: "14px", color: "#666", marginRight: "8px" } }, "Typing"),
        React.createElement("div", { className: "bottlr-typing-dots" },
          React.createElement("div", { className: "bottlr-typing-dot" }),
          React.createElement("div", { className: "bottlr-typing-dot" }),
          React.createElement("div", { className: "bottlr-typing-dot" })
        )
      );
    }

    function parseProductFromResponse(text) {
      const productSeparator = "---PRODUCT---";
      const parts = String(text || "").split(productSeparator);
      if (parts.length < 2) return { textContent: text, productInfo: null };

      const textContent = parts[0].trim();
      const productData = parts[1].trim();
      const lines = productData.split("\n");
      const productInfo = {};
      lines.forEach((line) => {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length > 0) {
          let value = valueParts.join(":").trim();
          switch (key.trim().toUpperCase()) {
            case "CATEGORY": productInfo.category = value; break;
            case "NAME":     productInfo.name = value; break;
            case "PRICE":    productInfo.price = value; break;
            case "IMAGE": {
              const m = value.match(/\[([^\]]+)\]\(([^)]+)\)/);
              productInfo.imageUrl = m ? m[2] : value; break;
            }
            case "URL":      productInfo.url = value; break;
          }
        }
      });
      return { textContent, productInfo: Object.keys(productInfo).length ? productInfo : null };
    }

    // ---------- Chat (Socket.IO) ----------
    function ChatInterface() {
      const [messages, setMessages] = useState([
        {
          id: "welcome",
          type: "bot",
          content: "Hey! Let's find your perfect wine. How do you want to start?",
          options: ["Use my purchase history","Ask the AI-Sommelier","Find wines for dinner pairing","Get recommendations by style"],
        },
        {
          id: "disclaimer",
          type: "bot",
          content: "**We're actively developing this tool.** Reach out at [bottlr@parlourwines.com](mailto:bottlr@parlourwines.com).",
        },
      ]);
      const [input, setInput] = useState("");
      const [isTyping, setIsTyping] = useState(false);
      const [chatId, setChatId] = useState(null);
      const [userId, setUserId] = useState(null);
      const [userEmail, setUserEmail] = useState(null);
      const [status, setStatus] = useState("");
      const [progress, setProgress] = useState(0);
      const [debugMode, setDebugMode] = useState(false);
      const [socketState, setSocketState] = useState({ connected: false, id: null });
      const socketRef = useRef(null);
      const messagesEndRef = useRef(null);
      const streamingBotMsgIdRef = useRef(null);

      // Session bootstrap
      useEffect(() => {
        try {
          const sid = localStorage.getItem("bottlr_session_id") || `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
          const email = localStorage.getItem("bottlr_email") || `user_${Date.now()}@bottlr.anonymous`;
          localStorage.setItem("bottlr_session_id", sid);
          localStorage.setItem("bottlr_email", email);
          setUserId(sid);
          setUserEmail(email);
          setChatId(`chat_${sid}`);
        } catch {
          const fid = `anonymous_${Date.now()}`;
          setUserId(fid);
          setUserEmail("anonymous@bottlr.local");
          setChatId(`chat_${fid}`);
        }
      }, []);

      const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, []);
      useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

      const addMessage = useCallback((type, content, options = null) => {
        const m = { id: Date.now().toString() + Math.random().toString(36).slice(2,11), type, content, options, timestamp: new Date() };
        setMessages((prev) => [...prev, m]);
        return m.id;
      }, []);
      const updateMessage = useCallback((id, content) => {
        setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, content } : msg)));
      }, []);

      // Connect Socket.IO
      useEffect(() => {
        const socket = io(BACKEND_CONFIG.socketUrl, {
          path: BACKEND_CONFIG.socketPath,
          transports: ["websocket"],
          withCredentials: true,
        });
        socketRef.current = socket;

        socket.on("connect", () => setSocketState({ connected: true, id: socket.id }));
        socket.on("disconnect", () => setSocketState({ connected: false, id: null }));

        // Stream lifecycle
        socket.on("bttlr-stream-start", (data) => {
          setIsTyping(true);
          setStatus("Streaming…");
          const botId = addMessage("bot", "");
          streamingBotMsgIdRef.current = botId;
        });

        socket.on("bttlr-status-update", (data) => setStatus(data?.status || ""));
        socket.on("bttlr-progress", (data) => setProgress(Number(data?.progress) || 0));

        socket.on("bttlr-stream-chunk", (data) => {
          const id = streamingBotMsgIdRef.current;
          if (!id) return;
          const chunk = data?.chunk ?? "";
          // Append chunk
          const current = messages.find((m) => m.id === id)?.content || "";
          updateMessage(id, current + chunk);
        });

        // Optional metadata & artifacts
        socket.on("bttlr-stream-metadata", (data) => {
          // You can stash this to state if you want to render a table, etc.
          console.log("Metadata:", data?.table_data);
        });
        socket.on("bttlr-workflow-metadata", (data) => {
          console.log("Workflow:", data?.bttlr_api_workflow_data);
        });
        socket.on("bttlr-artifacts", (data) => {
          console.log("Artifacts:", data);
        });
        socket.on("bttlr-follow-up", (data) => {
          console.log("Follow up:", data?.follow_up);
        });

        socket.on("bttlr-stream-end", (data) => {
          // finalize message (content may already be complete from chunks)
          const id = streamingBotMsgIdRef.current;
          if (id && data?.final_response) updateMessage(id, data.final_response);
          setIsTyping(false); setStatus(""); setProgress(0);
          streamingBotMsgIdRef.current = null;
        });

        socket.on("bttlr-stream-error", (data) => {
          const id = streamingBotMsgIdRef.current;
          if (id) updateMessage(id, `Error: ${data?.error || "Unknown error"}`);
          setIsTyping(false); setStatus(""); setProgress(0);
          streamingBotMsgIdRef.current = null;
        });

        return () => {
          socket.removeAllListeners();
          socket.disconnect();
        };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [addMessage, updateMessage]);

      const sendQuery = useCallback((chatId, userId, userEmail, query) => {
        if (!socketRef.current || !socketState.connected) {
          addMessage("bot", "Not connected to realtime backend.");
          return;
        }
        socketRef.current.emit("bttlr-stream", {
          chat_id: chatId, user_id: userId, user_email: userEmail, query
        });
      }, [socketState.connected, addMessage]);

      // UI handlers
      const handleSendMessage = useCallback((messageContent) => {
        const msg = (messageContent || "").trim();
        if (!msg || isTyping) return;
        addMessage("user", msg);
        setInput("");
        // signal start (server will fire bttlr-stream-start when it begins)
        sendQuery(chatId || "test-chat-123", userId || "user-001", userEmail || "test@example.com", msg);
      }, [isTyping, addMessage, sendQuery, chatId, userId, userEmail]);

      const handleInputKeyDown = useCallback((e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage(input);
        }
      }, [input, handleSendMessage]);

      const handleInputChange = useCallback((e) => {
        const el = e.target;
        setInput(el.value);
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
      }, []);

      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          "div",
          { className: "bottlr-widget-msgs" },
          messages.map((msg) => {
            const responseData = msg.type === "bot" ? parseProductFromResponse(msg.content) : { textContent: msg.content, productInfo: null };
            return React.createElement(
              "div", { key: msg.id, className: `bottlr-msg ${msg.type}` },
              msg.type === "bot" && React.createElement(
                "div", { className: "bottlr-msg-header" },
                React.createElement("div", { className: `bottlr-avatar ${msg.type}` }, "b"),
                React.createElement("span", { style: { fontSize: "14px", fontWeight: 600, color: "#1a1a1a" } }, "Bottlr")
              ),
              msg.type === "bot"
                ? React.createElement("div", {
                    className: "bottlr-msg-content",
                    dangerouslySetInnerHTML: { __html: marked.parse(responseData.textContent || "") },
                  })
                : React.createElement("div", { className: "bottlr-msg-content" }, msg.content),
              responseData.productInfo && React.createElement(ProductCard, {
                category: responseData.productInfo.category,
                imageUrl: responseData.productInfo.imageUrl,
                name: responseData.productInfo.name,
                price: responseData.productInfo.price,
                url: responseData.productInfo.url,
                buttonText: "Add to Cart",
              }),
              msg.options && React.createElement(
                "div", { className: "bottlr-options" },
                msg.options.map((option, idx) =>
                  React.createElement(
                    "button",
                    { key: idx, className: "bottlr-option-btn", onClick: () => handleSendMessage(option) },
                    React.createElement(Wine, { size: 18, color: "#ffffff" }),
                    option
                  )
                )
              )
            );
          }),
          isTyping &&
            React.createElement(
              "div", { className: "bottlr-msg bot" },
              React.createElement("div", { className: "bottlr-msg-header" },
                React.createElement("div", { className: "bottlr-avatar bot" }, "b"),
                React.createElement("span", { style: { fontSize: "14px", fontWeight: 600, color: "#1a1a1a" } }, "Bottlr")
              ),
              React.createElement(TypingIndicator)
            ),
          status && React.createElement("div", { className: "bottlr-status" }, status),
          progress > 0 && React.createElement("div", { className: "bottlr-progress" }, React.createElement("div", { className: "bottlr-progress-bar", style: { width: `${progress}%` } })),
          // Debug (socket)
          debugMode &&
            React.createElement(
              "div",
              { style: { padding:"10px", background:"#f0f0f0", borderRadius:"8px", fontSize:"11px", fontFamily:"monospace", margin:"10px 0" } },
              React.createElement("div", null, `Socket: ${socketState.connected ? "✅ Connected" : "❌ Disconnected"}`),
              React.createElement("div", null, `Socket ID: ${socketState.id || "N/A"}`),
              React.createElement("div", null, `Chat ID: ${chatId || "N/A"}`),
              React.createElement("div", null, `User ID: ${userId || "N/A"}`),
              React.createElement("div", null, `Backend: ${BACKEND_CONFIG.socketUrl}${BACKEND_CONFIG.socketPath}`),
              React.createElement("button", {
                onClick: () => {
                  if (!socketRef.current || !socketState.connected) return console.log("Socket not connected");
                  socketRef.current.emit("bttlr-stream", {
                    chat_id: "test-chat-123",
                    user_id: "user-001",
                    user_email: "test@example.com",
                    query: "What wines pair well with steak?"
                  });
                },
                style: { marginTop:"5px", padding:"5px 10px", background:"#00FF7F", border:"none", borderRadius:"4px", cursor:"pointer", fontSize:"11px" }
              }, "Send Test Query")
            ),
          React.createElement("div", { ref: messagesEndRef })
        ),
        React.createElement(
          "div", { className: "bottlr-input-area" },
          React.createElement("div", { className: "bottlr-input-container" },
            React.createElement("textarea", {
              className: "bottlr-input",
              placeholder: isTyping ? "Bottlr is thinking..." : "Ask me about wine...",
              value: input, onChange: handleInputChange, onKeyDown: handleInputKeyDown, rows: 1, disabled: isTyping
            }),
            isTyping
              ? React.createElement("button", { className: "bottlr-send-btn", onClick: () => {/* optional: no-op; server controls streaming */}, title:"Streaming…", style:{ background:"#ef4444", borderRadius:"16px", opacity:.6, cursor:"not-allowed" } }, React.createElement(X, { size: 18, color: "#fff" }))
              : React.createElement("button", { className: "bottlr-send-btn", onClick: () => handleSendMessage(input), disabled: !input.trim() || isTyping }, React.createElement(Send, { size: 18, color: "#000" }))
          ),
          React.createElement("div", { style: { textAlign:"center", marginTop:"5px" } },
            React.createElement("button", {
              onClick: () => setDebugMode((v) => !v),
              style: { fontSize:"10px", padding:"2px 8px", background:"transparent", border:"1px solid #ccc", borderRadius:"3px", cursor:"pointer", color:"#666" }
            }, debugMode ? "Hide Debug" : "Show Debug")
          )
        )
      );
    }

    function ChatWidget() {
      const [isOpen, setIsOpen] = useState(false);
      const toggleOpen = useCallback(() => {
        if (!isOpen) { openWidget(); setIsOpen(true); } else { closeWidget(); setIsOpen(false); }
      }, [isOpen]);
      return React.createElement(
        React.Fragment,
        null,
        !isOpen &&
          React.createElement("button", { className: "bottlr-widget-button", onClick: toggleOpen, "aria-label": "Open Bottlr wine assistant" },
            React.createElement(MessageCircle, { size: 28, color: "#fff" })
          ),
        isOpen &&
          React.createElement("div", { className: "bottlr-widget-card" },
            React.createElement("div", { className: "bottlr-widget-header" },
              React.createElement("h3", null, React.createElement(Wine, { size: 20 }), "Bottlr"),
              React.createElement("button", { className: "bottlr-close-btn", onClick: toggleOpen, "aria-label":"Close chat" }, React.createElement(X, { size: 20 }))
            ),
            React.createElement(ChatInterface, null),
            React.createElement("div", { style: { padding:"0 0 12px 0", textAlign:"center", fontSize:"14px", color:"#000", background:"rgba(187,237,200,.40)" } }, "Powered by Bottlr")
          )
      );
    }

    ReactDOM.createRoot(root).render(React.createElement(ChatWidget));

    // Client-side routing for same-domain links inside the widget
    document.getElementById("bottlr-chat-root").addEventListener("click", (e) => {
      const anchor = e.target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("mailto:")) return;

      const currentDomain = window.location.hostname;
      let isSameDomain = false;
      try {
        if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../")) isSameDomain = true;
        else if (href.startsWith("http")) {
          const url = new URL(href);
          isSameDomain = url.hostname === currentDomain;
        }
      } catch (_) { isSameDomain = true; }

      if (isSameDomain) {
        e.preventDefault();
        let targetPath = href;
        if (href.startsWith("http")) {
          try { const url = new URL(href); targetPath = url.pathname + url.search + url.hash; } catch (_) {}
        }
        history.pushState({}, "", targetPath);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
      }
    });

    window.BottlrWidget = {
      open: () => { openWidget(); window.dispatchEvent(new CustomEvent("bottlr:open")); },
      close: () => { closeWidget(); window.dispatchEvent(new CustomEvent("bottlr:close")); },
      version: "2.1.0-socket",
    };

    console.log("🍷 Bottlr Widget v2.1 (Socket.IO) loaded");
  })();
