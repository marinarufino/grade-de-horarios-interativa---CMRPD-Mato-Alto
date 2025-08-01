
// modais e ações

// Modal para criar novo grupo
function openCreateGroupModal(day) {
    if (!checkAuth()) return;
    
    currentModalContext = { day, type: "create-group" };
    document.getElementById('createGroupForm').reset();
    document.getElementById('createGroupModal').style.display = 'block';
    document.getElementById('newGroupNumber').focus();
}

// funçao criar novo grupo
function createNewGroup() {
    const { day, groupId, type } = currentModalContext;
    
    const numeroGrupo = document.getElementById('newGroupNumber').value.trim();
    const categoria = document.getElementById('newGroupCategory').value;
    const horario = document.getElementById('newGroupTime').value;
    const ocultarProfissionais = document.getElementById('ocultarProfissionaisCheckbox').checked;
    
    if (!categoria) {
        alert('Por favor, selecione uma categoria');
        return;
    }
    
    // Verifica se já existe um grupo com esse número no mesmo dia (apenas se número foi informado)
    if (numeroGrupo) {
        const existingGroup = Object.entries(scheduleData[day] || {}).find(([id, group]) => 
            group.numeroGrupo === numeroGrupo && (type !== "edit-group" || parseInt(id) !== groupId)
        );
        
        if (existingGroup) {
            alert(`Já existe um grupo com o número "${numeroGrupo}" na ${dayNames[day]}`);
            return;
        }
    }
    
    if (type === "edit-group") {
        // Editando grupo existente
        if (!scheduleData[day] || !scheduleData[day][groupId]) {
            alert('Grupo não encontrado!');
            return;
        }
        
        scheduleData[day][groupId].numeroGrupo = numeroGrupo || "";
        scheduleData[day][groupId].horario = horario;
        scheduleData[day][groupId].categoria = categoria;
        scheduleData[day][groupId].ocultarProfissionais = ocultarProfissionais;
        
        saveScheduleData().then(() => {
            console.log('✅ Grupo editado e salvo no Firebase');
            renderGroupsForDay(day);
            updateGradeView(); // Atualiza a grade também
            closeModal('createGroupModal');
            
            const groupDisplayName = numeroGrupo ? `Grupo ${numeroGrupo}` : 'Grupo sem número';
            alert(`${groupDisplayName} editado com sucesso!`);
        }).catch(error => {
            console.error('❌ Erro ao salvar grupo editado:', error);
            alert('Erro ao editar grupo. Tente novamente.');
        });
    } else {
        // Criando novo grupo
        const newGroupId = Date.now();
        lastCreatedGroupId = newGroupId;
        
        if (!scheduleData[day]) {
            scheduleData[day] = {};
        }
        
        scheduleData[day][newGroupId] = {
            numeroGrupo: numeroGrupo || "",
            horario: horario,
            categoria: categoria,
            usuarios: [],
            profissionais: [],
            ocultarProfissionais: ocultarProfissionais,
            createdAt: Date.now()
        };
        
        saveScheduleData().then(() => {
            console.log('✅ Novo grupo criado e salvo no Firebase');
            renderGroupsForDay(day);
            updateGradeView(); // Atualiza a grade também
            closeModal('createGroupModal');
            
            const groupDisplayName = numeroGrupo ? `Grupo ${numeroGrupo}` : 'Grupo sem número';
            alert(`${groupDisplayName} criado com sucesso!`);
            
            scrollToNewGroup(day, newGroupId);
        }).catch(error => {
            console.error('❌ Erro ao salvar novo grupo:', error);
            alert('Erro ao criar grupo. Tente novamente.');
            delete scheduleData[day][newGroupId];
            lastCreatedGroupId = null;
        });
    }
}


function openUserModal(day, groupId) {
    if (!checkAuth()) return;
    
    if (!scheduleData[day] || !scheduleData[day][groupId]) {
        alert("Erro: Grupo não encontrado");
        return;
    }
    
    // Verifica se usuarios existe e é array, senão inicializa
if (!scheduleData[day][groupId].usuarios) {
    scheduleData[day][groupId].usuarios = [];
}


    
    currentModalContext = { day, groupId, type: "user" };
    document.getElementById("userModal").style.display = "block";
    document.getElementById("userForm").reset();
    document.getElementById("userName").focus();
}

function openProfessionalModal(day, groupId) {
    if (!checkAuth()) return;
    
    if (!scheduleData[day] || !scheduleData[day][groupId]) {
        alert("Erro: Grupo não encontrado");
        return;
    }
    
    // Verifica se profissionais existe e é array, senão inicializa
if (!scheduleData[day][groupId].profissionais) {
    scheduleData[day][groupId].profissionais = [];
}


    
    currentModalContext = { day, groupId };
    const select = document.getElementById('professionalSelect');
    select.innerHTML = '<option value="">Selecione um profissional</option>';
    
    masterProfessionals.forEach(prof => {
        if (!scheduleData[day][groupId].profissionais.includes(prof.id) && !isProfessionalOnDayOff(prof.id, day)) {
            const option = document.createElement('option');
            option.value = prof.id;
            option.textContent = `${prof.nome} (${prof.categoria})`;
            select.appendChild(option);
        }
    });
    
    masterProfessionals.forEach(prof => {
        if (!scheduleData[day][groupId].profissionais.includes(prof.id) && isProfessionalOnDayOff(prof.id, day)) {
            const option = document.createElement('option');
            option.value = prof.id;
            option.textContent = `${prof.nome} (${prof.categoria}) - FOLGA`;
            option.disabled = true;
            option.style.color = '#999';
            select.appendChild(option);
        }
    });
    
    // Preenche o checkbox de ocultar profissionais
    const group = scheduleData[day][groupId];
    const checkbox = document.getElementById('ocultarProfissionaisProfModal');
    if (checkbox) {
        checkbox.checked = group.ocultarProfissionais || false;
        
        // Remove listener anterior se existir
        checkbox.onchange = null;
        
        // Adiciona listener para salvar quando alterado
        checkbox.onchange = function() {
            group.ocultarProfissionais = checkbox.checked;
            saveScheduleData().then(() => {
                console.log('✅ Estado de ocultar profissionais salvo:', checkbox.checked);
                updateGradeView();
            }).catch(error => {
                console.error('❌ Erro ao salvar estado:', error);
            });
        };
    }
    
    document.getElementById("professionalModal").style.display = "block";
}

function openRegisterProfessionalModal() {
    if (!checkAuth()) return;
    document.getElementById('registerProfessionalForm').reset();
    document.getElementById('registerProfessionalModal').style.display = 'block';
    document.getElementById('regProfName').focus();
}

