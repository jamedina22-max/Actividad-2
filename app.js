const API_BASE = 'https://rickandmortyapi.com/api';

const state = {
    user: JSON.parse(localStorage.getItem('rms_user')) || null,
    theme: localStorage.getItem('rms_theme') || 'dark',
    characters: [],
    episodes: [],
    editedCharacters: JSON.parse(localStorage.getItem('rms_edited_characters')) || {},
    editedEpisodes: JSON.parse(localStorage.getItem('rms_edited_episodes')) || {},
    charSort: { column: 'id', direction: 'asc' },
    epSort: { column: 'id', direction: 'asc' },
    charSearch: '',
    epSearch: '',
    selectedChar: null,
    selectedEp: null,
    isOnline: navigator.onLine
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNetworkStatus();
    initAuth();
    initNavigation();
    initDataTables();
    initModals();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    if (state.user) {
        showApp();
    } else {
        showAuth();
    }
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcons();

    document.getElementById('theme-toggle').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('rms_theme', state.theme);
        document.documentElement.setAttribute('data-theme', state.theme);
        updateThemeIcons();
    });
}

function updateThemeIcons() {
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    if (state.theme === 'dark') {
        darkIcon.classList.remove('hidden');
        lightIcon.classList.add('hidden');
    } else {
        darkIcon.classList.add('hidden');
        lightIcon.classList.remove('hidden');
    }
}

function initNetworkStatus() {
    const updateStatus = () => {
        state.isOnline = navigator.onLine;
        const badge = document.getElementById('network-badge');
        const text = document.getElementById('net-text');
        if (state.isOnline) {
            badge.className = 'network-badge online';
            text.textContent = 'En línea';
        } else {
            badge.className = 'network-badge offline';
            text.textContent = 'Modo Offline';
            showToast('Conexión perdida. Operando en modo sin conexión.', 'warning');
        }
    };

    window.addEventListener('online', () => {
        updateStatus();
        showToast('Conexión restablecida.', 'success');
        loadAllData();
    });
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

function initAuth() {
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const formRecover = document.getElementById('form-recover');

    const linkRecover = document.getElementById('link-to-recover');
    const linkRegister = document.getElementById('link-to-register');
    const linkRegLogin = document.getElementById('link-reg-to-login');
    const linkRecLogin = document.getElementById('link-rec-to-login');

    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');

    const switchAuthForm = (activeForm, titleText, subText) => {
        [formLogin, formRegister, formRecover].forEach(f => f.classList.remove('active'));
        activeForm.classList.add('active');
        title.textContent = titleText;
        subtitle.textContent = subText;
    };

    linkRegister.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm(formRegister, 'Crear Cuenta', 'Completa tus datos para registrarte');
    });

    linkRecover.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm(formRecover, 'Recuperar Contraseña', 'Ingresa tu correo para recibir instrucciones');
    });

    linkRegLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm(formLogin, 'Iniciar Sesión', 'Ingresa tus credenciales para acceder al sistema');
    });

    linkRecLogin.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm(formLogin, 'Iniciar Sesión', 'Ingresa tus credenciales para acceder al sistema');
    });

    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();

        const users = JSON.parse(localStorage.getItem('rms_registered_users')) || [
            { email: 'admin@ejemplo.com', password: '123456', name: 'Administrador' }
        ];

        const user = users.find(u => u.email === email && u.password === password);
        if (user || (email && password.length >= 4)) {
            const sessionUser = user || { email, name: email.split('@')[0] };
            state.user = sessionUser;
            localStorage.setItem('rms_user', JSON.stringify(sessionUser));
            showToast(`¡Bienvenido de nuevo, ${sessionUser.name}!`);
            showApp();
        } else {
            showToast('Credenciales inválidas.', 'error');
        }
    });

    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value.trim();

        const users = JSON.parse(localStorage.getItem('rms_registered_users')) || [];
        if (users.some(u => u.email === email)) {
            showToast('El correo ya se encuentra registrado.', 'error');
            return;
        }

        const newUser = { name, email, password };
        users.push(newUser);
        localStorage.setItem('rms_registered_users', JSON.stringify(users));

        state.user = newUser;
        localStorage.setItem('rms_user', JSON.stringify(newUser));
        showToast('Registro exitoso. Sesión iniciada automáticamente.');
        showApp();
    });

    formRecover.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('recover-email').value.trim();
        showToast(`Se han enviado las instrucciones de recuperación a ${email}.`, 'success');
        switchAuthForm(formLogin, 'Iniciar Sesión', 'Ingresa tus credenciales para acceder al sistema');
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        state.user = null;
        localStorage.removeItem('rms_user');
        showToast('Sesión cerrada correctamente.');
        showAuth();
    });
}

function showAuth() {
    document.getElementById('auth-view').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('user-display-name').textContent = state.user.name || state.user.email;
    loadAllData();
}

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.view-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            navButtons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

