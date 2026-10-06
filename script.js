const MANAGER_PASSWORD = "1234";

// Firebase / Firestore is initialized in index_firebase.html.
// Firestore collections used by this app:
//   employees: name (string), totalVL (number), active (boolean)
//   requests: employee (string), startDate (string), endDate (string), days (number), status (string)

let employees = [];
let leaveData = [];
let calendarDate = new Date();
let firebaseReady = false;

function showLoadingState(message = "Loading VL data...") {
  const employeeBody = document.getElementById("dashboardEmployees");
  const requestBody = document.getElementById("dashboardRequests");
  const managerEmployeeBody = document.getElementById("employeeManagerTable");
  const managerRequestBody = document.getElementById("managerRequests");

  if (employeeBody) employeeBody.innerHTML = `<tr><td colspan="4" class="empty-state">${escapeHtml(message)}</td></tr>`;
  if (requestBody) requestBody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(message)}</td></tr>`;
  if (managerEmployeeBody) managerEmployeeBody.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(message)}</td></tr>`;
  if (managerRequestBody) managerRequestBody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(message)}</td></tr>`;
}

async function loadDataFromFirebase() {
  if (!window.db) {
    throw new Error("Firebase Firestore was not initialized.");
  }

  const [employeeSnapshot, requestSnapshot] = await Promise.all([
    window.db.collection("employees").get(),
    window.db.collection("requests").get()
  ]);

  employees = employeeSnapshot.docs
    .map(doc => ({
      id: doc.id,
      name: String(doc.data().name || "").trim(),
      totalVL: Number(doc.data().totalVL ?? 0),
      active: doc.data().active !== false
    }))
    .filter(emp => emp.name && emp.active);

  leaveData = requestSnapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        employee: String(data.employee || "").trim(),
        start: normalizeDateValue(data.startDate ?? data.start),
        end: normalizeDateValue(data.endDate ?? data.end),
        status: String(data.status || "Waiting Approval")
      };
    })
    .filter(item => item.employee && item.start && item.end);

  // Newest requests first, matching the original prototype behavior.
  leaveData.sort((a, b) => String(b.start).localeCompare(String(a.start)));

  firebaseReady = true;
  refreshVisibleData();
}

function normalizeDateValue(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  // Firestore Timestamp / Date support.
  if (typeof value.toDate === "function") {
    return toDateKey(value.toDate());
  }

  if (value instanceof Date) {
    return toDateKey(value);
  }

  return String(value).slice(0, 10);
}

async function addEmployeeToFirebase(name, totalVL) {
  const docRef = await window.db.collection("employees").add({
    name,
    totalVL,
    active: true
  });

  return docRef.id;
}

async function updateEmployeeInFirebase(employee, totalVL) {
  if (!employee.id) throw new Error("Employee document ID is missing.");

  await window.db.collection("employees").doc(employee.id).update({
    totalVL
  });
}

async function deleteEmployeeFromFirebase(employee) {
  if (!employee.id) throw new Error("Employee document ID is missing.");

  const requestSnapshot = await window.db
    .collection("requests")
    .where("employee", "==", employee.name)
    .get();

  const batch = window.db.batch();
  batch.delete(window.db.collection("employees").doc(employee.id));

  requestSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

async function addRequestToFirebase(request) {
  const docRef = await window.db.collection("requests").add({
    employee: request.employee,
    startDate: request.start,
    endDate: request.end,
    days: leaveDays(request.start, request.end),
    status: request.status
  });

  return docRef.id;
}

async function updateRequestInFirebase(request, status) {
  if (!request.id) throw new Error("Request document ID is missing.");

  await window.db.collection("requests").doc(request.id).update({
    status
  });
}

async function deleteRequestFromFirebase(request) {
  if (!request.id) throw new Error("Request document ID is missing.");

  await window.db.collection("requests").doc(request.id).delete();
}

async function refreshData() {
  await loadDataFromFirebase();
}

function refreshVisibleData() {
  renderDashboard();
  renderEmployeeSelect();

  const managerPage = document.getElementById("managerPage");
  if (managerPage && managerPage.classList.contains("active-page")) {
    renderEmployeeManager();
    renderManagerRequests();
  }

  renderCalendar();
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const pageEl = document.getElementById(page + "Page");
  const navEl = document.querySelector(`[data-page="${page}"]`);

  if (pageEl) pageEl.classList.add("active-page");
  if (navEl) navEl.classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    request: "Request VL",
    manager: "Manager Dashboard"
  };
  document.getElementById("pageTitle").textContent = titles[page] || "VL Tracker";

  if (page === "dashboard") renderDashboard();
  if (page === "request") renderEmployeeSelect();
  if (page === "manager") {
    renderEmployeeManager();
    renderManagerRequests();
  }
}

function openManager() {
  const password = prompt("Enter manager password:");
  if (password === null) return;

  if (password === MANAGER_PASSWORD) {
    showPage("manager");
  } else {
    alert("Incorrect manager password.");
  }
}

function leaveDays(start, end) {
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;

  const diff = Math.floor((endDate - startDate) / 86400000) + 1;
  return Math.max(0, diff);
}

function getApprovedVL(employeeName) {
  return leaveData
    .filter(item => item.employee === employeeName && item.status === "Approve")
    .reduce((sum, item) => sum + leaveDays(item.start, item.end), 0);
}

function getAvailableVL(employee) {
  return Math.max(0, Number(employee.totalVL) - getApprovedVL(employee.name));
}

function statusClass(status) {
  if (status === "Approve") return "approve";
  if (status === "Disapprove") return "disapprove";
  return "waiting";
}

function statusBadge(status) {
  return `<span class="status ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

