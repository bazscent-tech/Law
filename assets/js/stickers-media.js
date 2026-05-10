        // ===== STICKER DATA ================================
        // ====================================================
        const stickerCategories = {
            smileys: { label: '😀', stickers: ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤔','😤','😭','😱','🥺','😏','🙄','😴','🤯','🥳','😇','🤩','😡','🤗','😈','💀','👻','🤡','💩','🤖','👽','💀'] },
            gestures: { label: '👍', stickers: ['👍','👎','👏','🙌','🤝','✌️','🤞','🤟','🤘','👌','🤌','💪','🫶','👋','✋','🖐️','☝️','👆','👇','👈','👉','🫵','✊','👊','🤛','🤜','🫰','🤏','👐','🤲'] },
            hearts: { label: '❤️', stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫀','❣️','❤️‍🩹','💕'] },
            law: { label: '⚖️', stickers: ['⚖️','🏛️','📜','📋','✅','❌','🔴','🟢','🟡','⚡','🔥','💡','🎯','📌','📎','🖊️','📝','📚','🎓','💼','🔒','🔓','🛡️','⚔️','🏆','🎉','🎊','💪','🤝','✅'] },
            nature: { label: '🌍', stickers: ['🌍','🌎','🌏','🌞','🌝','🌛','🌜','⭐','🌟','💫','✨','🌈','☀️','🌤️','⛅','🌥️','☁️','🌧️','⛈️','🌩️','🌪️','❄️','☃️','⛄','🌊','🔥','💧','🌺','🌸','🌹'] },
            food: { label: '🍕', stickers: ['🍕','🍔','🍟','🌭','🍿','🧁','🍰','🎂','🍩','🍪','☕','🍵','🥤','🍺','🍷','🥂','🍾','🧃','🫖','🍸','🍹','🧉','🥄','🍴','🥢','🍽️','🧂','🌶️','🫑','🥑'] }
        };
        let currentStickerCategory = 'smileys';
        let currentStickerTarget = null;

        function toggleStickerPicker(target) {
            const picker = document.getElementById('stickerPicker-' + target);
            if (!picker) return;
            if (picker.classList.contains('open')) { picker.classList.remove('open'); return; }
            // Close all other pickers
            document.querySelectorAll('.sticker-picker.open').forEach(p => p.classList.remove('open'));
            currentStickerTarget = target;
            renderStickerPicker(picker);
            picker.classList.add('open');
        }

        function renderStickerPicker(container) {
            const cat = stickerCategories[currentStickerCategory];
            container.innerHTML = `
                <div class="sticker-tabs">
                    ${Object.entries(stickerCategories).map(([key, val]) =>
                        `<button class="sticker-tab${key === currentStickerCategory ? ' active' : ''}" onclick="currentStickerCategory='${key}';renderStickerPicker(this.closest('.sticker-picker'))">${val.label}</button>`
                    ).join('')}
                </div>
                <div class="sticker-grid">
                    ${cat.stickers.map(s => `<button class="sticker-btn" onclick="insertSticker('${s}')">${s}</button>`).join('')}
                </div>
            `;
        }

        function insertSticker(sticker) {
            // Find the active comment input for the current target
            let input = null;
            if (currentStickerTarget === 'detail') {
                input = document.getElementById('detailCommentInput');
            } else {
                // Find the comment input in the post's comment section
                const section = document.getElementById('comments-' + currentStickerTarget);
                if (section) input = section.querySelector('.comment-input');
            }
            if (input) {
                input.value += sticker;
                input.focus();
            }
            // Close picker
            document.querySelectorAll('.sticker-picker.open').forEach(p => p.classList.remove('open'));
        }

        // Close sticker pickers on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.sticker-picker') && !e.target.closest('[onclick*="toggleStickerPicker"]')) {
                document.querySelectorAll('.sticker-picker.open').forEach(p => p.classList.remove('open'));
            }
        });

        // ====================================================
        // ===== MEDIA UPLOAD SYSTEM ==========================
        // ====================================================
        let pendingMedia = []; // { type: 'image'|'video'|'pdf', data: base64, name: string }

        function triggerMediaUpload() {
            const input = document.getElementById('postMediaInput');
            if (input) input.click();
        }

        function handleMediaUpload(input) {
            const files = Array.from(input.files);
            const remaining = 4 - pendingMedia.length;
            if (remaining <= 0) { showToast('الحد الأقصى 4 ملفات'); input.value = ''; return; }
            const toAdd = files.slice(0, remaining);
            toAdd.forEach(file => {
                if (file.size > 10 * 1024 * 1024) { showToast('حجم الملف كبير (max 10MB)'); return; }
                const reader = new FileReader();
                reader.onload = function(e) {
                    let type = 'image';
                    if (file.type.startsWith('video/')) type = 'video';
                    else if (file.type === 'application/pdf') type = 'pdf';
                    pendingMedia.push({ type, data: e.target.result, name: file.name });
                    renderMediaPreview();
                };
                reader.readAsDataURL(file);
            });
            input.value = '';
        }

        function removeMedia(index) {
            pendingMedia.splice(index, 1);
            renderMediaPreview();
        }

        function renderMediaPreview() {
            const container = document.getElementById('postMediaPreview');
            if (!container) return;
            if (pendingMedia.length === 0) { container.innerHTML = ''; return; }
            const gridClass = 'grid-' + Math.min(pendingMedia.length, 4);
            container.innerHTML = `<div class="media-preview-grid ${gridClass}">${pendingMedia.map((m, i) => {
                if (m.type === 'image') return `<div class="media-item"><img src="${m.data}" alt=""><div class="remove-media" onclick="removeMedia(${i})"><span class="iconify text-white text-sm" data-icon="lucide:x"></span></div></div>`;
                if (m.type === 'video') return `<div class="media-item"><video src="${m.data}" muted></video><div class="remove-media" onclick="removeMedia(${i})"><span class="iconify text-white text-sm" data-icon="lucide:x"></span></div></div>`;
                return `<div class="media-item"><div class="pdf-preview"><div class="pdf-icon"><span class="iconify text-white text-lg" data-icon="lucide:file-text"></span></div><span class="text-xs text-dark-300 truncate">${m.name}</span></div><div class="remove-media" onclick="removeMedia(${i})"><span class="iconify text-white text-sm" data-icon="lucide:x"></span></div></div>`;
            }).join('')}</div>`;
        }

        function renderMediaInPost(media) {
            if (!media || media.length === 0) return '';
            const gridClass = 'grid-' + Math.min(media.length, 4);
            return `<div class="mx-5 mb-4 media-grid ${gridClass}" style="max-height:350px">${media.map(m => {
                if (m.type === 'image') return `<div class="media-item"><img src="${m.data}" alt=""></div>`;
                if (m.type === 'video') return `<div class="media-item"><video src="${m.data}" controls muted></video></div>`;
                return `<div class="media-item"><div class="pdf-preview"><div class="pdf-icon"><span class="iconify text-white text-lg" data-icon="lucide:file-text"></span></div><span class="text-xs text-dark-300 truncate">${m.name||'document.pdf'}</span></div></div>`;
            }).join('')}</div>`;
        }

        // ====================================================
        // ===== POST DATA STORE — معزول لكل حساب ==========
        // ====================================================
        let userPostCounter = parseInt(UserStore.getString('userPostCounter') || '0');
        let userPosts = UserStore.getJSON('userPosts', []);
        let userReplies = UserStore.getJSON('userReplies', []);
        let userLikes = UserStore.getJSON('userLikes', []);
        let platformComments = UserStore.getJSON('platformComments', {}); // { postId: [comments] }

        function saveUserPosts() { UserStore.setJSON('userPosts', userPosts); UserStore.setString('userPostCounter', String(userPostCounter)); }
