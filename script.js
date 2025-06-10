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
let masterProfessionals = [];
let currentModalContext = {};   // guarda { day, groupId, type }

// Categorias disponíveis para os grupos
const groupCategories = [
  "CENTRO DE CONVIVENCIA",
  "GAIA", 
  "EMPREGABILIDADE",
  "ATENDIMENTO A FAMILIA"
];

function resetDataStructure() {
  let tmpGroupId = 1;
  days.forEach(day => {
    scheduleData[day] = {};
    for (let i = 1; i <= 20; i++) {
      scheduleData[day][tmpGroupId] = {
        horario: "09:00",
        categoria: "", // Categoria vazia por padrão
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
    localStorage.setItem("masterProfessionals", JSON.stringify(masterProfessionals)); // NOVO
  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("⚠️ Não foi possível salvar os dados! Faça um backup manual exportando em CSV.");
  }
}

// SUBSTITUA A FUNÇÃO ANTIGA
function loadData() {
  const rawSchedule = localStorage.getItem("scheduleData");
  const rawProfessionals = localStorage.getItem("masterProfessionals"); // NOVO

  try {
    if (rawSchedule) scheduleData = JSON.parse(rawSchedule);
    if (rawProfessionals) masterProfessionals = JSON.parse(rawProfessionals); // NOVO
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
      <div class="group-controls">
        <select onchange="if (updateGroupCategory('${day}', ${groupId}, this.value)) { this.blur(); }" class="category-select">
          <option value="">Selecione categoria do grupo</option>
          ${groupCategories.map(cat => `<option value="${cat}" ${scheduleData[day][groupId].categoria === cat ? "selected" : ""}>${cat}</option>`).join("")}
        </select>
        <select onchange="if (updateGroupTime('${day}', ${groupId}, this.value)) { this.blur(); }" class="time-select">
          ${timeSlots.map(t => `<option value="${t}" ${scheduleData[day][groupId].horario === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
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

// NOVA FUNÇÃO: Atualiza categoria do grupo
function updateGroupCategory(day, groupId, category) {
  if (!checkAuth()) {
    alert("⛔ Faça login para alterar categorias!");
    return false;
  }
  scheduleData[day][groupId].categoria = category;
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

    currentModalContext = { day, groupId };
    const select = document.getElementById('professionalSelect');
    select.innerHTML = '<option value="">Selecione um profissional</option>'; // Limpa e adiciona a opção padrão

    masterProfessionals.forEach(prof => {
        // Verifica se o profissional já não está neste grupo
        if (!scheduleData[day][groupId].profissionais.includes(prof.id)) {
            const option = document.createElement('option');
            option.value = prof.id;
            option.textContent = `${prof.nome} ${prof.sobrenome} (${prof.categoria})`;
            select.appendChild(option);
        }
    });

    document.getElementById("professionalModal").style.display = "block";
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
  const list = scheduleData[day][groupId].profissionais; // Agora é uma lista de IDs

  if (list.length === 0) {
    el.innerHTML = '<div class="empty-state">Nenhum profissional adicionado</div>';
    return;
  }
  el.innerHTML = "";
  list.forEach((profId, idx) => {
    // Encontra o profissional na lista mestra
    const p = masterProfessionals.find(prof => prof.id === profId);
    if (!p) return; // Se não encontrar, pula

    const card = document.createElement("div");
    card.className = "person-card";
    card.innerHTML = `
      <button class="btn-remove" onclick="removeProfessional('${day}', ${groupId}, ${idx})">×</button>
      <div class="profissional-info">
        <div><div class="info-label">Nome</div><div class="info-item">${p.nome} ${p.sobrenome}</div></div>
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

// ---- ADICIONE ESTAS 4 NOVAS FUNÇÕES ----

// Abre o novo modal de cadastro
function openRegisterProfessionalModal() {
    if (!checkAuth()) return;
    document.getElementById('registerProfessionalForm').reset();
    document.getElementById('registerProfessionalModal').style.display = 'block';
    document.getElementById('regProfName').focus();
}

// NOVA FUNÇÃO: Remove profissional da lista mestra
function removeMasterProfessional(profId) {
    if (!checkAuth()) return;
    
    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) return;
    
    // Verifica se o profissional está alocado em algum grupo
    let isInUse = false;
    days.forEach(day => {
        Object.keys(scheduleData[day]).forEach(groupId => {
            if (scheduleData[day][groupId].profissionais.includes(profId)) {
                isInUse = true;
            }
        });
    });
    
    if (isInUse) {
        alert(`❌ Não é possível remover ${prof.nome} ${prof.sobrenome}.\nEste profissional está alocado em um ou mais grupos.\nRemova-o primeiro dos grupos antes de excluí-lo.`);
        return;
    }
    
    if (confirm(`Tem certeza que deseja remover ${prof.nome} ${prof.sobrenome} da lista de profissionais?`)) {
        // Remove da lista mestra
        const index = masterProfessionals.findIndex(p => p.id === profId);
        if (index !== -1) {
            masterProfessionals.splice(index, 1);
            saveData();
            renderMasterProfessionalsList();
            
            // Limpa a visualização de detalhes se estava exibindo este profissional
            document.getElementById('professional-details-view').innerHTML = 
                '<div class="empty-state">Selecione um profissional da lista para ver os detalhes.</div>';
        }
    }
}

// Renderiza a lista na aba "Profissionais" - ATUALIZADA com botão de remoção
function renderMasterProfessionalsList() {
    const listContainer = document.getElementById('master-professionals-list');
    listContainer.innerHTML = `
        <h3>Profissionais Cadastrados</h3>
        <div class="day-filter">
            <label for="dayFilter">Filtrar por dia:</label>
            <select id="dayFilter" onchange="updateProfessionalDetailsFilter()">
                <option value="">Todos os dias</option>
                <option value="segunda">Segunda-feira</option>
                <option value="terca">Terça-feira</option>
                <option value="quarta">Quarta-feira</option>
                <option value="quinta">Quinta-feira</option>
                <option value="sexta">Sexta-feira</option>
            </select>
        </div>
    `;

    if (masterProfessionals.length === 0) {
        listContainer.innerHTML += '<div class="empty-state">Nenhum profissional cadastrado.</div>';
        return;
    }

    masterProfessionals.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordena por nome

    masterProfessionals.forEach(prof => {
        const item = document.createElement('div');
        item.className = 'professional-list-item';
        item.innerHTML = `
            <button class="btn-remove-professional" onclick="removeMasterProfessional(${prof.id})" title="Remover profissional">×</button>
            <strong>${prof.nome} ${prof.sobrenome}</strong><br>
            <span>${prof.categoria}</span>
        `;
        item.onclick = (e) => {
            // Só abre os detalhes se não clicou no botão de remover
            if (!e.target.classList.contains('btn-remove-professional')) {
                showProfessionalDetails(prof.id);
            }
        };
        listContainer.appendChild(item);
    });
}

// NOVA FUNÇÃO: Atualiza os detalhes baseado no filtro de dia
function updateProfessionalDetailsFilter() {
    // Pega o profissional atualmente selecionado
    const selectedItem = document.querySelector('.professional-list-item.selected');
    if (!selectedItem) return;
    
    // Extrai o ID do profissional (precisa ser passado de outra forma)
    // Vou usar uma variável global para armazenar o ID atual
    if (window.currentSelectedProfessionalId) {
        showProfessionalDetails(window.currentSelectedProfessionalId);
    }
}

// Mostra os detalhes do profissional (grupos e usuários) - ATUALIZADA com filtro
function showProfessionalDetails(profId) {
    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) return;

    // Armazena o ID do profissional selecionado para o filtro
    window.currentSelectedProfessionalId = profId;

    // Remove seleção anterior
    document.querySelectorAll('.professional-list-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Adiciona seleção ao item clicado
    event.currentTarget.classList.add('selected');

    // Pega o filtro de dia selecionado
    const dayFilter = document.getElementById('dayFilter')?.value || '';

    const detailsContainer = document.getElementById('professional-details-view');
    let content = `<h3>Grupos de ${prof.nome} ${prof.sobrenome}`;
    if (dayFilter) {
        content += ` - ${dayNames[dayFilter]}`;
    }
    content += `</h3>`;
    
    let foundInGroups = false;

    // Filtra os dias baseado na seleção
    const daysToShow = dayFilter ? [dayFilter] : days;

    daysToShow.forEach(day => {
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (group.profissionais.includes(prof.id)) {
                foundInGroups = true;
                const categoriaTexto = group.categoria || "Categoria não definida";
                content += `
                    <div class="details-group-card">
                        <h4>${dayNames[day]} - Grupo ${groupId} (${group.horario}) - ${categoriaTexto}</h4>
                `;
                if (group.usuarios.length > 0) {
                    content += '<ul>';
                    group.usuarios.forEach(user => {
                        content += `<li>👤 ${user.nome}</li>`;
                    });
                    content += '</ul>';
                } else {
                    content += '<div class="empty-state">Nenhum usuário neste grupo.</div>';
                }
                content += '</div>';
            }
        });
    });

    if (!foundInGroups) {
        const dayText = dayFilter ? `na ${dayNames[dayFilter]}` : 'em nenhum grupo';
        content += `<div class="empty-state">Este profissional não está alocado ${dayText}.</div>`;
    }
    detailsContainer.innerHTML = content;
}

/*exportação CSV*/
function exportToCSV() {
  let csv = "Dia da Semana;Grupo;Horário;Categoria;Tipo;Nome;Idade;Deficiência;Programa;Categoria Profissional\n";

  days.forEach(day => {
    Object.keys(scheduleData[day]).forEach(gid => {
      const g = scheduleData[day][gid];
      const categoriaTexto = g.categoria || "Categoria não definida";
      
      g.usuarios.forEach(u => {
        csv += `${dayNames[day]};${gid};${g.horario};${categoriaTexto};Usuário;${u.nome};${u.idade};${u.deficiencia};${u.programa};\n`;
      });
      
      g.profissionais.forEach(profId => {
        const p = masterProfessionals.find(prof => prof.id === profId);
        if (p) {
          csv += `${dayNames[day]};${gid};${g.horario};${categoriaTexto};Profissional;${p.nome} ${p.sobrenome};;;;${p.categoria}\n`;
        }
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


  /*aqui são tratados os eventos*/

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

    if (day === 'profissionais') { // NOVO: Se clicar na aba nova
        renderMasterProfessionalsList();
        document.getElementById('professional-details-view').innerHTML = 
            '<div class="empty-state">Selecione um profissional da lista para ver os detalhes.</div>';
        // Limpa a variável global do profissional selecionado
        window.currentSelectedProfessionalId = null;
    }
  });
});

/* formulários (login, usuário, profissional) */
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
    const { day, groupId } = currentModalContext;
    const professionalId = document.getElementById('professionalSelect').value;

    if (!professionalId) {
        alert("Por favor, selecione um profissional.");
        return;
    }

    scheduleData[day][groupId].profissionais.push(parseInt(professionalId)); // Salva o ID
    renderProfessionals(day, groupId);
    saveData();
    closeModal("professionalModal");
});

document.getElementById("registerProfessionalForm").addEventListener("submit", e => {
    e.preventDefault();
    const newProf = {
        id: Date.now(), // ID único baseado no tempo atual
        nome: document.getElementById('regProfName').value.trim(),
        sobrenome: document.getElementById('regProfSurname').value.trim(),
        categoria: document.getElementById('regProfCategory').value
    };

    masterProfessionals.push(newProf);
    saveData();
    renderMasterProfessionalsList(); // Atualiza a lista na tela
    closeModal('registerProfessionalModal');
});


  /*inicializa a aplicação*/

document.addEventListener("DOMContentLoaded", () => {
  resetDataStructure(); // cria estrutura padrão
  loadData();           // substitui caso já exista no localStorage
  initializeGroups();   // renderiza os grupos
  renderMasterProfessionalsList() // renderiza os profissionais

   const textInputs = document.querySelectorAll('.modal-content input[type="text"]');
  textInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  });
});