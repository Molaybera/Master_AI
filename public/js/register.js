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
const registerBtn = document.getElementById('registerBtn');

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

// Vault Key Generation
genPassBtn.addEventListener('click', () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let pass = "";
    // Generate a secure 16-character key
    for(let i = 0; i < 16; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    passwordInput.value = pass;
    
    // Automatically reveal the key to the user
    passwordInput.type = 'text';
    eyeIcon.className = 'fas fa-eye-slash';

    // Max out the strength bar
    strengthBar.style.width = '100%';
    strengthBar.className = 'strength-bar bg-emerald-500';
    
    // Create and download the secure vault file
    const file = new Blob([`MASTER ACCESS KEY\n${new Date()}\nKEY: ${pass}\n\nWARNING: Do not share this file. It grants total access to your MASTER OS offline node.`], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = "master_key.txt";
    a.click();
    
    showToast("VAULT KEY GENERATED & DOWNLOADED", "success");

    // Enable the final execution button now that the key exists
    registerBtn.disabled = false;
    registerBtn.textContent = 'Execute Register';
    registerBtn.classList.add('bg-gradient-to-r', 'from-emerald-700', 'to-emerald-500');
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Fail-safe check
    if(passwordInput.value.length < 16) {
        showToast("Please generate a Vault Key first.");
        return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> ENCRYPTING IDENTITY...';
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', // <--- CRITICAL FIX: Ensures browser handles session cookies correctly
            body: JSON.stringify({ 
                username: document.getElementById('username').value,
                email: document.getElementById('email').value,
                password: passwordInput.value // Sends the generated Vault Key
            })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast("IDENTITY SECURED. REDIRECTING...", "success");
            setTimeout(() => window.location.href = '/login', 2000);
        } else {
            showToast(data.message);
        }
    } catch (err) { 
        showToast("UPLINK_FAIL: DB_OFFLINE"); 
    } finally { 
        registerBtn.disabled = false; 
        registerBtn.textContent = 'Execute Register'; 
    }
});