/* =========================
   Data generation (200 unique students)
   Distribution per year:
   CSE:20, ECE:10, IT:15, ME:5  -> total 50 per year -> 200 students
   ========================= */

const deptDistribution = { CSE:20, ECE:10, IT:15, ME:5 };
const years = [1,2,3,4];

const firstNames = ["Rahul","Anjali","Rohan","Priya","Amit","Neha","Vikas","Pooja","Sandeep","Kiran","Riya","Manish","Sneha","Aditya","Tanya","Nitin","Pallavi","Rakesh","Kavita","Saurabh","Deepak","Simran","Ankit","Ritu","Alok","Shreya","Isha","Arjun","Meera","Kunal","Tarun","Dia","Irfan","Yash","Anaya","Kabir","Maya","Rohit","Zara","Rekha","Varun","Nora","Veda","Sameer","Ila","Priya","Karan","Lina","Omi","Sana"];
const lastNames = ["Sharma","Singh","Kumar","Patel","Gupta","Das","Chowdhury","Ghosh","Roy","Jain","Bose","Mehta","Kapoor","Verma","Chakraborty","Rana","Sen","Malik","Trivedi","Desai","Nair","Reddy","Shetty","Joshi","Prasad","Iyer","Dutta","Bhatt","Naim","Sethi","Saxena"];

let usedNames = new Set();
let students = [];
let id = 1;

function uniqueName() {
  let tries = 0;
  while (tries < 2000) {
    const fn = firstNames[Math.floor(Math.random()*firstNames.length)];
    const ln = lastNames[Math.floor(Math.random()*lastNames.length)];
    const name = fn + " " + ln;
    if (!usedNames.has(name)) { usedNames.add(name); return name; }
    tries++;
  }
  // fallback
  return "Student " + Math.floor(Math.random()*10000);
}

years.forEach(year => {
  for (const dept in deptDistribution) {
    const count = deptDistribution[dept];
    for (let i=1; i<=count; i++) {
      const name = uniqueName();
      const roll = `${dept}${year}${String(i).padStart(2,'0')}`; // e.g., CSE101
      const attendance = Math.floor(Math.random()*41)+50; // 50-90
      const marks = Math.floor(Math.random()*41)+50;
      const assignment = Math.floor(Math.random()*41)+50;
      const lastSem = Math.floor(Math.random()*41)+50;
      const feeStatus = (Math.random() < 0.8) ? "Paid" : "Unpaid"; // 20% unpaid
      const guardian = "Mr/Ms " + name.split(" ")[1];
      const phone = generatePhone();
      students.push({
        id: id++,
        name, roll, year, dept,
        attendance, marks, assignment, lastSem,
        feeStatus, guardian, phone
      });
    }
  }
});

function generatePhone(){
  // ensure unique-ish phone
  return "9" + Math.floor(Math.random()*900000000 + 100000000);
}

/* ===== compute risk baseline (client-side) =====
   We'll provide two models:
   1) Logistic Regression (simple sigmoid weights)
   2) Decision Tree (simple thresholds)
*/

function logisticProbability(s) {
  // features normalized roughly 0-1
  const att = s.attendance / 100; // 0.5 - 0.9
  const marks = s.marks / 100;
  const assign = s.assignment / 100;
  const last = s.lastSem / 100;
  const feeUnpaid = (s.feeStatus === "Unpaid") ? 1 : 0;

  // weights - chosen for demo (attendance most important)
  const w_att = 3.0;
  const w_marks = 1.8;
  const w_assign = 0.8;
  const w_last = 1.0;
  const w_fee = 2.5; // unpaid increases dropout probability

  const bias = -4.0; // shift toward lower probability

  const z = w_att*(1-att) + w_marks*(1-marks) + w_assign*(1-assign) + w_last*(1-last) + w_fee*feeUnpaid + bias;
  // note: we use (1-att) because lower att increases risk

  const prob = 1 / (1 + Math.exp(-z)); // sigmoid
  return Math.round(prob * 100); // percentage 0-100
}

function decisionTreePredict(s) {
  // Simple interpretable tree:
  // If attendance < 60 -> High probability (>=70)
  // Else if attendance < 75 and marks < 65 -> medium (50-70)
  // Else if fee unpaid and attendance < 80 -> medium-high
  // Else low
  if (s.attendance < 60) return 85;
  if (s.attendance < 75 && s.marks < 65) return 65;
  if (s.feeStatus === "Unpaid" && s.attendance < 80) return 60;
  if (s.marks < 60 && s.assignment < 60) return 70;
  return 12; // low probability
}

/* Utility: produce risk label from probability */
function riskLabelFromProb(p) {
  if (p < 40) return "Safe";
  if (p < 70) return "Warning";
  return "High Risk";
}

/* Login (frontend demo only) */
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const pwd = document.getElementById("password").value.trim();
  const msg = document.getElementById("loginMsg");
  const users = {
    "admin@example.com": { pwd:"admin123", role:"admin" },
    "teacher@example.com": { pwd:"teacher123", role:"teacher" }
  };
  if (users[email] && users[email].pwd === pwd) {
    // store role in sessionStorage and redirect to dashboard
    sessionStorage.setItem("rsm_user", JSON.stringify({ email, role: users[email].role }));
    location.href = "dashboard.html";
  } else {
    msg.textContent = "Invalid credentials (demo). Try admin@example.com/admin123";
    msg.style.color = "red";
  }
}

