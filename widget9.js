import React, { useState, useEffect } from "https://esm.sh/react@18";
import ReactDOM from "https://esm.sh/react-dom@18/client";
import {
  Camera,
  Send,
  X,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from "https://esm.sh/lucide-react@0.263.0?bundle";

(function () {
  //
  // 1) Build a wrapper with two flex‐columns: siteContainer + widgetContainer
  //
  const bodyChildren = Array.from(document.body.childNodes);
  const wrapper = document.createElement("div");
  wrapper.id = "bottlr-wrapper";
  wrapper.style.display = "flex";
  wrapper.style.width = "100vw";
  wrapper.style.height = "100vh";
  wrapper.style.margin = "0";
  wrapper.style.padding = "0";

  // Left side: the site‐content
  const siteContainer = document.createElement("div");
  siteContainer.id = "bottlr-site-container";
  siteContainer.style.flex = "1 1 100%"; // start full‐width
  siteContainer.style.height = "100vh";
  siteContainer.style.overflow = "auto";
  siteContainer.style.boxSizing = "border-box";

  // Right side: the widget will expand into this pane
  const widgetContainer = document.createElement("div");
  widgetContainer.id = "bottlr-widget-container";
  widgetContainer.style.flex = "0 0 0"; // start hidden
  widgetContainer.style.height = "100vh";
  widgetContainer.style.boxSizing = "border-box";
  widgetContainer.style.overflow = "hidden";

  // Move everything currently in <body> into siteContainer
  bodyChildren.forEach((node) => {
    siteContainer.appendChild(node);
  });

  // Clear <body> and append our new wrapper
  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.appendChild(wrapper);
  wrapper.appendChild(siteContainer);
  wrapper.appendChild(widgetContainer);

  //
  // 2) Inject CSS for split‐screen + bubble/card
  //
  const style = document.createElement("style");
  style.textContent = `
    /* Prevent the page from scrolling behind our flex wrapper */
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      height: 100vh;
    }
    /* The chat bubble (fixed bottom‐right) */
    .bottlr-widget-button {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(to br, #22c55e, #16a34a);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      border: none;
      transition: transform 0.2s;
      z-index: 9999;
    }
    .bottlr-widget-button:hover {
      transform: scale(1.05);
    }
    /* The expanded “card” inside the right‐pane */
    .bottlr-widget-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(to bottom, #ecfdf5, #ffffff);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .bottlr-widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }
    /* The URL bar just below header */
    .bottlr-current-url {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e5e7eb;
      font-size: 12px;
      color: #555;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .bottlr-widget-msgs {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .bottlr-msg {
      max-width: 80%;
      padding: 0.75rem;
      border-radius: 0.5rem;
    }
    .bottlr-msg.user {
      align-self: flex-end;
      background: #f3f4f6;
    }
    .bottlr-msg.bot {
      align-self: flex-start;
      background: transparent;
    }
    .bottlr-options {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .bottlr-scan-btn {
      align-self: center;
      background: #22c55e;
      color: #000;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 9999px;
      cursor: pointer;
    }
    .bottlr-recs-carousel {
      display: flex;
      transition: transform 0.3s ease-in-out;
    }
    .bottlr-recs-card {
      min-width: 100%;
      flex-shrink: 0;
      padding: 1rem;
    }
    .bottlr-recs-controls button {
      background: rgba(0,0,0,0.05);
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .bottlr-recs-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin: 0 3px;
      border: none;
      cursor: pointer;
    }
    .bottlr-recs-dot.active {
      background: #00FF7F;
    }
    .bottlr-recs-dot.inactive {
      background: #ccc;
    }
    .bottlr-notification {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      background: #00FF7F;
      padding: 1rem;
      z-index: 9999;
      animation: slideUp 0.5s ease-in-out;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    .bottlr-btn {
      background: #00FF7F;
      color: black;
      border: none;
      border-radius: 9999px;
      padding: 1rem 0;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    }
    .bottlr-btn:hover {
      background: #00e56b;
    }
  `;
  document.head.appendChild(style);

  //
  // 3) Helpers to open/close the split‐screen
  //
  function openWidget() {
    siteContainer.style.flex = "0 0 70vw";
    widgetContainer.style.flex = "0 0 30vw";
  }
  function closeWidget() {
    siteContainer.style.flex = "1 1 100%";
    widgetContainer.style.flex = "0 0 0";
  }

  //
  // 4) Create a <div id="bottlr-chat-root"> inside widgetContainer
  //
  const root = document.createElement("div");
  root.id = "bottlr-chat-root";
  root.style.height = "100%";
  widgetContainer.appendChild(root);

  //
  // 5) All React components, including URL‐watching logic
  //
  const recommendations = [
    {
      id: 1,
      type: "Most Similar",
      name: "Lauverjat Sancerre Perle Blanche 2022",
      price: 35.95,
      message: "This wine is rich and velvety, just like you like.",
      image: "https://assets.codepen.io/7773162/Group+13.png"
    },
    {
      id: 2,
      type: "More for the Same",
      name: "Domaine Vacheron Sancerre 2022",
      price: 35.95,
      message: "A perfect match for your taste in elegant whites.",
      image: "https://assets.codepen.io/7773162/Group+13.png"
    },
    {
      id: 3,
      type: "Same for Less",
      name: "Domaine Fouassier Sancerre 2022",
      price: 29.95,
      message: "A great value with the same refined character.",
      image: "https://assets.codepen.io/7773162/Group+13.png"
    }
  ];

  function WineRecommendation({ onWineSelect }) {
    const [activeIndex, setActiveIndex] = useState(0);

    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { position: "relative", overflow: "hidden" } },
        React.createElement(
          "div",
          {
            className: "bottlr-recs-carousel",
            style: { transform: `translateX(-${activeIndex * 100}%)` }
          },
          recommendations.map((wine) =>
            React.createElement(
              "div",
              { className: "bottlr-recs-card", key: wine.id },
              React.createElement(
                "div",
                {
                  style: {
                    background: "#0001",
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    textAlign: "center"
                  }
                },
                React.createElement(
                  "div",
                  { style: { fontWeight: 600, marginBottom: 8 } },
                  wine.type
                ),
                React.createElement("img", {
                  src: wine.image,
                  alt: wine.name,
                  style: { height: 192, objectFit: "contain", marginBottom: 12 }
                }),
                React.createElement(
                  "h3",
                  {
                    style: {
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 500,
                      marginBottom: 6
                    }
                  },
                  wine.name
                ),
                React.createElement(
                  "button",
                  {
                    className: "bottlr-btn",
                    onClick: () =>
                      onWineSelect({ name: wine.name, message: wine.message })
                  },
                  `Add to Cart • $${wine.price}`
                )
              )
            )
          )
        ),
        activeIndex > 0 &&
          React.createElement(
            "button",
            {
              className: "bottlr-recs-controls",
              style: {
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)"
              },
              onClick: () => setActiveIndex((i) => i - 1)
            },
            React.createElement(ChevronLeft, { size: 20 })
          ),
        activeIndex < recommendations.length - 1 &&
          React.createElement(
            "button",
            {
              className: "bottlr-recs-controls",
              style: {
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)"
              },
              onClick: () => setActiveIndex((i) => i + 1)
            },
            React.createElement(ChevronRight, { size: 20 })
          )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "center",
            gap: 6,
            margin: "12px 0"
          }
        },
        recommendations.map((_, idx) =>
          React.createElement("button", {
            key: idx,
            className: `bottlr-recs-dot ${
              idx === activeIndex ? "active" : "inactive"
            }`,
            onClick: () => setActiveIndex(idx)
          })
        )
      ),
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(
          "div",
          {
            style: {
              width: 32,
              height: 32,
              borderRadius: 16,
              background: "black",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#00FF7F",
              fontWeight: 600
            }
          },
          "b"
        ),
        React.createElement(
          "p",
          { style: { margin: 0, fontWeight: 500, color: "#222" } },
          "Need more suggestions? Tap an image for details."
        )
      )
    );
  }

  function WineNotification({ message, onClose, onExpand }) {
    return React.createElement(
      "div",
      { className: "bottlr-notification" },
      React.createElement(
        "div",
        { style: { maxWidth: "40rem", margin: "0 auto" } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12 } },
          React.createElement(
            "button",
            {
              onClick: onExpand,
              style: {
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "none",
                border: "none",
                cursor: "pointer"
              }
            },
            React.createElement(
              "div",
              {
                style: {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: "black",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00FF7F",
                  fontWeight: 600
                }
              },
              "b"
            ),
            React.createElement(
              "p",
              { style: { margin: 0, fontWeight: 500, color: "#111" } },
              message
            )
          ),
          React.createElement(
            "button",
            {
              onClick: onClose,
              style: {
                background: "none",
                border: "none",
                cursor: "pointer"
              }
            },
            React.createElement(X, { size: 20 })
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16
            }
          },
          React.createElement(
            "div",
            {
              style: {
                flex: 1,
                height: 48,
                background: "#0002",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                color: "#2227"
              }
            },
            "Message Bottlr..."
          ),
          React.createElement(
            "button",
            {
              style: {
                width: 48,
                height: 48,
                borderRadius: 24,
                background: "black",
                color: "white",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }
            },
            React.createElement(Send, { size: 20, color: "#fff" })
          )
        ),
        React.createElement(
          "div",
          {
            style: { textAlign: "center", fontSize: 12, color: "#4448", marginTop: 8 }
          },
          "Powered by Bottlr"
        )
      )
    );
  }

  function ChatInterface({ onWineSelect }) {
    const [messages, setMessages] = useState([
      {
        id: "1",
        type: "bot",
        content:
          "Hey Tyler! Let's find your perfect wine. how do you want to start?",
        options: [
          "Scan a wine label",
          "Use my purchase history",
          "Ask the AI-Sommelier",
          "Something else?"
        ]
      }
    ]);

    const [showScanOption, setShowScanOption] = useState(false);
    const [showRecommendations, setShowRecommendations] = useState(false);

    const appendMessage = (type, content) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), type, content }
      ]);
    };

    const handleOptionClick = (option) => {
      appendMessage("user", option);

      if (option === "Something else?" || option === "Scan a wine label") {
        setShowScanOption(true);
        appendMessage("bot", "Snap a photo of the label, and we'll do the rest.");
      } else {
        setShowRecommendations(true);
        appendMessage("bot", "Here are some tailored picks for you:");
      }
    };

    const handleScan = () => {
      setShowScanOption(false);
      setShowRecommendations(true);
      appendMessage(
        "bot",
        "We couldn't find that exact bottle, but check these out:"
      );
    };

    return React.createElement(
      "div",
      { className: "bottlr-widget-msgs" },
      messages.map((msg) =>
        React.createElement(
          "div",
          { key: msg.id, className: `bottlr-msg ${msg.type}` },
          msg.type === "bot" &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8
                }
              },
              React.createElement(
                "div",
                {
                  style: {
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    background: "black",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#00FF7F",
                    fontWeight: 600
                  }
                },
                "b"
              )
            ),
          React.createElement(
            "p",
            { style: { margin: 0, fontWeight: 500, color: "#222" } },
            msg.content
          ),
          msg.options &&
            React.createElement(
              "div",
              { className: "bottlr-options" },
              msg.options.map((opt) =>
                React.createElement(
                  "button",
                  {
                    key: opt,
                    style: {
                      width: "100%",
                      background: "black",
                      color: "#fff",
                      border: "none",
                      borderRadius: "9999px",
                      padding: "0.75rem 1.5rem",
                      margin: "4px 0",
                      cursor: "pointer",
                      textAlign: "left"
                    },
                    onClick: () => handleOptionClick(opt)
                  },
                  opt
                )
              )
            )
        )
      ),
      showScanOption &&
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "center" } },
          React.createElement(
            "button",
            {
              className: "bottlr-scan-btn",
              onClick: handleScan
            },
            React.createElement(Camera, {
              size: 20,
              style: { verticalAlign: "middle", marginRight: "6px" }
            }),
            "Scan Now"
          )
        ),
      showRecommendations &&
        React.createElement(WineRecommendation, { onWineSelect })
    );
  }

  function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const [selectedWine, setSelectedWine] = useState(null);

    // 6) Track the current URL and console.log whenever it changes
    const [currentURL, setCurrentURL] = useState(window.location.href);

    useEffect(() => {
      // Helper to log+update state
      const logAndUpdate = () => {
        console.log("Current URL:", window.location.href);
        setCurrentURL(window.location.href);
      };

      // On mount, log and set state
      logAndUpdate();

      // Listen for popstate + hashchange
      window.addEventListener("popstate", logAndUpdate);
      window.addEventListener("hashchange", logAndUpdate);

      // Monkey‐patch pushState & replaceState
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

    const handleWineSelect = (wine) => {
      setSelectedWine(wine);
      setIsOpen(false);
      setShowNotification(true);
      closeWidget();
    };

    const handleNotificationClose = () => setShowNotification(false);
    const handleNotificationExpand = () => {
      setShowNotification(false);
      setIsOpen(true);
      openWidget();
    };

    const toggleOpen = () => {
      if (!isOpen) {
        openWidget();
        setIsOpen(true);
      } else {
        closeWidget();
        setIsOpen(false);
      }
    };

    return React.createElement(
      React.Fragment,
      null,
      // Always‐visible chat bubble
      React.createElement(
        "button",
        {
          className: "bottlr-widget-button",
          onClick: toggleOpen
        },
        React.createElement(MessageCircle, {
          size: 28,
          color: "#fff"
        })
      ),

      // If open, show the full card
      isOpen &&
        React.createElement(
          "div",
          { className: "bottlr-widget-card" },
          // Header with close button
          React.createElement(
            "div",
            { className: "bottlr-widget-header" },
            React.createElement("strong", null, "Bottlr"),
            React.createElement(
              "button",
              {
                onClick: toggleOpen,
                style: {
                  background: "none",
                  border: "none",
                  cursor: "pointer"
                }
              },
              React.createElement(X, { size: 20 })
            )
          ),
          // ALWAYS show current URL here
          React.createElement(
            "div",
            { className: "bottlr-current-url" },
            currentURL
          ),
          // Chat messages below
          React.createElement(ChatInterface, { onWineSelect: handleWineSelect }),
          React.createElement(
            "div",
            {
              style: {
                padding: "8px",
                textAlign: "center",
                fontSize: 12,
                color: "#888",
                borderTop: "1px solid #eee"
              }
            },
            "Powered by Bottlr"
          )
        ),

      // Bottom notification bar
      showNotification &&
        selectedWine &&
        React.createElement(WineNotification, {
          message: selectedWine.message,
          onClose: handleNotificationClose,
          onExpand: handleNotificationExpand
        })
    );
  }

  //
  // 7) Mount React
  //
  ReactDOM.createRoot(root).render(React.createElement(ChatWidget));
})();
