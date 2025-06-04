  import React, { useState } from 'https://esm.sh/react@18.2.0?bundle';
  import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client?bundle';
  import {
    Camera,
    Send,
    X,
    MessageCircle,
    ChevronLeft,
    ChevronRight
  } from 'https://esm.sh/lucide-react@0.263.0?bundle';

  (function() {
    // 1) Grab all existing <body> children and move them into a new "site" container
    const bodyChildren = Array.from(document.body.childNodes);
    const siteContainer = document.createElement('div');
    siteContainer.id = 'bottlr-site-container';
    // Allow scrolling if content overflows
    siteContainer.style.overflow = 'auto';

    // Wrapper that holds both siteContainer (70vw) and widgetContainer (30vw)
    const wrapper = document.createElement('div');
    wrapper.id = 'bottlr-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.width = '100vw';
    wrapper.style.height = '100vh';
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';

    // Right‐hand container for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'bottlr-widget-container';
    widgetContainer.style.flex = '0 0 30vw';
    widgetContainer.style.height = '100vh';
    widgetContainer.style.boxSizing = 'border-box';

    // Left‐hand container for the existing site content
    siteContainer.style.flex = '0 0 70vw';
    siteContainer.style.height = '100vh';
    siteContainer.style.boxSizing = 'border-box';

    // Move all original body children into siteContainer
    bodyChildren.forEach(node => {
      siteContainer.appendChild(node);
    });

    // Clear <body> then append the wrapper
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.appendChild(wrapper);
    wrapper.appendChild(siteContainer);
    wrapper.appendChild(widgetContainer);

    // 2) Create and append the Bottlr root div inside widgetContainer
    const root = document.createElement('div');
    root.id = 'bottlr-chat-root';
    // Ensure the widget container uses full height and can scroll its own content
    root.style.height = '100%';
    root.style.display = 'flex';
    root.style.justifyContent = 'center';
    root.style.alignItems = 'center';
    widgetContainer.appendChild(root);

    // 3) Inject CSS (adjusted for split‐screen rather than fixed bottom‐right)
    const style = document.createElement('style');
    style.textContent = `
      /* wrapper already has flex; we adjust widget and site containers above in JS */

      /* Bottlr widget card */
      .bottlr-widget-card {
        width: 100%;           /* now spans full width of widgetContainer */
        height: 100%;          /* full height of widgetContainer (100vh) */
        display: flex;
        flex-direction: column;
        background: linear-gradient(to bottom,#ecfdf5,#ffffff);
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

      .bottlr-widget-msgs {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .bottlr-widget-button {
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
}
.bottlr-widget-button:hover {
  transform: scale(1.05);
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

    // 4) Data & React components (unchanged from before)
    const recommendations = [
      { id: 1, type: "Most Similar",     name: "Lauverjat Sancerre Perle Blanche 2022", price: 35.95, message: "This wine is rich and velvety, just like you like.", image: "https://assets.codepen.io/7773162/Group+13.png" },
      { id: 2, type: "More for the Same", name: "Domaine Vacheron Sancerre 2022",       price: 35.95, message: "A perfect match for your taste in elegant whites.", image: "https://assets.codepen.io/7773162/Group+13.png" },
      { id: 3, type: "Same for Less",     name: "Domaine Fouassier Sancerre 2022",      price: 29.95, message: "A great value with the same refined character.",   image: "https://assets.codepen.io/7773162/Group+13.png" }
    ];

    function WineRecommendation({ onWineSelect }) {
      const [activeIndex, setActiveIndex] = useState(0);

      return React.createElement('div', null,
        React.createElement('div', { style: { position: 'relative', overflow: 'hidden' } },
          React.createElement('div', {
              className: 'bottlr-recs-carousel',
              style: { transform: `translateX(-${activeIndex * 100}%)` }
            },
            recommendations.map((wine) =>
              React.createElement('div', { className: 'bottlr-recs-card', key: wine.id },
                React.createElement('div', {
                  style: {
                    background: '#0001',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }
                },
                  React.createElement('div', { style: { fontWeight: 600, marginBottom: 8 } }, wine.type),
                  React.createElement('img', {
                    src: wine.image,
                    alt: wine.name,
                    style: { height: 192, objectFit: 'contain', marginBottom: 12 }
                  }),
                  React.createElement('h3', {
                    style: { margin: 0, fontSize: 15, fontWeight: 500, marginBottom: 6 }
                  }, wine.name),
                  React.createElement('button', {
                    className: 'bottlr-btn',
                    onClick: () => onWineSelect({ name: wine.name, message: wine.message })
                  }, `Add to Cart • $${wine.price}`)
                )
              )
            )
          ),
          activeIndex > 0 &&
          React.createElement('button', {
            className: 'bottlr-recs-controls',
            style: { position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' },
            onClick: () => setActiveIndex(i => i - 1)
          }, React.createElement(ChevronLeft, { size: 20 })),
          activeIndex < recommendations.length - 1 &&
          React.createElement('button', {
            className: 'bottlr-recs-controls',
            style: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' },
            onClick: () => setActiveIndex(i => i + 1)
          }, React.createElement(ChevronRight, { size: 20 }))
        ),
        React.createElement('div', { style: { display: 'flex', justifyContent: 'center', gap: 6, margin: '12px 0' } },
          recommendations.map((_, idx) =>
            React.createElement('button', {
              key: idx,
              className: `bottlr-recs-dot ${idx === activeIndex ? 'active' : 'inactive'}`,
              onClick: () => setActiveIndex(idx)
            })
          )
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('div', {
            style: {
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00FF7F',
              fontWeight: 600
            }
          }, 'b'),
          React.createElement('p', { style: { margin: 0, fontWeight: 500, color: '#222' } },
            "Need more suggestions? Tap an image for details."
          )
        )
      );
    }

    function WineNotification({ message, onClose, onExpand }) {
      return React.createElement('div', { className: 'bottlr-notification' },
        React.createElement('div', { style: { maxWidth: '40rem', margin: '0 auto' } },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            React.createElement('button', {
              onClick: onExpand,
              style: {
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }
            },
              React.createElement('div', {
                style: {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00FF7F',
                  fontWeight: 600
                }
              }, 'b'),
              React.createElement('p', { style: { margin: 0, fontWeight: 500, color: '#111' } }, message)
            ),
            React.createElement('button', {
              onClick: onClose,
              style: {
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }
            }, React.createElement(X, { size: 20 }))
          ),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 } },
            React.createElement('div', {
              style: {
                flex: 1,
                height: 48,
                background: '#0002',
                borderRadius: 24,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                color: '#2227'
              }
            }, "Message Bottlr..."),
            React.createElement('button', {
              style: {
                width: 48,
                height: 48,
                borderRadius: 24,
                background: 'black',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            }, React.createElement(Send, { size: 20, color: '#fff' }))
          ),
          React.createElement('div', {
            style: { textAlign: 'center', fontSize: 12, color: '#4448', marginTop: 8 }
          }, "Powered by Bottlr")
        )
      );
    }

    function ChatInterface({ onWineSelect }) {
      const [messages, setMessages] = useState([
        {
          id: '1',
          type: 'bot',
          content: "Hey Tyler! Let's find your perfect wine. how do you want to start?",
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
        appendMessage('user', option);

        if (option === "Something else?" || option === "Scan a wine label") {
          setShowScanOption(true);
          appendMessage('bot', "Snap a photo of the label, and we'll do the rest.");
        } else {
          setShowRecommendations(true);
          appendMessage('bot', "Here are some tailored picks for you:");
        }
      };

      const handleScan = () => {
        setShowScanOption(false);
        setShowRecommendations(true);
        appendMessage('bot', "We couldn't find that exact bottle, but check these out:");
      };

      return React.createElement('div', { className: 'bottlr-widget-msgs' },
        messages.map((msg) =>
          React.createElement('div', { key: msg.id, className: `bottlr-msg ${msg.type}` },
            msg.type === 'bot' &&
            React.createElement('div', {
              style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }
            },
              React.createElement('div', {
                style: {
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00FF7F',
                  fontWeight: 600
                }
              }, 'b')
            ),
            React.createElement('p', { style: { margin: 0, fontWeight: 500, color: '#222' } }, msg.content),
            msg.options &&
            React.createElement('div', { className: 'bottlr-options' },
              msg.options.map((opt) =>
                React.createElement('button', {
                  key: opt,
                  style: {
                    width: '100%',
                    background: 'black',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.75rem 1.5rem',
                    margin: '4px 0',
                    cursor: 'pointer',
                    textAlign: 'left'
                  },
                  onClick: () => handleOptionClick(opt)
                }, opt)
              )
            )
          )
        ),
        showScanOption &&
        React.createElement('div', { style: { display: 'flex', justifyContent: 'center' } },
          React.createElement('button', {
            className: 'bottlr-scan-btn',
            onClick: handleScan
          },
            React.createElement(Camera, { size: 20, style: { verticalAlign: 'middle', marginRight: '6px' } }),
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

      const handleWineSelect = (wine) => {
        setSelectedWine(wine);
        setIsOpen(false);
        setShowNotification(true);
      };

      const handleNotificationClose = () => setShowNotification(false);
      const handleNotificationExpand = () => {
        setShowNotification(false);
        setIsOpen(true);
      };

      return React.createElement(React.Fragment, null,
        React.createElement('div', { style: { position: 'relative', height: '100%' } },
          isOpen
            ? React.createElement('div', { className: 'bottlr-widget-card' },
                React.createElement('div', { className: 'bottlr-widget-header' },
                  React.createElement('strong', null, 'Bottlr'),
                  React.createElement('button', {
                    onClick: () => setIsOpen(false),
                    style: { background: 'none', border: 'none', cursor: 'pointer' }
                  }, React.createElement(X, { size: 20 }))
                ),
                React.createElement(ChatInterface, { onWineSelect: handleWineSelect }),
                React.createElement('div', {
                  style: {
                    padding: '8px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#888',
                    borderTop: '1px solid #eee'
                  }
                }, "Powered by Bottlr")
              )
            : !showNotification &&
              React.createElement('button', {
                className: 'bottlr-widget-button',
                onClick: () => setIsOpen(true),
                style: {
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px'
                }
              }, React.createElement(MessageCircle, { size: 28, color: '#fff' }))
        ),
        showNotification && selectedWine &&
        React.createElement(WineNotification, {
          message: selectedWine.message,
          onClose: handleNotificationClose,
          onExpand: handleNotificationExpand
        })
      );
    }

    // 5) Mount the React widget into our newly created root
    ReactDOM.createRoot(root).render(React.createElement(ChatWidget));
  })();
