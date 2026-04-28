const API_URL = 'https://script.google.com/macros/s/AKfycbzfHo0Kgsj9hz4n5ShURku2YUV4LkH2TvTzsNgLn8eEwy6jpRGrnY8FJEYqKYAzXP6hfw/exec';

document.addEventListener('DOMContentLoaded', () => {
    // Definir data/hora atual por padrão no carregamento
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('dateTime').value = now.toISOString().slice(0, 16);

    // Se tiver URL configurada, carrega. Senão, avisa.
    if (API_URL === 'COLE_AQUI_A_URL_DO_SEU_GOOGLE_APPS_SCRIPT') {
        const tbody = document.getElementById('infractionsTableBody');
        const emptyState = document.getElementById('emptyState');
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyState.innerHTML = `
            <p class="text-base font-medium text-amber-600 mb-2">⚠️ Integração Google Sheets pendente</p>
            <p class="text-sm mt-1 text-center text-slate-500 max-w-sm">
                O aplicativo está pronto, mas aguarda a URL do seu Google Apps Script. 
                Siga as instruções para gerar a URL e cole-a no arquivo app.js!
            </p>`;
    } else {
        loadInfractions();
    }

    // Evento de Envio do Formulário
    document.getElementById('infractionForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (API_URL === 'COLE_AQUI_A_URL_DO_SEU_GOOGLE_APPS_SCRIPT') {
            alert("Por favor, configure sua URL do Google Sheets no início do arquivo app.js antes de salvar!");
            return;
        }
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = 'Salvando na Tabela...';
        submitBtn.disabled = true;

        const payload = {
            studentName: document.getElementById('studentName').value,
            classYear: document.getElementById('classYear').value,
            dateTime: document.getElementById('dateTime').value,
            severity: document.getElementById('severity').value,
            infractionType: document.getElementById('infractionType').value,
            description: document.getElementById('description').value,
            actionTaken: document.getElementById('actionTaken').value
        };

        try {
            // Enviamos como POST, usamos text/plain para não sofrer bloqueio de CORS do Google
            const res = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const result = await res.json();

            if (result.status === 'success') {
                // Limpar campos
                document.getElementById('studentName').value = '';
                document.getElementById('severity').value = '';
                document.getElementById('infractionType').value = '';
                document.getElementById('description').value = '';
                document.getElementById('actionTaken').value = '';
                
                await loadInfractions();
                
                submitBtn.innerHTML = '✅ Salvo com sucesso!';
                submitBtn.classList.remove('bg-blue-700');
                submitBtn.classList.add('bg-emerald-600');
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.classList.add('bg-blue-700');
                    submitBtn.classList.remove('bg-emerald-600');
                    submitBtn.disabled = false;
                }, 3000);
            } else {
                alert('Erro na integração do Google Sheets: ' + (result.message || 'Erro desconhecido'));
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('Falha na conexão de internet ou CORS bloqueado.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Filtros
    document.getElementById('searchName').addEventListener('input', renderTable);
    document.getElementById('filterClass').addEventListener('change', renderTable);
    document.getElementById('filterSeverity').addEventListener('change', renderTable);
    document.getElementById('exportBtn').addEventListener('click', exportCSV);
});

let allInfractions = [];

// Buscar infrações da Planilha
async function loadInfractions() {
    try {
        const res = await fetch(API_URL);
        allInfractions = await res.json();
        
        // Reverter a ordem (Google Sheets joga o último no final)
        allInfractions.reverse();

        populateClassFilter();
        renderTable();
    } catch (error) {
        console.error('Erro ao buscar dados do Google Sheets:', error);
    }
}

function populateClassFilter() {
    const classSelect = document.getElementById('filterClass');
    const currentVal = classSelect.value;
    
    const uniqueClasses = [...new Set(allInfractions.map(item => item.classYear.trim()))]
        .filter(c => c !== '')
        .sort();
    
    classSelect.innerHTML = '<option value="">Todas as Turmas / Anos</option>';
    uniqueClasses.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        classSelect.appendChild(option);
    });
    
    if (uniqueClasses.includes(currentVal)) {
        classSelect.value = currentVal;
    }
}

function getFilteredData() {
    const searchInput = document.getElementById('searchName').value.toLowerCase();
    const classFilter = document.getElementById('filterClass').value;
    const severityFilter = document.getElementById('filterSeverity').value;

    return allInfractions.filter(item => {
        const matchName = item.studentName.toLowerCase().includes(searchInput);
        const matchClass = classFilter ? item.classYear.trim() === classFilter : true;
        const matchSeverity = severityFilter ? item.severity === severityFilter : true;
        return matchName && matchClass && matchSeverity;
    });
}

function renderTable() {
    const tbody = document.getElementById('infractionsTableBody');
    const emptyState = document.getElementById('emptyState');
    const filteredData = getFilteredData();
    
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tbody.parentElement.classList.add('hidden');
        emptyState.classList.remove('hidden');
        // Reset message in case it was the warning API message
        if (API_URL !== 'COLE_AQUI_A_URL_DO_SEU_GOOGLE_APPS_SCRIPT') {
            emptyState.innerHTML = `
            <svg class="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <p class="text-base font-medium text-slate-600">Nenhum registro encontrado</p>
            <p class="text-sm mt-1 text-center">Nenhuma infração corresponde aos filtros de busca ou nada foi cadastrado ainda.</p>
            `;
        }
        return;
    }

    tbody.parentElement.classList.remove('hidden');
    emptyState.classList.add('hidden');

    filteredData.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        
        let dateObjStr = item.dateTime;
        let formattedDate = '';
        let formattedTime = '';

        try {
            const dateObj = new Date(item.dateTime);
            formattedDate = dateObj.toLocaleDateString('pt-BR');
            formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' hs';
        } catch {
            formattedDate = dateObjStr;
        }

        let severityBadge = '';
        if (item.severity === 'Leve') {
            severityBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 Leve</span>';
        } else if (item.severity === 'Média') {
            severityBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">🟡 Média</span>';
        } else {
            severityBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">🔴 Grave</span>';
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-slate-900">${formattedDate}</div>
                <div class="text-sm text-slate-500">${formattedTime}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm border-b border-transparent font-semibold text-slate-900 whitespace-nowrap">${item.studentName}</div>
                <div class="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded inline-block mt-1">${item.classYear}</div>
            </td>
            <td class="px-6 py-4">
                <div class="mb-1">${severityBadge}</div>
                <div class="text-sm font-medium text-slate-700">${item.infractionType}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-slate-800 font-medium">${item.actionTaken || '-'}</div>
                ${item.description ? `<div class="text-xs text-slate-500 mt-1 line-clamp-2 max-w-xs" title="${item.description}">${item.description}</div>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function exportCSV() {
    const data = getFilteredData();
    if (data.length === 0) {
        alert('Não há dados visíveis para exportar.');
        return;
    }

    let csvContent = "Id,Data e Hora,Nome do Aluno,Turma / Ano,Nível de Gravidade,Tipo de Infração,Descrição,Ação Tomada\n";
    data.forEach(item => {
        let formattedDateTime = item.dateTime;
        try { formattedDateTime = new Date(item.dateTime).toLocaleString('pt-BR'); } catch(e) {}
        
        const row = [
            item.id,
            `"${formattedDateTime}"`,
            `"${item.studentName.replace(/"/g, '""')}"`,
            `"${item.classYear.replace(/"/g, '""')}"`,
            `"${item.severity}"`,
            `"${item.infractionType}"`,
            `"${(item.description || '').replace(/"/g, '""')}"`,
            `"${(item.actionTaken || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    
    const strData = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `infracoes_escolares_${strData}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
