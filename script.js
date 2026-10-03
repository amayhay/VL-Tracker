// ============================================================
// MANAGER PASSWORD
// CHANGE THIS ONE LINE TO CHANGE THE PASSWORD
// ============================================================
const MANAGER_PASSWORD = "1234";

let employees = [
  {name:"Alex", balance:15},
  {name:"Juan", balance:15},
  {name:"John", balance:15}
];

const leaveData = [
  {employee:"Alex", start:"2026-10-10", end:"2026-10-12", status:"Approve"},
  {employee:"Juan", start:"2026-10-15", end:"2026-10-17", status:"Waiting Approval"},
  {employee:"John", start:"2026-10-20", end:"2026-10-22", status:"Disapprove"}
];

let currentMonth = new Date(2026,9,1);
let managerUnlocked = false;

const titles = {
  dashboard:"Dashboard",
  request:"Request VL",
  calendar:"Team Calendar",
  manager:"Manager Dashboard"
};

document.querySelectorAll(".nav-btn").forEach(btn =>
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    if(page === "manager" && !managerUnlocked){
      openManagerLogin();
      return;
    }
    showPage(page);
  })
);

function showPage(page){
  document.querySelectorAll(".page").forEach(p =>
    p.classList.toggle("active", p.id === page)
  );
  document.querySelectorAll(".nav-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.page === page)
  );
  document.getElementById("pageTitle").textContent = titles[page];

  if(page === "dashboard") renderDashboard();
  if(page === "calendar") renderCalendar();
  if(page === "manager"){
    renderManager();
    renderManagerCalendar();
    renderEmployeeManager();
  }
}

function dateObj(s){
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y,m-1,d);
}

function formatDate(s){
  return dateObj(s).toLocaleDateString("en-US", {
    month:"short", day:"numeric", year:"numeric"
  });
}

function statusClass(s){
  return s === "Approve" ? "approved" :
         s === "Disapprove" ? "rejected" : "pending";
}

function leaveDays(start,end){
  return Math.floor((dateObj(end)-dateObj(start))/86400000)+1;
}

function overlaps(a,b,c,d){
  return dateObj(a) <= dateObj(d) && dateObj(c) <= dateObj(b);
}

