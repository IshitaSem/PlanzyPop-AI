import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { api, normalizePlan, PlanResponse } from "./services/api";

type Page = "overview" | "events" | "planner" | "budget" | "tasks" | "vendors" | "inspiration" | "settings";
type EventItem = { id: number; name: string; type: string; date: string; location: string; guests: number; budget: number; progress: number; tone: string };
type Task = { id: number; title: string; event: string; due: string; done: boolean };
type Expense = { id: number; category: string; item: string; planned: number; actual: number };
type Vendor = { id: number; name: string; category: string; quote: number; status: "Considering" | "Booked"; phone?: string; notes?: string; isDemo?: boolean };

const photos = [
  "https://images.unsplash.com/photo-1678514823362-fd5ec94505a2?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1678514823267-437005e3ad50?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1559563040-f2fc7416b7bb?auto=format&fit=crop&w=900&q=85",
  "https://images.unsplash.com/photo-1675437992142-a1865df78b83?auto=format&fit=crop&w=900&q=85",
];

const seedEvents: EventItem[] = [
  { id: 1, name: "Anaya's 21st", type: "Birthday", date: "2026-04-18", location: "The Courtyard, Jaipur", guests: 60, budget: 120000, progress: 72, tone: "peach" },
  { id: 2, name: "Riya & Kabir", type: "Engagement", date: "2026-05-09", location: "Lotus Gardens, Delhi", guests: 140, budget: 450000, progress: 48, tone: "pink" },
  { id: 3, name: "AURA '26", type: "College fest", date: "2026-06-12", location: "North Campus", guests: 850, budget: 800000, progress: 31, tone: "blue" },
];

const seedTasks: Task[] = [
  { id: 1, title: "Confirm cake tasting", event: "Anaya's 21st", due: "Today, 5:00 PM", done: false },
  { id: 2, title: "Review photographer quote", event: "Riya & Kabir", due: "Tomorrow", done: false },
  { id: 3, title: "Send volunteer brief", event: "AURA '26", due: "Fri, 11:00 AM", done: true },
  { id: 4, title: "Finalize floral palette", event: "Riya & Kabir", due: "18 Mar", done: false },
];

const seedExpenses: Expense[] = [
  { id: 1, category: "Venue", item: "Courtyard booking", planned: 50000, actual: 48000 },
  { id: 2, category: "Food", item: "Catering advance", planned: 35000, actual: 38000 },
  { id: 3, category: "Decoration", item: "Florals & lighting", planned: 18000, actual: 12500 },
  { id: 4, category: "Photography", item: "Photo + film", planned: 15000, actual: 15000 },
];

const seedVendors: Vendor[] = [
  { id: 1, name: "Demo Floral Studio", category: "Decoration", quote: 28500, status: "Booked", phone: "+91 98XX XXX 210", notes: "Peach & blush florals with warm pendant lighting.", isDemo: true },
  { id: 2, name: "Sample Frame Co.", category: "Photography", quote: 42000, status: "Considering", phone: "+91 97XX XXX 614", notes: "Pre-event golden hour shoot + candid coverage.", isDemo: true },
  { id: 3, name: "Demo Table Kitchen", category: "Catering", quote: 96000, status: "Considering", phone: "+91 99XX XXX 032", notes: "Live chaat station + plated regional dinner.", isDemo: true },
];

const nav: { id: Page; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "events", label: "My events", icon: "calendar" },
  { id: "planner", label: "AI event planner", icon: "spark" },
  { id: "budget", label: "Budget tracker", icon: "wallet" },
  { id: "tasks", label: "Checklist & timeline", icon: "check" },
  { id: "vendors", label: "Vendors", icon: "users" },
  { id: "inspiration", label: "Inspiration", icon: "image" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const iconPaths: Record<string, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  spark: <><path d="m12 3 1.4 4.1L17.5 9l-4.1 1.4L12 15l-1.4-4.6L6.5 9l4.1-1.9L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M16 12h6v4h-6a2 2 0 0 1 0-4Z"/></>,
  check: <><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m7 12 3 3 7-7"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  trash: <><path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>,
};

function Icon({ name, size = 19, fill = "none" }: { name: string; size?: number; fill?: string }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) || "") || initial; } catch { return initial; }
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const day = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));

function Button({ children, onClick, kind = "dark", type = "button", disabled = false }: { children: ReactNode; onClick?: () => void; kind?: "dark" | "light" | "accent"; type?: "button" | "submit"; disabled?: boolean }) {
  return <button type={type} className={`btn ${kind}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Progress({ value, color = "var(--ink)" }: { value: number; color?: string }) {
  return <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${value}%`, background: color }}/></div>;
}

function PageTitle({ eyebrow, title, text, action }: { eyebrow: string; title: ReactNode; text: string; action?: ReactNode }) {
  return <header className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</header>;
}

