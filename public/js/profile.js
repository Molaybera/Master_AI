// ═══════════════════════════════════════════════════
//  PROFILE SETTINGS MODAL (Add to chat.js)
// ═══════════════════════════════════════════════════
const profileModal = document.getElementById('profile-modal');
const profileBtn = document.getElementById('profile-btn');
const closeProfileBtn = document.getElementById('close-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const profileUsername = document.getElementById('profile-username');
const profileAppPassword = document.getElementById('profile-app-password');
const profileWorkspace = document.getElementById('profile-workspace');
const profileStatus = document.getElementById('profile-status');

async function openProfileModal() {
    // Reset state
    profileStatus.className = 'mt-3 text-[11px] font-semibold hidden';
    profileAppPassword.value = '';
    saveProfileBtn.disabled = true;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    
    profileModal.classList.add('open');

    // Fetch existing profile data to populate the inputs
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                profileUsername.value = data.user.username || '';
                profileWorkspace.value = data.user.workspacePath || '';
                if (data.user.hasAppPassword) {
                    profileAppPassword.placeholder = "•••••••• (Saved)";
                } else {
                    profileAppPassword.placeholder = "Not configured...";
                }
            }
        }
    } catch (err) {
        console.error("Failed to load profile", err);
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
    }
}

function closeProfileModal() {
    profileModal.classList.remove('open');
}

async function saveProfile() {
    const username = profileUsername.value.trim();
    const appPassword = profileAppPassword.value.trim();
    const workspacePath = profileWorkspace.value.trim();

    saveProfileBtn.disabled = true;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    profileStatus.classList.remove('hidden', 'text-red-400', 'text-emerald-400');

    try {
        const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                username: username || undefined, 
                appPassword: appPassword !== '' ? appPassword : undefined,
                workspacePath: workspacePath !== '' ? workspacePath : undefined
            })
        });

        const data = await res.json();

        if (res.ok && data.success) {
            profileStatus.textContent = 'Profile updated successfully!';
            profileStatus.classList.add('text-emerald-400', 'block');
            
            // Update sidebar username display
            if (data.user && data.user.username) {
                document.getElementById('user-display').textContent = data.user.username.toUpperCase();
            }

            if (typeof loadCwd === 'function') {
                await loadCwd();
            }

            setTimeout(closeProfileModal, 1500);
        } else {
            throw new Error(data.message || 'Failed to update profile');
        }
    } catch (err) {
        profileStatus.textContent = err.message;
        profileStatus.classList.add('text-red-400', 'block');
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
    }
}

// Wire up event listeners
profileBtn.addEventListener('click', openProfileModal);
closeProfileBtn.addEventListener('click', closeProfileModal);
cancelProfileBtn.addEventListener('click', closeProfileModal);
saveProfileBtn.addEventListener('click', saveProfile);
profileModal.addEventListener('click', e => { if (e.target === profileModal) closeProfileModal(); });