async function loadAllData() {
    await Promise.all([fetchCharacters(), fetchEpisodes()]);
}

async function fetchCharacters() {
    const cached = localStorage.getItem('rms_cache_characters');
    if (cached) {
        state.characters = JSON.parse(cached);
        renderCharacters();
    }

    if (navigator.onLine) {
        try {
            const response = await fetch(`${API_BASE}/character`);
            if (response.ok) {
                const data = await response.json();
                state.characters = data.results;
                localStorage.setItem('rms_cache_characters', JSON.stringify(data.results));
                renderCharacters();
            }
        } catch (err) {
            if (!cached) {
                showToast('Error al conectar con la API de Rick & Morty', 'error');
            }
        }
    }
}

async function fetchEpisodes() {
    const cached = localStorage.getItem('rms_cache_episodes');
    if (cached) {
        state.episodes = JSON.parse(cached);
        renderEpisodes();
    }

    if (navigator.onLine) {
        try {
            const response = await fetch(`${API_BASE}/episode`);
            if (response.ok) {
                const data = await response.json();
                state.episodes = data.results;
                localStorage.setItem('rms_cache_episodes', JSON.stringify(data.results));
                renderEpisodes();
            }
        } catch (err) {
            if (!cached) {
                showToast('Error al obtener episodios', 'error');
            }
        }
    }
}

function initDataTables() {
    const searchChar = document.getElementById('search-characters');
    searchChar.addEventListener('input', (e) => {
        state.charSearch = e.target.value.toLowerCase().trim();
        renderCharacters();
    });

    const searchEp = document.getElementById('search-episodes');
    searchEp.addEventListener('input', (e) => {
        state.epSearch = e.target.value.toLowerCase().trim();
        renderEpisodes();
    });

    document.querySelectorAll('#table-characters th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (state.charSort.column === col) {
                state.charSort.direction = state.charSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.charSort.column = col;
                state.charSort.direction = 'asc';
            }
            renderCharacters();
        });
    });

    document.querySelectorAll('#table-episodes th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.getAttribute('data-sort');
            if (state.epSort.column === col) {
                state.epSort.direction = state.epSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.epSort.column = col;
                state.epSort.direction = 'asc';
            }
            renderEpisodes();
        });
    });
}

function getProcessedCharacters() {
    let list = state.characters.map(c => {
        if (state.editedCharacters[c.id]) {
            return { ...c, ...state.editedCharacters[c.id] };
        }
        return c;
    });

    if (state.charSearch) {
        list = list.filter(c => c.name.toLowerCase().includes(state.charSearch));
    }

    const { column, direction } = state.charSort;
    list.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';

        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return list;
}

function renderCharacters() {
    const tbody = document.getElementById('tbody-characters');
    const items = getProcessedCharacters();
    document.getElementById('char-total-count').textContent = items.length;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No se encontraron personajes.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(c => `
        <tr>
            <td>#${c.id}</td>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.species)}</td>
            <td>${escapeHtml(c.gender)}</td>
            <td>${c.type ? escapeHtml(c.type) : '<span style="color: var(--text-muted);">-</span>'}</td>
            <td class="text-right">
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="openCharacterDetail(${c.id})">Ver</button>
                    <button class="btn btn-primary btn-sm" onclick="openCharacterEdit(${c.id})">Editar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getProcessedEpisodes() {
    let list = state.episodes.map(e => {
        if (state.editedEpisodes[e.id]) {
            return { ...e, ...state.editedEpisodes[e.id] };
        }
        return e;
    });

    if (state.epSearch) {
        list = list.filter(e => e.name.toLowerCase().includes(state.epSearch));
    }

    const { column, direction } = state.epSort;
    list.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';

        if (typeof valA === 'number' && typeof valB === 'number') {
            return direction === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return list;
}

function renderEpisodes() {
    const tbody = document.getElementById('tbody-episodes');
    const items = getProcessedEpisodes();
    document.getElementById('ep-total-count').textContent = items.length;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No se encontraron episodios.</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(e => `
        <tr>
            <td>#${e.id}</td>
            <td><strong>${escapeHtml(e.name)}</strong></td>
            <td>${escapeHtml(e.air_date)}</td>
            <td><span class="badge">${escapeHtml(e.episode)}</span></td>
            <td class="text-right">
                <div class="action-buttons">
                    <button class="btn btn-secondary btn-sm" onclick="openEpisodeDetail(${e.id})">Ficha</button>
                    <button class="btn btn-primary btn-sm" onclick="openEpisodeEdit(${e.id})">Editar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function initModals() {
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetModalId = btn.getAttribute('data-close');
            document.getElementById(targetModalId).classList.add('hidden');
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.classList.add('hidden');
            }
        });
    });

    document.getElementById('form-edit-char').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-char-id').value);
        const updated = {
            name: document.getElementById('edit-char-name').value.trim(),
            species: document.getElementById('edit-char-species').value.trim(),
            gender: document.getElementById('edit-char-gender').value,
            type: document.getElementById('edit-char-type').value.trim()
        };

        state.editedCharacters[id] = {
            ...(state.editedCharacters[id] || {}),
            ...updated
        };

        localStorage.setItem('rms_edited_characters', JSON.stringify(state.editedCharacters));
        document.getElementById('modal-char-edit').classList.add('hidden');
        renderCharacters();
        showToast('Personaje actualizado correctamente.');
    });

    document.getElementById('form-edit-ep').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-ep-id').value);
        const updated = {
            name: document.getElementById('edit-ep-name').value.trim(),
            air_date: document.getElementById('edit-ep-airdate').value.trim(),
            episode: document.getElementById('edit-ep-code').value.trim()
        };

        state.editedEpisodes[id] = {
            ...(state.editedEpisodes[id] || {}),
            ...updated
        };

        localStorage.setItem('rms_edited_episodes', JSON.stringify(state.editedEpisodes));
        document.getElementById('modal-ep-edit').classList.add('hidden');
        renderEpisodes();
        showToast('Episodio actualizado correctamente.');
    });

    document.getElementById('btn-open-edit-char').addEventListener('click', () => {
        if (state.selectedChar) {
            document.getElementById('modal-char-detail').classList.add('hidden');
            openCharacterEdit(state.selectedChar.id);
        }
    });

    document.getElementById('btn-open-edit-ep').addEventListener('click', () => {
        if (state.selectedEp) {
            document.getElementById('modal-ep-detail').classList.add('hidden');
            openEpisodeEdit(state.selectedEp.id);
        }
    });
}

