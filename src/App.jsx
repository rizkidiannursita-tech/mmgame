import React, { useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import { sha256 } from "js-sha256";
import LZString from "lz-string";

// ---- THEMES (10 rounds) ----
const THEMES = [
  { label:"Flowers vs Grasses",
    crew:["rose","tulip","jasmine","daisy","lily","orchid","lavender","hibiscus","iris","lotus","daffodil","peony","poppy","sunflower","marigold"],
    impostor:["bamboo","zoysia","bentgrass","fescue","bluegrass","bermuda","ryegrass","pampas","reed","switchgrass"] },
  { label:"Fruits vs Vegetables",
    crew:["apple","banana","orange","mango","grape","pineapple","papaya","strawberry","watermelon","kiwi","pear","peach","cherry","plum","apricot"],
    impostor:["carrot","potato","tomato","cucumber","lettuce","spinach","broccoli","cabbage","eggplant","pumpkin"] },
  { label:"Mammals vs Birds",
    crew:["lion","tiger","elephant","giraffe","zebra","kangaroo","whale","bear","wolf","fox","deer","rabbit","horse","camel","panda"],
    impostor:["eagle","sparrow","pigeon","parrot","owl","flamingo","penguin","swan","goose","peacock"] },
  { label:"Sea vs Freshwater Animals",
    crew:["shark","tuna","mackerel","sardine","swordfish","crab","lobster","shrimp","jellyfish","starfish","seahorse","manta ray","clam","oyster","mussel","scallop"],
    impostor:["carp","catfish","tilapia","trout","pike","perch","bass","goldfish","eel","crayfish"] },
  { label:"Kitchen Utensils vs Kitchen Electronics",
    crew:["spatula","whisk","ladle","tongs","peeler","grater","colander","rolling pin","can opener","measuring cup","sieve","zester","skimmer","pizza cutter","pastry brush","garlic press"],
    impostor:["blender","toaster","microwave","mixer","food processor","air fryer","rice cooker","kettle","coffee maker","oven"] },
  { label:"Clothing vs Accessories",
    crew:["shirt","pants","dress","skirt","jacket","coat","sweater","t-shirt","jeans","shorts","blouse","hoodie","suit","socks","cardigan","leggings"],
    impostor:["belt","tie","scarf","hat","cap","gloves","earrings","necklace","bracelet","watch"] },
  { label:"Vehicles vs Household Items",
    crew:["sedan","suv","hatchback","coupe","convertible","pickup","limousine","minivan","wagon","sports car","roadster","crossover","jeep","truck"],
    impostor:["sofa","lamp","vacuum","mirror","chair","table","bookshelf","cabinet","bed","dresser"] },
  { label:"String vs Percussion Instruments",
    crew:["guitar","violin","viola","cello","double bass","harp","banjo","mandolin","ukulele","sitar","lute","zither","lyre","erhu"],
    impostor:["drum","snare","cymbal","tambourine","maracas","triangle","xylophone","bongos","conga","timpani"] },
  { label:"Desserts vs Fast Food",
    crew:["cake","pie","ice cream","pudding","brownie","cupcake","tart","cheesecake","donut","cookie","trifle","mousse","custard","flan","gelato"],
    impostor:["burger","fries","pizza","hotdog","fried chicken","taco","kebab","shawarma","nuggets","sandwich"] },
  { label:"Office Items vs School Supplies",
    crew:["stapler","paperclip","binder","folder","notepad","printer","scanner","shredder","whiteboard","marker","highlighter","ruler","tape dispenser","envelope","calculator","desk lamp"],
    impostor:["pencil","pen","eraser","notebook","backpack","glue","scissors","protractor","compass","worksheet"] }
];
const ROUNDS = 10;

const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const hashHex = (name, seed, round) => sha256(norm(name) + "|" + seed + "|" + round);
const hexToInt = (hex, digits=12) => parseInt(hex.slice(0, digits), 16);
const choose = (rng, list) => list[Math.floor(rng() * list.length)];

function useQuery(){
  const p = new URLSearchParams(window.location.search);
  return {
    mode: p.get("mode") || "admin",
    room: p.get("room") || "englishclub",
    bootstrap: p.get("bootstrap") || "" // optional one-time roster init
  };
}

// Deterministic assignments: requires roster to pick impostors by rank.
// Player page is minimal; it loads roster snapshot from localStorage or optional bootstrap once.
function assignAll(roster, seed, round, impostorCount){
  let k = Math.max(1, Math.min(2, impostorCount || 1));
  if (roster.length < 2) k = 0;
  if (roster.length === 2) k = 1;
  if (roster.length > 20) roster = roster.slice(0,20);

  const items = roster.map(name => ({ name, v: hexToInt(hashHex(name, seed, round)) }))
                      .sort((a,b)=> a.v - b.v);
  const impostorSet = new Set(items.slice(0, k).map(x=>x.name));

  const theme = THEMES[(round - 1) % ROUNDS];
  const rng = seedrandom(`${seed}|${round}|words`);
  return items.map(({name}) => {
    const role = impostorSet.has(name) ? "IMPOSTOR" : "CREW";
    const pool = role === "IMPOSTOR" ? theme.impostor : theme.crew;
    const word = choose(rng, pool);
    return { name, role, word };
  });
}

export default function App(){
  const q = useQuery();
  const [mode, setMode] = useState(q.mode === "player" ? "player" : "admin");

  // Hard-lock: always follow URL param for mode (if user toggles URL, update state)
  useEffect(()=>{
    const onPop = ()=>{
      const p = new URLSearchParams(window.location.search);
      const m = p.get("mode") || "admin";
      setMode(m === "player" ? "player" : "admin");
    };
    window.addEventListener("popstate", onPop);
    return ()=> window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md p-6">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Among Us – English Club 6.1</h1>
          {mode === "admin" && (
            <nav className="flex gap-2">
              <a href="?mode=admin" className="px-3 py-1.5 rounded-full text-sm bg-indigo-600 text-white">Admin</a>
              <a href="?mode=player" className="px-3 py-1.5 rounded-full text-sm bg-white border">Player</a>
            </nav>
          )}
        </header>
        {mode === "player" ? <PlayerView /> : <AdminView />}
      </div>
    </div>
  );
}

function AdminView(){
  const q = useQuery();
  const [room, setRoom] = useState(q.room || "englishclub");
  const [round, setRound] = useState(1);
  const [impostorCount, setImpostorCount] = useState(1);
  const [nameInput, setNameInput] = useState("");
  const [roster, setRoster] = useState([]);

  const theme = THEMES[(round-1) % ROUNDS];
  const tooFew = roster.length < 2;
  const tooMany = roster.length > 20;

  const assignments = useMemo(()=>assignAll(roster, room, round, impostorCount), [roster, room, round, impostorCount]);

  function addName(){
    const n = norm(nameInput);
    if(!n) return;
    if(roster.includes(n)) return;
    if(roster.length >= 20) return;
    setRoster([...roster, n]);
    setNameInput("");
  }
  function removeName(n){ setRoster(roster.filter(x=>x!==n)); }
  function clearRoster(){ if(confirm("Clear roster?")) setRoster([]); }
  function nextRound(){ setRound(r => Math.min(10, r+1)); }
  function prevRound(){ setRound(r => Math.max(1, r-1)); }

  // One-time bootstrap link to seed roster into players' localStorage on their device (no per-round payload)
  const bootstrapObj = { room, round, impostorCount, roster };
  const bootstrap = LZString.compressToEncodedURIComponent(JSON.stringify(bootstrapObj));
  const playerLink = (()=>{
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set("mode","player");
    u.searchParams.set("room", room);
    return u.toString();
  })();
  const initPlayerLink = (()=>{
    const u = new URL(playerLink);
    u.searchParams.set("bootstrap", bootstrap);
    return u.toString();
  })();

  return (
    <div className="space-y-4">
      {(tooFew || tooMany) && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-xl p-3 text-sm">
          {tooFew && <div>⚠️ Minimal 2 pemain.</div>}
          {tooMany && <div>⚠️ Maksimal 20 pemain.</div>}
        </div>
      )}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-2">Room & Round</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium">Room Code</label>
            <input value={room} onChange={e=>setRoom(norm(e.target.value))} className="w-full rounded-xl border px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium">Impostors</label>
            <select value={impostorCount} onChange={e=>setImpostorCount(Math.max(1, Math.min(2, Number(e.target.value))))} className="w-full mt-1 rounded-xl border px-2 py-2">
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={prevRound} className="px-3 py-2 rounded-xl border">Prev</button>
          <div>Round: <b>{round}</b> · Theme: <b>{theme.label}</b></div>
          <button onClick={nextRound} className="px-3 py-2 rounded-xl border">Next</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-2">Roster (min 2, max 20)</h2>
        <div className="flex gap-2">
          <input value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") addName(); }} placeholder="Type a player name…" className="flex-1 rounded-xl border px-3 py-2"/>
          <button onClick={addName} className="px-3 py-2 rounded-xl bg-indigo-600 text-white">Add</button>
          <button onClick={clearRoster} className="px-3 py-2 rounded-xl border">Clear</button>
        </div>
        <div className="mt-3 max-h-48 overflow-auto border rounded-xl p-2 text-sm">
          {roster.length === 0 && <p className="text-slate-500">No players yet.</p>}
          {roster.map(n => (
            <div key={n} className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50">
              <span>{n}</span>
              <button onClick={()=>removeName(n)} className="text-red-600 text-xs">remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-2">Share Links</h2>
        <p className="text-sm text-slate-600">1) Bagikan <b>Player Link</b> (dipakai setiap ronde, cukup refresh). 2) Jika device pemain belum terisi roster, bagikan <b>Init Player Link</b> <i>sekali</i> untuk seed roster.</p>
        <div className="mt-2">
          <div className="text-xs text-slate-600">Player Link</div>
          <div className="text-xs break-all bg-slate-100 rounded-xl p-2 border">{playerLink}</div>
        </div>
        <div className="mt-2">
          <div className="text-xs text-slate-600">Init Player Link (one-time)</div>
          <div className="text-xs break-all bg-slate-100 rounded-xl p-2 border">{initPlayerLink}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold mb-2">Assignments Preview</h2>
        <table className="min-w-full text-sm">
          <thead><tr className="text-left border-b"><th className="py-2 pr-3">#</th><th className="py-2 pr-3">Player</th><th className="py-2 pr-3">Word</th><th className="py-2 pr-3">Role</th></tr></thead>
        <tbody>{assignments.map((a,idx)=>(<tr key={a.name} className="border-b last:border-0"><td className="py-2 pr-3 text-slate-500">{idx+1}</td><td className="py-2 pr-3 font-medium">{a.name}</td><td className="py-2 pr-3"><span className="font-semibold">{a.word}</span></td><td className="py-2 pr-3">{a.role}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerView(){
  const q = useQuery();
  const room = q.room || "englishclub";
  const [name, setName] = useState("");

  // One-time bootstrap to seed roster on this device (no per-round payload)
  useEffect(()=>{
    if(q.bootstrap){
      try{
        const obj = JSON.parse(LZString.decompressFromEncodedURIComponent(q.bootstrap));
        if(obj && Array.isArray(obj.roster)){
          localStorage.setItem(`au61_roster_${room}`, JSON.stringify(obj.roster.map(x=>norm(x))));
          localStorage.setItem(`au61_settings_${room}`, JSON.stringify({ impostorCount: Math.max(1, Math.min(2, obj.impostorCount||1)) }));
          // Clean URL (remove bootstrap param)
          const u = new URL(window.location.href);
          u.searchParams.delete("bootstrap");
          window.history.replaceState({}, "", u.toString());
        }
      }catch{}
    }
  }, []);

  const [round, setRound] = useState(1);
  const [result, setResult] = useState(null);
  const settings = (()=>{
    try{ return JSON.parse(localStorage.getItem(`au61_settings_${room}`) || "{}"); }catch{return {};}
  })();
  const impostorCount = Math.max(1, Math.min(2, settings.impostorCount || 1));
  const roster = (()=>{
    try{ return JSON.parse(localStorage.getItem(`au61_roster_${room}`) || "[]"); }catch{return [];}
  })();

  function getMyWord(){
    if(!name.trim()){ alert("Isi nama terlebih dahulu."); return; }
    if(roster.length < 2){ alert("Device ini belum di-inisialisasi. Minta Admin kirim 'Init Player Link' sekali, lalu coba lagi."); return; }
    // Admin menyebutkan round saat ini; pemain hanya input nama lalu OK
    // Untuk kesederhanaan, pemain akan diminta memasukkan nomor ronde saat ini jika belum pernah di-set
    let r = round;
    if(r < 1 || r > 10){
      r = 1;
    }
    const assignments = assignAll(roster, room, r, impostorCount);
    const me = assignments.find(a => a.name === norm(name));
    if(!me){ alert("Nama tidak ditemukan di roster. Pastikan ejaan sama persis."); return; }
    setResult({ ...me, round: r, theme: THEMES[(r-1)%10].label });
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="font-semibold text-lg">Player</h2>
        <div className="mt-2">
          <label className="block text-sm font-medium">Your Name</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="e.g., Asma"/>
        </div>
        <div className="mt-2">
          <label className="block text-sm font-medium">Round (from Admin)</label>
          <input type="number" min={1} max={10} value={round} onChange={e=>setRound(Math.max(1, Math.min(10, Number(e.target.value)||1)))} className="w-full rounded-xl border px-3 py-2"/>
        </div>
        <div className="mt-3">
          <button onClick={getMyWord} className="w-full px-3 py-2 rounded-xl bg-indigo-600 text-white">OK</button>
        </div>
        {roster.length < 2 && (
          <p className="mt-3 text-xs text-rose-600">Perlu inisialisasi sekali: minta Admin kirim <b>Init Player Link</b> ke device ini.</p>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <p className="text-slate-500 text-sm">Round <b>{result.round}</b> · Theme <b>{result.theme}</b></p>
          <div className="mt-4">
            <div className="inline-block bg-slate-900 text-white rounded-2xl px-6 py-4 text-3xl font-black tracking-wide select-all">{result.word}</div>
          </div>
        </div>
      )}
    </div>
  );
}