function openManageDaysOffModal(professionalId) {
    if (!checkAuth()) return;
    
    const prof = masterProfessionals.find(p => p.id === professionalId);
    if (!prof) return;
    
    currentModalContext = { professionalId };
    
    document.getElementById('profNameDaysOff').value = prof.nome;
    
    document.querySelectorAll('input[name="daysOff"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    if (prof.daysOff && prof.daysOff.length > 0) {
        prof.daysOff.forEach(day => {
            const checkbox = document.querySelector(`input[name="daysOff"][value="${day}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    document.getElementById("manageDaysOffModal").style.display = "block";
}

function openEditProfessionalNameModal(professionalId) {
    if (!checkAuth()) return;
    
    const prof = masterProfessionals.find(p => p.id === professionalId);
    if (!prof) return;
    
    currentModalContext = { professionalId };
    
    document.getElementById('currentProfName').value = prof.nome;
    document.getElementById('newProfName').value = prof.nome;
    
    document.getElementById('editProfessionalNameModal').style.display = 'block';
    document.getElementById('newProfName').focus();
}

function closeModal(id) {
    // Salva o estado do checkbox antes de fechar o modal de gerenciamento
    if (id === 'manageCellProfessionalsModal') {
        saveOcultarProfissionaisState();
    }
    
    // Salva o estado do checkbox do modal de profissionais
    if (id === 'professionalModal') {
        const { day, groupId } = currentModalContext;
        if (day && groupId) {
            const checkbox = document.getElementById('ocultarProfissionaisProfModal');
            const group = scheduleData[day]?.[groupId];
            if (checkbox && group) {
                group.ocultarProfissionais = checkbox.checked;
                saveScheduleData().then(() => {
                    updateGradeView();
                }).catch(error => {
                    console.error('❌ Erro ao salvar:', error);
                });
            }
        }
    }
    
    document.getElementById(id).style.display = "none";
    
    // Restaura o título original do modal de criar grupo
    if (id === 'createGroupModal') {
        document.querySelector('#createGroupModal .modal-title').textContent = '➕ Criar Novo Grupo';
        document.querySelector('#createGroupModal .btn-confirm').textContent = 'Criar Grupo';
        // Limpa o checkbox
        document.getElementById('ocultarProfissionaisCheckbox').checked = false;
    }
    
    currentModalContext = {};
}

// Salva o estado do checkbox de ocultar profissionais
function saveOcultarProfissionaisState() {
    const { day, groupId } = currentCellManagementContext;
    if (!day || !groupId) return;
    
    const checkbox = document.getElementById('ocultarProfissionaisCheckboxReal');
    if (!checkbox) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    group.ocultarProfissionais = checkbox.checked;
    
    // Salva no Firebase
    saveScheduleData().then(() => {
        console.log('✅ Estado de ocultar profissionais salvo:', checkbox.checked);
        updateGradeView(); // Atualiza a grade para refletir a mudança
    }).catch(error => {
        console.error('❌ Erro ao salvar estado:', error);
    });
}

// Atualiza o estado de ocultar profissionais na edição inline
function updateOcultarProfissionais(day, groupId, isChecked) {
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    group.ocultarProfissionais = isChecked;
    
    // Salva automaticamente no Firebase
    saveScheduleData().then(() => {
        console.log('✅ Estado de ocultar profissionais atualizado:', isChecked);
        // Não precisa recarregar a grade aqui porque está em modo de edição
    }).catch(error => {
        console.error('❌ Erro ao salvar estado:', error);
    });
}

// remoçao de dados

function deleteGroup(day, groupId) {
    if (!checkAuth()) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    // *** NOVA LÓGICA PARA NOME DO GRUPO ***
    let groupDisplayName;
    if (isSpecificActivity(group.categoria)) {
        groupDisplayName = group.categoria;
    } else if (group.numeroGrupo) {
        groupDisplayName = `Grupo ${group.numeroGrupo}`;
    } else {
        groupDisplayName = "Grupo sem número";
    }
    
    if (confirm(`Tem certeza que deseja excluir completamente o ${groupDisplayName}?\n\nEsta ação não pode ser desfeita.`)) {
        delete scheduleData[day][groupId];
        
        saveScheduleData().then(() => {
            console.log('✅ Grupo deletado e salvo no Firebase');
            renderGroupsForDay(day);
            updateGradeView(); // Atualiza a grade também
        }).catch(error => {
            console.error('❌ Erro ao deletar grupo:', error);
            alert('Erro ao deletar grupo. Tente novamente.');
            scheduleData[day][groupId] = group;
        });
    }
}


function removeUser(day, groupId, idx) {
    if (!checkAuth()) return;
    if (confirm("Tem certeza que deseja remover este usuário?")) {
        if (scheduleData[day] && scheduleData[day][groupId] && scheduleData[day][groupId].usuarios) {
            scheduleData[day][groupId].usuarios.splice(idx, 1);
            
            saveScheduleData().then(() => {
                console.log('✅ Usuário removido e salvo no Firebase');
            }).catch(error => {
                console.error('❌ Erro ao remover usuário:', error);
                alert('Erro ao remover usuário. Tente novamente.');
            });
            
            renderUsers(day, groupId);
        }
    }
}

function removeProfessional(day, groupId, idx) {
    if (!checkAuth()) return;
    if (confirm("Tem certeza que deseja remover este profissional?")) {
        if (scheduleData[day] && scheduleData[day][groupId] && scheduleData[day][groupId].profissionais) {
            scheduleData[day][groupId].profissionais.splice(idx, 1);
            
            saveScheduleData().then(() => {
                console.log('✅ Profissional removido e salvo no Firebase');
            }).catch(error => {
                console.error('❌ Erro ao remover profissional:', error);
                alert('Erro ao remover profissional. Tente novamente.');
            });
            
            renderProfessionals(day, groupId);
        }
    }
}

function removeMasterProfessional(profId) {
    if (!checkAuth()) return;
    
    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) return;
    
    let isInUse = false;
    days.forEach(day => {
        if (!scheduleData[day]) return;
        
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (group && group.profissionais && Array.isArray(group.profissionais) && group.profissionais.includes(profId)) {
                isInUse = true;
            }
        });
    });
    
    if (isInUse) {
        alert(`❌ Não é possível remover ${prof.nome}.\nEste profissional está alocado em um ou mais grupos.\nRemova-o primeiro dos grupos antes de excluí-lo.`);
        return;
    }
    
    if (confirm(`Tem certeza que deseja remover ${prof.nome} da lista de profissionais?`)) {
        const index = masterProfessionals.findIndex(p => p.id === profId);
        if (index !== -1) {
            masterProfessionals.splice(index, 1);
        }
        
        deleteProfessional(profId).then(() => {
            console.log('✅ Profissional removido do Firebase');
            renderMasterProfessionalsList();
            
            const detailsView = document.getElementById('professional-details-view');
            if (detailsView) {
                detailsView.innerHTML = '<div class="empty-state">Selecione um profissional da lista para ver os detalhes.</div>';
            }
        }).catch(error => {
            console.error('❌ Erro ao remover profissional:', error);
            alert('Erro ao remover profissional. Tente novamente.');
            
            if (index !== -1) {
                masterProfessionals.splice(index, 0, prof);
                renderMasterProfessionalsList();
            }
        });
    }
}

function removeProfessionalFromDayOffGroups(professionalId, daysOff) {
    daysOff.forEach(day => {
        if (!scheduleData[day]) return;
        
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (!group || !group.profissionais || !Array.isArray(group.profissionais)) return;
            
            const index = group.profissionais.indexOf(professionalId);
            if (index !== -1) {
                group.profissionais.splice(index, 1);
                renderProfessionals(day, groupId);
            }
        });
    });
    
    saveScheduleData().then(() => {
        console.log('✅ Profissional removido dos dias de folga e salvo no Firebase');
    }).catch(error => {
        console.error('❌ Erro ao salvar mudanças de folgas:', error);
    });
}


// detalhes dos profissionais


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
    if (!detailsContainer) return;
    
    let content = `<h3>Grupos de ${prof.nome}`;
    if (dayFilter) {
        content += ` - ${dayNames[dayFilter]}`;
    }
    content += `</h3>`;
    
    if (prof.daysOff && prof.daysOff.length > 0) {
        const daysOffNames = prof.daysOff.map(d => dayNames[d]).join(', ');
        content += `<div class="days-off-info">🏖️ <strong>Dias de Folga:</strong> ${daysOffNames}</div>`;
    }
    
    let foundInGroups = false;
    const daysToShow = dayFilter ? [dayFilter] : days;
    
    daysToShow.forEach(day => {
        if (!scheduleData[day]) return;
        
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (group && group.profissionais && group.profissionais.includes(prof.id)) {
                foundInGroups = true;
                const categoriaTexto = group.categoria || "Categoria não definida";
                
                const displayTitle = isSpecificActivity(group.categoria)
                    ? `${dayNames[day]} - ${group.categoria} (${group.horario})`
                    : `${dayNames[day]} - Grupo ${groupId} (${group.horario}) - ${categoriaTexto}`;
                
                content += `
                    <div class="details-group-card">
                        <h4>${displayTitle}</h4>
                `;
                
                if (group.usuarios && group.usuarios.length > 0) {
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


// grade de horários

let isGroupManagementMode = false;
let currentGradeSelectedDay = '';
let editableBlockCounter = 0;

// Função removida - criação de grupos agora é feita diretamente na grade

function openEditGroupModal(day, groupId) {
    if (!checkAuth()) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group) {
        alert('Grupo não encontrado!');
        return;
    }
    
    // Popula o modal com os dados atuais do grupo
    document.getElementById('newGroupNumber').value = group.numeroGrupo || '';
    document.getElementById('newGroupCategory').value = group.categoria || '';
    document.getElementById('newGroupTime').value = group.horario || '09:00';
    document.getElementById('ocultarProfissionaisCheckbox').checked = group.ocultarProfissionais || false;
    
    // Altera o contexto para edição
    currentModalContext = { day, groupId: parseInt(groupId), type: "edit-group" };
    
    // Muda o título do modal
    document.querySelector('#createGroupModal .modal-title').textContent = '✏️ Editar Grupo';
    document.querySelector('#createGroupModal .btn-confirm').textContent = 'Salvar Alterações';
    
    document.getElementById('createGroupModal').style.display = 'block';
    document.getElementById('newGroupNumber').focus();
    
}

function toggleGroupManagementMode() {
    if (!checkAuth()) return;
    
    isGroupManagementMode = !isGroupManagementMode;
    const btn = document.querySelector('.btn-manage-groups');
    
    if (isGroupManagementMode) {
        btn.textContent = '✅ Sair do Modo Gerenciamento';
        btn.style.background = '#ef4444';
    } else {
        btn.textContent = '⚙️ Gerenciar Grupos';
        btn.style.background = '';
    }
    
    updateGradeView();
}

function createEditableActivityBlock(activity, day, timeSlot, index) {
    const blockId = `activity-${day}-${timeSlot}-${index}`;
    let groupName = '';
    let usersList = '';
    let professionalsList = '';

    // Monta o nome do grupo
    if (isSpecificActivity(activity.categoria)) {
        groupName = activity.categoria;
    } else {
        groupName = activity.numeroGrupo ? `Grupo ${activity.numeroGrupo}` : '';
        if (activity.categoria) {
            groupName += ` - ${activity.categoria}`;
        }
    }

    // Monta lista de usuários
    usersList = activity.usuarios.join(', ');

    // Monta lista de profissionais
    professionalsList = activity.profissionais.join(', ');

    return `
        <div class="editable-activity-block" id="${blockId}" data-group-id="${activity.groupId}">
            <div class="block-controls">
                <button class="btn-remove-block" onclick="removeActivityBlock('${day}', '${activity.groupId}')" title="Remover bloco">❌</button>
            </div>
            <div class="editable-field">
                <label>Grupo:</label>
                <input type="text" class="group-name-input" value="${groupName}" 
                       onblur="updateActivityData('${day}', '${activity.groupId}', 'groupName', this.value)"
                       placeholder="Nome do grupo">
            </div>
            <div class="editable-field">
                <label>Usuários:</label>
                <textarea class="users-input" rows="2" 
                          onblur="updateActivityData('${day}', '${activity.groupId}', 'users', this.value)"
                          placeholder="Lista de usuários (separados por vírgula)">${usersList}</textarea>
            </div>
            <div class="editable-field">
                <label>Profissionais:</label>
                <div class="professionals-section">
                    <div class="current-professionals">${professionalsList || 'Nenhum profissional'}</div>
                    <button class="btn-manage-professionals" onclick="openProfessionalModal('${day}', '${activity.groupId}')">
                        👨‍⚕️ Gerenciar
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createEmptyEditableBlock(day, timeSlot) {
    const blockId = `empty-${day}-${timeSlot}-${++editableBlockCounter}`;
    
    return `
        <div class="editable-activity-block empty-block" id="${blockId}">
            <div class="editable-field">
                <label>Novo Grupo:</label>
                <input type="text" class="group-name-input" 
                       onblur="createNewActivityFromInput(this, '${day}', '${timeSlot}')"
                       placeholder="Digite o nome do grupo para criar">
            </div>
        </div>
    `;
}

function createReadOnlyActivityBlock(activity) {
    let activityClass = 'day-activity readonly';
    if (activity.categoria === 'EVOLUÇÃO') {
        activityClass += ' evolucao';
    } else if (activity.categoria === 'REUNIÃO GAIA') {
        activityClass += ' reuniao-gaia';
    } else if (activity.categoria === 'GAIA') {
        activityClass += ' gaia';
    } else if (activity.categoria === 'INDIVIDUAL') {
        activityClass += ' individual';
    }
    
    let html = `<div class="${activityClass}">`;
    
    if (isSpecificActivity(activity.categoria)) {
        if (activity.categoria === "INDIVIDUAL") {
            html += `<div class="day-activity-name">INDIVIDUAL</div>`;
            if (activity.usuarios.length > 0) {
                html += `<div class="day-activity-details">👤 ${activity.usuarios.join(' - ')}</div>`;
            }
        } else {
            html += `<div class="day-activity-name">${activity.categoria}</div>`;
        }
    } else {
        const groupDisplayText = activity.categoria && activity.categoria !== '' 
            ? `Grupo ${activity.numeroGrupo || activity.groupId} - ${activity.categoria.toUpperCase()}`
            : `Grupo ${activity.numeroGrupo || activity.groupId} - Sem categoria`;
        
        html += `<div class="day-activity-name">${groupDisplayText}</div>`;
        
        if (activity.usuarios.length > 0) {
            html += `<div class="day-activity-details">👤 ${activity.usuarios.join(' - ')}</div>`;
        }
    }
    
    if (activity.profissionais.length > 0) {
        html += `<div class="day-activity-details">👨‍⚕️ ${activity.profissionais.join(', ')}</div>`;
    }
    
    html += `</div>`;
    return html;
}

function updateGradeView() {
    const selectedCategory = document.getElementById('categoryFilter').value;
    const selectedWeekday = document.getElementById('gradeWeekdayFilter').value;
    const gradeContent = document.getElementById('grade-content');
    
    // Armazena o dia selecionado para uso em outras funções
    currentGradeSelectedDay = selectedWeekday;

    // Se nenhum filtro selecionado
    if (!selectedCategory && !selectedWeekday) {
        gradeContent.innerHTML = '<div class="empty-state">Selecione uma categoria ou um dia da semana para visualizar a grade</div>';
        return;
    }

    // Se só dia selecionado (categoria vazia ou "todas")
    if (!selectedCategory && selectedWeekday) {
        showDayOverview(selectedWeekday);
        return;
    }

    // Se só categoria selecionada (dia vazio ou "todos")
    if (selectedCategory && !selectedWeekday) {
        showCategoryView(selectedCategory);
        return;
    }

    // Se ambos selecionados (categoria específica + dia específico)
    if (selectedCategory && selectedWeekday) {
        showCategoryAndDayView(selectedCategory, selectedWeekday);
        return;
    }
}

function showDayOverview(selectedDay) {
    const gradeContent = document.getElementById('grade-content');
    
    let html = `
        <div class="day-overview">
            <div class="table-container">
                <table class="day-overview-table">
                    <thead>
                        <tr>
                            <th>Horário</th>
                            <th>Atividades Programadas</th>
                            <th>${isAuthenticated ? 'Profissionais Livres' : 'Acesso Restrito'}</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    let hasActivities = false;

    timeSlots.forEach(timeSlot => {
        const activities = getDayActivitiesAtTime(selectedDay, timeSlot);
        const availableProfessionals = getProfessionalsAvailableAtTime(selectedDay, timeSlot);
        
        html += `<tr data-time="${timeSlot}">
            <td class="time-column" data-label="Horário"><div class="time-content">${timeSlot}</div></td>
            <td class="activities-column" data-label="Atividades">`;
        
        if (activities.length > 0) {
            hasActivities = true;
            activities.forEach((activity, index) => {
                let activityClass = 'day-activity';
                if (activity.categoria === 'EVOLUÇÃO') {
                    activityClass += ' evolucao';
                } else if (activity.categoria === 'REUNIÃO GAIA') {
                    activityClass += ' reuniao-gaia';
                } else if (activity.categoria === 'GAIA') {
                    activityClass += ' gaia';
                } else if (activity.categoria === 'INDIVIDUAL') {
                    activityClass += ' individual';
                }
                
                if (isSpecificActivity(activity.categoria)) {
                    activityClass += ' specific';
                }
                
                html += `<div class="${activityClass}" data-activity-index="${index}" data-group-id="${activity.groupId}">`;
                
                // Adiciona botões de gerenciamento se estiver no modo gerenciamento
                if (isGroupManagementMode && isAuthenticated) {
                    html += `<div class="group-management-buttons">
                        <button class="btn-edit-group" onclick="openEditGroupModal('${selectedDay}', '${activity.groupId}')" title="Editar grupo">✏️</button>
                        <button class="btn-add-user" onclick="openUserModal('${selectedDay}', '${activity.groupId}')" title="Adicionar usuário">👤+</button>
                        <button class="btn-add-professional" onclick="openProfessionalModal('${selectedDay}', '${activity.groupId}')" title="Adicionar profissional">👨‍⚕️+</button>
                        <button class="btn-delete-group-mini" onclick="deleteGroup('${selectedDay}', '${activity.groupId}')" title="Excluir grupo">🗑️</button>
                    </div>`;
                }
                
                if (isSpecificActivity(activity.categoria)) {
                    if (activity.categoria === "INDIVIDUAL") {
                        html += `<div class="day-activity-name">INDIVIDUAL</div>`;
                        if (activity.usuarios.length > 0) {
                            html += `<div class="day-activity-details">👤 ${activity.usuarios.join(' - ')}</div>`;
                        }
                    } else {
                        html += `<div class="day-activity-name">${activity.categoria}</div>`;
                    }
                } else {
                    const groupDisplayText = activity.categoria && activity.categoria !== '' 
                        ? `Grupo ${activity.numeroGrupo || activity.groupId} - ${activity.categoria.toUpperCase()}`
                        : `Grupo ${activity.numeroGrupo || activity.groupId} - Sem categoria`;
                    
                    html += `<div class="day-activity-name">${groupDisplayText}</div>`;
                    
                    if (activity.usuarios.length > 0) {
                        html += `<div class="day-activity-details">👤 ${activity.usuarios.join(' - ')}</div>`;
                    }
                }
                
                if (activity.profissionais.length > 0) {
                    html += `<div class="day-activity-details">👨‍⚕️ ${activity.profissionais.join(', ')}</div>`;
                }
                
                html += `</div>`;
            });
        } else {
            html += '<div class="no-activities">Nenhuma atividade programada</div>';
        }
        
        html += `</td>`;
        
        // Coluna de profissionais livres (só para admins)
if (isAuthenticated === true) {
    html += `<td class="free-professionals-column" data-label="Profissionais Livres" data-free-count="${availableProfessionals.length}">`;
} else {
    html += `<td class="restricted-column" data-label="Profissionais Livres">`;
}
        
        if (isAuthenticated) {
    if (availableProfessionals.length > 0) {
            // Agrupa por categoria
            const professionalsByCategory = {};
            availableProfessionals.forEach(prof => {
                if (!professionalsByCategory[prof.categoria]) {
                    professionalsByCategory[prof.categoria] = [];
                }
                professionalsByCategory[prof.categoria].push(prof);
            });
            
            // Exibe agrupado por categoria
            Object.keys(professionalsByCategory).sort().forEach(categoria => {
                html += `<div class="free-professionals-category">
                    <div class="category-header">
                        <span class="category-name">${categoria}</span>
                        <span class="category-count">(${professionalsByCategory[categoria].length})</span>
                    </div>
                    <div class="professionals-list">`;
                
                professionalsByCategory[categoria].forEach((prof, index) => {
    // Adiciona separador antes do nome (exceto para o primeiro)
    if (index > 0) {
        html += `<span class="name-separator"> | </span>`;
    }
    
    html += `<span class="free-professional-name" 
                   data-professional-id="${prof.id}" 
                   title="${prof.nome} - ${prof.categoria}"
                   onclick="highlightProfessional('${prof.id}')">${prof.nome}</span>`;
});
                
                html += `</div></div>`;
            });
        } else {
        html += '<div class="no-free-professionals">Todos os profissionais estão ocupados ou de folga</div>';
    }
} else {
    html += '<div class="access-restricted">🔒 Faça login como administrador para ver os profissionais disponíveis</div>';
}
        
        html += `</td></tr>`;
    });

    html += `</tbody></table></div>`;
    


    if (!hasActivities && masterProfessionals.length === 0) {
        html = `<div class="empty-state">
            <h3>Nenhum dado disponível</h3>
            <p>Não há atividades programadas nem profissionais cadastrados para ${dayNames[selectedDay]}</p>
            <p>Cadastre profissionais na aba "👨‍⚕️ Profissionais" e crie grupos nos dias da semana.</p>
        </div>`;
    }

    gradeContent.innerHTML = html;
}



// Função para destacar um profissional 
function highlightProfessional(professionalId) {
    // Remove destaque anterior
    document.querySelectorAll('.free-professional-name.highlighted').forEach(el => {
        el.classList.remove('highlighted');
    });
    
    // Adiciona destaque ao profissional clicado
    document.querySelectorAll(`[data-professional-id="${professionalId}"]`).forEach(el => {
        el.classList.add('highlighted');
    });
    
    // Remove destaque após 3 segundos
    setTimeout(() => {
        document.querySelectorAll('.free-professional-name.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
    }, 3000);
}

function getDayActivitiesAtTime(day, timeSlot) {
    const activities = [];
    
    if (!scheduleData[day]) return activities;
    
    Object.keys(scheduleData[day]).forEach(groupId => {
        const group = scheduleData[day][groupId];
        
        if (group && group.horario === timeSlot && 
            ((group.usuarios && group.usuarios.length > 0) || 
             (group.profissionais && group.profissionais.length > 0))) {
            
            const profissionais = group.ocultarProfissionais ? [] : (group.profissionais || [])
                .map(profId => masterProfessionals.find(prof => prof.id === profId))
                .filter(prof => prof)
                .map(prof => prof.nome);
                
            const usuarios = (group.usuarios || []).map(user => user.nome);
            
            activities.push({
    groupId: groupId,
    numeroGrupo: group.numeroGrupo, 
    categoria: group.categoria,
    profissionais: profissionais,
    usuarios: usuarios,
    ocultarProfissionais: group.ocultarProfissionais || false
});
        }
    });
    
    return activities;
}

function showCategoryView(selectedCategory) {
    const gradeContent = document.getElementById('grade-content');
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

function showCategoryAndDayView(selectedCategory, selectedDay) {
    const gradeContent = document.getElementById('grade-content');
    const professionalsByCategory = masterProfessionals.filter(prof => prof.categoria === selectedCategory);
    
    if (professionalsByCategory.length === 0) {
        gradeContent.innerHTML = `<div class="empty-state">Nenhum profissional cadastrado na categoria "${selectedCategory}"</div>`;
        return;
    }

    let gradeHTML = '<div class="grade-professionals">';
    professionalsByCategory.forEach(prof => {
        gradeHTML += generateProfessionalGridForDay(prof, selectedDay);
    });
    gradeHTML += '</div>';
    gradeContent.innerHTML = gradeHTML;
}

function generateProfessionalGridForDay(professional, selectedDay) {
    let gridHTML = `
        <div class="professional-grid">
            <h3 class="professional-name">${professional.nome} - ${dayNames[selectedDay]}</h3>
    `;
    
    if (isProfessionalOnDayOff(professional.id, selectedDay)) {
        gridHTML += `
            <div class="day-off-notice">
                🏖️ Este profissional está de folga na ${dayNames[selectedDay]}
            </div>
        `;
    } else {
        gridHTML += `
            <div class="grid-table">
                <table>
                    <thead>
                        <tr>
                            <th>Horário</th>
                            <th>${dayNames[selectedDay]}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        timeSlots.forEach(timeSlot => {
            gridHTML += `<tr><td class="time-cell">${timeSlot}</td>`;
            
            const activities = getProfessionalActivitiesAtTime(professional.id, selectedDay, timeSlot);
            const cellClass = activities.length > 0 ? 'occupied-cell' : 'empty-cell';

            gridHTML += `<td class="${cellClass}" data-day="${selectedDay}" data-time="${timeSlot}" data-prof-id="${professional.id}">`;
            
            if (isAuthenticated) {
                // Versão editável para administradores
                if (activities.length > 0) {
                    activities.forEach(activity => {
                        gridHTML += createEditableActivityBlockForProfessional(activity, selectedDay, timeSlot);
                    });
                }
                // Botão para adicionar novo grupo para este profissional
                gridHTML += `<button class="btn-add-activity-for-prof" 
                           onclick="addActivityForProfessional('${selectedDay}', '${timeSlot}', ${professional.id})"
                           title="Adicionar atividade">➕</button>`;
            } else {
                // Versão somente leitura
                if (activities.length > 0) {
                    activities.forEach(activity => {
                        let activityClass = 'activity-item readonly';
                        if (activity.groupCategory === 'EVOLUÇÃO') {
                            activityClass += ' evolucao';
                        } else if (activity.groupCategory === 'REUNIÃO GAIA') {
                            activityClass += ' reuniao-gaia';
                        } else if (activity.groupCategory === 'GAIA') {
                            activityClass += ' gaia';
                        } else if (activity.groupCategory === 'INDIVIDUAL') {
                            activityClass += ' individual';
                        }

                        if (isSpecificActivity(activity.groupCategory)) {
                            if (activity.groupCategory === "INDIVIDUAL") {
                                gridHTML += `<div class="${activityClass}">
                                    <div class="activity-group">INDIVIDUAL</div>`;
                                if (activity.userNames !== 'Nenhum usuário') {
                                    gridHTML += `<div class="activity-users">👤 ${activity.userNames}</div>`;
                                }
                                gridHTML += `</div>`;
                            } else {
                                gridHTML += `<div class="${activityClass}">
                                    <div class="activity-group">${activity.groupCategory}</div>`;
                                
                                if (activity.allProfessionals && activity.allProfessionals.length > 1) {
                                    gridHTML += `<div class="activity-professionals">👨‍⚕️ Profissionais: ${activity.allProfessionals.join(' - ')}</div>`;
                                }
                                
                                gridHTML += `</div>`;
                            }
                        } else {
                            const groupDisplayText = activity.groupCategory && activity.groupCategory !== 'Sem categoria' 
                                ? `Grupo ${activity.numeroGrupo || activity.groupId} - ${activity.groupCategory.toUpperCase()}`
                                : `Grupo ${activity.numeroGrupo || activity.groupId}`;
                            
                            gridHTML += `<div class="${activityClass}">
                                <div class="activity-group">${groupDisplayText}</div>`;
                            
                            if (activity.userNames !== 'Nenhum usuário') {
                                gridHTML += `<div class="activity-users">👤 Usuários: ${activity.userNames}</div>`;
                            }
                            
                            gridHTML += `</div>`;
                        }
                    });
                }
            }
            gridHTML += `</td>`;
            gridHTML += `</tr>`;
        });

        gridHTML += `
                        </tbody>
                    </table>
                </div>
        `;
    }
    
    gridHTML += `</div>`;
    return gridHTML;
}

function generateProfessionalGrid(professional) {
    let gridHTML = `
        <div class="professional-grid">
            <h3 class="professional-name">${professional.nome}</h3>
    `;
    
    if (professional.daysOff && professional.daysOff.length > 0) {
        const daysOffNames = professional.daysOff.map(d => dayNames[d]).join(', ');
        gridHTML += `<div class="days-off-info">🏖️ <strong>Dias de Folga:</strong> ${daysOffNames}</div>`;
    }
    
    gridHTML += `
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
            if (isProfessionalOnDayOff(professional.id, day)) {
                gridHTML += `<td class="day-off-cell">🏖️ FOLGA</td>`;
            } else {
                const activities = getProfessionalActivitiesAtTime(professional.id, day, timeSlot);
                const cellClass = activities.length > 0 ? 'occupied-cell editable-professional-cell' : 'empty-cell editable-professional-cell';
                
                gridHTML += `<td class="${cellClass}" 
                           data-prof-id="${professional.id}" 
                           data-day="${day}" 
                           data-time="${timeSlot}"
                           onclick="makeSpreadsheetCellEditable(this)">`;
                
                if (isAuthenticated) {
                    // Conteúdo editável para administradores
                    let editableContent = '';
                    let professionalContent = '';
                    let groupIds = [];
                    
                    if (activities.length > 0) {
                        activities.forEach(activity => {
                            groupIds.push(activity.groupId);
                            if (editableContent) editableContent += '\n';
                            
                            let groupLine = '';
                            if (isSpecificActivity(activity.groupCategory)) {
                                groupLine = activity.groupCategory;
                            } else {
                                groupLine = activity.numeroGrupo ? 
                                    `Grupo ${activity.numeroGrupo}` : 
                                    `Grupo ${activity.groupId}`;
                                if (activity.groupCategory && activity.groupCategory !== 'Sem categoria') {
                                    groupLine += ` - ${activity.groupCategory}`;
                                }
                            }
                            
                            editableContent += groupLine;
                            
                            if (activity.userNames && activity.userNames !== 'Nenhum usuário') {
                                const users = activity.userNames.replace('👤 Usuários: ', '');
                                editableContent += `\n👤 ${users}`;
                            }
                        });
                        
                        // Gera lista de profissionais do grupo (separada do conteúdo editável)
                        const group = scheduleData[day]?.[activities[0].groupId];
                        if (group && group.profissionais && group.profissionais.length > 0 && !group.ocultarProfissionais) {
                            professionalContent = group.profissionais.map(profId => {
                                const prof = masterProfessionals.find(p => p.id === profId);
                                return prof ? prof.nome : 'Profissional não encontrado';
                            }).join(', ');
                        }
                    }
                    
                    // Conteúdo editável (grupo e usuários)
                    gridHTML += `<div class="spreadsheet-cell-content" contenteditable="false">${editableContent.replace(/\n/g, '<br>')}</div>`;
                    
                    // Lista de profissionais (protegida, não editável)
                    if (professionalContent) {
                        gridHTML += `<div class="cell-professionals-list">`;
                        
                        const group = scheduleData[day]?.[activities[0].groupId];
                        if (group && group.profissionais) {
                            group.profissionais.forEach(profId => {
                                const prof = masterProfessionals.find(p => p.id === profId);
                                if (prof) {
                                    gridHTML += `<div class="professional-item-inline">
                                        <span class="prof-name">👨‍⚕️ ${prof.nome}</span>
                                        <button class="btn-remove-prof-inline" 
                                                data-day="${day}" data-groupid="${activities[0].groupId}" data-profid="${profId}"
                                                title="Remover profissional">❌</button>
                                    </div>`;
                                }
                            });
                        }
                        
                        // Botão para adicionar profissional (será convertido para event listener seguro)
                        gridHTML += `<button class="btn-add-prof-inline" 
                                   data-day="${day}" data-groupid="${activities[0].groupId}"
                                   title="Adicionar profissional">➕</button>`;
                        
                        gridHTML += `</div>`;
                    }
                    
                    gridHTML += `<div class="cell-controls">`;
                    gridHTML += `<div class="cell-edit-indicator">📝</div>`;
                    
                    // Botão para gerenciar profissionais (só aparece se há atividade)
                    if (activities.length > 0) {
                        const primaryGroupId = activities[0].groupId;
                        gridHTML += `<button class="btn-manage-cell-professionals" 
                                   onclick="openProfessionalManagementForCell('${day}', '${primaryGroupId}', event)" 
                                   title="Gerenciar profissionais deste grupo">👥</button>`;
                    }
                    
                    gridHTML += `</div>`;
                } else {
                    // Versão somente leitura para visitantes
                    if (activities.length > 0) {
                        activities.forEach(activity => {
                            let activityClass = 'activity-item readonly';
                            if (activity.groupCategory === 'EVOLUÇÃO') {
                                activityClass += ' evolucao';
                            } else if (activity.groupCategory === 'REUNIÃO GAIA') {
                                activityClass += ' reuniao-gaia';
                            } else if (activity.groupCategory === 'GAIA') {
                                activityClass += ' gaia';
                            } else if (activity.groupCategory === 'INDIVIDUAL') {
                                activityClass += ' individual';
                            }

                            if (isSpecificActivity(activity.groupCategory)) {
                                if (activity.groupCategory === "INDIVIDUAL") {
                                    gridHTML += `<div class="${activityClass}">
                                        <div class="activity-group">INDIVIDUAL</div>`;
                                    if (activity.userNames !== 'Nenhum usuário') {
                                        gridHTML += `<div class="activity-users">👤 Usuários: ${activity.userNames}</div>`;
                                    }
                                    gridHTML += `</div>`;
                                } else {
                                    gridHTML += `<div class="${activityClass}">
                                        <div class="activity-group">${activity.groupCategory}</div>`;
                                    gridHTML += `</div>`;
                                }
                            } else {
                                const groupDisplayText = activity.groupCategory && activity.groupCategory !== 'Sem categoria' 
                                    ? `Grupo ${activity.numeroGrupo || activity.groupId} - ${activity.groupCategory.toUpperCase()}`
                                    : `Grupo ${activity.numeroGrupo || activity.groupId}`;
                                
                                gridHTML += `<div class="${activityClass}">
                                    <div class="activity-group">${groupDisplayText}</div>`;
                                
                                if (activity.userNames !== 'Nenhum usuário') {
                                    gridHTML += `<div class="activity-users">👤 Usuários: ${activity.userNames}</div>`;
                                }
                                
                                gridHTML += `</div>`;
                            }
                        });
                    }
                }
                
                gridHTML += `</td>`;
            }
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
    
    if (!scheduleData[day]) return activities;
    
    Object.keys(scheduleData[day]).forEach(groupId => {
        const group = scheduleData[day][groupId];
        if (group && group.horario === timeSlot && 
            group.profissionais && group.profissionais.includes(professionalId)) {
            
           const userNames = (group.usuarios && group.usuarios.length > 0)
    ? group.usuarios.map(user => user.nome).join(' - ')
    : 'Nenhum usuário';

const allProfessionals = group.ocultarProfissionais ? [] : (group.profissionais || [])
    .map(profId => masterProfessionals.find(prof => prof.id === profId))
    .filter(prof => prof)
    .map(prof => prof.nome);
    
activities.push({
    groupId: groupId,
    numeroGrupo: group.numeroGrupo,
    groupCategory: group.categoria || 'Sem categoria',
    userNames: userNames,
    allProfessionals: allProfessionals,
    ocultarProfissionais: group.ocultarProfissionais || false
});
        }
    });
    return activities;
}


// exportação

function exportToCSV() {
    if (!isAuthenticated) {
        alert("⛔ Acesso negado! Faça login como administrador para exportar dados.");
        return;
    }
    
    let csv = "Dia da Semana;Grupo;Horário;Categoria;Tipo;Nome;Idade;Deficiência;Programa;Categoria Profissional;Status\n";
    
    days.forEach(day => {
        if (!scheduleData[day]) return;
        
        Object.keys(scheduleData[day]).forEach(gid => {
            const g = scheduleData[day][gid];
            if (!g) return;
            
            const categoriaTexto = g.categoria || "Categoria não definida";
            const groupDisplayName = isSpecificActivity(g.categoria) 
                ? g.categoria 
                : `Grupo ${g.numeroGrupo || gid}`;
            
            if (g.usuarios && g.usuarios.length > 0) {
                g.usuarios.forEach(u => {
                    csv += `${dayNames[day]};${groupDisplayName};${g.horario};${categoriaTexto};Usuário;${u.nome};${u.idade};${u.deficiencia};${u.programa};;Ativo\n`;
                });
            }
            
            if (g.profissionais && g.profissionais.length > 0) {
                g.profissionais.forEach(profId => {
                    const p = masterProfessionals.find(prof => prof.id === profId);
                    if (p) {
                        const status = isProfessionalOnDayOff(profId, day) ? 'FOLGA' : 'Ativo';
                        csv += `${dayNames[day]};${groupDisplayName};${g.horario};${categoriaTexto};Profissional;${p.nome};;;;${p.categoria};${status}\n`;
                    }
                });
            }
        });
    });
    
    csv += "\n\nPROFISSIONAIS - DIAS DE FOLGA\n";
    csv += "Nome;Categoria;Dias de Folga\n";
    masterProfessionals.forEach(prof => {
        const daysOffText = prof.daysOff && prof.daysOff.length > 0 
            ? prof.daysOff.map(d => dayNames[d]).join(', ')
            : 'Nenhuma folga definida';
        csv += `${prof.nome};${prof.categoria};${daysOffText}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "grade_horarios_com_folgas.csv";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// event lisnteners e incializaçao

window.addEventListener("click", e => {
    if (e.target === document.getElementById("userModal")) closeModal("userModal");
    if (e.target === document.getElementById("professionalModal")) closeModal("professionalModal");
    if (e.target === document.getElementById("loginModal")) closeModal("loginModal");
    if (e.target === document.getElementById("registerProfessionalModal")) closeModal("registerProfessionalModal");
    if (e.target === document.getElementById("manageDaysOffModal")) closeModal("manageDaysOffModal");
    if (e.target === document.getElementById("editProfessionalNameModal")) closeModal("editProfessionalNameModal");
    if (e.target === document.getElementById("createGroupModal")) closeModal("createGroupModal");
    if (e.target === document.getElementById("manageCellProfessionalsModal")) closeModal("manageCellProfessionalsModal");
});

document.addEventListener("DOMContentLoaded", () => {
    console.log('🚀 Iniciando aplicação...');
    
    // Inicializa Firebase primeiro
    initializeFirebase();
    
    // Inicia com Grade ativa
    switchToTab('grade');
    updateTabsVisibility();
    updateUserStatus();

    addTimestampToExistingGroups();
    
    // Garante que os filtros funcionem
    const categoryFilter = document.getElementById('categoryFilter');
    const weekdayFilter = document.getElementById('gradeWeekdayFilter');
    if (categoryFilter) categoryFilter.disabled = false;
    if (weekdayFilter) weekdayFilter.disabled = false;
    
    // Converte texto para maiúsculo
    const textInputs = document.querySelectorAll('.modal-content input[type="text"]');
    textInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    });

    // Event listeners para abas
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", e => {
            const clickedDay = e.currentTarget.dataset.day;
            if (!isAuthenticated && ['profissionais'].includes(clickedDay)) {
                alert("⛔ Esta aba requer permissões de administrador!");
                openLoginModal();
                return;
            }
            switchToTab(clickedDay);
        });
    });

    // Event listeners para formulários
    
    // Login
    document.getElementById("loginForm").addEventListener("submit", e => {
        e.preventDefault();
        const pass = document.getElementById("loginPassword").value.trim();
        if (pass === ADMIN_PASSWORD) {
            isAuthenticated = true;
            closeModal("loginModal");
            toggleEditButtons(true);
            updateTabsVisibility();
            updateUserStatus();
            updateGradeView();
            
            // Re-renderiza a orientação parental se estiver na aba ativa
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.day === 'orientacao-parental') {
                renderOrientacaoGrid();
            }
            
            alert("Acesso liberado! Agora você tem acesso a todas as funcionalidades.");
        } else {
            alert("Senha incorreta!");
        }
    });

    // Adicionar usuário
    document.getElementById("userForm").addEventListener("submit", e => {
        e.preventDefault();
        const data = {
            nome: document.getElementById("userName").value.trim(),
            idade: document.getElementById("userAge").value.trim(),
            deficiencia: document.getElementById("userDeficiency").value.trim(),
            programa: document.getElementById("userProgram").value.trim(),
        };
        
        const { day, groupId } = currentModalContext;
        
        if (!scheduleData[day] || !scheduleData[day][groupId]) {
            alert("Erro: Grupo não encontrado");
            return;
        }
        
        scheduleData[day][groupId].usuarios.push(data);
        
        saveScheduleData().then(() => {
            console.log('✅ Usuário adicionado e salvo no Firebase');
        }).catch(error => {
            console.error('❌ Erro ao salvar usuário:', error);
            alert('Erro ao salvar usuário. Tente novamente.');
            scheduleData[day][groupId].usuarios.pop();
            return;
        });
        
        renderUsers(day, groupId);
        closeModal("userModal");
    });

    // Adicionar profissional
    document.getElementById("professionalForm").addEventListener("submit", e => {
        e.preventDefault();
        const { day, groupId } = currentModalContext;
        const professionalId = document.getElementById('professionalSelect').value;
        
        if (!professionalId) {
            alert("Por favor, selecione um profissional.");
            return;
        }
        
        if (!scheduleData[day] || !scheduleData[day][groupId]) {
            alert("Erro: Grupo não encontrado");
            return;
        }
        
        if (isProfessionalOnDayOff(parseInt(professionalId), day)) {
            alert("Este profissional está de folga neste dia!");
            return;
        }
        
        scheduleData[day][groupId].profissionais.push(parseInt(professionalId));
        
        saveScheduleData().then(() => {
            console.log('✅ Profissional adicionado e salvo no Firebase');
        }).catch(error => {
            console.error('❌ Erro ao salvar profissional:', error);
            alert('Erro ao salvar profissional. Tente novamente.');
            scheduleData[day][groupId].profissionais.pop();
            return;
        });
        
        renderProfessionals(day, groupId);
        closeModal("professionalModal");
    });

    // Cadastrar novo profissional
    document.getElementById("registerProfessionalForm").addEventListener("submit", e => {
        e.preventDefault();
        const newProf = {
            id: Date.now(),
            nome: document.getElementById('regProfName').value.trim(),
            categoria: document.getElementById('regProfCategory').value,
            daysOff: []
        };
        
        masterProfessionals.push(newProf);
        
        saveProfessional(newProf).then(() => {
            console.log('✅ Profissional cadastrado e salvo no Firebase');
            renderMasterProfessionalsList();
            closeModal('registerProfessionalModal');
        }).catch(error => {
            console.error('❌ Erro ao salvar profissional:', error);
            alert('Erro ao cadastrar profissional. Tente novamente.');
            const index = masterProfessionals.findIndex(p => p.id === newProf.id);
            if (index !== -1) {
                masterProfessionals.splice(index, 1);
            }
        });
    });
    
    // Gerenciar folgas
    document.getElementById("manageDaysOffForm").addEventListener("submit", e => {
        e.preventDefault();
        const { professionalId } = currentModalContext;
        const prof = masterProfessionals.find(p => p.id === professionalId);
        if (!prof) return;
        
        const selectedDaysOff = [];
        document.querySelectorAll('input[name="daysOff"]:checked').forEach(checkbox => {
            selectedDaysOff.push(checkbox.value);
        });
        
        prof.daysOff = selectedDaysOff;
        
        removeProfessionalFromDayOffGroups(professionalId, selectedDaysOff);
        
        saveProfessional(prof).then(() => {
            console.log('✅ Folgas atualizadas e salvas no Firebase');
            
            renderMasterProfessionalsList();
            if (window.currentSelectedProfessionalId === professionalId) {
                showProfessionalDetails(professionalId);
            }
            
            closeModal('manageDaysOffModal');
            alert(`Folgas atualizadas para ${prof.nome}!`);
            
        }).catch(error => {
            console.error('❌ Erro ao salvar folgas:', error);
            alert('Erro ao salvar folgas. Tente novamente.');
        });

        
    });

    // Editar nome do profissional
    document.getElementById("editProfessionalNameForm").addEventListener("submit", e => {
        e.preventDefault();
        const { professionalId } = currentModalContext;
        const prof = masterProfessionals.find(p => p.id === professionalId);
        if (!prof) return;
        
        const newName = document.getElementById('newProfName').value.trim().toUpperCase();
        
        if (!newName) {
            alert('Por favor, digite um nome válido.');
            return;
        }
        
        if (newName === prof.nome) {
            alert('O nome não foi alterado.');
            closeModal('editProfessionalNameModal');
            return;
        }
        
        // Verifica se já existe um profissional com esse nome
        const existingProf = masterProfessionals.find(p => p.id !== professionalId && p.nome === newName);
        if (existingProf) {
            alert('Já existe um profissional com esse nome. Por favor, escolha outro nome.');
            return;
        }
        
        const oldName = prof.nome;
        prof.nome = newName;
        
        saveProfessional(prof).then(() => {
            console.log('✅ Nome do profissional atualizado e salvo no Firebase');
            
            renderMasterProfessionalsList();
            if (window.currentSelectedProfessionalId === professionalId) {
                showProfessionalDetails(professionalId);
            }
            
            // Atualiza todas as visualizações que podem mostrar o nome do profissional
            updateGradeView();
            
            closeModal('editProfessionalNameModal');
            alert(`Nome alterado de "${oldName}" para "${newName}" com sucesso!`);
            
        }).catch(error => {
            console.error('❌ Erro ao salvar novo nome:', error);
            prof.nome = oldName; // Reverte a mudança em caso de erro
            alert('Erro ao salvar novo nome. Tente novamente.');
        });
    });

    document.getElementById("createGroupForm").addEventListener("submit", e => {
    e.preventDefault();
    createNewGroup();
});
});

