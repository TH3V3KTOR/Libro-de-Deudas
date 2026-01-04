// Cliente JS minimalista
const api = {
  getClients: () => fetch("/api/clients").then((r) => r.json()),
  getMovements: (id) =>
    fetch(`/api/clients/${id}/movements`).then((r) => r.json()),
  postSale: (id, body) =>
    fetch(`/api/clients/${id}/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  postPayment: (id, body) =>
    fetch(`/api/clients/${id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  postClient: (body) =>
    fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),

  updateClient: (id, body) =>
    fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  deleteClient: (id) => fetch(`/api/clients/${id}`, { method: "DELETE" }),

  updateMovement: (id, body) =>
    fetch(`/api/movimientos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  deleteMovement: (id) => fetch(`/api/movimientos/${id}`, { method: "DELETE" }),
};

// Views
const viewSummary = document.getElementById("view-summary");
const viewMov = document.getElementById("view-movements");
const clientsTbody = document.querySelector("#clients-table tbody");
let currentClient = null;
let allClients = [];

function fmtMoney(v) {
  return Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getDeudaClass(deuda) {
    const numDeuda = Number(deuda);
    if (numDeuda === 0) return 'deuda-low';
    if (numDeuda < 100) return 'deuda-medium';
    return 'deuda-high';
}

function formatDeuda(deuda) {
    const numDeuda = Number(deuda);
    if (numDeuda === 0) return '<span class="badge badge-success">$ ' + fmtMoney(deuda) + '</span>';
    if (numDeuda < 100) return '<span class="badge badge-warning">$ ' + fmtMoney(deuda) + '</span>';
    return '<span class="badge badge-danger">$ ' + fmtMoney(deuda) + '</span>';
}

async function loadClients() {
  try {
    allClients = await api.getClients();
    renderClients(allClients);
    
    // MODIFICACIÓN: Asegurar que el modal de movimientos esté oculto al cargar
    if (viewSummary && viewMov) {
      viewSummary.classList.remove("view-hidden");
      viewSummary.classList.add("view-visible");
      viewMov.classList.remove("view-visible");
      viewMov.classList.add("view-hidden");
    }
  } catch (err) {
    console.error("Error cargando clientes:", err);
    clientsTbody.innerHTML = `
      <tr><td colspan="4" style="color: var(--danger-color); text-align: center; padding: 20px;">
        <i class="fas fa-exclamation-circle"></i> Error al cargar los clientes
      </td></tr>
    `;
  }
}

function renderClients(clients) {
  clientsTbody.innerHTML = "";

  if (clients.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="4" class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No se encontraron clientes</h3>
        <p>Agrega tu primer cliente usando el formulario superior</p>
      </td>
    `;
    clientsTbody.appendChild(emptyRow);
    return;
  }

  clients.forEach((c) => {
    const deuda = Number(c.deuda_total);
    const deudaClass = getDeudaClass(deuda);
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Nombre">
        <i class="fas fa-user-circle" style="margin-right: 4px; color: var(--primary-color);"></i>
        <span class="editable-client" contenteditable="true" data-id="${c.id}">
          ${c.name}
        </span>
      </td>
      
      <td data-label="Deuda total" class="${deudaClass}">
        ${formatDeuda(deuda)}
      </td>
      
      <td data-label="Último pago">
        ${c.fecha_ultimo_pago
  ? c.fecha_ultimo_pago.split("-").reverse().join("/")
  : '<span style="color: var(--gray);">Sin pagos</span>'}
      </td>
      
      <td data-label="Acciones" class="actions-cell">
        <button class="btn btn-primary view-mov-btn" data-id="${c.id}">
          <i class="fas fa-eye"></i><span> Ver</span>
        </button>
        <button class="btn btn-danger delete-client" data-id="${c.id}" title="Eliminar cliente">
          <i class="fas fa-trash"></i><span> Eliminar</span>
        </button>
      </td>
    `;

    clientsTbody.appendChild(tr);
  });

  // eventos para ver movimientos
  document.querySelectorAll(".view-mov-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const row = e.currentTarget.closest("tr");
      const nameCell = row.querySelector(".editable-client");
      const name = nameCell ? nameCell.innerText : row.children[0].innerText;
      
      openMovements(id, name);
    });
  });

  // eventos para eliminar cliente
  document.querySelectorAll(".delete-client").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const row = e.currentTarget.closest("tr");
      const nameCell = row.querySelector(".editable-client");
      const name = nameCell ? nameCell.innerText : row.children[0].innerText;
      
      openConfirmModal(
        `¿Eliminar el cliente "${name}" y TODOS sus movimientos? Esta acción no se puede deshacer.`,
        async () => {
          try {
            await api.deleteClient(id);
            loadClients();
          } catch (err) {
            alert("Error al eliminar cliente");
            console.error(err);
          }
        }
      );
    });
  });
}

// Movements view
const backBtn = document.getElementById("back-btn");
backBtn.addEventListener("click", () => {
  // MODIFICACIÓN: Usar clases en lugar de style.display
  viewMov.classList.remove("view-visible");
  viewMov.classList.add("view-hidden");
  viewSummary.classList.remove("view-hidden");
  viewSummary.classList.add("view-visible");
  loadClients();
});

async function openMovements(id, name) {
  // MODIFICACIÓN: Usar clases en lugar de style.display
  viewSummary.classList.remove("view-visible");
  viewSummary.classList.add("view-hidden");
  viewMov.classList.remove("view-hidden");
  viewMov.classList.add("view-visible");
  
  currentClient = { id, name };
  document.getElementById(
    "mov-cliente-name"
  ).innerHTML = `<i class="fas fa-user"></i> Movimientos — ${name}`;
  await loadMovements();
}

async function loadMovements() {
  if (!currentClient) return;

  const tbody = document.querySelector("#mov-table tbody");
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;"><div class="loading"></div> Cargando movimientos...</td></tr>';

  try {
    const rows = await api.getMovements(currentClient.id);
    tbody.innerHTML = "";

    if (rows.length === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `
        <td colspan="7" class="empty-state">
          <i class="fas fa-receipt"></i>
          <h3>No hay movimientos registrados</h3>
          <p>Agrega una venta o pago usando los botones superiores</p>
        </td>
      `;
      tbody.appendChild(emptyRow);
      return;
    }

    rows.forEach((r) => {
      const movimiento = Number(r.movimiento);
      const movimientoClass = movimiento >= 0 ? 'deuda-danger' : 'deuda-success';
      const movimientoIcon = movimiento >= 0 ? 'fas fa-arrow-up text-danger' : 'fas fa-arrow-down text-success';
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Fecha">
          ${r.fecha ? r.fecha.split("-").reverse().join("/") : '---'}
        </td>
        
        <td data-label="Producto">
          ${r.producto || '---'}  <!-- MODIFICACIÓN: Quitado contenteditable -->
        </td>
        
        <td data-label="Cantidad">
          ${r.cantidad}  <!-- MODIFICACIÓN: Quitado contenteditable -->
        </td>
        
        <td data-label="Precio">
          $ ${fmtMoney(r.precio)}  <!-- MODIFICACIÓN: Quitado contenteditable -->
        </td>
        
        <td data-label="Pago">
          $ ${fmtMoney(r.pago)}  <!-- MODIFICACIÓN: Quitado contenteditable -->
        </td>
        
        <td data-label="Movimiento" class="${movimientoClass}">
          <i class="${movimientoIcon}" style="margin-right: 5px;"></i>
          $ ${Math.abs(movimiento).toFixed(2)}
        </td>
        
        <td data-label="Eliminar">
          <button class="btn btn-danger delete-mov" data-id="${r.id}" title="Eliminar movimiento">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);

      tr.querySelector(".delete-mov").addEventListener("click", () => {
        const producto = r.producto || 'este movimiento';
        openConfirmModal(
          `¿Eliminar el movimiento "${producto}"? Esta acción no se puede deshacer.`,
          async () => {
            try {
              await api.deleteMovement(r.id);
              loadMovements();
            } catch (err) {
              alert("Error al eliminar movimiento");
              console.error(err);
            }
          }
        );
      });
    });

    // Actualizar fechas por defecto en formularios
    const today = new Date().toLocaleDateString("en-CA");
    const fechaVenta = document.getElementById('fecha-venta');
    const fechaPago = document.getElementById('fecha-pago');
    if (fechaVenta) fechaVenta.value = today;
    if (fechaPago) fechaPago.value = today;

  } catch (error) {
    console.error("Error al cargar movimientos:", error);
    tbody.innerHTML = `
      <tr><td colspan="7" style="color: var(--danger-color); text-align: center; padding: 20px;">
        <i class="fas fa-exclamation-circle"></i> Error al cargar los movimientos
      </td></tr>
    `;
  }
}

// Forms
const showSaleBtn = document.getElementById("show-sale-form");
const showPayBtn = document.getElementById("show-pay-form");
const saleForm = document.getElementById("sale-form");
const payForm = document.getElementById("pay-form");
const cancelSaleBtn = document.getElementById("cancel-sale");
const cancelPayBtn = document.getElementById("cancel-pay");

if (showSaleBtn) {
  showSaleBtn.addEventListener("click", () => {
    saleForm.style.display = "block";
    payForm.style.display = "none";
  });
}

if (showPayBtn) {
  showPayBtn.addEventListener("click", () => {
    payForm.style.display = "block";
    saleForm.style.display = "none";
  });
}

if (cancelSaleBtn) {
  cancelSaleBtn.addEventListener("click", () => {
    saleForm.reset();
    // MODIFICACIÓN: Usar display none directo para los formularios
    saleForm.style.display = "none";
  });
}

if (cancelPayBtn) {
  cancelPayBtn.addEventListener("click", () => {
    payForm.reset();
    // MODIFICACIÓN: Usar display none directo para los formularios
    payForm.style.display = "none";
  });
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("add-client-btn");
  const input = document.getElementById("new-client-name");

  // Configurar fechas por defecto
  const today = new Date().toLocaleDateString("en-CA");
  const fechaVenta = document.getElementById('fecha-venta');
  const fechaPago = document.getElementById('fecha-pago');
  if (fechaVenta) fechaVenta.value = today;
  if (fechaPago) fechaPago.value = today;

  if (!btn || !input) {
    console.error("Botón o input de cliente no encontrados");
    return;
  }

  btn.addEventListener("click", async () => {
    const name = input.value.trim();

    if (!name) {
      alert("Escribe el nombre del cliente");
      return;
    }

    try {
      await api.postClient({ name });
      input.value = "";
      loadClients();
    } catch (err) {
      alert("Error al crear cliente");
      console.error(err);
    }
  });

  // Cargar clientes al inicio
  loadClients();
});

// Guardar venta
if (saleForm) {
  saleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentClient) return;

    const data = Object.fromEntries(new FormData(saleForm));

    try {
      await api.postSale(currentClient.id, {
        producto: data.producto,
        cantidad: Number(data.cantidad),
        precio: Number(data.precio),
        fecha: data.fecha,
      });

      saleForm.reset();
      saleForm.style.display = "none"; // MODIFICACIÓN: Directo
      // Restaurar fecha actual
      const today = new Date().toLocaleDateString("en-CA");
      document.getElementById('fecha-venta').value = today;
      
      await loadMovements();
    } catch (err) {
      alert("Error al guardar la venta");
      console.error(err);
    }
  });
}

// Guardar pago
if (payForm) {
  payForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentClient) return;

    const data = Object.fromEntries(new FormData(payForm));

    try {
      await api.postPayment(currentClient.id, {
        monto: Number(data.monto),
        fecha: data.fecha,
      });

      payForm.reset();
      payForm.style.display = "none"; // MODIFICACIÓN: Directo
      // Restaurar fecha actual
      const today = new Date().toLocaleDateString("en-CA");
      document.getElementById('fecha-pago').value = today;
      
      await loadMovements();
    } catch (err) {
      alert("Error al guardar el pago");
      console.error(err);
    }
  });
}

// Manejo de edición en línea (SOLO para clientes, NO para movimientos)
let originalText = "";

document.addEventListener("focusin", (e) => {
  if (e.target.classList.contains("editable-client")) {
    originalText = e.target.innerText.trim();
  }
});

document.addEventListener("focusout", async (e) => {
  if (!e.target.classList.contains("editable-client")) return;

  const td = e.target;
  const newName = td.innerText.trim();
  const id = td.dataset.id;

  if (!newName || newName === originalText) {
    td.innerText = originalText;
    return;
  }

  try {
    await api.updateClient(id, { name: newName });
    loadClients();
  } catch (err) {
    alert("Error al actualizar cliente");
    td.innerText = originalText;
    console.error(err);
  }
});

document.addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("editable-client")) return;

  if (e.key === "Enter") {
    e.preventDefault();
    e.target.blur();
  }

  if (e.key === "Escape") {
    e.preventDefault();
    e.target.innerText = originalText;
    e.target.blur();
  }
});

// MODIFICACIÓN: ELIMINADO TODO EL CÓDIGO DE EDICIÓN DE MOVIMIENTOS
// (Se ha removido completamente la funcionalidad de edición en línea para movimientos)
// Esto incluye:
// 1. La variable movOriginalValue
// 2. Event listeners focusin para mov-edit
// 3. Event listeners focusout para mov-edit  
// 4. Event listeners keydown para mov-edit

// Búsqueda de clientes
const searchInput = document.getElementById("search-client");

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase().trim();

    const filtered = allClients.filter((c) =>
      c.name.toLowerCase().includes(value)
    );

    renderClients(filtered);
  });
}

// ===== MODAL CONFIRMACIÓN =====
const modal = document.getElementById("confirm-modal");
const modalText = document.getElementById("confirm-text");
const modalCancel = document.getElementById("confirm-cancel");
const modalOk = document.getElementById("confirm-ok");

let confirmAction = null;

function openConfirmModal(text, onConfirm) {
  if (modalText) modalText.innerText = text;
  confirmAction = onConfirm;
  if (modal) modal.classList.remove("hidden");
}

function closeConfirmModal() {
  if (modal) modal.classList.add("hidden");
  confirmAction = null;
}

if (modalCancel) {
  modalCancel.addEventListener("click", closeConfirmModal);
}

if (modalOk) {
  modalOk.addEventListener("click", async () => {
    if (confirmAction) {
      try {
        await confirmAction();
      } catch (err) {
        console.error("Error en acción de confirmación:", err);
      }
    }
    closeConfirmModal();
  });
}

// Cerrar modal al hacer clic fuera
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeConfirmModal();
    }
  });
}