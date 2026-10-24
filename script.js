const STORAGE_KEY = "resolvenow_complaints_v1";

function getComplaints() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveComplaints(complaints) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
}

function makeId() {
  return "RN-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function statusClass(status) {
  if (status === "Resolved") return "status-resolved";
  if (status === "In Progress") return "status-in-progress";
  return "status-submitted";
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function refreshDashboard() {
  const complaints = getComplaints();
  document.getElementById("totalCount").textContent = complaints.length;
  document.getElementById("pendingCount").textContent = complaints.filter(c => c.status !== "Resolved").length;
  document.getElementById("resolvedCount").textContent = complaints.filter(c => c.status === "Resolved").length;

  const filter = document.getElementById("statusFilter").value;
  const shown = complaints.filter(c => filter === "All" || c.status === filter);
  const tbody = document.getElementById("complaintTable");

  if (!shown.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No complaints match this view.</td></tr>';
    return;
  }

  tbody.innerHTML = shown.slice().reverse().map(c => `
    <tr>
      <td>${escapeHtml(c.id)}</td>
      <td>${escapeHtml(c.subject)}</td>
      <td>${escapeHtml(c.category)}</td>
      <td>${escapeHtml(formatDate(c.createdAt))}</td>
      <td><span class="status ${statusClass(c.status)}">${escapeHtml(c.status)}</span></td>
      <td>
        ${c.status === "Submitted" ? `<button class="table-action" data-id="${escapeHtml(c.id)}" data-status="In Progress">Start</button>` : ""}
        ${c.status === "In Progress" ? `<button class="table-action" data-id="${escapeHtml(c.id)}" data-status="Resolved">Resolve</button>` : ""}
        ${c.status === "Resolved" ? '<span aria-label="Completed">—</span>' : ""}
      </td>
    </tr>`).join("");
}

document.getElementById("complaintForm").addEventListener("submit", function(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const complaint = {
    id: makeId(),
    name: String(data.get("name")).trim(),
    email: String(data.get("email")).trim(),
    phone: String(data.get("phone")).trim(),
    category: String(data.get("category")),
    location: String(data.get("location")).trim(),
    subject: String(data.get("subject")).trim(),
    description: String(data.get("description")).trim(),
    status: "Submitted",
    createdAt: new Date().toISOString()
  };

  const message = document.getElementById("formMessage");
  if (!complaint.name || !complaint.email || !complaint.category || !complaint.location || !complaint.subject || !complaint.description) {
    message.className = "message error";
    message.textContent = "Please complete all required fields.";
    return;
  }

  const complaints = getComplaints();
  complaints.push(complaint);
  try {
    saveComplaints(complaints);
  } catch (error) {
    message.className = "message error";
    message.textContent = "Could not save the complaint in this browser. Check your browser storage settings.";
    return;
  }

  message.className = "message success";
  message.innerHTML = `Complaint submitted successfully! Your complaint ID is <strong>${escapeHtml(complaint.id)}</strong>. Save this ID to track your complaint.`;
  document.getElementById("trackingId").value = complaint.id;
  form.reset();
  refreshDashboard();
  document.getElementById("trackResult").innerHTML = renderTrackResult(complaint);
});

function renderTrackResult(complaint) {
  return `<div class="result-card">
    <h3>${escapeHtml(complaint.subject)}</h3>
    <p><strong>Complaint ID:</strong> ${escapeHtml(complaint.id)}</p>
    <p><strong>Category:</strong> ${escapeHtml(complaint.category)}</p>
    <p><strong>Location:</strong> ${escapeHtml(complaint.location)}</p>
    <p><strong>Submitted:</strong> ${escapeHtml(formatDate(complaint.createdAt))}</p>
    <p><strong>Status:</strong> <span class="status ${statusClass(complaint.status)}">${escapeHtml(complaint.status)}</span></p>
  </div>`;
}

document.getElementById("trackForm").addEventListener("submit", function(event) {
  event.preventDefault();
  const id = document.getElementById("trackingId").value.trim().toUpperCase();
  const complaint = getComplaints().find(c => c.id.toUpperCase() === id);
  const result = document.getElementById("trackResult");
  if (complaint) {
    result.innerHTML = renderTrackResult(complaint);
  } else {
    result.innerHTML = '<div class="result-card"><h3>Complaint not found</h3><p>Please check the complaint ID and try again. This demo can only find complaints saved in this browser.</p></div>';
  }
});

document.getElementById("statusFilter").addEventListener("change", refreshDashboard);

document.getElementById("complaintTable").addEventListener("click", function(event) {
  const button = event.target.closest("button[data-id][data-status]");
  if (!button) return;
  const complaints = getComplaints();
  const complaint = complaints.find(c => c.id === button.dataset.id);
  if (!complaint) return;
  complaint.status = button.dataset.status;
  saveComplaints(complaints);
  refreshDashboard();
  const currentId = document.getElementById("trackingId").value.trim().toUpperCase();
  if (currentId === complaint.id.toUpperCase()) {
    document.getElementById("trackResult").innerHTML = renderTrackResult(complaint);
  }
});

document.getElementById("clearButton").addEventListener("click", function() {
  const confirmed = window.confirm("Delete all complaint data saved in this browser? This cannot be undone.");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  document.getElementById("formMessage").className = "message";
  document.getElementById("trackResult").innerHTML = "";
  document.getElementById("trackingId").value = "";
  refreshDashboard();
});

refreshDashboard();
