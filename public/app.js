const $ = (id) => document.getElementById(id);

const modal = $("clientModal");
const form = $("clientForm");
const tableBody = $("clientTableBody");
let searchTimer;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function typeClass(type) {
  if (type === "VIP Client") return "vip";
  if (type === "Company") return "company";
  return "";
}

function renderClients(clients) {
  $("recordCount").textContent = `${clients.length} record${clients.length === 1 ? "" : "s"}`;
  tableBody.innerHTML = "";

  if (!clients.length) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No clients found. Click “Add new client” to create your first record.</td></tr>`;
    return;
  }

  for (const client of clients) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><div class="client-cell"><div class="avatar">${escapeHtml(initials(client.name))}</div>
        <div><div class="client-name">${escapeHtml(client.name)}</div><div class="client-id">${escapeHtml(client.client_id)}</div></div>
      </div></td>
      <td>${escapeHtml(client.phone || "—")}</td>
      <td>${escapeHtml(client.company || "—")}</td>
      <td><span class="type-pill ${typeClass(client.type)}">${escapeHtml(client.type)}</span></td>
      <td>${escapeHtml(client.email || "—")}</td>
      <td><div class="actions">
        <button class="action-btn" data-action="edit" data-id="${client.id}">Edit</button>
        <button class="action-btn delete" data-action="delete" data-id="${client.id}">Delete</button>
      </div></td>`;
    tableBody.appendChild(row);
  }
}

async function loadClients() {
  try {
    const q = $("searchInput").value.trim();
    const clients = await api(`/api/clients?q=${encodeURIComponent(q)}`);
    renderClients(clients);
    // The top counters show all database records, not only search results.
    const all = q ? await api("/api/clients") : clients;
    $("totalClients").textContent = all.length;
    $("companyClients").textContent = all.filter(c => c.type === "Company").length;
    $("vipClients").textContent = all.filter(c => c.type === "VIP Client").length;
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Could not connect to the database. Please restart the server.</td></tr>`;
    showToast(error.message);
  }
}

function openModal(client = null) {
  form.reset();
  $("recordId").value = client?.id || "";
  $("modalTitle").textContent = client ? "Edit client" : "Add new client";
  $("saveBtn").textContent = client ? "Save changes" : "Save client";
  $("clientId").value = client?.client_id || makeNextClientId();
  $("name").value = client?.name || "";
  $("phone").value = client?.phone || "";
  $("email").value = client?.email || "";
  $("company").value = client?.company || "";
  $("type").value = client?.type || "Individual";
  $("address").value = client?.address || "";
  $("notes").value = client?.notes || "";
  $("formError").classList.add("hidden");
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  setTimeout(() => $("name").focus(), 50);
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.style.overflow = "";
}

function makeNextClientId() {
  // A convenient suggestion only; the server still enforces uniqueness.
  return "CL-" + String(Date.now()).slice(-6);
}

function formData() {
  return {
    client_id: $("clientId").value,
    name: $("name").value,
    phone: $("phone").value,
    email: $("email").value,
    company: $("company").value,
    type: $("type").value,
    address: $("address").value,
    notes: $("notes").value
  };
}

$("newClientBtn").addEventListener("click", () => openModal());
$("closeModalBtn").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal(); });

form.addEventListener("submit", async event => {
  event.preventDefault();
  const recordId = $("recordId").value;
  const payload = formData();
  $("saveBtn").disabled = true;
  $("saveBtn").textContent = "Saving...";
  $("formError").classList.add("hidden");
  try {
    await api(recordId ? `/api/clients/${recordId}` : "/api/clients", {
      method: recordId ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    closeModal();
    await loadClients();
    showToast(recordId ? "Client updated successfully." : "Client saved successfully.");
  } catch (error) {
    $("formError").textContent = error.message;
    $("formError").classList.remove("hidden");
  } finally {
    $("saveBtn").disabled = false;
    $("saveBtn").textContent = recordId ? "Save changes" : "Save client";
  }
});

tableBody.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  try {
    if (button.dataset.action === "edit") {
      const client = await api(`/api/clients/${id}`);
      openModal(client);
    } else if (button.dataset.action === "delete") {
      const client = await api(`/api/clients/${id}`);
      if (!confirm(`Delete ${client.name} (${client.client_id})? This cannot be undone.`)) return;
      await api(`/api/clients/${id}`, { method: "DELETE" });
      await loadClients();
      showToast("Client deleted.");
    }
  } catch (error) {
    showToast(error.message);
  }
});

$("searchInput").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadClients, 180);
});

loadClients();
