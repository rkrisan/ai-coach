// ===============================
// SECTION 0: MEAL PLAN CALCULATOR
// ===============================

function generateMealPlan() {
    const gender = document.getElementById('gender').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const age = parseFloat(document.getElementById('age').value);
    const activity = parseFloat(document.getElementById('activity').value);

    const btn = document.querySelector('.cam-btn span');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";

    if (!weight || !height || !age) {
        alert("Please ensure all fields (Weight, Height, Age) are filled!");
        btn.innerText = originalText;
        return;
    }

    setTimeout(() => {
        let bmr;
        if (gender === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }

        const tdee = Math.round(bmr * activity);

        document.getElementById('input-section').style.display = 'none';
        const resultSection = document.getElementById('result-section');
        resultSection.style.display = 'block';
        
        btn.innerText = originalText;
        animateValue("target-cals", 0, tdee, 1500);

    }, 800); 
}

function resetCalculator() {
    document.getElementById('input-section').style.display = 'block';
    document.getElementById('result-section').style.display = 'none';
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// ===============================
// SECTION 0.5: DIARY LOGIC
// ===============================
let tasks = JSON.parse(localStorage.getItem('fitai-tasks')) || [];

function initDiary() {
    renderTasks();
    const taskInput = document.getElementById('task-input');
    if(taskInput) {
        taskInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }
}

function addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    
    if (text) {
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false
        };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        input.value = '';
    }
}

function toggleTask(id) {
    tasks = tasks.map(task => {
        if (task.id === id) {
            return { ...task, completed: !task.completed };
        }
        return task;
    });
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
}