function renderDashboard(){
  const tbody = document.getElementById("employeeTable");

  tbody.innerHTML = employees.map(emp => {
    const approved = leaveData
      .filter(x => x.employee === emp.name && x.status === "Approve")
      .reduce((sum,x) => sum + leaveDays(x.start,x.end),0);

    const available = Math.max(0, emp.balance - approved);

    return `
      <tr>
        <td><strong>${emp.name}</strong></td>
        <td>${approved}</td>
        <td>${available}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("totalEmployees").textContent = employees.length;

  document.getElementById("totalApproved").textContent =
    leaveData
      .filter(x => x.status === "Approve")
      .reduce((sum,x) => sum + leaveDays(x.start,x.end),0);

  document.getElementById("totalPending").textContent =
    leaveData.filter(x => x.status === "Waiting Approval").length;

  renderDashboardCalendar();
}

function renderManager(){
  const tbody = document.getElementById("managerTable");

  tbody.innerHTML = leaveData.map((x,i) => `
    <tr>
      <td><strong>${x.employee}</strong></td>
      <td>${formatDate(x.start)}</td>
      <td>${formatDate(x.end)}</td>
      <td><span class="status ${statusClass(x.status)}">${x.status}</span></td>
      <td>
        <div class="manager-actions">
          <select class="status-select" onchange="changeStatus(${i},this.value)">
            <option ${x.status==="Waiting Approval"?"selected":""}>Waiting Approval</option>
            <option ${x.status==="Approve"?"selected":""}>Approve</option>
            <option ${x.status==="Disapprove"?"selected":""}>Disapprove</option>
          </select>
          <button class="danger-btn" onclick="deleteRequest(${i})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  renderEmployeeManager();
}

function changeStatus(i,status){
  leaveData[i].status = status;
  renderManager();
  renderManagerCalendar();
  renderCalendar();
  renderDashboard();
}


function deleteRequest(i){
  const request = leaveData[i];
  if(!request) return;

  if(!confirm(`Delete the VL request for ${request.employee} (${formatDate(request.start)} – ${formatDate(request.end)})?`))
    return;

  leaveData.splice(i,1);

  renderManager();
  renderManagerCalendar();
  renderCalendar();
  renderDashboard();
}

function renderEmployeeManager(){
  const tbody = document.getElementById("employeeManagerTable");
  if(!tbody) return;

  tbody.innerHTML = employees.map((emp,i) => `
    <tr>
      <td><strong>${emp.name}</strong></td>
      <td>
        <div class="manager-actions">
          <input class="employee-balance-input" id="balance-${i}" type="number" min="0" value="${emp.balance}">
          <button class="small-btn" onclick="saveEmployeeBalance(${i})">Save</button>
        </div>
      </td>
      <td>
        <button class="danger-btn" onclick="deleteEmployee(${i})">Delete Employee</button>
      </td>
    </tr>
  `).join("");
}

function saveEmployeeBalance(i){
  const input = document.getElementById(`balance-${i}`);
  const value = Number(input.value);

  if(!Number.isFinite(value) || value < 0){
    alert("Please enter a valid VL balance.");
    return;
  }

  employees[i].balance = value;
  renderEmployeeManager();
  renderDashboard();
}

function deleteEmployee(i){
  const employee = employees[i];
  if(!employee) return;

  if(!confirm(`Delete employee "${employee.name}"? This will also remove their plotted VL requests.`))
    return;

  employees.splice(i,1);

  for(let j=leaveData.length-1;j>=0;j--){
    if(leaveData[j].employee === employee.name)
      leaveData.splice(j,1);
  }

  renderEmployeeManager();
  renderManager();
  renderManagerCalendar();
  renderCalendar();
  renderDashboard();
}

function buildMini(targetId){
  const target = document.getElementById(targetId);
  if(!target) return;

  target.innerHTML = "";

  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();
  const first = new Date(y,m,1).getDay();
  const days = new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++)
    target.insertAdjacentHTML("beforeend",'<div class="mini-day empty"></div>');

  for(let d=1;d<=days;d++){
    const iso = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const events = leaveData.filter(x => iso >= x.start && iso <= x.end);

    target.insertAdjacentHTML("beforeend",`
      <div class="mini-day">
        <b>${d}</b>
        ${events.map(x => `<span class="mini-event ${statusClass(x.status)}">${x.employee}</span>`).join("")}
      </div>
    `);
  }
}

function renderDashboardCalendar(){ buildMini("dashboardCalendar"); }
function renderManagerCalendar(){ buildMini("managerCalendar"); }

function renderCalendar(){
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();

  document.getElementById("monthLabel").textContent =
    currentMonth.toLocaleDateString("en-US",{month:"long",year:"numeric"});

  const first = new Date(y,m,1).getDay();
  const days = new Date(y,m+1,0).getDate();
  const prev = new Date(y,m,0).getDate();
  const grid = document.getElementById("calendarGrid");

  grid.innerHTML = "";

  for(let i=0;i<42;i++){
    let n = i-first+1;
    let cellDate, other=false;

    if(n<1){
      cellDate = new Date(y,m-1,prev+n);
      other=true;
    } else if(n>days){
      cellDate = new Date(y,m+1,n-days);
      other=true;
    } else {
      cellDate = new Date(y,m,n);
    }

    const cell = document.createElement("div");
    cell.className = "day" + (other ? " other" : "");
    cell.innerHTML = `<div class="day-number">${cellDate.getDate()}</div>`;

    const iso =
      `${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;

    leaveData
      .filter(x => iso >= x.start && iso <= x.end)
      .forEach(x => {
        const e = document.createElement("div");
        e.className = `event ${statusClass(x.status)}`;
        e.textContent = `${x.employee} • ${x.status}`;
        cell.appendChild(e);
      });

    grid.appendChild(cell);
  }
}

function changeMonth(delta){
  currentMonth.setMonth(currentMonth.getMonth()+delta);
  renderCalendar();
  renderDashboardCalendar();
  if(managerUnlocked) renderManagerCalendar();
}

document.getElementById("vlForm").addEventListener("submit", e => {
  e.preventDefault();

  const employee = document.getElementById("employeeName").value.trim();
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const box = document.getElementById("conflictBox");

  if(!employee || !start || !end || dateObj(end) < dateObj(start)){
    box.classList.remove("hidden");
    box.textContent = "Please enter a valid date range.";
    return;
  }

  const conflicts = leaveData.filter(x =>
    overlaps(start,end,x.start,x.end) && x.status !== "Disapprove"
  );

  if(conflicts.length){
    box.classList.remove("hidden");
    box.textContent =
      "Conflict warning: " +
      conflicts.map(x => `${x.employee} (${formatDate(x.start)}–${formatDate(x.end)})`).join(", ") +
      " has overlapping leave.";
  } else {
    box.classList.add("hidden");
  }

  leaveData.push({employee,start,end,status:"Waiting Approval"});

  alert("VL request submitted. Status: Waiting Approval");

  e.target.reset();
  document.getElementById("employeeName").value = "Alex";

  renderDashboard();
  renderCalendar();
  if(managerUnlocked){
    renderManager();
    renderManagerCalendar();
  }

  showPage("dashboard");
});

// ---------------- MANAGER PASSWORD ----------------

function openManagerLogin(){
  const modal = document.getElementById("passwordModal");
  modal.classList.remove("hidden");
  document.getElementById("managerPassword").value = "";
  document.getElementById("passwordError").textContent = "";
  setTimeout(() => document.getElementById("managerPassword").focus(), 50);
}

function closeManagerLogin(){
  document.getElementById("passwordModal").classList.add("hidden");
}

function checkManagerPassword(){
  const entered = document.getElementById("managerPassword").value;

  if(entered === MANAGER_PASSWORD){
    managerUnlocked = true;
    closeManagerLogin();
    showPage("manager");
    renderEmployeeManager();
  } else {
    document.getElementById("passwordError").textContent = "Incorrect password.";
  }
}

function lockManager(){
  managerUnlocked = false;
  showPage("dashboard");
}

document.getElementById("managerPassword").addEventListener("keydown", e => {
  if(e.key === "Enter") checkManagerPassword();
});

renderDashboard();
renderCalendar();
renderManager();
renderManagerCalendar();
renderEmployeeManager();
