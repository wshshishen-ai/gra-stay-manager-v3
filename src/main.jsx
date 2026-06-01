import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { createClient } from '@supabase/supabase-js'
import { Home, Building2, Plus, BarChart3, Brush, Wrench, Wallet, Users, LogOut, Pencil, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import './style.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'rooms', label: 'Rooms', icon: Building2 },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'cleaning', label: 'Cleaning', icon: Brush },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'users', label: 'Users', icon: Users },
]

function money(n) { return '₦' + Number(n || 0).toLocaleString() }
function todayISO() { return new Date().toISOString().slice(0, 10) }
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(date.getTime())) return dateStr
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' })
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${weekday}, ${day}-${month}-${year}`
}
function monthKey(date = new Date()) { return typeof date === 'string' ? date.slice(0,7) : date.toISOString().slice(0,7) }
function monthLabel(month) { const [y,m]=month.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'short'}) }
function daysInMonth(month) { const [y,m]=month.split('-').map(Number); return new Date(y,m,0).getDate() }
function nightsBetween(start,end){ if(!start||!end)return 0; return Math.max(0, Math.round((new Date(end)-new Date(start))/86400000)) }
function bookingNights(b){ return Number(b?.qty || nightsBetween(b?.check_in || b?.checkIn, b?.check_out || b?.checkOut) || 0) }
function rangesOverlap(aStart,aEnd,bStart,bEnd){ if(!aStart||!aEnd||!bStart||!bEnd)return false; return aStart < bEnd && aEnd > bStart }
function dateInsideBooking(date,b){ if(!date||!b)return false; const s=b.check_in||b.checkIn; const e=b.check_out||b.checkOut; return date>=s && date<e }
function overlapDays(start,end,month){
  if(!start||!end)return 0
  const [y,m]=month.split('-').map(Number)
  const ms=new Date(y,m-1,1), me=new Date(y,m,1)
  const s=new Date(start+'T00:00:00'), e=new Date(end+'T00:00:00')
  const from=new Date(Math.max(s,ms)), to=new Date(Math.min(e,me))
  return Math.max(0, Math.round((to-from)/86400000))
}
function emptyBooking(){ return { room_id:'', guest:'', whatsapp:'', source:'Airbnb', check_in:todayISO(), check_out:'', qty:0, unit_price:'', total:'', paid:'', payment_status:'Paid' } }

function App(){
  const [session,setSession]=useState(null)
  const [authMode,setAuthMode]=useState('login')
  const [auth,setAuth]=useState({email:'',password:'',displayName:''})
  const [profile,setProfile]=useState(null)
  const [active,setActive]=useState('home')
  const [loading,setLoading]=useState(true)
  const [rooms,setRooms]=useState([])
  const [bookings,setBookings]=useState([])
  const [tasks,setTasks]=useState([])
  const [repairs,setRepairs]=useState([])
  const [expenses,setExpenses]=useState([])
  const [selectedMonth,setSelectedMonth]=useState(monthKey())
  const [newRoomName,setNewRoomName]=useState('')
  const [bookingForm,setBookingForm]=useState(emptyBooking())
  const [editingBooking,setEditingBooking]=useState(null)
  const [formError,setFormError]=useState('')
  const [expenseForm,setExpenseForm]=useState({date:todayISO(),category:'Daily Supplies',amount:'',remark:''})
  const [repairForm,setRepairForm]=useState({room_id:'',issue:'',cost:'0',repair_date:todayISO()})

  const canSeeFinance = ['Boss','Admin','boss','admin'].includes(profile?.role)

  useEffect(()=>{
    if(!supabase){ setLoading(false); return }
    supabase.auth.getSession().then(({data})=>{ setSession(data.session); setLoading(false) })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{ if(session) loadAll() },[session])

  async function loadAll(){
    setLoading(true)
    const user=session.user
    let {data: prof}=await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle()
    if(!prof){
      const role = user.email?.includes('lucy') || user.email?.includes('wshshishen') ? 'Boss' : 'Admin'
      await supabase.from('profiles').upsert({id:user.id,email:user.email,role,display_name:user.user_metadata?.display_name || ''})
      prof={id:user.id,email:user.email,role,display_name:user.user_metadata?.display_name || ''}
    }
    setProfile(prof)
    const [r,b,c,rep,e]=await Promise.all([
      supabase.from('rooms').select('*').order('created_at',{ascending:true}),
      supabase.from('bookings').select('*').order('check_in',{ascending:false}),
      supabase.from('cleaning_tasks').select('*').order('task_date',{ascending:true}),
      supabase.from('repairs').select('*').order('repair_date',{ascending:false}),
      supabase.from('expenses').select('*').order('expense_date',{ascending:false}),
    ])
    setRooms(r.data||[]); setBookings(b.data||[]); setTasks(c.data||[]); setRepairs(rep.data||[]); setExpenses(e.data||[])
    setLoading(false)
  }

  async function login(){
    if(!supabase) return alert('Missing Supabase settings')
    const {error}=await supabase.auth.signInWithPassword({email:auth.email,password:auth.password})
    if(error) alert(error.message)
  }
  async function signup(){
    const {error}=await supabase.auth.signUp({email:auth.email,password:auth.password,options:{data:{display_name:auth.displayName}}})
    if(error) alert(error.message); else alert('Account created. If email confirmation is enabled, check mailbox.')
  }
  async function logout(){ await supabase.auth.signOut() }

  const currentBookings=useMemo(()=>{ const t=todayISO(); return bookings.filter(b=>b.check_in<=t&&b.check_out>t) },[bookings])
  function roomStatus(room){ const b=currentBookings.find(x=>x.room_id===room.id); return b?{status:'Occupied',booking:b}:{status:'Available',booking:null} }

  const roomBookedPeriods=useMemo(()=>{
    if(!bookingForm.room_id)return []
    return bookings.filter(b=>b.room_id===bookingForm.room_id && b.id!==editingBooking?.id).sort((a,b)=>a.check_in.localeCompare(b.check_in))
  },[bookings,bookingForm.room_id,editingBooking])
  const bookingConflict=useMemo(()=>{
    if(!bookingForm.room_id||!bookingForm.check_in||!bookingForm.check_out)return null
    return roomBookedPeriods.find(b=>rangesOverlap(bookingForm.check_in,bookingForm.check_out,b.check_in,b.check_out))||null
  },[bookingForm,roomBookedPeriods])
  const checkInConflict=useMemo(()=>bookingForm.check_in?roomBookedPeriods.find(b=>dateInsideBooking(bookingForm.check_in,b))||null:null,[bookingForm.check_in,roomBookedPeriods])

  const stats=useMemo(()=>{
    const occupied=rooms.filter(r=>roomStatus(r).booking).length
    const available=rooms.length-occupied
    const unpaid=bookings.reduce((s,b)=>s+Math.max(0,Number(b.total||0)-Number(b.paid||0)),0)
    return {occupied,available,unpaid,pendingCleaning:tasks.filter(t=>t.status!=='Done').length}
  },[rooms,bookings,tasks])

  const financeSummary=useMemo(()=>{
    const year=selectedMonth.slice(0,4)
    const monthlyReceived=bookings.reduce((sum,b)=>{ const n=bookingNights(b); const o=overlapDays(b.check_in,b.check_out,selectedMonth); return sum+(n>0?Number(b.paid||0)*(o/n):0) },0)
    const yearReceived=bookings.reduce((sum,b)=>String(b.check_in||'').slice(0,4)===year?sum+Number(b.paid||0):sum,0)
    const mexp=expenses.filter(e=>String(e.expense_date||'').slice(0,7)===selectedMonth)
    const yexp=expenses.filter(e=>String(e.expense_date||'').slice(0,4)===year)
    const sumCat=(list,cat)=>list.reduce((s,e)=>e.category===cat?s+Number(e.amount||0):s,0)
    const mclean=tasks.filter(t=>String(t.task_date||'').slice(0,7)===selectedMonth).reduce((s,t)=>s+Number(t.cost||0),0)
    const yclean=tasks.filter(t=>String(t.task_date||'').slice(0,4)===year).reduce((s,t)=>s+Number(t.cost||0),0)
    const monthDailySupplies=sumCat(mexp,'Daily Supplies'), monthCleaning=sumCat(mexp,'Cleaning')+mclean, monthRepairs=sumCat(mexp,'Repairs')
    const yearDailySupplies=sumCat(yexp,'Daily Supplies'), yearCleaning=sumCat(yexp,'Cleaning')+yclean, yearRepairs=sumCat(yexp,'Repairs')
    return {year,monthlyReceived,yearReceived,monthDailySupplies,monthCleaning,monthRepairs,monthNet:monthlyReceived-monthDailySupplies-monthCleaning-monthRepairs,yearDailySupplies,yearCleaning,yearRepairs,yearNet:yearReceived-yearDailySupplies-yearCleaning-yearRepairs}
  },[bookings,expenses,tasks,selectedMonth])

  const monthlyReport=useMemo(()=>rooms.map(room=>{
    const totalDays=daysInMonth(selectedMonth)
    const rb=bookings.filter(b=>b.room_id===room.id)
    const occupiedNights=rb.reduce((s,b)=>s+overlapDays(b.check_in,b.check_out,selectedMonth),0)
    const income=rb.reduce((s,b)=>{ const n=bookingNights(b); const o=overlapDays(b.check_in,b.check_out,selectedMonth); return s+(n>0?Number(b.paid||0)*(o/n):0)},0)
    return {roomName:room.name,occupiedNights,totalDays,occupancyRate:totalDays?Math.round(occupiedNights/totalDays*100):0,income}
  }),[rooms,bookings,selectedMonth])

  function setFormSmart(patch){
    setFormError('')
    setBookingForm(prev=>{
      const next={...prev,...patch}
      const qty=nightsBetween(next.check_in,next.check_out)
      next.qty=qty
      if('unit_price' in patch){ const unit=Number(patch.unit_price||0); if(qty>0&&unit>0) next.total=String(Math.round(qty*unit)); if(next.payment_status==='Paid') next.paid=next.total }
      if('total' in patch){ const total=Number(patch.total||0); if(qty>0&&total>0) next.unit_price=String(Math.round(total/qty)); if(next.payment_status==='Paid') next.paid=patch.total }
      if('check_in' in patch || 'check_out' in patch){ const unit=Number(next.unit_price||0), total=Number(next.total||0); if(unit>0&&qty>0) next.total=String(Math.round(unit*qty)); else if(total>0&&qty>0) next.unit_price=String(Math.round(total/qty)); if(next.payment_status==='Paid') next.paid=next.total }
      if('payment_status' in patch){ if(patch.payment_status==='Paid') next.paid=next.total||'0'; if(patch.payment_status==='Unpaid') next.paid='0' }
      return next
    })
  }

  async function addRoom(){ if(!newRoomName.trim())return; const {error}=await supabase.from('rooms').insert({name:newRoomName.trim(),note:'New room'}); if(error) alert(error.message); setNewRoomName(''); loadAll() }
  async function saveBooking(){
    const room=rooms.find(r=>r.id===bookingForm.room_id)
    if(!room) return setFormError('Please select a room first.')
    if(!bookingForm.guest.trim()) return setFormError('Please enter guest name.')
    if(!bookingForm.check_out) return setFormError('Please select check-out date.')
    if(bookingForm.check_out<=bookingForm.check_in) return setFormError('Check-out date must be later than check-in date.')
    if(bookingConflict) return setFormError(`Date conflict: this room is already booked from ${formatDate(bookingConflict.check_in)} to ${formatDate(bookingConflict.check_out)}.`)
    const payload={room_id:bookingForm.room_id,room_name:room.name,guest:bookingForm.guest,whatsapp:bookingForm.whatsapp,source:bookingForm.source,check_in:bookingForm.check_in,check_out:bookingForm.check_out,qty:nightsBetween(bookingForm.check_in,bookingForm.check_out),unit_price:Number(bookingForm.unit_price||0),total:Number(bookingForm.total||0),paid:Number(bookingForm.paid||0),payment_status:bookingForm.payment_status}
    const res=editingBooking?await supabase.from('bookings').update(payload).eq('id',editingBooking.id):await supabase.from('bookings').insert(payload)
    if(res.error) return alert(res.error.message)
    if(!editingBooking) await supabase.from('cleaning_tasks').insert({room_id:room.id,room:room.name,type:'Cleaning + Bedding',task_date:bookingForm.check_out,assignee:'Cleaner',status:'Pending',cost:8000})
    setBookingForm(emptyBooking()); setEditingBooking(null); setActive('home'); loadAll()
  }
  function startEditBooking(b){ setEditingBooking(b); setBookingForm({...b,unit_price:String(b.unit_price||Math.round(Number(b.total||0)/Math.max(1,bookingNights(b)))),total:String(b.total||0),paid:String(b.paid||0),qty:bookingNights(b)}); setActive('add') }
  async function addExpense(){ if(!expenseForm.amount)return; const {error}=await supabase.from('expenses').insert({expense_date:expenseForm.date,category:expenseForm.category,amount:Number(expenseForm.amount),remark:expenseForm.remark}); if(error) alert(error.message); setExpenseForm({date:todayISO(),category:'Daily Supplies',amount:'',remark:''}); loadAll() }
  async function addRepair(){ if(!repairForm.issue)return; const room=rooms.find(r=>r.id===repairForm.room_id); const {error}=await supabase.from('repairs').insert({room_id:repairForm.room_id||null,room:room?.name||'',issue:repairForm.issue,cost:Number(repairForm.cost||0),repair_date:repairForm.repair_date,status:'Pending'}); if(error) alert(error.message); setRepairForm({room_id:'',issue:'',cost:'0',repair_date:todayISO()}); loadAll() }

  if(loading) return <div className="center">Loading...</div>
  if(!supabase) return <div className="center card">Missing Supabase settings. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.</div>
  if(!session) return <Auth auth={auth} setAuth={setAuth} authMode={authMode} setAuthMode={setAuthMode} login={login} signup={signup}/>

  return <div className="app">
    <header><div><h1>GRA Stay Manager</h1><p>{profile?.email || session.user.email} · {profile?.role || 'Admin'}</p></div><button className="ghost" onClick={logout}><LogOut size={18}/></button></header>
    <main>
      {active==='home'&&<section className="stack"><Title text="Room Status"/>{rooms.map(r=><RoomCard key={r.id} room={r} statusInfo={roomStatus(r)} canSeeFinance={canSeeFinance} onEdit={startEditBooking}/>) }<div className="grid2"><Stat title="Occupied" value={stats.occupied}/><Stat title="Available" value={stats.available}/><Stat title="Pending Cleaning" value={stats.pendingCleaning}/><Stat title="Unpaid" value={canSeeFinance?money(stats.unpaid):'Hidden'}/></div></section>}
      {active==='rooms'&&<section className="stack"><Title text="Add Room"/><div className="card stack"><input placeholder="Room name" value={newRoomName} onChange={e=>setNewRoomName(e.target.value)}/><button onClick={addRoom}>Add Room</button></div><Title text="Room List"/>{rooms.map(r=><RoomCard key={r.id} room={r} statusInfo={roomStatus(r)} canSeeFinance={canSeeFinance} onEdit={startEditBooking}/>)}</section>}
      {active==='add'&&<section className="stack"><Title text={editingBooking?'Edit Booking':'Add Booking'}/><div className="card stack"><select value={bookingForm.room_id} onChange={e=>setFormSmart({room_id:e.target.value})}><option value="">Select room</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>{roomBookedPeriods.length>0&&<div className="warn"><b>Booked dates for this room:</b>{roomBookedPeriods.map(b=><p key={b.id}>{formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.guest}</p>)}</div>}<input placeholder="Guest name" value={bookingForm.guest} onChange={e=>setFormSmart({guest:e.target.value})}/><input placeholder="Guest WhatsApp number" value={bookingForm.whatsapp} onChange={e=>setFormSmart({whatsapp:e.target.value})}/><select value={bookingForm.source} onChange={e=>setFormSmart({source:e.target.value})}><option>Airbnb</option><option>Booking.com</option><option>Walk-in</option><option>Referral</option><option>Other</option></select><div className="grid2"><label>Check-in<input type="date" className={checkInConflict?'inputError':''} value={bookingForm.check_in} onChange={e=>setFormSmart({check_in:e.target.value})}/></label><label>Check-out<input type="date" min={bookingForm.check_in||todayISO()} className={bookingConflict?'inputError':''} value={bookingForm.check_out} onChange={e=>setFormSmart({check_out:e.target.value})}/></label></div>{checkInConflict&&<p className="error">This check-in date is already booked: {formatDate(checkInConflict.check_in)} → {formatDate(checkInConflict.check_out)}.</p>}{bookingConflict&&<p className="error">Date conflict. This room is already booked from {formatDate(bookingConflict.check_in)} to {formatDate(bookingConflict.check_out)}.</p>}{formError&&<div className="errorBox">{formError}</div>}<div className="grid3"><label>Qty / Nights<input value={bookingForm.qty||0} readOnly/></label><label>Unit Price<input placeholder="Per night" value={bookingForm.unit_price} onChange={e=>setFormSmart({unit_price:e.target.value})}/></label><label>Total<input placeholder="Total" value={bookingForm.total} onChange={e=>setFormSmart({total:e.target.value})}/></label></div>{canSeeFinance&&<><select value={bookingForm.payment_status} onChange={e=>setFormSmart({payment_status:e.target.value})}><option>Paid</option><option>Partial</option><option>Unpaid</option></select><div className="grid2"><label>Paid Amount<input value={bookingForm.paid} onChange={e=>setFormSmart({paid:e.target.value,payment_status:Number(e.target.value||0)>=Number(bookingForm.total||0)?'Paid':'Partial'})}/></label><label>Unpaid<input readOnly value={Math.max(0,Number(bookingForm.total||0)-Number(bookingForm.paid||0))}/></label></div></>}<div className="row"><button disabled={!!bookingConflict} onClick={saveBooking}>{editingBooking?'Update Booking':'Save Booking'}</button>{editingBooking&&<button className="secondary" onClick={()=>{setEditingBooking(null);setBookingForm(emptyBooking())}}>Cancel</button>}</div></div><Title text="Booking Records"/>{bookings.map(b=><BookingCard key={b.id} booking={b} canSeeFinance={canSeeFinance} onEdit={startEditBooking}/>)}</section>}
      {active==='reports'&&<section className="stack"><Title text={`${monthLabel(selectedMonth)} Occupancy Dashboard`}/><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}/>{monthlyReport.map(r=><div className="card" key={r.roomName}><div className="between"><b>{r.roomName}</b><span className="pill">{r.occupancyRate}%</span></div><p>{monthLabel(selectedMonth)} occupied nights: {r.occupiedNights} / {r.totalDays}</p>{canSeeFinance&&<p>{monthLabel(selectedMonth)} income: {money(Math.round(r.income))}</p>}<div className="bar"><span style={{width:`${Math.min(100,r.occupancyRate)}%`}}/></div></div>)}</section>}
      {active==='cleaning'&&<section className="stack"><Title text="Cleaning Tasks"/>{tasks.map(t=><div className="card between" key={t.id}><div><b>{t.room} · {t.type}</b><p>{formatDate(t.task_date)} · {t.assignee}</p>{canSeeFinance&&<p>Cost: {money(t.cost)}</p>}</div><span className="pill light">{t.status}</span></div>)}</section>}
      {active==='repairs'&&<section className="stack"><Title text="Repair Records"/><div className="card stack"><select value={repairForm.room_id} onChange={e=>setRepairForm({...repairForm,room_id:e.target.value})}><option value="">Select room</option>{rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input placeholder="Repair issue" value={repairForm.issue} onChange={e=>setRepairForm({...repairForm,issue:e.target.value})}/><input type="date" value={repairForm.repair_date} onChange={e=>setRepairForm({...repairForm,repair_date:e.target.value})}/><input placeholder="Cost" value={repairForm.cost} onChange={e=>setRepairForm({...repairForm,cost:e.target.value})}/><button onClick={addRepair}>Save Repair</button></div>{repairs.map(r=><div className="card" key={r.id}><b>{r.room || 'No room'} · {r.issue}</b><p>{formatDate(r.repair_date)} · {money(r.cost)}</p></div>)}</section>}
      {active==='finance'&&<section className="stack"><Title text="Finance Summary"/>{canSeeFinance?<><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}/><div className="card stack"><h3>{monthLabel(selectedMonth)} {selectedMonth.slice(0,4)} Finance Summary</h3><FinanceRow label="Received" value={financeSummary.monthlyReceived} strong/><hr/><b>Expenses</b><FinanceRow label="Daily Supplies" value={financeSummary.monthDailySupplies}/><FinanceRow label="Cleaning" value={financeSummary.monthCleaning}/><FinanceRow label="Repairs" value={financeSummary.monthRepairs}/><hr/><FinanceRow label="Net Income" value={financeSummary.monthNet} strong/></div><div className="card stack"><h3>Year {financeSummary.year} Summary</h3><FinanceRow label="Total Received" value={financeSummary.yearReceived} strong/><hr/><FinanceRow label="Daily Supplies" value={financeSummary.yearDailySupplies}/><FinanceRow label="Cleaning" value={financeSummary.yearCleaning}/><FinanceRow label="Repairs" value={financeSummary.yearRepairs}/><hr/><FinanceRow label="Net Income" value={financeSummary.yearNet} strong/></div><div className="card stack"><h3>Add Expense</h3><input type="date" value={expenseForm.date} onChange={e=>setExpenseForm({...expenseForm,date:e.target.value})}/><select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm,category:e.target.value})}><option>Daily Supplies</option><option>Cleaning</option><option>Repairs</option></select><input placeholder="Amount" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm,amount:e.target.value})}/><input placeholder="Remark" value={expenseForm.remark} onChange={e=>setExpenseForm({...expenseForm,remark:e.target.value})}/><button onClick={addExpense}>Save Expense</button></div><Title text="Expense Records"/>{expenses.map(e=><div className="card between" key={e.id}><div><b>{e.category}</b><p>{formatDate(e.expense_date)} · {e.remark||'No remark'}</p></div><b>{money(e.amount)}</b></div>)}</>:<p>Your role cannot view finance data.</p>}</section>}
      {active==='users'&&<section className="stack"><Title text="Users"/><div className="card"><b>{profile?.email}</b><p>Role: {profile?.role}</p></div></section>}
    </main>
    <nav>{tabs.map(t=>{const Icon=t.icon; return <button key={t.id} onClick={()=>setActive(t.id)} className={active===t.id?'active':''}><Icon size={18}/><span>{t.label}</span></button>})}</nav>
  </div>
}

function Auth({auth,setAuth,authMode,setAuthMode,login,signup}){return <div className="center"><div className="auth card stack"><h1>GRA Stay Manager V5.2</h1><p>Secure mobile room management for Airbnb / Booking operations.</p>{authMode==='signup'&&<input placeholder="Display name" value={auth.displayName} onChange={e=>setAuth({...auth,displayName:e.target.value})}/>}<input placeholder="Email" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})}/><input type="password" placeholder="Password" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})}/><div className="row"><button onClick={authMode==='login'?login:signup}>{authMode==='login'?'Login':'Create account'}</button><button className="link" onClick={()=>setAuthMode(authMode==='login'?'signup':'login')}>{authMode==='login'?'Create new account':'Back to login'}</button></div></div></div>}
function Title({text}){return <h2 className="title"><AlertCircle size={16}/>{text}</h2>}
function Stat({title,value}){return <div className="card"><p className="muted">{title}</p><h2>{value}</h2></div>}
function FinanceRow({label,value,strong}){return <div className="between"><span className={strong?'bold':''}>{label}</span><span className={strong?'bold big':''}>{money(Math.round(value||0))}</span></div>}
function RoomCard({room,statusInfo,canSeeFinance,onEdit}){const b=statusInfo.booking; const qty=b?bookingNights(b):0; const unit=b?.unit_price || (qty>0?Math.round(Number(b?.total||0)/qty):0); const unpaid=b?Math.max(0,Number(b.total||0)-Number(b.paid||0)):0; return <div className="card stack"><div className="between"><div><h3>{room.name}</h3><p>{b?.guest||'No current guest'}</p></div><span className={b?'pill':'pill light'}>{b?'Occupied':'Available'}</span></div>{b?<div><p>Check-in: {formatDate(b.check_in)}</p><p>Check-out: {formatDate(b.check_out)}</p><p>Qty: {qty} nights</p>{canSeeFinance&&<><p>Unit price: {money(unit)} / night</p><p>Total: {money(b.total)}</p><p>Paid: {money(b.paid)} · Unpaid: {money(unpaid)}</p></>}</div>:<p>Available for new booking</p>}<div className="between"><small><CheckCircle2 size={12}/> {room.note||'Ready'}</small>{b&&<button className="secondary small" onClick={()=>onEdit(b)}><Pencil size={14}/> Edit</button>}</div></div>}
function BookingCard({booking,canSeeFinance,onEdit}){const qty=bookingNights(booking); const unit=booking.unit_price || (qty>0?Math.round(Number(booking.total||0)/qty):0); const unpaid=Math.max(0,Number(booking.total||0)-Number(booking.paid||0)); return <div className="card stack"><div className="between"><div><b>{booking.room_name}</b><p>{booking.guest} · {booking.source}</p></div><span className="pill light">{qty} nights</span></div><p>{formatDate(booking.check_in)} → {formatDate(booking.check_out)}</p>{canSeeFinance&&<><p>Unit: {money(unit)} / night</p><p>Paid: {money(booking.paid)} / Total: {money(booking.total)}</p><p>Status: {booking.payment_status || (unpaid<=0?'Paid':'Partial')}</p><p>Unpaid: {money(unpaid)}</p></>}<button className="secondary small" onClick={()=>onEdit(booking)}><Pencil size={14}/> Edit</button></div>}

createRoot(document.getElementById('root')).render(<App />)
