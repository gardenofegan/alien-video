let video;
let poseNet;
let stars = [];
let smoothedPose = null;
const smoothingFactor = 0.6; // Increased for faster response
let alien;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // Create stars for the background
  for (let i = 0; i < 100; i++) { // Reduced number of stars
    stars.push({
      x: random(-width/2, width/2),
      y: random(-height/2, height/2),
      z: random(-200, 0)
    });
  }

  // Check if ml5 is loaded correctly
  if (typeof ml5 === 'undefined') {
    console.error('ml5 is not defined. Make sure the library is loaded correctly.');
    return;
  }

  // Use a callback function for model loading
  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on('pose', gotPoses);

  // Create alien object
  alien = new Alien();
}

function gotPoses(results) {
  if (results.length > 0) {
    const detectedPose = results[0].pose;
    if (!smoothedPose) {
      smoothedPose = detectedPose;
    } else {
      for (let keypoint of detectedPose.keypoints) {
        const part = keypoint.part;
        smoothedPose[part].x = lerp(smoothedPose[part].x, keypoint.position.x, 1 - smoothingFactor);
        smoothedPose[part].y = lerp(smoothedPose[part].y, keypoint.position.y, 1 - smoothingFactor);
      }
    }
  }
}

function modelReady() {
  console.log('PoseNet model loaded');
}

function draw() {
  background(0);
  drawStars();
  
  if (smoothedPose) {
    alien.update(smoothedPose);
    alien.display();
  }
}

function drawStars() {
  push();
  stroke(255);
  strokeWeight(2);
  for (let star of stars) {
    point(star.x, star.y, star.z);
  }
  pop();
}

class Alien {
  constructor() {
    this.headSize = 100;
    this.position = createVector(0, 0, 0);
  }

  update(pose) {
    let centerX = (pose.leftShoulder.x + pose.rightShoulder.x) / 2 - width/2;
    let centerY = (pose.leftShoulder.y + pose.rightShoulder.y) / 2 - height/2;
    this.position.set(centerX, centerY, 0);
    this.headSize = dist(pose.leftEye.x, pose.leftEye.y, pose.rightEye.x, pose.rightEye.y) * 4; // Increased head size
  }

  display() {
    push();
    translate(this.position.x, this.position.y, this.position.z);
    scale(0.5);

    // Body (thinner)
    fill(0, 240, 0);
    noStroke();
    ellipsoid(this.headSize * 0.4, this.headSize * 1.2, this.headSize * 0.3);

    // Head (bigger)
    push();
    translate(0, -this.headSize * 1.2, 0);
    fill(0, 255, 0);
    sphere(this.headSize * 0.7);

    // Eyes
    fill(0);
    push();
    translate(-this.headSize * 0.25, -this.headSize * 0.1, this.headSize * 0.6);
    sphere(this.headSize * 0.15);
    translate(this.headSize * 0.5, 0, 0);
    sphere(this.headSize * 0.15);
    pop();

    // Antennae
    stroke(0, 255, 0);
    strokeWeight(3);
    line(0, -this.headSize * 0.7, 0, -this.headSize * 0.4, -this.headSize * 0.7, this.headSize * 0.2);
    line(0, -this.headSize * 0.7, 0, this.headSize * 0.4, -this.headSize * 0.7, this.headSize * 0.2);
    pop();

    // Limbs
    this.drawLimb(smoothedPose.leftShoulder, smoothedPose.leftElbow, smoothedPose.leftWrist, color(0, 200, 0));
    this.drawLimb(smoothedPose.rightShoulder, smoothedPose.rightElbow, smoothedPose.rightWrist, color(0, 200, 0));
    this.drawLimb(smoothedPose.leftHip, smoothedPose.leftKnee, smoothedPose.leftAnkle, color(0, 220, 0));
    this.drawLimb(smoothedPose.rightHip, smoothedPose.rightKnee, smoothedPose.rightAnkle, color(0, 220, 0));

    pop();
  }

  drawLimb(joint1, joint2, joint3, color) {
    let x1 = joint1.x - (smoothedPose.leftShoulder.x + smoothedPose.rightShoulder.x) / 2;
    let y1 = joint1.y - (smoothedPose.leftShoulder.y + smoothedPose.rightShoulder.y) / 2;
    let x2 = joint2.x - (smoothedPose.leftShoulder.x + smoothedPose.rightShoulder.x) / 2;
    let y2 = joint2.y - (smoothedPose.leftShoulder.y + smoothedPose.rightShoulder.y) / 2;
    let x3 = joint3.x - (smoothedPose.leftShoulder.x + smoothedPose.rightShoulder.x) / 2;
    let y3 = joint3.y - (smoothedPose.leftShoulder.y + smoothedPose.rightShoulder.y) / 2;

    stroke(color);
    strokeWeight(this.headSize * 0.05); // Thinner limbs
    noFill();
    beginShape();
    curveVertex(x1, y1, 0);
    curveVertex(x1, y1, 0);
    curveVertex(x2, y2, 20);
    curveVertex(x3, y3, 0);
    curveVertex(x3, y3, 0);
    endShape();

    // Joints
    noStroke();
    fill(color);
    push();
    translate(x1, y1, 0);
    sphere(this.headSize * 0.06);
    pop();
    push();
    translate(x2, y2, 20);
    sphere(this.headSize * 0.06);
    pop();

    // Hands and feet
    push();
    translate(x3, y3, 0);
    if (joint1 === smoothedPose.leftShoulder || joint1 === smoothedPose.rightShoulder) {
      // Hands
      fill(0, 160, 0);
      sphere(this.headSize * 0.12);
    } else {
      // Feet
      fill(0, 180, 0);
      rotateX(PI/2);
      ellipsoid(this.headSize * 0.15, this.headSize * 0.08, this.headSize * 0.2);
    }
    pop();
  }
}