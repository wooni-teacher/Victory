import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase, ref, onValue, set, update, child
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

/* =========================================================
   1) FIREBASE 설정 — 본인 Firebase 프로젝트 값으로 반드시 교체하세요.
   Firebase 콘솔 > 프로젝트 설정 > 일반 > "내 앱" > SDK 설정에서 확인
   databaseURL은 Realtime Database 만들 때 발급된 주소를 넣어야 합니다.
   (예: "https://kinball-checkboard-default-rtdb.asia-southeast1.firebasedatabase.app")
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyBI7v_99qd2sMxLcnYnZinrUfshZm3_e0w",
  authDomain: "kinball-project.firebaseapp.com",
  databaseURL: "https://kinball-project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kinball-project",
  storageBucket: "kinball-project.firebasestorage.app",
  messagingSenderId: "673457878504",
  appId: "1:673457878504:web:af603917ee1f2db38de05d"
};

const CONFIG_IS_PLACEHOLDER = firebaseConfig.apiKey === "YOUR_API_KEY";

/* ---------------- static roster / schedule ---------------- */
const GIRLS = ["이재희","조현영","이나경","심규원","민하늘","이보현","윤하늘","이지은"];
const BOYS  = ["이재원","이강우","전민준","임규원","한승우","유준선","임휘재"];
const HITTERS = ["이재희","심규원","이지은"];
const CALLERS = ["민하늘","조현영","윤하늘","이나경"];
const ALL_STUDENTS = GIRLS.concat(BOYS);
const COACH_PASSWORD = "1234";

/* 킨볼은 3팀(핑크·그레이·블루) 동시 경기 방식 — 히터 1명·콜러·수비가 고르게 섞이도록 기본 배분 */
const TEAM_COLORS = [
  {key:"pink", label:"핑크", bg:"var(--rose-bg)", border:"var(--rose-border)", text:"var(--rose)"},
  {key:"gray", label:"그레이", bg:"var(--slate-bg)", border:"var(--slate-border)", text:"var(--slate)"},
  {key:"blue", label:"블루", bg:"var(--sky-bg)", border:"var(--sky-border)", text:"var(--sky)"},
];
const DEFAULT_TEAMS = {
  "이재희":"pink", "민하늘":"pink", "이보현":"pink", "이재원":"pink", "이강우":"pink",
  "심규원":"gray", "조현영":"gray", "전민준":"gray", "임규원":"gray", "한승우":"gray",
  "이지은":"blue", "윤하늘":"blue", "이나경":"blue", "유준선":"blue", "임휘재":"blue",
};

function roleOf(name){
  if (BOYS.includes(name)) return "보조";
  const tags=[];
  if (HITTERS.includes(name)) tags.push("히터");
  if (CALLERS.includes(name)) tags.push("콜러");
  tags.push("수비");
  return tags.join("·");
}

const PHASE1_DATES = ["7/15","7/17","7/20","7/21","7/22","7/24"];
const PHASE2_DATES = ["8/4","8/5","8/6","8/7","8/10","8/11","8/12","8/13","8/14"];
const ALL_DATES = PHASE1_DATES.concat(PHASE2_DATES);

const SKILL_ITEMS = {
  "히터": { students: HITTERS, color:"rose", items:[
    "하체, 허리 힘 + 팔 전체 스윙 사용","3인 동시 타점 맞추기(하나-둘-셋)","타겟 히팅 정확도","히팅 전 손목·어깨 스트레칭 습관화"
  ]},
  "수비": { students: GIRLS, color:"slate", items:[
    "낮은 자세로 무게중심 유지","낙하지점 예측 · 슬라이딩 타이밍","좌우 사이드 스텝 반응속도"
  ]},
  "콜러": { students: CALLERS, color:"sky", items:[
    "크고 명확한 목소리로 콜 전달","공 닿기 직전 타이밍에 콜","경기장 전체 위치 파악 후 판단"
  ]},
};

const FITNESS_DRILLS = [
  {key:"sidestep", label:"사이드스텝", unit:"콘 왕복 5회", tip:"콘을 일정 간격으로 깔아두고, 무릎을 살짝 굽힌 채 발이 교차되지 않게 옆으로 짧게 끊어 이동하며 왕복하세요. 신호에 반응해 방향을 바꾸는 연습도 함께 하면 좋아요."},
  {key:"sprint", label:"반응 스프린트", unit:"왕복 5회", tip:"엎드린 상태에서 신호에 맞춰 빠르게 일어나 몸을 낮추고 무게중심을 앞에 둔 채 출발하세요. 첫 3걸음을 최대한 빠르게 내딛는 게 핵심이에요."},
  {key:"shuttle", label:"셔틀런", unit:"회 / 20m 왕복 5회", tip:"왕복 지점에서 방향을 바꿀 때 속도가 줄지 않도록, 마지막 한 걸음을 크게 디디며 몸을 돌리세요."},
  {key:"dropstep", label:"드롭스텝", unit:"회 / 10회 반복", tip:"공이 뒤로 넘어갈 때는 뒤돌아 걷지 말고, 축발을 돌려 몸 전체를 돌린 뒤 공 방향으로 전력 질주하세요."},
];

/* 슬라이딩 훈련 3종 — 각 종목별로 성공/시도를 따로 기록 */
const SLIDING_DRILLS = [
  {key:"bounce", label:"공 튕겨서 슬라이딩", desc:"거리별로 공을 튀긴 후, 슬라이딩으로 리시브에 성공했는지 측정합니다."},
  {key:"side", label:"양 옆 슬라이딩", desc:"일정 거리에서 대각으로 날아오는 공을 슬라이딩으로 받아내는 성공 여부를 측정합니다."},
  {key:"pair", label:"2인 1조 슬라이딩", desc:"한 명은 커버, 한 명은 슬라이더 역할을 정합니다. 슬라이더가 공을 위로 띄우면 다른 한 명이 슬라이딩으로 받아냅니다."},
];

/* 오늘 날짜를 "7/21" 형식으로 반환 — 학생 모드에서 당일 항목만 체크 가능하도록 사용 */
function getTodayKey(){
  const d = new Date();
  return `${d.getMonth()+1}/${d.getDate()}`;
}
const TODAY_KEY = getTodayKey();
const TODAY_IS_TRAINING_DAY = ALL_DATES.includes(TODAY_KEY);

/* Realtime Database 키 이름에는 . # $ [ ] / 를 쓸 수 없어서(날짜에 "/"가 들어감),
   저장용 키를 만들 때는 항상 이 함수를 거쳐 안전한 문자로 바꿔줍니다. */
