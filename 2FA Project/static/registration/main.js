// Three.js 3D Background
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

// Set up renderer
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Create particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 5000;

const posArray = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 10;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.005,
    color: '#0ff',
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Create grid
const gridHelper = new THREE.GridHelper(20, 20, '#00ffff', '#007777');
scene.add(gridHelper);

camera.position.z = 5;

// Password visibility toggle
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('.toggle-password i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const strengthMeter = document.getElementById('strength-meter-fill');
    const strengthText = document.getElementById('strength-value');
    
    // Check password length
    if (password.length >= 8) strength += 1;
    
    // Check for lowercase letters
    if (password.match(/[a-z]+/)) strength += 1;
    
    // Check for uppercase letters
    if (password.match(/[A-Z]+/)) strength += 1;
    
    // Check for numbers
    if (password.match(/[0-9]+/)) strength += 1;
    
    // Check for special characters
    if (password.match(/[!@#$%^&*(),.?":{}|<>]+/)) strength += 1;
    
    // Update strength meter and text
    const strengthPercent = (strength / 5) * 100;
    strengthMeter.style.width = `${strengthPercent}%`;
    
    // Update colors and text based on strength
    if (strength <= 1) {
        strengthMeter.style.backgroundColor = '#ff4d4d';
        strengthText.textContent = 'Weak';
        strengthText.style.color = '#ff4d4d';
    } else if (strength <= 3) {
        strengthMeter.style.backgroundColor = '#ffa64d';
        strengthText.textContent = 'Moderate';
        strengthText.style.color = '#ffa64d';
    } else {
        strengthMeter.style.backgroundColor = '#4CAF50';
        strengthText.textContent = 'Strong';
        strengthText.style.color = '#4CAF50';
    }
}

function showPasswordStrength() {
    const passwordStrength = document.getElementById('password-strength');
    passwordStrength.style.display = 'block';
}

function hidePasswordStrength() {
    const passwordInput = document.getElementById('password');
    const passwordStrength = document.getElementById('password-strength');
    if (passwordInput.value === '') {
        passwordStrength.style.display = 'none';
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    particlesMesh.rotation.x += 0.0005;
    particlesMesh.rotation.y += 0.0005;
    
    gridHelper.rotation.x = Math.PI / 4;
    gridHelper.rotation.z += 0.001;
    
    renderer.render(scene, camera);}

// Start animation
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Form submission
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Here you would typically send this data to your server
            console.log('Registration Data:', { name, email, password });
            
            // Show success message with glitch effect
            const h1 = document.querySelector('h1');
            if (h1) {
                h1.textContent = 'WELCOME ' + name.toUpperCase();
                h1.classList.add('glitch');
                h1.setAttribute('data-text', 'WELCOME ' + name.toUpperCase());
            }
            
            // Reset form
            this.reset();
        });
    }
});
