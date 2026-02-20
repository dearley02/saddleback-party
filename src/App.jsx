import { useState, useEffect, useRef } from "react";

const C = {
  terra: "#c4704b", terraLight: "#d4906f", terraDark: "#a85a38",
  sage: "#7a9a7e", sageLight: "#a3bfa6", sageDark: "#5e7d62",
  espresso: "#3b302a", walnut: "#5c4a3d", driftwood: "#8a7b6b",
  linen: "#f5f0e8", cream: "#faf7f2", sand: "#ede6d8", sandDark: "#ddd4c2",
  parchment: "#e8dece", white: "#fefdfb", blush: "#f0ddd4", mintWash: "#e8f0e8",
};

// Illustrated product cards - SVG-based so they render without external images
const ProductIllustration = ({ type, bg }) => {
  const illustrations = {
    "folding-chair": (
      <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"70%",height:"70%"}}>
        <rect x="60" y="30" width="80" height="8" rx="2" fill={C.driftwood} opacity="0.3"/>
        <rect x="65" y="38" width="70" height="65" rx="3" fill="white" stroke={C.driftwood} strokeWidth="2"/>
        <line x1="75" y1="103" x2="65" y2="155" stroke={C.driftwood} strokeWidth="3" strokeLinecap="round"/>
        <line x1="125" y1="103" x2="135" y2="155" stroke={C.driftwood} strokeWidth="3" strokeLinecap="round"/>
        <line x1="90" y1="103" x2="110" y2="155" stroke={C.driftwood} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <line x1="110" y1="103" x2="90" y2="155" stroke={C.driftwood} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <rect x="60" y="100" width="80" height="6" rx="2" fill="white" stroke={C.driftwood} strokeWidth="2"/>
      </svg>
    ),
    "chiavari-chair": (
      <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"70%",height:"70%"}}>
        <rect x="70" y="25" width="60" height="75" rx="3" fill="none" stroke={C.terra} strokeWidth="2.5"/>
        <line x1="75" y1="35" x2="75" y2="90" stroke={C.terra} strokeWidth="1.5" opacity="0.4"/>
        <line x1="85" y1="35" x2="85" y2="90" stroke={C.terra} strokeWidth="1.5" opacity="0.4"/>
        <line x1="95" y1="35" x2="95" y2="90" stroke={C.terra} strokeWidth="1.5" opacity="0.4"/>
        <line x1="105" y1="35" x2="105" y2="90" stroke={C.terra} strokeWidth="1.5" opacity="0.4"/>
        <line x1="115" y1="35" x2="115" y2="90" stroke={C.terra} strokeWidth="1.5" opacity="0.4"/>
        <line x1="125" y1="35" x2="125" y2="90" stroke={C.terra} strokeWidth="1.5" opacity="0.4"/>
        <rect x="65" y="98" width="70" height="10" rx="3" fill={C.terra} opacity="0.85"/>
        <rect x="68" y="108" width="64" height="6" rx="2" fill={C.blush} stroke={C.terra} strokeWidth="1"/>
        <line x1="72" y1="114" x2="65" y2="160" stroke={C.terra} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="128" y1="114" x2="135" y2="160" stroke={C.terra} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="85" y1="114" x2="82" y2="160" stroke={C.terra} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <line x1="115" y1="114" x2="118" y2="160" stroke={C.terra} strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
    "rect-table": (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"75%",height:"75%"}}>
        <ellipse cx="100" cy="55" rx="85" ry="18" fill={C.driftwood} opacity="0.15"/>
        <rect x="25" y="45" width="150" height="12" rx="3" fill="white" stroke={C.driftwood} strokeWidth="2"/>
        <line x1="35" y1="57" x2="35" y2="130" stroke={C.driftwood} strokeWidth="3" strokeLinecap="round"/>
        <line x1="165" y1="57" x2="165" y2="130" stroke={C.driftwood} strokeWidth="3" strokeLinecap="round"/>
        <line x1="35" y1="120" x2="165" y2="120" stroke={C.driftwood} strokeWidth="2" opacity="0.3"/>
      </svg>
    ),
    "round-table": (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"75%",height:"75%"}}>
        <ellipse cx="100" cy="55" rx="75" ry="30" fill="white" stroke={C.driftwood} strokeWidth="2"/>
        <ellipse cx="100" cy="55" rx="75" ry="30" fill={C.driftwood} opacity="0.08"/>
        <line x1="100" y1="85" x2="100" y2="135" stroke={C.driftwood} strokeWidth="3" strokeLinecap="round"/>
        <line x1="70" y1="135" x2="130" y2="135" stroke={C.driftwood} strokeWidth="3" strokeLinecap="round"/>
        <ellipse cx="100" cy="50" rx="55" ry="18" fill="none" stroke={C.driftwood} strokeWidth="1" opacity="0.2"/>
      </svg>
    ),
    "tablecloth": (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"75%",height:"75%"}}>
        <path d="M30 40 Q100 25 170 40 L180 50 Q175 70 170 110 Q140 130 100 135 Q60 130 30 110 Q25 70 20 50 Z" fill={C.sage} opacity="0.3" stroke={C.sage} strokeWidth="1.5"/>
        <path d="M45 48 Q100 38 155 48 L160 55 Q156 70 153 100 Q130 115 100 118 Q70 115 47 100 Q44 70 40 55 Z" fill="white" stroke={C.sage} strokeWidth="1" opacity="0.6"/>
        <rect x="40" y="45" width="120" height="8" rx="2" fill={C.driftwood} opacity="0.4"/>
        <circle cx="70" cy="52" r="3" fill={C.sage} opacity="0.4"/>
        <circle cx="100" cy="50" r="3" fill={C.sage} opacity="0.4"/>
        <circle cx="130" cy="52" r="3" fill={C.sage} opacity="0.4"/>
      </svg>
    ),
    "canopy-tent": (
      <svg viewBox="0 0 200 170" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"75%",height:"75%"}}>
        <path d="M20 70 L100 20 L180 70 Z" fill="white" stroke={C.driftwood} strokeWidth="2"/>
        <path d="M20 70 L100 20 L180 70 Z" fill={C.cream} opacity="0.5"/>
        <line x1="100" y1="20" x2="100" y2="70" stroke={C.driftwood} strokeWidth="1" opacity="0.3"/>
        <line x1="25" y1="70" x2="25" y2="150" stroke={C.driftwood} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="175" y1="70" x2="175" y2="150" stroke={C.driftwood} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="100" y1="70" x2="100" y2="150" stroke={C.driftwood} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
        <line x1="20" y1="70" x2="180" y2="70" stroke={C.driftwood} strokeWidth="2"/>
      </svg>
    ),
    "frame-tent": (
      <svg viewBox="0 0 200 170" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"75%",height:"75%"}}>
        <path d="M15 60 L100 15 L185 60 Z" fill="white" stroke={C.espresso} strokeWidth="2"/>
        <path d="M15 60 L100 15 L185 60 Z" fill={C.parchment} opacity="0.4"/>
        <rect x="15" y="60" width="170" height="90" fill="none" stroke={C.espresso} strokeWidth="2"/>
        <rect x="15" y="60" width="170" height="90" fill={C.cream} opacity="0.3"/>
        <line x1="57" y1="60" x2="57" y2="150" stroke={C.espresso} strokeWidth="1" opacity="0.2"/>
        <line x1="100" y1="60" x2="100" y2="150" stroke={C.espresso} strokeWidth="1" opacity="0.2"/>
        <line x1="143" y1="60" x2="143" y2="150" stroke={C.espresso} strokeWidth="1" opacity="0.2"/>
        <text x="100" y="115" textAnchor="middle" fill={C.espresso} fontSize="11" fontFamily="Outfit" opacity="0.4">20' × 20'</text>
      </svg>
    ),
    "bounce-house": (
      <svg viewBox="0 0 200 170" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"75%",height:"75%"}}>
        <rect x="30" y="50" width="140" height="100" rx="20" fill={C.terra} opacity="0.2" stroke={C.terra} strokeWidth="2"/>
        <rect x="40" y="40" width="120" height="85" rx="18" fill={C.terra} opacity="0.35"/>
        <circle cx="65" cy="35" r="18" fill={C.terra} opacity="0.5"/>
        <circle cx="135" cy="35" r="18" fill={C.terraDark} opacity="0.4"/>
        <circle cx="100" cy="28" r="15" fill={C.terraLight} opacity="0.6"/>
        <rect x="80" y="95" width="40" height="35" rx="5" fill={C.terraDark} opacity="0.3"/>
        <path d="M80 130 Q100 140 120 130" stroke={C.terra} strokeWidth="2" fill="none" opacity="0.5"/>
        <circle cx="70" cy="75" r="4" fill="white" opacity="0.5"/>
        <circle cx="130" cy="75" r="4" fill="white" opacity="0.5"/>
        <circle cx="100" cy="65" r="3" fill="white" opacity="0.4"/>
      </svg>
    ),
    "string-lights": (
      <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"80%",height:"80%"}}>
        <path d="M10 30 Q50 60 100 45 Q150 30 190 55" stroke={C.driftwood} strokeWidth="1.5" fill="none"/>
        <path d="M10 30 Q50 60 100 45 Q150 30 190 55" stroke={C.espresso} strokeWidth="1" fill="none" opacity="0.3"/>
        {[30,55,80,105,130,155,175].map((x, i) => {
          const y = 35 + Math.sin((x/190)*Math.PI)*20;
          return <g key={i}><line x1={x} y1={y} x2={x} y2={y+12} stroke={C.driftwood} strokeWidth="1"/><ellipse cx={x} cy={y+20} rx="7" ry="10" fill="#f5d77a" opacity="0.85" stroke="#e8c44a" strokeWidth="1"/><ellipse cx={x} cy={y+19} rx="4" ry="6" fill="#fff7d4" opacity="0.6"/></g>;
        })}
        <path d="M5 80 Q55 105 110 92 Q160 80 195 98" stroke={C.driftwood} strokeWidth="1.5" fill="none"/>
        {[25,50,75,100,125,150,180].map((x, i) => {
          const y = 82 + Math.sin((x/195)*Math.PI)*15;
          return <g key={i}><line x1={x} y1={y} x2={x} y2={y+10} stroke={C.driftwood} strokeWidth="1"/><ellipse cx={x} cy={y+18} rx="7" ry="10" fill="#f5d77a" opacity="0.7" stroke="#e8c44a" strokeWidth="1"/><ellipse cx={x} cy={y+17} rx="4" ry="6" fill="#fff7d4" opacity="0.5"/></g>;
        })}
      </svg>
    ),
    "patio-heater": (
      <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"60%",height:"70%"}}>
        <path d="M65 40 L100 15 L135 40 Z" fill={C.driftwood} opacity="0.6" stroke={C.driftwood} strokeWidth="2"/>
        <rect x="95" y="40" width="10" height="110" rx="3" fill={C.driftwood} opacity="0.5" stroke={C.driftwood} strokeWidth="1.5"/>
        <ellipse cx="100" cy="155" rx="35" ry="8" fill={C.driftwood} opacity="0.4" stroke={C.driftwood} strokeWidth="1.5"/>
        <path d="M88 25 Q92 10 100 8 Q108 10 112 25" stroke="#ff8c42" strokeWidth="2" fill="#ff8c42" opacity="0.35"/>
        <path d="M93 28 Q97 18 100 16 Q103 18 107 28" stroke="#ffb74d" strokeWidth="1.5" fill="#ffb74d" opacity="0.5"/>
        <circle cx="100" cy="22" r="3" fill="#fff3e0" opacity="0.7"/>
      </svg>
    ),
  };
  return (
    <div className="h-full w-full flex items-center justify-center" style={{ background: bg }}>
      {illustrations[type] || <span className="text-5xl">📦</span>}
    </div>
  );
};

