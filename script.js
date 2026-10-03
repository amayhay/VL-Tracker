const leaveData=[
 {employee:"Alex",start:"2026-10-10",end:"2026-10-12",status:"Approve"},
 {employee:"Juan",start:"2026-10-15",end:"2026-10-17",status:"Waiting Approval"},
 {employee:"John",start:"2026-10-20",end:"2026-10-22",status:"Disapprove"}
];
let currentMonth=new Date(2026,9,1);
const titles={dashboard:"Dashboard",request:"Request VL",calendar:"Team Calendar",manager:"Manager Dashboard"};
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
function showPage(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 document.getElementById("pageTitle").textContent=titles[page];
 if(page==="calendar")renderCalendar();
 if(page==="manager"){renderManager();renderManagerCalendar();}
 if(page==="dashboard")renderDashboardCalendar();
}
function dateObj(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function formatDate(s){return dateObj(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
function statusClass(s){return s==="Approve"?"approved":s==="Disapprove"?"rejected":"pending"}
function overlaps(a,b,c,d){return dateObj(a)<=dateObj(d)&&dateObj(c)<=dateObj(b)}
function updateStats(){
 const approved=leaveData.filter(x=>x.employee==="Alex"&&x.status==="Approve");
 let days=0;
 approved.forEach(x=>days+=Math.round((dateObj(x.end)-dateObj(x.start))/86400000)+1);
 document.getElementById("approvedDays").textContent=days;
 document.getElementById("availableBalance").textContent=Math.max(0,15-days);
}
function renderManager(){
 const tbody=document.getElementById("managerTable");
 tbody.innerHTML=leaveData.map((x,i)=>`<tr><td><strong>${x.employee}</strong></td><td>${formatDate(x.start)}</td><td>${formatDate(x.end)}</td><td><span class="status ${statusClass(x.status)}">${x.status}</span></td><td><select class="status-select" onchange="changeStatus(${i},this.value)"><option ${x.status==="Waiting Approval"?"selected":""}>Waiting Approval</option><option ${x.status==="Approve"?"selected":""}>Approve</option><option ${x.status==="Disapprove"?"selected":""}>Disapprove</option></select></td></tr>`).join("");
}
function changeStatus(i,status){leaveData[i].status=status;renderManager();renderManagerCalendar();renderCalendar();renderDashboardCalendar();updateStats()}
function buildMini(targetId){
 const target=document.getElementById(targetId); if(!target)return;
 target.innerHTML="";
 const y=currentMonth.getFullYear(),m=currentMonth.getMonth(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
 for(let i=0;i<first;i++)target.insertAdjacentHTML("beforeend",'<div class="mini-day empty"></div>');
 for(let d=1;d<=days;d++){
  const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const events=leaveData.filter(x=>iso>=x.start&&iso<=x.end);
  target.insertAdjacentHTML("beforeend",`<div class="mini-day"><b>${d}</b>${events.map(x=>`<span class="mini-event ${statusClass(x.status)}">${x.employee}</span>`).join("")}</div>`);
 }
}
function renderDashboardCalendar(){buildMini("dashboardCalendar")}
function renderManagerCalendar(){buildMini("managerCalendar")}
function renderCalendar(){
 const y=currentMonth.getFullYear(),m=currentMonth.getMonth();
 document.getElementById("monthLabel").textContent=currentMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"});
 const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate(),grid=document.getElementById("calendarGrid");
 grid.innerHTML="";
 for(let i=0;i<42;i++){
  let n=i-first+1,cellDate,other=false;
  if(n<1){cellDate=new Date(y,m-1,prev+n);other=true}else if(n>days){cellDate=new Date(y,m+1,n-days);other=true}else cellDate=new Date(y,m,n);
  const cell=document.createElement("div");cell.className="day"+(other?" other":"");
  cell.innerHTML=`<div class="day-number">${cellDate.getDate()}</div>`;
  const iso=`${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;
  leaveData.filter(x=>iso>=x.start&&iso<=x.end).forEach(x=>{const e=document.createElement("div");e.className=`event ${statusClass(x.status)}`;e.textContent=`${x.employee} • ${x.status}`;cell.appendChild(e)});
  grid.appendChild(cell);
 }
}
function changeMonth(delta){currentMonth.setMonth(currentMonth.getMonth()+delta);renderCalendar();renderDashboardCalendar();renderManagerCalendar()}
document.getElementById("vlForm").addEventListener("submit",e=>{
 e.preventDefault();
 const employee=document.getElementById("employeeName").value.trim(),start=document.getElementById("startDate").value,end=document.getElementById("endDate").value,box=document.getElementById("conflictBox");
 if(!start||!end||dateObj(end)<dateObj(start)){box.classList.remove("hidden");box.textContent="Please enter a valid date range.";return}
 const conflicts=leaveData.filter(x=>overlaps(start,end,x.start,x.end)&&x.status!=="Disapprove");
 if(conflicts.length){box.classList.remove("hidden");box.textContent="Conflict warning: "+conflicts.map(x=>`${x.employee} (${formatDate(x.start)}–${formatDate(x.end)})`).join(", ")+" has overlapping leave."}else box.classList.add("hidden");
 leaveData.push({employee,start,end,status:"Waiting Approval"});
 alert("VL request submitted. Status: Waiting Approval");
 e.target.reset();document.getElementById("employeeName").value="Alex";
 renderManager();renderCalendar();renderDashboardCalendar();renderManagerCalendar();updateStats();showPage("manager");
});
renderManager();renderCalendar();renderDashboardCalendar();renderManagerCalendar();updateStats();