function Overview({ events, tasks, setTasks, go }: { events: EventItem[]; tasks: Task[]; setTasks: (v: Task[]) => void; go: (p: Page) => void }) {
  const completed = tasks.filter(t => t.done).length;
  const planned = events.reduce((a, e) => a + e.budget, 0);
  return <>
    <PageTitle eyebrow="MONDAY, 16 MARCH" title={<>Good morning, <em>Meera.</em></>} text="Three celebrations are taking shape. Here's what needs your attention." action={<div className="title-actions"><Button kind="light" onClick={() => go("planner")}><Icon name="spark"/> Ask PlanzyPop</Button><Button onClick={() => go("planner")}><Icon name="plus"/> Plan an event</Button></div>}/>
    <section className="hero-grid">
      <article className="hero-card">
        <div className="hero-copy"><span className="pill dark">NEXT UP · 33 DAYS</span><h2>Anaya's big day,<br/><em>almost ready.</em></h2><p>A playful garden dinner with peach florals, warm lights, and her closest people.</p><Button kind="light" onClick={() => go("events")}>Open event <Icon name="arrow"/></Button></div>
        <div className="hero-art"><div className="sun"/><div className="flower f1"/><div className="flower f2"/><div className="flower f3"/><span>21</span></div>
      </article>
      <article className="ai-card"><div className="orb"><Icon name="spark" size={26}/></div><span className="eyebrow">PLANZYPOP NOTE</span><h3>A little idea for Anaya</h3><p>A sunset mocktail bar fits the garden theme and can stay under ₹8,000.</p><button className="text-link" onClick={() => go("planner")}>Build this into the plan <Icon name="arrow" size={16}/></button></article>
    </section>
    <section className="metrics">
      <article><span>Total planned</span><strong>{money(planned)}</strong><small>Across 3 events</small></article>
      <article className="yellow"><span>Actual expenses</span><strong>{money(113500)}</strong><small>18% of planned</small></article>
      <article className="green"><span>Tasks completed</span><strong>{completed}<i> / {tasks.length}</i></strong><small>Keep the momentum</small></article>
      <article className="blue"><span>Avg. progress</span><strong>50%</strong><Progress value={50}/></article>
    </section>
    <div className="section-head"><div><span className="eyebrow">IN MOTION</span><h2>Upcoming events</h2></div><button className="text-link" onClick={() => go("events")}>View all <Icon name="arrow" size={16}/></button></div>
    <section className="event-row">{events.map((e, i) => <button className={`event-card ${e.tone}`} key={e.id} onClick={() => go("events")}><div className="date-tile"><b>{new Date(e.date).toLocaleDateString("en", { day: "2-digit" })}</b><span>{new Date(e.date).toLocaleDateString("en", { month: "short" })}</span></div><div><small>{e.type}</small><h3>{e.name}</h3><p>{e.location}</p></div><div className="event-progress"><b>{e.progress}%</b><Progress value={e.progress}/><span>{day(e.date)} days to go</span></div><span className="round-arrow">↗</span></button>)}</section>
    <section className="lower-grid">
      <article className="panel"><div className="section-head compact"><div><span className="eyebrow">THIS WEEK</span><h2>Next on your list</h2></div><button className="text-link" onClick={() => go("tasks")}>All tasks</button></div>
        <div className="task-list">{tasks.slice(0, 4).map(t => <label className={`task ${t.done ? "done" : ""}`} key={t.id}><input type="checkbox" checked={t.done} onChange={() => setTasks(tasks.map(x => x.id === t.id ? { ...x, done: !x.done } : x))}/><span className="custom-check"/><span><b>{t.title}</b><small>{t.event}</small></span><time>{t.due}</time></label>)}</div>
      </article>
      <article className="panel spending"><div className="section-head compact"><div><span className="eyebrow">MONEY MATTERS</span><h2>Budget pulse</h2></div><span className="pill">Healthy</span></div>
        <div className="donut" style={{"--p":"65%"} as React.CSSProperties}><div><strong>35%</strong><span>used</span></div></div>
        <div className="legend"><p><i className="dot ink"/>Committed <b>₹1.13L</b></p><p><i className="dot pale"/>Remaining <b>₹2.07L</b></p></div>
        <Button kind="light" onClick={() => go("budget")}>View budget</Button>
      </article>
    </section>
  </>;
}

function EventAssistant({ event }: { event: EventItem }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<{ text: string; isDemo: boolean } | null>(null);

  const ask = async (q?: string) => {
    const text = (q || query).trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await api.chat(text, event.id, { budget: event.budget, guests: event.guests, location: event.location });
      setReply({ text: res.response, isDemo: res.is_demo });
    } catch {
      setReply({
        text: `For ${event.name}, focus on venue readiness and vendor confirmation to keep spending within ${money(event.budget)}.`,
        isDemo: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-inline" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Icon name="spark" />
        <div>
          <b>PlanzyPop Event Assistant</b>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>Ask for quick planning ideas or budget tips for {event.name}:</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. Ideas to save on flowers?"
          onKeyDown={e => e.key === "Enter" && ask()}
          style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--line)", background: "white", fontSize: "12px" }}
        />
        <Button kind="dark" onClick={() => ask()} disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </Button>
      </div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {["How to save on florals?", "Menu recommendations", "Timeline sanity check"].map(suggestion => (
          <button
            key={suggestion}
            type="button"
            onClick={() => { setQuery(suggestion); ask(suggestion); }}
            style={{ fontSize: "10px", padding: "3px 8px", background: "white", border: "1px solid #d9d5cc", borderRadius: "6px", cursor: "pointer", color: "var(--ink)" }}
          >
            {suggestion}
          </button>
        ))}
      </div>
      {reply && (
        <div style={{ marginTop: "4px", padding: "8px 10px", background: "white", borderRadius: "8px", border: "1px solid var(--line)", fontSize: "11px", lineHeight: "1.5" }}>
          <span className={`pill ${reply.isDemo ? "dark" : "success"}`} style={{ fontSize: "9px", padding: "2px 6px", marginBottom: "4px", display: "inline-block" }}>
            {reply.isDemo ? "DEMO ASSISTANT NOTE" : "LIVE GEMINI RESPONSE"}
          </span>
          <p style={{ margin: 0 }}>{reply.text}</p>
        </div>
      )}
    </div>
  );
}

function EventsPage({ events, setEvents }: { events: EventItem[]; setEvents: (e: EventItem[]) => void }) {
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const add = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault(); const f = new FormData(ev.currentTarget);
    setEvents([...events, { id: Date.now(), name: String(f.get("name")), type: String(f.get("type")), date: String(f.get("date")), location: String(f.get("location")), guests: Number(f.get("guests")), budget: Number(f.get("budget")), progress: 8, tone: "pink" }]);
    setShow(false);
  };
  return <>
    <PageTitle eyebrow="YOUR CELEBRATIONS" title={<>Plans worth <em>looking forward to.</em></>} text="Every detail, decision, and happy moment in one place." action={<Button onClick={() => setShow(true)}><Icon name="plus"/> New event</Button>}/>
    <section className="events-grid">{events.map((e, i) => <article className={`big-event ${e.tone}`} key={e.id}>
      <div className="event-number">0{i + 1}</div><span className="pill">{e.type}</span><h2>{e.name}</h2><p>{e.location}</p><div className="countdown"><strong>{day(e.date)}</strong><span>days<br/>to celebrate</span></div><Progress value={e.progress}/><div className="card-foot"><span>{e.progress}% planned</span><button onClick={() => setSelected(e)}>Open workspace <Icon name="arrow" size={16}/></button></div>
    </article>)}</section>
    {show && <Modal title="Create a new event" close={() => setShow(false)}><form onSubmit={add} className="form-grid"><Field label="Event name" name="name" required/><Field label="Event type" name="type" placeholder="Birthday, wedding..." required/><Field label="Date" name="date" type="date" required/><Field label="Location" name="location" required/><Field label="Guests" name="guests" type="number" required/><Field label="Budget (INR)" name="budget" type="number" required/><div className="form-actions"><Button kind="light" onClick={() => setShow(false)}>Cancel</Button><Button type="submit">Create event</Button></div></form></Modal>}
    {selected && <Modal title={selected.name} close={() => setSelected(null)}><div className="workspace"><span className="pill dark">{day(selected.date)} days to go</span><h2>{selected.progress}% of your plan is ready</h2><Progress value={selected.progress}/><div className="workspace-stats"><div><span>Budget</span><b>{money(selected.budget)}</b></div><div><span>Guests</span><b>{selected.guests}</b></div><div><span>Location</span><b>{selected.location}</b></div></div><EventAssistant event={selected}/></div></Modal>}
  </>;
}

