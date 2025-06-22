const ADMIN_PASSWORD = "123";
let isAuthenticated = false;

const days = ["segunda", "terca", "quarta", "quinta", "sexta"];
const dayNames = {
    segunda: "Segunda-feira",
    terca: "Terça-feira",
    quarta: "Quarta-feira",
    quinta: "Quinta-feira",
    sexta: "Sexta-feira",
};

const timeSlots = [
    "08:00", "09:00", "10:00",
    "11:00", "13:00",
    "14:00", "15:00", "16:00",
];

// DADOS EM MEMÓRIA
let scheduleData = {};
let masterProfessionals = [];
let currentModalContext = {};

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
                categoria: "",
                usuarios: [],
                profissionais: [],
            };
            tmpGroupId++;
        }
    });
}

// Dashboard
function updateDashboard() {
    let totalUsuarios = 0;
    let totalProfissionaisUnicos = new Set();
    let gruposComAtividade = 0;
    let totalCapacidade = 0;
    let ocupacaoTotal = 0;

    days.forEach(day => {
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            totalUsuarios += group.usuarios.length;
            group.profissionais.forEach(id => totalProfissionaisUnicos.add(id));

            if (group.usuarios.length > 0 || group.profissionais.length > 0) {
                gruposComAtividade++;
            }

            totalCapacidade += 10;
            ocupacaoTotal += group.usuarios.length + group.profissionais.length;
        });
    });

    const ocupacaoMedia = totalCapacidade > 0 ? Math.round((ocupacaoTotal / totalCapacidade) * 100) : 0;

    document.getElementById('totalUsuarios').textContent = totalUsuarios;
    document.getElementById('totalProfissionais').textContent = totalProfissionaisUnicos.size;
    document.getElementById('gruposAtivos').textContent = gruposComAtividade;
    document.getElementById('ocupacaoMedia').textContent = ocupacaoMedia + '%';

    updateAlertas();
}

function updateAlertas() {
    const container = document.getElementById('alertas');
    let alertas = [];

    // Verifica grupos lotados
    days.forEach(day => {
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            const ocupacao = group.usuarios.length + group.profissionais.length;
            if (ocupacao >= 10) {
                alertas.push(`⚠️ Grupo ${groupId} (${dayNames[day]}) está com capacidade máxima`);
            }
        });
    });

    // Verifica profissionais sem grupos
    const profissionaisAtivos = new Set();
    days.forEach(day => {
        Object.keys(scheduleData[day]).forEach(groupId => {
            scheduleData[day][groupId].profissionais.forEach(id => profissionaisAtivos.add(id));
        });
    });

    masterProfessionals.forEach(prof => {
        if (!profissionaisAtivos.has(prof.id)) {
            alertas.push(`ℹ️ ${prof.nome} ${prof.sobrenome} não está alocado em nenhum grupo`);
        }
    });

    container.innerHTML = alertas.length > 0 ? alertas.slice(0, 5).map(a => `<p>${a}</p>`).join('') : '<p>✅ Nenhum alerta no momento</p>';
}

// Relatórios
function updateReports() {
    updateAtendimentosPorDia();
    updateHorariosMaisUtilizados();
}

function updateAtendimentosPorDia() {
    const container = document.getElementById('atendimentosPorDia');
    let html = '';

    days.forEach(day => {
        let totalUsuarios = 0;
        Object.keys(scheduleData[day]).forEach(groupId => {
            totalUsuarios += scheduleData[day][groupId].usuarios.length;
        });
        html += `<p><strong>${dayNames[day]}:</strong> ${totalUsuarios} atendimentos</p>`;
    });

    container.innerHTML = html;
}

