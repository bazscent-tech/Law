// ============================================================
// ===== PERSONAL LIBRARY MODULE ==============================
// ============================================================

const Library = {
    _cache: { libraries: [], items: {}, currentLib: null },
    _initialized: false,

    // ===== INITIALIZATION =====
    async init() {
        if (this._initialized) return;
        this._initialized = true;
        console.log('📚 Library module initialized');
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
            console.warn('Library fetch failed, using local:', e.message);
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
            console.warn('Library create failed, using local:', e.message);
            return this._createLocalLibrary(libData);
        }
    },

    async updateLibrary(libId, updates) {
        if (!sbOnline) return this._updateLocalLibrary(libId, updates);
        try {
            const { data, error } = await sb.from('libraries')
                .update(updates)
                .eq('id', libId)
                .select().single();
            if (error) throw error;
            const idx = this._cache.libraries.findIndex(l => l.id === libId);
            if (idx !== -1) this._cache.libraries[idx] = data;
            return data;
        } catch (e) {
            console.warn('Library update failed:', e.message);
            return this._updateLocalLibrary(libId, updates);
        }
    },

    async deleteLibrary(libId) {
        if (!sbOnline) return this._deleteLocalLibrary(libId);
        try {
            const { error } = await sb.from('libraries').delete().eq('id', libId);
            if (error) throw error;
            this._cache.libraries = this._cache.libraries.filter(l => l.id !== libId);
            delete this._cache.items[libId];
        } catch (e) {
            console.warn('Library delete failed:', e.message);
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
            console.warn('Items fetch failed, using local:', e.message);
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
            console.warn('Item create failed, using local:', e.message);
            return this._createLocalItem(libId, itemData);
        }
    },

    async updateItem(itemId, updates) {
        if (!sbOnline) return this._updateLocalItem(itemId, updates);
        try {
            const { data, error } = await sb.from('library_items')
                .update(updates)
                .eq('id', itemId)
                .select().single();
            if (error) throw error;
            // Update cache
            for (const libId in this._cache.items) {
                const idx = this._cache.items[libId].findIndex(i => i.id === itemId);
                if (idx !== -1) { this._cache.items[libId][idx] = data; break; }
            }
            return data;
        } catch (e) {
            console.warn('Item update failed:', e.message);
            return this._updateLocalItem(itemId, updates);
        }
    },

    async deleteItem(itemId, libId) {
        if (!sbOnline) return this._deleteLocalItem(itemId, libId);
        try {
            const { error } = await sb.from('library_items').delete().eq('id', itemId);
            if (error) throw error;
            if (this._cache.items[libId]) {
                this._cache.items[libId] = this._cache.items[libId].filter(i => i.id !== itemId);
            }
        } catch (e) {
            console.warn('Item delete failed:', e.message);
            this._deleteLocalItem(itemId, libId);
        }
    },

    // ===== SAVE ITEM TO LIBRARY =====
    async saveItem(itemId, libId) {
        if (!sbOnline || !sbUser) return this._saveLocalItem(itemId, libId);
        try {
            const { data, error } = await sb.from('library_saves').insert({
                user_id: sbUser.id,
                item_id: itemId,
                library_id: libId
            }).select().single();
            if (error) throw error;
            return data;
        } catch (e) {
            console.warn('Save failed:', e.message);
        }
    },

    async unsaveItem(itemId) {
        if (!sbOnline || !sbUser) return;
        try {
            await sb.from('library_saves').delete()
                .eq('user_id', sbUser.id).eq('item_id', itemId);
        } catch (e) {
            console.warn('Unsave failed:', e.message);
        }
    },

    async getSavedItems() {
        if (!sbOnline || !sbUser) return [];
        try {
            const { data } = await sb.from('library_saves')
                .select('*, library_items(*, libraries(*))')
                .eq('user_id', sbUser.id)
                .order('created_at', { ascending: false });
            return data || [];
        } catch (e) {
            return [];
        }
    },

    // ===== FOLLOW LIBRARY =====
    async toggleFollowLibrary(libId) {
        if (!sbOnline || !sbUser) return null;
        try {
            const { data: existing } = await sb.from('library_follows')
                .select('id').eq('user_id', sbUser.id).eq('library_id', libId).maybeSingle();
            if (existing) {
                await sb.from('library_follows').delete().eq('id', existing.id);
                // Decrement count
                const lib = this._cache.libraries.find(l => l.id === libId);
                if (lib) lib.followers_count = Math.max((lib.followers_count || 1) - 1, 0);
                await sb.from('libraries').update({ followers_count: sb.rpc ? undefined : (lib?.followers_count || 0) }).eq('id', libId);
                return false;
            } else {
                await sb.from('library_follows').insert({ user_id: sbUser.id, library_id: libId });
                const lib = this._cache.libraries.find(l => l.id === libId);
                if (lib) lib.followers_count = (lib.followers_count || 0) + 1;
                await sb.from('libraries').update({ followers_count: lib?.followers_count || 1 }).eq('id', libId);
                return true;
            }
        } catch (e) {
            console.warn('Follow toggle failed:', e.message);
            return null;
        }
    },

    async isFollowingLibrary(libId) {
        if (!sbOnline || !sbUser) return false;
        try {
            const { data } = await sb.from('library_follows')
                .select('id').eq('user_id', sbUser.id).eq('library_id', libId).maybeSingle();
            return !!data;
        } catch (e) {
            return false;
        }
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
        const desc = lib.description ? `<p class="px-4 pb-3 text-dark-300 text-xs line-clamp-2">${Safe.escapeHtml(lib.description)}</p>` : '';
        return `
        <div class="library-card bg-dark-900/80 border border-dark-800/50 rounded-2xl overflow-hidden hover:border-brand-500/30 transition-all cursor-pointer"
             onclick="Library.openLibrary('${lib.id}')">
            <div class="p-4 flex items-start justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                         style="background: ${lib.color}20; color: ${lib.color}">
                        ${lib.icon}
                    </div>
                    <div>
                        <h3 class="font-bold text-sm">${Safe.escapeHtml(lib.name)}</h3>
                        <p class="text-dark-400 text-xs">${lib.items_count || 0} عنصر • ${vis}</p>
                    </div>
                </div>
                <button onclick="event.stopPropagation();Library.openMenu('${lib.id}')"
                    class="p-2 rounded-lg hover:bg-dark-800 transition-colors">
                    <span class="iconify text-dark-400" data-icon="lucide:more-horizontal"></span>
                </button>
            </div>
            ${desc}
            <div class="px-4 pb-4 flex items-center gap-4 text-dark-500 text-xs">
                <span><span class="iconify text-xs mr-1" data-icon="lucide:eye"></span>${lib.views_count || 0}</span>
                <span><span class="iconify text-xs mr-1" data-icon="lucide:bookmark"></span>${lib.followers_count || 0}</span>
                <span><span class="iconify text-xs mr-1" data-icon="lucide:clock"></span>${this._timeAgo(lib.created_at)}</span>
            </div>
        </div>`;
    },

    // ===== RENDER: LIBRARY DETAIL =====
    async openLibrary(libId) {
        const lib = this._cache.libraries.find(l => l.id === libId);
        if (!lib) return;

        this._cache.currentLib = lib;
        const items = await this.fetchItems(libId);

        // Show library detail modal
        const modal = document.getElementById('libraryDetailModal');
        if (!modal) return;

        document.getElementById('libraryDetailTitle').textContent = lib.name;
        document.getElementById('libraryDetailIcon').textContent = lib.icon;
        document.getElementById('libraryDetailIcon').style.background = lib.color + '20';
        document.getElementById('libraryDetailIcon').style.color = lib.color;
        document.getElementById('libraryDetailCount').textContent = `${items.length} عنصر`;

        const vis = lib.visibility === 'public' ? 'عام' : lib.visibility === 'followers' ? 'للمتابعين' : 'خاص';
        document.getElementById('libraryDetailVis').textContent = vis;

        if (lib.description) {
            document.getElementById('libraryDetailDesc').textContent = lib.description;
            document.getElementById('libraryDetailDesc').classList.remove('hidden');
        } else {
            document.getElementById('libraryDetailDesc').classList.add('hidden');
        }

        const list = document.getElementById('libraryItemsList');
        if (items.length === 0) {
            list.innerHTML = `
                <div class="text-center py-12 text-dark-400">
                    <span class="iconify text-4xl mb-3 block" data-icon="lucide:package-open"></span>
                    <p class="text-sm mb-4">لا توجد عناصر بعد</p>
                    <button onclick="Library.openAddItemModal('${libId}')"
                        class="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all">
                        <span class="iconify mr-1" data-icon="lucide:plus"></span>أضف أول عنصر
                    </button>
                </div>`;
        } else {
            list.innerHTML = items.map(item => this._buildItemCard(item)).join('');
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeLibrary() {
        const modal = document.getElementById('libraryDetailModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    _buildItemCard(item) {
        const typeIcon = { note: 'lucide:file-text', document: 'lucide:file', link: 'lucide:link', post_reference: 'lucide:bookmark' };
        const typeLabel = { note: 'ملاحظة', document: 'مستند', link: 'رابط', post_reference: 'مرجع منشور' };
        const icon = typeIcon[item.type] || 'lucide:file-text';
        const label = typeLabel[item.type] || 'عنصر';

        let extra = '';
        if (item.url) {
            extra = `<a href="${Safe.escapeHtml(item.url)}" target="_blank" rel="noopener" class="text-brand-400 text-xs hover:underline flex items-center gap-1 mt-1" onclick="event.stopPropagation()">
                <span class="iconify text-xs" data-icon="lucide:external-link"></span>فتح الرابط
            </a>`;
        }
        if (item.file_name) {
            extra = `<span class="text-dark-500 text-xs flex items-center gap-1 mt-1">
                <span class="iconify text-xs" data-icon="lucide:paperclip"></span>${Safe.escapeHtml(item.file_name)}
            </span>`;
        }

        const tags = (item.tags && item.tags.length > 0) ?
            `<div class="flex flex-wrap gap-1 mt-2">${item.tags.map(t => `<span class="hashtag text-[10px]">${Safe.escapeHtml(t)}</span>`).join('')}</div>` : '';

        return `
        <div class="library-item flex items-start gap-3 p-3 rounded-xl hover:bg-dark-800/50 transition-colors cursor-pointer group"
             onclick="Library.viewItem('${item.id}')">
            <div class="w-10 h-10 rounded-xl bg-dark-800 flex items-center justify-center shrink-0">
                <span class="iconify text-dark-400" data-icon="${icon}"></span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-sm truncate">${Safe.escapeHtml(item.title)}</h4>
                    ${item.is_pinned ? '<span class="iconify text-brand-400 text-xs" data-icon="lucide:pin"></span>' : ''}
                </div>
                <p class="text-dark-400 text-xs">${label} • ${this._timeAgo(item.created_at)}</p>
                ${item.content ? `<p class="text-dark-300 text-xs mt-1 line-clamp-2">${Safe.escapeHtml(item.content)}</p>` : ''}
                ${extra}
                ${tags}
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="event.stopPropagation();Library.editItem('${item.id}')"
                    class="p-1.5 rounded-lg hover:bg-dark-700 transition-colors">
                    <span class="iconify text-dark-400 text-sm" data-icon="lucide:pencil"></span>
                </button>
                <button onclick="event.stopPropagation();Library.confirmDeleteItem('${item.id}','${item.library_id}')"
                    class="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors">
                    <span class="iconify text-red-400 text-sm" data-icon="lucide:trash-2"></span>
                </button>
            </div>
        </div>`;
    },

    // ===== MODALS =====
    openCreateLibraryModal() {
        const modal = document.getElementById('createLibraryModal');
        if (!modal) return;
        document.getElementById('createLibName').value = '';
        document.getElementById('createLibDesc').value = '';
        document.getElementById('createLibIcon').value = '📚';
        document.getElementById('createLibColor').value = '#f97316';
        document.getElementById('createLibVisibility').value = 'public';
        // Reset color preview
        document.querySelectorAll('.color-pick').forEach(c => c.classList.remove('ring-2', 'ring-white'));
        document.querySelector('.color-pick[data-color="#f97316"]')?.classList.add('ring-2', 'ring-white');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeCreateLibraryModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('createLibraryModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    async submitCreateLibrary() {
        const name = document.getElementById('createLibName').value.trim();
        if (!name) { showToast('أدخل اسم المكتبة'); return; }

        const libData = {
            name,
            description: document.getElementById('createLibDesc').value.trim(),
            icon: document.getElementById('createLibIcon').value || '📚',
            color: document.getElementById('createLibColor').value || '#f97316',
            visibility: document.getElementById('createLibVisibility').value || 'public'
        };

        const btn = document.querySelector('#createLibraryModal .bg-brand-500');
        if (btn) { btn.disabled = true; btn.textContent = 'جاري الإنشاء...'; }

        try {
            await this.createLibrary(libData);
            this.renderProfileLibraries(sbUser?.id);
            this.closeCreateLibraryModal();
            showToast('تم إنشاء المكتبة ✓');
        } catch (e) {
            showToast('حدث خطأ');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'إنشاء المكتبة'; }
        }
    },

    openAddItemModal(libId) {
        const modal = document.getElementById('addItemModal');
        if (!modal) return;
        document.getElementById('addItemLibId').value = libId;
        document.getElementById('addItemTitle').value = '';
        document.getElementById('addItemContent').value = '';
        document.getElementById('addItemUrl').value = '';
        document.getElementById('addItemTags').value = '';
        document.getElementById('addItemType').value = 'note';
        this._toggleItemFields('note');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    closeAddItemModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('addItemModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    _toggleItemFields(type) {
        const urlRow = document.getElementById('addItemUrlRow');
        const contentRow = document.getElementById('addItemContentRow');
        if (urlRow) urlRow.style.display = type === 'link' ? '' : 'none';
        if (contentRow) contentRow.style.display = (type === 'note' || type === 'document') ? '' : 'none';
    },

    async submitAddItem() {
        const libId = document.getElementById('addItemLibId').value;
        const title = document.getElementById('addItemTitle').value.trim();
        if (!title) { showToast('أدخل عنوان العنصر'); return; }

        const itemData = {
            type: document.getElementById('addItemType').value,
            title,
            content: document.getElementById('addItemContent').value.trim(),
            url: document.getElementById('addItemUrl').value.trim(),
            tags: document.getElementById('addItemTags').value.trim()
                .split(',').map(t => t.trim()).filter(t => t)
        };

        const btn = document.querySelector('#addItemModal .bg-brand-500');
        if (btn) { btn.disabled = true; btn.textContent = 'جاري الإضافة...'; }

        try {
            await this.createItem(libId, itemData);
            // Refresh library detail
            this.openLibrary(libId);
            this.closeAddItemModal();
            showToast('تم إضافة العنصر ✓');
        } catch (e) {
            showToast('حدث خطأ');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'إضافة العنصر'; }
        }
    },

    // ===== EDIT ITEM =====
    editItem(itemId) {
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
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('editItemModal')?.classList.remove('active');
        document.body.style.overflow = '';
    },

    async submitEditItem() {
        const itemId = document.getElementById('editItemId').value;
        const libId = document.getElementById('editItemLibId').value;
        const title = document.getElementById('editItemTitle').value.trim();
        if (!title) { showToast('أدخل عنوان العنصر'); return; }

        const updates = {
            title,
            content: document.getElementById('editItemContent').value.trim(),
            url: document.getElementById('editItemUrl').value.trim(),
            tags: document.getElementById('editItemTags').value.trim()
                .split(',').map(t => t.trim()).filter(t => t)
        };

        try {
            await this.updateItem(itemId, updates);
            this.openLibrary(libId);
            this.closeEditItemModal();
            showToast('تم تحديث العنصر ✓');
        } catch (e) {
            showToast('حدث خطأ');
        }
    },

    // ===== DELETE =====
    confirmDeleteItem(itemId, libId) {
        if (confirm('هل أنت متأكد من حذف هذا العنصر؟')) {
            this.deleteItem(itemId, libId);
            this.openLibrary(libId);
            showToast('تم حذف العنصر');
        }
    },

    confirmDeleteLibrary(libId) {
        if (confirm('هل أنت متأكد من حذف هذه المكتبة؟ لا يمكن التراجع.')) {
            this.deleteLibrary(libId);
            this.closeLibrary();
            this.renderProfileLibraries(sbUser?.id);
            showToast('تم حذف المكتبة');
        }
    },

    // ===== LIBRARY MENU =====
    openMenu(libId) {
        const lib = this._cache.libraries.find(l => l.id === libId);
        if (!lib) return;

        const action = prompt(
            `مكتبة: ${lib.name}\n\nاختر:\n1 - تعديل\n2 - حذف\n3 - إضافة عنصر\n4 - ${lib.visibility === 'public' ? 'جعلها خاصة' : 'جعلها عامة'}`
        );

        switch (action) {
            case '1': this._editLibraryPrompt(libId); break;
            case '2': this.confirmDeleteLibrary(libId); break;
            case '3': this.openAddItemModal(libId); break;
            case '4':
                this.updateLibrary(libId, { visibility: lib.visibility === 'public' ? 'private' : 'public' });
                this.renderProfileLibraries(sbUser?.id);
                showToast('تم تحديث الخصوصية');
                break;
        }
    },

    _editLibraryPrompt(libId) {
        const lib = this._cache.libraries.find(l => l.id === libId);
        if (!lib) return;
        const newName = prompt('اسم المكتبة:', lib.name);
        if (newName && newName.trim()) {
            this.updateLibrary(libId, { name: newName.trim() });
            this.renderProfileLibraries(sbUser?.id);
            showToast('تم تحديث المكتبة ✓');
        }
    },

    // ===== VIEW ITEM (detail) =====
    viewItem(itemId) {
        let item = null;
        for (const libId in this._cache.items) {
            item = this._cache.items[libId].find(i => i.id === itemId);
            if (item) break;
        }
        if (!item) return;

        // If it's a link, open it
        if (item.type === 'link' && item.url) {
            window.open(item.url, '_blank');
            return;
        }

        // Otherwise show detail in a simple alert (could be enhanced to a modal)
        const detail = `📌 ${item.title}\n\n${item.content || 'لا يوجد محتوى'}${item.url ? '\n\n🔗 ' + item.url : ''}${item.tags?.length ? '\n\n🏷️ ' + item.tags.join(', ') : ''}`;
        alert(detail);
    },

    // ===== LOCAL STORAGE FALLBACK =====
    _getLocalLibraries(profileId) {
        try {
            const data = Safe.getJSON('lawbook_libraries_' + profileId, []);
            this._cache.libraries = data;
            return data;
        } catch (e) { return []; }
    },

    _saveLocalLibraries(profileId, data) {
        Safe.setJSON('lawbook_libraries_' + profileId, data);
    },

    _createLocalLibrary(libData) {
        const newLib = {
            id: 'lib_' + Date.now(),
            owner_id: 'local',
            name: libData.name,
            description: libData.description || '',
            icon: libData.icon || '📚',
            color: libData.color || '#f97316',
            visibility: libData.visibility || 'public',
            items_count: 0,
            followers_count: 0,
            views_count: 0,
            is_pinned: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this._cache.libraries.unshift(newLib);
        this._saveLocalLibraries('local', this._cache.libraries);
        return newLib;
    },

    _updateLocalLibrary(libId, updates) {
        const idx = this._cache.libraries.findIndex(l => l.id === libId);
        if (idx !== -1) {
            Object.assign(this._cache.libraries[idx], updates, { updated_at: new Date().toISOString() });
            this._saveLocalLibraries('local', this._cache.libraries);
            return this._cache.libraries[idx];
        }
        return null;
    },

    _deleteLocalLibrary(libId) {
        this._cache.libraries = this._cache.libraries.filter(l => l.id !== libId);
        delete this._cache.items[libId];
        this._saveLocalLibraries('local', this._cache.libraries);
    },

    _getLocalItems(libId) {
        try {
            const data = Safe.getJSON('lawbook_items_' + libId, []);
            this._cache.items[libId] = data;
            return data;
        } catch (e) { return []; }
    },

    _saveLocalItems(libId, data) {
        Safe.setJSON('lawbook_items_' + libId, data);
    },

    _createLocalItem(libId, itemData) {
        const newItem = {
            id: 'item_' + Date.now(),
            library_id: libId,
            author_id: 'local',
            type: itemData.type || 'note',
            title: itemData.title,
            content: itemData.content || '',
            url: itemData.url || '',
            file_url: '',
            file_name: '',
            file_size: 0,
            cover_image: '',
            tags: itemData.tags || [],
            category: 'general',
            is_pinned: false,
            post_id: null,
            sort_order: 0,
            views_count: 0,
            saves_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        if (!this._cache.items[libId]) this._cache.items[libId] = [];
        this._cache.items[libId].unshift(newItem);
        this._saveLocalItems(libId, this._cache.items[libId]);
        return newItem;
    },

    _updateLocalItem(itemId, updates) {
        for (const libId in this._cache.items) {
            const idx = this._cache.items[libId].findIndex(i => i.id === itemId);
            if (idx !== -1) {
                Object.assign(this._cache.items[libId][idx], updates, { updated_at: new Date().toISOString() });
                this._saveLocalItems(libId, this._cache.items[libId]);
                return this._cache.items[libId][idx];
            }
        }
        return null;
    },

    _deleteLocalItem(itemId, libId) {
        if (this._cache.items[libId]) {
            this._cache.items[libId] = this._cache.items[libId].filter(i => i.id !== itemId);
            this._saveLocalItems(libId, this._cache.items[libId]);
        }
    },

    _saveLocalItem(itemId, libId) {
        // No-op for local saves
    },

    // ===== PICKER HELPERS =====
    _pickEmoji(btn, emoji) {
        document.getElementById('createLibIcon').value = emoji;
        document.getElementById('createLibIconBtn').textContent = emoji;
        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('emojiPicker').classList.add('hidden');
    },

    _pickColor(btn) {
        const color = btn.dataset.color;
        document.getElementById('createLibColor').value = color;
        document.querySelectorAll('.color-pick').forEach(c => c.classList.remove('ring-2', 'ring-white'));
        btn.classList.add('ring-2', 'ring-white');
    },

    // ===== UTILITIES =====
    _timeAgo(dateStr) {
        if (!dateStr) return '';
        const now = Date.now();
        const then = new Date(dateStr).getTime();
        const diff = now - then;
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return 'الآن';
        if (mins < 60) return `منذ ${mins} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 30) return `منذ ${days} يوم`;
        return new Date(dateStr).toLocaleDateString('ar-SA');
    }
};
