let video;
let poseNet;
let poses = [];
let stars = [];

let smoothedPoses = [];
const smoothingFactor = 0.8;

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // Create stars for the background
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3)
    });
  }

  // Check if ml5 is loaded correctly
  if (typeof ml5 === 'undefined') {
    console.error('ml5 is not defined. Make sure the library is loaded correctly.');
    return;
  }

  // Use a callback function for model loading
  poseNet = ml5.poseNet(video, modelReady);
  poseNet.on('pose', (results) => {
    if (results.length > 0) {
      if (smoothedPoses.length === 0) {
        smoothedPoses = results;
      } else {
        results.forEach((pose, i) => {
          if (!smoothedPoses[i]) smoothedPoses[i] = pose;
          for (let j = 0; j < pose.pose.keypoints.length; j++) {
            const point = pose.pose.keypoints[j];
            smoothedPoses[i].pose[point.part].x = lerp(smoothedPoses[i].pose[point.part].x, point.position.x, 1 - smoothingFactor);
            smoothedPoses[i].pose[point.part].y = lerp(smoothedPoses[i].pose[point.part].y, point.position.y, 1 - smoothingFactor);
          }
        });
      }
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(width, height);
  
  // Recreate stars for the new window size
  stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3)
    });
  }
}

function modelReady() {
  console.log('PoseNet model loaded');
}

function draw() {
  // Draw space background
  background(0);
  drawStars();
  
  // Draw aliens for each detected pose
  for (let i = 0; i < smoothedPoses.length; i++) {
    drawAlien(smoothedPoses[i].pose);
  }
}

function drawStars() {
  fill(255);
  noStroke();
  for (let star of stars) {
    ellipse(star.x, star.y, star.size);
  }
}

function drawAlien(pose) {
  // Calculate head size based on eye distance
  let headSize = dist(pose.leftEye.x, pose.leftEye.y, pose.rightEye.x, pose.rightEye.y) * 3;

  push();
  translate((pose.leftShoulder.x + pose.rightShoulder.x) / 2, (pose.leftShoulder.y + pose.rightShoulder.y) / 2);
  
  // Draw body parts
  drawBody(pose, headSize);
  drawLimb(pose, pose.leftShoulder, pose.leftElbow, pose.leftWrist, headSize, color(0, 200, 0)); // Left arm
  drawLimb(pose, pose.rightShoulder, pose.rightElbow, pose.rightWrist, headSize, color(0, 200, 0)); // Right arm
  drawLimb(pose, pose.leftHip, pose.leftKnee, pose.leftAnkle, headSize, color(0, 220, 0)); // Left leg
  drawLimb(pose, pose.rightHip, pose.rightKnee, pose.rightAnkle, headSize, color(0, 220, 0)); // Right leg
  drawHand(pose, pose.leftWrist, headSize, color(0, 160, 0)); // Left hand
  drawHand(pose, pose.rightWrist, headSize, color(0, 160, 0)); // Right hand
  drawFoot(pose, pose.leftAnkle, headSize, color(0, 180, 0)); // Left foot
  drawFoot(pose, pose.rightAnkle, headSize, color(0, 180, 0)); // Right foot
  drawHead(pose, headSize);
  
  pop();
}

function drawHead(pose, size) {
  let nose = pose.nose;
  push();
  translate(nose.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2, 
            nose.y - (pose.leftShoulder.y + pose.rightShoulder.y) / 2);
  
  // Alien head
  fill(0, 255, 0);
  ellipse(0, 0, size, size * 1.2);
  
  // Eyes
  fill(0);
  let eyeSize = size * 0.2;
  ellipse(-size/4, -size/6, eyeSize, eyeSize * 1.5);
  ellipse(size/4, -size/6, eyeSize, eyeSize * 1.5);
  
  // Mouth
  fill(255);
  arc(0, size/5, size/2, size/5, 0, PI);
  
  // Antennae
  stroke(0, 255, 0);
  strokeWeight(2);
  line(0, -size/2, -size/4, -size*0.8);
  line(0, -size/2, size/4, -size*0.8);
  
  pop();
}

function drawBody(pose, headSize) {
  let leftShoulder = pose.leftShoulder;
  let rightShoulder = pose.rightShoulder;
  let leftHip = pose.leftHip;
  let rightHip = pose.rightHip;
  
  let bodyWidth = dist(leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y);
  let bodyHeight = dist((leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2,
                        (leftHip.x + rightHip.x) / 2, (leftHip.y + rightHip.y) / 2);
  
  fill(0, 240, 0);
  ellipse(0, bodyHeight / 2, bodyWidth * 1.2, bodyHeight * 1.1);
}

function drawLimb(pose, joint1, joint2, joint3, headSize, color) {
  let upperLength = dist(joint1.x, joint1.y, joint2.x, joint2.y);
  let lowerLength = dist(joint2.x, joint2.y, joint3.x, joint3.y);
  let limbWidth = headSize * 0.2;
  
  // Upper part
  push();
  translate(joint1.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2, 
            joint1.y - (pose.leftShoulder.y + pose.rightShoulder.y) / 2);
  let angle1 = atan2(joint2.y - joint1.y, joint2.x - joint1.x);
  rotate(angle1);
  fill(color);
  ellipse(upperLength / 2, 0, upperLength, limbWidth);
  pop();
  
  // Lower part
  push();
  translate(joint2.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2, 
            joint2.y - (pose.leftShoulder.y + pose.rightShoulder.y) / 2);
  let angle2 = atan2(joint3.y - joint2.y, joint3.x - joint2.x);
  rotate(angle2);
  fill(color);
  ellipse(lowerLength / 2, 0, lowerLength, limbWidth * 0.8);
  pop();
}

function drawHand(pose, wrist, headSize, color) {
  push();
  translate(wrist.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2, 
            wrist.y - (pose.leftShoulder.y + pose.rightShoulder.y) / 2);
  fill(color);
  ellipse(0, 0, headSize * 0.3, headSize * 0.3);
  pop();
}

function drawFoot(pose, ankle, headSize, color) {
  push();
  translate(ankle.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2, 
            ankle.y - (pose.leftShoulder.y + pose.rightShoulder.y) / 2);
  fill(color);
  ellipse(0, headSize * 0.1, headSize * 0.4, headSize * 0.2);
  pop();
}

function drawConnection(part1, part2) {
  if (part1.confidence > 0.5 && part2.confidence > 0.5) {
    stroke(0, 255, 0);
    strokeWeight(4);
    line(part1.x, part1.y, part2.x, part2.y);
  }
}