const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });
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

function drawAlienBody(poses) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)'; // Green color for alien body

    poses.forEach(({ score, keypoints }) => {
        if (score >= 0.5) {
            keypoints.forEach(({ position }) => {
                ctx.beginPath();
                ctx.arc(position.x, position.y, 10, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    });
}

async function main() {
    await setupCamera();
    const net = await loadPosenet();

    async function detectPose() {
        const poses = await net.estimatePoses(video, {
            flipHorizontal: false,
            decodingMethod: 'single-person'
        });

        drawAlienBody(poses);
        requestAnimationFrame(detectPose);
    }

    detectPose();
}

main();