function Field({ label, name, type = "text", placeholder, required = false, defaultValue, value, onChange }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string | number; value?: string | number; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <label className="field"><span>{label}</span><input name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} value={value} onChange={onChange}/></label>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={close}><section className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button aria-label="Close dialog" onClick={close}>×</button></div>{children}</section></div>;
}

const defaultCuratedPlan: PlanResponse = {
  concept_title: "Sunset in Bloom",
  concept_description: "A relaxed garden celebration where soft peach florals meet candlelight and joyful colour.",
  vibe: "Warm & intimate · Garden Bloom",
  color_palette: ["#F4A261", "#E76F51", "#2A9D8F", "#E9C46A"],
  budget_allocation: [
    { category: "Food & drinks", percentage: 38, amount_inr: 57000 },
    { category: "Venue", percentage: 24, amount_inr: 36000 },
    { category: "Décor", percentage: 18, amount_inr: 27000 },
    { category: "Photo", percentage: 12, amount_inr: 18000 },
    { category: "Buffer", percentage: 8, amount_inr: 12000 },
  ],
  preparation_timeline: [
    { timeframe: "8 weeks", action: "Book venue & key vendors", details: "Reserve location" },
    { timeframe: "4 weeks", action: "Confirm menu and design", details: "Tastings & palette" },
    { timeframe: "1 week", action: "Final calls and guest count", details: "RSVP check" },
    { timeframe: "Event day", action: "Set up, check, celebrate", details: "Coordination" },
  ],
  checklist: [
    { title: "Send invitations", category: "General", priority: "High" },
    { title: "Confirm caterer advance", category: "Food", priority: "High" },
  ],
  menu_ideas: ["Chaat bar · Seasonal coolers", "Family-style mains · Mini mithai", "One statement birthday cake"],
  vendor_categories: ["Venue", "Catering", "Décor", "Photo"],
  cost_saving_suggestions: ["Reuse ceremony florals at the cake and welcome areas to save an estimated ₹6,000–₹10,000."],
  is_demo: true,
  source: "curated_demo",
};