const inventory = [
  { id:"folding-chair", name:"White Resin Folding Chair", category:"Seating", price:"$2.50", priceNum:2.5, unit:"per chair", description:"Classic white resin folding chairs — clean, sturdy, and versatile. Perfect for everything from casual backyard gatherings to elegant celebrations.", specs:["Weight capacity: 300 lbs","Dims: 17.5\"W × 18\"D × 31\"H","White resin with steel frame","Indoor & outdoor use"], popular:true, bg:C.sand },
  { id:"chiavari-chair", name:"Chiavari Chair", category:"Seating", price:"$10.00", priceNum:10, unit:"per chair", description:"Elegant Chiavari chairs that instantly elevate your event. Timeless bamboo-style design adds sophistication to weddings and upscale celebrations. Cushion included.", specs:["Weight capacity: 300 lbs","Dims: 15.5\"W × 17\"D × 36\"H","Gold, Silver, White, Natural","Cushion pad included"], popular:true, bg:C.blush },
  { id:"rect-table", name:"6ft Rectangular Table", category:"Tables", price:"$12.00", priceNum:12, unit:"per table", description:"The workhorse of any event — 6-foot banquet tables seat 6–8 guests comfortably. Great for dining, buffets, gift tables, and display setups.", specs:["Dims: 72\"L × 30\"W × 29\"H","Seats 6–8 guests","Plastic top, steel folding legs","Weight: 35 lbs"], popular:true, bg:C.sand },
  { id:"round-table", name:"60\" Round Table", category:"Tables", price:"$15.00", priceNum:15, unit:"per table", description:"Classic 60-inch round tables seating 8–10 guests. The go-to for seated dinners and wedding receptions. Pairs beautifully with our linens.", specs:["Diameter: 60\" (5 feet)","Seats 8–10 guests","Height: 29\"","Plastic top, steel folding legs"], popular:false, bg:C.parchment },
  { id:"tablecloth", name:"Polyester Tablecloth", category:"Linens", price:"$10.00", priceNum:10, unit:"per tablecloth", description:"Premium polyester tablecloths in a curated range of colors. Wrinkle-resistant and beautifully draped. Floor-length coverage on all our tables.", specs:["White, Ivory, Black, Navy, Burgundy, Sage","120\" round / 60×102\" rectangular","Floor-length on standard tables","Premium wrinkle-resistant polyester"], popular:false, bg:C.mintWash },
  { id:"canopy-tent", name:"10×20 Canopy Tent", category:"Tents & Shade", price:"$150.00", priceNum:150, unit:"per tent", description:"Pop-up canopy providing 200 sq ft of shade. Quick setup, crisp white canopy — perfect for backyard parties and keeping guests comfortable in the SoCal sun.", specs:["Dims: 10' × 20'","Coverage: 200 sq ft","Peak height: 10'6\"","Stakes, guy lines & weight bags included"], popular:true, bg:C.sand },
  { id:"frame-tent", name:"20×20 Frame Tent", category:"Tents & Shade", price:"$450.00", priceNum:450, unit:"per tent", description:"Professional frame tent covering 400 sq ft — no center poles means maximum usable space. Ideal for weddings and larger gatherings. Pro setup included.", specs:["Dims: 20' × 20'","Coverage: 400 sq ft","Peak height: 12'","Pro setup & teardown included","Sidewalls available (+$75)"], popular:false, bg:C.parchment },
  { id:"bounce-house", name:"Bounce House", category:"Fun & Games", price:"$250.00", priceNum:250, unit:"per day", description:"Kids absolutely love it — and parents love how easy we make it. Commercial-grade bounce house delivered, set up, and picked up. The #1 add-on for birthday parties.", specs:["Dims: 15' × 15' × 12'H","Ages 3–12 years","Capacity: 6–8 children","Blower, stakes & tarp included","Grass setup preferred"], popular:true, bg:C.blush },
  { id:"string-lights", name:"String Lights (100ft)", category:"Lighting & Comfort", price:"$35.00", priceNum:35, unit:"per strand", description:"Transform any outdoor space into something magical. 100 feet of warm Edison-style bistro lights. The single easiest way to upgrade your event atmosphere.", specs:["Length: 100 feet","Edison / bistro bulb style","Spacing: 2 feet apart","Weather-resistant","Warm white 2700K"], popular:true, bg:C.sand },
  { id:"patio-heater", name:"Patio Heater", category:"Lighting & Comfort", price:"$65.00", priceNum:65, unit:"per heater", description:"Keep guests comfortable as the SoCal evening cools down. Tall propane patio heaters with 15-foot heat radius. Propane tank included.", specs:["Height: 87\"","Heat radius: ~15 feet","48,000 BTU","Propane tank included","Auto-shutoff safety"], popular:false, bg:C.parchment },
];