// variaveis globais

const ADMIN_PASSWORD = "123";
let isAuthenticated = false;
let isFirebaseConnected = false;
let isDataLoading = false;

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

// Horários específicos para orientação parental (excluindo 8h, 11h, 13h, 16h)
const orientacaoTimeSlots = [
    "09:00", "10:00", "14:00", "15:00"
];

// aados em memoria
let scheduleData = {};
let masterProfessionals = [];
let currentModalContext = {};
let lastCreatedGroupId = null;

// categorias disponíveis para os grupos
const groupCategories = [
    "CENTRO DE CONVIVENCIA",
    "GAIA",
    "EMPREGABILIDADE",
    "ATENDIMENTO A FAMILIA",
    "EVOLUÇÃO",
    "REUNIÃO GAIA",
    "INDIVIDUAL"
];

// Referência do Firebase
const db = () => window.database;


// funçoes utilitarias

function isSpecificActivity(category) {
    return category === "EVOLUÇÃO" || category === "REUNIÃO GAIA" || category === "INDIVIDUAL";
}

function getGroupHeaderText(day, groupId, category) {
    const groupData = scheduleData[day]?.[groupId];
    const numero = groupData?.numeroGrupo;

    if (isSpecificActivity(category)) {
        return `📋 ${category} – ${dayNames[day]}`;
    }
    
    // *** NOVA LÓGICA: Se não tem número, mostra apenas "Grupo"
    if (!numero) {
        return `👥 Grupo – ${dayNames[day]}`;
    }
    
    return `👥 Grupo ${numero} – ${dayNames[day]}`;
}

function isProfessionalOnDayOff(professionalId, day) {
    const prof = masterProfessionals.find(p => p.id === professionalId);
    if (!prof || !prof.daysOff) return false;
    return prof.daysOff.includes(day);
}

function resetDataStructure() {
    scheduleData = {};
    days.forEach(day => {
        scheduleData[day] = {};
    });
}


// funçoes do firebase

function initializeFirebase() {
    console.log('🔥 Inicializando conexão com Firebase...');
    
    // Cria indicador de conexão
    createConnectionIndicator();
    
    // Monitora conexão
    db().ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        
        if (connected !== isFirebaseConnected) {
            isFirebaseConnected = connected;
            console.log(connected ? '✅ Conectado ao Firebase' : '❌ Desconectado do Firebase');
            updateConnectionStatus();
            
            // Se conectou e não está carregando, carrega dados
            if (connected && !isDataLoading) {
                loadAllData();
            }
        }
    });
    
    // Carrega dados iniciais
    loadAllData();
    loadOrientacaoData();
    setupOrientacaoRealtimeSync();
}

