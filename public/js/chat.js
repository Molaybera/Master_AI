        const toastContainer = document.getElementById('toastContainer');
        const userDisplayName = document.getElementById('userDisplayName');
        const chatWindow = document.getElementById('chatWindow');
        const chatForm = document.getElementById('chatForm');

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `cyber-toast toast-${type === 'success' ? 'success' : 'error'}`;
            toast.style.borderLeftColor = type === 'success' ? '#10b981' : '#ef4444';
            toast.innerHTML = `
                <div class="flex items-center gap-3">
                    <i class="fas ${type === 'success' ? 'fa-check-circle text-emerald-400' : 'fa-exclamation-triangle text-red-400'}"></i>
                    <span class="mono text-[10px] uppercase text-white">${message}</span>
                </div>
            `;
            toastContainer.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
        }

        // 1. Verify Session & Fetch Profile on Load
        async function fetchProfile() {
            try {
                const response = await fetch('/api/auth/me');
                const data = await response.json();

                if (data.success) {
                    userDisplayName.textContent = data.user.username.toUpperCase();
                    showToast(`WELCOME BACK, ${data.user.username.toUpperCase()}`, "success");
                    console.log("%c[SYSTEM] SESSION_VERIFIED: Identity confirmed.", "color: #10b981; font-weight: bold;");
                } else {
                    window.location.href = '/login.html';
                }
            } catch (err) {
                console.error("Session check failed", err);
                window.location.href = '/login.html';
            }
        }

        // 2. Handle Logout
        async function handleLogout() {
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    window.location.href = '/login.html';
                }
            } catch (err) {
                showToast("LOGOUT_FAILED: CONNECTION_ERROR", "error");
            }
        }

        // 3. Handle Message Sending (Mock for now)
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('userInput');
            if (!input.value.trim()) return;

            // Append User Message
            appendMessage('user', input.value);
            const val = input.value;
            input.value = '';

            // Simulate AI response
            setTimeout(() => {
                appendMessage('assistant', `Acknowledged. Processing your query regarding "${val}". This feature is currently in integration mode.`);
            }, 800);
        });

        function appendMessage(role, text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = role === 'user' ? 'message-user max-w-[80%] p-4' : 'message-ai max-w-[80%] p-4';
            msgDiv.innerHTML = `
                <p class="mono text-[10px] ${role === 'user' ? 'text-blue-300' : 'text-blue-400'} mb-2">${role.toUpperCase()}_ID</p>
                <p class="text-sm leading-relaxed text-slate-200">${text}</p>
            `;
            chatWindow.appendChild(msgDiv);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }

        // Initialization
        window.onload = fetchProfile;
