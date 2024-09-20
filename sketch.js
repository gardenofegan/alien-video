let video;
let poseNet;
let poses = [];
let stars = [];

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
  poseNet.on('pose', gotPoses);
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

function gotPoses(results) {
  poses = results;
}

function draw() {
  // Draw space background
  background(0);
  drawStars();
  
  // Draw aliens for each detected pose
  for (let i = 0; i < poses.length; i++) {
    drawAlien(poses[i].pose);
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

  // Draw body parts
  drawHead(pose, headSize);
  drawBody(pose, headSize);
  drawLimb(pose.leftShoulder, pose.leftElbow, pose.leftWrist, headSize, color(0, 200, 0)); // Left arm
  drawLimb(pose.rightShoulder, pose.rightElbow, pose.rightWrist, headSize, color(0, 200, 0)); // Right arm
  drawLimb(pose.leftHip, pose.leftKnee, pose.leftAnkle, headSize, color(0, 220, 0)); // Left leg
  drawLimb(pose.rightHip, pose.rightKnee, pose.rightAnkle, headSize, color(0, 220, 0)); // Right leg
  drawHand(pose.leftWrist, headSize, color(0, 160, 0)); // Left hand
  drawHand(pose.rightWrist, headSize, color(0, 160, 0)); // Right hand
  drawFoot(pose.leftAnkle, headSize, color(0, 180, 0)); // Left foot
  drawFoot(pose.rightAnkle, headSize, color(0, 180, 0)); // Right foot
}

function drawHead(pose, size) {
  let nose = pose.nose;
  if (nose.confidence > 0.5) {
    push();
    translate(nose.x, nose.y);
    
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
}

function drawBody(pose, headSize) {
  let leftShoulder = pose.leftShoulder;
  let rightShoulder = pose.rightShoulder;
  let leftHip = pose.leftHip;
  let rightHip = pose.rightHip;
  
  if (leftShoulder.confidence > 0.5 && rightShoulder.confidence > 0.5 &&
      leftHip.confidence > 0.5 && rightHip.confidence > 0.5) {
    let bodyWidth = dist(leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y);
    let bodyHeight = dist((leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2,
                          (leftHip.x + rightHip.x) / 2, (leftHip.y + rightHip.y) / 2);
    
    push();
    translate((leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2);
    fill(0, 240, 0);
    ellipse(0, bodyHeight / 2, bodyWidth * 1.2, bodyHeight * 1.1);
    pop();
  }
}

function drawLimb(joint1, joint2, joint3, headSize, color) {
  if (joint1.confidence > 0.5 && joint2.confidence > 0.5 && joint3.confidence > 0.5) {
    let upperLength = dist(joint1.x, joint1.y, joint2.x, joint2.y);
    let lowerLength = dist(joint2.x, joint2.y, joint3.x, joint3.y);
    let limbWidth = headSize * 0.2;
    
    // Upper part
    push();
    translate(joint1.x, joint1.y);
    let angle1 = atan2(joint2.y - joint1.y, joint2.x - joint1.x);
    rotate(angle1);
    fill(color);
    ellipse(upperLength / 2, 0, upperLength, limbWidth);
    pop();
    
    // Lower part
    push();
    translate(joint2.x, joint2.y);
    let angle2 = atan2(joint3.y - joint2.y, joint3.x - joint2.x);
    rotate(angle2);
    fill(color);
    ellipse(lowerLength / 2, 0, lowerLength, limbWidth * 0.8);
    pop();
  }
}

function drawHand(wrist, headSize, color) {
  if (wrist.confidence > 0.5) {
    push();
    translate(wrist.x, wrist.y);
    fill(color);
    ellipse(0, 0, headSize * 0.3, headSize * 0.3);
    pop();
  }
}

function drawFoot(ankle, headSize, color) {
  if (ankle.confidence > 0.5) {
    push();
    translate(ankle.x, ankle.y);
    fill(color);
    ellipse(0, headSize * 0.1, headSize * 0.4, headSize * 0.2);
    pop();
  }
}

function drawConnection(part1, part2) {
  if (part1.confidence > 0.5 && part2.confidence > 0.5) {
    stroke(0, 255, 0);
    strokeWeight(4);
    line(part1.x, part1.y, part2.x, part2.y);
  }
}