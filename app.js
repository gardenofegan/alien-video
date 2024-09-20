const video = document.getElementById('video');
const canvas = document.getElementById('output');

let scene, camera, renderer, clock;
let alienModels = new Map();

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

    // Remove the single model loading code
    // We'll create models dynamically for each detected person
}

function createAlienModel() {
    return new Promise((resolve) => {
        const loader = new THREE.GLTFLoader();
        loader.load('https://threejs.org/examples/models/gltf/Xbot.glb', (gltf) => {
            const alienModel = gltf.scene;
            
            alienModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.name.toLowerCase().includes('eye')) {
                        child.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
                    } else {
                        child.material.color.setHex(0x00ff00);
                    }
                }
            });

            alienModel.scale.set(50, 50, 50);
            scene.add(alienModel);

            resolve(alienModel);
        });
    });
}

function updateAlienBody(poses) {
    // Remove models for people who are no longer detected
    for (let [id, model] of alienModels) {
        if (!poses.some(pose => pose.id === id)) {
            scene.remove(model);
            alienModels.delete(id);
        }
    }

    poses.forEach(async (pose) => {
        let alienModel = alienModels.get(pose.id);
        if (!alienModel) {
            alienModel = await createAlienModel();
            alienModels.set(pose.id, alienModel);
        }

        const keypoints = pose.keypoints;
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

        // Head rotation
        if (positions.leftEye && positions.rightEye) {
            const head = alienModel.getObjectByName('mixamorigHead');
            if (head) {
                const angle = Math.atan2(positions.rightEye.y - positions.leftEye.y, positions.rightEye.x - positions.leftEye.x);
                head.rotation.z = angle;
            }
        }

        // Arms
        updateLimb(alienModel, positions, 'leftShoulder', 'leftElbow', 'mixamorigLeftArm');
        updateLimb(alienModel, positions, 'leftElbow', 'leftWrist', 'mixamorigLeftForeArm');
        updateLimb(alienModel, positions, 'rightShoulder', 'rightElbow', 'mixamorigRightArm');
        updateLimb(alienModel, positions, 'rightElbow', 'rightWrist', 'mixamorigRightForeArm');

        // Legs
        updateLimb(alienModel, positions, 'leftHip', 'leftKnee', 'mixamorigLeftUpLeg');
        updateLimb(alienModel, positions, 'leftKnee', 'leftAnkle', 'mixamorigLeftLeg');
        updateLimb(alienModel, positions, 'rightHip', 'rightKnee', 'mixamorigRightUpLeg');
        updateLimb(alienModel, positions, 'rightKnee', 'rightAnkle', 'mixamorigRightLeg');

        // Body rotation
        if (positions.leftShoulder && positions.rightShoulder) {
            const spine = alienModel.getObjectByName('mixamorigSpine');
            if (spine) {
                const angle = Math.atan2(positions.rightShoulder.y - positions.leftShoulder.y, positions.rightShoulder.x - positions.leftShoulder.x);
                spine.rotation.z = angle;
            }
        }
    });
}

function updateLimb(model, positions, jointA, jointB, boneName) {
    if (positions[jointA] && positions[jointB]) {
        const bone = model.getObjectByName(boneName);
        if (bone) {
            const angle = Math.atan2(positions[jointB].y - positions[jointA].y, positions[jointB].x - positions[jointA].x);
            bone.rotation.z = -angle + Math.PI / 2;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
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
            decodingMethod: 'multi-person',
            maxDetections: 5,
            scoreThreshold: 0.5,
            nmsRadius: 20
        });

        updateAlienBody(poses);
        requestAnimationFrame(detectPose);
    }

    detectPose();
}

main();