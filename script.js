
const ADMIN_PASSWORD = "123";
let   isAuthenticated = false;

const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
const dayNames = {
  segunda: "Segunda-feira",
  terca:   "Terça-feira",
  quarta:  "Quarta-feira",
  quinta:  "Quinta-feira",
  sexta:   "Sexta-feira",
};

const timeSlots = [
  "08:00",  "09:00",  "10:00", 
  "11:00",  "13:00", 
  "14:00",  "15:00",  "16:00",
];

/*dados no local storage*/
let scheduleData = {};
let currentModalContext = {};   // guarda { day, groupId, type }

function resetDataStructure() {
  let tmpGroupId = 1;
  days.forEach(day => {
    scheduleData[day] = {};
    for (let i = 1; i <= 20; i++) {
      scheduleData[day][tmpGroupId] = {
        horario: "09:00",
        usuarios: [],
        profissionais: [],
      };
      tmpGroupId++;
    }
  });
}

function saveData() {
  try {
    localStorage.setItem("scheduleData", JSON.stringify(scheduleData));
  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("⚠️ Não foi possível salvar os dados! Faça um backup manual exportando em CSV.");
  }
}

function loadData() {
  const raw = localStorage.getItem("scheduleData");
  if (!raw) return;
  try {
    scheduleData = JSON.parse(raw);
  } catch (err) {
    console.error("Erro ao carregar:", err);
  }
}

/*autenticação*/
function checkAuth() {
  if (!isAuthenticated) {
    openLoginModal();
    return false;
  }
  return true;
}

function openLoginModal() {
  document.getElementById("loginModal").style.display = "block";
  document.getElementById("loginForm").reset();
  document.getElementById("loginPassword").focus();
}

function toggleEditButtons(enable) {
  document.querySelectorAll(".btn-add, .btn-remove, select").forEach(el => {
    el.disabled = !enable;
  });
}