function openCharacterDetail(id) {
    const rawChar = state.characters.find(c => c.id === id);
    if (!rawChar) return;
    const char = { ...rawChar, ...(state.editedCharacters[id] || {}) };
    state.selectedChar = char;

    document.getElementById('detail-char-img').src = char.image || 'https://rickandmortyapi.com/api/character/avatar/1.jpeg';
    document.getElementById('detail-char-id').textContent = `#${char.id}`;
    document.getElementById('detail-char-name').textContent = char.name;

    const statusBadge = document.getElementById('detail-char-status');
    statusBadge.textContent = char.status || 'Desconocido';
    const statusLower = (char.status || '').toLowerCase();
    statusBadge.className = `badge ${statusLower === 'alive' ? 'alive' : statusLower === 'dead' ? 'dead' : 'unknown'}`;

    document.getElementById('detail-char-species').textContent = char.species || 'N/A';
    document.getElementById('detail-char-gender').textContent = char.gender || 'N/A';
    document.getElementById('detail-char-type').textContent = char.type || 'Sin especificar';
    document.getElementById('detail-char-origin').textContent = char.origin ? char.origin.name : 'Desconocido';
    document.getElementById('detail-char-location').textContent = char.location ? char.location.name : 'Desconocido';

    document.getElementById('modal-char-detail').classList.remove('hidden');
}

function openCharacterEdit(id) {
    const rawChar = state.characters.find(c => c.id === id);
    if (!rawChar) return;
    const char = { ...rawChar, ...(state.editedCharacters[id] || {}) };

    document.getElementById('edit-char-id').value = char.id;
    document.getElementById('edit-char-name').value = char.name;
    document.getElementById('edit-char-species').value = char.species;
    document.getElementById('edit-char-gender').value = char.gender;
    document.getElementById('edit-char-type').value = char.type || '';

    document.getElementById('modal-char-edit').classList.remove('hidden');
}

function openEpisodeDetail(id) {
    const rawEp = state.episodes.find(e => e.id === id);
    if (!rawEp) return;
    const ep = { ...rawEp, ...(state.editedEpisodes[id] || {}) };
    state.selectedEp = ep;

    document.getElementById('detail-ep-id').textContent = `#${ep.id}`;
    document.getElementById('detail-ep-name').textContent = ep.name;
    document.getElementById('detail-ep-airdate').textContent = ep.air_date;
    document.getElementById('detail-ep-code').textContent = ep.episode;
    document.getElementById('detail-ep-charcount').textContent = `${(ep.characters || []).length} personajes`;

    document.getElementById('modal-ep-detail').classList.remove('hidden');
}

function openEpisodeEdit(id) {
    const rawEp = state.episodes.find(e => e.id === id);
    if (!rawEp) return;
    const ep = { ...rawEp, ...(state.editedEpisodes[id] || {}) };

    document.getElementById('edit-ep-id').value = ep.id;
    document.getElementById('edit-ep-name').value = ep.name;
    document.getElementById('edit-ep-airdate').value = ep.air_date;
    document.getElementById('edit-ep-code').value = ep.episode;

    document.getElementById('modal-ep-edit').classList.remove('hidden');
}