function updateHorariosMaisUtilizados() {
    const container = document.getElementById('horariosMaisUtilizados');
    const horarioStats = {};

    days.forEach(day => {
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (group.usuarios.length > 0) {
                horarioStats[group.horario] = (horarioStats[group.horario] || 0) + 1;
            }
        });
    });

    const sortedHorarios = Object.entries(horarioStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    let html = '';
    sortedHorarios.forEach(([horario, count]) => {
        html += `<p><strong>${horario}:</strong> ${count} grupos</p>`;
    });

    container.innerHTML = html || '<p>Nenhum dado disponível</p>';
}

// Navegação entre abas
function switchToTab(tabName) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".day-content").forEach(c => {
        c.classList.remove("active");
        c.style.display = 'none';
    });

    const tab = document.querySelector(`[data-day="${tabName}"]`);
    const content = document.getElementById(tabName);

    if (tab && content) {
        tab.classList.add("active");
        content.classList.add("active");
        content.style.display = 'block';
    }

    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'profissionais') {
        renderMasterProfessionalsList();
        document.getElementById('professional-details-view').innerHTML =
            '<div class="empty-state">Selecione um profissional da lista para ver os detalhes.</div>';
        window.currentSelectedProfessionalId = null;
    } else if (tabName === 'grade') {
        document.getElementById('categoryFilter').value = '';
        updateGradeView();
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.disabled = false;
        }
    } else if (tabName === 'relatorios') {
        updateReports();
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
        if (el.id === 'categoryFilter') {
            return;
        }
        el.disabled = !enable;
    });
}

function updateUserStatus() {
    const statusText = document.getElementById('userStatusText');
    const loginBtn = document.getElementById('loginToggleBtn');

    if (isAuthenticated) {
        statusText.textContent = 'Modo Administrador';
        statusText.style.color = '#10b981';
        loginBtn.textContent = '🔒 Logout';
        loginBtn.onclick = () => {
            isAuthenticated = false;
            updateTabsVisibility();
            updateUserStatus();
            toggleEditButtons(false);

            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.disabled = false;
            }

            switchToTab('grade');
            alert('Logout realizado! Agora você está no modo visualização.');
        };
    } else {
        statusText.textContent = 'Modo Visualização';
        statusText.style.color = '#6b7280';
        loginBtn.textContent = '🔓 Fazer Login Admin';
        loginBtn.onclick = () => openLoginModal();
    }
}

function updateTabsVisibility() {
    const tabs = document.querySelectorAll('.tab');
    const restrictedTabs = ['dashboard', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'profissionais', 'relatorios'];

    if (isAuthenticated) {
        tabs.forEach(tab => {
            tab.style.display = 'block';
        });
    } else {
        tabs.forEach(tab => {
            const day = tab.dataset.day;
            if (restrictedTabs.includes(day)) {
                tab.style.display = 'none';
            } else {
                tab.style.display = 'block';
            }
        });
    }
}

/*visualização dos grupos*/
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
    updateDashboard();
    return true;
}