function saveTasks() {
    localStorage.setItem('fitai-tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const list = document.getElementById('task-list-container');
    const emptyState = document.getElementById('empty-state');
    
    list.innerHTML = '';
    
    if (tasks.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        tasks.forEach(task => {
            const completedClass = task.completed ? 'completed' : '';
            const html = `
                <div class="task-item ${completedClass}">
                    <div class="task-checkbox" onclick="toggleTask(${task.id})">
                        <i class="fas fa-check"></i>
                    </div>
                    <span class="task-text">${task.text}</span>
                    <i class="fas fa-trash delete-btn" onclick="deleteTask(${task.id})"></i>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', html);
        });
    }
}

document.addEventListener('DOMContentLoaded', initDiary);


// ===============================
// SECTION 1: GLOBAL VARIABLES
// ===============================
let currentExercise = 'squat'; 
let camera;
let pose;
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const feedbackBox = document.getElementById('feedback-box');
const loader = document.getElementById('loader');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

// ===============================
// SECTION 2: NAVIGATION & SELECTION (UPDATED)
// ===============================

function switchTab(tabName) {
    const homeView = document.getElementById('home-view');
    const diaryView = document.getElementById('diary-view');
    const camView = document.getElementById('camera-view');
    const premiumView = document.getElementById('premium-view');
    const navItems = document.querySelectorAll('.nav-item');

    // Reset active states
    navItems.forEach(item => item.classList.remove('active'));
    homeView.classList.remove('active');
    diaryView.classList.remove('active');
    camView.classList.remove('active');
    premiumView.classList.remove('active');

    if (tabName === 'home') {
        homeView.classList.add('active');
        navItems[0].classList.add('active');
        stopCamera(); 
    } else if (tabName === 'diary') {
        diaryView.classList.add('active');
        navItems[1].classList.add('active');
        stopCamera();
    } else if (tabName === 'camera') {
        camView.classList.add('active');
        navItems[2].classList.add('active');
    } else if (tabName === 'premium') {
        premiumView.classList.add('active');
        navItems[3].classList.add('active');
        stopCamera();
    }
}

// FIXED: Now properly handles the button click event
function setExercise(type, btnElement) {
    currentExercise = type;
    
    // 1. Remove 'active' class from ALL exercise buttons
    const buttons = document.querySelectorAll('.ex-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // 2. Add 'active' class ONLY to the clicked button
    if (btnElement) {
        btnElement.classList.add('active');
    }

    // 3. Update Feedback Text
    feedbackBox.innerText = `Selected: ${type.toUpperCase()}. Press Start.`;
    feedbackBox.style.color = "#00ffcc";
}

// ===============================
// SECTION 3: MATH HELPERS
// ===============================

function calculateAngle(a, b, c) {
    let radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// ===============================
// SECTION 4: AI LOGIC LOOP
// ===============================

function onResults(results) {
    if (!results.poseLandmarks) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
    drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});

    const landmarks = results.poseLandmarks;
    const hip = landmarks[24];
    const knee = landmarks[26];
    const ankle = landmarks[28];
    const shoulder = landmarks[12];
    const elbow = landmarks[14];
    const wrist = landmarks[16];
    const hipPoint = landmarks[24]; 

    let angle = 0;
    let pointToDraw = null;

    if (currentExercise === 'squat') {
        if(hip && knee && ankle) {
            angle = calculateAngle(hip, knee, ankle);
            pointToDraw = knee;
            if (angle > 160) {
                feedbackBox.innerText = "Squat: Go Down"; feedbackBox.style.color = "white";
            } else if (angle < 90) {
                feedbackBox.innerText = "Good Depth! ✅"; feedbackBox.style.color = "#00ff00";
            } else {
                feedbackBox.innerText = "Lower..."; feedbackBox.style.color = "yellow";
            }
        }
    } 
    else if (currentExercise === 'curl' || currentExercise === 'pullup') {
        if(shoulder && elbow && wrist) {
            angle = calculateAngle(shoulder, elbow, wrist);
            pointToDraw = elbow;
            if (angle > 160) {
                feedbackBox.innerText = "Extend fully."; feedbackBox.style.color = "white";
            } else if (angle < 50) {
                feedbackBox.innerText = "Squeeze! ✅"; feedbackBox.style.color = "#00ff00";
            } else {
                feedbackBox.innerText = "Working..."; feedbackBox.style.color = "yellow";
            }
        }
    }
    else if (currentExercise === 'pushup' || currentExercise === 'bench') {
        if(shoulder && elbow && wrist) {
            angle = calculateAngle(shoulder, elbow, wrist);
            pointToDraw = elbow;
            if (angle > 160) {
                feedbackBox.innerText = "Lockout"; feedbackBox.style.color = "white";
            }
            if (angle >90 && angle <=160) {
                feedbackBox.innerText = "Lowering..."; feedbackBox.style.color = "yellow";   
            } else if (angle < 90) {
                feedbackBox.innerText = "Good Depth! ✅"; feedbackBox.style.color = "#00ff00";
            } else {
                feedbackBox.innerText = "Pushing..."; feedbackBox.style.color = "yellow";
            }
        }
    }
    else if (currentExercise === 'latraise') {
        if(hipPoint && shoulder && elbow) {
            angle = calculateAngle(hipPoint, shoulder, elbow);
            pointToDraw = shoulder;
            if (angle < 20) {
                feedbackBox.innerText = "Arms Down"; feedbackBox.style.color = "white";
            } else if (angle > 80) {
                feedbackBox.innerText = "Top Position! ✅"; feedbackBox.style.color = "#00ff00";
            } else {
                feedbackBox.innerText = "Raising..."; feedbackBox.style.color = "yellow";
            }
        }
    }

    if(pointToDraw) {
        canvasCtx.font = "30px Arial";
        canvasCtx.fillStyle = "white";
        canvasCtx.fillText(Math.round(angle), pointToDraw.x * 640, pointToDraw.y * 480);
    }
    canvasCtx.restore();
}

// ===============================
// SECTION 5: INITIALIZATION
// ===============================

pose = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`});
pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
pose.onResults(onResults);

function startCamera() {
    loader.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    camera = new Camera(videoElement, {
        onFrame: async () => { await pose.send({image: videoElement}); loader.style.display = 'none'; },
        width: 640, height: 480
    });
    camera.start();
}

function stopCamera() {
    if (camera) { camera.stop(); camera = null; }
    const stream = videoElement.srcObject;
    if (stream) stream.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    feedbackBox.innerText = "Select Exercise & Press Start";
    feedbackBox.style.color = "#00ffcc";
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    loader.style.display = 'none';
}