function createConnectionIndicator() {
    const existing = document.getElementById('connectionStatus');
    if (existing) existing.remove();
    
    const indicator = document.createElement('span');
    indicator.id = 'connectionStatus';
    indicator.style.cssText = `
        font-size: 0.8rem;
        padding: 6px 12px;
        border-radius: 15px;
        background: rgba(245, 158, 11, 0.1);
        margin-left: 10px;
        color: #f59e0b;
        font-weight: 600;
        transition: all 0.3s ease;
    `;
    indicator.textContent = '🔄 Conectando...';
    
    const userStatus = document.querySelector('.user-status');
    if (userStatus) {
        const loginBtn = document.getElementById('loginToggleBtn');
        if (loginBtn) {
            userStatus.insertBefore(indicator, loginBtn);
        }
    }
}

function updateConnectionStatus() {
    const indicator = document.getElementById('connectionStatus');
    if (!indicator) return;
    
    if (isFirebaseConnected) {
        indicator.textContent = '🟢 Sincronizado';
        indicator.style.color = '#10b981';
        indicator.style.background = 'rgba(16, 185, 129, 0.1)';
    } else {
        indicator.textContent = '🔴 Reconectando...';
        indicator.style.color = '#ef4444';
        indicator.style.background = 'rgba(239, 68, 68, 0.1)';
    }
}

async function loadAllData() {
    if (isDataLoading) return;
    
    isDataLoading = true;
    console.log('📥 Carregando dados do Firebase...');
    
    try {
        await loadProfessionals();
        await loadScheduleData();
        
        console.log('✅ Todos os dados carregados com sucesso!');
        
        // Atualiza interface
        renderMasterProfessionalsList();
        initializeGroups();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        handleDataLoadError(error);
    } finally {
        isDataLoading = false;
    }
}

async function loadProfessionals() {
    return new Promise((resolve, reject) => {
        db().ref('profissionais').once('value', (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    masterProfessionals = Object.keys(data).map(key => ({
                        id: parseInt(key),
                        ...data[key]
                    }));
                    console.log(`📋 ${masterProfessionals.length} profissionais carregados`);
                } else {
                    masterProfessionals = [];
                    console.log('📋 Nenhum profissional encontrado - inicializando lista vazia');
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        }, reject);
    });
}

async function loadScheduleData() {
    return new Promise((resolve, reject) => {
        db().ref('horarios').once('value', (snapshot) => {
            try {
                const data = snapshot.val();
                if (data) {
                    // Lógica para garantir que numeroGrupo exista
                    Object.keys(data).forEach(day => {
                        if (data[day]) {
                            Object.keys(data[day]).forEach(groupId => {
                                if (data[day][groupId] && !data[day][groupId].numeroGrupo) {
                                    data[day][groupId].numeroGrupo = groupId;
                                }
                            });
                        }
                    });
                    scheduleData = data;
                    console.log('📅 Dados da grade carregados e normalizados');
                } else {
                    console.log('📅 Inicializando nova estrutura de dados');
                    resetDataStructure();
                    if (isFirebaseConnected) {
                        saveScheduleData();
                    }
                }
                resolve();
            } catch (error) {
                reject(error);
            }
        }, reject);
    });
}

function handleDataLoadError(error) {
    console.error('Erro detalhado:', error);
    
    // Não mostra alerta imediatamente - tenta usar dados locais
    console.log('⚠️ Usando dados locais temporariamente...');
    resetDataStructure();
    masterProfessionals = [];
    renderMasterProfessionalsList();
    initializeGroups();
    
    // Tenta reconectar a cada 10 segundos
    const reconnectInterval = setInterval(() => {
        if (isFirebaseConnected && !isDataLoading) {
            clearInterval(reconnectInterval);
            console.log('🔄 Reconectado! Recarregando dados...');
            loadAllData();
        }
    }, 10000);
}

function saveProfessional(professional) {
    if (!isFirebaseConnected) {
        console.warn('⚠️ Offline - dados serão sincronizados quando conectar');
        return Promise.resolve();
    }
    
    return db().ref(`profissionais/${professional.id}`).set({
        nome: professional.nome,
        categoria: professional.categoria,
        daysOff: professional.daysOff || []
    });
}

function saveScheduleData() {
    if (!isFirebaseConnected) {
        console.warn('⚠️ Offline - dados serão sincronizados quando conectar');
        return Promise.resolve();
    }
    
    return db().ref('horarios').set(scheduleData);
}

function deleteProfessional(professionalId) {
    if (!isFirebaseConnected) {
        console.warn('⚠️ Offline - operação será sincronizada quando conectar');
        return Promise.resolve();
    }
    
    return db().ref(`profissionais/${professionalId}`).remove();
}


// funçoes de atualizaçoes de grupos

function updateGroupCategory(day, groupId, category) {
    if (!checkAuth()) {
        alert("⛔ Faça login para alterar categorias!");
        return false;
    }
    
    scheduleData[day][groupId].categoria = category;
    updateGroupHeaderText(day, groupId, category);
    
    saveScheduleData().then(() => {
        console.log('✅ Categoria salva no Firebase');
    }).catch(error => {
        console.error('❌ Erro ao salvar categoria:', error);
        alert('Erro ao salvar categoria. Tente novamente.');
    });
    
    return true;
}

function updateGroupNumber(day, groupId, newNumber) {
    if (!checkAuth()) {
        alert("⛔ Faça login para alterar o número do grupo!");
        const groupData = scheduleData[day]?.[groupId];
        if (groupData) {
            document.getElementById(`gn-input-${day}-${groupId}`).value = groupData.numeroGrupo || "";
        }
        return false;
    }

    // *** PERMITE NÚMERO VAZIO ***
    const trimmedNumber = newNumber.trim();
    
    // Verifica se já existe outro grupo com esse número (apenas se número foi informado)
    if (trimmedNumber) {
        const existingGroup = Object.values(scheduleData[day] || {}).find(group => 
            group.numeroGrupo === trimmedNumber && group !== scheduleData[day][groupId]
        );
        
        if (existingGroup) {
            alert(`❌ Já existe outro grupo com o número "${trimmedNumber}" na ${dayNames[day]}`);
            // Restaura o valor anterior
            const groupData = scheduleData[day]?.[groupId];
            if (groupData) {
                document.getElementById(`gn-input-${day}-${groupId}`).value = groupData.numeroGrupo || "";
            }
            return false;
        }
    }

    // *** PERMITE SALVAR NÚMERO VAZIO ***
    scheduleData[day][groupId].numeroGrupo = trimmedNumber;

    saveScheduleData().then(() => {
        const displayText = trimmedNumber ? `"${trimmedNumber}"` : 'sem número';
        console.log(`✅ Número do Grupo ${groupId} atualizado para ${displayText}`);
        updateGroupHeaderText(day, groupId, scheduleData[day][groupId].categoria);
    }).catch(error => {
        console.error('❌ Erro ao salvar o número do grupo:', error);
        alert('Erro ao salvar o número do grupo. Tente novamente.');
    });
    return true;
}

function updateGroupTime(day, groupId, time) {
    if (!checkAuth()) {
        alert("⛔ Faça login para alterar horários!");
        return false;
    }
    
    scheduleData[day][groupId].horario = time;
    
    saveScheduleData().then(() => {
        console.log('✅ Horário salvo no Firebase');
    }).catch(error => {
        console.error('❌ Erro ao salvar horário:', error);
        alert('Erro ao salvar horário. Tente novamente.');
    });
    
    return true;
}

function updateGroupHeaderText(day, groupId, category) {
    const headerElement = document.getElementById(`group-header-${day}-${groupId}`);
    const groupData = scheduleData[day]?.[groupId];

    if (headerElement && groupData) {
        const numero = groupData.numeroGrupo || ""; // *** PERMITE VAZIO ***

        if (isSpecificActivity(category)) {
            // Se for uma atividade específica, o input do número não deve aparecer
            headerElement.innerHTML = `📋 ${category} – ${dayNames[day]}`;
        } else {
            // Remonta o HTML com o input (agora opcional)
            headerElement.innerHTML = `
                👥 Grupo 
                <input type="text" 
                       class="group-number-input" 
                       id="gn-input-${day}-${groupId}"
                       value="${numero}"
                       placeholder="Opcional"
                       onchange="updateGroupNumber('${day}', ${groupId}, this.value)"
                       size="8"
                       ${!isAuthenticated ? 'disabled' : ''}>
                 – ${dayNames[day]}
            `;
        }
    }
}





// navegaçao e autenticaçao

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
    
    if (tabName === 'profissionais') {
        renderMasterProfessionalsList();
        const detailsView = document.getElementById('professional-details-view');
        if (detailsView) {
            detailsView.innerHTML = '<div class="empty-state">Selecione um profissional da lista para ver os detalhes.</div>';
        }
        window.currentSelectedProfessionalId = null;
    } else if (tabName === 'grade') {
        const categoryFilter = document.getElementById('categoryFilter');
        const weekdayFilter = document.getElementById('gradeWeekdayFilter');
        if (categoryFilter) categoryFilter.value = '';
        if (weekdayFilter) weekdayFilter.value = '';
        updateGradeView();
    } else if (tabName === 'orientacao-parental') {
        renderOrientacaoGrid();
    }
}

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
    // Adicionamos a classe .group-number-input à lista
    document.querySelectorAll(".btn-add, .btn-remove, .group-number-input, select").forEach(el => {
        if (el.id === 'categoryFilter' || el.id === 'gradeWeekdayFilter') {
            return;
        }
        el.disabled = !enable;
    });
}

function toggleExportButton(show) {
    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.style.display = show ? 'block' : 'none';
    }
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
            toggleExportButton(false);
            
            // Re-renderiza a orientação parental se estiver na aba ativa antes de sair
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.day === 'orientacao-parental') {
                renderOrientacaoGrid();
            }
            
            switchToTab('grade');
            updateGradeView();
            alert('Logout realizado! Agora você está no modo visualização.');
        };
        toggleExportButton(true);
    } else {
        statusText.textContent = 'Modo Visualização';
        statusText.style.color = '#6b7280';
        loginBtn.textContent = '🔓 Fazer Login Admin';
        loginBtn.onclick = () => openLoginModal();
        toggleExportButton(false);
    }
}

function updateTabsVisibility() {
    const tabs = document.querySelectorAll('.tab');
    const restrictedTabs = ['profissionais'];
    
    tabs.forEach(tab => {
        const day = tab.dataset.day;
        if (isAuthenticated || !restrictedTabs.includes(day)) {
            tab.style.display = 'block';
        } else {
            tab.style.display = 'none';
        }
    });
    
    // Controles de grade removidos - gerenciamento é feito diretamente na grade
}


// visualizaçao dos grupos

// Substitua a função renderGroupsForDay existente por esta versão:
function renderGroupsForDay(day) {
    const container = document.getElementById(`groups-${day}`);
    if (!container) return;
    
    container.innerHTML = "";
    
    if (!scheduleData[day] || Object.keys(scheduleData[day]).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Nenhum grupo criado ainda para ${dayNames[day]}</p>
                <p>Clique em "➕ Criar Novo Grupo" para começar</p>
            </div>
        `;
        return;
    }
    
    // *** LÓGICA DE ORDENAÇÃO ***
    const sortedGroups = Object.entries(scheduleData[day])
        .sort(([idA, groupA], [idB, groupB]) => {
            // Se há um grupo recém-criado, ele vai para o topo
            if (lastCreatedGroupId) {
                if (idA == lastCreatedGroupId) return -1;
                if (idB == lastCreatedGroupId) return 1;
            }
            
            // Para os demais, ordena por timestamp de criação (mais recente primeiro)
            // Se não há createdAt, usa o ID como fallback
            const timeA = groupA.createdAt || parseInt(idA);
            const timeB = groupB.createdAt || parseInt(idB);
            
            return timeB - timeA; // Ordem decrescente (mais recente primeiro)
        });
    
    sortedGroups.forEach(([groupId, groupData]) => {
        const groupElement = createGroupElement(day, groupId);
        
        // *** DESTAQUE VISUAL PARA O GRUPO RECÉM-CRIADO ***
        if (groupId == lastCreatedGroupId) {
            groupElement.classList.add('newly-created');
            
            // Remove o destaque após 3 segundos
            setTimeout(() => {
                groupElement.classList.remove('newly-created');
                lastCreatedGroupId = null; // Limpa após o destaque
            }, 3000);
        }
        
        container.appendChild(groupElement);
        
        // Renderiza dados existentes
        renderUsers(day, groupId);
        renderProfessionals(day, groupId);
    });
}


function scrollToNewGroup(day, groupId) {
    // Aguarda um pouco para garantir que o DOM foi atualizado
    setTimeout(() => {
        const groupElement = document.querySelector(`#groups-${day} .group.newly-created`);
        if (groupElement) {
            groupElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, 100);
}

// Adicione esta função para dar timestamp aos grupos existentes:
function addTimestampToExistingGroups() {
    const currentTime = Date.now();
    let counter = 0;
    
    days.forEach(day => {
        if (scheduleData[day]) {
            Object.keys(scheduleData[day]).forEach(groupId => {
                const group = scheduleData[day][groupId];
                if (group && !group.createdAt) {
                    // Adiciona timestamp baseado no ID (mais antigo = menor timestamp)
                    group.createdAt = currentTime - (counter * 1000);
                    counter++;
                }
            });
        }
    });
    
    // Salva as mudanças
    saveScheduleData().then(() => {
        console.log('✅ Timestamps adicionados aos grupos existentes');
    }).catch(error => {
        console.error('❌ Erro ao adicionar timestamps:', error);
    });
}

function createGroupElement(day, groupId) {
    const div = document.createElement("div");
    div.className = "group";
    
    const groupData = scheduleData[day]?.[groupId] || { categoria: "", horario: "09:00" };
    
    // Garante a existência do numeroGrupo para compatibilidade
    if (groupData.numeroGrupo === undefined) {
        groupData.numeroGrupo = "";
    }

    const numero = groupData.numeroGrupo || ""; // *** PERMITE VAZIO ***

    div.innerHTML = `
        <div class="group-header">
            <span id="group-header-${day}-${groupId}" class="group-title-span">
                👥 Grupo 
                <input type="text" 
                       class="group-number-input" 
                       id="gn-input-${day}-${groupId}"
                       value="${numero}"
                       placeholder="Opcional"
                       onchange="updateGroupNumber('${day}', '${groupId}', this.value)"
                       size="8"
                       ${!isAuthenticated ? 'disabled' : ''}>
                 – ${dayNames[day]}
            </span>
            <div class="group-controls">
                <select onchange="if (updateGroupCategory('${day}', '${groupId}', this.value)) { this.blur(); }" class="category-select">
                    <option value="">Selecione categoria do grupo</option>
                    ${groupCategories.map(cat => `<option value="${cat}" ${groupData.categoria === cat ? "selected" : ""}>${cat}</option>`).join("")}
                </select>
                <select onchange="if (updateGroupTime('${day}', '${groupId}', this.value)) { this.blur(); }" class="time-select">
                    ${timeSlots.map(t => `<option value="${t}" ${groupData.horario === t ? "selected" : ""}>${t}</option>`).join("")}
                </select>
                <button class="btn-delete-group" onclick="deleteGroup('${day}', '${groupId}')" title="Excluir grupo">🗑️</button>
            </div>
        </div>
        <div class="group-content">
            <div class="section usuarios">
                <div class="section-title">
                    <span>👤 Usuários</span>
                    <button class="btn-add" onclick="openUserModal('${day}', '${groupId}')">+ Adicionar</button>
                </div>
                <div class="person-list" id="usuarios-${day}-${groupId}">
                    <div class="empty-state">Nenhum usuário adicionado</div>
                </div>
            </div>
            <div class="section profissionais">
                <div class="section-title">
                    <span>👨‍⚕️ Profissionais</span>
                    <button class="btn-add" onclick="openProfessionalModal('${day}', '${groupId}')">+ Adicionar</button>
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
    days.forEach(day => {
        renderGroupsForDay(day);
    });
}
    


// renderizaçao de dados

function renderUsers(day, groupId) {
    const el = document.getElementById(`usuarios-${day}-${groupId}`);
    if (!el) return;
    
    if (!scheduleData[day] || !scheduleData[day][groupId]) {
        el.innerHTML = '<div class="empty-state">Nenhum usuário adicionado</div>';
        return;
    }
    
    const list = scheduleData[day][groupId].usuarios;
    
    if (!list || !Array.isArray(list) || list.length === 0) {
        el.innerHTML = '<div class="empty-state">Nenhum usuário adicionado</div>';
        return;
    }
    
    el.innerHTML = "";
    list.forEach((u, idx) => {
        if (!u || typeof u !== 'object') return;
        
        const card = document.createElement("div");
        card.className = "person-card";
        card.innerHTML = `
            <button class="btn-remove" onclick="removeUser('${day}', ${groupId}, ${idx})">×</button>
            <div class="person-info">
                <div><div class="info-label">Nome</div><div class="info-item">${u.nome || 'Nome não informado'}</div></div>
                <div><div class="info-label">Idade</div><div class="info-item">${u.idade || 'Idade não informada'} anos</div></div>
                <div><div class="info-label">Deficiência</div><div class="info-item">${u.deficiencia || 'Não informado'}</div></div>
                <div><div class="info-label">Programa</div><div class="info-item">${u.programa || 'Não informado'}</div></div>
            </div>
        `;
        el.appendChild(card);
    });
}

function renderProfessionals(day, groupId) {
    const el = document.getElementById(`profissionais-${day}-${groupId}`);
    if (!el) return;
    
    if (!scheduleData[day] || !scheduleData[day][groupId]) {
        el.innerHTML = '<div class="empty-state">Nenhum profissional adicionado</div>';
        return;
    }
    
    const list = scheduleData[day][groupId].profissionais;
    
    if (!list || !Array.isArray(list) || list.length === 0) {
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
                <div><div class="info-label">Nome</div><div class="info-item">${p.nome || 'Nome não informado'}</div></div>
                <div><div class="info-label">Categoria</div><div class="info-item">${p.categoria || 'Categoria não informada'}</div></div>
            </div>
        `;
        el.appendChild(card);
    });
}

function renderMasterProfessionalsList() {
    const listContainer = document.getElementById('master-professionals-list');
    if (!listContainer) return;
    
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
        
        let daysOffText = '';
        if (prof.daysOff && prof.daysOff.length > 0) {
            const daysOffNames = prof.daysOff.map(d => dayNames[d]).join(', ');
            daysOffText = `<span class="days-off-indicator">🏖️ Folga: ${daysOffNames}</span>`;
        }
        
        item.innerHTML = `
            <button class="btn-remove-professional" onclick="removeMasterProfessional(${prof.id})" title="Remover profissional">×</button>
            <button class="btn-manage-days-off" onclick="openManageDaysOffModal(${prof.id})" title="Gerenciar folgas">🏖️</button>
            <button class="btn-edit-professional-name" onclick="openEditProfessionalNameModal(${prof.id})" title="Editar nome">✏️</button>
            <strong>${prof.nome}</strong><br>
            <span>${prof.categoria}</span>
            ${daysOffText}
        `;
        item.onclick = (e) => {
            if (!e.target.classList.contains('btn-remove-professional') && 
                !e.target.classList.contains('btn-manage-days-off') &&
                !e.target.classList.contains('btn-edit-professional-name')) {
                showProfessionalDetails(prof.id);
            }
        };
        listContainer.appendChild(item);
    });
}
// funçao que exibe os profissionais livres por horário