function updateGroupCategory(day, groupId, category) {
    if (!checkAuth()) {
        alert("⛔ Faça login para alterar categorias!");
        return false;
    }
    scheduleData[day][groupId].categoria = category;
    updateDashboard();
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
    select.innerHTML = '<option value="">Selecione um profissional</option>';

    masterProfessionals.forEach(prof => {
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
    const list = scheduleData[day][groupId].profissionais;

    if (list.length === 0) {
        el.innerHTML = '<div class="empty-state">Nenhum profissional adicionado</div>';
        return;
    }
    el.innerHTML = "";
    list.forEach((profId, idx) => {
        const p = masterProfessionals.find(prof => prof.id === profId);
        if (!p) return;

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
        updateDashboard();
    }
}

function removeProfessional(day, groupId, idx) {
    if (!checkAuth()) return;
    if (confirm("Tem certeza que deseja remover este profissional?")) {
        scheduleData[day][groupId].profissionais.splice(idx, 1);
        renderProfessionals(day, groupId);
        updateDashboard();
    }
}

function openRegisterProfessionalModal() {
    if (!checkAuth()) return;
    document.getElementById('registerProfessionalForm').reset();
    document.getElementById('registerProfessionalModal').style.display = 'block';
    document.getElementById('regProfName').focus();
}

function removeMasterProfessional(profId) {
    if (!checkAuth()) return;

    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) return;

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
        const index = masterProfessionals.findIndex(p => p.id === profId);
        if (index !== -1) {
            masterProfessionals.splice(index, 1);
            renderMasterProfessionalsList();
            updateDashboard();
            document.getElementById('professional-details-view').innerHTML =
                '<div class="empty-state">Selecione um profissional da lista para ver os detalhes.</div>';
        }
    }
}

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

    masterProfessionals.sort((a, b) => a.nome.localeCompare(b.nome));

    masterProfessionals.forEach(prof => {
        const item = document.createElement('div');
        item.className = 'professional-list-item';
        item.innerHTML = `
            <button class="btn-remove-professional" onclick="removeMasterProfessional(${prof.id})" title="Remover profissional">×</button>
            <strong>${prof.nome} ${prof.sobrenome}</strong><br>
            <span>${prof.categoria}</span>
        `;
        item.onclick = (e) => {
            if (!e.target.classList.contains('btn-remove-professional')) {
                showProfessionalDetails(prof.id);
            }
        };
        listContainer.appendChild(item);
    });
}

function updateProfessionalDetailsFilter() {
    const selectedItem = document.querySelector('.professional-list-item.selected');
    if (!selectedItem) return;

    if (window.currentSelectedProfessionalId) {
        showProfessionalDetails(window.currentSelectedProfessionalId);
    }
}

function showProfessionalDetails(profId) {
    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) return;

    window.currentSelectedProfessionalId = profId;

    document.querySelectorAll('.professional-list-item').forEach(item => {
        item.classList.remove('selected');
    });

    event.currentTarget.classList.add('selected');

    const dayFilter = document.getElementById('dayFilter')?.value || '';

    const detailsContainer = document.getElementById('professional-details-view');
    let content = `<h3>Grupos de ${prof.nome} ${prof.sobrenome}`;
    if (dayFilter) {
        content += ` - ${dayNames[dayFilter]}`;
    }
    content += `</h3>`;

    let foundInGroups = false;
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

// Grade de Horários
function updateGradeView() {
    const selectedCategory = document.getElementById('categoryFilter').value;
    const gradeContent = document.getElementById('grade-content');

    if (!selectedCategory) {
        gradeContent.innerHTML = '<div class="empty-state">Selecione uma categoria para visualizar a grade</div>';
        return;
    }

    const professionalsByCategory = masterProfessionals.filter(prof => prof.categoria === selectedCategory);

    if (professionalsByCategory.length === 0) {
        gradeContent.innerHTML = `<div class="empty-state">Nenhum profissional cadastrado na categoria "${selectedCategory}"</div>`;
        return;
    }

    let gradeHTML = '<div class="grade-professionals">';

    professionalsByCategory.forEach(prof => {
        gradeHTML += generateProfessionalGrid(prof);
    });

    gradeHTML += '</div>';
    gradeContent.innerHTML = gradeHTML;
}