/*vizualização dos grupos*/
function createGroupElement(day, groupId) {
  const div = document.createElement("div");
  div.className = "group";
  div.innerHTML = `
    <div class="group-header">
      <span>👥 Grupo ${groupId} – ${dayNames[day]}</span>
      <select onchange="if (updateGroupTime('${day}', ${groupId}, this.value)) { this.blur(); }">
        ${timeSlots.map(t => `<option value="${t}" ${scheduleData[day][groupId].horario === t ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </div>
    <div class="group-content">
      <div class="section usuarios">
        <div class="section-title">
          <span>👤 Usuários</span>
          <button class="btn-add" onclick="openUserModal('${day}', ${groupId})">+ Adicionar</button>
        </div>
        <div class="person-list" id="usuarios-${day}-${groupId}">
          <div class="empty-state">Nenhum usuário adicionado</div>
        </div>
      </div>
      <div class="section profissionais">
        <div class="section-title">
          <span>👨‍⚕️ Profissionais</span>
          <button class="btn-add" onclick="openProfessionalModal('${day}', ${groupId})">+ Adicionar</button>
        </div>
        <div class="person-list" id="profissionais-${day}-${groupId}">
          <div class="empty-state">Nenhum profissional adicionado</div>
        </div>
      </div>
    </div>
  `;
  return div;
}

function initializeGroups() {
  let gid = 1;
  days.forEach(day => {
    const container = document.getElementById(`groups-${day}`);
    container.innerHTML = "";
    for (let i = 1; i <= 20; i++) {
      container.appendChild(createGroupElement(day, gid));
      gid++;
    }
  });

  /* renderiza dados já salvos */
  days.forEach(day => {
    let gid = day === "segunda" ? 1 : day === "terca" ? 21 : day === "quarta" ? 41 : day === "quinta" ? 61 : 81;
    for (let i = 1; i <= 20; i++) {
      renderUsers(day, gid);
      renderProfessionals(day, gid);
      gid++;
    }
  });
}

/*ações realizadas nos grupos*/
function updateGroupTime(day, groupId, time) {
  if (!checkAuth()) {
    alert("⛔ Faça login para alterar horários!");
    return false;
  }
  scheduleData[day][groupId].horario = time;
  saveData();
  return true;
}

function openUserModal(day, groupId) {
  if (!checkAuth()) return;

  if (scheduleData[day][groupId].usuarios.length >= 5) {
    alert("Máximo de 5 usuários por grupo");
    return;
  }
  currentModalContext = { day, groupId, type: "user" };
  document.getElementById("userModal").style.display = "block";
  document.getElementById("userForm").reset();
  document.getElementById("userName").focus();
}

function openProfessionalModal(day, groupId) {
  if (!checkAuth()) return;

  if (scheduleData[day][groupId].profissionais.length >= 5) {
    alert("Máximo de 5 profissionais por grupo");
    return;
  }
  currentModalContext = { day, groupId, type: "professional" };
  document.getElementById("professionalModal").style.display = "block";
  document.getElementById("professionalForm").reset();
  document.getElementById("professionalName").focus();
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
  currentModalContext = {};
}

/*renderização dos grupos*/
function renderUsers(day, groupId) {
  const el = document.getElementById(`usuarios-${day}-${groupId}`);
  if (!el) return;
  const list = scheduleData[day][groupId].usuarios;

  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum usuário adicionado</div>';
    return;
  }
  el.innerHTML = "";
  list.forEach((u, idx) => {
    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML = `
      <button class="btn-remove" onclick="removeUser('${day}', ${groupId}, ${idx})">×</button>
      <div class="person-info">
        <div><div class="info-label">Nome</div><div class="info-item">${u.nome}</div></div>
        <div><div class="info-label">Idade</div><div class="info-item">${u.idade} anos</div></div>
        <div><div class="info-label">Deficiência</div><div class="info-item">${u.deficiencia}</div></div>
        <div><div class="info-label">Programa</div><div class="info-item">${u.programa}</div></div>
      </div>`;
    el.appendChild(card);
  });
}

function renderProfessionals(day, groupId) {
  const el = document.getElementById(`profissionais-${day}-${groupId}`);
  if (!el) return;
  const list = scheduleData[day][groupId].profissionais;

  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum profissional adicionado</div>';
    return;
  }
  el.innerHTML = "";
  list.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML = `
      <button class="btn-remove" onclick="removeProfessional('${day}', ${groupId}, ${idx})">×</button>
      <div class="profissional-info">
        <div><div class="info-label">Nome</div><div class="info-item">${p.nome}</div></div>
        <div><div class="info-label">Categoria</div><div class="info-item">${p.categoria}</div></div>
      </div>`;
    el.appendChild(card);
  });
}

/*remover usuarios ou profissionais*/
function removeUser(day, groupId, idx) {
  if (!checkAuth()) return;
  if (confirm("Tem certeza que deseja remover este usuário?")) {
    scheduleData[day][groupId].usuarios.splice(idx, 1);
    renderUsers(day, groupId);
    saveData();
  }
}

function removeProfessional(day, groupId, idx) {
  if (!checkAuth()) return;
  if (confirm("Tem certeza que deseja remover este profissional?")) {
    scheduleData[day][groupId].profissionais.splice(idx, 1);
    renderProfessionals(day, groupId);
    saveData();
  }
}

/*exportação CSV*/
function exportToCSV() {
  let csv = "Dia da Semana,Grupo,Horário,Tipo,Nome,Idade,Deficiência,Programa,Categoria\n";

  days.forEach(day => {
    Object.keys(scheduleData[day]).forEach(gid => {
      const g = scheduleData[day][gid];
      g.usuarios.forEach(u => {
        csv += `${dayNames[day]},${gid},${g.horario},Usuário,"${u.nome}",${u.idade},"${u.deficiencia}","${u.programa}",\n`;
      });
      g.profissionais.forEach(p => {
        csv += `${dayNames[day]},${gid},${g.horario},Profissional,"${p.nome}",,,,${p.categoria}\n`;
      });
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "grade_horarios.csv";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* -----------------------------------
   TRATAMENTO DE EVENTOS GERAIS
----------------------------------- */
window.addEventListener("click", e => {
  if (e.target === document.getElementById("userModal"))        closeModal("userModal");
  if (e.target === document.getElementById("professionalModal")) closeModal("professionalModal");
  if (e.target === document.getElementById("loginModal"))        closeModal("loginModal");
});

/* Troca de abas */
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", e => {
    const day = e.currentTarget.dataset.day;
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === e.currentTarget));
    document.querySelectorAll(".day-content").forEach(c => c.classList.toggle("active", c.id === day));
  });
});

/* Formulários (login, usuário, profissional) */
document.getElementById("loginForm").addEventListener("submit", e => {
  e.preventDefault();
  const pass = document.getElementById("loginPassword").value.trim();
  if (pass === ADMIN_PASSWORD) {
    isAuthenticated = true;
    closeModal("loginModal");
    toggleEditButtons(true);
    alert("Acesso liberado!");
  } else {
    alert("Senha incorreta!");
  }
});

document.getElementById("userForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    nome:        document.getElementById("userName").value.trim(),
    idade:       document.getElementById("userAge").value.trim(),
    deficiencia: document.getElementById("userDeficiency").value.trim(),
    programa:    document.getElementById("userProgram").value.trim(),
  };
  const { day, groupId } = currentModalContext;
  scheduleData[day][groupId].usuarios.push(data);
  renderUsers(day, groupId);
  saveData();
  closeModal("userModal");
});

document.getElementById("professionalForm").addEventListener("submit", e => {
  e.preventDefault();
  const data = {
    nome:      document.getElementById("professionalName").value.trim(),
    categoria: document.getElementById("professionalCategory").value,
  };
  const { day, groupId } = currentModalContext;
  scheduleData[day][groupId].profissionais.push(data);
  renderProfessionals(day, groupId);
  saveData();
  closeModal("professionalModal");
});

/* -----------------------------------
   INICIALIZAÇÃO DA APLICAÇÃO
----------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  resetDataStructure(); // cria estrutura padrão
  loadData();           // substitui caso já exista no localStorage
  initializeGroups();   // renderiza
});
