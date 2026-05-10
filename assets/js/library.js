// ============================================================
// ===== PERSONAL LIBRARY MODULE — PREMIUM GRADE ==============
// ============================================================

const Library = {
    _cache: { libraries: [], items: {}, currentLib: null, currentFile: null },
    _visitorLibraries: [],  // ⚡ مكتبات الزوار
    _initialized: false,

    // ===== INITIALIZATION =====
    async init() {
        if (this._initialized) return;
        this._initialized = true;
        this._setupDragDrop();
        console.log('📚 Library module initialized');
    },

    // ===== DRAG & DROP SETUP =====
    _setupDragDrop() {
        document.addEventListener('dragover', e => {
            const zone = document.querySelector('.lib-upload-zone');
            if (zone && zone.offsetParent !== null) {
                e.preventDefault();
                zone.classList.add('dragover');
            }
        });
        document.addEventListener('dragleave', e => {
            const zone = document.querySelector('.lib-upload-zone');
            if (zone && !zone.contains(e.relatedTarget)) zone.classList.remove('dragover');
        });
        document.addEventListener('drop', e => {
            const zone = document.querySelector('.lib-upload-zone');
            if (zone && zone.offsetParent !== null) {
                e.preventDefault();
                zone.classList.remove('dragover');
                if (e.dataTransfer.files.length) Library._handleFileUpload(e.dataTransfer.files[0]);
            }
        });
    },

    // ===== SUPABASE CRUD: LIBRARIES =====
    async fetchLibraries(profileId) {
        if (!sbOnline) return this._getLocalLibraries(profileId);
        try {
            const { data, error } = await sb.from('libraries')
                .select('*')
                .eq('owner_id', profileId)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });
            if (error) throw error;
            this._cache.libraries = data || [];
            this._saveLocalLibraries(profileId, data || []);
            return data || [];
        } catch (e) {
            return this._getLocalLibraries(profileId);
        }
    },

    async createLibrary(libData) {
        if (!sbOnline || !sbUser) return this._createLocalLibrary(libData);
        try {
            const { data, error } = await sb.from('libraries').insert({
                owner_id: sbUser.id,
                name: libData.name,
                description: libData.description || '',
                icon: libData.icon || '📚',
                color: libData.color || '#f97316',
                visibility: libData.visibility || 'public'
            }).select().single();
            if (error) throw error;
            this._cache.libraries.unshift(data);
            return data;
        } catch (e) {
            return this._createLocalLibrary(libData);
        }
    },

    async updateLibrary(libId, updates) {
        if (!sbOnline) return this._updateLocalLibrary(libId, updates);
        try {
            const { data, error } = await sb.from('libraries').update(updates).eq('id', libId).select().single();
            if (error) throw error;
            const idx = this._cache.libraries.findIndex(l => l.id === libId);
            if (idx !== -1) this._cache.libraries[idx] = data;
            return data;
        } catch (e) {
            return this._updateLocalLibrary(libId, updates);
        }
    },

    async deleteLibrary(libId) {
        if (!sbOnline) return this._deleteLocalLibrary(libId);
        try {
            await sb.from('libraries').delete().eq('id', libId);
            this._cache.libraries = this._cache.libraries.filter(l => l.id !== libId);
            delete this._cache.items[libId];
        } catch (e) {
            this._deleteLocalLibrary(libId);
        }
    },

    // ===== SUPABASE CRUD: ITEMS =====
    async fetchItems(libId) {
        if (!sbOnline) return this._getLocalItems(libId);
        try {
            const { data, error } = await sb.from('library_items')
                .select('*')
                .eq('library_id', libId)
                .order('is_pinned', { ascending: false })
                .order('sort_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            this._cache.items[libId] = data || [];
            this._saveLocalItems(libId, data || []);
            return data || [];
        } catch (e) {
            return this._getLocalItems(libId);
        }
    },

    async createItem(libId, itemData) {
        if (!sbOnline || !sbUser) return this._createLocalItem(libId, itemData);
        try {
            const { data, error } = await sb.from('library_items').insert({
                library_id: libId,
                author_id: sbUser.id,
                type: itemData.type || 'note',
                title: itemData.title,
                content: itemData.content || '',
                url: itemData.url || '',
                file_url: itemData.file_url || '',
                file_name: itemData.file_name || '',
                file_size: itemData.file_size || 0,
                cover_image: itemData.cover_image || '',
                tags: itemData.tags || [],
                category: itemData.category || 'general',
                post_id: itemData.post_id || null
            }).select().single();
            if (error) throw error;
            if (!this._cache.items[libId]) this._cache.items[libId] = [];
            this._cache.items[libId].unshift(data);
            return data;
        } catch (e) {
            return this._createLocalItem(libId, itemData);
        }
    },

    async updateItem(itemId, updates) {
        if (!sbOnline) return this._updateLocalItem(itemId, updates);
        try {
            const { data, error } = await sb.from('library_items').update(updates).eq('id', itemId).select().single();
            if (error) throw error;
            for (const libId in this._cache.items) {
                const idx = this._cache.items[libId].findIndex(i => i.id === itemId);
                if (idx !== -1) { this._cache.items[libId][idx] = data; break; }
            }
            return data;
        } catch (e) {
            return this._updateLocalItem(itemId, updates);
        }
    },

    async deleteItem(itemId, libId) {
        if (!sbOnline) return this._deleteLocalItem(itemId, libId);
        try {
            await sb.from('library_items').delete().eq('id', itemId);
            if (this._cache.items[libId]) {
                this._cache.items[libId] = this._cache.items[libId].filter(i => i.id !== itemId);
            }
        } catch (e) {
            this._deleteLocalItem(itemId, libId);
        }
    },

    // ===== FILE UPLOAD =====
    _handleFileUpload(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) { showToast('حجم الملف يتجاوز 10 ميجا'); return; }

        const allowed = ['application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) { showToast('نوع الملف غير مدعوم'); return; }

        Library._cache.currentFile = file;

        // Show file preview
        const preview = document.getElementById('addItemFilePreview');
        const fileInfo = document.getElementById('addItemFileInfo');
        if (preview && fileInfo) {
            const isImage = file.type.startsWith('image/');
            const ext = file.name.split('.').pop().toUpperCase();
            const size = (file.size / 1024).toFixed(1) + ' KB';

            if (isImage) {
                const reader = new FileReader();
                reader.onload = e => {
                    preview.innerHTML = `<img src="${e.target.result}" class="w-full h-32 object-cover rounded-xl">`;
                };
                reader.readAsDataURL(file);
            } else {
                const iconMap = { PDF: 'lucide:file-text', DOC: 'lucide:file-type', DOCX: 'lucide:file-type' };
                const colorMap = { PDF: '#ef4444', DOC: '#3b82f6', DOCX: '#3b82f6' };
                preview.innerHTML = `
                    <div class="flex items-center gap-3 p-3 bg-dark-800 rounded-xl border border-dark-700">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:${colorMap[ext] || '#6b7280'}20">
                            <span class="iconify text-2xl" data-icon="${iconMap[ext] || 'lucide:file'}" style="color:${colorMap[ext] || '#6b7280'}"></span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium truncate">${Safe.escapeHtml(file.name)}</p>
                            <p class="text-dark-400 text-xs">${ext} • ${size}</p>
                        </div>
                        <button onclick="Library._clearFilePreview()" class="p-1.5 rounded-lg hover:bg-dark-700">
                            <span class="iconify text-dark-400" data-icon="lucide:x"></span>
                        </button>
                    </div>`;
            }
            preview.classList.remove('hidden');
        }

        // Hide any previous progress
        Library._hideUploadProgress();

        // Auto-fill title if empty
        const titleInput = document.getElementById('addItemTitle');
        if (titleInput && !titleInput.value.trim()) {
            titleInput.value = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        }

        // Set type to document
        const typeSelect = document.getElementById('addItemType');
        if (typeSelect) { typeSelect.value = 'document'; this._toggleItemFields('document'); }
    },

    _clearFilePreview() {
        Library._cache.currentFile = null;
        const preview = document.getElementById('addItemFilePreview');
        if (preview) { preview.classList.add('hidden'); preview.innerHTML = ''; }
        Library._hideUploadProgress();
    },

    // ===== UPLOAD PROGRESS =====
    _showUploadProgress(pct, status, isError, isComplete) {
        const container = document.getElementById('addItemUploadProgress');
        const bar = document.getElementById('addItemUploadBar');
        const statusEl = document.getElementById('addItemUploadStatus');
        const pctEl = document.getElementById('addItemUploadPct');
        if (!container) return;

        container.classList.add('active');
        bar.style.width = pct + '%';
        bar.className = 'lib-upload-progress-bar' + (isError ? ' error' : isComplete ? ' complete' : '');
        statusEl.className = 'status' + (isError ? ' error' : isComplete ? ' complete' : '');
        statusEl.textContent = status;
        pctEl.textContent = pct + '%';
    },

    _hideUploadProgress() {
        const container = document.getElementById('addItemUploadProgress');
        if (container) container.classList.remove('active');
    },

    // ===== RENDER: PROFILE TAB =====
    renderProfileLibraries(profileId) {
        const container = document.getElementById('profileLibraries');
        const emptyState = document.getElementById('libraryEmptyState');
        const grid = document.getElementById('librariesGrid');
        if (!container) return;

        const libs = this._cache.libraries;
        if (libs.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (grid) grid.classList.add('hidden');
        } else {
            if (emptyState) emptyState.classList.add('hidden');
            if (grid) {
                grid.classList.remove('hidden');
                grid.innerHTML = libs.map(lib => this._buildLibraryCard(lib)).join('');
            }
        }
    },

    _buildLibraryCard(lib) {
        const vis = lib.visibility === 'public' ? 'عام' : lib.visibility === 'followers' ? 'للمتابعين' : 'خاص';
        const visIcon = lib.visibility === 'public' ? 'lucide:globe' : lib.visibility === 'followers' ? 'lucide:users' : 'lucide:lock';
        const desc = lib.description ? `<p class="text-dark-400 text-xs mt-1 line-clamp-1">${Safe.escapeHtml(lib.description)}</p>` : '';
        const count = lib.items_count || 0;
        const countLabel = count === 0 ? 'فارغة' : count === 1 ? 'عنصر واحد' : count < 11 ? `${count} عناصر` : `${count} عنصر`;

        return `
        <div class="library-card group" onclick="Library.openLibrary('${lib.id}')">
            <div class="lib-card-accent" style="background: ${lib.color}"></div>
            <div class="p-4">
                <div class="flex items-start justify-between mb-3">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl lib-card-icon"
                         style="background: ${lib.color}15; color: ${lib.color}">
                        ${lib.icon}
                    </div>
                    <button onclick="event.stopPropagation();Library.openMenu('${lib.id}')"
                        class="lib-card-menu p-2 rounded-xl hover:bg-dark-800 transition-colors">
                        <span class="iconify text-dark-500" data-icon="lucide:more-vertical"></span>
                    </button>
                </div>
                <h3 class="font-bold text-[15px] mb-0.5">${Safe.escapeHtml(lib.name)}</h3>
                ${desc}
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-dark-800/50">
                    <span class="text-dark-500 text-xs flex items-center gap-1">
                        <span class="iconify text-xs" data-icon="lucide:layers"></span>
                        ${countLabel}
                    </span>
                    <span class="text-dark-500 text-xs flex items-center gap-1">
                        <span class="iconify text-xs" data-icon="${visIcon}"></span>
                        ${vis}
                    </span>
                </div>
            </div>
        </div>`;
    },

    // ===== RENDER: LIBRARY DETAIL =====
    async openLibrary(libId) {
        // ⚡ ابحث في الكاش أولاً، ثم في مكتبات الزوار
        let lib = this._cache.libraries.find(l => l.id === libId);
        if (!lib && this._visitorLibraries) {
            lib = this._visitorLibraries.find(l => l.id === libId);
        }
        if (!lib) {
            // ⚡ محاولة أخيرة: جلب المكتبة من Supabase مباشرة
            if (sbOnline) {
                try {
                    const { data } = await sb.from('libraries').select('*').eq('id', libId).single();
                    if (data) lib = data;
                } catch(e) { console.warn('Library fetch failed:', e); }
            }
            if (!lib) { showToast('لا يمكن فتح المكتبة'); return; }
        }

        this._cache.currentLib = lib;
        const items = await this.fetchItems(libId);

        const modal = document.getElementById('libraryDetailModal');
        if (!modal) return;

        // Header
        document.getElementById('libDetailTitle').textContent = lib.name;
        const iconEl = document.getElementById('libDetailIcon');
        iconEl.textContent = lib.icon;
        iconEl.style.background = lib.color + '15';
        iconEl.style.color = lib.color;

        // Stats
        const vis = lib.visibility === 'public' ? 'عام' : lib.visibility === 'followers' ? 'للمتابعين' : 'خاص';
        document.getElementById('libDetailMeta').textContent = `${items.length} عنصر • ${vis}`;

        // Description
        const descEl = document.getElementById('libDetailDesc');
        if (lib.description) { descEl.textContent = lib.description; descEl.classList.remove('hidden'); }
        else { descEl.classList.add('hidden'); }

        // Accent bar
        document.getElementById('libDetailAccent').style.background = lib.color;

        // Items list
        const list = document.getElementById('libDetailItems');
        if (items.length === 0) {
            list.innerHTML = `
                <div class="text-center py-16">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                        <span class="iconify text-3xl text-dark-500" data-icon="lucide:folder-open"></span>
                    </div>
                    <p class="text-dark-300 text-sm font-medium mb-1">المكتبة فارغة</p>
                    <p class="text-dark-500 text-xs mb-5">أضف ملاحظات، مستندات، أو روابط</p>
                    <button onclick="Library.openAddItemModal('${libId}')"
                        class="lib-btn-primary">
                        <span class="iconify" data-icon="lucide:plus"></span>
                        إضافة عنصر
                    </button>
                </div>`;
        } else {
            list.innerHTML = items.map(item => this._buildItemCard(item)).join('');
        }

        // Footer buttons
        document.getElementById('libDetailAddBtn').onclick = () => Library.openAddItemModal(libId);
        document.getElementById('libDetailDeleteBtn').onclick = () => Library.confirmDeleteLibrary(libId);

        // ⚡ زائر: أزرار المالك مخفية
        const isOwner = this._cache.libraries.some(l => l.id === libId);
        document.getElementById('libDetailAddBtn').style.display = isOwner ? '' : 'none';
        document.getElementById('libDetailDeleteBtn').style.display = isOwner ? '' : 'none';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeLibrary(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('libraryDetailModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    _buildItemCard(item) {
        const isFile = item.type === 'document' && item.file_name;
        const isLink = item.type === 'link' && item.url;
        const isImage = item.file_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file_name);

        // Icon & color based on type
        let icon, iconColor, typeLabel;
        switch (item.type) {
            case 'note':
                icon = 'lucide:sticky-note'; iconColor = '#f97316'; typeLabel = 'ملاحظة'; break;
            case 'document':
                if (isFile) {
                    const ext = item.file_name.split('.').pop().toLowerCase();
                    if (ext === 'pdf') { icon = 'lucide:file-text'; iconColor = '#ef4444'; }
                    else if (ext === 'doc' || ext === 'docx') { icon = 'lucide:file-type'; iconColor = '#3b82f6'; }
                    else { icon = 'lucide:file'; iconColor = '#6b7280'; }
                } else { icon = 'lucide:file'; iconColor = '#6b7280'; }
                typeLabel = 'مستند'; break;
            case 'link':
                icon = 'lucide:link'; iconColor = '#8b5cf6'; typeLabel = 'رابط'; break;
            case 'post_reference':
                icon = 'lucide:bookmark'; iconColor = '#22c55e'; typeLabel = 'مرجع'; break;
            default:
                icon = 'lucide:file-text'; iconColor = '#6b7280'; typeLabel = 'عنصر';
        }

        // File size
        let sizeStr = '';
        if (item.file_size) {
            if (item.file_size < 1024) sizeStr = item.file_size + ' B';
            else if (item.file_size < 1048576) sizeStr = (item.file_size / 1024).toFixed(1) + ' KB';
            else sizeStr = (item.file_size / 1048576).toFixed(1) + ' MB';
        }

        // Image preview
        let imagePreview = '';
        if (isImage && item.file_url) {
            imagePreview = `<div class="mt-2 rounded-xl overflow-hidden border border-dark-800">
                <img src="${Safe.escapeHtml(item.file_url)}" class="w-full h-40 object-cover" loading="lazy">
            </div>`;
        }

        // Tags
        const tags = (item.tags && item.tags.length > 0) ?
            `<div class="flex flex-wrap gap-1.5 mt-2">${item.tags.map(t => `<span class="lib-tag">${Safe.escapeHtml(t)}</span>`).join('')}</div>` : '';

        // Content preview
        const content = item.content ? `<p class="text-dark-400 text-xs mt-1.5 line-clamp-2 leading-relaxed">${Safe.escapeHtml(item.content)}</p>` : '';

        // Link badge
        const linkBadge = isLink ? `<a href="${Safe.escapeHtml(item.url)}" target="_blank" rel="noopener"
            class="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors"
            onclick="event.stopPropagation()">
            <span class="iconify text-xs" data-icon="lucide:external-link"></span>
            ${Safe.escapeHtml(item.url.replace(/^https?:\/\/(www\.)?/, '').substring(0, 30))}...
        </a>` : '';

        // File badge
        const fileBadge = isFile ? `<div class="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700">
            <span class="iconify text-lg" data-icon="${icon}" style="color:${iconColor}"></span>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-medium truncate">${Safe.escapeHtml(item.file_name)}</p>
                ${sizeStr ? `<p class="text-dark-500 text-[10px]">${sizeStr}</p>` : ''}
            </div>
            ${item.file_url ? `<a href="${Safe.escapeHtml(item.file_url)}" target="_blank" class="p-1.5 rounded-lg hover:bg-dark-700" onclick="event.stopPropagation()">
                <span class="iconify text-dark-400 text-sm" data-icon="lucide:download"></span>
            </a>` : ''}
        </div>` : '';

        return `
        <div class="lib-item group" onclick="Library.viewItem('${item.id}')">
            <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                     style="background:${iconColor}12">
                    <span class="iconify text-lg" data-icon="${icon}" style="color:${iconColor}"></span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                        <h4 class="font-semibold text-sm truncate">${Safe.escapeHtml(item.title)}</h4>
                        ${item.is_pinned ? '<span class="iconify text-brand-400 text-xs" data-icon="lucide:pin"></span>' : ''}
                    </div>
                    <div class="flex items-center gap-2 text-dark-500 text-[11px]">
                        <span>${typeLabel}</span>
                        ${sizeStr ? `<span>•</span><span>${sizeStr}</span>` : ''}
                        <span>•</span>
                        <span>${this._timeAgo(item.created_at)}</span>
                    </div>
                    ${content}
                    ${imagePreview}
                    ${fileBadge}
                    ${linkBadge}
                    ${tags}
                </div>
            </div>
            <!-- Actions (mobile: always visible, desktop: hover) -->
            <div class="lib-item-actions">
                <button onclick="event.stopPropagation();Library.editItem('${item.id}')" class="lib-action-btn" title="تعديل">
                    <span class="iconify" data-icon="lucide:pencil"></span>
                </button>
                <button onclick="event.stopPropagation();Library.confirmDeleteItem('${item.id}','${item.library_id}')" class="lib-action-btn lib-action-danger" title="حذف">
                    <span class="iconify" data-icon="lucide:trash-2"></span>
                </button>
            </div>
        </div>`;
    },

    // ===== MODALS: CREATE LIBRARY =====
    openCreateLibraryModal() {
        if (!requireAuth()) return;
        const modal = document.getElementById('createLibraryModal');
        if (!modal) return;
        document.getElementById('createLibName').value = '';
        document.getElementById('createLibDesc').value = '';
        document.getElementById('createLibIcon').value = '📚';
        document.getElementById('createLibColor').value = '#f97316';
        document.getElementById('createLibVisibility').value = 'public';
        document.getElementById('createLibIconBtn').textContent = '📚';
        document.querySelectorAll('.color-pick').forEach(c => c.classList.remove('ring-2', 'ring-white'));
        document.querySelector('.color-pick[data-color="#f97316"]')?.classList.add('ring-2', 'ring-white');
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector('.emoji-btn')?.classList.add('selected');
        document.getElementById('emojiPicker')?.classList.add('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('createLibName')?.focus(), 300);
    },

    closeCreateLibraryModal(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('createLibraryModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    async submitCreateLibrary() {
        if (!requireAuth()) return;
        const name = document.getElementById('createLibName').value.trim();
        if (!name) { showToast('أدخل اسم المكتبة'); document.getElementById('createLibName').focus(); return; }

        const libData = {
            name,
            description: document.getElementById('createLibDesc').value.trim(),
            icon: document.getElementById('createLibIcon').value || '📚',
            color: document.getElementById('createLibColor').value || '#f97316',
            visibility: document.getElementById('createLibVisibility').value || 'public'
        };

        const btn = document.getElementById('createLibSubmitBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lib-spinner"></span> جاري الإنشاء...'; }

        try {
            await this.createLibrary(libData);
            this.renderProfileLibraries(sbUser?.id || 'local');
            this.closeCreateLibraryModal();
            showToast('تم إنشاء المكتبة ✓');
        } catch (e) {
            showToast('حدث خطأ، حاول مرة أخرى');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="iconify" data-icon="lucide:plus"></span> إنشاء المكتبة'; }
        }
    },

    // ===== MODALS: ADD ITEM =====
    openAddItemModal(libId) {
        if (!requireAuth()) return;
        const modal = document.getElementById('addItemModal');
        if (!modal) return;
        document.getElementById('addItemLibId').value = libId;
        document.getElementById('addItemTitle').value = '';
        document.getElementById('addItemContent').value = '';
        document.getElementById('addItemUrl').value = '';
        document.getElementById('addItemTags').value = '';
        document.getElementById('addItemType').value = 'note';
        this._clearFilePreview();
        this._toggleItemFields('note');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('addItemTitle')?.focus(), 300);
    },

    closeAddItemModal(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('addItemModal')?.classList.remove('active');
        document.body.style.overflow = '';
        this._clearFilePreview();
    },

    _toggleItemFields(type) {
        const urlRow = document.getElementById('addItemUrlRow');
        const contentRow = document.getElementById('addItemContentRow');
        const fileRow = document.getElementById('addItemFileRow');
        if (urlRow) urlRow.style.display = type === 'link' ? '' : 'none';
        if (contentRow) contentRow.style.display = (type === 'note' || type === 'document') ? '' : 'none';
        if (fileRow) fileRow.style.display = type === 'document' ? '' : 'none';
    },

    async submitAddItem() {
        if (!requireAuth()) return;
        const libId = document.getElementById('addItemLibId').value;
        const title = document.getElementById('addItemTitle').value.trim();
        if (!title) { showToast('أدخل عنوان العنصر'); document.getElementById('addItemTitle').focus(); return; }

        const itemData = {
            type: document.getElementById('addItemType').value,
            title,
            content: document.getElementById('addItemContent').value.trim(),
            url: document.getElementById('addItemUrl').value.trim(),
            tags: document.getElementById('addItemTags').value.trim().split(',').map(t => t.trim()).filter(t => t)
        };

        // Handle file upload with progress
        if (Library._cache.currentFile) {
            const file = Library._cache.currentFile;
            const btn = document.getElementById('addItemSubmitBtn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lib-spinner"></span> جاري الرفع...'; }

            // Show progress
            Library._showUploadProgress(0, 'جاري تحضير الملف...', false, false);

            try {
                // Simulate progress stages for base64 conversion
                Library._showUploadProgress(20, 'جاري قراءة الملف...', false, false);

                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        Library._showUploadProgress(80, 'جاري المعالجة...', false, false);
                        resolve(reader.result);
                    };
                    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
                    reader.readAsDataURL(file);
                });

                Library._showUploadProgress(100, 'تم الرفع بنجاح ✓', false, true);
                itemData.file_url = dataUrl;
                itemData.file_name = file.name;
                itemData.file_size = file.size;
                if (file.type.startsWith('image/')) itemData.cover_image = dataUrl;

                // Short delay to show success state
                await new Promise(r => setTimeout(r, 600));
            } catch (e) {
                Library._showUploadProgress(100, 'فشل رفع الملف: ' + e.message, true, false);
                showToast('فشل رفع الملف');
                if (btn) { btn.disabled = false; btn.innerHTML = '<span class="iconify" data-icon="lucide:plus"></span> إضافة العنصر'; }
                return;
            }
        }

        const btn = document.getElementById('addItemSubmitBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lib-spinner"></span> جاري الإضافة...'; }

        try {
            await this.createItem(libId, itemData);
            this.openLibrary(libId);
            this.closeAddItemModal();
            showToast('تم إضافة العنصر ✓');
        } catch (e) {
            showToast('حدث خطأ');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="iconify" data-icon="lucide:plus"></span> إضافة العنصر'; }
        }
    },

    // ===== MODALS: EDIT ITEM =====
    editItem(itemId) {
        if (!requireAuth()) return;
        let item = null;
        for (const libId in this._cache.items) {
            item = this._cache.items[libId].find(i => i.id === itemId);
            if (item) break;
        }
        if (!item) return;

        const modal = document.getElementById('editItemModal');
        if (!modal) return;

        document.getElementById('editItemId').value = itemId;
        document.getElementById('editItemLibId').value = item.library_id;
        document.getElementById('editItemTitle').value = item.title;
        document.getElementById('editItemContent').value = item.content || '';
        document.getElementById('editItemUrl').value = item.url || '';
        document.getElementById('editItemTags').value = (item.tags || []).join(', ');

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeEditItemModal(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('editItemModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    async submitEditItem() {
        if (!requireAuth()) return;
        const itemId = document.getElementById('editItemId').value;
        const libId = document.getElementById('editItemLibId').value;
        const title = document.getElementById('editItemTitle').value.trim();
        if (!title) { showToast('أدخل عنوان العنصر'); return; }

        const updates = {
            title,
            content: document.getElementById('editItemContent').value.trim(),
            url: document.getElementById('editItemUrl').value.trim(),
            tags: document.getElementById('editItemTags').value.trim().split(',').map(t => t.trim()).filter(t => t)
        };

        const btn = document.getElementById('editItemSubmitBtn');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lib-spinner"></span> جاري الحفظ...'; }

        try {
            await this.updateItem(itemId, updates);
            this.openLibrary(libId);
            this.closeEditItemModal();
            showToast('تم تحديث العنصر ✓');
        } catch (e) {
            showToast('حدث خطأ');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="iconify" data-icon="lucide:check"></span> حفظ التعديلات'; }
        }
    },

    // ===== VIEW ITEM (detail modal) =====
    viewItem(itemId) {
        let item = null;
        for (const libId in this._cache.items) {
            item = this._cache.items[libId].find(i => i.id === itemId);
            if (item) break;
        }
        if (!item) return;

        const modal = document.getElementById('itemDetailModal');
        if (!modal) return;

        // Title
        document.getElementById('itemDetailTitle').textContent = item.title;

        // Type badge
        const typeMap = { note: { icon: 'lucide:sticky-note', color: '#f97316', label: 'ملاحظة' },
            document: { icon: 'lucide:file', color: '#3b82f6', label: 'مستند' },
            link: { icon: 'lucide:link', color: '#8b5cf6', label: 'رابط' },
            post_reference: { icon: 'lucide:bookmark', color: '#22c55e', label: 'مرجع' } };
        const t = typeMap[item.type] || typeMap.note;
        document.getElementById('itemDetailTypeBadge').innerHTML =
            `<span class="iconify text-xs" data-icon="${t.icon}" style="color:${t.color}"></span> ${t.label}`;

        // Content
        const contentEl = document.getElementById('itemDetailContent');
        if (item.content) { contentEl.textContent = item.content; contentEl.classList.remove('hidden'); }
        else { contentEl.classList.add('hidden'); }

        // File
        const fileEl = document.getElementById('itemDetailFile');
        if (item.file_name) {
            const ext = item.file_name.split('.').pop().toUpperCase();
            fileEl.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-dark-800 rounded-xl border border-dark-700">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:${t.color}15">
                        <span class="iconify text-xl" data-icon="${t.icon}" style="color:${t.color}"></span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate">${Safe.escapeHtml(item.file_name)}</p>
                        <p class="text-dark-500 text-xs">${ext}${item.file_size ? ' • ' + (item.file_size < 1048576 ? (item.file_size/1024).toFixed(1)+' KB' : (item.file_size/1048576).toFixed(1)+' MB') : ''}</p>
                    </div>
                    ${item.file_url ? `<a href="${Safe.escapeHtml(item.file_url)}" target="_blank" class="lib-btn-secondary text-xs py-1.5 px-3">
                        <span class="iconify" data-icon="lucide:download"></span> تحميل
                    </a>` : ''}
                </div>`;
            fileEl.classList.remove('hidden');
        } else { fileEl.classList.add('hidden'); }

        // Link
        const linkEl = document.getElementById('itemDetailLink');
        if (item.url) {
            linkEl.innerHTML = `<a href="${Safe.escapeHtml(item.url)}" target="_blank" rel="noopener"
                class="flex items-center gap-2 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 hover:bg-purple-500/15 transition-colors">
                <span class="iconify" data-icon="lucide:external-link"></span>
                <span class="text-sm truncate">${Safe.escapeHtml(item.url)}</span>
            </a>`;
            linkEl.classList.remove('hidden');
        } else { linkEl.classList.add('hidden'); }

        // Image preview
        const imgEl = document.getElementById('itemDetailImage');
        if (item.cover_image) {
            imgEl.innerHTML = `<img src="${Safe.escapeHtml(item.cover_image)}" class="w-full max-h-64 object-cover rounded-xl border border-dark-700">`;
            imgEl.classList.remove('hidden');
        } else { imgEl.classList.add('hidden'); }

        // Tags
        const tagsEl = document.getElementById('itemDetailTags');
        if (item.tags && item.tags.length > 0) {
            tagsEl.innerHTML = item.tags.map(t => `<span class="lib-tag">${Safe.escapeHtml(t)}</span>`).join('');
            tagsEl.classList.remove('hidden');
        } else { tagsEl.classList.add('hidden'); }

        // Date
        document.getElementById('itemDetailDate').textContent = this._timeAgo(item.created_at);

        // Edit button
        document.getElementById('itemDetailEditBtn').onclick = () => {
            modal.classList.remove('active');
            Library.editItem(itemId);
        };

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeItemDetail(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('itemDetailModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    // ===== DELETE =====
    confirmDeleteItem(itemId, libId) {
        if (!requireAuth()) return;
        const modal = document.getElementById('confirmModal');
        if (modal) {
            document.getElementById('confirmTitle').textContent = 'حذف العنصر';
            document.getElementById('confirmMsg').textContent = 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع.';
            document.getElementById('confirmOkBtn').onclick = () => {
                Library.deleteItem(itemId, libId);
                Library.openLibrary(libId);
                modal.classList.remove('active');
                showToast('تم حذف العنصر');
            };
            modal.classList.add('active');
        } else if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
            this.deleteItem(itemId, libId);
            this.openLibrary(libId);
            showToast('تم حذف العنصر');
        }
    },

    confirmDeleteLibrary(libId) {
        if (!requireAuth()) return;
        const modal = document.getElementById('confirmModal');
        if (modal) {
            document.getElementById('confirmTitle').textContent = 'حذف المكتبة';
            document.getElementById('confirmMsg').textContent = 'هل أنت متأكد من حذف هذه المكتبة وجميع محتوياتها؟ لا يمكن التراجع.';
            document.getElementById('confirmOkBtn').onclick = () => {
                Library.deleteLibrary(libId);
                Library.closeLibrary();
                Library.renderProfileLibraries(sbUser?.id || 'local');
                modal.classList.remove('active');
                showToast('تم حذف المكتبة');
            };
            modal.classList.add('active');
        } else if (confirm('هل أنت متأكد من حذف هذه المكتبة؟')) {
            this.deleteLibrary(libId);
            this.closeLibrary();
            this.renderProfileLibraries(sbUser?.id || 'local');
            showToast('تم حذف المكتبة');
        }
    },

    // ===== LIBRARY CONTEXT MENU =====
    openMenu(libId) {
        // ⚡ ابحث في كاش المستخدم أولاً، ثم في مكتبات الزوار
        let lib = this._cache.libraries.find(l => l.id === libId);
        const isVisitor = !lib && this._visitorLibraries;
        if (!lib && isVisitor) {
            lib = this._visitorLibraries.find(l => l.id === libId);
        }
        if (!lib) return;

        const modal = document.getElementById('libMenuModal');
        if (!modal) return;

        document.getElementById('libMenuTitle').textContent = lib.name;
        document.getElementById('libMenuIcon').textContent = lib.icon;
        document.getElementById('libMenuIcon').style.background = lib.color + '15';
        document.getElementById('libMenuIcon').style.color = lib.color;

        // ⚡ زائر: أظهر خيارات المشاهدة فقط
        if (isVisitor) {
            document.getElementById('libMenuEdit').style.display = 'none';
            document.getElementById('libMenuVisibility').style.display = 'none';
            document.getElementById('libMenuDelete').style.display = 'none';
            document.getElementById('libMenuAdd').innerHTML = '<span class="iconify" data-icon="lucide:eye"></span> عرض المحتوى';
            document.getElementById('libMenuAdd').onclick = () => { modal.classList.remove('active'); Library.openLibrary(libId); };
        } else {
            // المالك: أظهر كل الخيارات
            document.getElementById('libMenuEdit').style.display = '';
            document.getElementById('libMenuVisibility').style.display = '';
            document.getElementById('libMenuDelete').style.display = '';
            document.getElementById('libMenuAdd').innerHTML = '<span class="iconify" data-icon="lucide:plus-circle"></span> إضافة عنصر';

            // Buttons
            document.getElementById('libMenuEdit').onclick = () => { modal.classList.remove('active'); Library._editLibraryPrompt(libId); };
            document.getElementById('libMenuAdd').onclick = () => { modal.classList.remove('active'); Library.openAddItemModal(libId); };
            document.getElementById('libMenuVisibility').innerHTML = lib.visibility === 'public'
                ? '<span class="iconify" data-icon="lucide:lock"></span> جعلها خاصة'
                : '<span class="iconify" data-icon="lucide:globe"></span> جعلها عامة';
            document.getElementById('libMenuVisibility').onclick = async () => {
                const newVis = lib.visibility === 'public' ? 'private' : 'public';
                await Library.updateLibrary(libId, { visibility: newVis });
                Library.renderProfileLibraries(sbUser?.id || 'local');
                modal.classList.remove('active');
                showToast('تم تحديث الخصوصية');
            };
            document.getElementById('libMenuDelete').onclick = () => { modal.classList.remove('active'); Library.confirmDeleteLibrary(libId); };
        }

        modal.classList.add('active');
    },

    closeMenu(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('libMenuModal')?.classList.remove('active');
    },

    _editLibraryPrompt(libId) {
        const lib = this._cache.libraries.find(l => l.id === libId);
        if (!lib) return;

        const modal = document.getElementById('editLibraryModal');
        if (!modal) return;

        document.getElementById('editLibId').value = libId;
        document.getElementById('editLibName').value = lib.name;
        document.getElementById('editLibDesc').value = lib.description || '';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeEditLibraryModal(e) {
        if (e && e.target && e.target !== e.currentTarget) return;
        document.getElementById('editLibraryModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    async submitEditLibrary() {
        if (!requireAuth()) return;
        const libId = document.getElementById('editLibId').value;
        const name = document.getElementById('editLibName').value.trim();
        if (!name) { showToast('أدخل اسم المكتبة'); return; }

        await Library.updateLibrary(libId, {
            name,
            description: document.getElementById('editLibDesc').value.trim()
        });
        Library.renderProfileLibraries(sbUser?.id || 'local');
        Library.closeEditLibraryModal();
        showToast('تم تحديث المكتبة ✓');
    },

    // ===== PICKER HELPERS =====
    _pickEmoji(btn, emoji) {
        document.getElementById('createLibIcon').value = emoji;
        document.getElementById('createLibIconBtn').textContent = emoji;
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('emojiPicker')?.classList.add('hidden');
    },

    _pickColor(btn) {
        const color = btn.dataset.color;
        document.getElementById('createLibColor').value = color;
        document.querySelectorAll('.color-pick').forEach(c => c.classList.remove('ring-2', 'ring-white'));
        btn.classList.add('ring-2', 'ring-white');
    },

    // ===== LOCAL STORAGE FALLBACK =====
    _getLocalLibraries(profileId) {
        try { const d = Safe.getJSON('lawbook_libraries_' + profileId, []); this._cache.libraries = d; return d; } catch (e) { return []; }
    },
    _saveLocalLibraries(profileId, data) { Safe.setJSON('lawbook_libraries_' + profileId, data); },
    _createLocalLibrary(libData) {
        const n = { id: 'lib_' + Date.now(), owner_id: 'local', name: libData.name, description: libData.description || '', icon: libData.icon || '📚', color: libData.color || '#f97316', visibility: libData.visibility || 'public', items_count: 0, followers_count: 0, views_count: 0, is_pinned: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        this._cache.libraries.unshift(n); this._saveLocalLibraries('local', this._cache.libraries); return n;
    },
    _updateLocalLibrary(libId, u) {
        const i = this._cache.libraries.findIndex(l => l.id === libId);
        if (i !== -1) { Object.assign(this._cache.libraries[i], u, { updated_at: new Date().toISOString() }); this._saveLocalLibraries('local', this._cache.libraries); return this._cache.libraries[i]; } return null;
    },
    _deleteLocalLibrary(libId) { this._cache.libraries = this._cache.libraries.filter(l => l.id !== libId); delete this._cache.items[libId]; this._saveLocalLibraries('local', this._cache.libraries); },
    _getLocalItems(libId) { try { const d = Safe.getJSON('lawbook_items_' + libId, []); this._cache.items[libId] = d; return d; } catch (e) { return []; } },
    _saveLocalItems(libId, data) { Safe.setJSON('lawbook_items_' + libId, data); },
    _createLocalItem(libId, d) {
        const n = { id: 'item_' + Date.now(), library_id: libId, author_id: 'local', type: d.type || 'note', title: d.title, content: d.content || '', url: d.url || '', file_url: d.file_url || '', file_name: d.file_name || '', file_size: d.file_size || 0, cover_image: d.cover_image || '', tags: d.tags || [], category: 'general', is_pinned: false, post_id: null, sort_order: 0, views_count: 0, saves_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        if (!this._cache.items[libId]) this._cache.items[libId] = [];
        this._cache.items[libId].unshift(n); this._saveLocalItems(libId, this._cache.items[libId]); return n;
    },
    _updateLocalItem(itemId, u) {
        for (const l in this._cache.items) { const i = this._cache.items[l].findIndex(x => x.id === itemId); if (i !== -1) { Object.assign(this._cache.items[l][i], u, { updated_at: new Date().toISOString() }); this._saveLocalItems(l, this._cache.items[l]); return this._cache.items[l][i]; } } return null;
    },
    _deleteLocalItem(itemId, libId) { if (this._cache.items[libId]) { this._cache.items[libId] = this._cache.items[libId].filter(i => i.id !== itemId); this._saveLocalItems(libId, this._cache.items[libId]); } },
    _saveLocalItem() {},

    // ===== UTILITIES =====
    _timeAgo(dateStr) {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
        if (m < 1) return 'الآن';
        if (m < 60) return `منذ ${m} د`;
        if (h < 24) return `منذ ${h} س`;
        if (d < 30) return `منذ ${d} ي`;
        return new Date(dateStr).toLocaleDateString('ar-SA');
    }
};
