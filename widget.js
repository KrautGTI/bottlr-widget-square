<script type="module">
  import React, { useState } from 'https://esm.sh/react@18';
  import ReactDOM from 'https://esm.sh/react-dom@18/client';
  import {
    Camera,
    Send,
    X,
    MessageCircle,
    ChevronLeft,
    ChevronRight
  } from 'https://esm.sh/lucide-react@0.263.0';

  (function(){
    // 1) Create & append root container
    const root = document.createElement('div');
    root.id = 'bottlr-chat-root';
    document.body.appendChild(root);

    // 2) Inject CSS
    const style = document.createElement('style');
    style.textContent = `
#bottlr-chat-root { position: fixed; bottom: 16px; right: 16px; z-index: 9999; font-family: sans-serif; }
.bottlr-widget-button { width:56px; height:56px; border-radius:50%; background:linear-gradient(to br,#22c55e,#16a34a); display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.15); cursor:pointer; border:none; transition:transform .2s; }
.bottlr-widget-button:hover { transform: scale(1.05); }
.bottlr-widget-card { width:380px; height:600px; display:flex; flex-direction:column; background:linear-gradient(to bottom,#ecfdf5,#ffffff); box-shadow:0 8px 24px rgba(0,0,0,0.2); border-radius:.5rem; overflow:hidden; }
.bottlr-widget-header { display:flex; align-items:center; justify-content:space-between; padding:.75rem; border-bottom:1px solid #e5e7eb; }
.bottlr-widget-msgs { flex:1; overflow-y:auto; padding:1rem; display:flex; flex-direction:column; gap:1rem; }
.bottlr-msg { max-width:80%; padding:.75rem; border-radius:.5rem; }
.bottlr-msg.user { align-self:flex-end; background:#f3f4f6; }
.bottlr-msg.bot { align-self:flex-start; background:transparent; }
.bottlr-options { margin-top:.5rem; display:flex; flex-direction:column; gap:.5rem; }
.bottlr-scan-btn { align-self:center; background:#22c55e; color:#000; padding:.75rem 1.5rem; border:none; border-radius:9999px; cursor:pointer; }
.bottlr-recs-carousel { display:flex; transition:transform .3s ease-in-out; }
.bottlr-recs-card { min-width:100%; flex-shrink:0; padding:1rem; }
.bottlr-recs-controls button { background:rgba(0,0,0,0.05); border:none; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
.bottlr-recs-dot { width:8px; height:8px; border-radius:50%; margin:0 3px; border:none; cursor:pointer; }
.bottlr-recs-dot.active { background:#00FF7F; }
.bottlr-recs-dot.inactive { background:#ccc; }
.bottlr-notification { position:fixed; left:0; right:0; bottom:0; background:#00FF7F; padding:1rem; z-index:9999; animation:slideUp .5s ease-in-out; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.bottlr-btn { background:#00FF7F; color:black; border:none; border-radius:9999px; padding:1rem 0; font-weight:600; cursor:pointer; width:100%; }
.bottlr-btn:hover { background:#00e56b; }
`;
    document.head.appendChild(style);

    // 3) Data & Components
    const recommendations = [
      { id:1, type:"Most Similar",     name:"Lauverjat Sancerre Perle Blanche 2022", price:35.95, message:"This wine is rich and velvety, just like you like.", image:"https://assets.codepen.io/7773162/Group+13.png" },
      { id:2, type:"More for the Same", name:"Domaine Vacheron Sancerre 2022",       price:35.95, message:"A perfect match for your taste in elegant whites.", image:"https://assets.codepen.io/7773162/Group+13.png" },
      { id:3, type:"Same for Less",     name:"Domaine Fouassier Sancerre 2022",      price:29.95, message:"A great value with the same refined character.",   image:"https://assets.codepen.io/7773162/Group+13.png" }
    ];

    function WineRecommendation({ onWineSelect }){
      const [i, setI] = useState(0);
      return React.createElement('div', null,
        React.createElement('div',{style:{position:'relative',overflow:'hidden'}},
          React.createElement('div',{className:'bottlr-recs-carousel',style:{transform:`translateX(-${i*100}%)`}},
            recommendations.map(w=>
              React.createElement('div',{className:'bottlr-recs-card',key:w.id},
                React.createElement('div',{style:{background:'#0001',borderRadius:'1rem',padding:'1.5rem',textAlign:'center'}},
                  React.createElement('div',{style:{fontWeight:600,marginBottom:8}},w.type),
                  React.createElement('img',{src:w.image,alt:w.name,style:{height:192,objectFit:'contain',marginBottom:12}}),
                  React.createElement('h3',{style:{margin:0,fontSize:15,fontWeight:500,marginBottom:6}},w.name),
                  React.createElement('button',{className:'bottlr-btn',onClick:()=>onWineSelect({name:w.name,message:w.message})},`Add to Cart • $${w.price}`)
                )
              )
            )
          ),
          i>0 && React.createElement('button',{className:'bottlr-recs-controls',style:{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)'},onClick:()=>setI(_=>_ - 1)},React.createElement(ChevronLeft,{size:20})),
          i<recommendations.length-1 && React.createElement('button',{className:'bottlr-recs-controls',style:{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)'},onClick:()=>setI(_=>_ + 1)},React.createElement(ChevronRight,{size:20}))
        ),
        React.createElement('div',{style:{display:'flex',justifyContent:'center',gap:6,margin:'12px 0'}},
          recommendations.map((_,idx)=>
            React.createElement('button',{key:idx,className:`bottlr-recs-dot ${idx===i?'active':'inactive'}`,onClick:()=>setI(idx)})
          )
        ),
        React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8}},
          React.createElement('div',{style:{width:32,height:32,borderRadius:16,background:'black',display:'flex',alignItems:'center',justifyContent:'center',color:'#00FF7F',fontWeight:600}},'b'),
          React.createElement('p',{style:{margin:0,fontWeight:500,color:'#222'}}, "Need more suggestions? Tap an image for details.")
        )
      );
    }

    function WineNotification({ message, onClose, onExpand }){
      return React.createElement('div',{className:'bottlr-notification'},
        React.createElement('div',{style:{maxWidth:'40rem',margin:'0 auto'}},
          React.createElement('div',{style:{display:'flex',alignItems:'center',gap:12}},
            React.createElement('button',{onClick:onExpand,style:{flex:1,display:'flex',alignItems:'center',gap:12,background:'none',border:'none',cursor:'pointer'}},
              React.createElement('div',{style:{width:32,height:32,borderRadius:16,background:'black',display:'flex',alignItems:'center',justifyContent:'center',color:'#00FF7F',fontWeight:600}},'b'),
              React.createElement('p',{style:{margin:0,fontWeight:500,color:'#111'}},message)
            ),
            React.createElement('button',{onClick:onClose,style:{background:'none',border:'none',cursor:'pointer'}},React.createElement(X,{size:20}))
          ),
          React.createElement('div',{style:{display:'flex',alignItems:'center',gap:8,marginTop:16}},
            React.createElement('div',{style:{flex:1,height:48,background:'#0002',borderRadius:24,display:'flex',alignItems:'center',padding:'0 16px',color:'#2227'}}, "Message Bottlr..."),
            React.createElement('button',{style:{width:48,height:48,borderRadius:24,background:'black',color:'white',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}},React.createElement(Send,{size:20,color:'#fff'}))
          ),
          React.createElement('div',{style:{textAlign:'center',fontSize:12,color:'#4448',marginTop:8}}, "Powered by Bottlr")
        )
      );
    }

    function ChatInterface({ onWineSelect }){
      const [msgs, setMsgs] = useState([{ id:'1',type:'bot',content:"Hey Tyler! Let's find your perfect wine. how do you want to start?", options:["Scan a wine label","Use my purchase history","Ask the AI-Sommelier","Something else?"] }]);
      const [scan, setScan] = useState(false), [recs, setRecs] = useState(false);

      const append = (t,c)=> setMsgs(m=>[...m,{id:Date.now().toString(),type:t,content:c}]);
      const ask = o=>{
        append('user',o);
        if(o==="Scan a wine label"||o==="Something else?"){ setScan(true); append('bot',"Snap a photo of the label, and we'll do the rest."); }
        else { setRecs(true); append('bot',"Here are some tailored picks for you:"); }
      };

      return React.createElement('div',{className:'bottlr-widget-msgs'},
        msgs.map(m=>React.createElement('div',{key:m.id,className:`bottlr-msg ${m.type}`},
          m.type==='bot'&&React.createElement('div',{style:{display:'flex',alignItems:'center',marginBottom:4}},React.createElement('div',{style:{width:32,height:32,borderRadius:16,background:'black',display:'flex',alignItems:'center',justifyContent:'center',color:'#00FF7F',fontWeight:600}},'b')),
          React.createElement('p',{style:{margin:0,fontWeight:500,color:'#222'}},m.content),
          m.options&&React.createElement('div',{className:'bottlr-options'},m.options.map(o=>React.createElement('button',{key:o,style:{width:'100%',padding:'0.75rem 1.5rem',borderRadius:9999,background:'black',color:'#fff',border:'none',margin:'4px 0',cursor:'pointer'},onClick:()=>ask(o)},o)))
        )),
        scan&&React.createElement('button',{className:'bottlr-scan-btn',onClick:()=>{setScan(false);setRecs(true);append('bot',"We couldn't find that exact bottle, but check these:");}},React.createElement(Camera,{size:20,style:{verticalAlign:'middle',marginRight:6}}),"Scan Now"),
        recs&&React.createElement(WineRecommendation,{onWineSelect})
      );
    }

    function ChatWidget(){
      const [open, setOpen] = useState(false), [note, setNote]=useState(false), [sel, setSel]=useState(null);
      return React.createElement(React.Fragment,null,
        React.createElement('div',{style:{position:'relative'}},
          open
            ? React.createElement('div',{className:'bottlr-widget-card'},
                React.createElement('div',{className:'bottlr-widget-header'},React.createElement('strong',null,'Bottlr'),React.createElement('button',{onClick:()=>setOpen(false),style:{background:'none',border:'none',cursor:'pointer'}},React.createElement(X,{size:20}))),
                React.createElement(ChatInterface,{onWineSelect:w=>{setSel(w);setOpen(false);setNote(true);}}),
                React.createElement('div',{style:{padding:8,textAlign:'center',fontSize:12,color:'#888',borderTop:'1px solid #eee'}},'Powered by Bottlr')
              )
            : !note && React.createElement('button',{className:'bottlr-widget-button',onClick:()=>setOpen(true)},React.createElement(MessageCircle,{size:28,color:'#fff'}))
        ),
        note && sel && React.createElement(WineNotification,{message:sel.message,onClose:()=>setNote(false),onExpand:()=>{setNote(false);setOpen(true);}})
      );
    }

    // 4) Mount
    ReactDOM.createRoot(root).render(React.createElement(ChatWidget));
  })();
</script>
