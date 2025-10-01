import React, { useState, useEffect, useCallback, useRef } from "https://esm.sh/react@18";
        import ReactDOM from "https://esm.sh/react-dom@18/client";
        import { MessageCircle, Send, X, Wine, User } from "https://esm.sh/lucide-react@0.263.0?bundle";
        import { marked } from "https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js";
        import { io } from "https://cdn.jsdelivr.net/npm/socket.io-client@4.7.2/dist/socket.io.esm.min.js";

        marked.use({
            renderer: {
                link(href, title, text) {
                    const titleAttr = title ? ` title="${title}"` : "";
                    // Convert same-domain absolute URLs to relative URLs to work with site's router
                    let processedHref = href;
                    try {
                        const currentDomain = window.location.hostname;
                        if (href.startsWith('http')) {
                            const linkUrl = new URL(href);
                            if (linkUrl.hostname === currentDomain) {
                                // Convert to relative URL so the site's router can handle it
                                processedHref = linkUrl.pathname + linkUrl.search + linkUrl.hash;
                            }
                        }
                    } catch (e) {
                        // If URL parsing fails, use original href
                        processedHref = href;
                    }
                    // Add classes that the website expects for product links
                    let linkClass = '';
                    if (processedHref.includes('/product/')) {
                        linkClass = ' class="product-link"';
                    }
                    return `<a href="${processedHref}"${titleAttr}${linkClass} target="_self" rel="noopener noreferrer">${text}</a>`;
                }
            },
        });

        (function() {
            // Mobile detection function
            function isMobile() {
                const userAgent = navigator.userAgent || navigator.vendor || window.opera;
                const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
                const isMobileUA = mobileRegex.test(userAgent);
                const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                const isSmallScreen = window.innerWidth <= 768;
                const isMobileScreen = window.screen.width <= 768;
                return isMobileUA || (hasTouch && isSmallScreen) || isMobileScreen;
            }

            // Exit early if on mobile
            if (isMobile()) {
                console.log("📱 Mobile device detected - Bottlr widget disabled");
                return;
            }

            console.log("💻 Desktop device detected - Loading Bottlr widget");

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

            // 2) Inject CSS with green/black styling
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
                    background: linear-gradient(135deg, #00FF7F 0%, #00E066 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 8px 25px rgba(0, 255, 127, 0.4);
                    cursor: pointer;
                    border: none;
                    transition: all 0.3s ease;
                    z-index: 9999;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 8px 25px rgba(0, 255, 127, 0.4); }
                    50% { box-shadow: 0 8px 25px rgba(0, 255, 127, 0.6), 0 0 0 10px rgba(0, 255, 127, 0.1); }
                    100% { box-shadow: 0 8px 25px rgba(0, 255, 127, 0.4); }
                }

                .bottlr-widget-button:hover {
                    transform: scale(1.1);
                    box-shadow: 0 10px 30px rgba(0, 255, 127, 0.6);
                }

                /* The expanded "card" inside the right-pane */
                .bottlr-widget-card {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    background: radial-gradient(50% 50% at 50% 50%, #99F3B4 0%, #ffffff 80%);
                    box-shadow: -8px 0 24px rgba(0,0,0,0.1);
                    border-radius: 0;
                    overflow: hidden;
                    border-left: 1px solid #d1fae5;
                }

                .bottlr-widget-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: transparent;
                    color: #1a1a1a;
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                }

                .bottlr-widget-header h3 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #1a1a1a;
                }

                .bottlr-close-btn {
                    background: transparent;
                    border: none;
                    color: #1a1a1a;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .bottlr-close-btn:hover {
                    background: rgba(0,0,0,0.1);
                }

                .bottlr-widget-msgs {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    background: transparent;
                }

                .bottlr-msg {
                    max-width: 85%;
                    animation: slideIn 0.3s ease-out;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .bottlr-msg.user {
                    align-self: flex-end;
                    margin-left: auto;
                }

                .bottlr-msg.bot {
                    align-self: flex-start;
                }

                .bottlr-msg-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .bottlr-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 16px;
                    flex-shrink: 0;
                }

                .bottlr-avatar.bot {
                    background: #000000;
                    color: #00FF7F;
                }

                .bottlr-avatar.user {
                    background: #e5e7eb;
                    color: #374151;
                }

                .bottlr-msg-content {
                    padding: 16px 20px;
                    border-radius: 16px;
                    margin: 0;
                    line-height: 1.5;
                    font-weight: 400;
                    font-size: 15px;
                }

                .bottlr-msg.user .bottlr-msg-content {
                    background: rgba(211, 211, 211, 0.30);
                    backdrop-filter: blur(12px);
                    color: #000000;
                }

                .bottlr-msg.bot .bottlr-msg-content {
                    background: rgba(211, 211, 211, 0.30);
                    backdrop-filter: blur(12px);
                    color: #000000;
                }

                .bottlr-msg-content a {
                    color: #266064;
                    text-decoration: none;
                }

                .bottlr-msg-content a:hover {
                    text-decoration: underline;
                }

                /* Markdown styling */
                .bottlr-msg-content ul,
                .bottlr-msg-content ol {
                    margin: 16px 0;
                    padding-left: 20px;
                }

                .bottlr-msg-content li {
                    margin: 8px 0;
                    line-height: 1.5;
                }

                .bottlr-msg-content p {
                    margin: 12px 0;
                }

                .bottlr-msg-content p:first-child {
                    margin-top: 0;
                }

                .bottlr-msg-content p:last-child {
                    margin-bottom: 0;
                }

                .bottlr-msg-content img {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 12px auto;
                    border-radius: 8px;
                }

                /* Product card styling */
                .bottlr-product-card {
                    background: rgba(211, 211, 211, 0.30);
                    backdrop-filter: blur(12px);
                    border-radius: 16px;
                    padding: 20px;
                    margin: 16px 0;
                    text-align: center;
                    width: 300px;
                }

                .bottlr-product-category {
                    font-size: 18px;
                    font-weight: 700;
                    color: #1a1a1a;
                    margin-bottom: 16px;
                    text-align: center;
                }

                .bottlr-product-image {
                    width: 90%;
                    height: auto;
                    margin: 0 auto 16px auto;
                    display: block;
                    border-radius: 8px;
                }

                .bottlr-product-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin: 12px 0;
                    line-height: 1.3;
                }

                .bottlr-product-button {
                    width: 100%;
                    background: #00FF7F;
                    color: #000000;
                    border: none;
                    border-radius: 25px;
                    padding: 16px 20px;
                    font-size: 16px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 12px;
                    box-shadow: 0 2px 8px rgba(0, 255, 127, 0.2);
                }

                .bottlr-product-button:hover {
                    background: #00E066;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0, 255, 127, 0.4);
                }

                .bottlr-options {
                    margin-top: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .bottlr-option-btn {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.80);
                    backdrop-filter: blur(12px);
                    color: #ffffff;
                    border: none;
                    border-radius: 16px;
                    padding: 16px 20px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                    font-size: 15px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .bottlr-option-btn:hover {
                    background: #333333;
                    transform: translateY(-2px);
                }

                .bottlr-input-area {
                    padding: 16px;
                    background: rgba(187, 237, 200, 0.40);
                    backdrop-filter: blur(12px);
                    border-top: 1px solid rgba(0,0,0,0.1);
                }

                .bottlr-input-container {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }

                .bottlr-input {
                    flex: 1;
                    border: 2px solid #5E5E5E;
                    border-radius: 18px;
                    padding: 12px 16px;
                    resize: none;
                    outline: none;
                    font-family: inherit;
                    font-size: 15px;
                    max-height: 120px;
                    min-height: 44px;
                    transition: border-color 0.2s;
                    background: transparent;
                }

                .bottlr-input:focus {
                    border-color: #00FF7F;
                }

                .bottlr-input::placeholder {
                    color: #5e5e5e;
                }

                .bottlr-send-btn {
                    width: 50px;
                    height: 50px;
                    border-radius: 16px;
                    background: transparent;
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
                    background: rgba(0,0,0,0.1);
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
                    background: #E3E6E2;
                    border-radius: 16px;
                    width: fit-content;
                }

                .bottlr-typing-dots {
                    display: flex;
                    gap: 4px;
                }

                .bottlr-typing-dot {
                    width: 8px;
                    height: 8px;
                    background: #00FF7F;
                    border-radius: 50%;
                    animation: bounce 1.4s infinite ease-in-out both;
                }

                .bottlr-typing-dot:nth-child(1) { animation-delay: -0.32s; }
                .bottlr-typing-dot:nth-child(2) { animation-delay: -0.16s; }

                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }

                .bottlr-status {
                    padding: 8px 16px;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                    background: rgba(0,0,0,0.05);
                    border-radius: 8px;
                    margin: 8px 0;
                }

                .bottlr-progress {
                    width: 100%;
                    height: 4px;
                    background: #e0e0e0;
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 8px 0;
                }

                .bottlr-progress-bar {
                    height: 100%;
                    background: #00FF7F;
                    transition: width 0.3s ease;
                }

                /* Scrollbar styling */
                .bottlr-widget-msgs::-webkit-scrollbar {
                    width: 6px;
                }

                .bottlr-widget-msgs::-webkit-scrollbar-track {
                    background: transparent;
                }

                .bottlr-widget-msgs::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.2);
                    border-radius: 3px;
                }

                .bottlr-widget-msgs::-webkit-scrollbar-thumb:hover {
                    background: rgba(0,0,0,0.3);
                }

                /* Responsive */
                @media (max-width: 768px) {
                    #bottlr-site-container {
                        flex: 0 0 0 !important;
                    }
                    #bottlr-widget-container {
                        flex: 1 1 100% !important;
                    }
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

            // Backend Configuration
            const BACKEND_CONFIG = {
                baseUrl: "https://nishantbundela.com/api",
                socketUrl: "https://nishantbundela.com",
                socketPath: "/api/socket.io/"
            };

            // Product card component
            function ProductCard({ category, imageUrl, name, price, url, buttonText = "Add to Cart" }) {
                const handleProductClick = useCallback(() => {
                    if (url) {
                        let targetPath = url;
                        try {
                            const currentDomain = window.location.hostname;
                            if (url.startsWith('http')) {
                                const linkUrl = new URL(url);
                                if (linkUrl.hostname === currentDomain) {
                                    targetPath = linkUrl.pathname + linkUrl.search + linkUrl.hash;
                                }
                            }
                        } catch (e) {
                            targetPath = url;
                        }
                        console.log("🛒 Product button clicked:", { url, targetPath });
                        history.pushState({}, '', targetPath);
                        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                    }
                }, [url]);

                return React.createElement(
                    "div", { className: "bottlr-product-card" },
                    category && React.createElement("div", { className: "bottlr-product-category" }, category),
                    imageUrl && React.createElement("img", { src: imageUrl, alt: name, className: "bottlr-product-image" }),
                    name && React.createElement("div", { className: "bottlr-product-name" }, name),
                    React.createElement(
                        "button", 
                        { className: "bottlr-product-button", onClick: handleProductClick },
                        `${buttonText}${price ? ` ${price}` : ''}`
                    )
                );
            }

            // Typing indicator component
            function TypingIndicator() {
                return React.createElement(
                    "div", { className: "bottlr-typing" },
                    React.createElement("span", { style: { fontSize: "14px", color: "#666", marginRight: "8px" } }, "Typing"),
                    React.createElement(
                        "div", { className: "bottlr-typing-dots" },
                        React.createElement("div", { className: "bottlr-typing-dot" }),
                        React.createElement("div", { className: "bottlr-typing-dot" }),
                        React.createElement("div", { className: "bottlr-typing-dot" })
                    )
                );
            }

            // Function to parse product information from bot response
            function parseProductFromResponse(text) {
                const productSeparator = "---PRODUCT---";
                const parts = text.split(productSeparator);
                
                if (parts.length < 2) {
                    return { textContent: text, productInfo: null };
                }

                const textContent = parts[0].trim();
                const productData = parts[1].trim();
                
                const lines = productData.split('\n');
                const productInfo = {};
                
                lines.forEach(line => {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length > 0) {
                        let value = valueParts.join(':').trim();
                        switch (key.trim().toUpperCase()) {
                            case 'CATEGORY':
                                productInfo.category = value;
                                break;
                            case 'NAME':
                                productInfo.name = value;
                                break;
                            case 'PRICE':
                                productInfo.price = value;
                                break;
                            case 'IMAGE':
                                const markdownMatch = value.match(/\[([^\]]+)\]\(([^)]+)\)/);
                                if (markdownMatch) {
                                    productInfo.imageUrl = markdownMatch[2];
                                } else {
                                    productInfo.imageUrl = value;
                                }
                                break;
                            case 'URL':
                                productInfo.url = value;
                                break;
                        }
                    }
                });

                return {
                    textContent,
                    productInfo: Object.keys(productInfo).length > 0 ? productInfo : null
                };
            }

            // Chat interface component with Socket.IO integration
            function ChatInterface() {
                const [messages, setMessages] = useState([
                    {
                        id: "welcome",
                        type: "bot",
                        content: "Hey! Let's find your perfect wine. How do you want to start?",
                        options: [
                            "Use my purchase history",
                            "Ask the AI-Sommelier",
                            "Find wines for dinner pairing",
                            "Get recommendations by style"
                        ],
                    },
                    {
                        id: "disclaimer",
                        type: "bot",
                        content: "**We're actively developing this tool.** Interested in joining our beta testing round? Reach out to us at [bottlr@parlourwines.com](mailto:bottlr@parlourwines.com).",
                    },
                ]);

                const [input, setInput] = useState("");
                const [isTyping, setIsTyping] = useState(false);
                const [socket, setSocket] = useState(null);
                const [chatId, setChatId] = useState(null);
                const [userId, setUserId] = useState(null);
                const [userEmail, setUserEmail] = useState(null);
                const [status, setStatus] = useState("");
                const [progress, setProgress] = useState(0);
                const messagesEndRef = useRef(null);
                const currentStreamingMessageId = useRef(null);

                // Initialize Socket.IO connection and anonymous user
                useEffect(() => {
                    // Create anonymous user session
                    const initializeSession = async () => {
                        try {
                            // Generate anonymous user credentials
                            const anonymousEmail = `user_${Date.now()}@bottlr.anonymous`;
                            const anonymousPassword = Math.random().toString(36).substring(2, 15);
                            
                            // Try to register the anonymous user
                            const registerResponse = await fetch(`${BACKEND_CONFIG.baseUrl}/users`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ email: anonymousEmail, password: anonymousPassword })
                            });

                            let userData;
                            if (registerResponse.ok) {
                                userData = await registerResponse.json();
                            } else {
                                // If registration fails, try to login (user might already exist)
                                const loginResponse = await fetch(`${BACKEND_CONFIG.baseUrl}/users/login`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: anonymousEmail, password: anonymousPassword })
                                });
                                
                                if (loginResponse.ok) {
                                    userData = await loginResponse.json();
                                } else {
                                    throw new Error('Failed to create session');
                                }
                            }

                            setUserId(userData.id);
                            setUserEmail(anonymousEmail);

                            // Create a chat for this session
                            const chatResponse = await fetch(`${BACKEND_CONFIG.baseUrl}/chats`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: userData.id, title: `Chat ${new Date().toLocaleString()}` })
                            });

                            if (chatResponse.ok) {
                                const chatData = await chatResponse.json();
                                setChatId(chatData.id);
                            }
                        } catch (error) {
                            console.error('Failed to initialize session:', error);
                            // Use fallback IDs if backend is not available
                            setUserId('anonymous_' + Date.now());
                            setUserEmail('anonymous@bottlr.local');
                            setChatId('chat_' + Date.now());
                        }
                    };

                    initializeSession();

                    // Initialize Socket.IO connection
                    const newSocket = io(BACKEND_CONFIG.socketUrl, {
                        path: BACKEND_CONFIG.socketPath,
                        transports: ["websocket", "polling"],
                        reconnection: true,
                        reconnectionDelay: 1000,
                        reconnectionAttempts: 5
                    });

                    // Socket event handlers
                    newSocket.on("connect", () => {
                        console.log("✅ Socket connected:", newSocket.id);
                    });

                    newSocket.on("disconnect", () => {
                        console.log("❌ Socket disconnected");
                    });

                    newSocket.on("bttlr-stream-start", (data) => {
                        console.log("Stream started:", data);
                        setIsTyping(false); // Hide typing indicator when streaming starts
                    });

                    newSocket.on("bttlr-status-update", (data) => {
                        console.log("Status update:", data);
                        setStatus(data.status || "");
                    });

                    newSocket.on("bttlr-stream-chunk", (data) => {
                        console.log("Received chunk:", data);
                        if (data.chunk) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                if (currentStreamingMessageId.current) {
                                    const msgIndex = newMessages.findIndex(m => m.id === currentStreamingMessageId.current);
                                    if (msgIndex !== -1) {
                                        newMessages[msgIndex] = {
                                            ...newMessages[msgIndex],
                                            content: newMessages[msgIndex].content + data.chunk
                                        };
                                    }
                                }
                                return newMessages;
                            });
                        }
                    });

                    newSocket.on("bttlr-stream-metadata", (data) => {
                        console.log("Metadata:", data);
                        // Handle table data if needed
                    });

                    newSocket.on("bttlr-workflow-metadata", (data) => {
                        console.log("Workflow metadata:", data);
                        // Handle workflow data if needed
                    });

                    newSocket.on("bttlr-artifacts", (data) => {
                        console.log("Artifacts:", data);
                        // Handle artifacts if needed
                    });

                    newSocket.on("bttlr-progress", (data) => {
                        console.log("Progress:", data);
                        if (data.progress !== undefined) {
                            setProgress(data.progress);
                        }
                    });

                    newSocket.on("bttlr-follow-up", (data) => {
                        console.log("Follow up:", data);
                        // Could add follow-up questions as options
                        if (data.follow_up && Array.isArray(data.follow_up)) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                if (currentStreamingMessageId.current) {
                                    const msgIndex = newMessages.findIndex(m => m.id === currentStreamingMessageId.current);
                                    if (msgIndex !== -1) {
                                        newMessages[msgIndex] = {
                                            ...newMessages[msgIndex],
                                            options: data.follow_up
                                        };
                                    }
                                }
                                return newMessages;
                            });
                        }
                    });

                    newSocket.on("bttlr-stream-end", (data) => {
                        console.log("✅ Stream ended:", data);
                        setIsTyping(false);
                        setStatus("");
                        setProgress(0);
                        currentStreamingMessageId.current = null;
                        
                        if (data.final_response) {
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastBotMessage = newMessages.filter(m => m.type === 'bot').pop();
                                if (lastBotMessage) {
                                    const msgIndex = newMessages.findIndex(m => m.id === lastBotMessage.id);
                                    if (msgIndex !== -1) {
                                        newMessages[msgIndex] = {
                                            ...newMessages[msgIndex],
                                            content: data.final_response
                                        };
                                    }
                                }
                                return newMessages;
                            });
                        }
                    });

                    newSocket.on("bttlr-stream-error", (data) => {
                        console.error("❌ Stream error:", data);
                        setIsTyping(false);
                        setStatus("");
                        setProgress(0);
                        currentStreamingMessageId.current = null;
                        
                        setMessages(prev => [...prev, {
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            type: "bot",
                            content: data.error || "Sorry, I encountered an error. Please try again.",
                            timestamp: new Date()
                        }]);
                    });

                    setSocket(newSocket);

                    return () => {
                        newSocket.disconnect();
                    };
                }, []);

                // Auto-scroll to bottom when messages change
                const scrollToBottom = useCallback(() => {
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
                    }
                }, []);

                useEffect(() => {
                    scrollToBottom();
                }, [messages, isTyping, scrollToBottom]);

                const addMessage = useCallback((type, content, options = null) => {
                    const newMessage = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        type,
                        content,
                        options,
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, newMessage]);
                    return newMessage.id;
                }, []);

                const buildSystemPrompt = useCallback(() => {
                    return `You are Bottlr, a friendly wine sommelier assistant. Be conversational and helpful, but keep your responses CONCISE and focused.

KEY GUIDELINES:
- Keep initial responses SHORT (2-3 sentences max)
- Give 1-2 specific recommendations, not long lists
- Only provide detailed explanations when explicitly asked
- Be enthusiastic but not overwhelming
- Ask follow-up questions to narrow down preferences
- If they want "more details" or "tell me more", then you can expand
- Provide specific, actionable recommendations

REQUIRED FORMAT for wine recommendations:
1. Write your conversational response first
2. Add the separator: ---PRODUCT---
3. Then add product data in this exact format:
   CATEGORY: Most Similar
   NAME: Wine Name Here
   PRICE: $XX.XX
   IMAGE: https://direct-image-url.jpg
   URL: /product/restofwineproducturl/

EXAMPLE PERFECT RESPONSE:
"Yes, we have the Terpin Sauvignon 2017 available for $56.95! It's a vibrant wine with great acidity and a nice balance of fruit flavors. Would you like to know more about it or perhaps how it pairs with food?

---PRODUCT---
CATEGORY: Most Similar
NAME: Terpin Sauvignon 2017
PRICE: $56.95
IMAGE: https://www.parlourwines.com/uploads/1/5/0/4/150451540/s442166373361667158_p895_i1_w2000.jpeg
URL: /product/terpin-sauvignon-2017/895"

IMPORTANT: For IMAGE field, provide ONLY the direct URL, not markdown format.

Your expertise includes:
- Wine varietals, regions, and vintages
- Food and wine pairing recommendations  
- Wine tasting notes and profiles
- Budget-friendly wine suggestions
- Special occasion wine selection

Always maintain a friendly, conversational tone while being brief and helpful.`;
                }, []);

                const handleSendMessage = useCallback(
                    async (messageContent) => {
                        if (!messageContent.trim() || isTyping) return;
                        if (!socket || !socket.connected) {
                            console.error("Socket not connected");
                            addMessage("bot", "Connection lost. Please refresh the page to reconnect.");
                            return;
                        }

                        // Add user message
                        addMessage("user", messageContent);
                        setInput("");
                        setIsTyping(true);
                        setStatus("Processing your request...");

                        // Create bot message for streaming
                        const botMessageId = addMessage("bot", "");
                        currentStreamingMessageId.current = botMessageId;

                        // Emit the query to the socket
                        socket.emit("bttlr-stream", {
                            chat_id: chatId || "anonymous_chat",
                            user_id: userId || "anonymous_user",
                            user_email: userEmail || "anonymous@bottlr.local",
                            query: messageContent
                        });

                        console.log("Sent query to socket:", {
                            chat_id: chatId,
                            user_id: userId,
                            user_email: userEmail,
                            query: messageContent
                        });
                    },
                    [socket, chatId, userId, userEmail, isTyping, addMessage]
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

                return React.createElement(
                    React.Fragment,
                    null,
                    React.createElement(
                        "div",
                        { className: "bottlr-widget-msgs" },
                        messages.map((msg) => {
                            // Parse product information from bot messages
                            const responseData = msg.type === "bot" ? 
                                parseProductFromResponse(msg.content) : 
                                { textContent: msg.content, productInfo: null };

                            return React.createElement(
                                "div",
                                { key: msg.id, className: `bottlr-msg ${msg.type}` },
                                msg.type === "bot" && React.createElement(
                                    "div",
                                    { className: "bottlr-msg-header" },
                                    React.createElement("div", { className: `bottlr-avatar ${msg.type}` }, "b"),
                                    React.createElement(
                                        "span",
                                        { style: { fontSize: "14px", fontWeight: "600", color: "#1a1a1a" } },
                                        "Bottlr"
                                    )
                                ),
                                msg.type === "bot" ?
                                    React.createElement("div", {
                                        className: "bottlr-msg-content",
                                        dangerouslySetInnerHTML: { __html: marked.parse(responseData.textContent || "") },
                                    }) :
                                    React.createElement("div", { className: "bottlr-msg-content" }, msg.content),
                                // Add product card if product info is found
                                responseData.productInfo && React.createElement(ProductCard, {
                                    category: responseData.productInfo.category,
                                    imageUrl: responseData.productInfo.imageUrl,
                                    name: responseData.productInfo.name,
                                    price: responseData.productInfo.price,
                                    url: responseData.productInfo.url,
                                    buttonText: "Add to Cart"
                                }),
                                msg.options && React.createElement(
                                    "div",
                                    { className: "bottlr-options" },
                                    msg.options.map((option, idx) => {
                                        return React.createElement(
                                            "button",
                                            {
                                                key: idx,
                                                className: "bottlr-option-btn",
                                                onClick: () => handleSendMessage(option),
                                            },
                                            React.createElement(Wine, { size: 18, color: "#ffffff" }),
                                            option
                                        );
                                    })
                                )
                            );
                        }),
                        isTyping && React.createElement(
                            "div",
                            { className: "bottlr-msg bot" },
                            React.createElement(
                                "div",
                                { className: "bottlr-msg-header" },
                                React.createElement("div", { className: "bottlr-avatar bot" }, "b"),
                                React.createElement(
                                    "span",
                                    { style: { fontSize: "14px", fontWeight: "600", color: "#1a1a1a" } },
                                    "Bottlr"
                                )
                            ),
                            React.createElement(TypingIndicator)
                        ),
                        status && React.createElement("div", { className: "bottlr-status" }, status),
                        progress > 0 && React.createElement(
                            "div",
                            { className: "bottlr-progress" },
                            React.createElement("div", { 
                                className: "bottlr-progress-bar",
                                style: { width: `${progress}%` }
                            })
                        ),
                        // Invisible element to scroll to
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
                                placeholder: isTyping ? "Bottlr is thinking..." : "Ask me about wine...",
                                value: input,
                                onChange: handleInputChange,
                                onKeyDown: handleInputKeyDown,
                                rows: 1,
                                disabled: isTyping,
                            }),
                            React.createElement(
                                "button",
                                {
                                    className: "bottlr-send-btn",
                                    onClick: () => handleSendMessage(input),
                                    disabled: !input.trim() || isTyping,
                                },
                                React.createElement(Send, { size: 18, color: "#000" })
                            )
                        )
                    )
                );
            }

            // Main chat widget component
            function ChatWidget() {
                const [isOpen, setIsOpen] = useState(false);

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
                    // Chat bubble - hide when widget is open
                    !isOpen && React.createElement(
                        "button",
                        {
                            className: "bottlr-widget-button",
                            onClick: toggleOpen,
                            "aria-label": "Open Bottlr wine assistant",
                        },
                        React.createElement(MessageCircle, { size: 28, color: "#fff" })
                    ),
                    // If open, show the full card
                    isOpen && React.createElement(
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
                        React.createElement(ChatInterface),
                        React.createElement(
                            "div",
                            {
                                style: {
                                    padding: "0px 0px 12px 0px",
                                    textAlign: "center",
                                    fontSize: "14px",
                                    color: "#000000",
                                    background: "rgba(187, 237, 200, 0.40)",
                                },
                            },
                            "Powered by Bottlr"
                        )
                    )
                );
            }

            // Mount React
            ReactDOM.createRoot(root).render(React.createElement(ChatWidget));

            // Handle widget links to mimic website's router behavior
            document.getElementById("bottlr-chat-root").addEventListener("click", (e) => {
                const anchor = e.target.closest("a");
                if (!anchor) return;

                const href = anchor.getAttribute("href");
                if (!href) return;

                // Only handle mailto links specially
                if (href.startsWith("mailto:")) {
                    return; // Let mailto links work normally
                }

                // For same-domain links, manually trigger navigation
                const currentDomain = window.location.hostname;
                let isSameDomain = false;

                try {
                    if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
                        isSameDomain = true;
                    } else if (href.startsWith('http')) {
                        const linkUrl = new URL(href);
                        isSameDomain = linkUrl.hostname === currentDomain;
                    }
                } catch (e) {
                    isSameDomain = true;
                }

                if (isSameDomain) {
                    e.preventDefault();
                    let targetPath = href;
                    if (href.startsWith('http')) {
                        try {
                            const url = new URL(href);
                            targetPath = url.pathname + url.search + url.hash;
                        } catch (e) {
                            targetPath = href;
                        }
                    }
                    
                    console.log("🔀 Navigating to:", targetPath);
                    history.pushState({}, '', targetPath);
                    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
                }
            });

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
                version: "2.0.0",
            };

            console.log("🍷 Bottlr Widget v2.0 loaded successfully!");
        })();
