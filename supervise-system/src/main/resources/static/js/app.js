// ==================== 页面加载：认证检查 ====================

document.addEventListener('DOMContentLoaded', () => {
    // 认证检查：未登录 → 跳转登录页
    if (!AUTH.isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }

    // 更新顶部导航
    updateNavUser();
    // ADMIN：显示用户管理标签
    if (AUTH.isAdmin()) {
        document.getElementById('tab-admin-wrap').style.display = '';
    }

    // 标签页切换时加载数据
    document.getElementById('tab-tasks').addEventListener('shown.bs.tab', loadTasks);
    document.getElementById('tab-records').addEventListener('shown.bs.tab', loadRecords);
    document.getElementById('tab-config').addEventListener('shown.bs.tab', loadConfig);
    document.getElementById('tab-admin').addEventListener('shown.bs.tab', loadUsers);

    // 任务看板每30秒自动刷新
    setInterval(() => {
        const activeTab = document.querySelector('#mainTabs .nav-link.active');
        if (activeTab && activeTab.id === 'tab-tasks') {
            loadTasks();
        }
    }, 30000);
});

function updateNavUser() {
    const user = AUTH.getUser();
    if (!user) return;
    document.getElementById('navUsername').textContent = user.nickname || user.username;
    const roleBadge = document.getElementById('navRoleBadge');
    if (user.role === 'ADMIN') {
        roleBadge.textContent = '管理员';
        roleBadge.style.display = '';
    }
    document.getElementById('btnLogout').style.display = '';
    document.getElementById('btnLogin').style.display = 'none';
}

// ==================== 工具函数 ====================

function formatDateTime(str) {
    if (!str) return '-';
    return str.replace('T', ' ').substring(0, 19);
}

function statusBadge(status) {
    const cfg = {
        'PENDING': { text: '待发', cls: 'secondary' },
        'PROCESSING': { text: '发送中', cls: 'primary' },
        'SUCCESS': { text: '成功', cls: 'success' },
        'FAILED': { text: '失败', cls: 'danger' }
    };
    const c = cfg[status] || { text: status, cls: 'secondary' };
    return `<span class="badge bg-${c.cls}">${c.text}</span>`;
}

function triggerBadge(type) {
    const cfg = { 'ADVANCE': { text: '提前提醒', cls: 'warning' }, 'ON_TIME': { text: '开课时刻', cls: 'info' } };
    const c = cfg[type] || { text: type, cls: 'secondary' };
    return `<span class="badge bg-${c.cls}">${c.text}</span>`;
}

function roleBadge(role) {
    return role === 'ADMIN'
        ? '<span class="badge bg-warning text-dark">管理员</span>'
        : '<span class="badge bg-secondary">普通用户</span>';
}

function enabledBadge(enabled) {
    return enabled
        ? '<span class="badge bg-success">启用</span>'
        : '<span class="badge bg-secondary">禁用</span>';
}