function getProfessionalsAvailableAtTime(day, timeSlot) {
    const availableProfessionals = [];
    
    masterProfessionals.forEach(prof => {
        // Verifica se o profissional não está de folga neste dia
        if (!isProfessionalOnDayOff(prof.id, day)) {
            let isOccupied = false;
            
            // Verifica se o profissional está ocupado neste horário
            if (scheduleData[day]) {
                Object.keys(scheduleData[day]).forEach(groupId => {
                    const group = scheduleData[day][groupId];
                    if (group && group.horario === timeSlot && 
                        group.profissionais && group.profissionais.includes(prof.id)) {
                        isOccupied = true;
                    }
                });
            }
            
            // Se não está ocupado, adiciona à lista de disponíveis
            if (!isOccupied) {
                availableProfessionals.push({
                    id: prof.id,
                    nome: prof.nome,
                    categoria: prof.categoria
                });
            }
        }
    });
    
    // Ordena por categoria e depois por nome
    return availableProfessionals.sort((a, b) => {
        if (a.categoria === b.categoria) {
            return a.nome.localeCompare(b.nome);
        }
        return a.categoria.localeCompare(b.categoria);
    });
}

// Funções para manipulação de blocos editáveis

function updateActivityData(day, groupId, fieldType, value) {
    if (!isAuthenticated) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    switch (fieldType) {
        case 'groupName':
            updateGroupNameFromInput(day, groupId, value);
            break;
        case 'users':
            updateUsersFromInput(day, groupId, value);
            break;
    }
}

function updateGroupNameFromInput(day, groupId, input) {
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    // Parse do input: "Grupo 5 - CENTRO DE CONVIVENCIA" ou "EVOLUÇÃO"
    let numeroGrupo = '';
    let categoria = '';
    
    if (isSpecificActivity(input.trim().toUpperCase())) {
        categoria = input.trim().toUpperCase();
    } else {
        const match = input.match(/^Grupo\s*(\w+)?\s*(?:-\s*(.+))?$/i);
        if (match) {
            numeroGrupo = match[1] || '';
            categoria = match[2]?.trim().toUpperCase() || '';
        } else {
            // Se não segue o padrão, trata como categoria livre
            categoria = input.trim().toUpperCase();
        }
    }
    
    group.numeroGrupo = numeroGrupo;
    group.categoria = categoria;
    
    saveScheduleData().then(() => {
        console.log('✅ Dados do grupo atualizados');
    }).catch(error => {
        console.error('❌ Erro ao salvar:', error);
    });
}

function updateUsersFromInput(day, groupId, input) {
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    // Converte o texto em array de objetos usuario
    const userNames = input.split(',').map(name => name.trim()).filter(name => name);
    group.usuarios = userNames.map(name => ({
        nome: name.toUpperCase(),
        idade: '',
        deficiencia: '',
        programa: ''
    }));
    
    saveScheduleData().then(() => {
        console.log('✅ Lista de usuários atualizada');
    }).catch(error => {
        console.error('❌ Erro ao salvar:', error);
    });
}

function createNewActivityFromInput(inputElement, day, timeSlot) {
    const value = inputElement.value.trim();
    if (!value) return;
    
    const newGroupId = Date.now();
    
    if (!scheduleData[day]) {
        scheduleData[day] = {};
    }
    
    let numeroGrupo = '';
    let categoria = '';
    
    if (isSpecificActivity(value.toUpperCase())) {
        categoria = value.toUpperCase();
    } else {
        const match = value.match(/^Grupo\s*(\w+)?\s*(?:-\s*(.+))?$/i);
        if (match) {
            numeroGrupo = match[1] || '';
            categoria = match[2]?.trim().toUpperCase() || '';
        } else {
            categoria = value.toUpperCase();
        }
    }
    
    scheduleData[day][newGroupId] = {
        numeroGrupo: numeroGrupo,
        horario: timeSlot,
        categoria: categoria,
        usuarios: [],
        profissionais: [],
        createdAt: Date.now()
    };
    
    saveScheduleData().then(() => {
        console.log('✅ Novo grupo criado na grade');
        updateGradeView();
        
        // Limpa o input
        inputElement.value = '';
    }).catch(error => {
        console.error('❌ Erro ao criar grupo:', error);
        alert('Erro ao criar grupo. Tente novamente.');
        delete scheduleData[day][newGroupId];
    });
}

function removeActivityBlock(day, groupId) {
    if (!isAuthenticated) return;
    if (!confirm('Tem certeza que deseja remover este grupo?')) return;
    
    delete scheduleData[day][groupId];
    
    saveScheduleData().then(() => {
        console.log('✅ Grupo removido');
        updateGradeView();
    }).catch(error => {
        console.error('❌ Erro ao remover grupo:', error);
        alert('Erro ao remover grupo. Tente novamente.');
    });
}

function createEditableActivityBlockForProfessional(activity, day, timeSlot) {
    const blockId = `prof-activity-${day}-${timeSlot}-${activity.groupId}`;
    let groupName = '';
    let usersList = '';

    // Monta o nome do grupo
    if (isSpecificActivity(activity.groupCategory)) {
        groupName = activity.groupCategory;
    } else {
        groupName = activity.numeroGrupo ? `Grupo ${activity.numeroGrupo}` : '';
        if (activity.groupCategory && activity.groupCategory !== 'Sem categoria') {
            groupName += ` - ${activity.groupCategory}`;
        }
    }

    // Monta lista de usuários
    usersList = activity.userNames !== 'Nenhum usuário' ? activity.userNames.replace('👤 Usuários: ', '') : '';

    return `
        <div class="editable-activity-block-mini" id="${blockId}" data-group-id="${activity.groupId}">
            <div class="mini-block-controls">
                <button class="btn-remove-block-mini" onclick="removeActivityBlock('${day}', '${activity.groupId}')" title="Remover">❌</button>
            </div>
            <div class="mini-editable-field">
                <input type="text" class="mini-group-name-input" value="${groupName}" 
                       onblur="updateActivityData('${day}', '${activity.groupId}', 'groupName', this.value)"
                       placeholder="Nome do grupo">
            </div>
            <div class="mini-editable-field">
                <textarea class="mini-users-input" rows="1" 
                          onblur="updateActivityData('${day}', '${activity.groupId}', 'users', this.value)"
                          placeholder="Usuários (sep. por vírgula)">${usersList}</textarea>
            </div>
        </div>
    `;
}

function addActivityForProfessional(day, timeSlot, professionalId) {
    if (!isAuthenticated) return;
    
    const newGroupId = Date.now();
    
    if (!scheduleData[day]) {
        scheduleData[day] = {};
    }
    
    scheduleData[day][newGroupId] = {
        numeroGrupo: '',
        horario: timeSlot,
        categoria: '',
        usuarios: [],
        profissionais: [professionalId],
        createdAt: Date.now()
    };
    
    saveScheduleData().then(() => {
        console.log('✅ Nova atividade criada para o profissional');
        updateGradeView();
    }).catch(error => {
        console.error('❌ Erro ao criar atividade:', error);
        alert('Erro ao criar atividade. Tente novamente.');
        delete scheduleData[day][newGroupId];
    });
}

// Sistema de bloqueio absoluto de scroll
let scrollBlocked = false;
let lockedScrollPosition = { top: 0, left: 0 };
let scrollEventListeners = [];

function blockScrollCompletely() {
    // Captura posição atual da página
    lockedScrollPosition.top = window.pageYOffset || document.documentElement.scrollTop;
    lockedScrollPosition.left = window.pageXOffset || document.documentElement.scrollLeft;
    scrollBlocked = true;
    
    console.log('🔒 BLOQUEANDO scroll na posição:', lockedScrollPosition);
    
    // Captura e bloqueia scroll de TODOS os containers de profissionais
    const professionalContainers = document.querySelectorAll('.professional-schedule-grid');
    window.lockedContainerScrolls = {};
    
    professionalContainers.forEach((container, index) => {
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        window.lockedContainerScrolls[index] = { top: scrollTop, left: scrollLeft };
        console.log(`🔒 BLOQUEANDO container ${index} na posição:`, { top: scrollTop, left: scrollLeft });
    });
    
    // Adiciona classe CSS
    document.documentElement.classList.add('editing-mode');
    document.querySelector('.content')?.classList.add('editing-mode');
    
    // Bloqueia TODOS os eventos que podem causar scroll
    const preventScroll = (e) => {
        if (scrollBlocked) {
            e.preventDefault();
            e.stopPropagation();
            window.scrollTo(lockedScrollPosition.left, lockedScrollPosition.top);
            return false;
        }
    };
    
    const scrollEvents = ['scroll', 'wheel', 'touchmove', 'keydown'];
    scrollEvents.forEach(eventType => {
        const listener = (e) => {
            if (scrollBlocked) {
                if (eventType === 'keydown') {
                    // Bloqueia teclas que causam scroll (setas, page up/down, home, end)
                    const scrollKeys = [32, 33, 34, 35, 36, 37, 38, 39, 40];
                    if (scrollKeys.includes(e.keyCode)) {
                        e.preventDefault();
                    }
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                }
                // Força posição imediatamente
                setTimeout(() => {
                    window.scrollTo(lockedScrollPosition.left, lockedScrollPosition.top);
                    
                    // Força posição de todos os containers também
                    const containers = document.querySelectorAll('.professional-schedule-grid');
                    containers.forEach((container, index) => {
                        if (window.lockedContainerScrolls[index]) {
                            container.scrollTop = window.lockedContainerScrolls[index].top;
                            container.scrollLeft = window.lockedContainerScrolls[index].left;
                        }
                    });
                }, 0);
                return false;
            }
        };
        
        // Adiciona listeners tanto na window/document quanto em cada container
        window.addEventListener(eventType, listener, { passive: false, capture: true });
        document.addEventListener(eventType, listener, { passive: false, capture: true });
        
        // Adiciona listener em cada container de profissional também
        const containers = document.querySelectorAll('.professional-schedule-grid');
        containers.forEach(container => {
            container.addEventListener(eventType, listener, { passive: false, capture: true });
        });
        
        scrollEventListeners.push({ type: eventType, listener });
    });
    
    // Monitor simples e eficaz
    const simpleForcePosition = () => {
        if (scrollBlocked) {
            // Força posição suavemente
            window.scrollTo(lockedScrollPosition.left, lockedScrollPosition.top);
            
            // Força containers
            const containers = document.querySelectorAll('.professional-schedule-grid');
            containers.forEach((container, index) => {
                if (window.lockedContainerScrolls[index]) {
                    container.scrollTop = window.lockedContainerScrolls[index].top;
                    container.scrollLeft = window.lockedContainerScrolls[index].left;
                }
            });
            
            requestAnimationFrame(simpleForcePosition);
        }
    };
    requestAnimationFrame(simpleForcePosition);
}

function unblockScroll() {
    console.log('🔓 DESBLOQUEANDO scroll');
    scrollBlocked = false;
    
    // Remove event listeners da window/document e containers
    scrollEventListeners.forEach(({ type, listener }) => {
        window.removeEventListener(type, listener, { capture: true });
        document.removeEventListener(type, listener, { capture: true });
        
        // Remove também dos containers
        const containers = document.querySelectorAll('.professional-schedule-grid');
        containers.forEach(container => {
            container.removeEventListener(type, listener, { capture: true });
        });
    });
    scrollEventListeners = [];
    
    // Remove classe CSS
    document.documentElement.classList.remove('editing-mode');
    document.querySelector('.content')?.classList.remove('editing-mode');
    
    // Monitor temporário para capturar qualquer scroll que aconteça após desbloqueio
    let lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    let lastScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    const monitorUnexpectedScroll = () => {
        const currentTop = window.pageYOffset || document.documentElement.scrollTop;
        const currentLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        if (Math.abs(currentTop - lastScrollTop) > 5 || Math.abs(currentLeft - lastScrollLeft) > 5) {
            console.error('🚨 SCROLL DETECTADO APÓS DESBLOQUEIO!');
            console.error('Posição anterior:', { top: lastScrollTop, left: lastScrollLeft });
            console.error('Nova posição:', { top: currentTop, left: currentLeft });
            console.error('Stack trace:', new Error().stack);
            
            // Força volta para posição original
            window.scrollTo(lastScrollLeft, lastScrollTop);
            return;
        }
        
        // Monitora por 2 segundos após desbloqueio
        if (Date.now() - unblockTime < 2000) {
            requestAnimationFrame(monitorUnexpectedScroll);
        }
    };
    
    const unblockTime = Date.now();
    requestAnimationFrame(monitorUnexpectedScroll);
}

// Funções para edição estilo planilha na grade por profissional

function makeSpreadsheetCellEditable(cell) {
    if (!isAuthenticated) return;
    
    const contentDiv = cell.querySelector('.spreadsheet-cell-content');
    if (!contentDiv || contentDiv.contentEditable === 'true') return;
    
    // BLOQUEIA SCROLL COMPLETAMENTE
    blockScrollCompletely();
    
    // Torna editável
    contentDiv.contentEditable = 'true';
    contentDiv.focus({ preventScroll: true });
    
    // Adiciona bordas para indicar edição
    cell.classList.add('editing');
    
    // Posiciona cursor no final
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(contentDiv);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Desbloqueia após operação completa
    setTimeout(() => {
        unblockScroll();
    }, 500);
    
    // Event listeners para salvar - com proteção para não interferir com operações de profissionais
    const blurHandler = function() {
        // Verifica se não há operações de profissionais em andamento
        if (!document.getElementById('tempProfSelect')) {
            // Salva a posição do scroll antes de salvar
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            saveSpreadsheetCellContent(cell, contentDiv);
            
            // Restaura a posição do scroll após salvar
            setTimeout(() => {
                window.scrollTo(scrollLeft, scrollTop);
            }, 0);
        }
    };
    
    contentDiv.addEventListener('blur', blurHandler);
    
    contentDiv.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            // Salva a posição do scroll antes do blur
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            
            contentDiv.blur();
            
            // Restaura a posição do scroll após o blur
            setTimeout(() => {
                window.scrollTo(scrollLeft, scrollTop);
            }, 0);
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            console.log('🔥 ESCAPE pressionado - BLOQUEANDO scroll');
            
            // BLOQUEIA SCROLL DURANTE CANCELAMENTO
            blockScrollCompletely();
            
            // Cancela edição - restaura conteúdo original sem recarregar toda a grade
            contentDiv.contentEditable = 'false';
            cell.classList.remove('editing');
            // Apenas atualiza esta célula específica
            const day = cell.dataset.day;
            const profId = parseInt(cell.dataset.profId);
            const timeSlot = cell.dataset.time;
            
            // Recarrega apenas o conteúdo desta célula
            const activities = getProfessionalActivitiesAtTime(profId, day, timeSlot);
            let editableContent = '';
            
            if (activities.length > 0) {
                activities.forEach(activity => {
                    if (activity.groupName) {
                        editableContent += `📋 ${activity.groupName}`;
                    }
                    if (activity.userNames) {
                        const users = activity.userNames.replace('👤 Usuários: ', '');
                        editableContent += `\n👤 ${users}`;
                    }
                });
            }
            
            contentDiv.innerHTML = editableContent.replace(/\n/g, '<br>');
            
            // Desbloqueia após operação
            setTimeout(() => {
                unblockScroll();
            }, 300);
        }
    });
}

function saveSpreadsheetCellContent(cell, contentDiv) {
    if (!isAuthenticated) return;
    
    const profId = parseInt(cell.dataset.profId);
    const day = cell.dataset.day;
    const timeSlot = cell.dataset.time;
    
    // Remove modo de edição
    contentDiv.contentEditable = 'false';
    cell.classList.remove('editing');
    
    // Processa o conteúdo
    const content = contentDiv.innerText || contentDiv.textContent;
    processCellContent(profId, day, timeSlot, content);
}

function processCellContent(profId, day, timeSlot, content) {
    // Remove todas as atividades existentes deste profissional neste horário
    removeExistingActivitiesForProfessional(profId, day, timeSlot);
    
    if (!content.trim()) {
        // Célula vazia - apenas salva as mudanças
        saveScheduleData().then(() => {
            console.log('✅ Atividades removidas');
            updateGradeView();
        });
        return;
    }
    
    // Processa linhas do conteúdo
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    lines.forEach(line => {
        if (line.startsWith('👤')) {
            // Ignora linhas de usuários - serão processadas junto com o grupo
            return;
        }
        
        // Processa linha de grupo
        let numeroGrupo = '';
        let categoria = '';
        let usuarios = [];
        
        // Encontra a próxima linha de usuários se existir
        const currentIndex = lines.indexOf(line);
        const nextLine = lines[currentIndex + 1];
        if (nextLine && nextLine.startsWith('👤')) {
            const usersText = nextLine.replace('👤', '').trim();
            usuarios = usersText.split(',').map(name => ({
                nome: name.trim().toUpperCase(),
                idade: '',
                deficiencia: '',
                programa: ''
            })).filter(user => user.nome);
        }
        
        // Parse do nome do grupo
        if (isSpecificActivity(line.toUpperCase())) {
            categoria = line.toUpperCase();
        } else {
            const match = line.match(/^Grupo\s*(\w+)?\s*(?:-\s*(.+))?$/i);
            if (match) {
                numeroGrupo = match[1] || '';
                categoria = match[2]?.trim().toUpperCase() || '';
            } else {
                // Trata como categoria livre
                categoria = line.toUpperCase();
            }
        }
        
        // Cria novo grupo
        createGroupFromCellContent(day, timeSlot, numeroGrupo, categoria, usuarios, profId);
    });
    
    saveScheduleData().then(() => {
        console.log('✅ Conteúdo da célula processado e salvo');
        updateGradeView();
    }).catch(error => {
        console.error('❌ Erro ao salvar:', error);
        alert('Erro ao salvar. Tente novamente.');
    });
}

function removeExistingActivitiesForProfessional(profId, day, timeSlot) {
    if (!scheduleData[day]) return;
    
    const groupsToRemove = [];
    
    Object.keys(scheduleData[day]).forEach(groupId => {
        const group = scheduleData[day][groupId];
        if (group && group.horario === timeSlot && group.profissionais && group.profissionais.includes(profId)) {
            groupsToRemove.push(groupId);
        }
    });
    
    groupsToRemove.forEach(groupId => {
        delete scheduleData[day][groupId];
    });
}