function renderDashboard() {
  const employeeCount = document.getElementById("employeeCount");
  if (employeeCount) employeeCount.textContent = employees.length;

  const employeeBody = document.getElementById("dashboardEmployees");

  if (!employeeBody) return;

  if (!employees.length) {
    employeeBody.innerHTML = `<tr><td colspan="4" class="empty-state">No employees added yet.</td></tr>`;
  } else {
    employeeBody.innerHTML = employees.map(emp => {
      const approved = getApprovedVL(emp.name);
      const available = getAvailableVL(emp);

      return `
        <tr>
          <td class="employee-name">${escapeHtml(emp.name)}</td>
          <td class="number-cell">${formatVL(emp.totalVL)}</td>
          <td class="number-cell">${formatVL(approved)}</td>
          <td class="available-cell">${formatVL(available)}</td>
        </tr>
      `;
    }).join("");
  }

  renderCalendar();

  const requestBody = document.getElementById("dashboardRequests");

  if (!requestBody) return;

  if (!leaveData.length) {
    requestBody.innerHTML = `<tr><td colspan="5" class="empty-state">No VL requests yet.</td></tr>`;
  } else {
    requestBody.innerHTML = leaveData.map(item => `
      <tr>
        <td class="employee-name">${escapeHtml(item.employee)}</td>
        <td>${formatDate(item.start)}</td>
        <td>${formatDate(item.end)}</td>
        <td class="number-cell">${leaveDays(item.start, item.end)}</td>
        <td>${statusBadge(item.status)}</td>
      </tr>
    `).join("");
  }
}

function renderEmployeeSelect() {
  const select = document.getElementById("employeeSelect");
  if (!select) return;

  if (!employees.length) {
    select.innerHTML = `<option value="">No employees available</option>`;
    return;
  }

  select.innerHTML = employees.map(emp =>
    `<option value="${escapeAttribute(emp.name)}">${escapeHtml(emp.name)}</option>`
  ).join("");
}

async function submitRequest() {
  if (!firebaseReady) {
    alert("VL data is still loading. Please try again in a moment.");
    return;
  }

  const employee = document.getElementById("employeeSelect").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  if (!employee || !start || !end) {
    alert("Please complete all fields.");
    return;
  }

  if (end < start) {
    alert("End Date cannot be earlier than Start Date.");
    return;
  }

  const days = leaveDays(start, end);
  const employeeRecord = employees.find(x => x.name === employee);

  if (!employeeRecord) {
    alert("Employee not found.");
    return;
  }

  const available = getAvailableVL(employeeRecord);

  if (days > available) {
    alert(`This request is ${days} day(s), but ${employee} only has ${available} day(s) of available VL.`);
    return;
  }

  try {
    await addRequestToFirebase({
      employee,
      start,
      end,
      status: "Waiting Approval"
    });

    await refreshData();

    alert("VL request submitted successfully.");
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    showPage("dashboard");
  } catch (error) {
    console.error("Error submitting VL request:", error);
    alert("Unable to submit the VL request. Please check your Firebase connection and try again.");
  }
}

