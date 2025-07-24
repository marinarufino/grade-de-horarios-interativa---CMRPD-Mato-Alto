
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
    const { day } = currentModalContext;
    
    const numeroGrupo = document.getElementById('newGroupNumber').value.trim();
    const categoria = document.getElementById('newGroupCategory').value;
    const horario = document.getElementById('newGroupTime').value;
    
    // *** REMOVIDA A VALIDAÇÃO OBRIGATÓRIA DO NÚMERO ***
    // Agora o número é opcional
    
    if (!categoria) {
        alert('Por favor, selecione uma categoria');
        return;
    }
    
    // Verifica se já existe um grupo com esse número no mesmo dia (apenas se número foi informado)
    if (numeroGrupo) {
        const existingGroup = Object.values(scheduleData[day] || {}).find(group => 
            group.numeroGrupo === numeroGrupo
        );
        
        if (existingGroup) {
            alert(`Já existe um grupo com o número "${numeroGrupo}" na ${dayNames[day]}`);
            return;
        }
    }
    
    // Cria novo ID único para o grupo
    const newGroupId = Date.now();
    
    // Armazena o ID do grupo recém-criado
    lastCreatedGroupId = newGroupId;
    
    // Inicializa o dia se não existir
    if (!scheduleData[day]) {
        scheduleData[day] = {};
    }
    
    // Cria o novo grupo
    scheduleData[day][newGroupId] = {
        numeroGrupo: numeroGrupo || "", // *** PERMITE NÚMERO VAZIO ***
        horario: horario,
        categoria: categoria,
        usuarios: [],
        profissionais: [],
        createdAt: Date.now()
    };
    
    // Salva no Firebase
    saveScheduleData().then(() => {
        console.log('✅ Novo grupo criado e salvo no Firebase');
        renderGroupsForDay(day);
        updateDashboard();
        closeModal('createGroupModal');
        
        // *** MENSAGEM ADAPTADA ***
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

function closeModal(id) {
    document.getElementById(id).style.display = "none";
    currentModalContext = {};
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
            updateDashboard();
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
            updateDashboard();
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
            updateDashboard();
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
            updateDashboard();
            
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


function updateGradeView() {
    const selectedCategory = document.getElementById('categoryFilter').value;
    const selectedWeekday = document.getElementById('gradeWeekdayFilter').value;
    const gradeContent = document.getElementById('grade-content');

    console.log('Filtros selecionados:', { selectedCategory, selectedWeekday });

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
            <td class="time-column" data-label="Horário">${timeSlot}</td>
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
                
                html += `<div class="${activityClass}" data-activity-index="${index}">`;
                
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
            
            const profissionais = (group.profissionais || [])
                .map(profId => masterProfessionals.find(prof => prof.id === profId))
                .filter(prof => prof)
                .map(prof => prof.nome);
                
            const usuarios = (group.usuarios || []).map(user => user.nome);
            
            activities.push({
    groupId: groupId,
    numeroGrupo: group.numeroGrupo, 
    categoria: group.categoria,
    profissionais: profissionais,
    usuarios: usuarios
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

            gridHTML += `<td class="${cellClass}">`;
            if (activities.length > 0) {
                activities.forEach(activity => {
                    let activityClass = 'activity-item';
                    if (activity.groupCategory === 'EVOLUÇÃO') {
                        activityClass += ' evolucao';
                    } else if (activity.groupCategory === 'REUNIÃO GAIA') {
                        } else if (activity.groupCategory === 'GAIA') {
                     activityClass += ' gaia';
                        
                        activityClass += ' reuniao-gaia';
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
                const cellClass = activities.length > 0 ? 'occupied-cell' : 'empty-cell';
                gridHTML += `<td class="${cellClass}">`;
                if (activities.length > 0) {
                    activities.forEach(activity => {
                        let activityClass = 'activity-item';
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

                                if (activity.allProfessionals && activity.allProfessionals.length > 1) {
                                    gridHTML += `<div class="activity-professionals">👨‍⚕️ Profissionais: ${activity.allProfessionals.join(' - ')}</div>`;
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
                            
                            if (activity.allProfessionals && activity.allProfessionals.length > 1) {
                                gridHTML += `<div class="activity-professionals">👨‍⚕️ Profissionais: ${activity.allProfessionals.join(' - ')}</div>`;
                            }
                            
                            gridHTML += `</div>`;
                        }
                    });
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

const allProfessionals = (group.profissionais || [])
    .map(profId => masterProfessionals.find(prof => prof.id === profId))
    .filter(prof => prof)
    .map(prof => prof.nome);
    
activities.push({
    groupId: groupId,
    numeroGrupo: group.numeroGrupo,
    groupCategory: group.categoria || 'Sem categoria',
    userNames: userNames,
    allProfessionals: allProfessionals
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
    if (e.target === document.getElementById("createGroupModal")) closeModal("createGroupModal");
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
            if (!isAuthenticated && ['dashboards-relatorios', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'profissionais'].includes(clickedDay)) {
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
        updateDashboard();
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
        updateDashboard();
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
            updateDashboard();
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
            
            updateDashboard();
            closeModal('manageDaysOffModal');
            alert(`Folgas atualizadas para ${prof.nome}!`);
            
        }).catch(error => {
            console.error('❌ Erro ao salvar folgas:', error);
            alert('Erro ao salvar folgas. Tente novamente.');
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
        updateDashboard();
        
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
    
    updateDashboard();
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
    
    updateDashboard();
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


// dashboards e relatorios

function updateDashboard() {
    if (!scheduleData || typeof scheduleData !== 'object') {
        console.warn('⚠️ scheduleData não está definido');
        return;
    }
    
    let totalUsuarios = 0;
    let totalProfissionaisUnicos = new Set();
    let gruposComAtividade = 0;
    let totalCapacidade = 0;
    let ocupacaoTotal = 0;
    
    days.forEach(day => {
        if (!scheduleData[day]) return;
        
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (!group) return;
            
            // Conta usuários
            if (group.usuarios && Array.isArray(group.usuarios)) {
                totalUsuarios += group.usuarios.length;
            }
            
            // Conta profissionais
            if (group.profissionais && Array.isArray(group.profissionais)) {
                group.profissionais.forEach(id => {
                    if (id !== null && id !== undefined) {
                        totalProfissionaisUnicos.add(id);
                    }
                });
            }
            
            // Conta grupos com atividade
            const hasUsers = group.usuarios && group.usuarios.length > 0;
            const hasProfs = group.profissionais && group.profissionais.length > 0;
            
            if (hasUsers || hasProfs) {
                gruposComAtividade++;
            }
            
            // Calcula ocupação
            totalCapacidade += 10;
            const userCount = group.usuarios ? group.usuarios.length : 0;
            const profCount = group.profissionais ? group.profissionais.length : 0;
            ocupacaoTotal += userCount + profCount;
        });
    });
    
    const ocupacaoMedia = totalCapacidade > 0 ? Math.round((ocupacaoTotal / totalCapacidade) * 100) : 0;
    
    // Atualiza elementos da interface
    const elements = {
        totalUsuarios: document.getElementById('totalUsuarios'),
        totalProfissionais: document.getElementById('totalProfissionais'),
        gruposAtivos: document.getElementById('gruposAtivos'),
        ocupacaoMedia: document.getElementById('ocupacaoMedia')
    };
    
    if (elements.totalUsuarios) elements.totalUsuarios.textContent = totalUsuarios;
    if (elements.totalProfissionais) elements.totalProfissionais.textContent = totalProfissionaisUnicos.size;
    if (elements.gruposAtivos) elements.gruposAtivos.textContent = gruposComAtividade;
    if (elements.ocupacaoMedia) elements.ocupacaoMedia.textContent = ocupacaoMedia + '%';
    
    updateAlertas();
}

function updateAlertas() {
    const container = document.getElementById('alertas');
    if (!container) return;
    
    let alertas = [];
    
    days.forEach(day => {
        if (!scheduleData[day]) return;
        
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (!group) return;
            
            const userCount = group.usuarios ? group.usuarios.length : 0;
            const profCount = group.profissionais ? group.profissionais.length : 0;
            const ocupacao = userCount + profCount;
            
            if (ocupacao >= 10) {
                const displayName = isSpecificActivity(group.categoria) 
                    ? group.categoria 
                    : `Grupo ${groupId}`;
                alertas.push(`⚠️ ${displayName} (${dayNames[day]}) está com capacidade máxima`);
            }
        });
    });
    
    // Verifica profissionais sem grupos
    const profissionaisAtivos = new Set();
    days.forEach(day => {
        if (!scheduleData[day]) return;
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (group && group.profissionais) {
                group.profissionais.forEach(id => profissionaisAtivos.add(id));
            }
        });
    });
    
    masterProfessionals.forEach(prof => {
        if (!profissionaisAtivos.has(prof.id)) {
            alertas.push(`ℹ️ ${prof.nome} não está alocado em nenhum grupo`);
        }
    });
    
    container.innerHTML = alertas.length > 0 
        ? alertas.slice(0, 5).map(a => `<p>${a}</p>`).join('') 
        : '<p>✅ Nenhum alerta no momento</p>';
}

function updateReports() {
    updateAtendimentosPorDia();
    updateHorariosMaisUtilizados();
}

function updateAtendimentosPorDia() {
    const container = document.getElementById('atendimentosPorDia');
    if (!container) return;
    
    let html = '';
    days.forEach(day => {
        let totalUsuarios = 0;
        if (scheduleData[day]) {
            Object.keys(scheduleData[day]).forEach(groupId => {
                const group = scheduleData[day][groupId];
                if (group && group.usuarios) {
                    totalUsuarios += group.usuarios.length;
                }
            });
        }
        html += `<p><strong>${dayNames[day]}:</strong> ${totalUsuarios} atendimentos</p>`;
    });
    container.innerHTML = html;
}

function updateHorariosMaisUtilizados() {
    const container = document.getElementById('horariosMaisUtilizados');
    if (!container) return;
    
    const horarioStats = {};
    days.forEach(day => {
        if (!scheduleData[day]) return;
        Object.keys(scheduleData[day]).forEach(groupId => {
            const group = scheduleData[day][groupId];
            if (group && group.usuarios && group.usuarios.length > 0) {
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
    
    if (tabName === 'dashboards-relatorios') {
        updateDashboard();
        updateReports();
    } else if (tabName === 'profissionais') {
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
    }else if (tabName === 'orientacao-parental') {
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
    const restrictedTabs = ['dashboards-relatorios', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'profissionais'];
    
    tabs.forEach(tab => {
        const day = tab.dataset.day;
        if (isAuthenticated || !restrictedTabs.includes(day)) {
            tab.style.display = 'block';
        } else {
            tab.style.display = 'none';
        }
    });
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
            <strong>${prof.nome}</strong><br>
            <span>${prof.categoria}</span>
            ${daysOffText}
        `;
        item.onclick = (e) => {
            if (!e.target.classList.contains('btn-remove-professional') && 
                !e.target.classList.contains('btn-manage-days-off')) {
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
// ORIENTAÇÃO PARENTAL - Dados em memória
let orientacaoData = {};

// Inicializa estrutura de dados da orientação parental
function initializeOrientacaoData() {
    days.forEach(day => {
        if (!orientacaoData[day]) {
            orientacaoData[day] = {};
        }
        timeSlots.forEach(timeSlot => {
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
    
    timeSlots.forEach(timeSlot => {
        html += `<tr>
            <td class="time-column">${timeSlot}</td>`;
        
        days.forEach(day => {
            const currentValue = orientacaoData[day]?.[timeSlot] || '';
            const cellClass = currentValue ? 'orientacao-cell filled' : 'orientacao-cell';
            const isDisabled = !isAuthenticated ? 'disabled' : '';
            
            html += `
                <td>
                    <input type="text" 
                           class="${cellClass}" 
                           value="${currentValue}"
                           placeholder="${isAuthenticated ? 'Clique para editar' : 'Login necessário'}"
                           onchange="updateOrientacao('${day}', '${timeSlot}', this.value)"
                           onblur="saveOrientacaoData()"
                           ${isDisabled}>
                </td>`;
        });
        
        html += `</tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// Atualiza dados da orientação parental
function updateOrientacao(day, timeSlot, value) {
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
    
    // Atualiza a classe da célula
    const cell = event.target;
    if (value.trim()) {
        cell.classList.add('filled');
    } else {
        cell.classList.remove('filled');
    }
    
    // Salva automaticamente no Firebase com debounce
    clearTimeout(window.orientacaoSaveTimeout);
    window.orientacaoSaveTimeout = setTimeout(() => {
        saveOrientacaoData();
    }, 1000); // Aguarda 1 segundo após parar de digitar
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

