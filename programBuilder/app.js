class ProgramBuilderApp {
    static FONT_OPTIONS = [
        { value: 'Georgia, serif', label: 'Georgia' },
        { value: "'Times New Roman', Times, serif", label: 'Times New Roman' },
        { value: 'Garamond, serif', label: 'Garamond' },
        { value: 'Palatino, "Palatino Linotype", serif', label: 'Palatino' },
        { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
        { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica' },
        { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
        { value: '"Courier New", Courier, monospace', label: 'Courier New' }
    ];

    static DEFAULT_GLOBAL_FONT = 'Georgia, serif';
    static DEFAULT_GLOBAL_COLOR = '#344642';

    constructor() {
        this.projects = JSON.parse(localStorage.getItem('programBuilderProjects')) || [];
        this.projects.forEach(project => this.migrateProject(project));
        this.activeProjectId = localStorage.getItem('programBuilderActiveId') || null;
        this.selectedFieldId = null;
        this.checkedFieldIds = new Set();
        this.placementMode = null;
        this.pendingFieldType = null;
        this.saveTimeout = null;
        this.isDragging = false;
        this.dragFieldId = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isResizing = false;
        this.resizeFieldId = null;
        this.resizeHandle = null;
        this.resizeStart = null;

        this.minFieldWidth = 5;
        this.minFieldHeight = 3;

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
            globalFontFamily: ProgramBuilderApp.DEFAULT_GLOBAL_FONT,
            globalTextColor: ProgramBuilderApp.DEFAULT_GLOBAL_COLOR,
            pages: [{
                id: crypto.randomUUID(),
                pageLetter: 'A',
                fields: []
            }]
        };
    }

    migrateProject(project) {
        if (!project.globalFontFamily) {
            project.globalFontFamily = ProgramBuilderApp.DEFAULT_GLOBAL_FONT;
        }
        if (!project.globalTextColor) {
            project.globalTextColor = ProgramBuilderApp.DEFAULT_GLOBAL_COLOR;
        }
        project.globalTextColor = this.normalizeHexColor(project.globalTextColor)
            || ProgramBuilderApp.DEFAULT_GLOBAL_COLOR;

        for (const page of project.pages || []) {
            for (const field of page.fields || []) {
                if (field.type !== 'text') continue;
                if (field.fontFamily === undefined) {
                    field.fontFamily = project.globalFontFamily;
                }
                if (field.textColor === undefined) {
                    field.textColor = project.globalTextColor;
                }
                if (field.useGlobalStyle === undefined) {
                    field.useGlobalStyle = true;
                }
                field.textColor = this.normalizeHexColor(field.textColor)
                    || project.globalTextColor;
            }
        }
    }

    normalizeHexColor(value) {
        if (!value || typeof value !== 'string') return null;
        let hex = value.trim();
        if (!hex.startsWith('#')) hex = `#${hex}`;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
        return hex.toLowerCase();
    }

    getFieldFontFamily(field, project) {
        if (field.useGlobalStyle) return project.globalFontFamily;
        return field.fontFamily || project.globalFontFamily;
    }

    getFieldTextColor(field, project) {
        if (field.useGlobalStyle) return project.globalTextColor;
        return field.textColor || project.globalTextColor;
    }

    buildFontOptions(selectedValue) {
        return ProgramBuilderApp.FONT_OPTIONS.map(opt =>
            `<option value="${this.escapeHtml(opt.value)}"${opt.value === selectedValue ? ' selected' : ''}>${this.escapeHtml(opt.label)}</option>`
        ).join('');
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

    toggleAlignMenu() {
        const dropdown = document.getElementById('alignMenuDropdown');
        const button = document.getElementById('alignMenuBtn');
        const isOpen = !dropdown.hidden;
        dropdown.hidden = isOpen;
        button.setAttribute('aria-expanded', String(!isOpen));
    }

    closeAlignMenu() {
        const dropdown = document.getElementById('alignMenuDropdown');
        const button = document.getElementById('alignMenuBtn');
        if (!dropdown || !button) return;
        dropdown.hidden = true;
        button.setAttribute('aria-expanded', 'false');
    }

    getFieldSide(field) {
        const centerX = field.x + field.width / 2;
        return centerX < 50 ? 'left' : 'right';
    }

    alignFieldOnSide(field, alignment) {
        const side = this.getFieldSide(field);
        const sideStart = side === 'left' ? 0 : 50;
        const sideWidth = 50;

        if (alignment === 'left') {
            field.x = sideStart;
        } else if (alignment === 'center') {
            field.x = sideStart + (sideWidth - field.width) / 2;
        } else if (alignment === 'right') {
            field.x = sideStart + sideWidth - field.width;
        }

        field.x = Math.max(sideStart, Math.min(sideStart + sideWidth - field.width, field.x));
    }

    applyBulkAlignment(alignment) {
        if (this.checkedFieldIds.size === 0) {
            alert('Check one or more fields to align.');
            return;
        }

        const page = this.getCurrentPage();
        const project = this.getActiveProject();
        if (!page || !project) return;

        let updated = 0;
        for (const fieldId of this.checkedFieldIds) {
            const field = page.fields.find(f => f.id === fieldId);
            if (!field) continue;
            this.alignFieldOnSide(field, alignment);
            if (field.type === 'text') {
                field.textAlign = alignment;
            }
            updated++;
        }

        if (updated === 0) {
            alert('No checked fields found.');
            return;
        }

        project.updatedAt = new Date().toISOString();
        this.scheduleSave();
        this.renderCanvas();
        this.renderFieldEditors();
    }

    getCheckedFields(page) {
        const fields = [];
        for (const fieldId of this.checkedFieldIds) {
            const field = page.fields.find(f => f.id === fieldId);
            if (field) fields.push(field);
        }
        return fields;
    }

    clampFieldY(field) {
        field.y = Math.max(0, Math.min(100 - field.height, field.y));
    }

    justifyFields(fields, justify) {
        if (fields.length < 2) return false;

        const tops = fields.map(f => f.y);
        const bottoms = fields.map(f => f.y + f.height);
        const minTop = Math.min(...tops);
        const maxBottom = Math.max(...bottoms);
        const centerY = (minTop + maxBottom) / 2;

        for (const field of fields) {
            if (justify === 'top') {
                field.y = minTop;
            } else if (justify === 'middle') {
                field.y = centerY - field.height / 2;
            } else if (justify === 'bottom') {
                field.y = maxBottom - field.height;
            }
            this.clampFieldY(field);
        }
        return true;
    }

    applyBulkJustify(justify) {
        if (this.checkedFieldIds.size === 0) {
            alert('Check one or more fields to justify.');
            return;
        }

        const page = this.getCurrentPage();
        const project = this.getActiveProject();
        if (!page || !project) return;

        const checkedFields = this.getCheckedFields(page);
        if (checkedFields.length < 2) {
            alert('Select at least two checked fields to justify.');
            return;
        }

        this.justifyFields(checkedFields, justify);

        project.updatedAt = new Date().toISOString();
        this.scheduleSave();
        this.renderCanvas();
        this.renderFieldEditors();
    }

    setFieldChecked(fieldId, checked) {
        if (checked) {
            this.checkedFieldIds.add(fieldId);
        } else {
            this.checkedFieldIds.delete(fieldId);
        }
        this.renderCanvas();
        this.updateFieldEditorSelection(fieldId);
    }

    updateFieldEditorSelection(fieldId) {
        const editor = this.fieldEditors.querySelector(`.field-editor[data-field-id="${fieldId}"]`);
        if (!editor) return;
        editor.classList.toggle('bulk-checked', this.checkedFieldIds.has(fieldId));
        const checkbox = editor.querySelector('.field-select-checkbox');
        if (checkbox) checkbox.checked = this.checkedFieldIds.has(fieldId);
    }

    bindEvents() {
        document.getElementById('projectSelect').addEventListener('change', (e) => {
            this.activeProjectId = e.target.value;
            localStorage.setItem('programBuilderActiveId', this.activeProjectId);
            this.selectedFieldId = null;
            this.checkedFieldIds.clear();
            this.closeAlignMenu();
            this.cancelPlacement();
            this.render();
        });

        document.getElementById('newProjectBtn').addEventListener('click', () => {
            const project = this.createBlankProject('Untitled Program');
            this.projects.push(project);
            this.activeProjectId = project.id;
            this.selectedFieldId = null;
            this.checkedFieldIds.clear();
            this.closeAlignMenu();
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
            this.checkedFieldIds.clear();
            this.closeAlignMenu();
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

        const globalFontSelect = document.getElementById('globalFontFamily');
        globalFontSelect.innerHTML = this.buildFontOptions(ProgramBuilderApp.DEFAULT_GLOBAL_FONT);
        globalFontSelect.addEventListener('change', (e) => {
            const project = this.getActiveProject();
            if (!project) return;
            project.globalFontFamily = e.target.value;
            project.updatedAt = new Date().toISOString();
            this.scheduleSave();
            this.renderCanvas();
            this.renderFieldEditors();
        });

        const globalColorPicker = document.getElementById('globalTextColorPicker');
        const globalColorHex = document.getElementById('globalTextColorHex');

        globalColorPicker.addEventListener('input', (e) => {
            globalColorHex.value = e.target.value;
            this.updateGlobalTextColor(e.target.value);
        });

        globalColorHex.addEventListener('change', (e) => {
            const normalized = this.normalizeHexColor(e.target.value);
            if (!normalized) {
                const project = this.getActiveProject();
                e.target.value = project?.globalTextColor || ProgramBuilderApp.DEFAULT_GLOBAL_COLOR;
                return;
            }
            globalColorPicker.value = normalized;
            e.target.value = normalized;
            this.updateGlobalTextColor(normalized);
        });

        document.getElementById('addTextBtn').addEventListener('click', () => {
            this.startPlacement('text');
        });

        document.getElementById('addImageBtn').addEventListener('click', () => {
            this.startPlacement('image');
        });

        document.getElementById('alignMenuBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAlignMenu();
        });

        document.querySelectorAll('.align-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (item.dataset.align) {
                    this.applyBulkAlignment(item.dataset.align);
                } else if (item.dataset.justify) {
                    this.applyBulkJustify(item.dataset.justify);
                }
                this.closeAlignMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.align-menu-wrap')) return;
            this.closeAlignMenu();
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

        document.addEventListener('mousemove', (e) => {
            this.handleDragMove(e);
            this.handleResizeMove(e);
        });
        document.addEventListener('mouseup', () => this.handlePointerEnd());

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
            textAlign: 'center',
            fontFamily: project.globalFontFamily,
            textColor: project.globalTextColor,
            useGlobalStyle: true
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
        this.checkedFieldIds.delete(fieldId);
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

    updateGlobalTextColor(color) {
        const normalized = this.normalizeHexColor(color);
        if (!normalized) return;
        const project = this.getActiveProject();
        if (!project) return;
        project.globalTextColor = normalized;
        project.updatedAt = new Date().toISOString();
        this.scheduleSave();
        this.renderCanvas();
        this.renderFieldEditors();
    }

    applyGlobalStyleToField(fieldId) {
        const project = this.getActiveProject();
        const page = this.getCurrentPage();
        if (!project || !page) return;
        const field = page.fields.find(f => f.id === fieldId);
        if (!field || field.type !== 'text') return;

        const message = `Apply the global font (${this.getFontLabel(project.globalFontFamily)}) and color (${project.globalTextColor}) to field ${field.label}? This will replace this field's custom font and text color.`;
        if (!confirm(message)) return;

        field.useGlobalStyle = true;
        field.fontFamily = project.globalFontFamily;
        field.textColor = project.globalTextColor;
        project.updatedAt = new Date().toISOString();
        this.scheduleSave();
        this.renderFieldEditors();
        this.renderCanvas();
    }

    getFontLabel(fontFamily) {
        const match = ProgramBuilderApp.FONT_OPTIONS.find(opt => opt.value === fontFamily);
        return match ? match.label : fontFamily;
    }

    handleFieldDragStart(e, fieldId) {
        if (this.placementMode || e.target.closest('.resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();

        const fieldEl = e.currentTarget;
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

    handleResizeStart(e, fieldId, handle) {
        if (this.placementMode) return;
        e.preventDefault();
        e.stopPropagation();

        const page = this.getCurrentPage();
        const field = page?.fields.find(f => f.id === fieldId);
        if (!field) return;

        this.isResizing = true;
        this.resizeFieldId = fieldId;
        this.resizeHandle = handle;
        this.resizeStart = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            canvasRect: this.canvas.getBoundingClientRect()
        };
        this.selectField(fieldId);
    }

    handleResizeMove(e) {
        if (!this.isResizing || !this.resizeFieldId || !this.resizeStart) return;

        const page = this.getCurrentPage();
        const field = page?.fields.find(f => f.id === this.resizeFieldId);
        if (!field) return;

        const { mouseX, mouseY, x, y, width, height, canvasRect } = this.resizeStart;
        const dx = ((e.clientX - mouseX) / canvasRect.width) * 100;
        const dy = ((e.clientY - mouseY) / canvasRect.height) * 100;
        const handle = this.resizeHandle;

        let newX = x;
        let newY = y;
        let newW = width;
        let newH = height;

        if (handle.includes('e')) newW = width + dx;
        if (handle.includes('w')) {
            newW = width - dx;
            newX = x + dx;
        }
        if (handle.includes('s')) newH = height + dy;
        if (handle.includes('n')) {
            newH = height - dy;
            newY = y + dy;
        }

        if (newW < this.minFieldWidth) {
            if (handle.includes('w')) newX = x + width - this.minFieldWidth;
            newW = this.minFieldWidth;
        }
        if (newH < this.minFieldHeight) {
            if (handle.includes('n')) newY = y + height - this.minFieldHeight;
            newH = this.minFieldHeight;
        }

        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        if (newX + newW > 100) {
            if (handle.includes('w')) newX = 100 - newW;
            else newW = 100 - newX;
        }
        if (newY + newH > 100) {
            if (handle.includes('n')) newY = 100 - newH;
            else newH = 100 - newY;
        }

        field.x = newX;
        field.y = newY;
        field.width = newW;
        field.height = newH;

        const fieldEl = this.canvasFields.querySelector(`[data-field-id="${this.resizeFieldId}"]`);
        if (fieldEl) {
            fieldEl.style.left = `${field.x}%`;
            fieldEl.style.top = `${field.y}%`;
            fieldEl.style.width = `${field.width}%`;
            fieldEl.style.height = `${field.height}%`;
        }
    }

    handlePointerEnd() {
        const wasDragging = this.isDragging;
        const wasResizing = this.isResizing;

        if (this.isDragging) {
            this.isDragging = false;
            this.dragFieldId = null;
        }
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeFieldId = null;
            this.resizeHandle = null;
            this.resizeStart = null;
        }
        if (wasDragging || wasResizing) {
            const project = this.getActiveProject();
            if (project) project.updatedAt = new Date().toISOString();
            this.scheduleSave();
        }
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

        const globalFontSelect = document.getElementById('globalFontFamily');
        globalFontSelect.innerHTML = this.buildFontOptions(project.globalFontFamily);
        globalFontSelect.value = project.globalFontFamily;

        document.getElementById('globalTextColorPicker').value = project.globalTextColor;
        document.getElementById('globalTextColorHex').value = project.globalTextColor;

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
            const isChecked = this.checkedFieldIds.has(field.id);
            const editor = document.createElement('div');
            editor.className = `field-editor${field.id === this.selectedFieldId ? ' selected' : ''}${isChecked ? ' bulk-checked' : ''}`;
            editor.dataset.fieldId = field.id;

            const header = document.createElement('div');
            header.className = 'field-editor-header';

            const checkLabel = document.createElement('label');
            checkLabel.className = 'field-select-check';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'field-select-checkbox';
            checkbox.checked = isChecked;
            checkbox.setAttribute('aria-label', `Select ${field.label} for alignment`);
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.setFieldChecked(field.id, e.target.checked);
            });
            checkbox.addEventListener('click', (e) => e.stopPropagation());

            const badge = document.createElement('span');
            badge.className = 'field-label-badge';
            badge.textContent = field.label;

            checkLabel.appendChild(checkbox);
            checkLabel.appendChild(badge);

            const typeTag = document.createElement('span');
            typeTag.className = 'field-type-tag';
            typeTag.textContent = field.type;

            header.appendChild(checkLabel);
            header.appendChild(typeTag);
            editor.appendChild(header);

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

                if (field.useGlobalStyle) {
                    const badge = document.createElement('span');
                    badge.className = 'global-style-badge';
                    badge.textContent = 'Using global font & color';
                    editor.appendChild(badge);
                } else {
                    const fontColorRow = document.createElement('div');
                    fontColorRow.className = 'field-font-color-row';
                    fontColorRow.innerHTML = `
                        <select class="form-select form-select-sm" aria-label="${field.label} font family"></select>
                        <input type="color" class="form-control form-control-color" value="${this.escapeHtml(field.textColor)}" aria-label="${field.label} text color">
                        <input type="text" class="form-control form-control-sm hex-input" value="${this.escapeHtml(field.textColor)}" aria-label="${field.label} text color hex" maxlength="7" spellcheck="false">
                    `;
                    const [fontSelect, colorPicker, colorHex] = fontColorRow.children;
                    fontSelect.innerHTML = this.buildFontOptions(field.fontFamily);
                    fontSelect.value = field.fontFamily;

                    fontSelect.addEventListener('change', (e) => {
                        this.updateField(field.id, {
                            fontFamily: e.target.value,
                            useGlobalStyle: false
                        });
                    });
                    colorPicker.addEventListener('input', (e) => {
                        colorHex.value = e.target.value;
                        this.updateField(field.id, {
                            textColor: e.target.value,
                            useGlobalStyle: false
                        });
                    });
                    colorHex.addEventListener('change', (e) => {
                        const normalized = this.normalizeHexColor(e.target.value);
                        if (!normalized) {
                            e.target.value = field.textColor;
                            return;
                        }
                        colorPicker.value = normalized;
                        e.target.value = normalized;
                        this.updateField(field.id, {
                            textColor: normalized,
                            useGlobalStyle: false
                        });
                    });
                    fontColorRow.addEventListener('click', (e) => e.stopPropagation());
                    editor.appendChild(fontColorRow);
                }

                const useGlobalBtn = document.createElement('button');
                useGlobalBtn.type = 'button';
                useGlobalBtn.className = 'btn btn-outline-primary btn-sm w-100 mt-2';
                useGlobalBtn.innerHTML = '<i class="fas fa-globe"></i> Use Global Font &amp; Color';
                useGlobalBtn.disabled = field.useGlobalStyle;
                useGlobalBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.applyGlobalStyleToField(field.id);
                });
                editor.appendChild(useGlobalBtn);

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
                if (e.target.closest('textarea, input, select, button, label')) return;
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
            const isChecked = this.checkedFieldIds.has(field.id);
            const el = document.createElement('div');
            el.className = `canvas-field${field.id === this.selectedFieldId ? ' selected' : ''}${isChecked ? ' bulk-selected' : ''}`;
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
                const project = this.getActiveProject();
                const textEl = document.createElement('div');
                textEl.className = 'canvas-field-text';
                textEl.style.fontSize = `${field.fontSize}px`;
                textEl.style.fontWeight = field.fontWeight;
                textEl.style.fontFamily = this.getFieldFontFamily(field, project);
                textEl.style.textAlign = field.textAlign;
                textEl.style.justifyContent = field.textAlign === 'center' ? 'center' :
                    field.textAlign === 'right' ? 'flex-end' : 'flex-start';
                textEl.textContent = field.content || field.label;
                if (field.content) {
                    textEl.style.color = this.getFieldTextColor(field, project);
                } else {
                    textEl.style.color = '#bbb';
                }
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
                if (e.target.closest('.resize-handle')) return;
                e.stopPropagation();
                this.selectField(field.id);
            });

            if (field.id === this.selectedFieldId) {
                for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
                    const handleEl = document.createElement('div');
                    handleEl.className = `resize-handle resize-handle-${handle}`;
                    handleEl.dataset.handle = handle;
                    handleEl.addEventListener('mousedown', (e) => this.handleResizeStart(e, field.id, handle));
                    el.appendChild(handleEl);
                }
            }

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
                this.migrateProject(project);

                this.projects.push(project);
                this.activeProjectId = project.id;
                this.selectedFieldId = null;
                this.checkedFieldIds.clear();
                this.closeAlignMenu();
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
