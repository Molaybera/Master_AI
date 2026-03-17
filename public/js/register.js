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

        // --- BOOT SEQUENCE ---
        const bootLog = document.getElementById('boot-log');
        const overlay = document.getElementById('boot-overlay');
        const logs = [
            "> INITIALIZING MASTER_ID_GEN_PROTOCOL...",
            "> LOADING NEURAL_STRENGTH_MONITOR...",
            "> CHECKING OFFLINE_AIRGAP_STATUS...",
            "> SYNCING_LOCAL_DB [127.0.0.1:27017]...",
            "> STANDING BY FOR OPERATOR INPUT."
        ];
        let logIndex = 0;
        function typeLog() {
            if (logIndex < logs.length) {
                const line = document.createElement('div');
                line.className = 'mb-1';
                line.textContent = logs[logIndex];
                bootLog.appendChild(line);
                logIndex++;
                setTimeout(typeLog, 120);
            } else {
                setTimeout(() => {
                    overlay.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'scale(1.1)';
                    setTimeout(() => overlay.remove(), 800);
                }, 1000);
            }
        }
        window.addEventListener('load', typeLog);

        // --- FORM LOGIC ---
        const passwordInput = document.getElementById('password');
        const strengthBar = document.getElementById('strengthBar');
        const genPassBtn = document.getElementById('genPass');
        const togglePassBtn = document.getElementById('togglePass');
        const eyeIcon = document.getElementById('eyeIcon');
        const toastContainer = document.getElementById('toastContainer');

        const condItems = {
            length: document.getElementById('cond-length'),
            upper: document.getElementById('cond-upper'),
            num: document.getElementById('cond-num'),
            spec: document.getElementById('cond-spec')
        };

        function showToast(message, type = 'error') {
            const toast = document.createElement('div');
            toast.className = `cyber-toast border-l-4 ${type === 'success' ? 'border-emerald-500' : 'border-red-500'}`;
            toast.innerHTML = `<span class="mono text-[10px] uppercase text-white">${message}</span>`;
            toastContainer.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
        }

        togglePassBtn.addEventListener('click', () => {
            const isPass = passwordInput.type === 'password';
            passwordInput.type = isPass ? 'text' : 'password';
            eyeIcon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
        });

        passwordInput.addEventListener('input', () => {
            const val = passwordInput.value;
            let strength = 0;
            
            const checks = {
                length: val.length >= 8,
                upper: /[A-Z]/.test(val) && /[a-z]/.test(val),
                num: /[0-9]/.test(val),
                spec: /[^A-Za-z0-9]/.test(val)
            };

            Object.keys(checks).forEach(k => {
                if(checks[k]) {
                    condItems[k].classList.add('condition-met');
                    strength += 25;
                } else {
                    condItems[k].classList.remove('condition-met');
                }
            });

            strengthBar.style.width = strength + '%';
            if(strength <= 25) strengthBar.className = 'strength-bar bg-red-500';
            else if(strength <= 75) strengthBar.className = 'strength-bar bg-yellow-500';
            else strengthBar.className = 'strength-bar bg-emerald-500';
        });

        genPassBtn.addEventListener('click', () => {
            const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
            let pass = "";
            for(let i=0; i<16; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
            passwordInput.value = pass;
            passwordInput.dispatchEvent(new Event('input'));
            
            const file = new Blob([`MASTER ACCESS KEY\n${new Date()}\nKEY: ${pass}`], {type: 'text/plain'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = "master_key.txt";
            a.click();
            showToast("SECURE KEY GENERATED & DOWNLOADED", "success");
        });

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('registerBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> INITIALIZING...';
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        username: document.getElementById('username').value,
                        email: document.getElementById('email').value,
                        password: passwordInput.value
                    })
                });
                const data = await response.json();
                if (data.success) {
                    showToast("IDENTITY VERIFIED. REDIRECTING...", "success");
                    setTimeout(() => window.location.href = '/login', 2000);
                } else showToast(data.message);
            } catch (err) { showToast("UPLINK_FAIL: DB_OFFLINE"); }
            finally { btn.disabled = false; btn.textContent = 'Execute Register'; }
        });