function createGroupFromCellContent(day, timeSlot, numeroGrupo, categoria, usuarios, profId) {
    const newGroupId = Date.now() + Math.random(); // Evita IDs duplicados
    
    if (!scheduleData[day]) {
        scheduleData[day] = {};
    }
    
    scheduleData[day][newGroupId] = {
        numeroGrupo: numeroGrupo,
        horario: timeSlot,
        categoria: categoria,
        usuarios: usuarios,
        profissionais: [profId],
        createdAt: Date.now()
    };
}

// Gerenciamento de profissionais na célula da grade

let currentCellManagementContext = {};

function openProfessionalManagementForCell(day, groupId, event) {
    event.stopPropagation(); // Evita que o clique abra a edição da célula
    
    if (!isAuthenticated) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group) {
        alert('Grupo não encontrado!');
        return;
    }
    
    currentCellManagementContext = { day, groupId };
    
    // Preenche informações do grupo
    const groupInfo = document.getElementById('groupInfoDisplay');
    let groupDisplayName = '';
    if (isSpecificActivity(group.categoria)) {
        groupDisplayName = group.categoria;
    } else {
        groupDisplayName = group.numeroGrupo ? 
            `Grupo ${group.numeroGrupo}` : 
            `Grupo ${groupId}`;
        if (group.categoria) {
            groupDisplayName += ` - ${group.categoria}`;
        }
    }
    
    groupInfo.innerHTML = `
        <div class="group-info-card">
            <h4>${groupDisplayName}</h4>
            <p><strong>Dia:</strong> ${dayNames[day]}</p>
            <p><strong>Horário:</strong> ${group.horario}</p>
        </div>
    `;
    
    // Lista profissionais atuais
    updateCurrentProfessionalsList();
    
    // Popula dropdown de profissionais disponíveis
    updateAvailableProfessionalsList(day, group.horario);
    
    // Preenche o checkbox de ocultar profissionais
    const checkbox = document.getElementById('ocultarProfissionaisCheckboxReal');
    if (checkbox) {
        checkbox.checked = group.ocultarProfissionais || false;
        
        // Remove listener anterior se existir
        checkbox.onchange = null;
        
        // Adiciona listener para salvar quando alterado
        checkbox.onchange = function() {
            saveOcultarProfissionaisState();
        };
    }
    
    // Mostra o modal
    document.getElementById('manageCellProfessionalsModal').style.display = 'block';
}

function updateCurrentProfessionalsList() {
    const { day, groupId } = currentCellManagementContext;
    const group = scheduleData[day]?.[groupId];
    
    if (!group) return;
    
    const container = document.getElementById('currentProfessionalsList');
    
    if (!group.profissionais || group.profissionais.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum profissional neste grupo</div>';
        return;
    }
    
    let html = '';
    group.profissionais.forEach(profId => {
        const prof = masterProfessionals.find(p => p.id === profId);
        if (prof) {
            html += `
                <div class="professional-item">
                    <div class="prof-info">
                        <strong>${prof.nome}</strong><br>
                        <span class="prof-category">${prof.categoria}</span>
                    </div>
                    <button class="btn-remove-prof" onclick="removeProfessionalFromGroup(${profId})" title="Remover profissional">❌</button>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function updateAvailableProfessionalsList(day, timeSlot) {
    const select = document.getElementById('addProfessionalSelect');
    const { groupId } = currentCellManagementContext;
    const group = scheduleData[day]?.[groupId];
    
    select.innerHTML = '<option value="">Selecione um profissional para adicionar</option>';
    
    masterProfessionals.forEach(prof => {
        // Não mostra profissionais que já estão no grupo
        if (group.profissionais && group.profissionais.includes(prof.id)) {
            return;
        }
        
        // Não mostra profissionais de folga
        if (isProfessionalOnDayOff(prof.id, day)) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = prof.id;
        option.textContent = `${prof.nome} (${prof.categoria})`;
        
        // Verifica se tem conflito de horário
        if (checkProfessionalTimeConflict(prof.id, day, timeSlot)) {
            option.textContent += ' - OCUPADO';
            option.style.color = '#ef4444';
            option.style.fontStyle = 'italic';
        }
        
        select.appendChild(option);
    });
}

function checkProfessionalTimeConflict(profId, day, timeSlot) {
    if (!scheduleData[day]) return false;
    
    return Object.keys(scheduleData[day]).some(groupId => {
        const group = scheduleData[day][groupId];
        return group && 
               group.horario === timeSlot && 
               group.profissionais && 
               group.profissionais.includes(profId);
    });
}

function addProfessionalToGroup() {
    const select = document.getElementById('addProfessionalSelect');
    const profId = parseInt(select.value);
    
    if (!profId) {
        alert('Por favor, selecione um profissional.');
        return;
    }
    
    const { day, groupId } = currentCellManagementContext;
    const group = scheduleData[day]?.[groupId];
    
    if (!group) {
        alert('Grupo não encontrado!');
        return;
    }
    
    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) {
        alert('Profissional não encontrado!');
        return;
    }
    
    // Verifica conflito de horário
    if (checkProfessionalTimeConflict(profId, day, group.horario)) {
        showConflictWarning(prof.nome, day, group.horario);
        return;
    }
    
    // Adiciona o profissional ao grupo
    if (!group.profissionais) {
        group.profissionais = [];
    }
    
    group.profissionais.push(profId);
    
    // Salva no Firebase
    saveScheduleData().then(() => {
        console.log('✅ Profissional adicionado ao grupo');
        updateCurrentProfessionalsList();
        updateAvailableProfessionalsList(day, group.horario);
        updateGradeView(); // Atualiza a grade para mostrar a mudança
        hideConflictWarning();
        
        // Limpa a seleção
        select.value = '';
    }).catch(error => {
        console.error('❌ Erro ao adicionar profissional:', error);
        alert('Erro ao adicionar profissional. Tente novamente.');
        // Remove o profissional que foi adicionado
        const index = group.profissionais.indexOf(profId);
        if (index !== -1) {
            group.profissionais.splice(index, 1);
        }
    });
}

function removeProfessionalFromGroup(profId) {
    if (!confirm('Tem certeza que deseja remover este profissional do grupo?')) {
        return;
    }
    
    const { day, groupId } = currentCellManagementContext;
    const group = scheduleData[day]?.[groupId];
    
    if (!group || !group.profissionais) return;
    
    const index = group.profissionais.indexOf(profId);
    if (index === -1) return;
    
    group.profissionais.splice(index, 1);
    
    saveScheduleData().then(() => {
        console.log('✅ Profissional removido do grupo');
        updateCurrentProfessionalsList();
        updateAvailableProfessionalsList(day, group.horario);
        updateGradeView(); // Atualiza a grade para mostrar a mudança
    }).catch(error => {
        console.error('❌ Erro ao remover profissional:', error);
        alert('Erro ao remover profissional. Tente novamente.');
        // Restaura o profissional
        group.profissionais.splice(index, 0, profId);
        updateCurrentProfessionalsList();
    });
}

function showConflictWarning(profName, day, timeSlot) {
    const warning = document.getElementById('conflictWarning');
    const warningText = warning.querySelector('.warning-text');
    
    warningText.textContent = `${profName} já está ocupado(a) na ${dayNames[day]} às ${timeSlot}. Deseja adicionar mesmo assim?`;
    warning.style.display = 'block';
    
    // Adiciona botão para forçar a adição
    if (!warning.querySelector('.btn-force-add')) {
        const btnForceAdd = document.createElement('button');
        btnForceAdd.className = 'btn-force-add';
        btnForceAdd.textContent = 'Adicionar Mesmo Assim';
        btnForceAdd.onclick = forceAddProfessional;
        warning.querySelector('.warning-content').appendChild(btnForceAdd);
    }
}

function hideConflictWarning() {
    const warning = document.getElementById('conflictWarning');
    warning.style.display = 'none';
    
    // Remove botão de forçar se existir
    const btnForceAdd = warning.querySelector('.btn-force-add');
    if (btnForceAdd) {
        btnForceAdd.remove();
    }
}

function forceAddProfessional() {
    const select = document.getElementById('addProfessionalSelect');
    const profId = parseInt(select.value);
    
    if (!profId) return;
    
    const { day, groupId } = currentCellManagementContext;
    const group = scheduleData[day]?.[groupId];
    
    if (!group) return;
    
    // Adiciona mesmo com conflito
    if (!group.profissionais) {
        group.profissionais = [];
    }
    
    group.profissionais.push(profId);
    
    saveScheduleData().then(() => {
        console.log('✅ Profissional adicionado (com conflito) ao grupo');
        updateCurrentProfessionalsList();
        updateAvailableProfessionalsList(day, group.horario);
        updateGradeView();
        hideConflictWarning();
        select.value = '';
    }).catch(error => {
        console.error('❌ Erro ao adicionar profissional:', error);
        alert('Erro ao adicionar profissional. Tente novamente.');
        const index = group.profissionais.indexOf(profId);
        if (index !== -1) {
            group.profissionais.splice(index, 1);
        }
    });
}
// ORIENTAÇÃO PARENTAL - Dados em memória
let orientacaoData = {};

// Inicializa estrutura de dados da orientação parental
function initializeOrientacaoData() {
    days.forEach(day => {
        if (!orientacaoData[day]) {
            orientacaoData[day] = {};
        }
        orientacaoTimeSlots.forEach(timeSlot => {
            if (!orientacaoData[day][timeSlot]) {
                orientacaoData[day][timeSlot] = '';
            }
        });
    });
}

// Renderiza a grade de orientação parental
function renderOrientacaoGrid() {
    const container = document.getElementById('orientacao-grid');
    if (!container) return;
    
    let html = `
        <table class="orientacao-table">
            <thead>
                <tr>
                    <th>Horário</th>
                    <th>Segunda-feira</th>
                    <th>Terça-feira</th>
                    <th>Quarta-feira</th>
                    <th>Quinta-feira</th>
                    <th>Sexta-feira</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    orientacaoTimeSlots.forEach(timeSlot => {
        html += `<tr>
            <td class="time-column">${timeSlot}</td>`;
        
        days.forEach(day => {
            const currentValue = orientacaoData[day]?.[timeSlot] || '';
            const cellClass = currentValue ? 'orientacao-cell filled' : 'orientacao-cell';
            const isDisabled = !isAuthenticated ? 'disabled' : '';
            
            html += `
                <td>
                    <textarea class="${cellClass}" 
                           placeholder="${isAuthenticated ? 'Clique para editar' : ''}"
                           onchange="updateOrientacao('${day}', '${timeSlot}', this.value, this)"
                           oninput="updateFontSizeForLength(this, this.value.trim()); autoResize(this);"
                           onblur="saveOrientacaoData()"
                           ${isDisabled}>${currentValue}</textarea>
                </td>`;
        });
        
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
    
    // Aplica o tamanho correto da fonte para campos já preenchidos
    setTimeout(() => {
        const cells = container.querySelectorAll('.orientacao-cell');
        cells.forEach(cell => {
            if (cell.value && cell.value.trim()) {
                updateFontSizeForLength(cell, cell.value.trim());
                autoResize(cell);
            }
        });
    }, 10);
}

// Função para redimensionar automaticamente o textarea
function autoResize(element) {
    element.style.height = 'auto';
    element.style.height = Math.max(44, element.scrollHeight) + 'px';
}

// Atualiza dados da orientação parental
function updateOrientacao(day, timeSlot, value, element) {
    if (!isAuthenticated) {
        alert("⛔ Faça login como administrador para editar!");
        // Restaura o valor anterior
        renderOrientacaoGrid();
        return;
    }
    
    if (!orientacaoData[day]) {
        orientacaoData[day] = {};
    }
    
    orientacaoData[day][timeSlot] = value.trim().toUpperCase();
    
    // Atualiza a classe da célula e o tamanho da fonte
    if (element) {
        if (value.trim()) {
            element.classList.add('filled');
        } else {
            element.classList.remove('filled');
        }
        
        // Atualiza o tamanho da fonte baseado no comprimento do texto
        updateFontSizeForLength(element, value.trim());
    }
    
    // Salva automaticamente no Firebase com debounce
    clearTimeout(window.orientacaoSaveTimeout);
    window.orientacaoSaveTimeout = setTimeout(() => {
        saveOrientacaoData();
    }, 1000); // Aguarda 1 segundo após parar de digitar
}

// Função para atualizar o tamanho da fonte baseado no comprimento do texto
function updateFontSizeForLength(element, text) {
    const length = text.length;
    
    // Remove atributo anterior
    element.removeAttribute('data-length-range');
    
    if (length <= 15) {
        // Textos curtos (até 15 caracteres)
        element.setAttribute('data-length-range', 'short');
    } else if (length <= 25) {
        // Textos médios (16-25 caracteres)
        element.setAttribute('data-length-range', 'medium');
    } else if (length <= 35) {
        // Textos longos (26-35 caracteres)
        element.setAttribute('data-length-range', 'long');
    } else if (length <= 50) {
        // Textos muito longos (36-50 caracteres)
        element.setAttribute('data-length-range', 'very-long');
    } else {
        // Textos extremamente longos (51+ caracteres)
        element.setAttribute('data-length-range', 'extra-long');
    }
}




function showOrientacaoStatus(message, type = 'success') {
    let status = document.getElementById('orientacao-status');
    if (!status) {
        status = document.createElement('div');
        status.id = 'orientacao-status';
        status.className = 'orientacao-status';
        document.body.appendChild(status);
    }
    
    status.textContent = message;
    status.style.background = type === 'success' ? '#10b981' : '#ef4444';
    status.classList.add('show');
    
    setTimeout(() => {
        status.classList.remove('show');
    }, 2000);
}

// Salva dados no Firebase (placeholder - você pode implementar depois)
function saveOrientacaoData() {
    if (!isAuthenticated || !isFirebaseConnected) return;
    
    showOrientacaoStatus('Salvando...', 'info');
    
    return db().ref('orientacao-parental').set(orientacaoData)
        .then(() => {
            console.log('✅ Dados de orientação parental salvos no Firebase');
            showOrientacaoStatus('✅ Salvo!', 'success');
        })
        .catch(error => {
            console.error('❌ Erro ao salvar orientação parental:', error);
            showOrientacaoStatus('❌ Erro ao salvar', 'error');
        });
}



// Carrega dados do Firebase (placeholder)
function loadOrientacaoData() {
    console.log('📥 Carregando dados de orientação parental...');
    
    db().ref('orientacao-parental').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            orientacaoData = data;
            console.log('✅ Dados de orientação parental carregados');
        } else {
            console.log('📋 Nenhum dado de orientação encontrado - inicializando estrutura');
            initializeOrientacaoData();
            // Salva estrutura inicial se conectado
            if (isFirebaseConnected && isAuthenticated) {
                saveOrientacaoData();
            }
        }
        
        // Se a aba orientação estiver ativa, renderiza
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && activeTab.dataset.day === 'orientacao-parental') {
            renderOrientacaoGrid();
        }
    }).catch(error => {
        console.error('❌ Erro ao carregar orientação parental:', error);
        initializeOrientacaoData();
    });
}
function setupOrientacaoRealtimeSync() {
    // Configura sincronização em tempo real
    db().ref('orientacao-parental').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && JSON.stringify(data) !== JSON.stringify(orientacaoData)) {
            orientacaoData = data;
            console.log('🔄 Orientação parental atualizada em tempo real');
            
            // Atualiza a grade se estiver na aba
            const activeTab = document.querySelector('.tab.active');
            if (activeTab && activeTab.dataset.day === 'orientacao-parental') {
                renderOrientacaoGrid();
            }
        }
    });
}

// Função principal para atualizar a visualização da grade
function updateGradeView() {
    const container = document.getElementById('grade-content');
    if (!container) return;
    
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const weekdayFilter = document.getElementById('gradeWeekdayFilter')?.value || '';
    
    // Se nenhum filtro aplicado, mostra estado vazio
    if (!categoryFilter && !weekdayFilter) {
        container.innerHTML = '<div class="empty-state">Selecione uma categoria ou um dia da semana para visualizar a grade</div>';
        return;
    }
    
    // Se filtro de categoria aplicado, renderiza grade de categoria
    if (categoryFilter) {
        renderGradeByCategory(categoryFilter);
        return;
    }
    
    // Se filtro de dia aplicado, renderiza grade do dia
    if (weekdayFilter) {
        renderGradeByDay(weekdayFilter);
        return;
    }
}

