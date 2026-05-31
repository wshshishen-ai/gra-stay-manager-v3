import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Home, Plus, Brush, BarChart3, Wallet, Building2, Wrench, LogOut, Download, Phone, Shield, Users, Database, TrendingUp, Edit3, X } from 'lucide-react';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const tabs = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'rooms', label: 'Rooms', icon: Building2 },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'cleaning', label: 'Cleaning', icon: Brush },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'users', label: 'Users', icon: Users },
];

const roles = ['Boss','Admin','Cleaner','Maintenance'];
const sources = ['Airbnb','Booking.com','Walk-in','Referral','Other'];
const todayISO = () => new Date().toISOString().slice(0,10);
const money = n => '₦' + Number(n || 0).toLocaleString();
const monthKey = (d = new Date()) => typeof d === 'string' ? d.slice(0,7) : d.toISOString().slice(0,7);
function formatDate(dateStr){ if(!dateStr) return '-'; const d = new Date(dateStr+'T00:00:00'); return `${d.toLocaleDateString('en-US',{weekday:'short'})}, ${dateStr}`; }
function daysInMonth(month){ const [y,m]=month.split('-').map(Number); return new Date(y,m,0).getDate(); }
function overlapDays(start,end,month){ if(!start||!end) return 0; const [y,m]=month.split('-').map(Number); const ms=new Date(y,m-1,1); const me=new Date(y,m,1); const s=new Date(start+'T00:00:00'); const e=new Date(end+'T00:00:00'); const from=new Date(Math.max(s,ms)); const to=new Date(Math.min(e,me)); return Math.max(0, Math.round((to-from)/86400000)); }
function nights(b){ if(!b.check_in||!b.check_out) return 0; return Math.max(1,Math.round((new Date(b.check_out)-new Date(b.check_in))/86400000)); }
function downloadFile(name, content, type='application/json'){ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); URL.revokeObjectURL(url); }
function toCSV(rows){ if(!rows.length) return ''; const keys=Object.keys(rows[0]); return [keys.join(','),...rows.map(r=>keys.map(k=>`"${String(r[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n'); }
function whatsappUrl(phone){ const digits=String(phone||'').replace(/\D/g,''); return digits ? `https://wa.me/${digits}` : ''; }

function Card({children, className=''}){ return <div className={'card '+className}>{children}</div>; }
function Button({children,onClick,kind='primary',type='button',disabled=false}){ return <button type={type} disabled={disabled} onClick={onClick} className={'btn '+kind}>{children}</button>; }
function Stat({title,value}){ return <Card><div className="muted small">{title}</div><div className="stat">{value}</div></Card>; }
function Section({title, icon}){ return <h2 className="section">{icon}{title}</h2>; }

function App(){
  const [session,setSession]=useState(null); const [authMode,setAuthMode]=useState('login');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [fullName,setFullName]=useState('');
  const [profile,setProfile]=useState(null); const [active,setActive]=useState('dashboard'); const [loading,setLoading]=useState(false);
  const [rooms,setRooms]=useState([]); const [bookings,setBookings]=useState([]); const [tasks,setTasks]=useState([]); const [repairs,setRepairs]=useState([]); const [expenses,setExpenses]=useState([]); const [profiles,setProfiles]=useState([]);
  const [selectedMonth,setSelectedMonth]=useState(monthKey());
  const [roomName,setRoomName]=useState(''); const [roomNote,setRoomNote]=useState('');
  const [booking,setBooking]=useState({room_id:'',guest:'',guest_phone:'',source:'Airbnb',check_in:todayISO(),check_out:'',total:'',paid:''});
  const [editingBooking,setEditingBooking]=useState(null);
  const [repair,setRepair]=useState({room_id:'',issue:''}); const [expense,setExpense]=useState({category:'Cleaning',amount:'',expense_date:todayISO(),note:''});

  useEffect(()=>{ if(!supabase) return; supabase.auth.getSession().then(({data})=>setSession(data.session)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return ()=>subscription.unsubscribe(); },[]);
  useEffect(()=>{ if(session?.user) { loadAll(); } },[session]);

  async function sign(){ if(!supabase) return alert('Supabase env variables are missing.'); setLoading(true); try{
    if(authMode==='signup'){
      const {data,error}=await supabase.auth.signUp({email,password}); if(error) throw error;
      if(data.user) await supabase.from('profiles').upsert({id:data.user.id,email,full_name:fullName||email,role:'Admin'});
      alert('Account created. If email confirmation is enabled, check your mailbox.');
    } else { const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error; }
  } catch(e){ alert(e.message); } finally{ setLoading(false); } }
  async function logout(){ await supabase.auth.signOut(); setSession(null); }

  async function loadAll(){ setLoading(true); try{
    const uid=session.user.id;
    let {data:p}=await supabase.from('profiles').select('*').eq('id',uid).maybeSingle();
    if(!p){ const {data:existing}=await supabase.from('profiles').select('id').limit(1); const role=(existing||[]).length===0?'Boss':'Admin'; const up={id:uid,email:session.user.email,full_name:session.user.email,role}; await supabase.from('profiles').upsert(up); p=up; }
    setProfile(p);
    const [r,b,t,rep,exp,prof]=await Promise.all([
      supabase.from('rooms').select('*').order('created_at',{ascending:true}),
      supabase.from('bookings').select('*').order('check_in',{ascending:false}),
      supabase.from('cleaning_tasks').select('*').order('task_date',{ascending:true}),
      supabase.from('repairs').select('*').order('created_at',{ascending:false}),
      supabase.from('expenses').select('*').order('expense_date',{ascending:false}),
      supabase.from('profiles').select('*').order('created_at',{ascending:true}),
    ]);
    setRooms(r.data||[]); setBookings(b.data||[]); setTasks(t.data||[]); setRepairs(rep.data||[]); setExpenses(exp.data||[]); setProfiles(prof.data||[]);
  } finally{ setLoading(false); } }

  const canFinance = ['Boss','Admin'].includes(profile?.role); const canManage = ['Boss','Admin'].includes(profile?.role); const canUsers = profile?.role==='Boss';
  const currentBookings = useMemo(()=>bookings.filter(b=>b.check_in<=todayISO() && b.check_out>todayISO()),[bookings]);
  const monthly = useMemo(()=>rooms.map(room=>{ const rb=bookings.filter(b=>b.room_id===room.id); const totalDays=daysInMonth(selectedMonth); const occupied=rb.reduce((s,b)=>s+overlapDays(b.check_in,b.check_out,selectedMonth),0); const income=rb.reduce((s,b)=>s+(nights(b)?Number(b.paid||0)*overlapDays(b.check_in,b.check_out,selectedMonth)/nights(b):0),0); return {room_id:room.id,room:room.name,occupied,totalDays,occupancy: totalDays?Math.round(occupied/totalDays*100):0,income:Math.round(income)}; }),[rooms,bookings,selectedMonth]);
  const trend = useMemo(()=>{ const arr=[]; const d=new Date(selectedMonth+'-01T00:00:00'); for(let i=5;i>=0;i--){ const x=new Date(d.getFullYear(),d.getMonth()-i,1); const m=monthKey(x); const revenue=bookings.reduce((s,b)=>s+(nights(b)?Number(b.paid||0)*overlapDays(b.check_in,b.check_out,m)/nights(b):0),0); arr.push({month:m,revenue:Math.round(revenue)}); } return arr; },[bookings,selectedMonth]);
  const sourceRows = useMemo(()=>sources.map(src=>({source:src,revenue:bookings.filter(b=>b.source===src).reduce((s,b)=>s+Number(b.paid||0),0)})).filter(x=>x.revenue>0),[bookings]);
  const stats = { occupied: currentBookings.length, available: Math.max(0,rooms.length-currentBookings.length), pendingCleaning: tasks.filter(t=>t.status!=='Done').length, unpaid: bookings.reduce((s,b)=>s+Math.max(0,Number(b.total||0)-Number(b.paid||0)),0), received: bookings.reduce((s,b)=>s+Number(b.paid||0),0), expense: expenses.reduce((s,e)=>s+Number(e.amount||0),0) };

  async function addRoom(){ if(!roomName.trim()) return; await supabase.from('rooms').insert({name:roomName.trim(),note:roomNote,status:'Available'}); setRoomName(''); setRoomNote(''); loadAll(); }
  async function addBooking(){ const room=rooms.find(r=>r.id===booking.room_id); if(!room||!booking.guest||!booking.check_out) return alert('Room, guest and check-out are required.'); const payload={...booking,room_name:room.name,total:Number(booking.total||0),paid:Number(booking.paid||0)}; const {error}=await supabase.from('bookings').insert(payload); if(error) return alert(error.message); await supabase.from('cleaning_tasks').insert({room_id:room.id,room_name:room.name,task_type:'Cleaning + Bedding',task_date:booking.check_out,assignee:'Cleaner',status:'Pending',cost:8000}); setBooking({room_id:'',guest:'',guest_phone:'',source:'Airbnb',check_in:todayISO(),check_out:'',total:'',paid:''}); loadAll(); }
  function startEditBooking(b){ setEditingBooking({...b,total:String(b.total||''),paid:String(b.paid||'')}); setActive('add'); window.scrollTo({top:0,behavior:'smooth'}); }
  function cancelEditBooking(){ setEditingBooking(null); }
  async function saveEditBooking(){ if(!editingBooking) return; const room=rooms.find(r=>r.id===editingBooking.room_id); if(!room||!editingBooking.guest||!editingBooking.check_out) return alert('Room, guest and check-out are required.'); const payload={room_id:editingBooking.room_id,room_name:room.name,guest:editingBooking.guest,guest_phone:editingBooking.guest_phone||'',source:editingBooking.source||'Airbnb',check_in:editingBooking.check_in,check_out:editingBooking.check_out,total:Number(editingBooking.total||0),paid:Number(editingBooking.paid||0)}; const {error}=await supabase.from('bookings').update(payload).eq('id',editingBooking.id); if(error) return alert(error.message); setEditingBooking(null); loadAll(); }
  async function addRepair(){ const room=rooms.find(r=>r.id===repair.room_id); if(!repair.issue) return; await supabase.from('repairs').insert({room_id:repair.room_id||null,room_name:room?.name||'',issue:repair.issue,status:'Pending'}); setRepair({room_id:'',issue:''}); loadAll(); }
  async function addExpense(){ if(!expense.category||!expense.amount) return; await supabase.from('expenses').insert({...expense,amount:Number(expense.amount)}); setExpense({category:'Cleaning',amount:'',expense_date:todayISO(),note:''}); loadAll(); }
  async function toggleTask(id,status){ await supabase.from('cleaning_tasks').update({status:status==='Done'?'Pending':'Done'}).eq('id',id); loadAll(); }
  async function solveRepair(id){ await supabase.from('repairs').update({status:'Solved'}).eq('id',id); loadAll(); }
  async function updateRole(id,role){ await supabase.from('profiles').update({role}).eq('id',id); loadAll(); }
  const backupPayload=()=>({exported_at:new Date().toISOString(),rooms,bookings,cleaning_tasks:tasks,repairs,expenses,profiles});
  async function saveBackup(){ const payload=backupPayload(); await supabase.from('backups').insert({payload,created_by:session.user.id}); downloadFile(`gra-stay-backup-${todayISO()}.json`,JSON.stringify(payload,null,2)); }
  function exportMonthlyCSV(){ downloadFile(`monthly-report-${selectedMonth}.csv`,toCSV(monthly),'text/csv'); }
  function exportBookingsCSV(){ downloadFile(`bookings-${todayISO()}.csv`,toCSV(bookings),'text/csv'); }

  if(!supabase) return <div className="center"><Card><h1>Missing Supabase settings</h1><p className="muted">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Environment Variables.</p></Card></div>;
  if(!session) return <div className="center"><Card className="login"><h1>GRA Stay Manager V4</h1><p className="muted">Secure mobile room management for Airbnb / Booking operations.</p>{authMode==='signup'&&<input placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)}/>}<input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><Button onClick={sign} disabled={loading}>{authMode==='login'?'Login':'Create account'}</Button><button className="link" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Create new account':'Back to login'}</button></Card></div>;

  return <div className="app"><header><div className="header-title"><h1>GRA Stay Manager</h1><p>{profile?.full_name||profile?.email} · {profile?.role}</p></div><div className="head-actions"><Button kind="light" onClick={loadAll}><Database size={16}/> Sync</Button><Button kind="light" onClick={logout}><LogOut size={16}/></Button></div></header><main>
    {active==='dashboard'&&<><div className="grid"><Stat title="Occupied" value={stats.occupied}/><Stat title="Available" value={stats.available}/><Stat title="Pending Cleaning" value={stats.pendingCleaning}/><Stat title="Unpaid" value={canFinance?money(stats.unpaid):'Hidden'}/></div><Section title="Occupancy dashboard" icon={<BarChart3/>}/><OccupancyDashboard rows={monthly}/><Section title="Revenue trend" icon={<TrendingUp/>}/>{canFinance?<LineChart rows={trend}/>:<p className="muted">Finance data hidden for this role.</p>}<Section title="Room status" icon={<Building2/>}/>{rooms.map(r=><RoomCard key={r.id} room={r} booking={currentBookings.find(b=>b.room_id===r.id)} canFinance={canFinance} canManage={canManage} onEdit={startEditBooking}/>)}</>}
    {active==='add'&&<div className="stack">{editingBooking&&<><Section title="Edit booking" icon={<Edit3/>}/><Card><select value={editingBooking.room_id||''} onChange={e=>setEditingBooking({...editingBooking,room_id:e.target.value})}><option value="">Select room</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input placeholder="Guest name" value={editingBooking.guest||''} onChange={e=>setEditingBooking({...editingBooking,guest:e.target.value})}/><input placeholder="WhatsApp / phone" value={editingBooking.guest_phone||''} onChange={e=>setEditingBooking({...editingBooking,guest_phone:e.target.value})}/><select value={editingBooking.source||'Airbnb'} onChange={e=>setEditingBooking({...editingBooking,source:e.target.value})}>{sources.map(s=><option key={s}>{s}</option>)}</select><div className="two"><input type="date" value={editingBooking.check_in||''} onChange={e=>setEditingBooking({...editingBooking,check_in:e.target.value})}/><input type="date" value={editingBooking.check_out||''} onChange={e=>setEditingBooking({...editingBooking,check_out:e.target.value})}/></div>{canFinance&&<div className="two"><input placeholder="Total" value={editingBooking.total||''} onChange={e=>setEditingBooking({...editingBooking,total:e.target.value})}/><input placeholder="Paid" value={editingBooking.paid||''} onChange={e=>setEditingBooking({...editingBooking,paid:e.target.value})}/></div>}<div className="actions"><Button onClick={saveEditBooking}><Edit3 size={16}/> Save Changes</Button><Button kind="light" onClick={cancelEditBooking}><X size={16}/> Cancel</Button></div></Card></>}<Section title="Add room" icon={<Building2/>}/>{canManage?<Card><input placeholder="Room name, e.g. Flat 13" value={roomName} onChange={e=>setRoomName(e.target.value)}/><input placeholder="Note" value={roomNote} onChange={e=>setRoomNote(e.target.value)}/><Button onClick={addRoom}>Add Room</Button></Card>:<p className="muted">No permission.</p>}<Section title="Add booking" icon={<Plus/>}/><Card><select value={booking.room_id} onChange={e=>setBooking({...booking,room_id:e.target.value})}><option value="">Select room</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input placeholder="Guest name" value={booking.guest} onChange={e=>setBooking({...booking,guest:e.target.value})}/><input placeholder="WhatsApp / phone, e.g. 2348012345678" value={booking.guest_phone} onChange={e=>setBooking({...booking,guest_phone:e.target.value})}/><select value={booking.source} onChange={e=>setBooking({...booking,source:e.target.value})}>{sources.map(s=><option key={s}>{s}</option>)}</select><div className="two"><input type="date" value={booking.check_in} onChange={e=>setBooking({...booking,check_in:e.target.value})}/><input type="date" value={booking.check_out} onChange={e=>setBooking({...booking,check_out:e.target.value})}/></div>{canFinance&&<div className="two"><input placeholder="Total" value={booking.total} onChange={e=>setBooking({...booking,total:e.target.value})}/><input placeholder="Paid" value={booking.paid} onChange={e=>setBooking({...booking,paid:e.target.value})}/></div>}<Button onClick={addBooking}>Save Booking</Button></Card><Section title="Add repair" icon={<Wrench/>}/><Card><select value={repair.room_id} onChange={e=>setRepair({...repair,room_id:e.target.value})}><option value="">Select room</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><textarea placeholder="Repair issue" value={repair.issue} onChange={e=>setRepair({...repair,issue:e.target.value})}/><Button onClick={addRepair}>Add Repair</Button></Card></div>}
    {active==='cleaning'&&<><Section title="Cleaning tasks" icon={<Brush/>}/>{tasks.map(t=><Card key={t.id}><div className="row"><div><b>{t.room_name}</b><p>{t.task_type}</p><p className="muted">{formatDate(t.task_date)} · {t.assignee}</p>{canFinance&&<p className="muted">Cost: {money(t.cost)}</p>}</div><Button kind={t.status==='Done'?'light':'primary'} onClick={()=>toggleTask(t.id,t.status)}>{t.status==='Done'?'Done':'Mark Done'}</Button></div></Card>)}</>}
    {active==='reports'&&<><Section title="Reports & backup" icon={<BarChart3/>}/><Card><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}/><div className="actions"><Button onClick={exportMonthlyCSV}><Download size={16}/> Monthly CSV</Button><Button kind="light" onClick={exportBookingsCSV}><Download size={16}/> Bookings CSV</Button><Button kind="light" onClick={saveBackup}><Download size={16}/> Full Backup JSON</Button></div><p className="muted small">Backup is stored in Supabase and downloaded to your device.</p></Card><OccupancyDashboard rows={monthly}/>{monthly.map(r=><Card key={r.room_id}><div className="row"><div><b>{r.room}</b><p>Occupied nights: {r.occupied} / {r.totalDays}</p>{canFinance&&<p>Monthly income: {money(r.income)}</p>}</div><span className="pill">{r.occupancy}%</span></div><div className="bar"><i style={{width:`${Math.min(100,r.occupancy)}%`}}/></div></Card>)}</>}
    {active==='finance'&&<>{canFinance?<><Section title="Finance summary" icon={<Wallet/>}/><div className="grid"><Stat title="Received" value={money(stats.received)}/><Stat title="Expenses" value={money(stats.expense)}/><Stat title="Profit" value={money(stats.received-stats.expense)}/><Stat title="Unpaid" value={money(stats.unpaid)}/></div><Section title="Add expense" icon={<Plus/>}/><Card><input placeholder="Category" value={expense.category} onChange={e=>setExpense({...expense,category:e.target.value})}/><input placeholder="Amount" value={expense.amount} onChange={e=>setExpense({...expense,amount:e.target.value})}/><input type="date" value={expense.expense_date} onChange={e=>setExpense({...expense,expense_date:e.target.value})}/><input placeholder="Note" value={expense.note} onChange={e=>setExpense({...expense,note:e.target.value})}/><Button onClick={addExpense}>Save Expense</Button></Card><Section title="Revenue by source" icon={<BarChart3/>}/><SourceBars rows={sourceRows}/><Section title="Booking records" icon={<Plus/>}/>{bookings.map(b=><BookingCard key={b.id} b={b} canFinance={canFinance} canManage={canManage} onEdit={startEditBooking}/>)}</>:<p className="muted">Your role cannot view finance data.</p>}</>}
    {active==='rooms'&&<><Section title="Rooms" icon={<Building2/>}/>{rooms.map(r=><RoomCard key={r.id} room={r} booking={currentBookings.find(b=>b.room_id===r.id)} canFinance={canFinance} canManage={canManage} onEdit={startEditBooking}/>)}</>}
    {active==='repairs'&&<><Section title="Repair records" icon={<Wrench/>}/>{repairs.map(r=><Card key={r.id}><div className="row"><div><b>{r.room_name||'General'}</b><p>{r.issue}</p><p className="muted">{new Date(r.created_at).toLocaleString()}</p></div><Button kind="light" onClick={()=>solveRepair(r.id)}>{r.status}</Button></div></Card>)}</>}
    {active==='users'&&<><Section title="Users & permissions" icon={<Shield/>}/>{canUsers?profiles.map(p=><Card key={p.id}><div className="row"><div><b>{p.full_name||p.email}</b><p className="muted">{p.email}</p></div><select value={p.role} onChange={e=>updateRole(p.id,e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select></div></Card>):<p className="muted">Only Boss can manage user roles.</p>}</>}
  </main><nav>{tabs.map(t=>{ const I=t.icon; if(t.id==='users'&&!canUsers)return null; return <button key={t.id} onClick={()=>setActive(t.id)} className={active===t.id?'active':''}><I size={18}/><span>{t.label}</span></button>})}</nav></div>;
}

function RoomCard({room,booking,canFinance,canManage,onEdit}){ const unpaid=booking?Math.max(0,Number(booking.total||0)-Number(booking.paid||0)):0; return <Card><div className="row"><div><b>{room.name}</b><p className="muted">{booking?.guest||'No current guest'}</p>{booking?.guest_phone&&<a className="whatsapp" href={whatsappUrl(booking.guest_phone)} target="_blank"><Phone size={14}/> WhatsApp</a>}</div><span className={booking?'pill dark':'pill'}>{booking?'Occupied':'Available'}</span></div><p>Check-in: {formatDate(booking?.check_in)}</p><p>Check-out: {formatDate(booking?.check_out)}</p>{canFinance&&booking&&<p>Unpaid: {money(unpaid)}</p>}{booking&&canManage&&<div className="actions"><Button kind="light" onClick={()=>onEdit?.(booking)}><Edit3 size={16}/> Edit Booking</Button></div>}</Card> }
function BookingCard({b,canFinance,canManage,onEdit}){ const unpaid=Math.max(0,Number(b.total||0)-Number(b.paid||0)); return <Card><div className="row"><div><b>{b.room_name}</b><p>{b.guest} · {b.source}</p>{b.guest_phone&&<a className="whatsapp" href={whatsappUrl(b.guest_phone)} target="_blank"><Phone size={14}/> WhatsApp</a>}</div><span className="pill">{nights(b)} nights</span></div><p>{formatDate(b.check_in)} → {formatDate(b.check_out)}</p>{canFinance&&<p>Paid: {money(b.paid)} / Total: {money(b.total)} · Unpaid: {money(unpaid)}</p>}{canManage&&<div className="actions"><Button kind="light" onClick={()=>onEdit?.(b)}><Edit3 size={16}/> Edit</Button></div>}</Card> }
function OccupancyDashboard({rows}){ const avg=rows.length?Math.round(rows.reduce((s,r)=>s+r.occupancy,0)/rows.length):0; const best=[...rows].sort((a,b)=>b.occupancy-a.occupancy)[0]; return <Card><div className="grid mini"><Stat title="Average Occupancy" value={avg+'%'}/><Stat title="Best Room" value={best?.room||'-'}/></div>{rows.map(r=><div className="bar-row" key={r.room}><span>{r.room}</span><div className="bar"><i style={{width:`${Math.min(100,r.occupancy)}%`}}/></div><b>{r.occupancy}%</b></div>)}</Card> }
function LineChart({rows}){ const max=Math.max(1,...rows.map(r=>r.revenue)); const points=rows.map((r,i)=>`${(i/(rows.length-1))*100},${100-(r.revenue/max)*85}`).join(' '); return <Card><svg viewBox="0 0 100 110" className="chart"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3"/><line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeOpacity=".15"/></svg><div className="trend-labels">{rows.map(r=><span key={r.month}>{r.month.slice(5)}<br/>{money(r.revenue)}</span>)}</div></Card> }
function SourceBars({rows}){ if(!rows.length)return <Card><p className="muted">No revenue data yet.</p></Card>; const max=Math.max(...rows.map(r=>r.revenue)); return <Card>{rows.map(r=><div className="bar-row" key={r.source}><span>{r.source}</span><div className="bar"><i style={{width:`${(r.revenue/max)*100}%`}}/></div><b>{money(r.revenue)}</b></div>)}</Card> }

createRoot(document.getElementById('root')).render(<App/>);