function showToast(msg, type = 'success') {
    const div = document.createElement('div');
    div.style.cssText = `
        position:fixed; top:70px; right:20px; z-index:9999;
        padding:12px 20px; border-radius:6px; color:#fff;
        background:${type === 'success' ? '#198754' : '#dc3545'};
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
    `;
    div.textContent = msg;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

// ==================== 导入课表 ====================

async function uploadSchedule() {
    const fileInput = document.getElementById('excelFile');
    if (!fileInput.files.length) {
        showToast('请先选择Excel文件', 'error');
        return;
    }

    const btn = document.getElementById('btnUpload');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 解析中...';

    try {
        const fd = new FormData();
        fd.append('file', fileInput.files[0]);
        const resp = await authFetch('/api/schedules/import', { method: 'POST', body: fd });
        const data = await resp.json();
        if (data.code === 0) {
            showImportResult(data.data);
            showToast(`导入成功：${data.data.successCount} 条，失败 ${data.data.errorCount} 条`);
        } else {
            showToast('导入失败：' + data.message, 'error');
        }
    } catch (e) {
        showToast('请求失败：' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-upload"></i> 解析并导入';
    }
}

async function importFolder() {
    const folderPath = document.getElementById('folderPath').value.trim();
    if (!folderPath) {
        showToast('请输入文件夹路径', 'error');
        return;
    }

    const btn = document.querySelector('#mode-folder button');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 批量导入中...';

    try {
        const resp = await apiPost('/api/schedules/import-folder', { folderPath });
        if (resp.code === 0) {
            showImportResult(resp.data, true);
            showToast(`批量导入完成：共 ${resp.data.successCount} 条成功，${resp.data.errorCount} 条失败`);
        } else {
            showToast('文件夹导入失败：' + resp.message, 'error');
        }
    } catch (e) {
        showToast('请求失败：' + e.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-folder2-open"></i> 批量导入';
    }
}

function showImportResult(r, isFolderMode = false) {
    document.getElementById('resultTotal').textContent = r.totalRows;
    document.getElementById('resultSuccess').textContent = r.successCount;
    document.getElementById('resultError').textContent = r.errorCount;
    document.getElementById('resultBatch').textContent = r.batchId;
    document.getElementById('importResultCard').style.display = '';

    const fileResultsEl = document.getElementById('fileResults');
    if (isFolderMode && r.fileResults && r.fileResults.length > 0) {
        fileResultsEl.style.display = '';
        document.getElementById('fileResultsBody').innerHTML = r.fileResults.map(f =>
            `<tr>
                <td>${f.fileName}</td>
                <td>${f.totalRows}</td>
                <td class="text-success">${f.successCount}</td>
                <td class="text-danger">${f.errorCount}</td>
                <td>${f.errorMessage ? `<span class="text-danger small">${f.errorMessage}</span>` : '<span class="text-success small">正常</span>'}</td>
            </tr>`
        ).join('');
    } else {
        fileResultsEl.style.display = 'none';
    }

    if (r.errors && r.errors.length > 0) {
        document.getElementById('errorList').style.display = '';
        const tbody = document.getElementById('errorTableBody');
        tbody.innerHTML = r.errors.map((e, i) =>
            `<tr class="row-error">
                <td>${i + 1}</td>
                <td>第 ${e.rowNumber} 行</td>
                <td>${e.reason}</td>
            </tr>`
        ).join('');
    } else {
        document.getElementById('errorList').style.display = 'none';
    }
}

// ==================== 任务看板 ====================

async function loadTasks() {
    const status = document.getElementById('taskStatusFilter').value;
    const url = status ? `/api/tasks?status=${status}` : '/api/tasks';
    const tbody = document.getElementById('taskTableBody');

    try {
        const data = await apiGet(url);
        if (data.code === 0) {
            const tasks = data.data;
            if (tasks.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">暂无任务</td></tr>';
                return;
            }
            tbody.innerHTML = tasks.map((t, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${t.studentName || '-'}</td>
                    <td>${t.groupName || '-'}</td>
                    <td class="msg-cell" title="${t.courseName || ''}">${t.courseName || '-'}</td>
                    <td>${triggerBadge(t.triggerType)}</td>
                    <td><small>${formatDateTime(t.scheduledAt)}</small></td>
                    <td>${statusBadge(t.status)}</td>
                    <td>
                        ${t.status === 'PENDING' ?
                            `<button class="btn btn-xs btn-sm btn-outline-danger" onclick="cancelTask(${t.id})">取消</button>` :
                            '-'}
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">加载失败：${e.message}</td></tr>`;
    }
}

async function cancelTask(taskId) {
    if (!confirm('确认取消该任务？')) return;
    try {
        const resp = await apiPost(`/api/tasks/${taskId}/cancel`);
        if (resp.code === 0) {
            showToast('已取消任务');
            loadTasks();
        } else {
            showToast('取消失败：' + resp.message, 'error');
        }
    } catch (e) {
        showToast('取消失败：' + e.message, 'error');
    }
}

// ==================== 发送记录 ====================

async function loadRecords() {
    const status = document.getElementById('recordStatusFilter').value;
    const url = status ? `/api/records?status=${status}` : '/api/records';
    const tbody = document.getElementById('recordTableBody');

    try {
        const data = await apiGet(url);
        if (data.code === 0) {
            const records = data.data;
            if (records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">暂无记录</td></tr>';
                return;
            }
            tbody.innerHTML = records.map((r, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${r.taskId}</td>
                    <td class="msg-cell" title="${r.renderedMessage || ''}">${r.renderedMessage || '-'}</td>
                    <td>${statusBadge(r.status)}</td>
                    <td><small>${formatDateTime(r.sentAt)}</small></td>
                    <td class="text-danger small">${r.errorMessage || '-'}</td>
                    <td>
                        ${r.status === 'FAILED' ?
                            `<button class="btn btn-sm btn-warning" onclick="retryTask(${r.taskId})">
                                <i class="bi bi-arrow-repeat"></i> 重发
                            </button>` :
                            '-'}
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">加载失败：${e.message}</td></tr>`;
    }
}

async function retryTask(taskId) {
    if (!confirm('确认重新发送该任务？')) return;
    try {
        const resp = await apiPost(`/api/records/${taskId}/retry`);
        if (resp.code === 0) {
            showToast('已加入重发队列');
            loadRecords();
        } else {
            showToast('重发失败：' + resp.message, 'error');
        }
    } catch (e) {
        showToast('重发失败：' + e.message, 'error');
    }
}

// ==================== 系统配置 ====================

async function loadConfig() {
    try {
        const data = await apiGet('/api/config');
        if (data.code === 0) {
            const c = data.data;
            document.getElementById('cfgAdvanceMinutes').value = c.advanceMinutes;
            document.getElementById('cfgSendTimeout').value = c.sendTimeoutSeconds;
            document.getElementById('cfgPythonPath').value = c.pythonExecPath || 'python';
            document.getElementById('cfgScriptPath').value = c.pythonScriptPath || '';
            document.getElementById('cfgTemplate').value = c.messageTemplate || '';
        }
    } catch (e) {
        console.error('加载配置失败', e);
    }
}

async function saveConfig() {
    const dto = {
        advanceMinutes: parseInt(document.getElementById('cfgAdvanceMinutes').value),
        sendTimeoutSeconds: parseInt(document.getElementById('cfgSendTimeout').value),
        pythonExecPath: document.getElementById('cfgPythonPath').value,
        pythonScriptPath: document.getElementById('cfgScriptPath').value,
        messageTemplate: document.getElementById('cfgTemplate').value
    };
    try {
        const resp = await apiPut('/api/config', dto);
        if (resp.code === 0) {
            showToast('配置已保存');
        } else {
            showToast('保存失败：' + resp.message, 'error');
        }
    } catch (e) {
        showToast('保存失败：' + e.message, 'error');
    }
}

// ==================== 用户管理（ADMIN专用） ====================

let userModal;
document.addEventListener('DOMContentLoaded', () => {
    userModal = new bootstrap.Modal(document.getElementById('userModal'));
});

async function loadUsers() {
    const tbody = document.getElementById('userTableBody');
    try {
        const data = await apiGet('/api/admin/users');
        if (data.code === 0) {
            const users = data.data;
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">暂无用户</td></tr>';
                return;
            }
            tbody.innerHTML = users.map((u, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${u.username}</strong></td>
                    <td>${u.nickname || '-'}</td>
                    <td>${roleBadge(u.role)}</td>
                    <td>${enabledBadge(u.enabled)}</td>
                    <td><small>${formatDateTime(u.createdAt)}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${u.id})">
                            <i class="bi bi-pencil"></i> 编辑
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id}, '${u.username}')">
                            <i class="bi bi-trash"></i> 删除
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">加载失败：${e.message}</td></tr>`;
    }
}

function showCreateUserModal() {
    document.getElementById('userModalTitle').innerHTML = '<i class="bi bi-person-plus"></i> 新建用户';
    document.getElementById('editUserId').value = '';
    document.getElementById('modalUsername').value = '';
    document.getElementById('modalUsername').disabled = false;
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalNickname').value = '';
    document.getElementById('modalRole').value = 'USER';
    document.getElementById('modalEnabled').value = 'true';
    document.getElementById('modalError').style.display = 'none';
    userModal.show();
}

async function editUser(userId) {
    try {
        const data = await apiGet('/api/admin/users');
        if (data.code !== 0) return;
        const user = data.data.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('userModalTitle').innerHTML = `<i class="bi bi-pencil"></i> 编辑用户：${user.username}`;
        document.getElementById('editUserId').value = user.id;
        document.getElementById('modalUsername').value = user.username;
        document.getElementById('modalUsername').disabled = true;
        document.getElementById('modalPassword').value = '';
        document.getElementById('modalNickname').value = user.nickname || '';
        document.getElementById('modalRole').value = user.role;
        document.getElementById('modalEnabled').value = user.enabled ? 'true' : 'false';
        document.getElementById('modalError').style.display = 'none';
        userModal.show();
    } catch (e) {
        showToast('加载用户信息失败', 'error');
    }
}

async function saveUser() {
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('modalUsername').value.trim();
    const password = document.getElementById('modalPassword').value;
    const nickname = document.getElementById('modalNickname').value.trim();
    const role = document.getElementById('modalRole').value;
    const enabled = document.getElementById('modalEnabled').value === 'true';
    const errorEl = document.getElementById('modalError');

    if (!username) {
        errorEl.textContent = '用户名不能为空';
        errorEl.style.display = '';
        return;
    }
    if (!id && (!password || password.length < 6)) {
        errorEl.textContent = '密码至少6位';
        errorEl.style.display = '';
        return;
    }

    const dto = {
        username,
        password: password || undefined,
        nickname: nickname || undefined,
        role,
        enabled
    };

    try {
        let resp;
        if (id) {
            resp = await apiPut(`/api/admin/users/${id}`, dto);
        } else {
            resp = await apiPost('/api/admin/users', dto);
        }

        if (resp.code === 0) {
            showToast(id ? '用户已更新' : '用户已创建');
            userModal.hide();
            loadUsers();
        } else {
            errorEl.textContent = resp.message || '保存失败';
            errorEl.style.display = '';
        }
    } catch (e) {
        errorEl.textContent = '网络错误：' + e.message;
        errorEl.style.display = '';
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`确认删除用户「${username}」？此操作不可恢复。`)) return;
    try {
        const resp = await apiDelete(`/api/admin/users/${userId}`);
        if (resp.code === 0) {
            showToast('用户已删除');
            loadUsers();
        } else {
            showToast('删除失败：' + resp.message, 'error');
        }
    } catch (e) {
        showToast('删除失败：' + e.message, 'error');
    }
}
