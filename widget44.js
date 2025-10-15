import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "https://esm.sh/react@18";
import ReactDOM from "https://esm.sh/react-dom@18/client";
import {
  MessageCircle,
  Send,
  X,
  Wine,
  Sparkles,
  User as UserIcon,
  ChevronRight,
} from "https://esm.sh/lucide-react@0.263.0?bundle";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js";
import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.7.2/dist/socket.io.esm.min.js";
// replace this:
// import axios from "https://cdn.jsdelivr.net/npm/axios@1.7.7/dist/axios.esm.min.js";
// with this (ESM bundle):
import axios from "https://cdn.jsdelivr.net/npm/axios@1.7.7/dist/esm/axios.min.js";

// ======== Pinned server URLs ========
const SOCKET_URL = "https://nishantbundela.com";
const SOCKET_PATH = "/socket.io";
// Use the same host for REST. If your API is on a subpath, set it here.
const API_BASE = "https://nishantbundela.com";

// ======== Markdown link sanitizer (unchanged) ========
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
      } catch (e) {
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

export function run() {
  // ===== Mobile detection (unchanged) =====
  function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileUA = mobileRegex.test(userAgent);
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const isMobileScreen = window.screen.width <= 768;
    return isMobileUA || (hasTouch && isSmallScreen) || isMobileScreen;
  }
  if (isMobile()) {
    console.log("📱 Mobile device detected - Bottlr widget disabled");
    return;
  }
  console.log("💻 Desktop device detected - Loading Bottlr widget");

  // ===== 1) Build wrapper =====
  const bodyChildren = Array.from(document.body.childNodes);
  const wrapper = document.createElement("div");
  wrapper.id = "bottlr-wrapper";
  wrapper.style.display = "flex";
  wrapper.style.width = "100vw";
  wrapper.style.height = "100vh";
  wrapper.style.margin = "0";
  wrapper.style.padding = "0";

  const siteContainer = document.createElement("div");
  siteContainer.id = "bottlr-site-container";
  siteContainer.style.flex = "1 1 100%";
  siteContainer.style.height = "100vh";
  siteContainer.style.overflow = "auto";
  siteContainer.style.boxSizing = "border-box";

  const widgetContainer = document.createElement("div");
  widgetContainer.id = "bottlr-widget-container";
  widgetContainer.style.flex = "0 0 0";
  widgetContainer.style.height = "100vh";
  widgetContainer.style.boxSizing = "border-box";
  widgetContainer.style.overflow = "hidden";

  bodyChildren.forEach((node) => siteContainer.appendChild(node));
  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.appendChild(wrapper);
  wrapper.appendChild(siteContainer);
  wrapper.appendChild(widgetContainer);

  // ===== 2) CSS (plus a tiny bit for auth UI) =====
  const style = document.createElement("style");
  style.textContent = `
          html, body { margin: 0; padding: 0; overflow: hidden; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    
          .bottlr-widget-button {
            position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%;
            background: linear-gradient(135deg, #00FF7F 0%, #00E066 100%);
            display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; transition: all 0.3s ease; z-index: 9999;
          }
          .bottlr-widget-button:hover { transform: scale(1.1); }
    
          .bottlr-widget-card { width: 100%; height: 100%; display: flex; flex-direction: column; background: radial-gradient(50% 50% at 50% 50%, #99F3B4 0%, #ffffff 80%); border-radius: 0; overflow: hidden; position: relative; }
    
          .bottlr-widget-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; background: transparent; color:#1a1a1a; z-index:10; gap: 12px; }
          .bottlr-widget-header h3 { margin:0; font-size:18px; font-weight:700; display:flex; align-items:center; gap:8px; color:#1a1a1a; }
          .bottlr-close-btn { background: transparent; border: none; color: #1a1a1a; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; display:flex; align-items:center; justify-content:center; }
          .bottlr-close-btn:hover { background: rgba(0,0,0,0.1); }
    
          .bottlr-current-url { padding:12px 20px; background: transparent; font-size:12px; color:#666; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-family: 'SF Mono','Monaco','Consolas',monospace; z-index:10; }
    
          .bottlr-widget-msgs { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; scroll-behavior:smooth; z-index:5; }
          .bottlr-msg { max-width:85%; position:relative; animation: slideIn 0.3s ease-out; }
          @keyframes slideIn { from{opacity:0; transform: translateY(10px);} to{opacity:1; transform: translateY(0);} }
          .bottlr-msg.user { align-self:flex-end; margin-left:auto; }
          .bottlr-msg.bot { align-self:flex-start; }
          .bottlr-msg-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
          .bottlr-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; flex-shrink:0; }
          .bottlr-avatar.bot { background:#000; color:#00FF7F; }
          .bottlr-avatar.user { background:#e5e7eb; color:#374151; }
          .bottlr-msg-content { padding:16px 20px; border-radius:16px; margin:0; line-height:1.5; font-weight:400; font-size:15px;
            background: rgba(211,211,211,0.30); backdrop-filter: blur(12px); color:#000; }
          .bottlr-msg-content img { max-width:100%; height:auto; display:block; margin:12px auto; border-radius:8px; }
          .bottlr-sizer {height:100%; width:30px; cursor:pointer; background-color:black; position:absolute; z-index:100;}
          .bottlr-product-card { background: rgba(211,211,211,0.30); backdrop-filter: blur(12px); border-radius:16px; padding:20px; margin:16px 0; text-align:center; width:300px;}
          .bottlr-product-category { font-size:18px; font-weight:700; color:#1a1a1a; margin-bottom:16px; }
          .bottlr-product-image { width:90%; height:auto; margin:0 auto 16px auto; display:block; border-radius:8px; }
          .bottlr-product-name { font-size:16px; font-weight:600; color:#1a1a1a; margin:12px 0; line-height:1.3; }
          .bottlr-product-button { width:100%; background:#00FF7F; color:#000; border:none; border-radius:25px; padding:16px 20px; font-size:16px; font-weight:700; cursor:pointer; transition:all .2s; margin-top:12px; box-shadow:0 2px 8px rgba(0,255,127,0.2); }
          .bottlr-product-button:hover { background:#00E066; transform: translateY(-2px); box-shadow:0 6px 16px rgba(0,255,127,0.4); }
    
          .bottlr-options { margin-top:16px; display:flex; flex-direction:column; gap:12px; }
          .bottlr-option-btn { width:100%; background:rgba(0,0,0,0.80); color:#fff; border:none; border-radius:16px; padding:16px 20px; cursor:pointer; transition:all .2s; text-align:left; font-size:15px; font-weight:600; display:flex; align-items:center; gap:12px; }
          .bottlr-option-btn:hover { background:#333; transform: translateY(-2px); }
    
          .bottlr-input-area { padding:16px; background: rgba(187, 237, 200, 0.40); backdrop-filter: blur(12px); z-index: 10; }
          .bottlr-input-container { display:flex; gap:12px; align-items:center; }
          .bottlr-input { flex:1; border:2px solid #5E5E5E; border-radius:18px; padding:12px 16px; resize:none; outline:none; font-family:inherit; font-size:15px; max-height:120px; min-height:10px; transition:border-color 0.2s; background: transparent; }
          .bottlr-send-btn { width:50px; height:50px; border-radius:16px; background:transparent; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: all 0.2s; }
          .bottlr-send-btn:hover { transform: scale(1.05); background: #00000010; }
          .bottlr-send-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    
          .bottlr-typing { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#E3E6E2; border-radius:16px; width:fit-content; }
          .bottlr-typing-dot { width:8px; height:8px; background:#00FF7F; border-radius:50%; animation:bounce 1.4s infinite ease-in-out both; }
          .bottlr-typing-dot:nth-child(1){ animation-delay:-0.32s; } .bottlr-typing-dot:nth-child(2){ animation-delay:-0.16s; }
          @keyframes bounce { 0%,80%,100%{ transform: scale(0);} 40%{ transform: scale(1);} }
    
          /* Auth Panel */
          .bottlr-auth-container {
    margin-top: 16px; min-width:340px;}
          .bottlr-auth { display:flex; gap:8px; align-items:center; position:fixed; justify-content:space-between;background-color:white; width:100%;}
          .bottlr-auth input {
            height: 34px; border:1px solid #c9c9c9; border-radius:10px; padding:0 10px; font-size:13px; outline:none; background:white; color:#111; margin-right:8px;
          }
          .bottlr-auth button {
            height: 34px; padding: 0 12px; border-radius:10px; border:none; cursor:pointer; font-weight:700; margin-top:8px; margin-right: 16px;
          }
           .bottlr-auth-btn {
            height: 34px; padding: 0 12px; border-radius:10px; border:none; cursor:pointer; font-weight:700;
          }
      .bottlr-auth-login-group {
        display:flex;
        justify-content:space-between;
      }
          .btn-primary { background:#00FF7F; color:#000; }
          .btn-ghost { background: transparent; border:1px solid #c9c9c9; color:#111; }
    
          .bottlr-userchip { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:rgba(0,0,0,0.06); font-size:12px;}
          .bottlr-userchip span { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    
          @media (max-width:768px){
            #bottlr-site-container{ flex:0 0 0 !important; }
            #bottlr-widget-container{ flex:1 1 100% !important; }
            .bottlr-widget-button{ bottom:16px; right:16px; width:56px; height:56px; }
          }
        `;
  document.head.appendChild(style);

  // ===== 3) Open/Close helpers =====
  function openWidget() {
    if (window.innerWidth <= 768) {
      siteContainer.style.flex = "0 0 0";
      widgetContainer.style.flex = "1 1 100%";
    } else {
      siteContainer.style.flex = "0 0 70vw";
      widgetContainer.style.flex = "0 0 30vw";
    }
  }

  function closeWidget() {
    siteContainer.style.flex = "1 1 100%";
    widgetContainer.style.flex = "0 0 0";
  }

  // ===== 4) React mount root =====
  const root = document.createElement("div");
  root.id = "bottlr-chat-root";
  root.style.height = "100%";
  root.style.width = "100%";
  widgetContainer.appendChild(root);

  // ===== 5) REST helpers (your backend contract) =====
  async function registerUser(email, password) {
    const res = await axios.post(
      `${API_BASE}/users`,
      {
        email,
        password,
      },
      {
        withCredentials: true,
      }
    );
    return res.data; // { id, email }
  }
  async function loginUser(email, password) {
    const res = await axios.post(
      `${API_BASE}/users/login`,
      {
        email,
        password,
      },
      {
        withCredentials: true,
      }
    );
    return res.data; // { id, email }
  }
  async function createChat(userId, title) {
    const res = await axios.post(
      `${API_BASE}/chats`,
      {
        userId,
        title,
      },
      {
        withCredentials: true,
      }
    );
    return res.data; // { id, title, userId }
  }
  async function getUserChats(userId) {
    const res = await axios.get(`${API_BASE}/users/${userId}/chats`, {
      withCredentials: true,
    });
    return res.data; // Array
  }

  // ===== 5b) Square/Weebly Commerce helpers (ADDED) =====
  function getCookie(name) {
    const str = document.cookie || "";
    if (!str) return null;
    const parts = str.split("; ");
    const prefix = name + "=";
    for (const part of parts) {
      if (part.startsWith(prefix)) {
        return decodeURIComponent(part.slice(prefix.length));
      }
    }
    return null;
  }

  function getXsrfToken() {
    return getCookie("XSRF-TOKEN");
  }
  function getCartToken() {
    return getCookie("com_cart_token") || getCookie("sq_cart_v1") || null;
  }
  async function commerceV2(method, params, id = 0) {
    const xsrf = getXsrfToken();
    if (!xsrf) {
      console.error("[Bottlr][RPC] Missing XSRF-TOKEN cookie.");
      throw new Error("Missing XSRF-TOKEN cookie.");
    }
    const cart = getCartToken();
    const url = `/ajax/api/JsonRPC/CommerceV2/?CommerceV2/[${encodeURIComponent(
      method
    )}]${cart ? `&cart=${encodeURIComponent(cart)}` : ""}`;
    const body = { id, jsonrpc: "2.0", method, params };

    // DEBUG: log request (mask tokens a bit)
    const maskedCart = cart ? cart.slice(0, 4) + "…:v2" : "(none)";
    console.log("[Bottlr][RPC] →", method, {
      url,
      cart: maskedCart,
      xsrf_start: xsrf.slice(0, 6) + "…",
      body,
    });

    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-xsrf-token": xsrf,
      },
      body: JSON.stringify(body),
    });

    console.log("[Bottlr][RPC] ← status", res.status, res.statusText);

    let json;
    try {
      json = await res.json();
    } catch (e) {
      const txt = await res.text().catch(() => "");
      console.warn("[Bottlr][RPC] Non-JSON response body:", txt);
      throw new Error(`RPC ${method} non-JSON response`);
    }

    if (!res.ok) {
      console.error("[Bottlr][RPC] Error payload:", json);
      throw new Error(`RPC ${method} failed: ${res.status}`);
    }

    console.log("[Bottlr][RPC] ✓ result", json);
    return json;
  }

  async function addToCartV2(productId, quantity = 1, extraParams = null) {
    const params = Array.isArray(extraParams)
      ? extraParams
      : [productId, quantity];
    console.log("[Bottlr][Cart] addToCartV2", { productId, quantity, params });
    const resp = await commerceV2("Cart::addItem", params);
    console.log("[Bottlr][Cart] addToCartV2 result", resp);
    return resp;
  }

  async function readCartV2() {
    return commerceV2("Cart::read", [false]);
  }

  // ===== 6) UI bits: Products, Typing, Parser (unchanged except ADDITIONS) =====
  function ProductCard({
    category,
    imageUrl,
    name,
    price,
    url,
    buttonText = "Add to Cart",
    productId, // ADDED: site product/variation id
    quantity = 1, // ADDED: default 1
    paramsOverride = null, // ADDED: if you already know the exact params array for Cart::addItem
  }) {
    const [busy, setBusy] = useState(false);
    const [label, setLabel] = useState(buttonText);

    const handleAddToCart = useCallback(async () => {
      console.log("[Bottlr][UI] Add to Cart clicked", {
        name,
        productId,
        quantity,
        url,
        paramsOverride,
      });

      // No productId? fall back to navigation
      if (!productId && url) {
        console.log("[Bottlr][UI] No productId, navigating:", url);
        let targetPath = url;
        try {
          const currentDomain = window.location.hostname;
          if (url.startsWith("http")) {
            const linkUrl = new URL(url);
            if (linkUrl.hostname === currentDomain) {
              targetPath = linkUrl.pathname + linkUrl.search + linkUrl.hash;
            }
          }
        } catch (_) {
          targetPath = url;
        }
        history.pushState({}, "", targetPath);
        window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
        return;
      }

      if (!productId) {
        console.warn("[Bottlr][UI] Missing productId and no URL");
        setLabel("Missing ID");
        setTimeout(function () {
          setLabel(buttonText);
        }, 1600);
        return;
      }

      try {
        setBusy(true);
        setLabel("Adding…");
        const result = await addToCartV2(productId, quantity, paramsOverride);
        document.dispatchEvent(
          new CustomEvent("cart:updated", { detail: result })
        );
        setLabel("Added ✓");
      } catch (e) {
        console.error("[Bottlr][UI] addToCart error", e);
        setLabel("Error");
      } finally {
        setBusy(false);
        setTimeout(function () {
          setLabel(buttonText);
        }, 1200);
      }
    }, [productId, quantity, paramsOverride, url, buttonText, name]);

    const handleProductClick = useCallback(() => {
      // Prefer add-to-cart behavior; if no productId, we navigate (handled above).
      handleAddToCart();
    }, [handleAddToCart]);

    return React.createElement(
      "div",
      { className: "bottlr-product-card" },
      category &&
        React.createElement(
          "div",
          { className: "bottlr-product-category" },
          category
        ),
      imageUrl &&
        React.createElement("img", {
          src: imageUrl,
          alt: name || "Product",
          className: "bottlr-product-image",
        }),
      name &&
        React.createElement("div", { className: "bottlr-product-name" }, name),
      React.createElement(
        "button",
        {
          className: "bottlr-product-button",
          onClick: handleProductClick,
          disabled: busy,
        },
        `${label}${price ? ` ${price}` : ""}`
      )
    );
  }

  function TypingIndicator() {
    return React.createElement(
      "div",
      { className: "bottlr-typing" },
      React.createElement("div", { className: "bottlr-typing-dot" }),
      React.createElement("div", { className: "bottlr-typing-dot" }),
      React.createElement("div", { className: "bottlr-typing-dot" })
    );
  }

  function parseProductFromResponse(text) {
    const productSeparator = "---PRODUCT---";
    const parts = String(text || "").split(productSeparator);
    if (parts.length < 2) {
      return { textContent: text, productInfo: null };
    }
    const textContent = parts[0].trim();
    const productData = parts[1].trim();
    const lines = productData.split("\n");
    const productInfo = {};
    lines.forEach((line) => {
      const [key, ...valueParts] = line.split(":");
      if (key && valueParts.length > 0) {
        let value = valueParts.join(":").trim();
        switch (key.trim().toUpperCase()) {
          case "CATEGORY":
            productInfo.category = value;
            break;
          case "NAME":
            productInfo.name = value;
            break;
          case "PRICE":
            productInfo.price = value;
            break;
          case "IMAGE": {
            const markdownMatch = value.match(/\[([^\]]+)\]\(([^)]+)\)/);
            productInfo.imageUrl = markdownMatch ? markdownMatch[2] : value;
            break;
          }
          case "URL":
            productInfo.url = value;
            break;
          // ===== ADDED: allow LLM/content to pass the product/variation id directly =====
          case "PRODUCT_ID":
          case "SITE_PRODUCT_ID":
            productInfo.productId = value;
            break;
          // ===== ADDED: optional JSON array to override params sent to Cart::addItem =====
          case "PARAMS": // expects raw JSON array, e.g. [ "ID", 1, null, null, [] ]
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) productInfo.paramsOverride = parsed;
            } catch (err) {
              // ignore bad JSON
            }
            break;

          case "QTY":
          case "QUANTITY":
            productInfo.quantity = Number(value) || 1;
            break;
        }
      }
    });
    return {
      textContent,
      productInfo: Object.keys(productInfo).length ? productInfo : null,
    };
  }

  // ===== 7) Auth Panel =====
  function AuthPanel({ userId, userEmail, onAuthed, onLogout, busy }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const handleRegister = async () => {
      setErr("");
      try {
        const u = await registerUser(email.trim(), password);
        onAuthed(u);
      } catch (e) {
        setErr(
          (e && e.response && e.response.data && e.response.data.error) ||
            "Registration failed"
        );
      }
    };
    const handleLogin = async () => {
      setErr("");
      try {
        const u = await loginUser(email.trim(), password);
        onAuthed(u);
      } catch (e) {
        setErr(
          (e && e.response && e.response.data && e.response.data.error) ||
            "Login failed"
        );
      }
    };
    if (userId && userEmail) {
      return React.createElement(
        "div",
        { className: "bottlr-auth" },
        React.createElement(
          "div",
          { className: "bottlr-userchip", title: userEmail },
          React.createElement(UserIcon, { size: 16 }),
          React.createElement("span", null, userEmail)
        ),
        React.createElement(
          "button",
          { className: "btn-ghost", onClick: onLogout, disabled: busy },
          "Logout"
        )
      );
    }
    if (!isOpen) {
      return React.createElement(
        "button",
        {
          className: "btn-primary bottlr-auth-btn",
          onClick: () => {
            setIsOpen(!isOpen);
          },
        },
        null,
        "Login or Register"
      );
    }
    return React.createElement(
      "div",
      { className: "bottlr-auth" },
      React.createElement(
        "div",
        { className: "bottlr-auth-container" },
        React.createElement("input", {
          type: "email",
          placeholder: "email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          disabled: busy,
        }),
        React.createElement("input", {
          type: "password",
          placeholder: "password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          disabled: busy,
        }),
        React.createElement(
          "div",
          { className: "bottlr-auth-login-group" },
          React.createElement(
            "div",
            {},
            React.createElement(
              "button",
              {
                className: "btn-ghost",
                onClick: handleLogin,
                disabled: busy || !email || !password,
              },
              "Login"
            ),
            React.createElement(
              "button",
              {
                className: "btn-primary",
                onClick: handleRegister,
                disabled: busy || !email || !password,
              },
              "Register"
            )
          ),
          React.createElement(
            "button",
            {
              className: "btn-ghost",
              onClick: () => {
                setIsOpen(false);
              },
            },
            "Back"
          )
        )
      )
    );
  }

  // ===== 8) Chat Interface (socket streaming kept; now uses real auth + chat) =====
  function ChatInterface({ chatId, userId, userEmail }) {
    const [messages, setMessages] = useState([
      {
        id: "welcome",
        type: "bot",
        content: "Hey! Let's find your perfect wine. How do you want to start?",
        options: [
          "Use my purchase history",
          "Ask the AI-Sommelier",
          "Find wines for dinner pairing",
          "Get recommendations by style",
        ],
      },
      {
        id: "disclaimer",
        type: "bot",
        content:
          "**We're actively developing this tool.** Interested in joining our beta testing round? Reach out to us at [bottlr@parlourwines.com](mailto:bottlr@parlourwines.com). v42",
      },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [status, setStatus] = useState("");
    const [progress, setProgress] = useState(0);
    const messagesEndRef = useRef(null);
    const socketRef = useRef(null);
    const [socketState, setSocketState] = useState({
      connected: false,
      id: null,
    });
    const streamingBotMsgIdRef = useRef(null);

    // Auto-scroll
    const scrollToBottom = useCallback(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    // Add/update message
    const addMessage = useCallback((type, content, options = null) => {
      const newMessage = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
        type,
        content,
        options,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage.id;
    }, []);
    const updateMessage = useCallback((id, updater) => {
      setMessages(function (prev) {
        return prev.map(function (m) {
          if (m.id === id) {
            var newContent =
              typeof updater === "function"
                ? updater(m.content || "")
                : updater;
            return Object.assign({}, m, { content: newContent });
          }
          return m;
        });
      });
    }, []);

    // Connect socket once
    useEffect(() => {
      const socket = io(SOCKET_URL, {
        path: SOCKET_PATH,
        transports: ["websocket"],
        withCredentials: true,
      });
      socketRef.current = socket;
      socket.on("connect", () =>
        setSocketState({ connected: true, id: socket.id })
      );
      socket.on("disconnect", () =>
        setSocketState({ connected: false, id: null })
      );
      socket.on("bttlr-stream-start", () => {
        if (!streamingBotMsgIdRef.current) {
          const botId = addMessage("bot", "");
          streamingBotMsgIdRef.current = botId;
        }
        setIsTyping(true);
        setStatus("Streaming…");
      });
      socket.on("bttlr-status-update", (data) => setStatus(data?.status || ""));
      socket.on("bttlr-progress", (data) =>
        setProgress(Number(data?.progress) || 0)
      );
      socket.on("bttlr-stream-chunk", (data) => {
        const id = streamingBotMsgIdRef.current;
        if (!id) return;
        updateMessage(id, (prev) => (prev || "") + (data?.chunk ?? ""));
      });
      socket.on("bttlr-stream-end", (data) => {
        const id = streamingBotMsgIdRef.current;
        if (id && data?.final_response) {
          updateMessage(id, (prev) => prev || data.final_response);
        }
        setIsTyping(false);
        setStatus("");
        setProgress(0);
        streamingBotMsgIdRef.current = null;
      });
      socket.on("bttlr-stream-error", (data) => {
        const id = streamingBotMsgIdRef.current;
        if (id)
          updateMessage(
            id,
            (prev) =>
              (prev || "") + `\n\nError: ${data?.error || "Unknown error"}`
          );
        setIsTyping(false);
        setStatus("");
        setProgress(0);
        streamingBotMsgIdRef.current = null;
      });
      return () => {
        socket.removeAllListeners();
        socket.disconnect();
      };
    }, [addMessage, updateMessage]);

    const sendQuery = useCallback(
      (chatIdArg, userIdArg, userEmailArg, query) => {
        if (!socketRef.current || !socketState.connected) {
          addMessage("bot", "Not connected to realtime backend.");
          return;
        }
        socketRef.current.emit("bttlr-stream", {
          chat_id: chatIdArg,
          user_id: userIdArg,
          user_email: userEmailArg,
          query,
        });
      },
      [socketState.connected, addMessage]
    );

    const handleSendMessage = useCallback(
      (msg) => {
        const trimmed = (msg || "").trim();
        if (!trimmed || isTyping) return;
        addMessage("user", trimmed);
        setInput("");
        // Prefer authenticated IDs; fall back to anonymous only if needed
        const cid =
          chatId ||
          localStorage.getItem("bottlr_chat_id") ||
          `chat_${userId || "anon"}_${Date.now()}`;
        const uid =
          userId ||
          localStorage.getItem("bottlr_user_id") ||
          `anonymous_${Date.now()}`;
        const uemail =
          userEmail ||
          localStorage.getItem("bottlr_email") ||
          "anonymous@bottlr.local";
        sendQuery(cid, uid, uemail, trimmed);
      },
      [isTyping, addMessage, sendQuery, chatId, userId, userEmail]
    );

    const handleOptionClick = useCallback(
      (option) => handleSendMessage(option),
      [handleSendMessage]
    );

    const handleInputKeyDown = useCallback(
      (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage(input);
        }
      },
      [input, handleSendMessage]
    );

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
          const responseData =
            msg.type === "bot"
              ? parseProductFromResponse(msg.content)
              : { textContent: msg.content, productInfo: null };
          const isCurrentStreamingBot =
            msg.type === "bot" && msg.id === streamingBotMsgIdRef.current;
          const hasText = Boolean((responseData.textContent || "").trim());
          const contentEl =
            isCurrentStreamingBot && !hasText && isTyping
              ? React.createElement(TypingIndicator)
              : React.createElement("div", {
                  className: "bottlr-msg-content",
                  dangerouslySetInnerHTML: {
                    __html: marked.parse(responseData.textContent || ""),
                  },
                });

          return React.createElement(
            "div",
            { key: msg.id, className: `bottlr-msg ${msg.type}` },
            msg.type === "bot" &&
              React.createElement(
                "div",
                { className: "bottlr-msg-header" },
                React.createElement(
                  "div",
                  { className: `bottlr-avatar ${msg.type}` },
                  "b"
                ),
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1a1a1a",
                    },
                  },
                  "Bottlr"
                )
              ),
            contentEl,
            responseData.productInfo &&
              React.createElement(ProductCard, {
                category: responseData.productInfo.category,
                imageUrl: responseData.productInfo.imageUrl,
                name: responseData.productInfo.name,
                price: responseData.productInfo.price,
                url: responseData.productInfo.url,
                buttonText: "Add to Cart",
                productId: responseData.productInfo.productId, // ADDED
                quantity: responseData.productInfo.quantity || 1, // ADDED
                paramsOverride: responseData.productInfo.paramsOverride || null, // ADDED
              }),
            msg.options &&
              React.createElement(
                "div",
                { className: "bottlr-options" },
                msg.options.map((option, idx) =>
                  React.createElement(
                    "button",
                    {
                      key: idx,
                      className: "bottlr-option-btn",
                      onClick: () => handleOptionClick(option),
                    },
                    React.createElement(Wine, { size: 18, color: "#ffffff" }),
                    option
                  )
                )
              )
          );
        }),
        React.createElement("div", { ref: messagesEndRef })
      ),
      React.createElement(
        "div",
        { className: "bottlr-input-area" },
        React.createElement(
          "div",
          { className: "bottlr-input-container" },
          React.createElement("textarea", {
            className: "bottlr-input",
            placeholder: isTyping
              ? "Bottlr is thinking..."
              : "Ask me about wine...",
            value: input,
            onChange: handleInputChange,
            onKeyDown: handleInputKeyDown,
            rows: 1,
            disabled: isTyping,
          }),
          isTyping
            ? React.createElement(
                "button",
                {
                  className: "bottlr-send-btn",
                  title: "Streaming…",
                  style: {
                    background: "#ef4444",
                    borderRadius: "16px",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  },
                  disabled: true,
                },
                React.createElement(X, { size: 18, color: "#fff" })
              )
            : React.createElement(
                "button",
                {
                  className: "bottlr-send-btn",
                  onClick: () => handleSendMessage(input),
                  disabled: !input.trim() || isTyping,
                  title: "Send",
                },
                React.createElement(Send, { size: 18, color: "#000" })
              )
        )
      )
    );
  }

  // ===== 9) Chat Widget Shell (adds auth + chat bootstrap) =====
  function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentURL, setCurrentURL] = useState(window.location.href);
    // session state
    const [userId, setUserId] = useState(
      localStorage.getItem("bottlr_user_id") || null
    );
    const [userEmail, setUserEmail] = useState(
      localStorage.getItem("bottlr_email") || null
    );
    const [chatId, setChatId] = useState(
      localStorage.getItem("bottlr_chat_id") || null
    );
    const [authBusy, setAuthBusy] = useState(false);

    // Track URL changes
    useEffect(() => {
      const logAndUpdate = () => setCurrentURL(window.location.href);
      logAndUpdate();
      window.addEventListener("popstate", logAndUpdate);
      window.addEventListener("hashchange", logAndUpdate);
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        origPush.apply(this, args);
        logAndUpdate();
      };
      history.replaceState = function (...args) {
        origReplace.apply(this, args);
        logAndUpdate();
      };
      return () => {
        window.removeEventListener("popstate", logAndUpdate);
        window.removeEventListener("hashchange", logAndUpdate);
        history.pushState = origPush;
        history.replaceState = origReplace;
      };
    }, []);

    // If already authenticated, try to reuse last chat or create one
    useEffect(() => {
      (async () => {
        if (!userId || chatId) return;
        try {
          const chats = await getUserChats(userId);
          if (Array.isArray(chats) && chats.length > 0) {
            const cid = chats[0].id;
            setChatId(cid);
            localStorage.setItem("bottlr_chat_id", cid);
          } else {
            const title = `Chat ${new Date().toLocaleString()}`;
            const c = await createChat(userId, title);
            setChatId(c.id);
            localStorage.setItem("bottlr_chat_id", c.id);
          }
        } catch (e) {
          console.warn("Chat bootstrap failed", e);
        }
      })();
    }, [userId, chatId]);

    const handleAuthed = async (u) => {
      setAuthBusy(true);
      try {
        // Save user
        localStorage.setItem("bottlr_user_id", u.id);
        localStorage.setItem("bottlr_email", u.email);
        setUserId(u.id);
        setUserEmail(u.email);
        // Reuse or create a chat
        const chats = await getUserChats(u.id).catch(() => []);
        if (Array.isArray(chats) && chats.length > 0) {
          const cid = chats[0].id;
          setChatId(cid);
          localStorage.setItem("bottlr_chat_id", cid);
        } else {
          const title = `Chat ${new Date().toLocaleString()}`;
          const c = await createChat(u.id, title);
          setChatId(c.id);
          localStorage.setItem("bottlr_chat_id", c.id);
        }
      } finally {
        setAuthBusy(false);
      }
    };

    const handleLogout = () => {
      localStorage.removeItem("bottlr_user_id");
      localStorage.removeItem("bottlr_email");
      localStorage.removeItem("bottlr_chat_id");
      setUserId(null);
      setUserEmail(null);
      setChatId(null);
    };

    const toggleOpen = useCallback(() => {
      if (!isOpen) {
        openWidget();
        setIsOpen(true);
      } else {
        closeWidget();
        setIsOpen(false);
      }
    }, [isOpen]);
    const sizerRef = useRef(null);
    return React.createElement(
      React.Fragment,
      null,
      !isOpen &&
        React.createElement(
          "button",
          {
            className: "bottlr-widget-button",
            onClick: toggleOpen,
            "aria-label": "Open Bottlr wine assistant",
          },
          React.createElement(MessageCircle, { size: 28, color: "#fff" })
        ),
      isOpen &&
        React.createElement(
          "div",
          { className: "bottlr-widget-card", ref: sizerRef },
          React.createElement(
            "div",
            { className: "bottlr-widget-header" },
            React.createElement(
              "h3",
              null,
              React.createElement(Wine, { size: 20 }),
              "Bottlr"
            ),
            // Auth panel lives in the header (compact)
            React.createElement(AuthPanel, {
              userId,
              userEmail,
              onAuthed: handleAuthed,
              onLogout: handleLogout,
              busy: authBusy,
            }),
            React.createElement(
              "button",
              {
                className: "bottlr-close-btn",
                onClick: toggleOpen,
                "aria-label": "Close chat",
              },
              React.createElement(X, { size: 20 })
            )
          ),
          React.createElement(
            "div",
            { className: "bottlr-current-url", title: currentURL },
            currentURL
          ),
          React.createElement(
            "div",
            {
              style: {
                padding: "0 20px 8px",
                fontSize: "12px",
                color: "#333",
                display: "flex",
                alignItems: "center",
                gap: 6,
              },
            },
            React.createElement(Sparkles, { size: 14 }),
            userId
              ? `Signed in as ${userEmail} • Chat: ${chatId || "initializing…"}`
              : "You can chat now as guest, or sign in to save your chats."
          ),
          React.createElement(ChatInterface, { chatId, userId, userEmail }),
          React.createElement(
            "div",
            {
              style: {
                padding: "0 0 12px 0",
                textAlign: "center",
                fontSize: "14px",
                color: "#000",
                background: "rgba(187, 237, 200, 0.40)",
                zIndex: 10,
              },
            },
            "Powered by Bottlr"
          )
        )
    );
  }

  // ===== 10) Mount React =====
  ReactDOM.createRoot(root).render(React.createElement(ChatWidget));
  // ===== 11) Link handling (same-domain => SPA routing) =====
  document.getElementById("bottlr-chat-root").addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    if (href.startsWith("mailto:")) return;
    const currentDomain = window.location.hostname;
    let isSameDomain = false;
    try {
      if (
        href.startsWith("/") ||
        href.startsWith("./") ||
        href.startsWith("../")
      ) {
        isSameDomain = true;
      } else if (href.startsWith("http")) {
        const linkUrl = new URL(href);
        isSameDomain = linkUrl.hostname === currentDomain;
      }
    } catch (_) {
      isSameDomain = true;
    }
    if (isSameDomain) {
      e.preventDefault();
      let targetPath = href;
      if (href.startsWith("http")) {
        try {
          const url = new URL(href);
          targetPath = url.pathname + url.search + url.hash;
        } catch {
          targetPath = href;
        }
      }
      history.pushState({}, "", targetPath);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    }
  });

  // ===== 12) Public API =====
  window.BottlrWidget = {
    open: () => {
      openWidget();
      window.dispatchEvent(new CustomEvent("bottlr:open"));
    },
    close: () => {
      closeWidget();
      window.dispatchEvent(new CustomEvent("bottlr:close"));
    },
    version: "2.4.0-socket-auth",
    // ADDED: expose cart helpers if you want to call from outside
    readCart: readCartV2,
    addToCart: addToCartV2,
  };
  console.log("🍷 Bottlr Widget loaded with auth & chat bootstrap.");
}
