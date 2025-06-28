
		import React, {
			useState,
			useEffect,
			useCallback,
			useRef
		} from "https://esm.sh/react@18";
		import ReactDOM from "https://esm.sh/react-dom@18/client";
		import {
			MessageCircle,
			Send,
			X,
			Wine,
			Star,
			ShoppingCart,
			Camera,
			Bot,
			User,
			ChevronLeft,
			ChevronRight,
			Sparkles
		} from "https://esm.sh/lucide-react@0.263.0?bundle";
		import {
			marked
		} from "https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js";
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
				// Check multiple mobile indicators
				const userAgent = navigator.userAgent || navigator.vendor || window.opera;
				// Check for mobile user agents
				const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
				const isMobileUA = mobileRegex.test(userAgent);
				// Check for touch capability and small screen
				const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
				const isSmallScreen = window.innerWidth <= 768;
				// Check for mobile-specific features
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
			// 2) Inject CSS with Figma-inspired styling
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
          cursor: pointer;
          border: none;
          transition: all 0.3s ease;
          z-index: 9999;
        }

        .bottlr-widget-button:hover {
          transform: scale(1.1);
        }

        /* The expanded "card" inside the right-pane */
        .bottlr-widget-card {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: radial-gradient(50% 50% at 50% 50%, #99F3B4 0%, #ffffff 80%);
          border-radius: 0;
          overflow: hidden;
          position: relative;
        }

        .bottlr-widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: transparent;
          color: #1a1a1a;
          z-index: 10;
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

        /* The URL bar just below header */
        .bottlr-current-url {
          padding: 12px 20px;
          background: transparent;
          font-size: 12px;
          color: #666;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
          z-index: 10;
        }

        .bottlr-widget-msgs {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scroll-behavior: smooth;
          z-index: 5;
        }

        .bottlr-msg {
          max-width: 85%;
          position: relative;
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
        
        a:-webkit-any-link {
          color: #266064;
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

        /* Fix markdown bullet points and lists */
        .bottlr-msg-content ul {
          margin: 16px 0;
          padding-left: 20px;
        }

        .bottlr-msg-content ol {
          margin: 16px 0;
          padding-left: 20px;
        }

        .bottlr-msg-content li {
          margin: 8px 0;
          line-height: 1.5;
        }

        .bottlr-msg-content ul ul,
        .bottlr-msg-content ol ol,
        .bottlr-msg-content ul ol,
        .bottlr-msg-content ol ul {
          margin: 4px 0;
          padding-left: 20px;
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
					width: 200px;
          
        }

        .bottlr-product-category {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 16px;
          text-align: center;
        }

        .bottlr-product-image {
          width: 120px;
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
          z-index: 10;
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
          min-height: 10px;
          transition: border-color 0.2s;
          background: transparent;
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
            
        ::-webkit-input-placeholder {
        color: #5e5e5e;
        }

        .bottlr-send-btn:hover {
          transform: scale(1.05);
          background: #00000010;
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
          background: transparent;
        }

        .bottlr-widget-msgs::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.2);
          border-radius: 3px;
        }

        .bottlr-widget-msgs::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.3);
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
			// Product card component
			function ProductCard({
				category,
				imageUrl,
				name,
				price,
				url,
				buttonText = "Add to Cart"
			}) {
				const handleProductClick = useCallback(() => {
					// Navigate to the product page using the same method as other links
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
						console.log("🛒 Product button clicked:", {
							url,
							targetPath
						});
						// Manually trigger navigation
						history.pushState({}, '', targetPath);
						window.dispatchEvent(new PopStateEvent('popstate', {
							state: {}
						}));
					}
				}, [url]);
				return React.createElement(
					"div", {
						className: "bottlr-product-card"
					},
					category && React.createElement("div", {
						className: "bottlr-product-category"
					}, category),
					imageUrl && React.createElement("img", {
						src: imageUrl,
						alt: name,
						className: "bottlr-product-image"
					}),
					name && React.createElement("div", {
						className: "bottlr-product-name"
					}, name),
					React.createElement(
						"button", {
							className: "bottlr-product-button",
							onClick: handleProductClick
						},
						`${buttonText}${price ? ` • ${price}` : ''}`
					)
				);
			}
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
						const {
							done,
							value
						} = await reader.read();
						if (done) break;
						buffer += decoder.decode(value, {
							stream: true
						});
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
					"div", {
						className: "bottlr-typing"
					},
					React.createElement("span", {
						style: {
							fontSize: "14px",
							color: "#666",
							marginRight: "8px"
						}
					}, "Typing"),
					React.createElement(
						"div", {
							className: "bottlr-typing-dots"
						},
						React.createElement("div", {
							className: "bottlr-typing-dot"
						}),
						React.createElement("div", {
							className: "bottlr-typing-dot"
						}),
						React.createElement("div", {
							className: "bottlr-typing-dot"
						})
					)
				);
			}
			// Function to parse product information from bot response with new separator system
			function parseProductFromResponse(text) {
				const productSeparator = "---PRODUCT---";
				const parts = text.split(productSeparator);
				console.log("🔍 Parsing response:", {
					hasProductSeparator: text.includes(productSeparator),
					partsLength: parts.length,
					text: text.substring(0, 200) + "..."
				});
				if (parts.length < 2) {
					return {
						textContent: text,
						productInfo: null
					};
				}
				const textContent = parts[0].trim();
				const productData = parts[1].trim();
				console.log("📦 Product data section:", productData);
				// Parse the structured product data
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
								// Extract URL from markdown format if present
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
				console.log("✅ Parsed product info:", productInfo);
				return {
					textContent,
					productInfo: Object.keys(productInfo).length > 0 ? productInfo : null
				};
			}
			// Chat interface component
			function ChatInterface() {
				const [messages, setMessages] = useState([{
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
						content: "**Thanks for visiting!** Please note we are *testing* this new tool. " +
							"Feel free to use it and send feedback to [bottlr@parlourwines.com](mailto:bottlr@parlourwines.com).",
					},
				]);
				const [input, setInput] = useState("");
				const [isTyping, setIsTyping] = useState(false);
				const [abortController, setAbortController] = useState(null);
				const messagesEndRef = useRef(null);
				// Auto-scroll to bottom when messages change
				const scrollToBottom = useCallback(() => {
					if (messagesEndRef.current) {
						messagesEndRef.current.scrollIntoView({
							behavior: "smooth"
						});
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
				const updateMessage = useCallback((messageId, content) => {
					setMessages((prev) => prev.map((msg) => (msg.id === messageId ? {
						...msg,
						content
					} : msg)));
				}, []);
				// Build conversation history for API
				const buildConversationHistory = useCallback(() => {
					const systemMessage = {
						role: "system",
						content: `You are Bottlr, a friendly wine sommelier assistant. Be conversational and helpful, but keep your responses CONCISE and focused.

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

Always maintain a friendly, conversational tone while being brief and helpful. Use the separator system to prevent users from seeing raw product data while streaming.`,
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
								const userMessage = {
									role: "user",
									content: messageContent
								};
								const fullHistory = [...conversationHistory, userMessage];
								// Use streaming by default
								let botMessageId = null;
								let accumulatedContent = "";
								let hasStartedStreaming = false;
								await streamBottlrAPI(
									fullHistory,
									// onTextDelta
									(textDelta) => {
										if (!hasStartedStreaming) {
											// First text delta - create the bot message and hide typing indicator
											botMessageId = addMessage("bot", textDelta);
											setIsTyping(false);
											hasStartedStreaming = true;
											accumulatedContent = textDelta;
										} else {
											// Subsequent deltas - update the existing message
											accumulatedContent += textDelta;
											// Always update with full accumulated content for final parsing
											updateMessage(botMessageId, accumulatedContent);
											// For display purposes only, check if we should hide product data during streaming
											if (accumulatedContent.includes("---PRODUCT---")) {
												const {
													textContent
												} = parseProductFromResponse(accumulatedContent);
												// You could show just text during streaming if desired, but keep full content in message
												// This is just for UX, the full content is preserved
											}
										}
									},
									// onFinish
									() => {
										if (!hasStartedStreaming) {
											// If no text was streamed, hide typing and show empty message
											setIsTyping(false);
											addMessage("bot", "I apologize, but I didn't receive a response. Please try again.");
										}
										setAbortController(null);
										console.log("Streaming completed");
									},
									// onError
									(error) => {
										setIsTyping(false);
										setAbortController(null);
										if (!hasStartedStreaming) {
											addMessage("bot", error.message || "Sorry, I encountered an error. Please try again.");
										} else {
											updateMessage(botMessageId, accumulatedContent + "\n\n*Error occurred during response*");
										}
									},
									newAbortController.signal
								);
							} catch (error) {
								setIsTyping(false);
								setAbortController(null);
								if (error.name !== "AbortError") {
									addMessage("bot", error.message || "Sorry, I encountered an error. Please try again.");
								}
							}
						},
						[addMessage, updateMessage, buildConversationHistory, isTyping, abortController]
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
						"div", {
							className: "bottlr-widget-msgs"
						},
						messages.map((msg) => {
							// Parse product information from bot messages using new separator system
							const responseData = msg.type === "bot" ? parseProductFromResponse(msg.content) : {
								textContent: msg.content,
								productInfo: null
							};
							console.log("🎬 Rendering message:", {
								id: msg.id,
								type: msg.type,
								hasProductInfo: !!responseData.productInfo,
								productInfo: responseData.productInfo,
								contentLength: msg.content?.length || 0
							});
							if (msg.type === "bot" && responseData.productInfo) {
								console.log("🎯 Rendering product card for message:", msg.id, responseData.productInfo);
							}
							return React.createElement(
								"div", {
									key: msg.id,
									className: `bottlr-msg ${msg.type}`
								},
								msg.type === "bot" && React.createElement(
									"div", {
										className: "bottlr-msg-header"
									},
									React.createElement(
										"div", {
											className: `bottlr-avatar ${msg.type}`
										},
										"b"
									),
									React.createElement(
										"span", {
											style: {
												fontSize: "14px",
												fontWeight: "600",
												color: "#1a1a1a",
											},
										},
										"Bottlr"
									)
								),
								msg.type === "bot" ?
								React.createElement("div", {
									className: "bottlr-msg-content",
									dangerouslySetInnerHTML: {
										__html: marked.parse(responseData.textContent || ""),
									},
								}) :
								React.createElement("div", {
									className: "bottlr-msg-content"
								}, msg.content),
								// Add product card if product info is found
								responseData.productInfo && React.createElement(ProductCard, {
									category: responseData.productInfo.category,
									imageUrl: responseData.productInfo.imageUrl,
									name: responseData.productInfo.name,
									price: responseData.productInfo.price,
									url: responseData.productInfo.url,
									buttonText: "Add to Cart"
								}),
								msg.options &&
								React.createElement(
									"div", {
										className: "bottlr-options"
									},
									msg.options.map((option, idx) => {
										return React.createElement(
											"button", {
												key: idx,
												className: "bottlr-option-btn",
												onClick: () => handleSendMessage(option),
											},
											React.createElement(Wine, {
												size: 18,
												color: "#ffffff"
											}),
											option
										);
									})
								)
							);
						}),
						isTyping && React.createElement(
							"div", {
								className: "bottlr-msg bot"
							},
							React.createElement(
								"div", {
									className: "bottlr-msg-header"
								},
								React.createElement("div", {
									className: "bottlr-avatar bot"
								}, "b"),
								React.createElement(
									"span", {
										style: {
											fontSize: "14px",
											fontWeight: "600",
											color: "#1a1a1a",
										},
									},
									"Bottlr"
								)
							),
							React.createElement(TypingIndicator)
						),
						// Invisible element to scroll to
						React.createElement("div", {
							ref: messagesEndRef
						})
					),
					React.createElement(
						"div", {
							className: "bottlr-input-area"
						},
						React.createElement(
							"div", {
								className: "bottlr-input-container"
							},
							React.createElement("textarea", {
								className: "bottlr-input",
								placeholder: isTyping ? "Bottlr is thinking..." : "Ask me about wine...",
								value: input,
								onChange: handleInputChange,
								onKeyDown: handleInputKeyDown,
								rows: 1,
								disabled: isTyping,
							}),
							isTyping ?
							React.createElement(
								"button", {
									className: "bottlr-send-btn",
									onClick: handleStopGeneration,
									style: {
										background: "#ef4444",
										borderRadius: "16px"
									},
									title: "Stop generation",
								},
								React.createElement(X, {
									size: 18,
									color: "#fff"
								})
							) :
							React.createElement(
								"button", {
									className: "bottlr-send-btn",
									onClick: () => handleSendMessage(input),
									disabled: !input.trim(),
								},
								React.createElement(Send, {
									size: 18,
									color: "#000"
								})
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
					history.pushState = function(...args) {
						origPush.apply(this, args);
						logAndUpdate();
					};
					history.replaceState = function(...args) {
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
					// Chat bubble - hide when widget is open
					!isOpen && React.createElement(
						"button", {
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
						"div", {
							className: "bottlr-widget-card"
						},
						React.createElement(
							"div", {
								className: "bottlr-widget-header"
							},
							React.createElement("h3", null, React.createElement(Wine, {
								size: 20
							}), "Bottlr"),
							React.createElement(
								"button", {
									className: "bottlr-close-btn",
									onClick: toggleOpen,
									"aria-label": "Close chat",
								},
								React.createElement(X, {
									size: 20
								})
							)
						),
						React.createElement(ChatInterface),
						React.createElement(
							"div", {
								style: {
									padding: "0px 0px 12px 0px",
									textAlign: "center",
									fontSize: "14px",
									color: "#000000",
									background: "rgba(187, 237, 200, 0.40)",
									zIndex: 10,
								},
							},
							"Powered by Bottlr"
						)
					)
				);
			}
			// Mount React
			ReactDOM.createRoot(root).render(React.createElement(ChatWidget));
			// Manually handle widget links to mimic website's router behavior
			document.getElementById("bottlr-chat-root").addEventListener("click", (e) => {
				const anchor = e.target.closest("a");
				if (!anchor) return;
				const href = anchor.getAttribute("href");
				if (!href) return;
				console.log("🔗 Chat link clicked:", {
					href: href,
					fullHref: anchor.href,
					classes: anchor.className,
					isRelative: !href.startsWith('http')
				});
				// Only handle mailto links specially
				if (href.startsWith("mailto:")) {
					return; // Let mailto links work normally
				}
				// For same-domain links, manually trigger the same navigation the website uses
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
					// Prevent default to avoid page reload
					e.preventDefault();
					// Get the path to navigate to
					let targetPath = href;
					if (href.startsWith('http')) {
						try {
							const url = new URL(href);
							targetPath = url.pathname + url.search + url.hash;
						} catch (e) {
							targetPath = href;
						}
					}
					console.log("🔀 Manually navigating to:", targetPath);
					// Manually trigger history.pushState like the website does
					history.pushState({}, '', targetPath);
					// Dispatch a popstate event to trigger the website's router
					window.dispatchEvent(new PopStateEvent('popstate', {
						state: {}
					}));
					return;
				}
				// For external links, let them work normally
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
				version: "1.0.0",
			};
			console.log("🍷 Bottlr Widget loaded successfully!");
		})();
	
