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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    particlesMesh.rotation.x += 0.0005;
    particlesMesh.rotation.y += 0.0005;
    
    gridHelper.rotation.x = Math.PI / 4;
    gridHelper.rotation.z += 0.001;
    
    renderer.render(scene, camera);
}

// Start animation
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Form submission
window.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Here you would typically validate credentials with your server
            console.log('Login attempt with:', { email });
            
            // Show success message with glitch effect
            const h1 = document.querySelector('h1');
            if (h1) {
                const originalText = h1.textContent;
                h1.textContent = 'WELCOME BACK';
                h1.classList.add('glitch');
                h1.setAttribute('data-text', 'WELCOME BACK');
                
                // Reset the title after 3 seconds
                setTimeout(() => {
                    h1.textContent = originalText;
                    h1.setAttribute('data-text', originalText);
                }, 3000);
            }
            
            // Reset form
            this.reset();
        });
    }
});