/* Students page: filter by year and show table with prediction */
function filterYear() {
  const sel = document.getElementById("yearFilter");
  if (!sel) return;
  const year = sel.value;
  const model = document.getElementById("modelSelect").value || "logistic";
  const list = students.filter(s => String(s.year) === String(year));
  if (!year) {
    document.getElementById("studentList").innerHTML = "<p>Please select a year.</p>";
    return;
  }

  let html = `<table>
    <tr>
      <th>S/N</th><th>Name</th><th>Roll</th><th>Dept</th><th>Attendance</th><th>Marks</th><th>Assignment</th><th>Last Sem</th><th>Fee</th><th>Dropout %</th><th>Risk</th><th>Counsel</th>
    </tr>`;

  list.forEach((s, idx) => {
    const prob = (model === "logistic") ? logisticProbability(s) : decisionTreePredict(s);
    const risk = riskLabelFromProb(prob);
    html += `<tr>
      <td>${idx+1}</td>
      <td>${s.name}</td>
      <td>${s.roll}</td>
      <td>${s.dept}</td>
      <td>${s.attendance}%</td>
      <td>${s.marks}</td>
      <td>${s.assignment}</td>
      <td>${s.lastSem}</td>
      <td>${s.feeStatus}</td>
      <td>${prob}%</td>
      <td class="${risk==='Safe'?'safe':risk==='Warning'?'warning':'highrisk'}">${risk}</td>
      <td><button onclick="openCounselBox(${s.id})">Counsel</button></td>
    </tr>`;
  });

  html += `</table>`;
  document.getElementById("studentList").innerHTML = html;
}

/* Attendance page: render table of (filtered) students */
function refreshAttendance() {
  const yrSelect = document.getElementById("showYear");
  const yearFilter = yrSelect ? yrSelect.value : "";
  const tbl = document.getElementById("attendanceTable");
  // Clear rows except header
  while (tbl.rows.length > 1) tbl.deleteRow(1);

  const model = document.getElementById("modelSelect") ? document.getElementById("modelSelect").value : "logistic";

  students.forEach((s, idx) => {
    if (yearFilter && String(s.year) !== String(yearFilter)) return;
    const prob = (model === "logistic") ? logisticProbability(s) : decisionTreePredict(s);
    const risk = riskLabelFromProb(prob);
    const row = tbl.insertRow();
    row.innerHTML = `
      <td>${idx+1}</td>
      <td>${s.name}</td>
      <td>${s.roll}</td>
      <td>${s.year}</td>
      <td>${s.dept}</td>
      <td>${s.attendance}%</td>
      <td>${s.marks}</td>
      <td>${s.feeStatus}</td>
      <td class="${risk==='Safe'?'safe':risk==='Warning'?'warning':'highrisk'}">${risk}</td>
      <td><button onclick="openCounselBox(${s.id})">Counsel</button></td>
    `;
  });
}

/* Counseling box (modal-like) - small prompt */
function openCounselBox(studentId) {
  const s = students.find(x => x.id === studentId);
  if (!s) return alert("Student not found");
  const model = document.getElementById("modelSelect") ? document.getElementById("modelSelect").value : "logistic";
  const prob = (model === "logistic") ? logisticProbability(s) : decisionTreePredict(s);
  const risk = riskLabelFromProb(prob);
  // Compose message
  const urgent = (risk === "High Risk" || prob >= 70) ? "URGENT: " : "";
  const message = `${urgent}Hi ${s.name},\nWe noticed a risk of dropout (${prob}%).\nAttendance: ${s.attendance}%, Marks: ${s.marks}, Fee Status: ${s.feeStatus}.\nAction steps:\n1) Attend classes regularly\n2) Complete pending assignments\n3) Meet your counselor this week\nGuardian: ${s.guardian} (${s.phone})`;

  // Show prompt to send (simulate SMS)
  const doSend = confirm(`${message}\n\nSend this message to guardian via SMS? (simulation)`);
  if (doSend) {
    // Simulated send - in production you'd call a server-side Twilio function
    simulateSendSMS(s.phone, message);
    alert("Message queued (simulated). Check console for details.");
  }
}

/* Simulated SMS send (frontend). Real SMS requires a backend (Twilio/other). */
function simulateSendSMS(number, message) {
  console.log("SIMULATED SMS SEND -> to:", number);
  console.log("MESSAGE:");
  console.log(message);
  // for demo, show a small toast
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.right = "20px";
  toast.style.bottom = "20px";
  toast.style.background = "#071833";
  toast.style.color = "#fff";
  toast.style.padding = "10px 12px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
  toast.innerText = `Simulated SMS sent to ${number}`;
  document.body.appendChild(toast);
  setTimeout(()=> toast.remove(), 3500);
}

/* Optional: OpenAI integration (client-side NOT recommended; show as example)
   If you want to use OpenAI, you should call it from a secure backend.
   Example (do not embed secret in client):
   function callOpenAI(prompt) {
     return fetch("https://api.openai.com/v1/chat/completions", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         "Authorization": "Bearer YOUR_OPENAI_API_KEY"
       },
       body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content:prompt}], max_tokens:200 })
     }).then(r=>r.json());
   }
*/

/* Auto-run on pages: */
window.addEventListener("load", function() {
  // if attendance page present -> render
  refreshAttendance();
  // if students page present and a year is pre-selected, optionally show
});
