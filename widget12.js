import React, { useState, useEffect, useCallback } from "https://esm.sh/react@18";
import ReactDOM from "https://esm.sh/react-dom@18/client";
import { MessageCircle, Send, X, Wine, Star, ShoppingCart, Camera, Bot, User, ChevronLeft, ChevronRight, Sparkles } from "https://esm.sh/lucide-react@0.263.0?bundle";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js";

marked.use({
  renderer: {
    link(href, title, text) {
      const titleAttr = title ? ` title="${title}"` : "";
      return `<a href="${href}"${titleAttr} target="_self" rel="noopener noreferrer">${text}</a>`;
    }
  },
});

(function () {
  // 1) Build a wrapper with two flex-columns: siteContainer + widgetContainer
  const bodyChildren = Array.from(document.body.childNodes);
  const wrapper = document.createElement("div");
  wrapper.id = "bottlr-wrapper";
  wrapper.style.display = "flex";
  wrapper.style.width = "100vw";
  wrapper.style.height = "100vh";
  wrapper.style.margin = "0";
  wrapper.style.padding = "0";

  // Left side: the site-content
  const siteContainer = document.createElement("div");
  siteContainer.id = "bottlr-site-container";
  siteContainer.style.flex = "1 1 100%"; // start full-width
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

  // 2) Inject CSS with green styling
  const style = document.createElement("style");
  style.textContent = `
    /* Prevent the page from scrolling behind our flex wrapper */
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    /* The chat bubble (fixed bottom-right) */
    .bottlr-widget-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
      cursor: pointer;
      border: none;
      transition: all 0.3s ease;
      z-index: 9999;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4); }
      50% { box-shadow: 0 8px 25px rgba(34, 197, 94, 0.6), 0 0 0 10px rgba(34, 197, 94, 0.1); }
      100% { box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4); }
    }

    .bottlr-widget-button:hover {
      transform: scale(1.1);
      box-shadow: 0 10px 30px rgba(34, 197, 94, 0.6);
    }

    /* The expanded "card" inside the right-pane */
    .bottlr-widget-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(to bottom, #ecfdf5, #ffffff);
      box-shadow: -8px 0 24px rgba(0,0,0,0.1);
      border-radius: 0;
      overflow: hidden;
      border-left: 1px solid #d1fae5;
    }

    .bottlr-widget-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .bottlr-widget-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bottlr-close-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bottlr-close-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    /* The URL bar just below header */
    .bottlr-current-url {
      padding: 0.75rem 1rem;
      background: #f0fdf4;
      border-bottom: 1px solid #d1fae5;
      font-size: 12px;
      color: #16a34a;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }

    .bottlr-widget-msgs {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      background: linear-gradient(to bottom, #ecfdf5, #ffffff);
    }

    .bottlr-msg {
      max-width: 85%;
      padding: 1rem;
      border-radius: 1rem;
      position: relative;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bottlr-msg.user {
      align-self: flex-end;
      background: #f3f4f6;
      color: #1f2937;
      margin-left: auto;
    }

    .bottlr-msg.bot {
      align-self: flex-start;
      background: white;
      border: 1px solid #d1fae5;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .bottlr-msg-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .bottlr-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .bottlr-avatar.bot {
      background: #000000;
      color: #00FF7F;
    }

    .bottlr-avatar.user {
      background: #f1f5f9;
      color: #475569;
    }

    .bottlr-msg-content {
      margin: 0;
      line-height: 1.5;
      color: #374151;
      font-weight: 500;
    }

    .bottlr-msg.user .bottlr-msg-content {
      color: #1f2937;
    }

    .bottlr-options {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .bottlr-option-btn {
      width: 100%;
      background: #000000;
      color: white;
      border: none;
      border-radius: 9999px;
      padding: 12px 16px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bottlr-option-btn:hover {
      background: #1f2937;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .bottlr-input-area {
      padding: 1rem;
      border-top: 1px solid #d1fae5;
      background: white;
    }

    .bottlr-input-container {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .bottlr-input {
      flex: 1;
      border: 1px solid #d1fae5;
      border-radius: 20px;
      padding: 12px 16px;
      resize: none;
      outline: none;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.4;
      max-height: 120px;
      min-height: 44px;
      transition: border-color 0.2s;
    }

    .bottlr-input:focus {
      border-color: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
    }

    .bottlr-send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .bottlr-send-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }

    .bottlr-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .bottlr-typing {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: white;
      border: 1px solid #d1fae5;
      border-radius: 12px;
      width: fit-content;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .bottlr-typing-dots {
      display: flex;
      gap: 4px;
    }

    .bottlr-typing-dot {
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .bottlr-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .bottlr-typing-dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .bottlr-welcome {
      text-align: center;
      padding: 2rem 1rem;
      color: #6b7280;
    }

    .bottlr-welcome h4 {
      margin: 0 0 8px 0;
      color: #374151;
      font-size: 18px;
    }

    .bottlr-welcome p {
      margin: 0;
      line-height: 1.5;
    }

    /* Responsive */
    @media (max-width: 768px) {
      #bottlr-site-container {
        flex: 0 0 0 !important;
      }
      #bottlr-widget-container {
        flex: 1 1 100% !important;
      }
      .bottlr-widget-button {
        bottom: 16px;
        right: 16px;
        width: 56px;
        height: 56px;
      }
    }

    /* Scrollbar styling */
    .bottlr-widget-msgs::-webkit-scrollbar {
      width: 6px;
    }

    .bottlr-widget-msgs::-webkit-scrollbar-track {
      background: #f0fdf4;
    }

    .bottlr-widget-msgs::-webkit-scrollbar-thumb {
      background: #bbf7d0;
      border-radius: 3px;
    }

    .bottlr-widget-msgs::-webkit-scrollbar-thumb:hover {
      background: #86efac;
    }
  `;
  document.head.appendChild(style);

  // 3) Helpers to open/close the split-screen
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

  // 4) Create a <div id="bottlr-chat-root"> inside widgetContainer
  const root = document.createElement("div");
  root.id = "bottlr-chat-root";
  root.style.height = "100%";
  widgetContainer.appendChild(root);

  // API Configuration
  const API_CONFIG = {
    endpoint: "https://nishantbundela.com/api/chat2",
    headers: {
      "Content-Type": "application/json",
    },
  };

  // API call function (non-streaming)
  const callBottlrAPI = async (messages, abortSignal = null) => {
    const payload = {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: false,
    };

    console.log("Sending to Bottlr backend:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(API_CONFIG.endpoint, {
        method: "POST",
        headers: API_CONFIG.headers,
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}`, errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Received from Bottlr backend:", JSON.stringify(result, null, 2));

      return result.text || result.message || result.content || "Sorry, I had trouble understanding that. Could you try rephrasing your question?";
    } catch (error) {
      console.error("Error calling Bottlr API:", error);

      if (error.name === "AbortError") {
        throw new Error("Request was cancelled");
      }

      throw new Error("Sorry, I'm having trouble connecting right now. Please try again in a moment.");
    }
  };

  // API call function (streaming)
  const streamBottlrAPI = async (messages, onTextDelta, onFinish, onError, abortSignal = null) => {
    const payload = {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true,
    };

    console.log("Sending to Bottlr backend (stream):", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(API_CONFIG.endpoint, {
        method: "POST",
        headers: API_CONFIG.headers,
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}`, errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      console.log("Got successful streaming response from Bottlr backend");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();

            if (data === "[DONE]") {
              console.log("Received [DONE] marker");
              onFinish();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              console.log("Parsed streaming data:", parsed);

              if (parsed.type === "text") {
                onTextDelta(parsed.value || "");
              } else if (parsed.type === "finish") {
                onFinish();
                return;
              }
            } catch (e) {
              console.warn("Error parsing streaming data:", e, data);
              onTextDelta(data);
            }
          } else {
            onTextDelta(line);
          }
        }
      }

      onFinish();
    } catch (error) {
      console.error("Error in streaming API call:", error);
      onError(error);
    }
  };

  // Typing indicator component
  function TypingIndicator() {
    return React.createElement(
      "div",
      { className: "bottlr-typing" },
      React.createElement("div", { className: "bottlr-avatar bot" }, "b"),
      React.createElement("span", { style: { fontSize: "13px", color: "#6b7280" } }, "Bottlr is typing"),
      React.createElement(
        "div",
        { className: "bottlr-typing-dots" },
        React.createElement("div", { className: "bottlr-typing-dot" }),
        React.createElement("div", { className: "bottlr-typing-dot" }),
        React.createElement("div", { className: "bottlr-typing-dot" })
      )
    );
  }

  // Chat interface component
  function ChatInterface() {
    const [messages, setMessages] = useState([
      {
        id: "welcome",
        type: "bot",
        content: "Hey! Let's find your perfect wine. How do you want to start?",
        options: [
          "Find wines for dinner pairing",
          "Get recommendations by style",
          "Learn about wine regions",
          "Find wines within my budget",
          "Something else",
        ],
      },
      {
        id: "disclaimer",
        type: "bot",
        content:
          "**Thanks for visiting!** Please note we are *testing* this new tool. " +
          "Feel free to use it and send feedback to [bottlr@parlourwines.com](mailto:bottlr@parlourwines.com).",
      },
    ]);

    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [abortController, setAbortController] = useState(null);
    const [useStreaming, setUseStreaming] = useState(true);

    const addMessage = useCallback((type, content, options = null) => {
      const newMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Ensure unique IDs
        type,
        content,
        options,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
      return newMessage.id;
    }, []);

    const updateMessage = useCallback((messageId, content) => {
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, content } : msg)));
    }, []);

    // Build conversation history for API
    const buildConversationHistory = useCallback(() => {
      const systemMessage = {
        role: "system",
        content: `You are Bottlr, a knowledgeable and passionate wine sommelier assistant. Your expertise includes:

- Wine varietals, regions, and vintages
- Food and wine pairing recommendations  
- Wine tasting notes and profiles
- Budget-friendly wine suggestions
- Special occasion wine selection
- Wine storage and serving tips

Guidelines:
- Be enthusiastic and knowledgeable about wine
- Provide specific, actionable recommendations
- Ask clarifying questions when needed
- Keep responses concise but informative
- Focus on helping users discover wines they'll love
- If asked about non-wine topics, politely redirect to wine-related assistance

Always maintain a friendly, expert tone while being helpful and educational.`,
      };

      const conversationHistory = messages
        .filter((msg) => msg.id !== "welcome" && !msg.options)
        .map((msg) => ({
          role: msg.type === "bot" ? "assistant" : "user",
          content: msg.content,
        }));

      return [systemMessage, ...conversationHistory];
    }, [messages]);

    const handleSendMessage = useCallback(
      async (messageContent) => {
        if (!messageContent.trim() || isTyping) return;

        if (abortController) {
          abortController.abort();
        }

        const newAbortController = new AbortController();
        setAbortController(newAbortController);

        // Add user message first
        addMessage("user", messageContent);
        setInput("");

        // Show typing indicator
        setIsTyping(true);

        try {
          const conversationHistory = buildConversationHistory();
          const userMessage = { role: "user", content: messageContent };
          const fullHistory = [...conversationHistory, userMessage];

          if (useStreaming) {
            // Create bot message for streaming
            const botMessageId = addMessage("bot", "");
            let accumulatedContent = "";

            await streamBottlrAPI(
              fullHistory,
              // onTextDelta
              (textDelta) => {
                accumulatedContent += textDelta;
                updateMessage(botMessageId, accumulatedContent);
              },
              // onFinish
              () => {
                setIsTyping(false);
                setAbortController(null);
                console.log("Streaming completed");
              },
              // onError
              (error) => {
                setIsTyping(false);
                setAbortController(null);
                updateMessage(botMessageId, error.message || "Sorry, I encountered an error. Please try again.");
              },
              newAbortController.signal
            );
          } else {
            // Non-streaming response
            const botResponse = await callBottlrAPI(fullHistory, newAbortController.signal);
            setIsTyping(false);
            setAbortController(null);
            addMessage("bot", botResponse);
          }
        } catch (error) {
          setIsTyping(false);
          setAbortController(null);

          if (error.name !== "AbortError") {
            addMessage("bot", error.message || "Sorry, I encountered an error. Please try again.");
          }
        }
      },
      [addMessage, updateMessage, buildConversationHistory, isTyping, abortController, useStreaming]
    );

    const handleOptionClick = useCallback(
      (option) => {
        handleSendMessage(option);
      },
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
      setInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }, []);

    useEffect(() => {
      return () => {
        if (abortController) {
          abortController.abort();
        }
      };
    }, [abortController]);

    const handleStopGeneration = useCallback(() => {
      if (abortController) {
        abortController.abort();
        setAbortController(null);
        setIsTyping(false);
      }
    }, [abortController]);

    return React.createElement(
  React.Fragment,
  null,
  React.createElement(
    "div",
    { className: "bottlr-widget-msgs" },
    messages.map((msg) =>
      React.createElement(
        "div",
        { key: msg.id, className: `bottlr-msg ${msg.type}` },
        React.createElement(
          "div",
          { className: "bottlr-msg-header" },
          React.createElement(
            "div",
            { className: `bottlr-avatar ${msg.type}` },
            msg.type === "bot" ? "b" : React.createElement(User, { size: 14 })
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "12px",
                fontWeight: "500",
                color: "#6b7280",
              },
            },
            msg.type === "bot" ? "Bottlr" : "You"
          )
        ),
        msg.type === "bot"
          ? React.createElement("div", {
              className: "bottlr-msg-content",
              dangerouslySetInnerHTML: {
                __html: marked.parse(msg.content || ""),
              },
            })
          : React.createElement("p", { className: "bottlr-msg-content" }, msg.content),
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
                  onClick: () => handleSendMessage(option),
                },
                React.createElement(Wine, { size: 16 }),
                option
              )
            )
          )
      )
    ),
    isTyping && React.createElement(TypingIndicator)
  ),


      React.createElement(
        "div",
        { className: "bottlr-input-area" },
        React.createElement(
          "div",
          { className: "bottlr-input-container" },
          React.createElement("textarea", {
            className: "bottlr-input",
            placeholder: isTyping ? "Bottlr is thinking..." : "Ask me about wine...",
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
                  onClick: handleStopGeneration,
                  style: { background: "#ef4444" },
                  title: "Stop generation",
                },
                React.createElement(X, { size: 18, color: "#fff" })
              )
            : React.createElement(
                "button",
                {
                  className: "bottlr-send-btn",
                  onClick: () => handleSendMessage(input),
                  disabled: !input.trim(),
                },
                React.createElement(Send, { size: 18, color: "#fff" })
              )
        ),
        // Streaming toggle for debugging
        React.createElement(
          "div",
          {
            style: {
              padding: "8px",
              fontSize: "11px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            },
          },
          React.createElement(
            "label",
            null,
            React.createElement("input", {
              type: "checkbox",
              checked: useStreaming,
              onChange: (e) => setUseStreaming(e.target.checked),
              style: { marginRight: "4px" },
            }),
            "Streaming mode"
          )
        )
      )
    );
  }

  // Main chat widget component
  function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentURL, setCurrentURL] = useState(window.location.href);

    // Track URL changes
    useEffect(() => {
      const logAndUpdate = () => {
        console.log("Current URL:", window.location.href);
        setCurrentURL(window.location.href);
      };

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

    const toggleOpen = useCallback(() => {
      if (!isOpen) {
        openWidget();
        setIsOpen(true);
      } else {
        closeWidget();
        setIsOpen(false);
      }
    }, [isOpen]);

    return React.createElement(
      React.Fragment,
      null,
      // Always-visible chat bubble
      React.createElement(
        "button",
        {
          className: "bottlr-widget-button",
          onClick: toggleOpen,
          "aria-label": "Open Bottlr wine assistant",
        },
        React.createElement(MessageCircle, {
          size: 28,
          color: "#fff",
        })
      ),

      // If open, show the full card
      isOpen &&
        React.createElement(
          "div",
          { className: "bottlr-widget-card" },
          React.createElement(
            "div",
            { className: "bottlr-widget-header" },
            React.createElement("h3", null, React.createElement(Wine, { size: 20 }), "Bottlr"),
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
          React.createElement("div", { className: "bottlr-current-url" }, "📍 ", currentURL),
          React.createElement(ChatInterface),
          React.createElement(
            "div",
            {
              style: {
                padding: "12px 16px",
                textAlign: "center",
                fontSize: "11px",
                color: "#6b7280",
                borderTop: "1px solid #d1fae5",
                background: "#f0fdf4",
              },
            },
            "Powered by Bottlr • Your AI Wine Sommelier"
          )
        )
    );
  }

  // Mount React
  ReactDOM.createRoot(root).render(React.createElement(ChatWidget));

  // Expose global API for external control
  window.BottlrWidget = {
    open: () => {
      openWidget();
      window.dispatchEvent(new CustomEvent("bottlr:open"));
    },
    close: () => {
      closeWidget();
      window.dispatchEvent(new CustomEvent("bottlr:close"));
    },
    version: "1.0.0",
  };

  console.log("🍷 Bottlr Widget loaded successfully!");
})();