function renderEmployeeManager() {
  const body = document.getElementById("employeeManagerTable");
  if (!body) return;

  if (!employees.length) {
    body.innerHTML = `<tr><td colspan="5" class="empty-state">No employees added yet.</td></tr>`;
    return;
  }

  body.innerHTML = employees.map((emp, index) => {
    const approved = getApprovedVL(emp.name);
    const available = getAvailableVL(emp);

    return `
      <tr>
        <td class="employee-name">${escapeHtml(emp.name)}</td>
        <td>
          <div class="action-group">
            <input
              class="employee-balance-input"
              id="totalVL-${index}"
              type="number"
              min="0"
              step="0.5"
              value="${Number(emp.totalVL)}"
              aria-label="Total VL for ${escapeAttribute(emp.name)}"
            >
            <button class="small-btn" onclick="saveEmployeeTotalVL(${index})">Save</button>
          </div>
        </td>
        <td class="number-cell">${formatVL(approved)}</td>
        <td class="available-cell">${formatVL(available)}</td>
        <td>
          <button class="delete-icon-btn" onclick="deleteEmployee(${index})">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

async function addEmployee() {
  if (!firebaseReady) {
    alert("VL data is still loading. Please try again in a moment.");
    return;
  }

  const nameInput = document.getElementById("newEmployeeName");
  const totalInput = document.getElementById("newEmployeeTotalVL");

  const name = nameInput.value.trim();
  const totalVL = Number(totalInput.value);

  if (!name) {
    alert("Please enter an employee name.");
    nameInput.focus();
    return;
  }

  if (!Number.isFinite(totalVL) || totalVL < 0) {
    alert("Please enter a valid Total VL.");
    totalInput.focus();
    return;
  }

  const duplicate = employees.some(
    emp => emp.name.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    alert("An employee with that name already exists.");
    return;
  }

  try {
    await addEmployeeToFirebase(name, totalVL);
    await refreshData();

    nameInput.value = "";
    totalInput.value = "";

    renderEmployeeManager();
    renderDashboard();
    renderEmployeeSelect();

    alert(`${name} has been added.`);
  } catch (error) {
    console.error("Error adding employee:", error);
    alert("Unable to add the employee. Please check your Firebase connection and try again.");
  }
}

async function saveEmployeeTotalVL(index) {
  if (!firebaseReady) return;

  const employee = employees[index];
  const input = document.getElementById(`totalVL-${index}`);

  if (!employee || !input) return;

  const value = Number(input.value);

  if (!Number.isFinite(value) || value < 0) {
    alert("Please enter a valid Total VL.");
    return;
  }

  try {
    await updateEmployeeInFirebase(employee, value);
    await refreshData();
  } catch (error) {
    console.error("Error updating Total VL:", error);
    alert("Unable to update Total VL. Please check your Firebase connection and try again.");
  }
}

async function deleteEmployee(index) {
  const employee = employees[index];

  if (!employee) return;

  const hasRequests = leaveData.some(item => item.employee === employee.name);

  const message = hasRequests
    ? `Delete ${employee.name}? Their existing VL requests will also be deleted.`
    : `Delete ${employee.name}?`;

  if (!confirm(message)) return;

  try {
    await deleteEmployeeFromFirebase(employee);
    await refreshData();
  } catch (error) {
    console.error("Error deleting employee:", error);
    alert("Unable to delete the employee. Please check your Firebase connection and try again.");
  }
}

function renderManagerRequests() {
  const body = document.getElementById("managerRequests");
  if (!body) return;

  if (!leaveData.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty-state">No VL requests yet.</td></tr>`;
    return;
  }

  body.innerHTML = leaveData.map((item, index) => `
    <tr>
      <td class="employee-name">${escapeHtml(item.employee)}</td>
      <td>${formatDate(item.start)}</td>
      <td>${formatDate(item.end)}</td>
      <td class="number-cell">${leaveDays(item.start, item.end)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>
        <div class="action-group">
          <button class="small-btn" onclick="setRequestStatus(${index}, 'Approve')">Approve</button>
          <button class="small-btn" onclick="setRequestStatus(${index}, 'Disapprove')">Disapprove</button>
          <button class="delete-icon-btn" onclick="deleteRequest(${index})">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function setRequestStatus(index, status) {
  const request = leaveData[index];
  if (!request) return;

  try {
    await updateRequestInFirebase(request, status);
    await refreshData();
  } catch (error) {
    console.error("Error updating request status:", error);
    alert("Unable to update the request status. Please check your Firebase connection and try again.");
  }
}

async function deleteRequest(index) {
  const request = leaveData[index];
  if (!request) return;

  if (!confirm(`Delete the VL request for ${request.employee}?`)) return;

  try {
    await deleteRequestFromFirebase(request);
    await refreshData();
  } catch (error) {
    console.error("Error deleting request:", error);
    alert("Unable to delete the VL request. Please check your Firebase connection and try again.");
  }
}

function formatVL(value) {
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderCalendar() {
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("calendarMonth");

  if (!grid || !title) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  title.textContent = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let output = weekdays
    .map(day => `<div class="calendar-weekday">${day}</div>`)
    .join("");

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let cell = 0; cell < totalCells; cell++) {
    const dayNumber = cell - firstDay + 1;
    let cellDate;
    let otherMonth = false;

    if (dayNumber < 1) {
      cellDate = new Date(year, month - 1, prevMonthDays + dayNumber);
      otherMonth = true;
    } else if (dayNumber > daysInMonth) {
      cellDate = new Date(year, month + 1, dayNumber - daysInMonth);
      otherMonth = true;
    } else {
      cellDate = new Date(year, month, dayNumber);
    }

    const dateKey = toDateKey(cellDate);
    const isToday = dateKey === toDateKey(new Date());

    const events = leaveData.filter(item =>
      dateKey >= item.start && dateKey <= item.end
    );

    const eventHtml = events.map(item => `
      <button
        class="calendar-event ${statusClass(item.status)}"
        title="${escapeAttribute(item.employee + " — " + item.status)}"
        onclick="showCalendarRequest(${leaveData.indexOf(item)})"
      >
        ${escapeHtml(item.employee)}
      </button>
    `).join("");

    output += `
      <div class="calendar-day ${otherMonth ? "other-month" : ""} ${isToday ? "today" : ""}">
        <div class="calendar-date">${cellDate.getDate()}</div>
        ${eventHtml}
      </div>
    `;
  }

  grid.innerHTML = output;
}

function changeCalendarMonth(offset) {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + offset,
    1
  );
  renderCalendar();
}

function goToCurrentMonth() {
  const now = new Date();
  calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
  renderCalendar();
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function showCalendarRequest(index) {
  const item = leaveData[index];
  if (!item) return;

  alert(
    `${item.employee}\n` +
    `${formatDate(item.start)} – ${formatDate(item.end)}\n` +
    `Days: ${leaveDays(item.start, item.end)}\n` +
    `Status: ${item.status}`
  );
}

// Make functions available to the existing HTML onclick handlers.
window.showPage = showPage;
window.openManager = openManager;
window.submitRequest = submitRequest;
window.addEmployee = addEmployee;
window.saveEmployeeTotalVL = saveEmployeeTotalVL;
window.deleteEmployee = deleteEmployee;
window.setRequestStatus = setRequestStatus;
window.deleteRequest = deleteRequest;
window.changeCalendarMonth = changeCalendarMonth;
window.goToCurrentMonth = goToCurrentMonth;
window.showCalendarRequest = showCalendarRequest;

// Initial render: load the central Firestore data first.
showLoadingState();

loadDataFromFirebase().catch(error => {
  console.error("Unable to load Firebase data:", error);
  firebaseReady = false;
  showLoadingState("Unable to load VL data. Check your Firebase Firestore rules and connection.");
});
