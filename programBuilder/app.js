class ProgramBuilderApp {
    constructor() {
        this.projects = JSON.parse(localStorage.getItem('programBuilderProjects')) || [];
        this.activeProjectId = localStorage.getItem('programBuilderActiveId') || null;
        this.selectedFieldId = null;
        this.placementMode = null;
        this.pendingFieldType = null;
        this.saveTimeout = null;
        this.isDragging = false;
        this.dragFieldId = null;
        this.dragOffset = { x: 0, y: 0 };

        this.canvas = document.getElementById('programCanvas');
        this.canvasFields = document.getElementById('canvasFields');
        this.fieldEditors = document.getElementById('fieldEditors');
        this.emptyFieldsMsg = document.getElementById('emptyFieldsMsg');
        this.placementHint = document.getElementById('placementHint');
        this.saveStatus = document.getElementById('saveStatus');
        this.storageWarning = document.getElementById('storageWarning');

        this.init();
    }

    init() {
        if (this.projects.length === 0) {
            const project = this.createBlankProject('Untitled Program');
            this.projects.push(project);
            this.activeProjectId = project.id;
        } else if (!this.activeProjectId || !this.projects.find(p => p.id === this.activeProjectId)) {
            this.activeProjectId = this.projects[0].id;
        }

        this.bindEvents();
        this.renderProjectSelect();
        this.render();
        this.checkStorageSize();
    }

    createBlankProject(name) {
        return {
            id: crypto.randomUUID(),
            name,
            updatedAt: new Date().toISOString(),
            pages: [{
                id: crypto.randomUUID(),
                pageLetter: 'A',
                fields: []
            }]
        };
    }

    getActiveProject() {
        return this.projects.find(p => p.id === this.activeProjectId);
    }

    getCurrentPage() {
        const project = this.getActiveProject();
        return project ? project.pages[0] : null;
    }

    getAllFields(project) {
        return project.pages.flatMap(page => page.fields);
    }

    getNextGlobalOrder(project) {
        const fields = this.getAllFields(project);
        if (fields.length === 0) return 1;
        return Math.max(...fields.map(f => f.globalOrder)) + 1;
    }

    getPageLetter(pageIndex) {
        return String.fromCharCode(65 + pageIndex);
    }

    bindEvents() {
        document.getElementById('projectSelect').addEventListener('change', (e) => {
            this.activeProjectId = e.target.value;
            localStorage.setItem('programBuilderActiveId', this.activeProjectId);
            this.selectedFieldId = null;
            this.cancelPlacement();
            this.render();
        });

        document.getElementById('newProjectBtn').addEventListener('click', () => {
            const project = this.createBlankProject('Untitled Program');
            this.projects.push(project);
            this.activeProjectId = project.id;
            this.selectedFieldId = null;
            this.cancelPlacement();
            this.scheduleSave();
            this.renderProjectSelect();
            this.render();
        });

        document.getElementById('deleteProjectBtn').addEventListener('click', () => {
            if (this.projects.length <= 1) {
                alert('You need at least one program.');
                return;
            }
            const project = this.getActiveProject();
            if (!confirm(`Delete "${project.name}"?`)) return;
            this.projects = this.projects.filter(p => p.id !== this.activeProjectId);
            this.activeProjectId = this.projects[0].id;
            this.selectedFieldId = null;
            this.cancelPlacement();
            this.scheduleSave();
            this.renderProjectSelect();
            this.render();
        });

        document.getElementById('projectName').addEventListener('input', (e) => {
            const project = this.getActiveProject();
            if (!project) return;
            project.name = e.target.value;
            project.updatedAt = new Date().toISOString();
            this.updateProjectSelectLabel();
            this.scheduleSave();
        });

        document.getElementById('addTextBtn').addEventListener('click', () => {
            this.startPlacement('text');
        });

        document.getElementById('addImageBtn').addEventListener('click', () => {
            this.startPlacement('image');
        });

        document.getElementById('printBtn').addEventListener('click', () => {
            window.print();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportProject();
        });

        document.getElementById('importInput').addEventListener('change', (e) => {
            this.importProject(e.target.files[0]);
            e.target.value = '';
        });

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        document.addEventListener('mousemove', (e) => this.handleDragMove(e));
        document.addEventListener('mouseup', () => this.handleDragEnd());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.cancelPlacement();
        });
    }

    startPlacement(type) {
        this.placementMode = 'place';
        this.pendingFieldType = type;
        this.canvas.classList.add('placement-mode');
        this.placementHint.hidden = false;
        this.placementHint.textContent = `Click on the page to place the ${type} field`;
    }

    cancelPlacement() {
        this.placementMode = null;
        this.pendingFieldType = null;
        this.canvas.classList.remove('placement-mode');
        this.placementHint.hidden = true;
    }

    handleCanvasClick(e) {
        if (this.placementMode !== 'place' || !this.pendingFieldType) return;
        if (e.target.closest('.canvas-field')) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        this.addField(this.pendingFieldType, x, y);
        this.cancelPlacement();
    }

    addField(type, x, y) {
        const project = this.getActiveProject();
        const page = this.getCurrentPage();
        if (!project || !page) return;

        const globalOrder = this.getNextGlobalOrder(project);
        const pageLetter = page.pageLetter || this.getPageLetter(0);

        const field = {
            id: crypto.randomUUID(),
            label: `${pageLetter}${globalOrder}`,
            globalOrder,
            type,
            content: '',
            x: Math.max(0, Math.min(85, x - (type === 'text' ? 10 : 15))),
            y: Math.max(0, Math.min(90, y - 5)),
            width: type === 'text' ? 30 : 25,
            height: type === 'text' ? 8 : 20,
            fontSize: 14,
            fontWeight: 'normal',
            textAlign: 'center'
        };

        page.fields.push(field);
        project.updatedAt = new Date().toISOString();
        this.selectedFieldId = field.id;
        this.scheduleSave();
        this.render();

        if (type === 'text') {
            const textarea = this.fieldEditors.querySelector(
                `.field-editor[data-field-id="${field.id}"] textarea`
            );
            if (textarea) textarea.focus();
        }
    }

    deleteField(fieldId) {
        const page = this.getCurrentPage();
        if (!page) return;
        page.fields = page.fields.filter(f => f.id !== fieldId);
        if (this.selectedFieldId === fieldId) this.selectedFieldId = null;
        const project = this.getActiveProject();
        if (project) project.updatedAt = new Date().toISOString();
        this.scheduleSave();
        this.render();
    }

    selectField(fieldId, { focusTextarea = false } = {}) {
        const wasSelected = this.selectedFieldId === fieldId;
        this.selectedFieldId = fieldId;
        this.renderCanvas();

        if (wasSelected) {
            this.fieldEditors.querySelectorAll('.field-editor').forEach(el => {
                el.classList.toggle('selected', el.dataset.fieldId === fieldId);
            });
            return;
        }

        this.renderFieldEditors();

        const editor = this.fieldEditors.querySelector(`.field-editor[data-field-id="${fieldId}"]`);
        if (editor) {
            editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (focusTextarea) {
                const textarea = editor.querySelector('textarea');
                if (textarea) textarea.focus();
            }
        }
    }

    updateField(fieldId, updates) {
        const page = this.getCurrentPage();
        if (!page) return;
        const field = page.fields.find(f => f.id === fieldId);
        if (!field) return;
        Object.assign(field, updates);
        const project = this.getActiveProject();
        if (project) project.updatedAt = new Date().toISOString();
        this.scheduleSave();
        this.renderCanvas();
    }

    handleFieldDragStart(e, fieldId) {
        if (this.placementMode) return;
        e.preventDefault();
        e.stopPropagation();

        const fieldEl = e.currentTarget;
        const rect = this.canvas.getBoundingClientRect();
        const fieldRect = fieldEl.getBoundingClientRect();

        this.isDragging = true;
        this.dragFieldId = fieldId;
        this.dragOffset = {
            x: e.clientX - fieldRect.left,
            y: e.clientY - fieldRect.top
        };
        this.selectField(fieldId);
    }

    handleDragMove(e) {
        if (!this.isDragging || !this.dragFieldId) return;

        const rect = this.canvas.getBoundingClientRect();
        const page = this.getCurrentPage();
        const field = page?.fields.find(f => f.id === this.dragFieldId);
        if (!field) return;

        const x = ((e.clientX - rect.left - this.dragOffset.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - this.dragOffset.y) / rect.height) * 100;

        field.x = Math.max(0, Math.min(100 - field.width, x));
        field.y = Math.max(0, Math.min(100 - field.height, y));

        const fieldEl = this.canvasFields.querySelector(`[data-field-id="${this.dragFieldId}"]`);
        if (fieldEl) {
            fieldEl.style.left = `${field.x}%`;
            fieldEl.style.top = `${field.y}%`;
        }
    }

    handleDragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.dragFieldId = null;
        const project = this.getActiveProject();
        if (project) project.updatedAt = new Date().toISOString();
        this.scheduleSave();
    }

    scheduleSave() {
        this.saveStatus.textContent = 'Saving…';
        this.saveStatus.classList.add('saving');
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.save(), 300);
    }

    save() {
        try {
            localStorage.setItem('programBuilderProjects', JSON.stringify(this.projects));
            localStorage.setItem('programBuilderActiveId', this.activeProjectId);
            this.saveStatus.textContent = 'Saved';
            this.saveStatus.classList.remove('saving');
            this.checkStorageSize();
        } catch (err) {
            this.saveStatus.textContent = 'Save failed';
            this.saveStatus.classList.remove('saving');
            this.storageWarning.hidden = false;
            this.storageWarning.textContent = 'Storage full. Export your program and remove large images.';
            console.error('Save failed:', err);
        }
    }

    checkStorageSize() {
        const project = this.getActiveProject();
        if (!project) return;
        const size = new Blob([JSON.stringify(project)]).size;
        if (size > 4 * 1024 * 1024) {
            this.storageWarning.hidden = false;
            this.storageWarning.textContent = 'Program is large. Consider smaller images.';
        } else {
            this.storageWarning.hidden = true;
        }
    }

    renderProjectSelect() {
        const select = document.getElementById('projectSelect');
        select.innerHTML = this.projects.map(p =>
            `<option value="${p.id}"${p.id === this.activeProjectId ? ' selected' : ''}>${this.escapeHtml(p.name)}</option>`
        ).join('');
    }

    updateProjectSelectLabel() {
        const select = document.getElementById('projectSelect');
        const option = select.querySelector(`option[value="${this.activeProjectId}"]`);
        const project = this.getActiveProject();
        if (option && project) option.textContent = project.name;
    }

    render() {
        const project = this.getActiveProject();
        if (!project) return;

        document.getElementById('projectName').value = project.name;
        this.renderFieldEditors();
        this.renderCanvas();
    }

    renderFieldEditors() {
        const page = this.getCurrentPage();
        const fields = page ? [...page.fields].sort((a, b) => a.globalOrder - b.globalOrder) : [];

        this.emptyFieldsMsg.hidden = fields.length > 0;

        const existing = this.fieldEditors.querySelectorAll('.field-editor');
        existing.forEach(el => el.remove());

        fields.forEach(field => {
            const editor = document.createElement('div');
            editor.className = `field-editor${field.id === this.selectedFieldId ? ' selected' : ''}`;
            editor.dataset.fieldId = field.id;

            editor.innerHTML = `
                <div class="field-editor-header">
                    <span class="field-label-badge">${this.escapeHtml(field.label)}</span>
                    <span class="field-type-tag">${field.type}</span>
                </div>
            `;

            if (field.type === 'text') {
                const textarea = document.createElement('textarea');
                textarea.className = 'form-control form-control-sm';
                textarea.id = `field-content-${field.id}`;
                textarea.setAttribute('aria-label', `${field.label} text content`);
                textarea.value = field.content;
                textarea.placeholder = 'Enter text…';
                textarea.addEventListener('input', (e) => {
                    this.updateField(field.id, { content: e.target.value });
                });
                textarea.addEventListener('focus', () => {
                    this.selectField(field.id, { focusTextarea: true });
                });
                textarea.addEventListener('click', (e) => e.stopPropagation());
                editor.appendChild(textarea);

                const styleRow = document.createElement('div');
                styleRow.className = 'field-style-row';
                styleRow.innerHTML = `
                    <input type="number" class="form-control form-control-sm" min="8" max="72" value="${field.fontSize}" aria-label="${field.label} font size" title="Font size">
                    <select class="form-select form-select-sm" aria-label="${field.label} font weight">
                        <option value="normal"${field.fontWeight === 'normal' ? ' selected' : ''}>Normal</option>
                        <option value="bold"${field.fontWeight === 'bold' ? ' selected' : ''}>Bold</option>
                    </select>
                    <select class="form-select form-select-sm" aria-label="${field.label} text align">
                        <option value="left"${field.textAlign === 'left' ? ' selected' : ''}>Left</option>
                        <option value="center"${field.textAlign === 'center' ? ' selected' : ''}>Center</option>
                        <option value="right"${field.textAlign === 'right' ? ' selected' : ''}>Right</option>
                    </select>
                `;
                const [fontSizeInput, fontWeightSelect, textAlignSelect] = styleRow.children;
                fontSizeInput.addEventListener('input', (e) => {
                    this.updateField(field.id, { fontSize: parseInt(e.target.value, 10) || 14 });
                });
                fontWeightSelect.addEventListener('change', (e) => {
                    this.updateField(field.id, { fontWeight: e.target.value });
                });
                textAlignSelect.addEventListener('change', (e) => {
                    this.updateField(field.id, { textAlign: e.target.value });
                });
                styleRow.addEventListener('click', (e) => e.stopPropagation());
                editor.appendChild(styleRow);
            } else {
                const fileLabel = document.createElement('label');
                fileLabel.className = 'form-label';
                fileLabel.textContent = 'Image file';
                fileLabel.setAttribute('for', `field-image-${field.id}`);
                editor.appendChild(fileLabel);

                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = `field-image-${field.id}`;
                fileInput.className = 'form-control form-control-sm';
                fileInput.accept = 'image/*';
                fileInput.addEventListener('change', (e) => this.handleImageUpload(field.id, e.target.files[0]));
                fileInput.addEventListener('focus', () => this.selectField(field.id));
                fileInput.addEventListener('click', (e) => e.stopPropagation());
                editor.appendChild(fileInput);

                if (field.content) {
                    const img = document.createElement('img');
                    img.className = 'image-preview';
                    img.src = field.content;
                    img.alt = `${field.label} preview`;
                    editor.appendChild(img);
                }
            }

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-outline-danger btn-sm w-100 mt-2';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remove field';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Remove field ${field.label}?`)) this.deleteField(field.id);
            });
            editor.appendChild(deleteBtn);

            editor.addEventListener('click', (e) => {
                if (e.target.closest('textarea, input, select, button')) return;
                this.selectField(field.id);
            });
            this.fieldEditors.appendChild(editor);
        });

        if (this.emptyFieldsMsg.parentNode === this.fieldEditors) {
            this.fieldEditors.appendChild(this.emptyFieldsMsg);
        }
    }

    handleImageUpload(fieldId, file) {
        if (!file) return;
        if (file.size > 500 * 1024) {
            if (!confirm('This image is over 500 KB and may use a lot of storage. Continue?')) return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.updateField(fieldId, { content: e.target.result });
            this.renderFieldEditors();
        };
        reader.readAsDataURL(file);
    }

    renderCanvas() {
        const page = this.getCurrentPage();
        const fields = page ? [...page.fields].sort((a, b) => a.globalOrder - b.globalOrder) : [];

        this.canvasFields.innerHTML = '';

        fields.forEach(field => {
            const el = document.createElement('div');
            el.className = `canvas-field${field.id === this.selectedFieldId ? ' selected' : ''}`;
            el.dataset.fieldId = field.id;
            el.style.left = `${field.x}%`;
            el.style.top = `${field.y}%`;
            el.style.width = `${field.width}%`;
            el.style.height = `${field.height}%`;

            const labelTag = document.createElement('span');
            labelTag.className = 'field-label-tag';
            labelTag.textContent = field.label;
            el.appendChild(labelTag);

            if (field.type === 'text') {
                const textEl = document.createElement('div');
                textEl.className = 'canvas-field-text';
                textEl.style.fontSize = `${field.fontSize}px`;
                textEl.style.fontWeight = field.fontWeight;
                textEl.style.textAlign = field.textAlign;
                textEl.style.justifyContent = field.textAlign === 'center' ? 'center' :
                    field.textAlign === 'right' ? 'flex-end' : 'flex-start';
                textEl.textContent = field.content || field.label;
                if (!field.content) textEl.style.color = '#bbb';
                el.appendChild(textEl);
            } else {
                if (field.content) {
                    const img = document.createElement('img');
                    img.className = 'canvas-field-image';
                    img.src = field.content;
                    img.alt = field.label;
                    el.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'canvas-field-image-placeholder';
                    placeholder.textContent = 'No image';
                    el.appendChild(placeholder);
                }
            }

            el.addEventListener('mousedown', (e) => this.handleFieldDragStart(e, field.id));
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectField(field.id);
            });

            this.canvasFields.appendChild(el);
        });
    }

    exportProject() {
        const project = this.getActiveProject();
        if (!project) return;

        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            project
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const safeName = project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'program';
        link.download = `${safeName}-template.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    importProject(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const project = this.validateImport(data);
                project.id = crypto.randomUUID();
                project.updatedAt = new Date().toISOString();
                project.name = `${project.name} (imported)`;

                project.pages.forEach(page => {
                    page.id = crypto.randomUUID();
                    page.fields.forEach(field => {
                        field.id = crypto.randomUUID();
                    });
                });

                this.projects.push(project);
                this.activeProjectId = project.id;
                this.selectedFieldId = null;
                this.cancelPlacement();
                this.scheduleSave();
                this.renderProjectSelect();
                this.render();
            } catch (err) {
                alert(`Import failed: ${err.message}`);
            }
        };
        reader.readAsText(file);
    }

    validateImport(data) {
        const project = data.project || data;
        if (!project || typeof project !== 'object') {
            throw new Error('Invalid template file.');
        }
        if (!project.name || !Array.isArray(project.pages)) {
            throw new Error('Template is missing required fields.');
        }
        for (const page of project.pages) {
            if (!Array.isArray(page.fields)) {
                throw new Error('Page is missing fields array.');
            }
            for (const field of page.fields) {
                if (!field.type || !['text', 'image'].includes(field.type)) {
                    throw new Error('Invalid field type in template.');
                }
                if (typeof field.x !== 'number' || typeof field.y !== 'number') {
                    throw new Error('Field position data is invalid.');
                }
            }
        }
        return JSON.parse(JSON.stringify(project));
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProgramBuilderApp();
});