// Renderiza grade filtrada por categoria (vista estilo planilha)
function renderGradeByCategory(category) {
    const container = document.getElementById('grade-content');
    if (!container) return;
    
    // Filtra profissionais por categoria
    const categoryProfessionals = masterProfessionals.filter(prof => 
        prof.categoria === category
    );
    
    if (categoryProfessionals.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum profissional encontrado na categoria "${category}"</div>`;
        return;
    }
    
    let html = '<div class="category-grade-container">';
    
    categoryProfessionals.forEach(professional => {
        html += generateProfessionalGridWithEditSystem(professional);
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Anexa event listeners seguros aos botões que foram criados sem onclick inline
    attachSafeEventListeners();
}

// Função para anexar event listeners seguros aos botões criados dinamicamente
function attachSafeEventListeners() {
    // Esta função foi criada para o sistema inline, mas você está usando o sistema de edição por grupo
    // que já funciona corretamente com as funções addProfToGroup() e removeProfFromGroup()
    // Por isso não há botões inline para processar - isso é normal!
}

// Renderiza grade filtrada por dia da semana (vista original)
function renderGradeByDay(day) {
    const container = document.getElementById('grade-content');
    if (!container) return;
    
    const dayGroups = scheduleData[day] || {};
    const groupIds = Object.keys(dayGroups);
    
    if (groupIds.length === 0) {
        container.innerHTML = `<div class="empty-state">Nenhum grupo encontrado para ${dayNames[day]}</div>`;
        return;
    }
    
    // Gera tabela original por horários
    let html = `
        <div class="day-schedule-container">
            <h2>📅 Grade de Horários - ${dayNames[day]}</h2>
            <table class="schedule-table">
                <thead>
                    <tr>
                        <th>Horário</th>
                        <th>Atividades</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // Agrupa por horário e ordena
    const groupsByTime = {};
    Object.keys(dayGroups).forEach(groupId => {
        const group = dayGroups[groupId];
        const time = group.horario;
        if (!groupsByTime[time]) {
            groupsByTime[time] = [];
        }
        groupsByTime[time].push({ id: groupId, ...group });
    });

    const sortedTimes = Object.keys(groupsByTime).sort();
    
    sortedTimes.forEach(timeSlot => {
        const groups = groupsByTime[timeSlot];
        html += `
            <tr>
                <td class="time-column"><div class="time-content">${timeSlot}</div></td>
                <td class="activities-column">
        `;
        
        groups.forEach(group => {
            html += generateOriginalGroupBlock(day, group.id, group);
        });
        
        html += `</td></tr>`;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Gera bloco de grupo para visualização por dia
function generateGroupBlock(day, groupId, group) {
    // Se existe texto livre, usa ele diretamente
    let displayContent = '';
    if (group.freeTextContent) {
        // Converte quebras de linha em <br> para exibição HTML
        displayContent = group.freeTextContent.replace(/\n/g, '<br>');
    } else {
        // Usa a lógica anterior para compatibilidade
        let groupName = '';
        if (isSpecificActivity(group.categoria)) {
            groupName = group.categoria;
        } else {
            groupName = group.numeroGrupo ? `Grupo ${group.numeroGrupo}` : '';
            if (group.categoria) {
                groupName += ` - ${group.categoria}`;
            }
        }
        
        let usersHTML = '';
        if (group.usuarios && group.usuarios.length > 0) {
            group.usuarios.forEach(user => {
                usersHTML += `<br>👤 ${user.nome} (${user.idade} anos)`;
            });
        }
        
        displayContent = `<strong>${groupName}</strong>${usersHTML}`;
    }
    
    let professionalsHTML = '';
    if (group.profissionais && group.profissionais.length > 0 && !group.ocultarProfissionais) {
        professionalsHTML = '<div class="professionals-list">';
        group.profissionais.forEach(profId => {
            const prof = masterProfessionals.find(p => p.id === profId);
            if (prof) {
                professionalsHTML += `<div class="professional-item">👨‍⚕️ ${prof.nome} (${prof.categoria})</div>`;
            }
        });
        professionalsHTML += '</div>';
    }
    
    return `
        <div class="group-block" data-group-id="${groupId}">
            <div class="group-header">
                <div class="group-title-display">${displayContent}</div>
                <span class="group-time">⏰ ${group.horario}</span>
            </div>
            <div class="group-content">
                ${professionalsHTML}
            </div>
        </div>
    `;
}

// Gera bloco de grupo para visualização original por dia (formato tabela)
function generateOriginalGroupBlock(day, groupId, group) {
    // Se existe texto livre, usa ele diretamente
    let displayContent = '';
    if (group.freeTextContent) {
        // Converte quebras de linha em <br> para exibição HTML
        displayContent = group.freeTextContent.replace(/\n/g, '<br>');
    } else {
        // Usa a lógica anterior para compatibilidade
        let groupName = '';
        if (isSpecificActivity(group.categoria)) {
            groupName = group.categoria;
        } else {
            groupName = group.numeroGrupo ? `Grupo ${group.numeroGrupo}` : '';
            if (group.categoria) {
                groupName += ` - ${group.categoria}`;
            }
        }
        
        let usersHTML = '';
        if (group.usuarios && group.usuarios.length > 0) {
            group.usuarios.forEach(user => {
                usersHTML += `👤 ${user.nome} (${user.idade} anos) `;
            });
        }
        
        displayContent = `<strong>${groupName}</strong>${usersHTML ? `<br>${usersHTML}` : ''}`;
    }
    
    let professionalsHTML = '';
    if (group.profissionais && group.profissionais.length > 0 && !group.ocultarProfissionais) {
        const profNames = group.profissionais.map(profId => {
            const prof = masterProfessionals.find(p => p.id === profId);
            return prof ? prof.nome : 'Profissional não encontrado';
        });
        professionalsHTML = profNames.join(', ');
    }
    
    return `
        <div class="original-group-block" data-group-id="${groupId}">
            <div class="group-header">
                <div class="group-time-badge">⏰ ${group.horario}</div>
                <div class="group-text-content">${displayContent}</div>
                ${isAuthenticated ? `
                    <div class="group-buttons">
                        <button class="btn-edit-group" onclick="editGroup('${day}', '${groupId}')" title="Editar">✏️</button>
                        <button class="btn-delete-group" onclick="deleteGroup('${day}', '${groupId}')" title="Excluir">🗑️</button>
                    </div>
                ` : ''}
            </div>
            ${professionalsHTML ? `<div class="group-content">
                <div class="professionals-line"><strong>Profissionais:</strong> ${professionalsHTML}</div>
            </div>` : ''}
        </div>
    `;
}

// Gera grade de profissional com sistema de edição por grupo
function generateProfessionalGridWithEditSystem(professional) {
    let gridHTML = `
        <div class="professional-schedule-grid">
            <h3 class="sticky-professional-header">👨‍⚕️ ${professional.nome} - ${professional.categoria}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Horário</th>
    `;
    
    days.forEach(day => {
        gridHTML += `<th>${dayNames[day]}</th>`;
    });
    
    gridHTML += `
                    </tr>
                </thead>
                <tbody>
    `;
    
    timeSlots.forEach(timeSlot => {
        gridHTML += `<tr><td>${timeSlot}</td>`;
        
        days.forEach(day => {
            const activities = getProfessionalActivitiesAtTime(professional.id, day, timeSlot);
            const isOnDayOff = isProfessionalOnDayOff(professional.id, day);
            
            // Classe CSS para células de folga
            const dayOffClass = isOnDayOff ? ' day-off-cell' : '';
            
            gridHTML += `<td class="group-cell${dayOffClass}" data-prof-id="${professional.id}" 
                           data-day="${day}" 
                           data-time="${timeSlot}">`;
                
            if (isOnDayOff) {
                // Mostra indicação de folga
                gridHTML += `<div class="day-off-indicator">Folga</div>`;
            } else if (activities.length > 0) {
                // Mostra atividades normais
                activities.forEach(activity => {
                    gridHTML += generateGroupCellWithEditSystem(day, activity.groupId, activity);
                });
            } else {
                // Célula vazia - mostra botão de adicionar para admins
                if (isAuthenticated) {
                    gridHTML += `<div class="empty-cell-container">
                        <button class="btn-add-group-to-cell" 
                                onclick="createNewGroupInCell('${day}', '${timeSlot}', ${professional.id})"
                                title="Criar novo grupo neste horário">
                            ➕
                        </button>
                    </div>`;
                }
            }
            
            gridHTML += `</td>`;
        });
        gridHTML += `</tr>`;
    });
    
    gridHTML += `
                </tbody>
            </table>
        </div>
    `;
    return gridHTML;
}

// Gera célula de grupo com sistema de edição
function generateGroupCellWithEditSystem(day, groupId, activity) {
    const isEditing = window.editingGroups && window.editingGroups[`${day}-${groupId}`];
    
    if (isEditing) {
        return generateEditableGroupCell(day, groupId, activity);
    } else {
        return generateStaticGroupCell(day, groupId, activity);
    }
}

// Gera célula estática (visualização normal)
function generateStaticGroupCell(day, groupId, activity) {
    const group = scheduleData[day]?.[groupId];
    if (!group) return '';
    
    // Se existe texto livre, usa ele diretamente
    let displayContent = '';
    if (group.freeTextContent) {
        // Converte quebras de linha em <br> para exibição HTML
        displayContent = group.freeTextContent.replace(/\n/g, '<br>');
    } else {
        // Usa a lógica anterior para compatibilidade
        let groupName = '';
        if (isSpecificActivity(group.categoria)) {
            groupName = group.categoria;
        } else {
            groupName = group.numeroGrupo ? `Grupo ${group.numeroGrupo}` : '';
            if (group.categoria && group.categoria !== 'Sem categoria') {
                groupName += (groupName ? ' - ' : '') + group.categoria;
            }
        }
        
        // Gera texto dos usuários a partir dos dados reais do grupo
        let usersText = '';
        if (group.usuarios && group.usuarios.length > 0) {
            usersText = group.usuarios.map(user => `${user.nome} (${user.idade} anos)`).join(', ');
        }
        
        displayContent = `${groupName ? `<strong>${groupName}</strong>` : ''}${usersText ? `${groupName ? '<br>' : ''}👤 ${usersText}` : ''}`;
    }
    
    // Lista de profissionais
    let professionalsText = '';
    if (group && group.profissionais && group.profissionais.length > 0 && !group.ocultarProfissionais) {
        const profNames = group.profissionais.map(profId => {
            const prof = masterProfessionals.find(p => p.id === profId);
            return prof ? prof.nome : 'N/A';
        });
        professionalsText = profNames.join(', ');
    }
    
    return `
        <div class="static-group-cell" data-group-id="${groupId}">
            <div class="group-content-block">
                <div class="editable-content">
                    ${displayContent}
                </div>
                ${professionalsText ? `<div class="professionals-content"><strong>Profissionais:</strong> ${professionalsText}</div>` : ''}
            </div>
            ${isAuthenticated ? `
                <div class="cell-buttons">
                    <button class="btn-edit-cell" onclick="toggleGroupEdit('${day}', '${groupId}')" title="Editar">✏️</button>
                    <button class="btn-delete-cell" onclick="deleteGroup('${day}', '${groupId}')" title="Excluir">🗑️</button>
                </div>
            ` : ''}
        </div>
    `;
}

// Gera célula editável
function generateEditableGroupCell(day, groupId, activity) {
    const group = scheduleData[day]?.[groupId];
    if (!group) return '';
    
    // Se existe texto livre, usa ele diretamente
    let currentContent = '';
    if (group.freeTextContent) {
        currentContent = group.freeTextContent;
    } else {
        // Usa a lógica anterior para compatibilidade
        let groupName = '';
        if (isSpecificActivity(group.categoria)) {
            groupName = group.categoria;
        } else {
            groupName = group.numeroGrupo ? `Grupo ${group.numeroGrupo}` : '';
            if (group.categoria && group.categoria !== 'Sem categoria') {
                groupName += (groupName ? ' - ' : '') + group.categoria;
            }
        }
        
        // Gera texto dos usuários a partir dos dados reais do grupo
        let usersText = '';
        if (group.usuarios && group.usuarios.length > 0) {
            usersText = group.usuarios.map(user => `${user.nome} (${user.idade} anos)`).join(', ');
        }
        
        currentContent = `${groupName}${usersText ? (groupName ? '\n' : '') + '👤 ' + usersText : ''}`;
    }
    
    return `
        <div class="editable-group-cell" data-group-id="${groupId}">
            <div class="edit-content">
                <textarea class="edit-group-content" placeholder="Digite qualquer texto aqui...">${currentContent}</textarea>
                
                <div class="professionals-management">
                    <label><strong>Profissionais:</strong></label>
                    <div class="current-professionals">
                        ${group && group.profissionais ? group.profissionais.map(profId => {
                            const prof = masterProfessionals.find(p => p.id === profId);
                            return prof ? `
                                <div class="prof-tag">
                                    ${prof.nome} 
                                    <button class="btn-remove-prof-tag" onclick="removeProfFromGroup('${day}', '${groupId}', ${profId})">×</button>
                                </div>
                            ` : '';
                        }).join('') : ''}
                    </div>
                    <select class="add-prof-select" onchange="addProfToGroup('${day}', '${groupId}', this.value); this.value=''">
                        <option value="">+ Adicionar profissional</option>
                        ${masterProfessionals.filter(prof => !group?.profissionais?.includes(prof.id) && !isProfessionalOnDayOff(prof.id, day)).map(prof => 
                            `<option value="${prof.id}">${prof.nome} (${prof.categoria})</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="checkbox-options">
                    <label class="edit-checkbox-label" style="background: lime; padding: 8px; border: 2px solid green; border-radius: 4px; display: inline-block; margin: 10px 0;">
                        <input type="checkbox" id="ocultarProf_${groupId}" ${group.ocultarProfissionais ? 'checked' : ''} 
                               onchange="updateOcultarProfissionais('${day}', '${groupId}', this.checked)"
                               style="width: 18px; height: 18px; margin-right: 8px;">
                        <span style="font-weight: bold; color: black;">👁️ OCULTAR PROFISSIONAIS NA GRADE</span>
                    </label>
                </div>
                
                <div class="edit-buttons">
                    <button class="btn-save-group" onclick="saveGroupEdit('${day}', '${groupId}')">💾 Salvar</button>
                    <button class="btn-cancel-group" onclick="cancelGroupEdit('${day}', '${groupId}')">❌ Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

// Função removida - usando a versão com preservação de scroll

// Função legada removida - substituída pelo novo sistema de edição

// Sistema de controle de edição de grupos
window.editingGroups = window.editingGroups || {};
// Controla grupos que foram recém-criados (ainda não salvos)
window.newlyCreatedGroups = window.newlyCreatedGroups || {};

// Alterna entre modo de edição e visualização
function toggleGroupEdit(day, groupId) {
    if (!isAuthenticated) {
        alert("⛔ Faça login como administrador para editar!");
        return;
    }
    
    // BLOQUEIA SCROLL COMPLETAMENTE
    blockScrollCompletely();
    
    const key = `${day}-${groupId}`;
    window.editingGroups[key] = !window.editingGroups[key];
    updateGradeView(); // Recarrega a visualização
    
    // Desbloqueia após tempo menor
    setTimeout(() => {
        unblockScroll();
    }, 1000);
}

// Salva as edições do grupo
function saveGroupEdit(day, groupId) {
    if (!isAuthenticated) return;
    
    const cell = document.querySelector(`[data-group-id="${groupId}"] .edit-group-content`);
    if (!cell) return;
    
    const content = cell.value;
    const key = `${day}-${groupId}`;
    
    // Processa o conteúdo editado
    processFreeTextGroupContent(day, groupId, content);
    
    // Sai do modo de edição
    delete window.editingGroups[key];
    
    // Remove da lista de grupos recém-criados (agora foi salvo)
    if (window.newlyCreatedGroups[key]) {
        delete window.newlyCreatedGroups[key];
    }
    
    // Salva a posição do scroll antes de atualizar
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Salva no Firebase
    saveScheduleData().then(() => {
        console.log('✅ Grupo editado e salvo');
        updateGradeView();
        
        // Restaura a posição do scroll
        setTimeout(() => {
            window.scrollTo(scrollLeft, scrollTop);
        }, 50);
    }).catch(error => {
        console.error('❌ Erro ao salvar grupo:', error);
        alert('Erro ao salvar. Tente novamente.');
    });
}

// Cancela a edição do grupo
function cancelGroupEdit(day, groupId) {
    const key = `${day}-${groupId}`;
    
    // Se é um grupo recém-criado, remove completamente
    if (window.newlyCreatedGroups[key]) {
        delete scheduleData[day][groupId];
        delete window.newlyCreatedGroups[key];
        console.log(`🚮 Grupo recém-criado cancelado e removido: ${key}`);
    }
    
    delete window.editingGroups[key];
    
    // BLOQUEIA SCROLL DURANTE CANCELAMENTO
    blockScrollCompletely();
    
    updateGradeView(); // Recarrega sem salvar
    
    // Desbloqueia após tempo menor
    setTimeout(() => {
        unblockScroll();
    }, 1000);
}

// Edita grupo na visualização por dia
function editGroup(day, groupId) {
    if (!isAuthenticated) {
        alert("⛔ Faça login como administrador para editar!");
        return;
    }
    
    
    // Chama o modal de edição completo ao invés do prompt
    openEditGroupModal(day, groupId);
}

// Processa conteúdo livre digitado pelo usuário
function processFreeTextGroupContent(day, groupId, content) {
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    // Armazena o conteúdo exatamente como foi digitado
    group.freeTextContent = content;
    
    // Ainda processa usuários que começam com 👤 para manter compatibilidade
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    group.usuarios = [];
    
    lines.forEach(line => {
        if (line.startsWith('👤')) {
            // Linha de usuário
            const userInfo = line.replace('👤', '').trim();
            const match = userInfo.match(/^(.+?)\s*\((\d+)\s*anos?\)/);
            if (match) {
                group.usuarios.push({
                    nome: match[1].trim().toUpperCase(),
                    idade: match[2],
                    deficiencia: '',
                    programa: ''
                });
            } else {
                // Usuário sem idade especificada
                group.usuarios.push({
                    nome: userInfo.toUpperCase(),
                    idade: '',
                    deficiencia: '',
                    programa: ''
                });
            }
        }
    });
}

// Adiciona profissional ao grupo (usado no select)
function addProfToGroup(day, groupId, profId) {
    if (!profId || !isAuthenticated) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    const prof = masterProfessionals.find(p => p.id == profId);
    if (!prof) return;
    
    // Salva o conteúdo editável antes da operação
    saveCurrentEditableContent();
    
    // Verifica conflito
    if (checkProfessionalTimeConflict(profId, day, group.horario)) {
        if (!confirm(`${prof.nome} já está ocupado(a) na ${dayNames[day]} às ${group.horario}. Deseja adicionar mesmo assim?`)) {
            // Restaura o conteúdo se cancelou
            setTimeout(() => restoreEditableContent(), 50);
            return;
        }
    }
    
    if (!group.profissionais) group.profissionais = [];
    if (!group.profissionais.includes(parseInt(profId))) {
        group.profissionais.push(parseInt(profId));
        
        // Salva no Firebase antes de atualizar
        saveScheduleData().then(() => {
            updateGradeView(); // Recarrega para mostrar a mudança
            // Restaura o conteúdo editável após recarregar
            setTimeout(() => restoreEditableContent(), 100);
        }).catch(error => {
            console.error('❌ Erro ao salvar profissional:', error);
            // Remove o profissional que foi adicionado em caso de erro
            const index = group.profissionais.indexOf(parseInt(profId));
            if (index !== -1) {
                group.profissionais.splice(index, 1);
            }
            // Restaura o conteúdo mesmo em caso de erro
            setTimeout(() => restoreEditableContent(), 50);
        });
    }
}

// Remove profissional do grupo
function removeProfFromGroup(day, groupId, profId) {
    if (!isAuthenticated) return;
    
    const group = scheduleData[day]?.[groupId];
    if (!group || !group.profissionais) return;
    
    const prof = masterProfessionals.find(p => p.id === parseInt(profId));
    if (!prof) return;
    
    if (!confirm(`Tem certeza que deseja remover ${prof.nome} deste grupo?`)) {
        return;
    }
    
    // Salva o conteúdo editável antes da operação
    saveCurrentEditableContent();
    
    const index = group.profissionais.indexOf(parseInt(profId));
    if (index !== -1) {
        group.profissionais.splice(index, 1);
        
        // Salva no Firebase antes de atualizar
        saveScheduleData().then(() => {
            updateGradeView(); // Recarrega para mostrar a mudança
            // Restaura o conteúdo editável após recarregar
            setTimeout(() => restoreEditableContent(), 100);
        }).catch(error => {
            console.error('❌ Erro ao salvar profissional:', error);
            // Restaura o profissional em caso de erro
            group.profissionais.splice(index, 0, parseInt(profId));
            // Restaura o conteúdo mesmo em caso de erro
            setTimeout(() => restoreEditableContent(), 50);
        });
    }
}

// Exclui um grupo completo (atividade inteira de um horário)
function deleteGroup(day, groupId) {
    if (!isAuthenticated) {
        alert("⛔ Faça login como administrador para excluir!");
        return;
    }
    
    const group = scheduleData[day]?.[groupId];
    if (!group) {
        alert('Grupo não encontrado!');
        return;
    }
    
    // Mostra informações do grupo na confirmação
    let groupName = '';
    if (isSpecificActivity(group.categoria)) {
        groupName = group.categoria;
    } else {
        groupName = group.numeroGrupo ? `Grupo ${group.numeroGrupo}` : 'Grupo';
        if (group.categoria) {
            groupName += ` - ${group.categoria}`;
        }
    }
    
    const timeSlot = group.horario;
    const dayName = dayNames[day];
    
    // Lista profissionais envolvidos
    let professionalsInfo = '';
    if (group.profissionais && group.profissionais.length > 0) {
        const profNames = group.profissionais.map(profId => {
            const prof = masterProfessionals.find(p => p.id === profId);
            return prof ? prof.nome : 'N/A';
        });
        professionalsInfo = `\n\n👥 Profissionais que serão liberados: ${profNames.join(', ')}`;
    }
    
    // Lista usuários envolvidos
    let usersInfo = '';
    if (group.usuarios && group.usuarios.length > 0) {
        const userNames = group.usuarios.map(u => u.nome);
        usersInfo = `\n👤 Usuários: ${userNames.join(', ')}`;
    }
    
    const confirmMessage = `🗑️ EXCLUIR GRUPO COMPLETO\n\n` +
        `📋 Grupo: ${groupName}\n` +
        `📅 Dia: ${dayName}\n` +
        `⏰ Horário: ${timeSlot}` +
        usersInfo +
        professionalsInfo +
        `\n\n⚠️ Esta ação não pode ser desfeita!\n` +
        `O horário ficará vago e todos os profissionais serão liberados.\n\n` +
        `Tem certeza que deseja excluir este grupo?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Remove o grupo dos dados de agendamento
    delete scheduleData[day][groupId];
    
    // Remove do modo de edição se estiver ativo
    const editKey = `${day}-${groupId}`;
    if (window.editingGroups && window.editingGroups[editKey]) {
        delete window.editingGroups[editKey];
    }
    
    // Remove da lista de grupos recém-criados se estiver lá
    if (window.newlyCreatedGroups && window.newlyCreatedGroups[editKey]) {
        delete window.newlyCreatedGroups[editKey];
    }
    
    // Salva no Firebase
    saveScheduleData().then(() => {
        console.log(`✅ Grupo ${groupName} excluído do ${dayName} às ${timeSlot}`);
        updateGradeView();
         // Atualiza estatísticas
        
        alert(`✅ Grupo excluído com sucesso!\n\n` +
              `📋 ${groupName} foi removido de ${dayName} às ${timeSlot}\n` +
              (professionalsInfo ? `👥 Profissionais liberados para outros horários` : ''));
        
    }).catch(error => {
        console.error('❌ Erro ao excluir grupo:', error);
        alert('❌ Erro ao excluir grupo. Tente novamente.');
        
        // Restaura o grupo em caso de erro
        scheduleData[day][groupId] = group;
    });
}

// Cria novo grupo em célula vazia da grade por categoria
function createNewGroupInCell(day, timeSlot, professionalId) {
    if (!isAuthenticated) {
        alert("⛔ Faça login como administrador para criar grupos!");
        return;
    }
    
    // Gera ID único para o novo grupo
    const newGroupId = Date.now();
    
    // Cria estrutura inicial do grupo
    if (!scheduleData[day]) {
        scheduleData[day] = {};
    }
    
    // Cria grupo básico com o profissional já atribuído
    scheduleData[day][newGroupId] = {
        numeroGrupo: '',
        horario: timeSlot,
        categoria: '',
        usuarios: [],
        profissionais: [professionalId],
        createdAt: Date.now()
    };
    
    // Coloca imediatamente em modo de edição
    const editKey = `${day}-${newGroupId}`;
    window.editingGroups[editKey] = true;
    
    // Marca como grupo recém-criado (ainda não salvo)
    window.newlyCreatedGroups[editKey] = true;
    
    // BLOQUEIA SCROLL COMPLETAMENTE
    blockScrollCompletely();
    
    // Atualiza a visualização para mostrar o modo de edição
    updateGradeView();
    
    // Desbloqueia após tempo menor
    setTimeout(() => {
        unblockScroll();
    }, 1000);
    
    // Foca no campo de texto APÓS o desbloqueio para não interferir
    setTimeout(() => {
        const textarea = document.querySelector(`[data-group-id="${newGroupId}"] .edit-group-content`);
        if (textarea) {
            // Bloqueia temporariamente só para o focus
            const currentPos = { 
                top: window.pageYOffset || document.documentElement.scrollTop,
                left: window.pageXOffset || document.documentElement.scrollLeft
            };
            
            textarea.focus({ preventScroll: true });
            textarea.placeholder = 'Digite o nome do grupo e usuários...';
            
            // Força posição após focus
            setTimeout(() => {
                window.scrollTo(currentPos.left, currentPos.top);
            }, 10);
        }
    }, 1100); // Logo após o desbloqueio
    
    console.log(`📝 Novo grupo criado em ${dayNames[day]} às ${timeSlot} para profissional ${professionalId}`);
}

// Funções para gerenciamento inline de profissionais na grade de visualização por categoria

// Variável global para armazenar temporariamente o conteúdo das caixas de texto durante operações
window.temporaryTextContent = {};

function saveCurrentEditableContent() {
    // Salva o conteúdo de todas as caixas de texto editáveis atualmente abertas
    const editableCells = document.querySelectorAll('.spreadsheet-cell-content[contenteditable="true"]');
    const editableTextareas = document.querySelectorAll('.edit-group-content');
    
    console.log('🔍 DEBUG: Salvando conteúdo editável. Células contentEditable:', editableCells.length, 'Textareas:', editableTextareas.length);
    
    // Salva células contentEditable (sistema antigo)
    editableCells.forEach(cell => {
        const parentCell = cell.closest('[data-prof-id][data-day][data-time]');
        if (parentCell) {
            const key = `cell-${parentCell.dataset.day}-${parentCell.dataset.profId}-${parentCell.dataset.time}`;
            const content = cell.innerHTML;
            window.temporaryTextContent[key] = content;
            console.log(`💾 DEBUG: Salvando conteúdo de célula para ${key}:`, content);
        }
    });
    
    // Salva textareas (sistema novo)
    editableTextareas.forEach(textarea => {
        const parentCell = textarea.closest('[data-group-id]');
        if (parentCell) {
            const groupId = parentCell.dataset.groupId;
            const key = `textarea-${groupId}`;
            const content = textarea.value;
            window.temporaryTextContent[key] = content;
            console.log(`💾 DEBUG: Salvando conteúdo de textarea para ${key}:`, content);
        }
    });
    
    console.log('📦 DEBUG: Conteúdo temporário total:', window.temporaryTextContent);
}

function restoreEditableContent() {
    // Restaura o conteúdo das caixas de texto editáveis
    console.log('🔄 DEBUG: Restaurando conteúdo editável. Itens para restaurar:', Object.keys(window.temporaryTextContent));
    
    Object.keys(window.temporaryTextContent).forEach(key => {
        const content = window.temporaryTextContent[key];
        
        if (key.startsWith('cell-')) {
            // Restaura células contentEditable (sistema antigo)
            const [, day, profId, time] = key.split('-');
            const cell = document.querySelector(`[data-day="${day}"][data-prof-id="${profId}"][data-time="${time}"] .spreadsheet-cell-content`);
            
            console.log(`🔍 DEBUG: Buscando célula para ${key}:`, cell);
            
            if (cell) {
                const wasEditable = cell.contentEditable === 'true';
                cell.innerHTML = content;
                console.log(`✅ DEBUG: Restaurado conteúdo de célula para ${key} (editável: ${wasEditable}):`, content);
                
                // Se a célula estava editável, mantém editável
                if (wasEditable) {
                    cell.contentEditable = 'true';
                    cell.focus({ preventScroll: true });
                }
            } else {
                console.log(`❌ DEBUG: Célula não encontrada para ${key}`);
            }
        } else if (key.startsWith('textarea-')) {
            // Restaura textareas (sistema novo)
            const groupId = key.replace('textarea-', '');
            const textarea = document.querySelector(`[data-group-id="${groupId}"] .edit-group-content`);
            
            console.log(`🔍 DEBUG: Buscando textarea para ${key}:`, textarea);
            
            if (textarea) {
                textarea.value = content;
                console.log(`✅ DEBUG: Restaurado conteúdo de textarea para ${key}:`, content);
                // Mantém o foco na textarea
                textarea.focus({ preventScroll: true });
            } else {
                console.log(`❌ DEBUG: Textarea não encontrada para ${key}`);
            }
        }
    });
    
    // Limpa o armazenamento temporário
    window.temporaryTextContent = {};
    console.log('🧹 DEBUG: Armazenamento temporário limpo');
}

function removeProfessionalFromGroupInline(day, groupId, profId, event) {
    if (!isAuthenticated) return;
    
    // Previne propagação para não triggar outros eventos
    event.stopPropagation();
    event.preventDefault();
    
    const group = scheduleData[day]?.[groupId];
    if (!group || !group.profissionais) return;
    
    const prof = masterProfessionals.find(p => p.id === profId);
    if (!prof) return;
    
    if (!confirm(`Tem certeza que deseja remover ${prof.nome} deste grupo?`)) {
        return;
    }
    
    // Salva o conteúdo editável antes da operação
    saveCurrentEditableContent();
    
    const index = group.profissionais.indexOf(profId);
    if (index !== -1) {
        group.profissionais.splice(index, 1);
        
        // Salva no Firebase
        saveScheduleData().then(() => {
            console.log('✅ Profissional removido do grupo (inline)');
            // Atualiza apenas a seção específica ao invés de recarregar toda a grade
            updateCellProfessionalsDisplay(day, groupId);
            // Restaura o conteúdo editável
            setTimeout(() => restoreEditableContent(), 50);
        }).catch(error => {
            console.error('❌ Erro ao remover profissional:', error);
            alert('Erro ao remover profissional. Tente novamente.');
            // Restaura o profissional
            group.profissionais.splice(index, 0, profId);
            // Restaura o conteúdo editável mesmo em caso de erro
            setTimeout(() => restoreEditableContent(), 50);
        });
    }
}

function openAddProfessionalInline(day, groupId, event) {
    if (!isAuthenticated) return;
    
    // Previne propagação para não triggar outros eventos
    event.stopPropagation();
    event.preventDefault();
    
    console.log('➕ DEBUG: openAddProfessionalInline chamada');
    
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    // Cria uma lista de profissionais disponíveis
    const availableProfessionals = masterProfessionals.filter(prof => 
        !group.profissionais?.includes(prof.id) && 
        !isProfessionalOnDayOff(prof.id, day)
    );
    
    if (availableProfessionals.length === 0) {
        alert('Não há profissionais disponíveis para adicionar neste horário.');
        return;
    }
    
    // Salva o conteúdo editável antes da operação
    saveCurrentEditableContent();
    
    // Cria um select temporário SEM onchange inline
    const select = document.createElement('select');
    select.id = 'tempProfSelect';
    
    // Adiciona opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecione um profissional...';
    select.appendChild(defaultOption);
    
    // Adiciona profissionais disponíveis
    availableProfessionals.forEach(prof => {
        const option = document.createElement('option');
        option.value = prof.id;
        option.textContent = `${prof.nome} (${prof.categoria})`;
        select.appendChild(option);
    });
    
    // Encontra o botão que foi clicado e substitui
    const button = event.target;
    const originalHTML = button.outerHTML;
    button.parentNode.replaceChild(select, button);
    
    // Event listener seguro para o select
    select.addEventListener('change', function() {
        const profId = this.value;
        if (profId) {
            console.log('🔄 DEBUG: Profissional selecionado:', profId);
            addProfessionalInlineSafe(day, groupId, profId, originalHTML);
        }
    });
    
    // Foca no select
    select.focus({ preventScroll: true });
    
    // Restaura o botão se o usuário sair sem selecionar
    select.addEventListener('blur', function() {
        if (!this.value) {
            console.log('❌ DEBUG: Cancelando adição de profissional');
            this.outerHTML = originalHTML;
            // Restaura o conteúdo editável se cancelou
            setTimeout(() => restoreEditableContent(), 50);
        }
    });
}

function addProfessionalInline(day, groupId, profId) {
    // Esta função é mantida para compatibilidade, mas agora redireciona para a versão segura
    console.log('⚠️ DEBUG: addProfessionalInline (antiga) chamada. Redirecionando...');
    addProfessionalInlineSafe(day, groupId, profId, null);
}

function addProfessionalInlineSafe(day, groupId, profId, originalButtonHTML) {
    if (!profId || !isAuthenticated) return;
    
    console.log('✅ DEBUG: addProfessionalInlineSafe chamada com:', {day, groupId, profId});
    
    const group = scheduleData[day]?.[groupId];
    if (!group) return;
    
    const prof = masterProfessionals.find(p => p.id == profId);
    if (!prof) return;
    
    // Verifica conflito
    if (checkProfessionalTimeConflict(profId, day, group.horario)) {
        if (!confirm(`${prof.nome} já está ocupado(a) na ${dayNames[day]} às ${group.horario}. Deseja adicionar mesmo assim?`)) {
            // Restaura o botão original
            const select = document.getElementById('tempProfSelect');
            if (select && originalButtonHTML) {
                select.outerHTML = originalButtonHTML;
            }
            // Restaura o conteúdo editável se cancelou
            setTimeout(() => restoreEditableContent(), 50);
            return;
        }
    }
    
    if (!group.profissionais) group.profissionais = [];
    if (!group.profissionais.includes(parseInt(profId))) {
        group.profissionais.push(parseInt(profId));
        
        console.log('💾 DEBUG: Salvando no Firebase...');
        
        // Salva no Firebase
        saveScheduleData().then(() => {
            console.log('✅ DEBUG: Profissional adicionado ao grupo (inline safe)');
            
            // Remove o select e restaura o botão com o novo profissional
            const select = document.getElementById('tempProfSelect');
            if (select) {
                // Cria um novo botão ➕ diretamente no DOM
                const newButton = document.createElement('button');
                newButton.className = 'btn-add-prof-inline';
                newButton.title = 'Adicionar profissional';
                newButton.textContent = '➕';
                newButton.onclick = function(event) {
                    openAddProfessionalInline(day, groupId, event);
                };
                
                select.parentNode.replaceChild(newButton, select);
            }
            
            // Atualiza apenas a seção específica ao invés de recarregar toda a grade
            updateCellProfessionalsDisplaySafe(day, groupId);
            
            // Restaura o conteúdo editável
            setTimeout(() => restoreEditableContent(), 50);
            
        }).catch(error => {
            console.error('❌ DEBUG: Erro ao adicionar profissional:', error);
            alert('Erro ao adicionar profissional. Tente novamente.');
            // Remove o profissional que foi adicionado
            const index = group.profissionais.indexOf(parseInt(profId));
            if (index !== -1) {
                group.profissionais.splice(index, 1);
            }
            // Restaura o conteúdo editável mesmo em caso de erro
            setTimeout(() => restoreEditableContent(), 50);
        });
    }
}

function updateCellProfessionalsDisplay(day, groupId) {
    console.log('⚠️ DEBUG: updateCellProfessionalsDisplay (antiga) chamada. Redirecionando...');
    updateCellProfessionalsDisplaySafe(day, groupId);
}

function updateCellProfessionalsDisplaySafe(day, groupId) {
    console.log('🔄 DEBUG: updateCellProfessionalsDisplaySafe chamada para:', {day, groupId});
    
    // Encontra especificamente as células que contêm este grupo
    const allCells = document.querySelectorAll('[data-day]');
    
    allCells.forEach(cell => {
        if (cell.dataset.day !== day) return;
        
        // Procura por elementos que referenciam este groupId específico
        const profListElements = cell.querySelectorAll('.cell-professionals-list');
        const manageButtons = cell.querySelectorAll(`[onclick*="'${groupId}'"]`);
        
        // Se esta célula contém referências a este grupo, atualiza apenas a lista de profissionais
        if (profListElements.length > 0 || manageButtons.length > 0) {
            const profListElement = cell.querySelector('.cell-professionals-list');
            if (!profListElement) return;
            
            console.log('📝 DEBUG: Atualizando lista de profissionais para célula');
            
            // Limpa a lista atual
            profListElement.innerHTML = '';
            
            // Reconstrói apenas a lista de profissionais usando DOM manipulation (não innerHTML)
            const group = scheduleData[day]?.[groupId];
            if (group && group.profissionais && !group.ocultarProfissionais) {
                
                group.profissionais.forEach(profId => {
                    const prof = masterProfessionals.find(p => p.id === profId);
                    if (prof) {
                        // Cria elemento do profissional
                        const profDiv = document.createElement('div');
                        profDiv.className = 'professional-item-inline';
                        
                        const profSpan = document.createElement('span');
                        profSpan.className = 'prof-name';
                        profSpan.textContent = `👨‍⚕️ ${prof.nome}`;
                        
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'btn-remove-prof-inline';
                        removeBtn.title = 'Remover profissional';
                        removeBtn.textContent = '❌';
                        removeBtn.onclick = function(event) {
                            removeProfessionalFromGroupInline(day, groupId, profId, event);
                        };
                        
                        profDiv.appendChild(profSpan);
                        profDiv.appendChild(removeBtn);
                        profListElement.appendChild(profDiv);
                    }
                });
            }
            
            // Adiciona botão para adicionar profissional usando DOM manipulation
            const addBtn = document.createElement('button');
            addBtn.className = 'btn-add-prof-inline';
            addBtn.title = 'Adicionar profissional';
            addBtn.textContent = '➕';
            addBtn.onclick = function(event) {
                openAddProfessionalInline(day, groupId, event);
            };
            
            profListElement.appendChild(addBtn);
            
            console.log('✅ DEBUG: Lista de profissionais atualizada');
        }
    });
}