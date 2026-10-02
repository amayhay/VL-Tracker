const leaveData=[
 {employee:"Alex",start:"2026-10-10",end:"2026-10-12",status:"Approve"},
 {employee:"Juan",start:"2026-10-15",end:"2026-10-17",status:"Waiting Approval"},
 {employee:"John",start:"2026-10-20",end:"2026-10-22",status:"Disapprove"}
];
let currentMonth=new Date(2026,9,1);
const pages=["dashboard","request","calendar","requests"];
const titles={dashboard:"Dashboard",request:"Request VL",calendar:"Team Calendar",requests:"My Requests"};

document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
function showPage(page){
 pages.forEach(p=>document.getElementById(p).classList.toggle("active",p===page));
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 document.getElementById("pageTitle").textContent=titles[page];
 if(page==="calendar")renderCalendar();
 if(page==="requests")renderRequests();
}
function statusClass(status){
 return status==="Approve"?"approved":status==="Disapprove"?"rejected":"pending";
}
function dateObj(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)}
function overlaps(a,b,c,d){return dateObj(a)<=dateObj(d)&&dateObj(c)<=dateObj(b)}
function renderRequests(){
 const tbody=document.getElementById("requestTable");
 tbody.innerHTML=leaveData.map(x=>`<tr><td><strong>${x.employee}</strong></td><td>${formatDate(x.start)}</td><td>${formatDate(x.end)}</td><td><span class="status ${statusClass(x.status)}">${x.status}</span></td></tr>`).join("");
 document.getElementById("pendingCount").textContent=leaveData.filter(x=>x.status==="Waiting Approval").length;
}
function formatDate(s){return dateObj(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
function renderCalendar(){
 const y=currentMonth.getFullYear(),m=currentMonth.getMonth();
 document.getElementById("monthLabel").textContent=currentMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"});
 const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate(), prevDays=new Date(y,m,0).getDate();
 const grid=document.getElementById("calendarGrid");grid.innerHTML="";
 for(let i=0;i<42;i++){
   let dayNum=i-first+1, cellDate;
   const cell=document.createElement("div");cell.className="day";
   if(dayNum<1){cell.classList.add("other");cellDate=new Date(y,m-1,prevDays+dayNum);}
   else if(dayNum>days){cell.classList.add("other");cellDate=new Date(y,m+1,dayNum-days);}
   else cellDate=new Date(y,m,dayNum);
   cell.innerHTML=`<div class="day-number">${cellDate.getDate()}</div>`;
   const iso=`${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;
   leaveData.filter(x=>iso>=x.start&&iso<=x.end).forEach(x=>{
     const ev=document.createElement("div");ev.className=`event ${statusClass(x.status)}`;ev.textContent=`${x.employee} • ${x.status}`;cell.appendChild(ev);
   });
   grid.appendChild(cell);
 }
}
function changeMonth(delta){currentMonth.setMonth(currentMonth.getMonth()+delta);renderCalendar()}
document.getElementById("vlForm").addEventListener("submit",e=>{
 e.preventDefault();
 const employee=document.getElementById("employeeName").value.trim();
 const start=document.getElementById("startDate").value;
 const end=document.getElementById("endDate").value;
 const box=document.getElementById("conflictBox");
 if(!start||!end||dateObj(end)<dateObj(start)){box.classList.remove("hidden");box.textContent="Please enter a valid date range.";return}
 const conflicts=leaveData.filter(x=>overlaps(start,end,x.start,x.end)&&x.status!=="Disapprove");
 if(conflicts.length){
   box.classList.remove("hidden");
   box.textContent="Conflict warning: "+conflicts.map(x=>`${x.employee} (${formatDate(x.start)}–${formatDate(x.end)})`).join(", ")+" has overlapping leave.";
 }else box.classList.add("hidden");
 leaveData.push({employee,start,end,status:"Waiting Approval"});
 alert("VL request submitted. Status: Waiting Approval");
 e.target.reset();document.getElementById("employeeName").value=employee||"Alex";showPage("requests");
});
renderRequests();renderCalendar();
