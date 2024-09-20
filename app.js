const video = document.getElementById('video');
const canvas = document.getElementById('output');

let scene, camera, renderer, mixer, clock, alienModel;

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            video.width = video.videoWidth;
            video.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            resolve(video);
        };
    });
}

async function loadPosenet() {
    return await posenet.load();
}

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(canvas.width, canvas.height);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    clock = new THREE.Clock();

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 1).normalize();
    scene.add(directionalLight);

    // Load the model
    const loader = new THREE.GLTFLoader();
    loader.load('https://threejs.org/examples/models/gltf/Xbot.glb', (gltf) => {
        alienModel = gltf.scene;
        
        // Make the model green
        alienModel.traverse((child) => {
            if (child.isMesh) {
                child.material.color.setHex(0x00ff00);
            }
        });

        // Scale and position the model
        alienModel.scale.set(50, 50, 50);
        scene.add(alienModel);

        // Set up animation mixer
        mixer = new THREE.AnimationMixer(alienModel);
        gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
        });
    });
}

function updateAlienBody(poses) {
    if (poses.length > 0 && alienModel) {
        const keypoints = poses[0].keypoints;
        const positions = {};

        keypoints.forEach(keypoint => {
            if (keypoint.score > 0.5) {
                positions[keypoint.part] = {
                    x: (keypoint.position.x - canvas.width / 2) / 5,
                    y: (canvas.height / 2 - keypoint.position.y) / 5
                };
            }
        });

        // Update alien model position and rotation
        if (positions.nose) {
            alienModel.position.set(positions.nose.x, positions.nose.y, 0);
        }

        // Update arm rotations
        if (positions.leftShoulder && positions.leftElbow) {
            const leftArm = alienModel.getObjectByName('mixamorigLeftArm');
            if (leftArm) {
                const angle = Math.atan2(positions.leftElbow.y - positions.leftShoulder.y, positions.leftElbow.x - positions.leftShoulder.x);
                leftArm.rotation.z = -angle;
            }
        }
        if (positions.rightShoulder && positions.rightElbow) {
            const rightArm = alienModel.getObjectByName('mixamorigRightArm');
            if (rightArm) {
                const angle = Math.atan2(positions.rightElbow.y - positions.rightShoulder.y, positions.rightElbow.x - positions.rightShoulder.x);
                rightArm.rotation.z = angle;
            }
        }

        // Update leg rotations
        if (positions.leftHip && positions.leftKnee) {
            const leftUpLeg = alienModel.getObjectByName('mixamorigLeftUpLeg');
            if (leftUpLeg) {
                const angle = Math.atan2(positions.leftKnee.y - positions.leftHip.y, positions.leftKnee.x - positions.leftHip.x);
                leftUpLeg.rotation.z = -angle + Math.PI / 2;
            }
        }
        if (positions.rightHip && positions.rightKnee) {
            const rightUpLeg = alienModel.getObjectByName('mixamorigRightUpLeg');
            if (rightUpLeg) {
                const angle = Math.atan2(positions.rightKnee.y - positions.rightHip.y, positions.rightKnee.x - positions.rightHip.x);
                rightUpLeg.rotation.z = -angle - Math.PI / 2;
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (mixer) {
        mixer.update(clock.getDelta());
    }
    renderer.render(scene, camera);
}

async function main() {
    await setupCamera();
    const net = await loadPosenet();
    initThreeJS();
    animate();

    async function detectPose() {
        const poses = await net.estimatePoses(video, {
            flipHorizontal: false,
            decodingMethod: 'single-person'
        });

        updateAlienBody(poses);
        requestAnimationFrame(detectPose);
    }

    detectPose();
}

main();