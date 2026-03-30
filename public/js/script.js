        // --- LOGIC: TERMINAL BOOT ---
        const bootLog = document.getElementById('boot-log');
        const overlay = document.getElementById('boot-overlay');
        const logs = [
            "> INITIALIZING MASTER_OS v2.4...",
            "> LOADING LOCAL BRAIN: QWEN2.5-CODER...",
            "> STATUS: NO THIRD PARTY APIS DETECTED...",
            "> SYNCING LOCAL DATABASE [127.0.0.1:27017]...",
            "> ESTABLISHING ZERO-TRUST AUTH HANDSHAKE...",
            "> NODE_IDENTIFIED: MASTER_SRV_LOCAL",
            "> TUNNELING_SECURE_PROTOCOLS... [VERIFIED]",
            "> MASTER SYSTEM READY. ACCESS GRANTED."
        ];

        let logIndex = 0;
        function typeLog() {
            if (logIndex < logs.length) {
                const line = document.createElement('div');
                line.className = 'mb-1';
                line.textContent = logs[logIndex];
                bootLog.appendChild(line);
                logIndex++;
                setTimeout(typeLog, 80);
            } else {
                setTimeout(() => {
                    overlay.style.transition = 'all 1s cubic-bezier(0.19, 1, 0.22, 1)';
                    overlay.style.opacity = '0';
                    overlay.style.transform = 'translateY(-100%)';
                    setTimeout(() => overlay.remove(), 1000);
                }, 3000);
            }
        }
        window.addEventListener('load', typeLog);

        // --- THREE.JS: NEURAL BACKGROUND ---
        let scene, camera, renderer, particles;
        function initThree() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('canvas-container').appendChild(renderer.domElement);

            const geometry = new THREE.BufferGeometry();
            const vertices = [];
            for (let i = 0; i < 1500; i++) {
                vertices.push(THREE.MathUtils.randFloatSpread(2500));
                vertices.push(THREE.MathUtils.randFloatSpread(2500));
                vertices.push(THREE.MathUtils.randFloatSpread(2500));
            }
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const material = new THREE.PointsMaterial({ color: 0x0ea5e9, size: 2.2 });
            particles = new THREE.Points(geometry, material);
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
            for(let i = 0; i < 20; i++) {
                content += Math.round(Math.random()) + '<br>';
            }
            stream.innerHTML = content;
            container.appendChild(stream);
            setTimeout(() => stream.remove(), 10000);
        }
        setInterval(createBinaryStream, 500);

        // --- REAL-TIME UTILS ---
        setInterval(() => {
            document.getElementById('live-time').textContent = new Date().toLocaleTimeString('en-GB');
        }, 1000);

        document.getElementById('node-id').textContent = Math.random().toString(16).substring(2, 10).toUpperCase();

        async function checkSession() {
            try {
                // MUST include credentials here too!
                const response = await fetch('/api/auth/me', { credentials: 'include' });
                const data = await response.json();
                if (data.success) {
                    const authLink = document.getElementById('authLink');
                    authLink.innerHTML = `<i class="fas fa-terminal mr-2"></i> ${data.user.username.toUpperCase()}`;
                    authLink.href = "/chat";
                }
            } catch (err) {}
        }