function generateProfessionalGrid(professional) {
    let gridHTML = `
        <div class="professional-grid">
            <h3 class="professional-name">${professional.nome} ${professional.sobrenome}</h3>
            <div class="grid-table">
                <table>
                    <thead>
                        <tr>
                            <th>Horário</th>
                            <th>Segunda</th>
                            <th>Terça</th>
                            <th>Quarta</th>
                            <th>Quinta</th>
                            <th>Sexta</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    timeSlots.forEach(timeSlot => {
        gridHTML += `<tr><td class="time-cell">${timeSlot}</td>`;

        days.forEach(day => {
            const activities = getProfessionalActivitiesAtTime(professional.id, day, timeSlot);
            const cellClass = activities.length > 0 ? 'occupied-cell' : 'empty-cell';

            gridHTML += `<td class="${cellClass}">`;
            if (activities.length > 0) {
                activities.forEach(activity => {
                    gridHTML += `<div class="activity-item">
                        <div class="activity-group">Grupo ${activity.groupId}</div>
                        <div class="activity-category">${activity.groupCategory}</div>
                        <div class="activity-users">${activity.userNames}</div>
                    </div>`;
                });
            }
            gridHTML += `</td>`;
        });

        gridHTML += `</tr>`;
    });

    gridHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    return gridHTML;
}

function getProfessionalActivitiesAtTime(professionalId, day, timeSlot) {
    const activities = [];

    Object.keys(scheduleData[day]).forEach(groupId => {
        const group = scheduleData[day][groupId];
        if (group.horario === timeSlot && group.profissionais.includes(professionalId)) {
            const userNames = group.usuarios.length > 0
                ? group.usuarios.map(user => user.nome).join(', ')
                : 'Nenhum usuário';

            activities.push({
                groupId: groupId,
                groupCategory: group.categoria || 'Sem categoria',
                userNames: userNames
            });
        }
    });

    return activities;
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

/*eventos*/
window.addEventListener("click", e => {
    if (e.target === document.getElementById("userModal")) closeModal("userModal");
    if (e.target === document.getElementById("professionalModal")) closeModal("professionalModal");
    if (e.target === document.getElementById("loginModal")) closeModal("loginModal");
    if (e.target === document.getElementById("registerProfessionalModal")) closeModal("registerProfessionalModal");
});

/* Troca de abas */
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", e => {
        const clickedDay = e.currentTarget.dataset.day;

        if (!isAuthenticated && ['dashboard', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'profissionais', 'relatorios'].includes(clickedDay)) {
            alert("⛔ Esta aba requer permissões de administrador!");
            openLoginModal();
            return;
        }

        switchToTab(clickedDay);
    });
});

/* formulários */
document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const pass = document.getElementById("loginPassword").value.trim();
    if (pass === ADMIN_PASSWORD) {
        isAuthenticated = true;
        closeModal("loginModal");
        toggleEditButtons(true);
        updateTabsVisibility();
        updateUserStatus();
        alert("Acesso liberado! Agora você tem acesso a todas as funcionalidades.");
    } else {
        alert("Senha incorreta!");
    }
});

document.getElementById("userForm").addEventListener("submit", e => {
    e.preventDefault();
    const data = {
        nome: document.getElementById("userName").value.trim(),
        idade: document.getElementById("userAge").value.trim(),
        deficiencia: document.getElementById("userDeficiency").value.trim(),
        programa: document.getElementById("userProgram").value.trim(),
    };
    const { day, groupId } = currentModalContext;
    scheduleData[day][groupId].usuarios.push(data);
    renderUsers(day, groupId);
    updateDashboard();
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

    scheduleData[day][groupId].profissionais.push(parseInt(professionalId));
    renderProfessionals(day, groupId);
    updateDashboard();
    closeModal("professionalModal");
});

document.getElementById("registerProfessionalForm").addEventListener("submit", e => {
    e.preventDefault();
    const newProf = {
        id: Date.now(),
        nome: document.getElementById('regProfName').value.trim(),
        sobrenome: document.getElementById('regProfSurname').value.trim(),
        categoria: document.getElementById('regProfCategory').value
    };

    masterProfessionals.push(newProf);
    renderMasterProfessionalsList();
    updateDashboard();
    closeModal('registerProfessionalModal');
});

/*inicializa a aplicação*/
document.addEventListener("DOMContentLoaded", () => {
    resetDataStructure();
    initializeGroups();
    renderMasterProfessionalsList();

    // Inicia com Grade ativa (para usuários não autenticados)
    switchToTab('grade');
    updateTabsVisibility();
    updateUserStatus();

    // GARANTIR que o filtro de categoria sempre funcione
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.disabled = false;
    }

    const textInputs = document.querySelectorAll('.modal-content input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    });
});