function Planner({
  onSavePlan,
  go,
}: {
  onSavePlan?: (
    plan: PlanResponse,
    details: { name: string; type: string; date: string; location: string; guests: number; budget: number }
  ) => void;
  go?: (p: Page) => void;
}) {
  const [step, setStep] = useState(3);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [plan, setPlan] = useState<PlanResponse>(defaultCuratedPlan);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);

  // Form inputs
  const [eventName, setEventName] = useState("Tara's garden birthday");
  const [eventType, setEventType] = useState("Birthday");
  const [date, setDate] = useState("2026-05-18");
  const [location, setLocation] = useState("Jaipur, Rajasthan");
  const [guests, setGuests] = useState(80);
  const [budget, setBudget] = useState(150000);
  const [style, setStyle] = useState("Warm & intimate");
  const [setting, setSetting] = useState("Outdoor");
  const [dietary, setDietary] = useState("Vegetarian");
  const [priority, setPriority] = useState("Guest experience");

  useEffect(() => {
    api.health()
      .then(res => setBackendConnected(res.status === "ok"))
      .catch(() => setBackendConnected(false));
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await api.generatePlan({
        eventName: eventName.trim() || "Celebration",
        eventType,
        date,
        location: location.trim() || "Local venue",
        guests: Number(guests) || 50,
        budgetInr: Number(budget) || 100000,
        celebrationStyle: style,
        setting,
        dietaryPreferences: dietary,
        mainPriority: priority,
      });
      setPlan(normalizePlan(res));
      setGenerated(true);
      setStep(3);
    } catch {
      // Graceful fallback to curated demo plan
      const totalBudget = Number(budget) || 150000;
      setPlan(
        normalizePlan({
          ...defaultCuratedPlan,
          concept_title: `${eventName || "Celebration"} — Sunset in Bloom`,
          concept_description: `A curated celebration tailored for ${eventName || "your celebration"} with ${guests} guests in ${location}.`,
          budget_allocation: defaultCuratedPlan.budget_allocation.map(item => ({
            ...item,
            amount_inr: Math.round(totalBudget * (item.percentage / 100)),
          })),
          is_demo: true,
          source: "curated_demo",
          error_message: "Backend service unreachable or offline. Presenting curated demo plan.",
        })
      );
      setGenerated(true);
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCurrentPlan = () => {
    if (onSavePlan && plan) {
      onSavePlan(plan, {
        name: eventName,
        type: eventType,
        date,
        location,
        guests: Number(guests) || 80,
        budget: Number(budget) || 150000,
      });
    }
  };

  return <>
    <PageTitle eyebrow="SIGNATURE TOOL · AI PLANNER" title={<>Imagine it. <em>Plan it beautifully.</em></>} text="Tell PlanzyPop what you're celebrating and receive a thoughtful starting point in moments."/>
    <div className="wizard-shell">
      <aside className="steps">
        {["The occasion", "Your preferences", "Your plan"].map((s, i) => (
          <div
            className={(step === i + 1 ? "active " : "") + (step > i + 1 ? "complete" : "")}
            key={s}
            style={{ cursor: "pointer" }}
            onClick={() => setStep(i + 1)}
          >
            <span>{step > i + 1 ? "✓" : `0${i + 1}`}</span>
            <div><b>{s}</b><small>{i === 0 ? "Details & guests" : i === 1 ? "Budget & mood" : "A tailored roadmap"}</small></div>
          </div>
        ))}
        <div className="demo-note">
          <Icon name="spark"/>
          <p>
            <b>{backendConnected ? "Backend Connected" : "PlanzyPop Demo Mode"}</b><br/>
            {backendConnected ? "Ready for live Gemini AI responses." : "Curated demo results active."}
          </p>
        </div>
      </aside>
      <section className="wizard">
        {step === 1 && <>
          <span className="eyebrow">STEP ONE</span>
          <h2>First, what's the occasion?</h2>
          <p className="intro">The simple details that make every celebration unique.</p>
          <div className="form-grid">
            <Field label="Event name" name="event" placeholder="e.g. Tara's garden birthday" value={eventName} onChange={e => setEventName(e.target.value)} required/>
            <label className="field"><span>Event type</span><select value={eventType} onChange={e => setEventType(e.target.value)}><option>Birthday</option><option>Wedding</option><option>Engagement</option><option>College event</option></select></label>
            <Field label="Date" name="date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
            <Field label="City or venue" name="location" placeholder="Jaipur, Rajasthan" value={location} onChange={e => setLocation(e.target.value)}/>
            <Field label="Expected guests" name="guests" type="number" placeholder="80" value={guests} onChange={e => setGuests(Number(e.target.value))}/>
          </div>
          <div className="form-actions"><Button onClick={() => setStep(2)}>Continue <Icon name="arrow"/></Button></div>
        </>}
        {step === 2 && <>
          <span className="eyebrow">STEP TWO</span>
          <h2>Shape the feeling.</h2>
          <p className="intro">A few preferences help us build a plan that feels like yours.</p>
          <div className="form-grid">
            <Field label="Budget in INR" name="budget" type="number" placeholder="150000" value={budget} onChange={e => setBudget(Number(e.target.value))}/>
            <label className="field"><span>Budget flexibility</span><select><option>Keep it strict</option><option>Up to 10% flexible</option><option>Show me options</option></select></label>
            <label className="field"><span>Celebration style</span><select value={style} onChange={e => setStyle(e.target.value)}><option>Warm & intimate</option><option>Bold & energetic</option><option>Classic & elegant</option><option>Playful & colourful</option></select></label>
            <label className="field"><span>Setting</span><select value={setting} onChange={e => setSetting(e.target.value)}><option>Outdoor</option><option>Indoor</option><option>Open to either</option></select></label>
            <label className="field"><span>Dietary preferences</span><select value={dietary} onChange={e => setDietary(e.target.value)}><option>Vegetarian</option><option>Mixed menu</option><option>Vegan</option><option>Jain options</option></select></label>
            <label className="field"><span>Main priority</span><select value={priority} onChange={e => setPriority(e.target.value)}><option>Guest experience</option><option>Décor & atmosphere</option><option>Food</option><option>Staying on budget</option></select></label>
          </div>
          <div className="form-actions"><Button kind="light" onClick={() => setStep(1)}>Back</Button><Button onClick={generate} disabled={loading}>{loading ? <><span className="spinner"/> PlanzyPop is crafting your plan...</> : <><Icon name="spark"/> Generate celebration plan</>}</Button></div>
        </>}
        {step === 3 && generated && (
          <PlanResult
            plan={plan}
            regenerate={generate}
            onSave={handleSaveCurrentPlan}
            onEditInputs={() => setStep(1)}
            go={go}
            loading={loading}
          />
        )}
      </section>
    </div>
  </>;
}

function PlanResult({
  plan: rawPlan,
  regenerate,
  onSave,
  onEditInputs,
  go,
  loading = false,
}: {
  plan: PlanResponse;
  regenerate: () => void;
  onSave: () => void;
  onEditInputs: () => void;
  go?: (p: Page) => void;
  loading?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const plan = useMemo(() => normalizePlan(rawPlan), [rawPlan]);
  const isLive = !plan.is_demo && plan.source === "gemini";

  const handleSave = () => {
    onSave();
    setSaved(true);
  };

  const exportPlan = () => {
    const exportData = {
      product: "PlanzyPop AI",
      tagline: "Your vibe. Your plan. Your party.",
      exported_at: new Date().toISOString(),
      source: plan.source,
      is_demo: plan.is_demo,
      plan: {
        concept_title: plan.concept_title,
        concept_description: plan.concept_description,
        vibe: plan.vibe,
        color_palette: plan.color_palette ?? [],
        budget_allocation: plan.budget_allocation ?? [],
        preparation_timeline: plan.preparation_timeline ?? [],
        checklist: plan.checklist ?? [],
        menu_ideas: plan.menu_ideas ?? [],
        vendor_categories: plan.vendor_categories ?? [],
        cost_saving_suggestions: plan.cost_saving_suggestions ?? [],
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safeTitle = (plan.concept_title || "planzypop-plan").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${safeTitle}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return <>
    <div className="result-head">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          <span className={`pill ${isLive ? "accent" : "success"}`}>
            {isLive ? "LIVE GEMINI PLAN READY" : "DEMO PLAN READY"}
          </span>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            {isLive ? "Generated via Google Gemini GenAI SDK" : "PlanzyPop Curated Demo Engine"}
          </span>
        </div>
        <h2>{plan.concept_title}</h2>
        <p>{plan.concept_description}</p>
      </div>
      <div className="palette">
        {(plan.color_palette ?? []).map((c, i) => (
          <i key={i} style={{ background: c }} />
        ))}
      </div>
    </div>

    {plan.error_message && (
      <div style={{ margin: "16px 0", padding: "10px 14px", borderRadius: "12px", background: "#fff2e8", border: "1px solid #f0957e", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px", color: "var(--ink)" }}>
        <Icon name="spark"/>
        <span><b>Fallback Notice:</b> {plan.error_message}</span>
      </div>
    )}

    <div className="result-grid">
      <article className="result-card wide"><span className="eyebrow">VIBE & ATMOSPHERE</span><h3>{plan.vibe}</h3><p>{plan.concept_description}</p></article>
      <article className="result-card">
        <span className="eyebrow">DETERMINISTIC BUDGET SPLIT</span>
        {(plan.budget_allocation ?? []).map(x => (
          <p className="split" key={x.category}>
            <span>{x.category}</span>
            <b>{x.percentage}% ({money(x.amount_inr)})</b>
          </p>
        ))}
      </article>
      <article className="result-card">
        <span className="eyebrow">MENU NOTES</span>
        <h3>Curated selections</h3>
        <p>{(plan.menu_ideas ?? []).join(" · ")}</p>
      </article>
      <article className="result-card wide timeline">
        <span className="eyebrow">PREPARATION TIMELINE</span>
        {(plan.preparation_timeline ?? []).map(x => (
          <div key={x.timeframe}>
            <b>{x.timeframe}</b>
            <span>{x.action}{x.details ? ` (${x.details})` : ""}</span>
          </div>
        ))}
      </article>
      <article className="result-card saving">
        <Icon name="spark"/>
        <div>
          <span className="eyebrow">COST-SAVING SUGGESTION</span>
          <p>{(plan.cost_saving_suggestions ?? [])[0] || "Reuse focal décor pieces across spaces."}</p>
        </div>
      </article>
    </div>
    <div className="form-actions" style={{ marginTop: "24px" }}>
      <Button kind="light" onClick={onEditInputs}>Adjust inputs</Button>
      <Button kind="light" onClick={regenerate} disabled={loading}>{loading ? <><span className="spinner"/> Regenerating...</> : "Regenerate"}</Button>
      <Button onClick={handleSave} disabled={saved}>{saved ? "✓ Saved to My Events" : "Save plan"}</Button>
      <Button kind="accent" onClick={exportPlan}>Export</Button>
      {saved && go && <Button kind="light" onClick={() => go("events")}>View in My Events →</Button>}
    </div>
  </>;
}

function Budget({ expenses, setExpenses }: { expenses: Expense[]; setExpenses: (e: Expense[]) => void }) {
  const [show, setShow] = useState(false); const planned = expenses.reduce((a, e) => a + e.planned, 0); const actual = expenses.reduce((a, e) => a + e.actual, 0);
  const add = (ev: FormEvent<HTMLFormElement>) => { ev.preventDefault(); const f = new FormData(ev.currentTarget); setExpenses([...expenses, { id: Date.now(), category: String(f.get("category")), item: String(f.get("item")), planned: Number(f.get("planned")), actual: Number(f.get("actual")) }]); setShow(false); };
  return <><PageTitle eyebrow="CLEAR NUMBERS, CALMER PLANNING" title={<>Your budget, <em>at a glance.</em></>} text="Deterministic totals update the moment you add or remove an expense." action={<Button onClick={() => setShow(true)}><Icon name="plus"/> Add expense</Button>}/>
    <section className="metrics budget-metrics"><article><span>Planned</span><strong>{money(planned)}</strong><small>Current categories</small></article><article className={actual > planned ? "warning" : "yellow"}><span>Actual</span><strong>{money(actual)}</strong><small>{actual > planned ? "Over planned amount" : `${Math.round(actual / planned * 100)}% utilized`}</small></article><article className="green"><span>Remaining</span><strong>{money(planned - actual)}</strong><small>Updates instantly</small></article></section>
    {actual > planned && <div className="alert" role="alert">Your actual expenses are above the planned total. Review high-spend categories before confirming new vendors.</div>}
    <section className="panel"><div className="section-head compact"><div><span className="eyebrow">CATEGORY VIEW</span><h2>Planned vs. actual</h2></div></div><div className="expense-table"><div className="tr table-head"><span>Expense</span><span>Category</span><span>Planned</span><span>Actual</span><span/></div>{expenses.map(e => <div className="tr" key={e.id}><b>{e.item}</b><span><i className="dot ink"/>{e.category}</span><span>{money(e.planned)}</span><strong className={e.actual > e.planned ? "over" : ""}>{money(e.actual)}</strong><button aria-label={`Delete ${e.item}`} onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))}><Icon name="trash" size={17}/></button></div>)}</div></section>
    {show && <Modal title="Add an expense" close={() => setShow(false)}><form className="form-grid" onSubmit={add}><Field label="Item" name="item" required/><Field label="Category" name="category" required/><Field label="Planned amount" name="planned" type="number" required/><Field label="Actual amount" name="actual" type="number" required/><div className="form-actions"><Button type="submit">Add expense</Button></div></form></Modal>}
  </>;
}

function TasksPage({ tasks, setTasks }: { tasks: Task[]; setTasks: (t: Task[]) => void }) {
  const [filter, setFilter] = useState("All"); const [text, setText] = useState("");
  const visible = tasks.filter(t => filter === "All" || (filter === "Done" ? t.done : !t.done));
  const add = () => { if (text.trim()) { setTasks([...tasks, { id: Date.now(), title: text, event: "General planning", due: "No date", done: false }]); setText(""); } };
  return <><PageTitle eyebrow="ONE STEP AT A TIME" title={<>A calmer way to <em>get it done.</em></>} text={`${tasks.filter(t => t.done).length} of ${tasks.length} tasks complete across your celebrations.`}/>
    <section className="panel task-page"><div className="task-tools"><div className="add-task"><input value={text} onChange={e => setText(e.target.value)} placeholder="Add a task..." onKeyDown={e => e.key === "Enter" && add()}/><Button onClick={add}><Icon name="plus"/> Add</Button></div><div className="filter-pills">{["All","Open","Done"].map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}</button>)}</div></div>
      <div className="timeline-list">{visible.map((t, i) => <div className={`timeline-task ${t.done ? "done" : ""}`} key={t.id}><div className="timeline-mark"><span>{t.done ? "✓" : i + 1}</span></div><label><input type="checkbox" checked={t.done} onChange={() => setTasks(tasks.map(x => x.id === t.id ? {...x, done: !x.done} : x))}/><div><b>{t.title}</b><small>{t.event} · {t.due}</small></div></label><button onClick={() => setTasks(tasks.filter(x => x.id !== t.id))}><Icon name="trash" size={17}/></button></div>)}</div>
    </section>
  </>;
}

function Vendors({ vendors, setVendors, events = [] }: { vendors: Vendor[]; setVendors: (v: Vendor[]) => void; events?: EventItem[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Booked" | "Considering">("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Helper to identify demo records reliably
  const isSample = (v: Vendor) => Boolean(v.isDemo || v.name.toLowerCase().startsWith("demo ") || v.name.toLowerCase().startsWith("sample "));

  // Calculations for budget integration
  const totalQuoted = useMemo(() => vendors.reduce((acc, v) => acc + (Number(v.quote) || 0), 0), [vendors]);
  const bookedTotal = useMemo(() => vendors.filter(v => v.status === "Booked").reduce((acc, v) => acc + (Number(v.quote) || 0), 0), [vendors]);
  const bookedCount = useMemo(() => vendors.filter(v => v.status === "Booked").length, [vendors]);
  const consideringTotal = useMemo(() => vendors.filter(v => v.status === "Considering").reduce((acc, v) => acc + (Number(v.quote) || 0), 0), [vendors]);
  const consideringCount = useMemo(() => vendors.filter(v => v.status === "Considering").length, [vendors]);
  const benchmarkBudget = useMemo(() => events.reduce((acc, e) => acc + (Number(e.budget) || 0), 0), [events]);

  // Filtering
  const filtered = vendors.filter(v => {
    const matchesFilter = filter === "All" || v.status === filter;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || `${v.name} ${v.category} ${v.notes || ""}`.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleAdd = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setAddError(null);
    const f = new FormData(ev.currentTarget);
    const name = String(f.get("name") || "").trim();
    const category = String(f.get("category") || "").trim();
    const quoteRaw = Number(f.get("quote"));
    const phone = String(f.get("phone") || "").trim();
    const notes = String(f.get("notes") || "").trim();
    const status = (String(f.get("status") || "Considering")) as "Considering" | "Booked";

    if (!name) {
      setAddError("Please enter a vendor or business name.");
      return;
    }
    if (!category) {
      setAddError("Please specify a service category (e.g. Florals, Catering).");
      return;
    }
    if (isNaN(quoteRaw) || quoteRaw <= 0) {
      setAddError("Please enter a valid positive quote amount in INR (greater than ₹0).");
      return;
    }

    const newVendor: Vendor = {
      id: Date.now(),
      name,
      category,
      quote: quoteRaw,
      phone: phone || undefined,
      notes: notes || undefined,
      status,
      isDemo: false,
    };

    setVendors([newVendor, ...vendors]);
    setShowAdd(false);
  };

  const handleEdit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (!editingVendor) return;
    setEditError(null);
    const f = new FormData(ev.currentTarget);
    const name = String(f.get("name") || "").trim();
    const category = String(f.get("category") || "").trim();
    const quoteRaw = Number(f.get("quote"));
    const phone = String(f.get("phone") || "").trim();
    const notes = String(f.get("notes") || "").trim();
    const status = (String(f.get("status") || "Considering")) as "Considering" | "Booked";

    if (!name) {
      setEditError("Please enter a vendor name.");
      return;
    }
    if (!category) {
      setEditError("Please specify a service category.");
      return;
    }
    if (isNaN(quoteRaw) || quoteRaw <= 0) {
      setEditError("Please enter a valid positive quote amount in INR (greater than ₹0).");
      return;
    }

    setVendors(vendors.map(v => v.id === editingVendor.id ? {
      ...v,
      name,
      category,
      quote: quoteRaw,
      phone: phone || undefined,
      notes: notes || undefined,
      status,
    } : v));
    setEditingVendor(null);
  };

  const toggleStatus = (id: number) => {
    setVendors(vendors.map(v => v.id === id ? {
      ...v,
      status: v.status === "Booked" ? "Considering" : "Booked"
    } : v));
  };

  const confirmDelete = () => {
    if (!deletingVendor) return;
    setVendors(vendors.filter(v => v.id !== deletingVendor.id));
    setDeletingVendor(null);
  };

  return <>
    <PageTitle
      eyebrow="YOUR CREATIVE CREW"
      title={<>Good people make <em>great events.</em></>}
      text="Manage vendor quotes, track booking status, and assemble your celebration dream team."
      action={<Button onClick={() => { setAddError(null); setShowAdd(true); }}><Icon name="plus"/> Add vendor</Button>}
    />

    <section className="metrics">
      <article>
        <span>Total quoted</span>
        <strong>{money(totalQuoted)}</strong>
        <small>Across {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}</small>
      </article>
      <article className="yellow">
        <span>Booked commitments</span>
        <strong>{money(bookedTotal)}</strong>
        <small>{bookedCount} {bookedCount === 1 ? "vendor" : "vendors"} confirmed</small>
      </article>
      <article className="green">
        <span>In review / considering</span>
        <strong>{money(consideringTotal)}</strong>
        <small>{consideringCount} pending decision</small>
      </article>
      <article className="blue">
        <span>Benchmark budget</span>
        <strong>{money(benchmarkBudget)}</strong>
        <small>{benchmarkBudget > 0 ? `${Math.round((totalQuoted / benchmarkBudget) * 100)}% of event targets` : "Overall event budget"}</small>
      </article>
    </section>

    <div className="ai-inline" style={{ marginTop: "-28px", marginBottom: "32px", background: "#f0ece3", border: "1px solid var(--line)", alignItems: "center" }}>
      <Icon name="spark" size={20}/>
      <p style={{ margin: 0, fontSize: "12px", color: "#555", lineHeight: "1.5" }}>
        <strong>Planning estimates:</strong> Quoted amounts reflect exploratory proposals and do not double-count against paid expenses in the <strong>Budget Tracker</strong> until recorded as actual payments.
      </p>
    </div>

    <div className="task-tools" style={{ marginBottom: "24px" }}>
      <div className="searchbar" style={{ margin: 0, flex: 1 }}>
        <Icon name="search"/>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendors, categories, or notes..."
        />
      </div>
      <div className="filter-pills">
        {(["All", "Booked", "Considering"] as const).map(tab => (
          <button
            key={tab}
            className={filter === tab ? "active" : ""}
            onClick={() => setFilter(tab)}
          >
            {tab} ({tab === "All" ? vendors.length : vendors.filter(v => v.status === tab).length})
          </button>
        ))}
      </div>
    </div>

    <section className="vendor-grid">
      {filtered.map((v, i) => (
        <article className="vendor-card" key={v.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div className={`vendor-logo c${i % 4}`}>
              {v.name.split(" ").slice(0, 2).map(x => x[0]).join("").toUpperCase()}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {isSample(v) && (
                <span className="pill" style={{ background: "#fef3c7", color: "#92400e", fontSize: "8px", fontWeight: 800, padding: "5px 8px" }}>
                  DEMO
                </span>
              )}
              <span className={`status ${v.status === "Booked" ? "booked" : ""}`} style={{ position: "static" }}>
                {v.status}
              </span>
            </div>
          </div>

          <h3 style={{ margin: "6px 0 2px" }}>{v.name}</h3>
          <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--muted)" }}>{v.category}</p>
          {v.notes && (
            <p style={{ fontSize: "11px", color: "#666", margin: "0 0 10px", lineHeight: "1.4" }}>
              {v.notes}
            </p>
          )}

          <div className="vendor-details">
            <span>Quote <b>{money(v.quote)}</b></span>
            <span>Contact <b>{v.phone || "—"}</b></span>
          </div>

          <div className="vendor-actions">
            <button
              type="button"
              style={{ cursor: "pointer", fontWeight: 700 }}
              onClick={() => toggleStatus(v.id)}
            >
              {v.status === "Booked" ? "Mark considering" : "Mark booked"}
            </button>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                type="button"
                aria-label={`Edit ${v.name}`}
                title="Edit vendor details"
                onClick={() => { setEditError(null); setEditingVendor(v); }}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Icon name="edit" size={15}/> <span>Edit</span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${v.name}`}
                title="Remove vendor"
                onClick={() => setDeletingVendor(v)}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
              >
                <Icon name="trash" size={16}/>
              </button>
            </div>
          </div>
        </article>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: "20px", gridColumn: "1 / -1" }}>
          <div style={{ display: "inline-block", padding: "12px", background: "#f5f2eb", borderRadius: "50%", marginBottom: "12px" }}>
            <Icon name="users" size={28}/>
          </div>
          <h3 style={{ margin: "0 0 6px" }}>No vendors found</h3>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: "0 0 16px" }}>
            {vendors.length === 0
              ? "No vendors added yet. Click 'Add vendor' to start building your creative team."
              : "No vendors match your current search and filter criteria."}
          </p>
          {vendors.length > 0 && (
            <Button kind="light" onClick={() => { setSearch(""); setFilter("All"); }}>
              Clear search & filters
            </Button>
          )}
        </div>
      )}
    </section>

    {showAdd && (
      <Modal title="Add a vendor" close={() => setShowAdd(false)}>
        <form className="form-grid" onSubmit={handleAdd}>
          {addError && <div className="alert" role="alert" style={{ gridColumn: "1 / -1", margin: 0 }}>{addError}</div>}
          <Field label="Vendor / Business name" name="name" placeholder="e.g. Bloom & Petals Studio" required/>
          <Field label="Category" name="category" placeholder="e.g. Florals, Catering, Photography" required/>
          <Field label="Quote in INR (₹)" name="quote" type="number" placeholder="e.g. 35000" required/>
          <Field label="Contact details (phone or email)" name="phone" placeholder="e.g. +91 98765 43210"/>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Initial booking status</span>
            <select name="status" defaultValue="Considering">
              <option value="Considering">Considering (Reviewing proposal)</option>
              <option value="Booked">Booked (Confirmed commitment)</option>
            </select>
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Notes & package inclusions (optional)</span>
            <input name="notes" placeholder="e.g. Includes ceremony arches, setup & breakdown"/>
          </label>
          <div className="form-actions">
            <Button kind="light" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit">Save vendor</Button>
          </div>
        </form>
      </Modal>
    )}

    {editingVendor && (
      <Modal title={`Edit vendor — ${editingVendor.name}`} close={() => setEditingVendor(null)}>
        <form className="form-grid" onSubmit={handleEdit}>
          {editError && <div className="alert" role="alert" style={{ gridColumn: "1 / -1", margin: 0 }}>{editError}</div>}
          <Field label="Vendor / Business name" name="name" defaultValue={editingVendor.name} required/>
          <Field label="Category" name="category" defaultValue={editingVendor.category} required/>
          <Field label="Quote in INR (₹)" name="quote" type="number" defaultValue={editingVendor.quote} required/>
          <Field label="Contact details" name="phone" defaultValue={editingVendor.phone || ""}/>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Booking status</span>
            <select name="status" defaultValue={editingVendor.status}>
              <option value="Considering">Considering (Reviewing proposal)</option>
              <option value="Booked">Booked (Confirmed commitment)</option>
            </select>
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Notes & package inclusions</span>
            <input name="notes" defaultValue={editingVendor.notes || ""} placeholder="e.g. Scope, deliverables, timings"/>
          </label>
          <div className="form-actions">
            <Button kind="light" onClick={() => setEditingVendor(null)}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Modal>
    )}

    {deletingVendor && (
      <Modal title="Remove vendor estimate?" close={() => setDeletingVendor(null)}>
        <p style={{ fontSize: "14px", lineHeight: "1.5", margin: "0 0 20px" }}>
          Are you sure you want to remove <strong>{deletingVendor.name}</strong> ({deletingVendor.category})? This will remove their quote of <strong>{money(deletingVendor.quote)}</strong> from your vendor estimates.
        </p>
        <div className="form-actions">
          <Button kind="light" onClick={() => setDeletingVendor(null)}>Keep vendor</Button>
          <button
            type="button"
            className="danger-btn"
            onClick={confirmDelete}
          >
            Yes, remove vendor
          </button>
        </div>
      </Modal>
    )}
  </>;
}

const ideas = [
  { id: 1, title: "Marigold twilight", cat: "Wedding", desc: "Layered fabric, local flowers, and warm pendant lights.", colors: ["#ED8B75","#F4CD68","#61744B"], range: "₹1.2L–₹2.4L" },
  { id: 2, title: "Pastel garden table", cat: "Birthday", desc: "Soft linen, playful menus, and shared-table dining.", colors: ["#F2B5C9","#C4CDED","#F5E6C8"], range: "₹45K–₹90K" },
  { id: 3, title: "Courtyard sangeet", cat: "Engagement", desc: "A colour-rich canopy with an intimate dance floor.", colors: ["#A85584","#F5A1C5","#D9C76C"], range: "₹1.8L–₹3.5L" },
  { id: 4, title: "Campus after dark", cat: "College", desc: "String lights, open seating, and bold wayfinding.", colors: ["#252340","#7A88CC","#EC8E82"], range: "₹2L–₹5L" },
];

function Inspiration({ go }: { go: (p: Page) => void }) {
  const [faves, setFaves] = useStored<number[]>("planora-faves", []); const [category, setCategory] = useState("All");
  const visible = ideas.filter(i => category === "All" || i.cat === category);
  return <><PageTitle eyebrow="IDEAS TO MAKE YOUR OWN" title={<>Find your <em>celebration feeling.</em></>} text="A curated starting point for colours, atmosphere, and thoughtful details."/>
    <div className="filter-pills gallery-filter">{["All","Wedding","Birthday","Engagement","College"].map(x => <button className={category === x ? "active" : ""} onClick={() => setCategory(x)} key={x}>{x}</button>)}</div>
    <section className="gallery">{visible.map((idea, i) => <article className="idea" key={idea.id}><div className="idea-image"><img src={photos[i % photos.length]} alt={`${idea.title} celebration inspiration`}/><button className={faves.includes(idea.id) ? "liked" : ""} aria-label="Favorite idea" onClick={() => setFaves(faves.includes(idea.id) ? faves.filter(x => x !== idea.id) : [...faves, idea.id])}><Icon name="heart" fill={faves.includes(idea.id) ? "currentColor" : "none"}/></button><span>{idea.cat}</span></div><div className="idea-body"><h3>{idea.title}</h3><p>{idea.desc}</p><div className="idea-meta"><div className="swatches">{idea.colors.map(c => <i key={c} style={{background:c}}/>)}</div><b>{idea.range}</b></div><Button kind="light" onClick={() => go("planner")}>Use this idea <Icon name="arrow" size={16}/></Button></div></article>)}</section>
    <p className="photo-credit">Photography sourced from Unsplash. Images are for inspiration only.</p>
  </>;
}

function Settings({ clear }: { clear: () => void }) {
  const [confirm, setConfirm] = useState(false); const [saved, setSaved] = useState(false);
  const exportData = () => { const blob = new Blob([JSON.stringify({ events: JSON.parse(localStorage.getItem("planora-events") || "[]"), tasks: JSON.parse(localStorage.getItem("planora-tasks") || "[]"), vendors: JSON.parse(localStorage.getItem("planora-vendors") || "[]"), expenses: JSON.parse(localStorage.getItem("planora-expenses") || "[]") }, null, 2)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "planzypop-data.json"; a.click(); URL.revokeObjectURL(a.href); };
  return <><PageTitle eyebrow="MAKE IT YOURS" title={<>Preferences, <em>your way.</em></>} text="Profile, planning defaults, notifications, and your local demonstration data."/>
    <section className="settings-grid"><article className="panel"><span className="eyebrow">PROFILE & DEFAULTS</span><h2>Planning preferences</h2><div className="form-grid settings-form"><Field label="Display name" name="name" defaultValue="Meera Sharma"/><Field label="Default guest count" name="guests" type="number" defaultValue={80}/><label className="field"><span>Currency</span><select defaultValue="INR"><option value="INR">INR — Indian Rupee</option></select></label><label className="field"><span>Celebration style</span><select><option>Warm & intimate</option><option>Bold & energetic</option><option>Classic & elegant</option></select></label></div><Button onClick={() => {setSaved(true); setTimeout(() => setSaved(false), 1800)}}>{saved ? "Preferences saved" : "Save changes"}</Button></article>
    <article className="panel"><span className="eyebrow">NOTIFICATIONS</span><h2>Gentle reminders</h2>{["Upcoming task reminders","Budget threshold alerts","Weekly planning digest"].map((x,i) => <label className="toggle-row" key={x}><span><b>{x}</b><small>{i === 0 ? "One day before a task is due" : i === 1 ? "When a category reaches 90%" : "A short Sunday overview"}</small></span><input type="checkbox" defaultChecked={i < 2}/><i/></label>)}</article>
    <article className="panel data-panel"><span className="eyebrow">YOUR DATA</span><h2>Export or reset</h2><p>Everything in PlanzyPop AI stays in this browser. Export a JSON copy or clear it to return to the sample experience.</p><div className="form-actions"><Button kind="light" onClick={exportData}>Export JSON</Button><button className="danger-link" onClick={() => setConfirm(true)}>Clear demonstration data</button></div></article></section>
    {confirm && <Modal title="Clear demonstration data?" close={() => setConfirm(false)}><p>This removes your locally saved events, tasks, expenses, vendors, and favorites from PlanzyPop AI. This cannot be undone.</p><div className="form-actions"><Button kind="light" onClick={() => setConfirm(false)}>Keep my data</Button><button className="danger-btn" onClick={() => {clear(); setConfirm(false)}}>Yes, clear data</button></div></Modal>}
  </>;
}

export default function App() {
  const [page, setPage] = useState<Page>("overview"); const [mobileOpen, setMobileOpen] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [events, setEvents] = useStored("planora-events", seedEvents); const [tasks, setTasks] = useStored("planora-tasks", seedTasks);
  const [expenses, setExpenses] = useStored("planora-expenses", seedExpenses); const [vendors, setVendors] = useStored("planora-vendors", seedVendors);

  useEffect(() => {
    document.title = "PlanzyPop AI — Your vibe. Your plan. Your party.";
    api.health()
      .then(res => setBackendOnline(res.status === "ok"))
      .catch(() => setBackendOnline(false));
  }, []);

  const go = (p: Page) => { setPage(p); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const clear = () => { localStorage.clear(); setEvents(seedEvents); setTasks(seedTasks); setExpenses(seedExpenses); setVendors(seedVendors); };

  const saveGeneratedPlan = (
    planToSave: PlanResponse,
    details: { name: string; type: string; date: string; location: string; guests: number; budget: number }
  ) => {
    const newEvent: EventItem = {
      id: Date.now(),
      name: details.name || planToSave.concept_title,
      type: details.type || "Celebration",
      date: details.date || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      location: details.location || "Jaipur, Rajasthan",
      guests: Number(details.guests) || 80,
      budget: Number(details.budget) || 150000,
      progress: 25,
      tone: ["pink", "blue", "rose"][Math.floor(Math.random() * 3)] || "pink",
    };
    setEvents([newEvent, ...events]);

    if (planToSave.checklist && planToSave.checklist.length > 0) {
      const newTasks: Task[] = planToSave.checklist.map((c, i) => ({
        id: Date.now() + i + 1,
        title: c.title,
        event: newEvent.name,
        due: c.priority === "High" ? "1 week" : "2 weeks",
        done: false,
      }));
      setTasks([...newTasks, ...tasks]);
    }
  };

  const content = useMemo(() => {
    if (page === "overview") return <Overview events={events} tasks={tasks} setTasks={setTasks} go={go}/>;
    if (page === "events") return <EventsPage events={events} setEvents={setEvents}/>;
    if (page === "planner") return <Planner onSavePlan={saveGeneratedPlan} go={go}/>;
    if (page === "budget") return <Budget expenses={expenses} setExpenses={setExpenses}/>;
    if (page === "tasks") return <TasksPage tasks={tasks} setTasks={setTasks}/>;
    if (page === "vendors") return <Vendors vendors={vendors} setVendors={setVendors} events={events}/>;
    if (page === "inspiration") return <Inspiration go={go}/>;
    return <Settings clear={clear}/>;
  }, [page, events, tasks, expenses, vendors]);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}><div className="brand" onClick={() => go("overview")} title="PlanzyPop AI — Your vibe. Your plan. Your party."><span className="brand-mark"><i/><i/><i/></span><b>PlanzyPop</b><small>AI</small></div><nav aria-label="Main navigation">{nav.map(n => <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => go(n.id)}><Icon name={n.icon}/><span>{n.label}</span>{n.id === "tasks" && <i className="count">{tasks.filter(t => !t.done).length}</i>}</button>)}</nav><div className="sidebar-foot"><div className="mini-avatar">MS</div><div><b>Meera Sharma</b><span>PlanzyPop workspace</span></div><button onClick={() => go("settings")} aria-label="Open settings"><Icon name="settings" size={17}/></button></div></aside>
    {mobileOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)}/>}
    <main><div className="mobile-head"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Icon name="menu"/></button><div className="brand" title="PlanzyPop AI — Your vibe. Your plan. Your party."><span className="brand-mark"><i/><i/><i/></span><b>PlanzyPop</b><small>AI</small></div><button aria-label="Notifications"><Icon name="bell"/></button></div><div className="topbar"><div className="demo-badge"><i style={{ background: backendOnline ? "var(--green)" : "#e2933e" }}/> {backendOnline ? "BACKEND CONNECTED" : "DEMO MODE"}</div><button className="icon-btn" aria-label="Search"><Icon name="search"/></button><button className="icon-btn notification" aria-label="Notifications"><Icon name="bell"/><i/></button></div><div className="page-content">{content}</div></main>
  </div>;
}