function K(...parts){
  return parts.map((p) => String(p).replace(/[.#$\[\]\/]/g, "-")).join("__");
}

function emptyData(){
  return { attendance:{}, skills:{}, fitness:{}, sliding:{}, selflog:{}, teams:{...DEFAULT_TEAMS}, scoreboard:{}, updatedAt:null };
}

/* ---------------- state ---------------- */
let data = emptyData();
let appMode = "gate";       // 'gate' | 'coach' | 'student'
let gateView = "select";    // 'select' | 'coachLogin' | 'studentSelect'
let gateError = "";
let studentName = null;
let tab = "home";
let phaseAttendance = 1;
let phaseFitness = 1;
let phaseSliding = 1;
let slidingDrill = "bounce";
let openRole = "히터";
let fitnessDrill = "sidestep";
let logStudent = GIRLS[0];
let logDate = ALL_DATES[0];
let scoreboardDate = TODAY_IS_TRAINING_DAY ? TODAY_KEY : ALL_DATES[0];
let editing = false;
let editingTimeoutId = null;
/* blur 이벤트를 놓치는 경우를 대비한 안전장치 — 20초 후 자동으로 편집 잠금 해제 */
function setEditing(val){
  editing = val;
  if (editingTimeoutId){ clearTimeout(editingTimeoutId); editingTimeoutId = null; }
  if (val){
    editingTimeoutId = setTimeout(()=>{ editing = false; }, 20000);
  }
}
let saving = false;
let firebaseErrorMsg = "";
let deferredInstallPrompt = null;
let showInstallHint = false;

const root = document.getElementById("kbRoot");

/* ---------------- Firebase init & realtime sync (Realtime Database) ---------------- */
let dataRef = null;

function initFirebase(){
  if (CONFIG_IS_PLACEHOLDER){
    render();
    return;
  }
  try{
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    dataRef = ref(db, "kinball/live-data");

    onValue(dataRef, (snapshot) => {
      firebaseErrorMsg = "";
      const val = snapshot.val();
      if (val){
        if (!editing){
          data = Object.assign(emptyData(), val);
          render();
        }
      } else {
        const init = emptyData();
        init.updatedAt = Date.now();
        set(dataRef, init).catch((e)=>console.error("초기 데이터 생성 실패", e));
        data = init;
        render();
      }
    }, (err) => {
      console.error("Realtime Database 연결 오류", err);
      firebaseErrorMsg = "Realtime Database에 연결하지 못했습니다. firebaseConfig(databaseURL 포함) 값과 보안 규칙을 확인해 주세요. (" + err.message + ")";
      render();
    });

    render();
  }catch(e){
    console.error("Firebase 초기화 실패", e);
    firebaseErrorMsg = "Firebase 초기화에 실패했습니다: " + e.message;
    render();
  }
}

/* 값 하나가 바뀔 때 전체 데이터를 통째로 다시 쓰지 않고,
   바뀐 경로(path)만 정확히 수정합니다 — 여러 학생이 동시에 저장해도
   서로 다른 항목이면 절대 서로를 덮어쓰지 않습니다.
   네트워크가 순간적으로 끊겨도 한 번 더 자동 재시도합니다. */
async function persistPath(path, value, attempt=1){
  if (!dataRef){
    firebaseErrorMsg = "Firebase Realtime Database에 연결되지 않아 저장되지 않았습니다. 페이지를 새로고침하거나 관리자(코치)에게 알려주세요.";
    render();
    return;
  }
  saving = true; updateStatus();
  try{
    await set(child(dataRef, path), value);
    firebaseErrorMsg = "";
    saving = false; updateStatus();
  }catch(e){
    if (attempt < 3){
      setTimeout(()=>persistPath(path, value, attempt+1), 1500);
      return;
    }
    console.error("저장 실패", e);
    saving = false;
    firebaseErrorMsg = "저장에 실패했습니다(네트워크 확인 필요): " + e.message;
    render();
  }
}

/* 여러 경로를 한 번에 원자적으로 수정할 때 사용 (예: 팀 전체 초기화) */
async function persistMultiPath(relativeUpdates, attempt=1){
  if (!dataRef){
    firebaseErrorMsg = "Firebase Realtime Database에 연결되지 않아 저장되지 않았습니다. 페이지를 새로고침하거나 관리자(코치)에게 알려주세요.";
    render();
    return;
  }
  saving = true; updateStatus();
  try{
    await update(dataRef, relativeUpdates);
    firebaseErrorMsg = "";
    saving = false; updateStatus();
  }catch(e){
    if (attempt < 3){
      setTimeout(()=>persistMultiPath(relativeUpdates, attempt+1), 1500);
      return;
    }
    console.error("저장 실패", e);
    saving = false;
    firebaseErrorMsg = "저장에 실패했습니다(네트워크 확인 필요): " + e.message;
    render();
  }
}

function patch(section, key, value){
  data[section][key] = value;
  persistPath(`${section}/${key}`, value);
}

function patchSelfLog(student, date, field, value){
  const k = K(student, date);
  const cur = data.selflog[k] || {goal:"",good:"",improve:"",next:"",coachCheck:false,coachFeedback:""};
  cur[field] = value;
  data.selflog[k] = cur;
  persistPath(`selflog/${k}/${field}`, value);
}

function addScoreEntry(date, label, pink, gray, blue){
  data.scoreboard = data.scoreboard || {};
  const id = K(date, String(Date.now()));
  const entry = {
    date, label: label || "게임",
    pink: Number(pink)||0, gray: Number(gray)||0, blue: Number(blue)||0,
    teams: {...(data.teams||{})}
  };
  data.scoreboard[id] = entry;
  persistPath(`scoreboard/${id}`, entry);
}
function deleteScoreEntry(id){
  if (data.scoreboard) delete data.scoreboard[id];
  persistPath(`scoreboard/${id}`, null);
}

/* ---------------- render helpers ---------------- */
function esc(s){ return (s==null?"":String(s)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

const ROLE_COLOR = {
  rose:{bg:"var(--rose-bg)",border:"var(--rose-border)",text:"var(--rose)"},
  slate:{bg:"var(--slate-bg)",border:"var(--slate-border)",text:"var(--slate)"},
  sky:{bg:"var(--sky-bg)",border:"var(--sky-border)",text:"var(--sky)"},
};

function updateStatus(){
  const el = document.getElementById("kbStatus");
  if (el) el.innerHTML = saving
    ? '<span style="color:#ffe08a;font-weight:700;">⏳ 저장 중... 잠시만 기다려주세요</span>'
    : '<span>✅ 저장됨 (실시간 동기화)</span>';
}

function canEdit(name){
  if (appMode === "coach") return true;
  if (appMode === "student") return name === studentName;
  return false;
}

/* 아이폰(Safari)이나 화웨이/샤오미 등 일부 안드로이드 브라우저는
   자동 설치 팝업(beforeinstallprompt)을 지원하지 않아, 기기별 수동 설치 안내를 보여줌 */
function getInstallHint(){
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS){
    return "iOS(아이폰·아이패드)는 자동 설치 팝업이 없어요. Safari 화면 하단(또는 상단) 공유 버튼(⬆️ 네모 안 화살표)을 누른 뒤 '홈 화면에 추가'를 선택해주세요. 크롬으로 열었다면 우측 상단 ⋯ 메뉴에서 '공유' → '홈 화면에 추가'를 찾아주세요.";
  }
  const isAndroid = /Android/.test(ua);
  if (isAndroid){
    return "브라우저 오른쪽 위 메뉴(⋮ 또는 ≡)를 열고 '홈 화면에 추가' 또는 '앱 설치'를 찾아 눌러주세요. 화웨이·샤오미·오포 등 일부 기기는 '바로가기 추가'라는 문구로 표시될 수 있어요.";
  }
  return "브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치' 항목을 찾아 눌러주세요.";
}

/* ---------------- coaching-point helper icon ---------------- */
function tipButtonHtml(key){
  return `<button type="button" class="kb-tip-btn" data-tipkey="${esc(key)}" aria-label="코칭 포인트 보기">?</button>`;
}
function tipBoxHtml(key, text){
  return `<div class="kb-tip-box" id="tipbox-${esc(key)}" style="display:none">💡 ${esc(text)}</div>`;
}
function bindTipButtons(c){
  c.querySelectorAll(".kb-tip-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const box = document.getElementById("tipbox-"+btn.dataset.tipkey);
      if (box) box.style.display = box.style.display === "none" ? "block" : "none";
    };
  });
}

/* ---------------- 4차시 수업 커리큘럼 (코치 전용) ---------------- */
const CURRICULUM = [
  { session:"1차시", theme:"기초체력 & 기술 입문", blocks:[
    {time:"0~10분", title:"준비운동", desc:"동적 스트레칭(목·어깨·손목 회전, 하이니, 버트킥, 사이드스텝)"},
    {time:"10~20분", title:"기초체력 서킷", desc:"사이드스텝 · 반응 스프린트 · 셔틀런 · 드롭스텝 4개 스테이션 순환"},
    {time:"20~35분", title:"역할별 기초기술 도입", desc:"히터 스윙폼 / 수비 자세 / 콜러 신호 — 처음 배우는 수준의 기본기 훈련"},
    {time:"35~40분", title:"목표 정리 + 팀 확인", desc:"오늘의 목표 안내 및 팀 편성 탭 기준 소속 팀 확인"},
  ]},
  { session:"2차시", theme:"역할별 기술훈련 + 미니게임", blocks:[
    {time:"0~5분", title:"준비운동", desc:"가벼운 스트레칭 + 반응 스타트"},
    {time:"5~20분", title:"역할별 세부기술", desc:"히터 스윙 / 수비 슬라이딩 / 콜러 타이밍 로테이션 훈련"},
    {time:"20~35분", title:"3팀 미니게임", desc:"팀 편성 탭 배정 기준 핑크·그레이·블루 3팀 축소 규칙 미니게임"},
    {time:"35~40분", title:"게임 피드백", desc:"미니게임에서 잘된 점 · 보완할 점 공유"},
  ]},
  { session:"3차시", theme:"세부기술 추가훈련", blocks:[
    {time:"0~5분", title:"준비운동", desc:"가벼운 스트레칭"},
    {time:"5~15분", title:"약점 보완 훈련", desc:"2차시 미니게임에서 드러난 약점 중심 개인·역할별 보완 훈련"},
    {time:"15~30분", title:"세부기술 심화", desc:"타겟 히팅 정확도 / 드롭스텝 반응속도 / 콜 타이밍 정밀화 등 심화 훈련"},
    {time:"30~40분", title:"기술 체크리스트 점검", desc:"코치가 역할별 기술 체크리스트 항목 점검"},
  ]},
  { session:"4차시", theme:"마무리", blocks:[
    {time:"0~5분", title:"준비운동", desc:"가벼운 스트레칭"},
    {time:"5~25분", title:"실전 스크리미지", desc:"경기 규칙 적용, 팀 편성 탭 기준 핑크·그레이·블루 3팀 실전 게임"},
    {time:"25~30분", title:"출석·기록 최종 점검", desc:"출석 체크 및 기초체력·슬라이딩 기록 확인"},
    {time:"30~40분", title:"자율 기록지 작성", desc:"학생별 자율 기록지 작성 + 코치 총평"},
  ]},
];

/* ---------------- Firebase setup guard screen ---------------- */
function renderSetupNeeded(){
  root.innerHTML = `
    <div class="kb-gate">
      <div class="kb-gate-card" style="max-width:460px;">
        <div class="kb-gate-title">⚙️ Firebase 설정이 필요해요</div>
        <div class="kb-gate-sub">app.js 상단의 firebaseConfig 값을 채워야 앱이 동작합니다</div>
        <div class="kb-gate-panel" style="font-size:12.5px;line-height:1.7;color:var(--text);">
          1. Firebase 콘솔(console.firebase.google.com)에서 프로젝트 생성<br>
          2. Realtime Database 만들기 (테스트 모드로 시작 가능)<br>
          3. 프로젝트 설정 → 웹 앱 추가 → SDK 설정값 복사 (databaseURL 포함)<br>
          4. <code>app.js</code> 맨 위 <code>firebaseConfig</code> 객체에 붙여넣기<br>
          5. 저장 후 새로고침
        </div>
        ${firebaseErrorMsg ? `<div class="kb-gate-err">${esc(firebaseErrorMsg)}</div>` : ""}
      </div>
    </div>`;
}

/* ---------------- top-level render ---------------- */
function render(){
  if (CONFIG_IS_PLACEHOLDER) return renderSetupNeeded();
  if (appMode === "gate") return renderGate();

  const badge = appMode==="coach"
    ? '<span class="kb-badge coach">코치 모드</span>'
    : '<span class="kb-badge student">학생 모드 · '+esc(studentName)+'</span>';

  root.innerHTML = `
    <div class="kb-header">
      <div class="kb-header-row">
        <div>
          <div class="kb-dots">
            <span style="background:var(--rose)"></span><span style="background:var(--slate)"></span><span style="background:var(--sky)"></span>
          </div>
          <div class="kb-title">킨볼 집중훈련 실시간 체크보드</div>
          <div class="kb-sub">1차 7/15~7/24 · 2차 8/4~8/14 · 히터(로즈) · 수비(그레이) · 콜러(스카이)</div>
        </div>
        <div class="kb-status" id="kbStatusWrap">
          ${badge}
          <span id="kbStatus">✅ 저장됨 (실시간 동기화)</span>
          <button class="kb-btn-refresh" id="kbInstallBtn">📲 앱 설치</button>
          <button class="kb-btn-exit" id="kbExitBtn">⏻ 나가기</button>
        </div>
      </div>
    </div>
    ${firebaseErrorMsg ? `<div style="background:#fee2e2;color:#991b1b;font-size:12.5px;padding:9px 16px;border-bottom:1px solid #fecaca;">⚠️ ${esc(firebaseErrorMsg)}</div>` : ""}
    ${showInstallHint ? `<div style="background:#eef4fb;color:#1e4a72;font-size:12.5px;padding:9px 16px;border-bottom:1px solid #cfe0f2;">📲 ${esc(getInstallHint())}</div>` : ""}
    <div class="kb-tabs" id="kbTabs"></div>
    <div class="kb-content" id="kbContent"></div>
  `;
  const installBtn = document.getElementById("kbInstallBtn");
  if (installBtn){
    installBtn.onclick = async () => {
      if (deferredInstallPrompt){
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        render();
      } else {
        showInstallHint = !showInstallHint;
        render();
      }
    };
  }
  document.getElementById("kbExitBtn").onclick = () => {
    appMode = "gate"; gateView = "select"; gateError=""; studentName=null; tab="home";
    render();
  };
  renderTabs();
  renderContent();
}

/* ---------------- Gate (login / role select) ---------------- */
function renderGate(){
  let inner = "";
  if (gateView === "select"){
    inner = `
      <button class="kb-gate-role-btn" id="gateCoachBtn">
        <div class="t">🔐 코치 모드로 입장</div>
        <div class="d">접속번호 필요 · 모든 기록 확인 및 편집</div>
      </button>
      <button class="kb-gate-role-btn" id="gateStudentBtn">
        <div class="t">🙋 학생 모드로 입장</div>
        <div class="d">본인 이름 선택 · 본인 항목 체크 및 자율 기록지 작성</div>
      </button>
      <button class="kb-gate-btn" id="gateInstallBtn" style="margin-top:6px;background:#2e7d52;">📲 홈 화면에 앱 설치</button>
      ${showInstallHint ? `<div class="kb-tip-box" style="margin-top:10px;">${esc(getInstallHint())}</div>` : ""}
    `;
  } else if (gateView === "coachLogin"){
    inner = `
      <div class="kb-gate-panel">
        <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">접속번호</label>
        <input type="password" id="coachPwInput" placeholder="4자리 접속번호" maxlength="8" inputmode="numeric">
        ${gateError ? `<div class="kb-gate-err">${esc(gateError)}</div>` : ""}
        <button class="kb-gate-btn" id="coachPwSubmit">입장하기</button>
      </div>
      <button class="kb-gate-back" id="gateBackBtn">← 뒤로가기</button>
    `;
  } else if (gateView === "studentSelect"){
    inner = `
      <div class="kb-gate-panel">
        <label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:6px;">본인 이름 선택</label>
        <select id="studentSelectInput">
          ${ALL_STUDENTS.map(s=>`<option value="${s}">${s} (${roleOf(s)})</option>`).join("")}
        </select>
        <button class="kb-gate-btn" id="studentEnterBtn">입장하기</button>
      </div>
      <button class="kb-gate-back" id="gateBackBtn">← 뒤로가기</button>
    `;
  }

  root.innerHTML = `
    <div class="kb-gate">
      <div class="kb-gate-card">
        <div class="kb-gate-title">🏐 킨볼 집중훈련 체크보드</div>
        <div class="kb-gate-sub">역할을 선택해 입장해 주세요</div>
        ${inner}
      </div>
    </div>
  `;

  if (gateView === "select"){
    document.getElementById("gateCoachBtn").onclick = ()=>{ gateView="coachLogin"; gateError=""; render(); };
    document.getElementById("gateStudentBtn").onclick = ()=>{ gateView="studentSelect"; render(); };
    const instBtn = document.getElementById("gateInstallBtn");
    if (instBtn) instBtn.onclick = async ()=>{
      if (deferredInstallPrompt){
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        render();
      } else {
        showInstallHint = !showInstallHint;
        render();
      }
    };
  } else if (gateView === "coachLogin"){
    const pwInput = document.getElementById("coachPwInput");
    pwInput.focus();
    const submit = ()=>{
      if (pwInput.value === COACH_PASSWORD){
        appMode = "coach"; gateView="select"; gateError=""; tab="home";
        render();
      } else {
        gateError = "접속번호가 올바르지 않습니다.";
        render();
      }
    };
    document.getElementById("coachPwSubmit").onclick = submit;
    pwInput.addEventListener("keydown", (e)=>{ if (e.key==="Enter") submit(); });
    document.getElementById("gateBackBtn").onclick = ()=>{ gateView="select"; gateError=""; render(); };
  } else if (gateView === "studentSelect"){
    document.getElementById("studentEnterBtn").onclick = ()=>{
      const sel = document.getElementById("studentSelectInput");
      studentName = sel.value;
      appMode = "student"; gateView="select"; tab="home";
      if (GIRLS.includes(studentName)){ logStudent = studentName; }
      render();
    };
    document.getElementById("gateBackBtn").onclick = ()=>{ gateView="select"; render(); };
  }
}

function renderTabs(){
  let TABS = [
    {id:"home", label:"개요"},
    {id:"attendance", label:"출석"},
    {id:"skills", label:"기술 체크"},
    {id:"teams", label:"팀 편성"},
    {id:"scoreboard", label:"스코어보드"},
    {id:"fitness", label:"기초체력"},
    {id:"sliding", label:"슬라이딩"},
    {id:"selflog", label:"자율 기록"},
  ];
  if (appMode === "coach"){
    TABS.push({id:"curriculum", label:"수업 커리큘럼"});
  }
  const wrap = document.getElementById("kbTabs");
  wrap.innerHTML = TABS.map(t =>
    `<button class="kb-tab ${tab===t.id?'active':''}" data-tab="${t.id}">${t.label}</button>`
  ).join("");
  wrap.querySelectorAll(".kb-tab").forEach(btn=>{
    btn.onclick = ()=>{ tab = btn.dataset.tab; render(); };
  });
  if (!TABS.find(t=>t.id===tab)) tab = "home";
}

function renderContent(){
  const c = document.getElementById("kbContent");
  if (tab==="home") return renderHome(c);
  if (tab==="attendance") return renderAttendance(c);
  if (tab==="skills") return renderSkills(c);
  if (tab==="fitness") return renderFitness(c);
  if (tab==="sliding") return renderSliding(c);
  if (tab==="selflog") return renderSelfLog(c);
  if (tab==="teams") return renderTeams(c);
  if (tab==="scoreboard") return renderScoreboard(c);
  if (tab==="curriculum") return renderCurriculum(c);
}

/* ---------------- Team assignment (팀 편성) ---------------- */
function renderTeams(c){
  const summary = TEAM_COLORS.map(tc => {
    const members = ALL_STUDENTS.filter(n => (data.teams && data.teams[n]) === tc.key);
    return `<div class="kb-card" style="background:${tc.bg};border-color:${tc.border}">
      <h3 style="color:${tc.text}">${tc.label} 팀 (${members.length}명)</h3>
      <div>${members.length ? members.map(m=>`<span class="kb-chip" style="${m===studentName?'font-weight:700;border-color:var(--navy);':''}">${m}(${roleOf(m)})</span>`).join("") : '<span class="kb-role-tag">배정된 학생 없음</span>'}</div>
    </div>`;
  }).join("");

  if (appMode !== "coach"){
    const myTeamKey = data.teams && data.teams[studentName];
    const myTeam = TEAM_COLORS.find(tc => tc.key === myTeamKey);
    c.innerHTML =
      (myTeam
        ? `<div class="kb-today-card"><div class="kb-today-date">내 팀 · <span style="color:${myTeam.text}">${myTeam.label}</span></div></div>`
        : `<div class="kb-note">아직 팀 배정 전이에요. 코치에게 문의해주세요.</div>`) +
      `<div class="kb-cards">${summary}</div>`;
    return;
  }

  c.innerHTML = `<div class="kb-note" style="margin-bottom:14px;"><b>팀 편성 안내</b><br>킨볼은 핑크·그레이·블루 3팀이 동시에 경기하는 방식입니다. 팀마다 히터·콜러·수비 역할이 고르게 섞이도록 배분하는 것을 권장하며, 버튼을 누르면 즉시 실시간으로 저장됩니다. 상황에 맞게 그때그때 자유롭게 바꿔주세요.</div>
    <div class="kb-cards">${summary}</div>
    <div style="margin:12px 0;"><button type="button" class="kb-btn-exit" style="background:#f1f1f1;color:#555;" id="resetTeamsBtn">전체 미배정으로 초기화</button></div>
    <div class="kb-table-wrap"><table class="kb-table"><thead><tr><th>이름(역할)</th><th>팀 배정</th></tr></thead><tbody>
      ${ALL_STUDENTS.map(name=>{
        const cur = (data.teams && data.teams[name]) || "";
        return `<tr class="${name===studentName?'kb-me':''}"><td>${name} <span class="kb-role-tag">(${roleOf(name)})</span></td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${TEAM_COLORS.map(tc=>`<button type="button" class="kb-team-btn ${cur===tc.key?'active':''}" style="--tc:${tc.text};" data-team-student="${esc(name)}" data-team-key="${tc.key}">${tc.label}</button>`).join("")}
              <button type="button" class="kb-team-btn ${cur===""?'active':''}" style="--tc:var(--muted);" data-team-student="${esc(name)}" data-team-key="">해제</button>
            </div>
          </td></tr>`;
      }).join("")}
    </tbody></table></div>`;
  c.querySelectorAll("[data-team-student]").forEach(btn=>{
    btn.onclick = ()=>{ patch("teams", btn.dataset.teamStudent, btn.dataset.teamKey); renderContent(); };
  });
  const resetBtn = document.getElementById("resetTeamsBtn");
  if (resetBtn) resetBtn.onclick = ()=>{
    if (!confirm("모든 학생을 미배정으로 초기화할까요?")) return;
    data.teams = data.teams || {};
    const updates = {};
    ALL_STUDENTS.forEach(n => { data.teams[n] = ""; updates[`teams/${n}`] = ""; });
    persistMultiPath(updates);
    renderContent();
  };
}

/* ---------------- Scoreboard (스코어보드) ---------------- */
function renderScoreboard(c){
  const entries = Object.entries(data.scoreboard || {})
    .filter(([, e]) => e.date === scoreboardDate)
    .sort((a,b) => (a[1].label||"").localeCompare(b[1].label||""));

  const dateSelectHtml = `<select class="kb-select" id="scoreDateSel">
    ${ALL_DATES.map(d=>`<option value="${d}" ${d===scoreboardDate?"selected":""}>${d}</option>`).join("")}
  </select>`;

  const entryCards = entries.map(([id, e]) => {
    const max = Math.max(e.pink, e.gray, e.blue);
    const teamsSnapshot = e.teams || data.teams || {};
    const rosterFor = (colorKey) => ALL_STUDENTS.filter(n => teamsSnapshot[n] === colorKey);
    return `<div class="kb-today-card">
      <div class="kb-today-drill-row" style="margin-bottom:10px;">
        <span class="kb-today-drill-label">${esc(e.label)}</span>
        ${appMode==="coach" ? `<button type="button" class="kb-btn-exit" style="background:#fee2e2;color:#991b1b;" data-del-score="${esc(id)}">삭제</button>` : ""}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${TEAM_COLORS.map(tc => `<div style="flex:1;min-width:100px;text-align:center;padding:10px;border-radius:10px;background:${tc.bg};border:1px solid ${tc.border};${e[tc.key]===max && max>0 ? 'box-shadow:0 0 0 2px '+tc.text+' inset;' : ''}">
          <div style="font-size:12px;font-weight:700;color:${tc.text};">${tc.label}</div>
          <div style="font-size:22px;font-weight:800;color:${tc.text};margin-top:4px;">${e[tc.key]}</div>
          <div style="font-size:10.5px;color:${tc.text};margin-top:8px;line-height:1.5;opacity:0.9;">${rosterFor(tc.key).map(n=>esc(n)).join(", ") || "배정 없음"}</div>
        </div>`).join("")}
      </div>
    </div>`;
  }).join("") || `<div class="kb-note">이 날짜에 기록된 게임이 아직 없어요.</div>`;

  const addForm = appMode!=="coach" ? "" : `
    <div class="kb-today-card">
      <div class="kb-today-date">새 게임 기록 추가</div>
      <div class="kb-hint" style="margin-bottom:10px;">저장 시점의 「팀 편성」 탭 배정이 그대로 이 게임 기록에 남습니다.</div>
      <input type="text" id="scoreLabelInput" class="kb-input-lg" style="margin-top:0;" placeholder="게임명 (예: 2차시 미니게임)">
      <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
        ${TEAM_COLORS.map(tc => `<div style="flex:1;min-width:80px;">
          <label style="font-size:12px;font-weight:700;color:${tc.text};display:block;margin-bottom:4px;">${tc.label}</label>
          <input type="number" inputmode="numeric" class="kb-input-lg" style="margin-top:0;" id="scoreInput-${tc.key}" placeholder="0">
        </div>`).join("")}
      </div>
      <button type="button" class="kb-gate-btn" id="addScoreBtn" style="margin-top:12px;">게임 기록 저장</button>
    </div>`;

  c.innerHTML = `<div style="margin-bottom:14px;">${dateSelectHtml}</div>` + entryCards + addForm;

  document.getElementById("scoreDateSel").onchange = (e) => { scoreboardDate = e.target.value; renderContent(); };

  if (appMode === "coach"){
    document.getElementById("addScoreBtn").onclick = () => {
      const label = document.getElementById("scoreLabelInput").value.trim();
      const pink = document.getElementById("scoreInput-pink").value;
      const gray = document.getElementById("scoreInput-gray").value;
      const blue = document.getElementById("scoreInput-blue").value;
      addScoreEntry(scoreboardDate, label, pink, gray, blue);
      renderContent();
    };
    c.querySelectorAll("[data-del-score]").forEach(btn => {
      btn.onclick = () => { deleteScoreEntry(btn.dataset.delScore); renderContent(); };
    });
  }
}

/* ---------------- Curriculum (coach only) ---------------- */
function renderCurriculum(c){
  if (appMode !== "coach"){ tab = "home"; return renderHome(c); }
  c.innerHTML = `<div class="kb-note" style="margin-bottom:14px;"><b>운영 안내</b><br>매 차시 40분 수업 + 10분 휴식으로 구성되며, 체크보드의 출석·기술체크·기초체력·슬라이딩·자율기록 항목과 연계해 진행합니다.</div>` +
    CURRICULUM.map((s, i) => `
      <div class="kb-role-block">
        <div class="kb-role-block-head" style="background:var(--navy);color:#fff;cursor:default;">
          <span>${s.session} · ${s.theme}</span>
          <span style="font-size:12px;font-weight:400;">40분 수업 + 10분 휴식</span>
        </div>
        <div style="padding:14px;">
          ${s.blocks.map(b => `
            <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f0f1f2;">
              <div style="min-width:70px;font-size:12px;color:var(--muted);font-weight:700;">${b.time}</div>
              <div>
                <div style="font-weight:700;font-size:13.5px;">${b.title}</div>
                <div style="font-size:12.5px;color:var(--muted);margin-top:2px;">${b.desc}</div>
              </div>
            </div>`).join("")}
          ${i < CURRICULUM.length - 1 ? `<div style="margin-top:10px;font-size:12px;color:var(--muted);">↓ 휴식 10분 후 다음 차시</div>` : ""}
        </div>
      </div>
    `).join("");
}

/* ---------------- Home ---------------- */
function renderHome(c){
  function card(title,color,members,desc){
    const cc = ROLE_COLOR[color];
    return `<div class="kb-card" style="background:${cc.bg};border-color:${cc.border}">
      <h3 style="color:${cc.text}">${title}</h3><p>${desc}</p>
      <div>${members.map(m=>`<span class="kb-chip" style="${m===studentName?'font-weight:700;border-color:var(--navy);':''}">${m}</span>`).join("")}</div>
    </div>`;
  }
  let note = `모든 체크·기록은 저장 즉시 Firebase에 실시간으로 반영됩니다. 다른 기기에서도 새로고침 없이 바로 보여요.`;
  if (appMode==="student") note = `현재 <b>학생 모드(${esc(studentName)})</b>로 접속 중입니다. 출석·기초체력·슬라이딩은 <b>오늘(${esc(TODAY_KEY)}) 항목만</b> 체크·입력할 수 있고, <b>기술 체크</b>는 본인 항목만 1~5점으로 스스로 평가해 적을 수 있어요. <b>자율 기록지</b>는 원하는 날짜를 골라 자유롭게 작성할 수 있습니다. 다른 학생의 기록이나 지난 날짜 기록은 코치 모드에서만 수정 가능합니다.`;

  const rulesCard = `<div class="kb-today-card" style="background:#fff8e6;border-color:#f2dfa0;">
    <div class="kb-today-date" style="color:#8a6a10;">🏐 킨볼 수칙</div>
    <div style="font-size:14.5px;line-height:1.9;color:#5c4700;">
      <div>① 남 탓하지 않는다</div>
      <div>② 스스로를 점검한다</div>
    </div>
  </div>`;

  let feedbackCard = "";
  if (appMode === "student" && TODAY_IS_TRAINING_DAY){
    const fbEntry = data.selflog && data.selflog[K(studentName, TODAY_KEY)];
    if (fbEntry && fbEntry.coachFeedback){
      feedbackCard = `<div class="kb-today-card" style="background:#eafaf0;border-color:#bfe8d1;">
        <div class="kb-today-date" style="color:#1c6b45;">💬 오늘의 코치 피드백</div>
        <div style="font-size:14px;color:#1c6b45;line-height:1.6;">${esc(fbEntry.coachFeedback)}</div>
      </div>`;
    }
  }

  c.innerHTML = feedbackCard + rulesCard + `
    <div class="kb-cards">
      ${card("히터 (공격)","rose",HITTERS,"3인 동시 히팅 콤비네이션")}
      ${card("수비 (슬라이딩)","slate",GIRLS,"여학생 전원 · 낙하지점 판단·리시브")}
      ${card("콜러 (콜링·리더)","sky",CALLERS,"4인 로테이션 · 색상/타이밍 콜")}
    </div>
    <div class="kb-card" style="margin-bottom:12px;">
      <h3 style="color:var(--navy)">훈련 보조 (남학생 7명)</h3>
      <div>${BOYS.map(b=>`<span class="kb-chip" style="${b===studentName?'font-weight:700;border-color:var(--navy);':''}">${b}</span>`).join("")}</div>
    </div>
    <div class="kb-note"><b>사용 안내</b><br>${note}</div>`;
}

/* ---------------- Phase switch helper ---------------- */
function switchHtml(id, current, labels){
  return `<div class="kb-switch" id="${id}">
    ${labels.map((l,i)=>`<button data-p="${i+1}" class="${current===i+1?'active':''}">${l}</button>`).join("")}
  </div>`;
}
function readOnlyNote(){
  return appMode==="student" ? `<div class="kb-readonly-note">✏️ 학생 모드에서는 <b>본인(${esc(studentName)}) 항목만</b> 직접 체크·입력할 수 있어요. 다른 학생 항목은 코치 모드에서만 수정할 수 있습니다.</div>` : "";
}

/* ---------------- Attendance ---------------- */
function renderAttendance(c){
  if (appMode === "student") return renderAttendanceStudent(c);
  const dates = phaseAttendance===1 ? PHASE1_DATES : PHASE2_DATES;
  c.innerHTML = readOnlyNote() + switchHtml("attSwitch", phaseAttendance, ["1차 (7/15~7/24)","2차 (8/4~8/14)"]) +
    `<div class="kb-table-wrap"><table class="kb-table"><thead><tr>
      <th>이름(역할)</th>${dates.map(d=>`<th>${d}</th>`).join("")}
    </tr></thead><tbody>
      ${ALL_STUDENTS.map(name=>`<tr class="${name===studentName?'kb-me':''}">
        <td>${name} <span class="kb-role-tag">(${roleOf(name)})</span></td>
        ${dates.map(d=>{
          const k = K(d, name);
          const editable = canEdit(name);
          return `<td><input type="checkbox" class="kb-check" data-sec="attendance" data-key="${k}" ${data.attendance[k]?"checked":""} ${editable?"":"disabled"}></td>`;
        }).join("")}
      </tr>`).join("")}
    </tbody></table></div>`;
  bindSwitch("attSwitch", (p)=>{ phaseAttendance=p; renderContent(); });
  bindChecks(c);
}

function renderAttendanceStudent(c){
  if (!TODAY_IS_TRAINING_DAY){
    c.innerHTML = `<div class="kb-note">오늘(${esc(TODAY_KEY)})은 예정된 훈련일이 아니에요. 훈련일에 다시 접속해서 출석 체크를 해주세요.</div>`;
    return;
  }
  const k = K(TODAY_KEY, studentName);
  const checked = data.attendance[k];
  c.innerHTML = `
    <div class="kb-today-card">
      <div class="kb-today-date">오늘 · ${esc(TODAY_KEY)}</div>
      <label class="kb-today-check-row">
        <input type="checkbox" class="kb-check-lg" data-sec="attendance" data-key="${k}" ${checked?"checked":""}>
        <span>출석 체크</span>
      </label>
    </div>`;
  bindChecks(c);
}

/* ---------------- Skills ---------------- */
function renderSkills(c){
  if (appMode === "student") return renderSkillsStudent(c);
  let html = `<div class="kb-hint">1~5점으로 자기평가 점수를 기록합니다 (본인 항목만 학생이 직접 입력 가능).</div>` + readOnlyNote();
  Object.keys(SKILL_ITEMS).forEach(role=>{
    const cfg = SKILL_ITEMS[role];
    const cc = ROLE_COLOR[cfg.color];
    const open = openRole===role;
    html += `<div class="kb-role-block">
      <button class="kb-role-block-head kb-role-toggle" data-role="${role}" style="background:${cc.bg};color:${cc.text}">
        <span>${role} 기술 체크리스트 <span style="font-weight:400;font-size:12px;">(${cfg.students.join(" · ")})</span></span>
        <span>${open?"▾":"▸"}</span>
      </button>
      ${open ? `<div class="kb-table-wrap" style="border:none;border-radius:0;">
        <table class="kb-table"><thead><tr>
          <th style="min-width:220px;">체크 항목</th>${cfg.students.map(s=>`<th>${s}</th>`).join("")}
        </tr></thead><tbody>
          ${cfg.items.map(item=>`<tr>
            <td>${item}</td>
            ${cfg.students.map(s=>{
              const k = K(role, item, s);
              const editable = canEdit(s);
              const val = data.skills[k] || "";
              return `<td><input type="number" min="1" max="5" class="kb-input" style="width:50px" data-sec="skills" data-key="${esc(k)}" value="${esc(val)}" placeholder="점수" ${editable?"":"disabled"}></td>`;
            }).join("")}
          </tr>`).join("")}
        </tbody></table>
      </div>` : ""}
    </div>`;
  });
  c.innerHTML = html;
  c.querySelectorAll(".kb-role-toggle").forEach(btn=>{
    btn.onclick = ()=>{ openRole = (openRole===btn.dataset.role) ? "" : btn.dataset.role; renderContent(); };
  });
  bindTextInputs(c);
}

function renderSkillsStudent(c){
  const relevantRoles = Object.keys(SKILL_ITEMS).filter(role => SKILL_ITEMS[role].students.includes(studentName));
  if (relevantRoles.length === 0){
    c.innerHTML = `<div class="kb-note">아직 배정된 역할이 없어요. 코치에게 문의해주세요.</div>`;
    return;
  }
  c.innerHTML = `<div class="kb-hint" style="margin-bottom:14px;">항목마다 스스로 1~5점으로 평가해서 적어보세요.</div>` +
    relevantRoles.map(role => {
      const cfg = SKILL_ITEMS[role];
      const cc = ROLE_COLOR[cfg.color];
      return `<div class="kb-today-date" style="color:${cc.text};margin:16px 0 10px;">${role} 자기평가</div>` +
        cfg.items.map(item => {
          const k = K(role, item, studentName);
          const val = data.skills[k] || "";
          return `<div class="kb-today-card">
            <div class="kb-today-drill-label" style="margin-bottom:10px;">${item}</div>
            <input type="number" min="1" max="5" class="kb-input-lg" style="max-width:130px;" data-sec="skills" data-key="${esc(k)}" value="${esc(val)}" placeholder="1~5점">
          </div>`;
        }).join("");
    }).join("");
  bindTextInputs(c);
}

/* ---------------- Fitness ---------------- */
function renderFitness(c){
  if (appMode === "student") return renderFitnessStudent(c);
  const cur = FITNESS_DRILLS.find(d=>d.key===fitnessDrill);
  const dates = phaseFitness===1 ? PHASE1_DATES : PHASE2_DATES;
  c.innerHTML = readOnlyNote() +
    `<div class="kb-switch" id="fitSwitch">
      ${FITNESS_DRILLS.map(d=>`<button data-d="${d.key}" class="${fitnessDrill===d.key?'active':''}">${d.label}</button>`).join("")}
    </div>` +
    switchHtml("fitPhaseSwitch", phaseFitness, ["1차 (7/15~7/24)","2차 (8/4~8/14)"]) +
    `<div class="kb-hint-row">
      <span class="kb-hint" style="margin-bottom:0;">단위: ${cur.unit} · 대상: 여학생·남학생 전체 15명</span>
      ${tipButtonHtml(cur.key)}
    </div>
    ${tipBoxHtml(cur.key, cur.tip)}
    <div class="kb-table-wrap"><table class="kb-table"><thead><tr>
      <th>이름(역할)</th>${dates.map(d=>`<th>${d}</th>`).join("")}
    </tr></thead><tbody>
      ${ALL_STUDENTS.map(name=>`<tr class="${name===studentName?'kb-me':''}">
        <td>${name} <span class="kb-role-tag">(${roleOf(name)})</span></td>
        ${dates.map(d=>{
          const k = K(fitnessDrill, d, name);
          const editable = canEdit(name);
          return `<td><input type="text" class="kb-input" data-sec="fitness" data-key="${esc(k)}" value="${esc(data.fitness[k]||"")}" placeholder="기록" ${editable?"":"disabled"}></td>`;
        }).join("")}
      </tr>`).join("")}
    </tbody></table></div>`;
  c.querySelectorAll("#fitSwitch button").forEach(btn=>{
    btn.onclick = ()=>{ fitnessDrill = btn.dataset.d; renderContent(); };
  });
  bindSwitch("fitPhaseSwitch", (p)=>{ phaseFitness=p; renderContent(); });
  bindTextInputs(c);
  bindTipButtons(c);
}

function renderFitnessStudent(c){
  if (!TODAY_IS_TRAINING_DAY){
    c.innerHTML = `<div class="kb-note">오늘(${esc(TODAY_KEY)})은 예정된 훈련일이 아니에요. 훈련일에 다시 접속해서 기록해주세요.</div>`;
    return;
  }
  c.innerHTML = `<div class="kb-today-date" style="margin-bottom:10px;">오늘 · ${esc(TODAY_KEY)} 기초체력 기록</div>` +
    FITNESS_DRILLS.map(d=>{
      const k = K(d.key, TODAY_KEY, studentName);
      return `<div class="kb-today-card">
        <div class="kb-today-drill-row">
          <span class="kb-today-drill-label">${d.label} <span class="kb-role-tag">(${d.unit})</span></span>
          ${tipButtonHtml(d.key)}
        </div>
        ${tipBoxHtml(d.key, d.tip)}
        <input type="text" class="kb-input-lg" data-sec="fitness" data-key="${esc(k)}" value="${esc(data.fitness[k]||"")}" placeholder="기록 입력">
      </div>`;
    }).join("");
  bindTextInputs(c);
  bindTipButtons(c);
}

/* ---------------- Sliding ---------------- */
function renderSliding(c){
  if (appMode === "student") return renderSlidingStudent(c);
  const cur = SLIDING_DRILLS.find(d=>d.key===slidingDrill);
  const dates = phaseSliding===1 ? PHASE1_DATES : PHASE2_DATES;
  c.innerHTML = readOnlyNote() +
    `<div class="kb-switch" id="slDrillSwitch">
      ${SLIDING_DRILLS.map(d=>`<button data-d="${d.key}" class="${slidingDrill===d.key?'active':''}">${d.label}</button>`).join("")}
    </div>` +
    switchHtml("slSwitch", phaseSliding, ["1차 (7/15~7/24)","2차 (8/4~8/14)"]) +
    `<div class="kb-hint-row">
      <span class="kb-hint" style="margin-bottom:0;">형식: 성공/시도 (예: 6/10) · 대상: 전체 15명</span>
      ${tipButtonHtml(cur.key)}
    </div>
    ${tipBoxHtml(cur.key, cur.desc)}
    <div class="kb-table-wrap"><table class="kb-table"><thead><tr>
      <th>이름(역할)</th>${dates.map(d=>`<th>${d}</th>`).join("")}
    </tr></thead><tbody>
      ${ALL_STUDENTS.map(name=>`<tr class="${name===studentName?'kb-me':''}">
        <td>${name} <span class="kb-role-tag">(${roleOf(name)})</span></td>
        ${dates.map(d=>{
          const k = K(slidingDrill, d, name);
          const editable = canEdit(name);
          return `<td><input type="text" class="kb-input" style="width:56px" data-sec="sliding" data-key="${esc(k)}" value="${esc(data.sliding[k]||"")}" placeholder="6/10" ${editable?"":"disabled"}></td>`;
        }).join("")}
      </tr>`).join("")}
    </tbody></table></div>`;
  c.querySelectorAll("#slDrillSwitch button").forEach(btn=>{
    btn.onclick = ()=>{ slidingDrill = btn.dataset.d; renderContent(); };
  });
  bindSwitch("slSwitch", (p)=>{ phaseSliding=p; renderContent(); });
  bindTextInputs(c);
  bindTipButtons(c);
}

function renderSlidingStudent(c){
  if (!TODAY_IS_TRAINING_DAY){
    c.innerHTML = `<div class="kb-note">오늘(${esc(TODAY_KEY)})은 예정된 훈련일이 아니에요. 훈련일에 다시 접속해서 기록해주세요.</div>`;
    return;
  }
  c.innerHTML = `<div class="kb-today-date" style="margin-bottom:6px;">오늘 · ${esc(TODAY_KEY)} 슬라이딩 기록</div>
    <div class="kb-hint">형식: 성공/시도 (예: 6/10)</div>` +
    SLIDING_DRILLS.map(d=>{
      const k = K(d.key, TODAY_KEY, studentName);
      return `<div class="kb-today-card">
        <div class="kb-today-drill-row">
          <span class="kb-today-drill-label">${d.label}</span>
          ${tipButtonHtml(d.key)}
        </div>
        ${tipBoxHtml(d.key, d.desc)}
        <input type="text" class="kb-input-lg" data-sec="sliding" data-key="${esc(k)}" value="${esc(data.sliding[k]||"")}" placeholder="6/10">
      </div>`;
    }).join("");
  bindTextInputs(c);
  bindTipButtons(c);
}

/* ---------------- Self Log ---------------- */
function renderSelfLog(c){
  const studentLocked = appMode === "student";
  if (studentLocked) logStudent = studentName;
  const key = K(logStudent, logDate);
  const entry = data.selflog[key] || {goal:"",good:"",improve:"",next:"",coachCheck:false,coachFeedback:""};
  function field(label, name, placeholder){
    return `<div class="kb-field">
      <label>${label}</label>
      <textarea rows="2" data-field="${name}" placeholder="${esc(placeholder)}">${esc(entry[name])}</textarea>
    </div>`;
  }
  c.innerHTML = `
    <div style="margin-bottom:14px;">
      ${studentLocked
        ? `<span class="kb-chip" style="font-weight:700;">${esc(logStudent)} (${roleOf(logStudent)})</span>`
        : `<select class="kb-select" id="logStudentSel">
            ${ALL_STUDENTS.map(g=>`<option value="${g}" ${g===logStudent?"selected":""}>${g} (${roleOf(g)})</option>`).join("")}
          </select>`
      }
      <select class="kb-select" id="logDateSel">
        ${ALL_DATES.map(d=>`<option value="${d}" ${d===logDate?"selected":""}>${d}</option>`).join("")}
      </select>
    </div>
    <div class="kb-log-card">
      ${field("오늘의 목표","goal","예: 3인 동시 히팅 타이밍 맞추기")}
      ${field("잘한 점","good","예: 구령에 맞춰 스윙 타이밍이 좋아짐")}
      ${field("아쉬운 점 · 보완할 점","improve","예: 타겟 정확도 부족")}
      ${field("다음 훈련 다짐","next","예: 타겟 히팅 반복 연습하기")}
      <label class="kb-coach-check">
        <input type="checkbox" class="kb-check" id="coachCheckBox" ${entry.coachCheck?"checked":""} ${appMode==="student"?"disabled":""}>
        코치 확인 완료 ${appMode==="student" ? '<span style="color:var(--muted);font-size:11px;">(코치만 체크 가능)</span>' : ""}
      </label>
      ${appMode==="coach"
        ? `<div class="kb-field" style="margin-top:12px;">
            <label>💬 코치 피드백 (학생 홈 화면에 표시됨)</label>
            <textarea rows="2" data-field="coachFeedback" placeholder="오늘 잘한 점이나 격려의 말을 남겨주세요">${esc(entry.coachFeedback||"")}</textarea>
          </div>`
        : (entry.coachFeedback
            ? `<div class="kb-tip-box" style="background:#eafaf0;border-color:#bfe8d1;color:#1c6b45;margin-top:12px;">💬 코치의 한마디: ${esc(entry.coachFeedback)}</div>`
            : `<div class="kb-hint" style="margin-top:12px;">아직 이 날짜에 코치 피드백이 없어요.</div>`)
      }
    </div>
  `;
  if (!studentLocked){
    document.getElementById("logStudentSel").onchange = (e)=>{ logStudent=e.target.value; renderContent(); };
  }
  document.getElementById("logDateSel").onchange = (e)=>{ logDate=e.target.value; renderContent(); };
  c.querySelectorAll("textarea[data-field]").forEach(ta=>{
    let debounceTimer = null;
    ta.addEventListener("focus", ()=>{ setEditing(true); });
    ta.addEventListener("input", (e)=>{
      if (debounceTimer) clearTimeout(debounceTimer);
      const field = e.target.dataset.field, val = e.target.value;
      const student = logStudent, date = logDate;
      debounceTimer = setTimeout(()=>{ patchSelfLog(student, date, field, val); }, 1200);
    });
    ta.addEventListener("blur", (e)=>{
      if (debounceTimer){ clearTimeout(debounceTimer); debounceTimer = null; }
      setEditing(false);
      patchSelfLog(logStudent, logDate, e.target.dataset.field, e.target.value);
    });
  });
  if (appMode !== "student"){
    document.getElementById("coachCheckBox").onchange = (e)=>{
      patchSelfLog(logStudent, logDate, "coachCheck", e.target.checked);
    };
  }
}

/* ---------------- shared bind helpers ---------------- */
function bindSwitch(id, cb){
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.querySelectorAll("button").forEach(btn=>{
    btn.onclick = ()=> cb(parseInt(btn.dataset.p,10));
  });
}
function bindChecks(c){
  c.querySelectorAll('input[type="checkbox"][data-sec]').forEach(inp=>{
    inp.onchange = (e)=> patch(e.target.dataset.sec, e.target.dataset.key, e.target.checked);
  });
}
function bindTextInputs(c){
  c.querySelectorAll('input[type="text"][data-sec], input[type="number"][data-sec]').forEach(inp=>{
    let debounceTimer = null;
    inp.addEventListener("focus", ()=>{ setEditing(true); });
    inp.addEventListener("input", (e)=>{
      if (debounceTimer) clearTimeout(debounceTimer);
      const sec = e.target.dataset.sec, key = e.target.dataset.key, val = e.target.value;
      debounceTimer = setTimeout(()=>{ patch(sec, key, val); }, 1200);
    });
    inp.addEventListener("blur", (e)=>{
      if (debounceTimer){ clearTimeout(debounceTimer); debounceTimer = null; }
      setEditing(false);
      patch(e.target.dataset.sec, e.target.dataset.key, e.target.value);
    });
  });
}

/* ---------------- PWA install prompt ---------------- */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  render();
});
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  render();
});

/* ---------------- service worker registration ---------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e)=>console.error("SW 등록 실패", e));
  });
}

/* ---------------- init ---------------- */
/* 화면이 백그라운드로 가거나 폰이 잠기기 직전, 입력 중이던 값을 강제로 저장 */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden"){
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")){
      active.blur();
    }
  }
});

render();
initFirebase();