const services = [
  { id:"delivery", name:"Delivery", price:"$50 – $150", note:"Based on distance. FREE on orders over $500.", emoji:"🚚" },
  { id:"setup", name:"Setup & Teardown", price:"$75 – $200", note:"Based on order size & complexity. We do the heavy lifting.", emoji:"🔧" },
];

const serviceAreas = [
  { city:"Mission Viejo", zip:"92691, 92692", pop:"90,670", tagline:"The Heart of Saddleback Valley", description:"From backyard birthday parties in tree-lined neighborhoods to elegant gatherings at the country club — we're your neighbors and your go-to party rental team.", highlights:["Oso Creek Trail events","Country Club gatherings","Community park parties","Neighborhood block parties"] },
  { city:"Rancho Santa Margarita", zip:"92688", pop:"45,595", tagline:"Our Favorite Neighbor", description:"RSM's family-friendly community is one of our busiest areas. We're literally right around the corner — which means faster delivery and lower fees.", highlights:["Central Park events","RSM Lake pavilion","Bell Tower community","Backyard celebrations"] },
  { city:"Coto de Caza", zip:"92679", pop:"15,363", tagline:"Our Home Base", description:"We live here. We know every gate code and every cul-de-sac. Coto's spacious backyards are made for outdoor entertaining — and we bring the rentals to match.", highlights:["Estate backyard events","Golf club celebrations","Private community events","Upscale dinner parties"] },
  { city:"Lake Forest", zip:"92630", pop:"85,000+", tagline:"Growing Community, Growing Celebrations", description:"Lake Forest's blend of young families and established neighborhoods means there's always something to celebrate. Quick delivery, competitive pricing.", highlights:["Pittsford Park events","Heritage Park gatherings","Corporate & business events","School celebrations"] },
  { city:"Laguna Hills", zip:"92653", pop:"32,000+", tagline:"Quick Delivery, Premium Quality", description:"Laguna Hills is right in our sweet spot — quick delivery, great pricing, and the same quality that makes every event special.", highlights:["Community center events","Nellie Gail Ranch","Church & school events","Backyard gatherings"] },
  { city:"Ladera Ranch", zip:"92694", pop:"23,609", tagline:"Where Every Weekend is a Party", description:"Young families, active community, gorgeous outdoor spaces — Ladera is a party rental dream. 84% family households means there's always a celebration.", highlights:["Cox Sports Park events","Founders Park pavilion","HOA community events","Kids' birthday parties"] },
  { city:"Trabuco Canyon", zip:"92679", pop:"~10,000", tagline:"Rustic Charm, Full Service", description:"Trabuco's spacious properties and rural character are perfect for outdoor celebrations. From rustic weddings to laid-back ranch BBQs.", highlights:["Rustic outdoor weddings","Ranch-style BBQs","O'Neill Regional Park","Canyon celebrations"] },
  { city:"San Juan Capistrano", zip:"92675", pop:"36,000+", tagline:"Historic Setting, Modern Service", description:"From downtown plazas to hillside estates, San Juan offers unique event settings. We serve all of SJC with fast, reliable delivery.", highlights:["Historic downtown events","Los Rios District","Backyard celebrations","Venue partnerships"] },
];

