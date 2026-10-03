// ============================================================
// MANAGER PASSWORD
// CHANGE THIS ONE LINE TO CHANGE THE PASSWORD
// ============================================================
const MANAGER_PASSWORD = "1234";

// Demo employee data.
// Replace this with SharePoint data later.
const employees = [
  { name: "Alex", balance: 15 },
  { name: "Juan", balance: 15 },
  { name: "John", balance: 15 }
];

// Demo VL requests.
let requests = [
  { id: 1, employee: "Alex", start: "2026-10-10", end: "2026-10-12", status: "Approve" },
  { id: 2, employee: "Juan", start: "2026-10-15", end: "2026-10-17", status: "Waiting Approval" },
  { id: 3, employee: "John", start: "2026-10-20", end: "2026-10-22", status: "Disapprove" }
];

let managerUnlocked = false;

function calculateDays(start, end) {
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.floor((b - a) / 86400000) + 1;
}

function formatDate(dateString) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function showPage(pageId) {
  if (pageId === "manager" && !managerUnlocked) {
    openManager();
    return;
  }

  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  document.getElementById(pageId).classList.add("active");

  if (pageId === "dashboard") renderDashboard();
  if (pageId === "calendar") renderCalendar();
  if (pageId === "manager") renderManager();
}

function renderDashboard() {
  const table = document.getElementById("employeeTable");

  table.innerHTML = employees.map(employee => {
    const approved = requests
      .filter(r => r.employee === employee.name && r.status === "Approve")
      .reduce((sum, r) => sum + calculateDays(r.start, r.end), 0);

    const available = Math.max(employee.balance - approved, 0);

    return `
      <tr>
        <td>${employee.name}</td>
        <td>${approved}</td>
        <td>${available}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("totalEmployees").textContent = employees.length;

  const totalApproved = requests
    .filter(r => r.status === "Approve")
    .reduce((sum, r) => sum + calculateDays(r.start, r.end), 0);

  const pending = requests.filter(r => r.status === "Waiting Approval").length;

  document.getElementById("totalApproved").textContent = totalApproved;
  document.getElementById("totalPending").textContent = pending;
}

function renderCalendar() {
  const container = document.getElementById("calendarList");

  const sorted = [...requests].sort((a, b) =>
    a.start.localeCompare(b.start)
  );

  if (!sorted.length) {
    container.innerHTML = "<p>No leave requests yet.</p>";
    return;
  }

  container.innerHTML = sorted.map(r => `
    <div class="calendar-item">
      <strong>${r.employee}</strong>
      <div>${formatDate(r.start)} – ${formatDate(r.end)}</div>
      <div style="margin-top:7px">
        <span class="status ${statusClass(r.status)}">${r.status}</span>
      </div>
    </div>
  `).join("");
}

function renderManager() {
  const table = document.getElementById("managerTable");

  table.innerHTML = requests.map(r => `
    <tr>
      <td>${r.employee}</td>
      <td>${formatDate(r.start)} – ${formatDate(r.end)}</td>
      <td><span class="status ${statusClass(r.status)}">${r.status}</span></td>
      <td>
        <div class="action-group">
          <button class="action approve" onclick="changeStatus(${r.id}, 'Approve')">Approve</button>
          <button class="action disapprove" onclick="changeStatus(${r.id}, 'Disapprove')">Disapprove</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function statusClass(status) {
  if (status === "Approve") return "approved";
  if (status === "Disapprove") return "disapproved";
  return "waiting";
}

function changeStatus(id, status) {
  const request = requests.find(r => r.id === id);
  if (!request) return;

  request.status = status;
  renderManager();
  renderDashboard();
  renderCalendar();
}

function submitRequest() {
  const employee = document.getElementById("employeeName").value.trim();
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const message = document.getElementById("requestMessage");

  if (!employee || !start || !end) {
    message.textContent = "Please complete all fields.";
    message.style.color = "#b91c1c";
    return;
  }

  if (end < start) {
    message.textContent = "End Date cannot be before Start Date.";
    message.style.color = "#b91c1c";
    return;
  }

  requests.push({
    id: Date.now(),
    employee,
    start,
    end,
    status: "Waiting Approval"
  });

  message.textContent = "VL request submitted with status: Waiting Approval";
  message.style.color = "#166534";

  document.getElementById("employeeName").value = "";
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";

  renderDashboard();
  renderCalendar();
}

function openManager() {
  if (managerUnlocked) {
    showPage("manager");
    return;
  }

  document.getElementById("managerPassword").value = "";
  document.getElementById("passwordError").textContent = "";
  document.getElementById("passwordModal").classList.add("show");

  setTimeout(() => document.getElementById("managerPassword").focus(), 50);
}

function checkManagerPassword() {
  const entered = document.getElementById("managerPassword").value;

  if (entered === MANAGER_PASSWORD) {
    managerUnlocked = true;
    closePasswordModal();
    showPage("manager");
  } else {
    document.getElementById("passwordError").textContent = "Incorrect password.";
  }
}

function closePasswordModal() {
  document.getElementById("passwordModal").classList.remove("show");
}

function logoutManager() {
  managerUnlocked = false;
  showPage("dashboard");
}

// Initial display
renderDashboard();
renderCalendar();
