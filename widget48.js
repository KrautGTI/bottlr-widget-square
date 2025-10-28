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
		Sparkles,
		User as UserIcon
	} from "https://esm.sh/lucide-react@0.263.0?bundle";
	import {
		marked
	} from "https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js";
	import {
		io
	} from "https://cdn.jsdelivr.net/npm/socket.io-client@4.7.2/dist/socket.io.esm.min.js";
	import axios from "https://cdn.jsdelivr.net/npm/axios@1.7.7/dist/esm/axios.min.js";
	/* =================== CONFIG =================== */
	const SOCKET_URL = "https://nishantbundela.com";
	const SOCKET_PATH = "/socket.io";
	const API_BASE = "https://nishantbundela.com";
	/* =================== TOKEN UTILS =================== */
	const TOKENS_KEY = "bottlr_tokens";

	function setTokens(tokens) {
		if (tokens) localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
	}

	function getTokens() {
		try {
			return JSON.parse(localStorage.getItem(TOKENS_KEY) || "{}");
		} catch {
			return {};
		}
	}

	function getAccessToken() {
		return getTokens().accessToken || null;
	}

	function getRefreshToken() {
		return getTokens().refreshToken || null;
	}

	function clearTokens() {
		localStorage.removeItem(TOKENS_KEY);
	}
	/* =================== MARKED SANITIZER =================== */
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
				} catch {}
				let linkClass = "";
				if (processedHref && processedHref.includes("/product/")) linkClass = ' class="product-link"';
				return `<a href="${processedHref}"${titleAttr}${linkClass} target="_self" rel="noopener noreferrer">${text}</a>`;
			}
		},
	});
	/* =================== BOOT =================== */
	(function() {
		const isMobile = () => {
			const ua = navigator.userAgent || navigator.vendor || window.opera;
			const m = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
			const t = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
			const w = window.innerWidth <= 768 || window.screen.width <= 768;
			return m || (t && w) || w;
		};
		const __IS_MOBILE = isMobile();
		console.log(__IS_MOBILE ? "📱 Mobile device detected" : "💻 Desktop device detected - Loading Bottlr widget");
		/* ------- Wrapper / Containers ------- */
		const bodyChildren = Array.from(document.body.childNodes);
		const wrapper = document.createElement("div");
		wrapper.id = "bottlr-wrapper";
		wrapper.className = "bottlr-wrapper";
		Object.assign(wrapper.style, {
			display: "flex",
			width: "100vw",
			height: "100dvh",
			margin: "0",
			padding: "0"
		});
		const siteContainer = document.createElement("div");
		siteContainer.id = "bottlr-site-container";
		Object.assign(siteContainer.style, {
			flex: "1 1 100%",
			height: "100dvh",
			overflow: "auto",
			boxSizing: "border-box"
		});
		const widgetContainer = document.createElement("div");
		widgetContainer.id = "bottlr-widget-container";
		Object.assign(widgetContainer.style, {
			flex: "0 0 0",
			height: "100dvh",
			boxSizing: "border-box",
			overflow: "hidden"
		});
		bodyChildren.forEach(n => siteContainer.appendChild(n));
		document.body.innerHTML = "";
		Object.assign(document.body.style, {
			margin: "0",
			padding: "0"
		});
		document.body.appendChild(wrapper);
		wrapper.appendChild(siteContainer);
		wrapper.appendChild(widgetContainer);
		/* ------- Styles ------- */
		const style = document.createElement("style");
		style.textContent = `
      html, body { margin:0; padding:0; overflow:hidden; height:100dvh; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }

      .bottlr-widget-button {
        position:fixed; bottom:20px; right:20px; width:60px; height:60px; border-radius:50%;
        background:linear-gradient(135deg,#00FF7F 0%,#00E066 100%);
        display:flex; align-items:center; justify-content:center; cursor:pointer; border:none; transition:all .3s; z-index:9999;
      }
      .bottlr-widget-button:hover { transform:scale(1.1); }

      .bottlr-widget-card { width:100%; height:100%; display:flex; flex-direction:column; background:radial-gradient(50% 50% at 50% 50%,#99F3B4 0%,#fff 80%); border-radius:0; overflow:hidden; position:relative; }

      /* Compact sticky header */
      .bottlr-widget-header { position:sticky; top:0; display:flex; align-items:center; justify-content:space-between; padding:10px 12px; background:rgba(255,255,255,0.9); backdrop-filter:blur(8px); color:#1a1a1a; z-index:20; gap:10px; }
      .bottlr-widget-header h3 { margin:0; font-size:16px; font-weight:700; display:flex; align-items:center; gap:8px; color:#1a1a1a; }
      .bottlr-close-btn { background:transparent; border:none; color:#1a1a1a; cursor:pointer; padding:6px; border-radius:6px; transition:background .2s; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .bottlr-close-btn:hover { background:rgba(0,0,0,.08); }

      .bottlr-current-url { padding:8px 12px; font-size:12px; color:#666; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-family:'SF Mono','Monaco','Consolas',monospace; z-index:10; }

      .bottlr-widget-msgs { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:12px; scroll-behavior:smooth; z-index:5; min-height:0; }

      .bottlr-msg { max-width:85%; position:relative; animation:slideIn .3s ease-out; }
      @keyframes slideIn { from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:translateY(0);} }
      .bottlr-msg.user { align-self:flex-end; margin-left:auto; }
      .bottlr-msg.bot  { align-self:flex-start; }
      .bottlr-msg-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
      .bottlr-avatar { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; }
      .bottlr-avatar.bot  { background:#000; color:#00FF7F; }
      .bottlr-avatar.user { background:#e5e7eb; color:#374151; }

      .bottlr-msg-content { padding:12px 14px; border-radius:14px; margin:0; line-height:1.5; font-weight:400; font-size:15px; background:rgba(211,211,211,.30); backdrop-filter:blur(12px); color:#000; }
      .bottlr-msg-content img { max-width:100%; height:auto; display:block; margin:12px auto; border-radius:8px; }

      /* Product carousel */
      .bottlr-product-carousel {
        display:flex; gap:12px; overflow-x:auto; padding:6px 2px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch;
      }
      .bottlr-product-carousel::-webkit-scrollbar { height: 8px; }
      .bottlr-product-carousel::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; }

      .bottlr-product-card { background: rgba(211,211,211,0.30); backdrop-filter: blur(12px); border-radius:16px; padding:20px; margin:16px 0; text-align:center; width:300px; max-width:100%; }
      .bottlr-product-category { font-size:14px; font-weight:700; color:#1a1a1a; margin-bottom:8px; }

      /* Keep the wrapper to reserve space on mobile */
.bottlr-product-image-wrap{
  width:100%;
  display:grid;                /* center child cleanly */
  place-items:center;          /* both axes */
  overflow:hidden;
  border-radius:8px;
  margin:0 auto 16px;          /* was on the img before */
}

/* Make the image behave like your old width:90%; height:auto; centered */
.bottlr-product-image{
  width:auto;                  /* let natural aspect ratio drive it */
  height:auto;
  max-width:90%;               /* your old look */
  max-height:90%;              /* prevents tall images from overflowing wrapper */
  display:block;
  border-radius:8px;
  opacity:0;                   /* keep fade-in */
  transition:opacity .25s ease;
}

.bottlr-product-image.is-loaded{ opacity:1; }

      .bottlr-product-name { font-size:15px; font-weight:600; color:#1a1a1a; margin:10px 0 6px; line-height:1.3; }
      .bottlr-product-button { width:100%; background:#00FF7F; color:#000; border:none; border-radius:22px; padding:12px 16px; font-size:15px; font-weight:700; cursor:pointer; transition:all .2s; margin-top:8px; box-shadow:0 2px 8px rgba(0,255,127,.2); }
      .bottlr-product-button:hover { background:#00E066; transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,255,127,.4); }

      .bottlr-options { margin-top:10px; display:flex; flex-direction:column; gap:8px; }
      .bottlr-option-btn { width:100%; background:rgba(0,0,0,.8); color:#fff; border:none; border-radius:14px; padding:12px 14px; cursor:pointer; transition:all .2s; text-align:left; font-size:15px; font-weight:600; display:flex; align-items:center; gap:10px; }
      .bottlr-option-btn:hover { background:#333; transform:translateY(-2px); }

      .bottlr-input-area { padding:10px; background:rgba(187,237,200,.40); backdrop-filter:blur(12px); z-index:10; }
      .bottlr-input-container { display:flex; gap:10px; align-items:center; }
      .bottlr-input { flex:1; border:2px solid #5E5E5E; border-radius:16px; padding:10px 12px; resize:none; outline:none; font-family:inherit; font-size:15px; max-height:120px; min-height:10px; transition:border-color .2s; background:transparent; }
      .bottlr-send-btn { width:46px; height:46px; border-radius:14px; background:transparent; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .2s; }
      .bottlr-send-btn:hover { transform:scale(1.05); background:#00000010; }
      .bottlr-send-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; }

      .bottlr-typing { display:flex; align-items:center; gap:8px; padding:10px 12px; background:#E3E6E2; border-radius:12px; width:fit-content; }
      .bottlr-typing-dot { width:8px; height:8px; background:#00FF7F; border-radius:50%; animation:bounce 1.4s infinite ease-in-out both; }
      .bottlr-typing-dot:nth-child(1){ animation-delay:-.32s; } .bottlr-typing-dot:nth-child(2){ animation-delay:-.16s; }
      @keyframes bounce { 0%,80%,100%{ transform:scale(0);} 40%{ transform:scale(1);} }

      /* Auth — compact & wrap */
      .bottlr-auth { display:flex; gap:8px; align-items:center; flex-wrap:wrap; max-width:100%; }
      .bottlr-auth input { height:34px; border:1px solid #c9c9c9; border-radius:10px; padding:0 10px; font-size:13px; outline:none; background:white; color:#111; min-width:0; width:180px; }
      .bottlr-auth button { height:34px; padding:0 12px; border-radius:10px; border:none; cursor:pointer; font-weight:700; white-space:nowrap; }
      .btn-primary { background:#00FF7F; color:#000; }
      .btn-ghost   { background:transparent; border:1px solid #c9c9c9; color:#111; }
      .bottlr-userchip { display:flex; align-items:center; gap:8px; padding:6px 10px; border-radius:999px; background:rgba(0,0,0,.06); font-size:12px; }
      .bottlr-userchip span { max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

      /* MOBILE COMPACT */
      @media (max-width:768px){
        .bottlr-widget-button{ bottom:16px; right:16px; width:56px; height:56px; }

        .bottlr-wrapper:not(.bottlr-open) #bottlr-site-container { flex:1 1 100% !important; }
        .bottlr-wrapper:not(.bottlr-open) #bottlr-widget-container { flex:0 0 0 !important; }
        .bottlr-wrapper.bottlr-open     #bottlr-site-container { flex:0 0 0 !important; }
        .bottlr-wrapper.bottlr-open     #bottlr-widget-container { flex:1 1 100% !important; }

        .bottlr-widget-header { padding:8px 10px; }
        .bottlr-widget-header h3 { font-size:15px; }
        .bottlr-current-url { display:none; }

        .bottlr-auth { width:100%; }
        .bottlr-auth input, .bottlr-auth button { width:100%; }
      }
    `;
		document.head.appendChild(style);
		/* ------- Open/Close helpers ------- */
		function openWidget() {
			if (window.innerWidth <= 768) {
				wrapper.classList.add("bottlr-open");
				siteContainer.style.flex = "0 0 0";
				widgetContainer.style.flex = "1 1 100%";
			} else {
				wrapper.classList.remove("bottlr-open");
				siteContainer.style.flex = "0 0 70vw";
				widgetContainer.style.flex = "0 0 30vw";
			}
		}

		function closeWidget() {
			wrapper.classList.remove("bottlr-open");
			siteContainer.style.flex = "1 1 100%";
			widgetContainer.style.flex = "0 0 0";
		}
		/* ------- React root ------- */
		const root = document.createElement("div");
		root.id = "bottlr-chat-root";
		root.style.height = "100%";
		widgetContainer.appendChild(root);
		/* ------- API client ------- */
		const api = axios.create({
			baseURL: API_BASE,
			withCredentials: false
		});
		api.interceptors.request.use((config) => {
			const atk = getAccessToken();
			if (atk) config.headers.Authorization = `Bearer ${atk}`;
			return config;
		});
		let refreshing = null;
		api.interceptors.response.use(
			r => r,
			async (err) => {
				const original = err.config || {};
				if (err.response && err.response.status === 401 && !original.__retry) {
					if (!refreshing) {
						const rtk = getRefreshToken();
						refreshing = rtk ? axios.post(`${API_BASE}/auth/refresh`, {
							refreshToken: rtk
						}).then(r => r.data) : Promise.reject(err);
					}
					try {
						const data = await refreshing;
						setTokens(data);
						refreshing = null;
						original.__retry = true;
						original.headers = original.headers || {};
						original.headers.Authorization = `Bearer ${getAccessToken()}`;
						return api(original);
					} catch {
						refreshing = null;
						clearTokens();
						throw err;
					}
				}
				throw err;
			}
		);
		/* ------- Auth endpoints ------- */
		async function registerUser(email, password) {
			const {
				data
			} = await axios.post(`${API_BASE}/auth/register`, {
				email,
				password
			}, {
				headers: {
					"Content-Type": "application/json"
				}
			});
			setTokens(data.tokens);
			return data;
		}
		async function loginUser(email, password) {
			const {
				data
			} = await axios.post(`${API_BASE}/auth/login`, {
				email,
				password
			}, {
				headers: {
					"Content-Type": "application/json"
				}
			});
			setTokens(data.tokens);
			return data;
		}
		async function getCurrentUser() {
			const {
				data
			} = await api.get(`/auth/me`);
			return data;
		}
		async function createChat(userId, title) {
			const {
				data
			} = await api.post(`/chats`, {
				userId,
				title
			});
			return data;
		}
		async function getUserChats(userId) {
			const {
				data
			} = await api.get(`/users/${userId}/chats`);
			return data;
		}
		/* ------- Weebly Commerce helpers ------- */
		function getCookie(name) {
			const s = document.cookie || "";
			if (!s) return null;
			const p = name + "=";
			for (const part of s.split("; ")) {
				if (part.startsWith(p)) return decodeURIComponent(part.slice(p.length));
			}
			return null;
		}
		const getXsrfToken = () => getCookie('XSRF-TOKEN');
		const getCartToken = () => getCookie('com_cart_token') || getCookie('sq_cart_v1') || null;
		async function commerceV2(method, params, id = 0) {
			const xsrf = getXsrfToken();
			if (!xsrf) {
				console.error("[Bottlr][RPC] Missing XSRF-TOKEN");
				throw new Error("Missing XSRF-TOKEN");
			}
			const cart = getCartToken();
			const url = `/ajax/api/JsonRPC/CommerceV2/?CommerceV2/[${encodeURIComponent(method)}]${cart?`&cart=${encodeURIComponent(cart)}`:""}`;
			const body = {
				id,
				jsonrpc: "2.0",
				method,
				params
			};
			const res = await fetch(url, {
				method: "POST",
				credentials: "same-origin",
				headers: {
					"content-type": "application/json",
					"accept": "application/json",
					"x-xsrf-token": xsrf
				},
				body: JSON.stringify(body)
			});
			let json;
			try {
				json = await res.json();
			} catch {
				const t = await res.text().catch(() => "");
				console.warn("[Bottlr][RPC] Non-JSON:", t);
				throw new Error(`RPC ${method} non-JSON`);
			}
			if (!res.ok) {
				console.error("[Bottlr][RPC] Error payload:", json);
				throw new Error(`RPC ${method} failed: ${res.status}`);
			}
			document.dispatchEvent(new CustomEvent("cart:updated", {
				detail: json
			}));
			return json;
		}
		async function addToCartV2(productId, quantity = 1, extraParams = null) {
			const params = Array.isArray(extraParams) ? extraParams : [productId, quantity];
			return commerceV2("Cart::addItem", params);
		}
		async function readCartV2() {
			return commerceV2("Cart::read", [false]);
		}
		/* =================== Product utils & robust parser =================== */
		const _norm = (s) => (s == null ? "" : String(s)).trim();
		const hasVal = (s) => _norm(s).length > 0;
		const isHttpImage = (s) => /^https?:\/\//i.test(_norm(s));
		const isInternalUrl = (s) => {
			const v = _norm(s);
			if (!v) return false;
			if (v.startsWith("/")) return true;
			try {
				return new URL(v).hostname === window.location.hostname;
			} catch {
				return false;
			}
		};
		// Require: name + (url or productId) + image
		const isRenderableProduct = (p) =>
			hasVal(p?.name) && (isInternalUrl(p?.url) || hasVal(p?.productId)) && isHttpImage(p?.imageUrl);

		function parseTextAndProducts(input) {
			const text = String(input || "");
			const PRODUCT_TAG = "---PRODUCT---";
			// Collect blocks cleanly (no phantom)
			const blocks = [];
			const re = new RegExp(`(^|\\n)${PRODUCT_TAG}\\n([\\s\\S]*?)(?=\\n${PRODUCT_TAG}|\\n*$)`, "g");
			let m;
			while ((m = re.exec(text)) !== null) blocks.push(m[2]);
			const firstTagIdx = text.indexOf(PRODUCT_TAG);
			const textContent = firstTagIdx === -1 ? text.trim() : text.slice(0, firstTagIdx).trim();
			const products = [];
			for (const block of blocks) {
				const lines = block.split("\n").map((s) => s.trim()).filter(Boolean);
				const p = {
					category: null,
					name: null,
					price: null,
					imageUrl: null,
					url: null,
					productId: null,
					quantity: 1,
					paramsOverride: null
				};
				for (const line of lines) {
					const [rawK, ...rest] = line.split(":");
					if (!rawK || !rest.length) continue;
					const k = rawK.trim().toUpperCase();
					let v = rest.join(":").trim();
					if (!hasVal(v)) v = null;
					switch (k) {
						case "CATEGORY":
							p.category = v;
							break;
						case "NAME":
							p.name = v;
							break;
						case "PRICE":
							p.price = v;
							break;
						case "URL":
							p.url = v;
							break;
						case "PRODUCT_ID":
						case "SITE_PRODUCT_ID":
							p.productId = v;
							break;
						case "PARAMS":
							if (v) {
								try {
									const parsed = JSON.parse(v);
									if (Array.isArray(parsed)) p.paramsOverride = parsed;
								} catch {}
							}
							break;
						case "QTY":
						case "QUANTITY":
							p.quantity = Number(v) || 1;
							break;
						case "IMAGE": {
							if (v) {
								const md = v.match(/\[([^\]]+)\]\(([^)]+)\)/);
								p.imageUrl = md ? md[2] : v;
							}
							break;
						}
					}
				}
				products.push(p);
			}
			// de-dupe by URL or name+price
			const seen = new Set();
			const deduped = [];
			for (const p of products) {
				const key = (p.url && `u:${p.url}`) || (p.name && p.price && `np:${p.name}|${p.price}`) || JSON.stringify(p);
				if (!seen.has(key)) {
					seen.add(key);
					deduped.push(p);
				}
			}
			return {
				textContent,
				products: deduped
			};
		}
		/* =================== UI bits =================== */
		function ProductCard({
			category,
			imageUrl,
			name,
			price,
			url,
			buttonText = "Add to Cart",
			productId,
			quantity = 1,
			paramsOverride = null
		}) {
			const [busy, setBusy] = useState(false);
			const [label, setLabel] = useState(buttonText);
			const [imgLoaded, setImgLoaded] = useState(false);
			const [imgError, setImgError] = useState(false);
			const handleImgLoad = () => setImgLoaded(true);
			const handleImgError = () => {
				setImgError(true);
				console.warn("[Bottlr] Product image failed to load:", imageUrl);
			};
			const navigateTo = useCallback((targetUrl) => {
				if (!targetUrl) return;
				let targetPath = targetUrl;
				try {
					const currentDomain = window.location.hostname;
					if (targetUrl.startsWith("http")) {
						const linkUrl = new URL(targetUrl);
						if (linkUrl.hostname === currentDomain) targetPath = linkUrl.pathname + linkUrl.search + linkUrl.hash;
					}
				} catch {}
				history.pushState({}, "", targetPath);
				window.dispatchEvent(new PopStateEvent("popstate", {
					state: {}
				}));
				// AUTO-CLOSE ON MOBILE
				if (window.innerWidth <= 768 && window.BottlrWidget && typeof window.BottlrWidget.close === "function") {
					window.BottlrWidget.close();
				}
			}, []);
			const handleAddToCart = useCallback(async () => {
				if (!productId && url) {
					navigateTo(url);
					return;
				}
				if (!productId) {
					setLabel("Missing ID");
					setTimeout(() => setLabel(buttonText), 1500);
					return;
				}
				try {
					setBusy(true);
					setLabel("Adding…");
					await addToCartV2(productId, quantity, paramsOverride);
					setLabel("Added ✓");
				} catch (e) {
					console.error("[Bottlr][UI] addToCart error", e);
					setLabel("Error");
				} finally {
					setBusy(false);
					setTimeout(() => setLabel(buttonText), 1200);
				}
			}, [productId, quantity, paramsOverride, url, buttonText, navigateTo]);
			return React.createElement(
				"div", {
					className: "bottlr-product-card"
				},
				category && React.createElement("div", {
					className: "bottlr-product-category"
				}, category),
				// Always render wrapper so mobile layout reserves space
				React.createElement("div", {
						className: "bottlr-product-image-wrap",
						"data-has-src": !!imageUrl
					},
					(imageUrl && !imgError) ?
					React.createElement("img", {
						className: `bottlr-product-image ${imgLoaded ? "is-loaded" : ""}`,
						src: imageUrl,
						alt: name || "Product",
						loading: (window.innerWidth <= 768) ? "eager" : "lazy",
						decoding: "async",
						onLoad: handleImgLoad,
						onError: handleImgError
					}) :
					React.createElement("div", {
						style: {
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: 12,
							color: "#777"
						}
					}, "No image")
				),
				name && React.createElement("div", {
					className: "bottlr-product-name"
				}, name),
				React.createElement("button", {
					className: "bottlr-product-button",
					onClick: navigateTo(url), // IMPORTANT: don't call navigateTo here directly
					disabled: busy
				}, `${label}${price ? ` ${price}` : ""}`),
				// (!productId && url) && React.createElement("button", {
				// 	className: "bottlr-product-button",
				// 	style: {
				// 		marginTop: 8,
				// 		background: "#000",
				// 		color: "#fff"
				// 	},
				// 	onClick: () => navigateTo(url)
				// }, "View product")
			);
		}

		function TypingIndicator() {
			return React.createElement("div", {
					className: "bottlr-typing"
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
			);
		}
		/* =================== Chat Interface =================== */
		function ChatInterface({
			chatId,
			userId,
			userEmail
		}) {
			const [messages, setMessages] = useState([{
					id: "welcome",
					type: "bot",
					content: "Hey! Let's find your perfect wine. How do you want to start?",
					options: ["Use my purchase history", "Ask the AI-Sommelier", "Find wines for dinner pairing", "Get recommendations by style"]
				},
				{
					id: "disclaimer",
					type: "bot",
					content: "**We're actively developing this tool.** Interested in joining our beta testing round? Reach out to us at [bottlr@parlourwines.com](mailto:bottlr@parlourwines.com). v48"
				},
			]);
			const [input, setInput] = useState("");
			const [isTyping, setIsTyping] = useState(false);
			const messagesEndRef = useRef(null);
			const socketRef = useRef(null);
			const [socketState, setSocketState] = useState({
				connected: false,
				id: null
			});
			const streamingBotMsgIdRef = useRef(null);
			const scrollToBottom = useCallback(() => {
				if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({
					behavior: "smooth"
				});
			}, []);
			useEffect(() => {
				scrollToBottom();
			}, [messages, isTyping, scrollToBottom]);
			const addMessage = useCallback((type, content, options = null) => {
				const m = {
					id: String(Date.now()) + Math.random().toString(36).slice(2, 11),
					type,
					content,
					options,
					timestamp: new Date()
				};
				setMessages(prev => [...prev, m]);
				return m.id;
			}, []);
			const updateMessage = useCallback((id, updater) => {
				setMessages(prev => prev.map(m => (m.id === id ? {
					...m,
					content: (typeof updater === "function" ? updater(m.content || "") : updater)
				} : m)));
			}, []);
			useEffect(() => {
				const socket = io(SOCKET_URL, {
					path: SOCKET_PATH,
					transports: ["websocket"],
					auth: {
						token: getAccessToken() || ""
					}
				});
				socketRef.current = socket;
				socket.on("connect", () => setSocketState({
					connected: true,
					id: socket.id
				}));
				socket.on("disconnect", () => setSocketState({
					connected: false,
					id: null
				}));
				socket.on("connect_error", async (err) => {
					const msg = String(err?.message || "");
					if (msg.includes("Unauthorized") || msg.includes("jwt")) {
						try {
							const rtk = getRefreshToken();
							if (!rtk) return;
							const {
								data
							} = await axios.post(`${API_BASE}/auth/refresh`, {
								refreshToken: rtk
							});
							setTokens(data);
							socket.auth = {
								token: getAccessToken() || ""
							};
							socket.connect();
						} catch {
							clearTokens();
						}
					}
				});
				socket.on("bttlr-stream-start", () => {
					if (!streamingBotMsgIdRef.current) streamingBotMsgIdRef.current = addMessage("bot", "");
					setIsTyping(true);
				});
				socket.on("bttlr-stream-chunk", (data) => {
					const id = streamingBotMsgIdRef.current;
					if (!id) return;
					updateMessage(id, prev => (prev || "") + (data?.chunk ?? ""));
				});
				socket.on("bttlr-stream-end", (data) => {
					const id = streamingBotMsgIdRef.current;
					if (id && data?.final_response) updateMessage(id, prev => prev || data.final_response);
					setIsTyping(false);
					streamingBotMsgIdRef.current = null;
				});
				socket.on("bttlr-stream-error", (data) => {
					const id = streamingBotMsgIdRef.current;
					if (id) updateMessage(id, prev => (prev || "") + `\n\nError: ${data?.error || "Unknown error"}`);
					setIsTyping(false);
					streamingBotMsgIdRef.current = null;
				});
				return () => {
					socket.removeAllListeners();
					socket.disconnect();
				};
			}, [addMessage, updateMessage]);
			const sendQuery = useCallback((cid, uid, uemail, query) => {
				if (!socketRef.current || !socketState.connected) {
					addMessage("bot", "Not connected to realtime backend.");
					return;
				}
				socketRef.current.emit("bttlr-stream", {
					chat_id: cid,
					user_id: uid,
					user_email: uemail,
					query
				});
			}, [socketState.connected, addMessage]);
			const handleSendMessage = useCallback((msg) => {
				const t = (msg || "").trim();
				if (!t || isTyping) return;
				addMessage("user", t);
				setInput("");
				const cid = chatId || localStorage.getItem("bottlr_chat_id") || `chat_${userId||"anon"}_${Date.now()}`;
				const uid = userId || localStorage.getItem("bottlr_user_id") || `anonymous_${Date.now()}`;
				const uem = userEmail || localStorage.getItem("bottlr_email") || "anonymous@bottlr.local";
				sendQuery(cid, uid, uem, t);
			}, [isTyping, addMessage, sendQuery, chatId, userId, userEmail]);
			const handleOptionClick = useCallback((o) => handleSendMessage(o), [handleSendMessage]);
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
			return React.createElement(React.Fragment, null,
				React.createElement("div", {
						className: "bottlr-widget-msgs"
					},
					messages.map((msg) => {
						const parsed = msg.type === "bot" ? parseTextAndProducts(msg.content) : {
							textContent: msg.content,
							products: []
						};
						const isStreaming = msg.type === "bot" && msg.id === streamingBotMsgIdRef.current;
						const hasText = Boolean((parsed.textContent || "").trim());
						const contentEl = (isStreaming && !hasText && isTyping) ?
							React.createElement(TypingIndicator) :
							React.createElement("div", {
								className: "bottlr-msg-content",
								dangerouslySetInnerHTML: {
									__html: marked.parse(parsed.textContent || "")
								}
							});
						// Filter out junk products (missing name/url/image)
						const rawProducts = parsed.products || [];
						const products = rawProducts.filter(isRenderableProduct);
						return React.createElement("div", {
								key: msg.id,
								className: `bottlr-msg ${msg.type}`
							},
							msg.type === "bot" && React.createElement("div", {
									className: "bottlr-msg-header"
								},
								React.createElement("div", {
									className: "bottlr-avatar bot"
								}, "b"),
								React.createElement("span", {
									style: {
										fontSize: "14px",
										fontWeight: 600,
										color: "#1a1a1a"
									}
								}, "Bottlr")
							),
							contentEl,
							products.length > 0 && (
								products.length === 1 ?
								React.createElement(ProductCard, {
									category: products[0].category,
									imageUrl: products[0].imageUrl,
									name: products[0].name,
									price: products[0].price,
									url: products[0].url,
									productId: products[0].productId,
									quantity: products[0].quantity || 1,
									paramsOverride: products[0].paramsOverride || null
								}) :
								React.createElement("div", {
										className: "bottlr-product-carousel"
									},
									products.map((p, idx) => React.createElement(ProductCard, {
										key: `${msg.id}-p${idx}`,
										category: p.category,
										imageUrl: p.imageUrl,
										name: p.name,
										price: p.price,
										url: p.url,
										productId: p.productId,
										quantity: p.quantity || 1,
										paramsOverride: p.paramsOverride || null
									}))
								)
							),
							msg.options && React.createElement("div", {
									className: "bottlr-options"
								},
								msg.options.map((opt, i) => React.createElement("button", {
									key: i,
									className: "bottlr-option-btn",
									onClick: () => handleOptionClick(opt)
								}, React.createElement(Wine, {
									size: 18,
									color: "#fff"
								}), opt))
							)
						);
					}),
					React.createElement("div", {
						ref: messagesEndRef
					})
				),
				React.createElement("div", {
						className: "bottlr-input-area"
					},
					React.createElement("div", {
							className: "bottlr-input-container"
						},
						React.createElement("textarea", {
							className: "bottlr-input",
							placeholder: isTyping ? "Bottlr is thinking..." : "Ask me about wine...",
							value: input,
							onChange: handleInputChange,
							onKeyDown: handleInputKeyDown,
							rows: 1,
							disabled: isTyping
						}),
						isTyping ?
						React.createElement("button", {
							className: "bottlr-send-btn",
							title: "Streaming…",
							style: {
								background: "#ef4444",
								borderRadius: "14px",
								opacity: .6,
								cursor: "not-allowed"
							},
							disabled: true
						}, React.createElement(X, {
							size: 18,
							color: "#fff"
						})) :
						React.createElement("button", {
							className: "bottlr-send-btn",
							onClick: () => handleSendMessage(input),
							disabled: !input.trim() || isTyping,
							title: "Send"
						}, React.createElement(Send, {
							size: 18,
							color: "#000"
						}))
					)
				)
			);
		}
		/* =================== Widget Shell =================== */
		function ChatWidget() {
			const [isOpen, setIsOpen] = useState(false);
			const [currentURL, setURL] = useState(window.location.href);
			const [userId, setUserId] = useState(localStorage.getItem("bottlr_user_id") || null);
			const [userEmail, setEmail] = useState(localStorage.getItem("bottlr_email") || null);
			const [chatId, setChatId] = useState(localStorage.getItem("bottlr_chat_id") || null);
			const [authBusy, setAuthBusy] = useState(false);
			useEffect(() => {
				const upd = () => setURL(window.location.href);
				upd();
				window.addEventListener("popstate", upd);
				window.addEventListener("hashchange", upd);
				const p = history.pushState,
					r = history.replaceState;
				history.pushState = function(...a) {
					p.apply(this, a);
					upd();
				};
				history.replaceState = function(...a) {
					r.apply(this, a);
					upd();
				};
				return () => {
					window.removeEventListener("popstate", upd);
					window.removeEventListener("hashchange", upd);
					history.pushState = p;
					history.replaceState = r;
				};
			}, []);
			useEffect(() => {
				(async () => {
					if (userId) return;
					const atk = getAccessToken();
					if (!atk) return;
					try {
						const me = await getCurrentUser();
						localStorage.setItem("bottlr_user_id", me.id);
						localStorage.setItem("bottlr_email", me.email);
						setUserId(me.id);
						setEmail(me.email);
						const chats = await getUserChats(me.id).catch(() => []);
						if (Array.isArray(chats) && chats.length) {
							setChatId(chats[0].id);
							localStorage.setItem("bottlr_chat_id", chats[0].id);
						} else {
							const c = await createChat(me.id, `Chat ${new Date().toLocaleString()}`);
							setChatId(c.id);
							localStorage.setItem("bottlr_chat_id", c.id);
						}
					} catch {
						clearTokens();
						localStorage.removeItem("bottlr_user_id");
						localStorage.removeItem("bottlr_email");
						localStorage.removeItem("bottlr_chat_id");
					}
				})();
			}, [userId]);
			const handleAuthed = async (u) => {
				setAuthBusy(true);
				try {
					localStorage.setItem("bottlr_user_id", u.id);
					localStorage.setItem("bottlr_email", u.email);
					setUserId(u.id);
					setEmail(u.email);
					const chats = await getUserChats(u.id).catch(() => []);
					if (Array.isArray(chats) && chats.length) {
						setChatId(chats[0].id);
						localStorage.setItem("bottlr_chat_id", chats[0].id);
					} else {
						const c = await createChat(u.id, `Chat ${new Date().toLocaleString()}`);
						setChatId(c.id);
						localStorage.setItem("bottlr_chat_id", c.id);
					}
				} finally {
					setAuthBusy(false);
				}
			};
			const handleLogout = () => {
				clearTokens();
				localStorage.removeItem("bottlr_user_id");
				localStorage.removeItem("bottlr_email");
				localStorage.removeItem("bottlr_chat_id");
				setUserId(null);
				setEmail(null);
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
			// Expose for auto-close on product navigation (mobile)
			useEffect(() => {
				window.BottlrWidget = {
					open: () => {
						openWidget();
						window.dispatchEvent(new CustomEvent("bottlr:open"));
					},
					close: () => {
						closeWidget();
						window.dispatchEvent(new CustomEvent("bottlr:close"));
					},
					version: "2.9.0-multiproduct-carousel-mobile-img-gated",
					readCart: readCartV2,
					addToCart: addToCartV2
				};
			}, []);
			return React.createElement(React.Fragment, null,
				!isOpen && React.createElement("button", {
					className: "bottlr-widget-button",
					onClick: toggleOpen,
					"aria-label": "Open Bottlr wine assistant",
					"aria-expanded": String(isOpen)
				}, React.createElement(MessageCircle, {
					size: 28,
					color: "#fff"
				})),
				isOpen && React.createElement("div", {
						className: "bottlr-widget-card"
					},
					React.createElement("div", {
							className: "bottlr-widget-header"
						},
						React.createElement("h3", null, React.createElement(Wine, {
							size: 18
						}), "Bottlr"),
						React.createElement(AuthPanel, {
							userId,
							userEmail,
							onAuthed: handleAuthed,
							onLogout: handleLogout,
							busy: authBusy
						}),
						React.createElement("button", {
								className: "bottlr-close-btn",
								onClick: toggleOpen,
								"aria-label": "Close chat"
							},
							React.createElement(X, {
								size: 18
							})
						)
					),
					React.createElement("div", {
						className: "bottlr-current-url",
						title: currentURL
					}, currentURL),
					React.createElement("div", {
							style: {
								padding: "0 12px 8px",
								fontSize: "12px",
								color: "#333",
								display: "flex",
								alignItems: "center",
								gap: 6
							}
						},
						React.createElement(Sparkles, {
							size: 14
						}),
						userId ? `Signed in as ${userEmail} • Chat: ${chatId || "initializing…"}` : "You can chat now as guest, or sign in to save your chats."
					),
					React.createElement(ChatInterface, {
						chatId,
						userId,
						userEmail
					}),
					React.createElement("div", {
						style: {
							padding: "0 0 10px 0",
							textAlign: "center",
							fontSize: "13px",
							color: "#000",
							background: "rgba(187,237,200,.40)",
							zIndex: 10
						}
					}, "Powered by Bottlr")
				)
			);
		}
		/* =================== Auth Panel =================== */
		function AuthPanel({
			userId,
			userEmail,
			onAuthed,
			onLogout,
			busy
		}) {
			const [email, setEmail] = useState("");
			const [password, setPassword] = useState("");
			const [err, setErr] = useState("");
			const handleRegister = async () => {
				setErr("");
				try {
					const res = await registerUser(email.trim(), password);
					onAuthed(res.user);
				} catch (e) {
					setErr((e && e.response && e.response.data && e.response.data.error) || "Registration failed");
				}
			};
			const handleLogin = async () => {
				setErr("");
				try {
					const res = await loginUser(email.trim(), password);
					onAuthed(res.user);
				} catch (e) {
					setErr((e && e.response && e.response.data && e.response.data.error) || "Login failed");
				}
			};
			if (userId && userEmail) {
				return React.createElement("div", {
						className: "bottlr-auth"
					},
					React.createElement("div", {
							className: "bottlr-userchip",
							title: userEmail
						},
						React.createElement(UserIcon, {
							size: 16
						}),
						React.createElement("span", null, userEmail)
					),
					React.createElement("button", {
						className: "btn-ghost",
						onClick: onLogout,
						disabled: busy
					}, "Logout")
				);
			}
			return React.createElement("div", {
					className: "bottlr-auth"
				},
				React.createElement("input", {
					type: "email",
					placeholder: "email",
					value: email,
					onChange: e => setEmail(e.target.value),
					disabled: busy
				}),
				React.createElement("input", {
					type: "password",
					placeholder: "password",
					value: password,
					onChange: e => setPassword(e.target.value),
					disabled: busy
				}),
				React.createElement("button", {
					className: "btn-ghost",
					onClick: handleLogin,
					disabled: busy || !email || !password
				}, "Login"),
				React.createElement("button", {
					className: "btn-primary",
					onClick: handleRegister,
					disabled: busy || !email || !password
				}, "Register"),
				err && React.createElement("div", {
					style: {
						color: "#b91c1c",
						fontSize: "12px",
						marginTop: "6px",
						width: "100%"
					}
				}, err)
			);
		}
		/* ------- Mount ------- */
		ReactDOM.createRoot(root).render(React.createElement(ChatWidget));
		/* ------- Anchor handling + auto-close on product links ------- */
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
					const linkUrl = new URL(href);
					isSameDomain = linkUrl.hostname === currentDomain;
				}
			} catch {
				isSameDomain = true;
			}
			if (isSameDomain) {
				e.preventDefault();
				let targetPath = href;
				if (href.startsWith("http")) {
					try {
						const url = new URL(href);
						targetPath = url.pathname + url.search + url.hash;
					} catch {}
				}
				history.pushState({}, "", targetPath);
				window.dispatchEvent(new PopStateEvent("popstate", {
					state: {}
				}));
				if (window.innerWidth <= 768 && window.BottlrWidget && typeof window.BottlrWidget.close === "function") {
					window.BottlrWidget.close();
				}
			}
		});
		// Public API (desktop keeps split view)
		window.BottlrWidget = {
			open: () => {
				openWidget();
				window.dispatchEvent(new CustomEvent("bottlr:open"));
			},
			close: () => {
				closeWidget();
				window.dispatchEvent(new CustomEvent("bottlr:close"));
			},
			version: "2.9.0-multiproduct-carousel-mobile-img-gated",
			readCart: readCartV2,
			addToCart: addToCartV2
		};
		console.log("🍷 Bottlr Widget loaded.");
	})();