// --- UTILITY COMPONENTS ---
const FadeIn = ({ children, delay = 0, className = "" }) => {
  const [vis, setVis] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return <div ref={ref} className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(24px)", transition: `all 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>{children}</div>;
};

const Btn = ({ children, variant = "terra", onClick, className = "", full = false }) => {
  const s = { terra: { background: C.terra, color: C.cream, border: "none" }, outline: { background: "transparent", color: C.terra, border: `2px solid ${C.terra}` }, outlineLight: { background: "transparent", color: C.cream, border: "2px solid rgba(255,255,255,0.45)" }, dark: { background: C.espresso, color: C.cream, border: "none" }, sage: { background: C.sage, color: C.cream, border: "none" } };
  return <button onClick={onClick} className={`${full ? "w-full" : ""} px-7 py-3.5 font-semibold text-sm tracking-wider uppercase rounded-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] ${className}`} style={{ ...(s[variant] || s.terra), fontFamily: "'Outfit',sans-serif", letterSpacing: "0.1em", cursor: "pointer" }}>{children}</button>;
};

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="flex items-center justify-center rounded-full" style={{ width: 38, height: 38, background: C.terra }}>
      <span style={{ fontFamily: "'DM Serif Display',serif", color: C.cream, fontSize: "1.15rem" }}>S</span>
    </div>
    <div className="flex flex-col leading-tight">
      <span style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso, fontSize: "1.15rem" }}>Saddleback</span>
      <span style={{ fontFamily: "'Outfit',sans-serif", color: C.terra, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase" }}>Party Rentals</span>
    </div>
  </div>
);

const SubHead = ({ title, sub, light }) => (
  <div className="text-center mb-14">
    {sub && <div className="flex items-center justify-center gap-4 mb-3"><div className="w-8 h-px" style={{ background: light ? C.terraLight : C.terra }} /><span style={{ fontFamily: "'Outfit',sans-serif", color: light ? C.terraLight : C.terra, fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase" }}>{sub}</span><div className="w-8 h-px" style={{ background: light ? C.terraLight : C.terra }} /></div>}
    <h2 style={{ fontFamily: "'DM Serif Display',serif", color: light ? C.cream : C.espresso, fontSize: "clamp(1.8rem,4vw,2.5rem)", fontWeight: 400 }}>{title}</h2>
  </div>
);

// Hero scene - inline SVG illustration of a party setup
const HeroScene = () => (
  <svg viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute right-0 top-1/2 -translate-y-1/2 opacity-20 md:opacity-30" style={{width:"55%",maxWidth:550}}>
    {/* String lights */}
    <path d="M0 60 Q150 100 300 70 Q450 40 600 80" stroke={C.terraLight} strokeWidth="2" fill="none"/>
    {[50,120,190,260,330,400,470,540].map((x,i)=>{const y=60+Math.sin((x/600)*Math.PI)*25;return<g key={i}><line x1={x} y1={y} x2={x} y2={y+15} stroke={C.terraLight} strokeWidth="1"/><ellipse cx={x} cy={y+23} rx="6" ry="9" fill="#f5d77a" opacity="0.7"/></g>})}
    {/* Table */}
    <rect x="160" y="220" width="280" height="10" rx="3" fill="white" opacity="0.5"/>
    <line x1="180" y1="230" x2="180" y2="320" stroke="white" strokeWidth="3" opacity="0.4"/>
    <line x1="420" y1="230" x2="420" y2="320" stroke="white" strokeWidth="3" opacity="0.4"/>
    {/* Chairs */}
    {[140,200,260,340,400,460].map((x,i)=><rect key={i} x={x-12} y={i%2===0?250:245} width={24} height={40} rx="3" fill="white" opacity="0.25"/>)}
    {/* Tent */}
    <path d="M80 180 L300 100 L520 180 Z" fill="white" opacity="0.12" stroke="white" strokeWidth="1.5" strokeOpacity="0.2"/>
    <line x1="90" y1="180" x2="90" y2="340" stroke="white" strokeWidth="2" opacity="0.15"/>
    <line x1="510" y1="180" x2="510" y2="340" stroke="white" strokeWidth="2" opacity="0.15"/>
    {/* Ground */}
    <ellipse cx="300" cy="340" rx="250" ry="20" fill="white" opacity="0.05"/>
  </svg>
);

// --- HOME PAGE ---
const HomePage = ({ nav }) => (
  <div>
    <section className="relative overflow-hidden" style={{ minHeight: "90vh", background: `linear-gradient(160deg, ${C.espresso} 0%, #2d231e 40%, ${C.walnut} 100%)` }}>
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      <HeroScene />
      <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col justify-center" style={{ minHeight: "90vh" }}>
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-5" style={{ animation: "fadeUp 0.7s ease both" }}>
            <div className="h-px w-12" style={{ background: C.sageLight }} />
            <span style={{ fontFamily: "'Outfit',sans-serif", color: C.sageLight, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase" }}>South Orange County's Local Party Rental Co.</span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", color: C.cream, fontSize: "clamp(2.8rem,6vw,4.2rem)", lineHeight: 1.1, fontWeight: 400, animation: "fadeUp 0.7s ease 0.1s both" }}>
            Everything you need.<br /><span style={{ color: C.terraLight }}>Delivered to your door.</span>
          </h1>
          <p className="mt-6 mb-10 text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Outfit',sans-serif", fontWeight: 400, maxWidth: 520, animation: "fadeUp 0.7s ease 0.2s both" }}>
            Tables, chairs, tents, bounce houses, lighting & more — set up and ready to go for your next celebration in the Saddleback Valley.
          </p>
          <div className="flex flex-wrap gap-4" style={{ animation: "fadeUp 0.7s ease 0.3s both" }}>
            <Btn onClick={() => nav("catalog")}>Browse Rentals</Btn>
            <Btn variant="outlineLight" onClick={() => nav("quote")}>Get a Free Quote</Btn>
          </div>
        </div>
      </div>
    </section>

    <div className="py-5" style={{ background: C.terra }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-wrap justify-center gap-6 md:gap-14">
        {["⚡ Same-Day Available","🚚 Free Delivery Over $500","📍 Based in Mission Viejo","⭐ 5-Star Service"].map((t, i) => (
          <span key={i} style={{ fontFamily: "'Outfit',sans-serif", color: C.cream, fontSize: "0.8rem", fontWeight: 500, whiteSpace: "nowrap" }}>{t}</span>
        ))}
      </div>
    </div>

    <section className="py-20" style={{ background: C.cream }}>
      <div className="max-w-6xl mx-auto px-6">
        <SubHead title="Most Popular Rentals" sub="What We Offer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.filter(i => i.popular).slice(0, 6).map((item, idx) => (
            <FadeIn key={item.id} delay={idx * 0.07}>
              <div className="rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 cursor-pointer group" style={{ background: C.white, border: `1px solid ${C.sandDark}` }} onClick={() => nav("catalog")}>
                <div className="h-44 relative overflow-hidden">
                  <ProductIllustration type={item.id} bg={item.bg} />
                  <span className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sage, color: C.cream, fontFamily: "'Outfit',sans-serif", fontSize: "0.65rem" }}>POPULAR</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg mb-1" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso }}>{item.name}</h3>
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif" }}>{item.description.slice(0, 90)}...</p>
                  <div className="flex items-end justify-between">
                    <div><span className="text-xl font-bold" style={{ fontFamily: "'DM Serif Display',serif", color: C.terra }}>{item.price}</span><span className="text-xs ml-1" style={{ color: C.driftwood }}>{item.unit}</span></div>
                    <span className="text-xs font-semibold" style={{ color: C.sage }}>View →</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <div className="text-center mt-12"><Btn variant="dark" onClick={() => nav("catalog")}>View Full Catalog →</Btn></div>
      </div>
    </section>

    <section className="py-20" style={{ background: C.espresso }}>
      <div className="max-w-6xl mx-auto px-6">
        <SubHead title="How It Works" sub="Easy as 1-2-3" light />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[{n:"01",icon:"📋",t:"Pick Your Rentals",d:"Browse our catalog and tell us what you need. We'll confirm availability and send a quote — usually within hours."},{n:"02",icon:"🚚",t:"We Deliver & Set Up",d:"Our crew brings everything to your door and sets it up exactly how you want it. You focus on your guests."},{n:"03",icon:"🎉",t:"Celebrate & We Clean Up",d:"Enjoy your event stress-free. When it's over, we pick everything up and take it away. That simple."}].map((s, i) => (
            <FadeIn key={i} delay={i * 0.12}>
              <div className="text-center p-8 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-4xl block mb-4">{s.icon}</span>
                <div className="text-xs font-bold mb-2" style={{ fontFamily: "'Outfit',sans-serif", color: C.terraLight, letterSpacing: "0.15em" }}>STEP {s.n}</div>
                <h3 className="text-xl mb-3" style={{ fontFamily: "'DM Serif Display',serif", color: C.cream }}>{s.t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit',sans-serif" }}>{s.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>

    <section className="py-20" style={{ background: C.cream }}>
      <div className="max-w-6xl mx-auto px-6">
        <SubHead title="Serving the Saddleback Valley" sub="Our Neighborhood" />
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {serviceAreas.map((a, i) => <button key={i} onClick={() => nav("areas")} className="px-5 py-2.5 rounded-full text-sm transition-all duration-300 hover:scale-105" style={{ background: C.white, color: C.espresso, border: `1px solid ${C.sandDark}`, fontFamily: "'Outfit',sans-serif", fontWeight: 500, cursor: "pointer" }}>📍 {a.city}</button>)}
        </div>
        <p className="text-center text-sm" style={{ color: C.driftwood }}>Based in Mission Viejo, delivering to all South OC. <button onClick={() => nav("areas")} style={{ color: C.terra, fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>See all service areas →</button></p>
      </div>
    </section>

    <section className="py-20 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${C.espresso}, #2d231e)` }}>
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: C.terra }} />
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display',serif", color: C.cream, fontSize: "clamp(1.8rem,4vw,2.5rem)" }}>Ready to Start Planning?</h2>
        <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "'Outfit',sans-serif" }}>Get a free quote in minutes. We respond fast — usually the same day.</p>
        <Btn onClick={() => nav("quote")}>Request a Free Quote →</Btn>
      </div>
    </section>
  </div>
);

// --- CATALOG PAGE ---
const CatalogPage = ({ nav }) => {
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...new Set(inventory.map(i => i.category))];
  const filtered = filter === "All" ? inventory : inventory.filter(i => i.category === filter);
  return (
    <div>
      <section className="pt-16 pb-12 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${C.linen}, ${C.blush})` }}>
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <SubHead title="Rental Catalog" sub="Our Inventory" />
          <p className="max-w-xl mx-auto -mt-8" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif", fontSize: "0.95rem" }}>Everything you need for a perfect event. Browse below, then request a quote.</p>
        </div>
      </section>
      <section className="py-10" style={{ background: C.cream }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {cats.map(c => <button key={c} onClick={() => setFilter(c)} className="px-5 py-2 rounded-full text-sm transition-all duration-300" style={{ background: filter === c ? C.espresso : C.white, color: filter === c ? C.cream : C.espresso, border: `1px solid ${filter === c ? C.espresso : C.sandDark}`, fontFamily: "'Outfit',sans-serif", fontWeight: 500, cursor: "pointer" }}>{c}</button>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map((item, idx) => (
              <FadeIn key={item.id} delay={idx * 0.04}>
                <div className="rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl group" style={{ background: C.white, border: `1px solid ${C.sandDark}` }}>
                  <div className="h-48 relative overflow-hidden">
                    <ProductIllustration type={item.id} bg={item.bg} />
                    <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(59,48,42,0.8)", color: C.cream, fontFamily: "'Outfit',sans-serif", fontSize: "0.65rem" }}>{item.category}</span>
                    {item.popular && <span className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: C.sage, color: C.cream, fontFamily: "'Outfit',sans-serif", fontSize: "0.65rem" }}>POPULAR</span>}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl mb-2" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso }}>{item.name}</h3>
                    <p className="text-sm mb-4 leading-relaxed" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif" }}>{item.description}</p>
                    <div className="mb-4">
                      <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: C.sage, fontFamily: "'Outfit',sans-serif" }}>Details</div>
                      <ul className="space-y-1.5">{item.specs.map((s, i) => <li key={i} className="text-xs flex items-start gap-2" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif" }}><span style={{ color: C.terra }}>·</span> {s}</li>)}</ul>
                    </div>
                    <div className="flex items-end justify-between pt-4" style={{ borderTop: `1px solid ${C.sand}` }}>
                      <div><span className="text-2xl" style={{ fontFamily: "'DM Serif Display',serif", color: C.terra }}>{item.price}</span><span className="text-xs ml-1" style={{ color: C.driftwood }}>{item.unit}</span></div>
                      <Btn onClick={() => nav("quote")} className="!px-4 !py-2 !text-xs">Add to Quote</Btn>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="mt-16"><h3 className="text-center text-2xl mb-8" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso }}>Delivery & Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map(s => <div key={s.id} className="p-6 rounded-xl flex items-start gap-4" style={{ background: C.white, border: `1px solid ${C.sandDark}` }}><span className="text-3xl">{s.emoji}</span><div><h4 className="text-lg mb-1" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso }}>{s.name}</h4><p className="text-lg font-bold mb-1" style={{ color: C.terra, fontFamily: "'DM Serif Display',serif" }}>{s.price}</p><p className="text-sm" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif" }}>{s.note}</p></div></div>)}
            </div>
          </div>
          <div className="mt-10 p-6 rounded-xl text-center" style={{ background: C.mintWash, border: `1px solid ${C.sageLight}` }}>
            <p style={{ fontFamily: "'Outfit',sans-serif", color: C.sageDark, fontSize: "0.9rem" }}>🎉 <strong>Free delivery on all orders over $500.</strong> Multi-day discounts available. <button onClick={() => nav("quote")} style={{ color: C.terra, fontWeight: 700, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Request a custom quote →</button></p>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- SERVICE AREAS PAGE ---
const AreasPage = ({ nav }) => (
  <div>
    <section className="pt-16 pb-12 relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${C.linen}, ${C.mintWash})` }}>
      <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
        <SubHead title="Service Areas" sub="Our Neighborhood" />
        <p className="max-w-xl mx-auto -mt-8" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif", fontSize: "0.95rem" }}>Based in Mission Viejo. Local means faster delivery and lower fees.</p>
      </div>
    </section>
    <section className="py-10" style={{ background: C.cream }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          {serviceAreas.map((area, idx) => (
            <FadeIn key={area.city} delay={idx * 0.06}>
              <div className="rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg" style={{ background: C.white, border: `1px solid ${C.sandDark}` }}>
                <div className="px-6 py-4 flex justify-between items-center" style={{ background: `linear-gradient(135deg, ${C.espresso}, ${C.walnut})` }}>
                  <div><h3 className="text-xl" style={{ fontFamily: "'DM Serif Display',serif", color: C.cream }}>📍 {area.city}</h3><span className="text-xs" style={{ color: C.terraLight, fontFamily: "'Outfit',sans-serif" }}>{area.tagline}</span></div>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(196,112,75,0.25)", color: C.terraLight }}>{area.zip}</span>
                </div>
                <div className="p-6">
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif" }}>{area.description}</p>
                  <div className="mb-4"><div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: C.sage, fontFamily: "'Outfit',sans-serif" }}>Popular Event Spots</div>
                    <div className="flex flex-wrap gap-2">{area.highlights.map((h, i) => <span key={i} className="text-xs px-3 py-1.5 rounded-full" style={{ background: C.sand, color: C.walnut }}>{h}</span>)}</div>
                  </div>
                  <div className="flex justify-between items-center pt-4" style={{ borderTop: `1px solid ${C.sand}` }}>
                    <span className="text-xs" style={{ color: C.driftwood }}>Pop: {area.pop}</span>
                    <button onClick={() => nav("quote")} style={{ color: C.terra, fontWeight: 600, fontSize: "0.8rem", fontFamily: "'Outfit',sans-serif", background: "none", border: "none", cursor: "pointer" }}>Get a quote →</button>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <div className="mt-12 p-8 rounded-xl text-center" style={{ background: C.espresso }}>
          <h3 className="text-xl mb-2" style={{ fontFamily: "'DM Serif Display',serif", color: C.cream }}>Don't See Your City?</h3>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Outfit',sans-serif" }}>We also serve Aliso Viejo, Laguna Niguel, Dana Point, San Clemente, and more.</p>
          <Btn onClick={() => nav("quote")}>Contact Us →</Btn>
        </div>
      </div>
    </section>
  </div>
);

// --- QUOTE PAGE ---
const QuotePage = ({ nav }) => {
  const [form, setForm] = useState({ name:"", email:"", phone:"", eventDate:"", eventType:"", city:"", guests:"", message:"", items:{} });
  const [submitted, setSubmitted] = useState(false);
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const si = (id, q) => setForm(p => ({ ...p, items: { ...p.items, [id]: parseInt(q) || 0 } }));
  const total = Object.entries(form.items).reduce((s, [id, q]) => { const it = inventory.find(i => i.id === id); return s + (it ? it.priceNum * q : 0); }, 0);
  const sel = Object.entries(form.items).filter(([_, q]) => q > 0);

  if (submitted) return (
    <section className="py-24" style={{ background: C.cream }}>
      <div className="max-w-lg mx-auto px-6 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="mb-4" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso, fontSize: "2rem" }}>Quote Request Submitted!</h2>
        <p className="mb-3" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif" }}>We'll review your request and get back to you within a few hours with a detailed quote.</p>
        <p className="text-sm mb-8" style={{ color: C.driftwood }}>For urgent inquiries, call <strong style={{ color: C.espresso }}>(949) 371-9792</strong>.</p>
        <Btn variant="dark" onClick={() => { setSubmitted(false); nav("home"); }}>← Back to Home</Btn>
      </div>
    </section>
  );

  const Inp = ({ label, k, type = "text", ph }) => (
    <div>
      <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: C.walnut, fontFamily: "'Outfit',sans-serif", letterSpacing: "0.08em" }}>{label}</label>
      <input type={type} placeholder={ph} value={form[k]} onChange={e => sf(k, e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm" style={{ border: `1px solid ${C.sandDark}`, fontFamily: "'Outfit',sans-serif", background: C.cream }} />
    </div>
  );

  return (
    <div>
      <section className="pt-16 pb-12" style={{ background: `linear-gradient(160deg, ${C.linen}, ${C.blush})` }}>
        <div className="max-w-6xl mx-auto px-6 text-center">
          <SubHead title="Request a Quote" sub="Free & No Obligation" />
          <p className="max-w-xl mx-auto -mt-8" style={{ color: C.driftwood, fontFamily: "'Outfit',sans-serif", fontSize: "0.95rem" }}>Tell us about your event and select items. We respond with a detailed quote within hours.</p>
        </div>
      </section>
      <section className="py-10" style={{ background: C.cream }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="rounded-xl p-7" style={{ background: C.white, border: `1px solid ${C.sandDark}` }}>
                <h3 className="text-xl mb-6" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso }}>Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <Inp label="Full Name *" k="name" ph="Your name" />
                  <Inp label="Email *" k="email" type="email" ph="you@email.com" />
                  <Inp label="Phone *" k="phone" type="tel" ph="(949) 555-0000" />
                  <Inp label="Event Date *" k="eventDate" type="date" />
                  <div>
                    <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: C.walnut, fontFamily: "'Outfit',sans-serif" }}>Event Type</label>
                    <select value={form.eventType} onChange={e => sf("eventType", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm" style={{ border: `1px solid ${C.sandDark}`, fontFamily: "'Outfit',sans-serif", background: C.cream, appearance: "auto" }}>
                      <option value="">Select...</option>
                      {["Birthday Party","Wedding / Reception","Graduation","Corporate Event","Holiday Party","School / Church Event","Backyard BBQ","Baby Shower","Other"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: C.walnut, fontFamily: "'Outfit',sans-serif" }}>City</label>
                    <select value={form.city} onChange={e => sf("city", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm" style={{ border: `1px solid ${C.sandDark}`, fontFamily: "'Outfit',sans-serif", background: C.cream, appearance: "auto" }}>
                      <option value="">Select...</option>
                      {serviceAreas.map(a => <option key={a.city}>{a.city}</option>)}
                      <option>Other</option>
                    </select>
                  </div>
                  <Inp label="Estimated Guests" k="guests" type="number" ph="50" />
                </div>
                <h3 className="text-xl mb-4" style={{ fontFamily: "'DM Serif Display',serif", color: C.espresso }}>Select Items</h3>
                <div className="space-y-2.5 mb-8">
                  {inventory.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 rounded-lg transition-all duration-200" style={{ background: (form.items[item.id] || 0) > 0 ? C.blush : C.cream, border: `1px solid ${(form.items[item.id] || 0) > 0 ? C.terra : C.sandDark}` }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-md flex-shrink-0 overflow-hidden"><ProductIllustration type={item.id} bg={item.bg} /></div>
                        <div className="min-w-0"><span className="font-semibold text-sm block truncate" style={{ color: C.espresso, fontFamily: "'Outfit',sans-serif" }}>{item.name}</span><span className="text-xs" style={{ color: C.terra, fontFamily: "'Outfit',sans-serif", fontWeight: 600 }}>{item.price} <span style={{ color: C.driftwood, fontWeight: 400 }}>{item.unit}</span></span></div>
                      </div>
                      <input type="number" min="0" placeholder="0" value={form.items[item.id] || ""} onChange={e => si(item.id, e.target.value)} className="w-20 px-3 py-2 rounded-lg text-sm text-center flex-shrink-0" style={{ border: `1px solid ${C.sandDark}`, fontFamily: "'Outfit',sans-serif", background: C.white }} />
                    </div>
                  ))}
                  {services.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3.5 rounded-lg" style={{ background: C.mintWash, border: `1px solid ${C.sageLight}` }}>
                      <div className="flex items-center gap-3"><span className="text-xl">{s.emoji}</span><div><span className="font-semibold text-sm" style={{ color: C.espresso, fontFamily: "'Outfit',sans-serif" }}>{s.name}</span><span className="text-xs ml-2" style={{ color: C.sage }}>{s.price}</span></div></div>
                      <span className="text-xs" style={{ color: C.driftwood }}>Quoted at booking</span>
                    </div>
                  ))}
                </div>
                <div className="mb-6">
                  <label className="block text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: C.walnut, fontFamily: "'Outfit',sans-serif" }}>Notes / Special Requests</label>
                  <textarea rows="4" placeholder="Tell us about your event..." value={form.message} onChange={e => sf("message", e.target.value)} className="w-full px-4 py-3 rounded-lg text-sm" style={{ border: `1px solid ${C.sandDark}`, fontFamily: "'Outfit',sans-serif", background: C.cream, resize: "vertical" }} />
                </div>
                <Btn full onClick={() => { if(typeof gtag_report_conversion === 'function') gtag_report_conversion(); fetch("https://formspree.io/f/xojnwlyj", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) }); setSubmitted(true); }}>Submit Quote Request →</Btn>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="rounded-xl p-6 sticky top-24" style={{ background: C.espresso }}>
                <h3 className="text-lg mb-5" style={{ fontFamily: "'DM Serif Display',serif", color: C.cream }}>Your Estimate</h3>
                {sel.length > 0 ? (<>
                  <div className="space-y-2.5 mb-4">{sel.map(([id, qty]) => { const it = inventory.find(i => i.id === id); if (!it) return null; return <div key={id} className="flex justify-between text-sm" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Outfit',sans-serif" }}><span className="truncate pr-2">{it.name} ×{qty}</span><span style={{ color: C.terraLight }}>${(it.priceNum * qty).toFixed(2)}</span></div>; })}</div>
                  <div className="pt-4 mt-3 flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}><span className="text-sm font-semibold" style={{ color: C.cream }}>Subtotal</span><span style={{ color: C.terraLight, fontFamily: "'DM Serif Display',serif", fontSize: "1.4rem" }}>${total.toFixed(2)}</span></div>
                  <p className="text-xs mt-2 mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>*Excludes delivery & setup</p>
                  {total >= 500 && <div className="p-3 rounded-lg mb-4" style={{ background: "rgba(122,154,126,0.3)" }}><p className="text-xs font-bold" style={{ color: C.sageLight }}>🎉 FREE DELIVERY — order over $500!</p></div>}
                </>) : <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Select items to see your estimate.</p>}
                <div className="pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: C.terraLight }}>Questions?</div>
                  <div className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}><p>📞 (949) 371-9792</p><p>📧 saddlebackparty@gmail.com</p><p>📍 Mission Viejo, CA</p><p>🕐 Mon-Sun 8am-7pm</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const nav = (p) => { setPage(p); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const links = [{ label: "Home", p: "home" }, { label: "Rentals", p: "catalog" }, { label: "Service Areas", p: "areas" }, { label: "Get a Quote", p: "quote" }];

  return (
    <div style={{ fontFamily: "'Outfit',sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing:border-box; margin:0; padding:0 }
        html { scroll-behavior:smooth }
        input:focus,select:focus,textarea:focus { outline:none; border-color:${C.terra} !important; box-shadow:0 0 0 3px rgba(196,112,75,0.15) }
        ::selection { background:${C.terra}; color:${C.cream} }
        button { cursor:pointer }
      `}</style>

      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolled ? "rgba(250,247,242,0.92)" : "rgba(250,247,242,0.75)", backdropFilter: "blur(16px)", borderBottom: scrolled ? `1px solid ${C.sandDark}` : "1px solid transparent", boxShadow: scrolled ? "0 1px 12px rgba(59,48,42,0.06)" : "none" }}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center" style={{ height: 68 }}>
          <div className="cursor-pointer" onClick={() => nav("home")}><Logo /></div>
          <div className="hidden md:flex items-center gap-7">
            {links.map(l => <button key={l.p} onClick={() => nav(l.p)} style={{ fontFamily: "'Outfit',sans-serif", fontSize: "0.85rem", fontWeight: page === l.p ? 600 : 500, color: page === l.p ? C.terra : C.walnut, background: "none", border: "none", borderBottom: page === l.p ? `2px solid ${C.terra}` : "2px solid transparent", paddingBottom: 4, transition: "all 0.3s" }}>{l.label}</button>)}
            <Btn onClick={() => nav("quote")} className="!py-2.5 !px-5 !text-xs">Book Now</Btn>
          </div>
          <button className="md:hidden text-xl" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: C.espresso }}>{menuOpen ? "✕" : "☰"}</button>
        </div>
        {menuOpen && <div className="md:hidden px-6 pb-4 space-y-2" style={{ borderTop: `1px solid ${C.sandDark}` }}>{links.map(l => <button key={l.p} onClick={() => nav(l.p)} className="block w-full text-left py-2.5 text-sm" style={{ fontWeight: page === l.p ? 600 : 500, color: page === l.p ? C.terra : C.walnut, background: "none", border: "none" }}>{l.label}</button>)}</div>}
      </nav>
      <div style={{ height: 68 }} />

      {page === "home" && <HomePage nav={nav} />}
      {page === "catalog" && <CatalogPage nav={nav} />}
      {page === "areas" && <AreasPage nav={nav} />}
      {page === "quote" && <QuotePage nav={nav} />}

      <footer style={{ background: C.espresso }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: C.terra }}><span style={{ fontFamily: "'DM Serif Display',serif", color: C.cream, fontSize: "1.1rem" }}>S</span></div>
                <div className="flex flex-col leading-tight"><span style={{ fontFamily: "'DM Serif Display',serif", color: C.cream, fontSize: "1rem" }}>Saddleback</span><span style={{ fontFamily: "'Outfit',sans-serif", color: C.terraLight, fontSize: "0.6rem", fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase" }}>Party Rentals</span></div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>South Orange County's local party rental company. Based in Mission Viejo, serving the entire Saddleback Valley.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: C.terraLight, letterSpacing: "0.15em" }}>Rentals</h4>
              <div className="space-y-2">{["Tables & Chairs","Tents & Canopies","Linens","Bounce Houses","Lighting & Heaters"].map(i => <button key={i} onClick={() => nav("catalog")} className="block text-sm" style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none" }}>{i}</button>)}</div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: C.terraLight, letterSpacing: "0.15em" }}>Service Areas</h4>
              <div className="space-y-2">{serviceAreas.slice(0, 6).map(a => <button key={a.city} onClick={() => nav("areas")} className="block text-sm" style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none" }}>{a.city}</button>)}</div>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: C.terraLight, letterSpacing: "0.15em" }}>Contact</h4>
              <div className="space-y-2.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}><p>📞 (949) 371-9792</p><p>📧 saddlebackparty@gmail.com</p><p>📍 Mission Viejo, CA 92691</p><p>🕐 Mon-Sun 8am-7pm</p></div>
              <div className="flex gap-2.5 mt-4">{["Instagram","Facebook","Yelp"].map(s => <span key={s} className="text-xs px-3 py-1.5 rounded-full" style={{ border: "1px solid rgba(196,112,75,0.3)", color: C.terraLight }}>{s}</span>)}</div>
            </div>
          </div>
          <div className="mt-12 pt-6 flex flex-wrap justify-between items-center gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>© 2026 Saddleback Party Rentals. All rights reserved.</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Serving South Orange County with pride 🧡</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
