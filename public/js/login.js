        // --- THREE.JS BACKGROUND ---
        let scene, camera, renderer, particles;
        function initThree() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('canvas-container').appendChild(renderer.domElement);
            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 0; i < 1200; i++) {
                vertices.push(THREE.MathUtils.randFloatSpread(2000));
                vertices.push(THREE.MathUtils.randFloatSpread(2000));
                vertices.push(THREE.MathUtils.randFloatSpread(2000));
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x0ea5e9, size: 2.5 }));
            scene.add(particles);
            camera.position.z = 1000;
        }
        function animate() {
            requestAnimationFrame(animate);
            particles.rotation.x += 0.0003;
            particles.rotation.y += 0.0005;
            renderer.render(scene, camera);
        }
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        initThree();
        animate();

        // --- BINARY FALLING STREAMS ---
        function createBinaryStream() {
            const container = document.getElementById('binary-container');
            const stream = document.createElement('div');
            stream.className = 'binary-stream';
            stream.style.left = Math.random() * 100 + 'vw';
            stream.style.animationDuration = Math.random() * 5 + 5 + 's';
            let content = '';
            for(let i = 0; i < 20; i++) content += Math.round(Math.random()) + '<br>';
            stream.innerHTML = content;
            container.appendChild(stream);
            setTimeout(() => stream.remove(), 10000);
        }
        setInterval(createBinaryStream, 500);

        // --- SUCCESS TERMINAL ANIMATION ---
        const bootLog = document.getElementById('boot-log');
        const overlay = document.getElementById('boot-overlay');
        const logs = [
            "> AUTHENTICATION SUCCESSFUL...",
            "> ESTABLISHING SECURE_TUNNEL...",
            "> SYNCING_USER_PROFILE...",
            "> LOADING NEURAL_INTERFACE_MODULES...",
            "> ACCESS GRANTED. REDIRECTING TO MASTER_LAB."
        ];
        function runSuccessTerminal() {
            overlay.style.display = 'flex';
            let logIndex = 0;
            function typeLog() {
                if (logIndex < logs.length) {
                    const line = document.createElement('div');
                    line.className = 'mb-1';
                    line.textContent = logs[logIndex];
                    bootLog.appendChild(line);
                    logIndex++;
                    setTimeout(typeLog, 150);
                } else {
                    setTimeout(() => window.location.href = '/chat', 800);
                }
            }
            typeLog();
        }

        // --- LOGIN LOGIC ---
        const loginForm = document.getElementById('loginForm');
        const otpForm = document.getElementById('otpForm');
        const passwordInput = document.getElementById('password');
        const togglePassBtn = document.getElementById('togglePass');
        const eyeIcon = document.getElementById('eyeIcon');
        const timerDisplay = document.getElementById('timerContainer');
        const toastContainer = document.getElementById('toastContainer');
        let userEmail = '';
        let timerInterval;

        function showToast(message, type = 'error') {
            const toast = document.createElement('div');
            toast.className = `cyber-toast border-l-4 ${type === 'success' ? 'border-l-emerald-500' : 'border-l-red-500'}`;
            toast.innerHTML = `<span class="mono text-[10px] uppercase text-white">${message}</span>`;
            toastContainer.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
        }

        togglePassBtn.addEventListener('click', () => {
            const isPass = passwordInput.type === 'password';
            passwordInput.type = isPass ? 'text' : 'password';
            eyeIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
        });

        function startTimer(duration) {
            clearInterval(timerInterval);
            let timer = duration, minutes, seconds;
            timerInterval = setInterval(() => {
                minutes = parseInt(timer / 60, 10);
                seconds = parseInt(timer % 60, 10);
                timerDisplay.textContent = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
                if (--timer < 0) {
                    clearInterval(timerInterval);
                    timerDisplay.textContent = "EXPIRED";
                    timerDisplay.className = "mt-2 mono text-xl font-bold text-red-500";
                    document.getElementById('verifyBtn').disabled = true;
                }
            }, 1000);
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> UPLOADING...';
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: document.getElementById('email').value, password: passwordInput.value })
                });
                const data = await response.json();
                if (data.success) {
                    userEmail = document.getElementById('email').value;
                    loginForm.classList.add('hidden');
                    otpForm.classList.remove('hidden');
                    showToast("MFA DISPATCHED", "success");
                    startTimer(60);
                } else showToast(data.message);
            } catch (err) { showToast("NETWORK_FAIL"); }
            finally { btn.disabled = false; btn.textContent = 'Initialize Login'; }
        });

        otpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('verifyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> DECRYPTING...';
            try {
                const response = await fetch('/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, otpCode: document.getElementById('otpCode').value })
                });
                const data = await response.json();
                if (data.success) {
                    showToast("UPLINK GRANTED", "success");
                    runSuccessTerminal(); // Success animation
                } else showToast(data.message);
            } catch (err) { showToast("VERIFICATION_FAIL"); }
            finally { btn.disabled = false; btn.textContent = 'Execute Verification'; }
        });
