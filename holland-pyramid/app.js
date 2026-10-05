const STORAGE_KEY = "hollandPyramidData_v1";

const defaultProgram = {
  version: 1,
  title: "פירמידת הולנד - התחלה איטית",
  exercises: [
    {id:"chair-squat",name:"סקוואט לכיסא עם משקולות",short:"סקוואט",multiplier:2,unit:"חזרות",visual:"🏋️‍♂️ 🪑",instructions:["לעמוד מול כיסא יציב, רגליים בערך ברוחב הכתפיים.","להחזיק משקולת של 1.5 ק״ג בכל יד לצד הגוף.","לדחוף אגן לאחור, לגעת בכיסא ולחזור לעמידה בשליטה."]},
    {id:"incline-pushup",name:"שכיבות סמיכה על קיר או שיש",short:"שכיבות",multiplier:2,unit:"חזרות",visual:"🧍‍♂️↘️🧱",instructions:["להניח ידיים בגובה החזה על קיר או שיש יציב.","לשמור על הגוף ישר מהראש עד העקבים.","להתקרב למשטח ולדחוף חזרה."]},
    {id:"bent-row",name:"חתירה כפופה עם משקולות",short:"חתירה",multiplier:2,unit:"חזרות",visual:"🏋️‍♂️ ↩️",instructions:["להטות מעט את הגוף קדימה עם גב ישר וברכיים רכות.","להתחיל כשהידיים תלויות למטה.","למשוך את המרפקים לאחור לכיוון הצלעות ולהוריד בשליטה."]},
    {id:"shoulder-press",name:"לחיצת כתפיים עם משקולות",short:"כתפיים",multiplier:2,unit:"חזרות",visual:"🏋️‍♂️ ⬆️",instructions:["להתחיל עם המשקולות בגובה הכתפיים.","לדחוף למעלה מעל הראש.","להוריד חזרה באיטיות ובשליטה."]},
    {id:"march",name:"מארץ׳ במקום",short:"מארץ׳",multiplier:4,unit:"צעדים",visual:"🚶‍♂️",instructions:["לעמוד זקוף.","להרים ברך אחת ואז את השנייה.","לשמור על קצב נוח ויציב."]}
  ],
  levels: [
    {id:"L0A",name:"רמה 0A",pattern:[1,2,3],minSessions:6,maxAvgDifficultyForSuggestion:5.5,description:"אותו אימון קצר לפחות 6 פעמים. לא מתקדמים רק כי עבר שבוע."},
    {id:"L0B",name:"רמה 0B",pattern:[1,2,3,2,1],minSessions:6,maxAvgDifficultyForSuggestion:5.5,description:"מוסיפים ירידה קטנה בפירמידה. נשארים כאן לפחות 6 אימונים."},
    {id:"L0C",name:"רמה 0C",pattern:[1,2,3,4],minSessions:8,maxAvgDifficultyForSuggestion:5.5,description:"מוסיפים שיא של 4, אבל עדיין בלי פירמידה מלאה. לפחות 8 אימונים."},
    {id:"L0D",name:"רמה 0D",pattern:[1,2,3,4,3,2,1],minSessions:8,maxAvgDifficultyForSuggestion:5.5,description:"פירמידה בינונית. נשארים כאן לפחות 8 אימונים."},
    {id:"L1A",name:"רמה 1A",pattern:[1,2,3,4,5],minSessions:10,maxAvgDifficultyForSuggestion:5.5,description:"עולים עד 5 בלי ירידה. רק אחרי בסיס יציב."},
    {id:"L1B",name:"רמה 1B",pattern:[1,2,3,4,5,4,3,2,1],minSessions:10,maxAvgDifficultyForSuggestion:5.5,description:"הפירמידה המלאה. ההתקדמות מכאן תיעשה לפי הנתונים."}
  ]
};

function clone(x){return JSON.parse(JSON.stringify(x));}
function loadState(){
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw)return {program:clone(defaultProgram),currentLevelIndex:0,history:[]};
  try{
    const p=JSON.parse(raw);
    if(!p.program)p.program=clone(defaultProgram);
    if(!Array.isArray(p.history))p.history=[];
    if(typeof p.currentLevelIndex!=="number")p.currentLevelIndex=0;
    return p;
  }catch{return {program:clone(defaultProgram),currentLevelIndex:0,history:[]};}
}

let state=loadState(), workout=null, workoutInterval=null, restInterval=null, deferredInstallPrompt=null;
const $=id=>document.getElementById(id);
const screens=["home","workout","finish","history","coach"];
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function fmtDuration(seconds){const m=Math.floor(seconds/60).toString().padStart(2,"0"),s=Math.floor(seconds%60).toString().padStart(2,"0");return `${m}:${s}`;}
function currentLevel(){return state.program.levels[state.currentLevelIndex];}
function showScreen(name){screens.forEach(s=>$(`screen-${s}`).classList.toggle("active",s===name));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===name));if(name==="home")renderHome();if(name==="history")renderHistory();}
function buildSteps(level){const steps=[];level.pattern.forEach(stage=>state.program.exercises.forEach(ex=>steps.push({stage,exerciseId:ex.id,name:ex.name,short:ex.short,reps:ex.multiplier*stage,unit:ex.unit,visual:ex.visual,instructions:ex.instructions})));return steps;}
function levelHistory(){const lvl=currentLevel();return state.history.filter(x=>x.levelId===lvl.id);}
function progressionStatus(){const lvl=currentLevel(),hist=levelHistory(),recent=hist.slice(0,lvl.minSessions),enough=hist.length>=lvl.minSessions,rated=recent.filter(x=>Number.isFinite(x.difficulty)),avg=rated.length?rated.reduce((a,b)=>a+b.difficulty,0)/rated.length:null,difficultyOk=avg!==null&&avg<=lvl.maxAvgDifficultyForSuggestion,atLast=state.currentLevelIndex>=state.program.levels.length-1;return {lvl,hist,enough,avg,difficultyOk,eligible:enough&&difficultyOk&&!atLast,atLast};}

function renderHome(){
  const lvl=currentLevel();$("currentLevelName").textContent=lvl.name;$("currentLevelPattern").textContent=lvl.pattern.join(" ← ");$("totalWorkouts").textContent=state.history.length;
  if(state.history.length){const last=new Date(state.history[0].startedAt);$("lastWorkoutText").textContent=last.toLocaleDateString("he-IL",{day:"numeric",month:"short"});}else $("lastWorkoutText").textContent="עדיין לא";
  const ps=progressionStatus(),done=Math.min(ps.hist.length,ps.lvl.minSessions),pct=Math.round(done/ps.lvl.minSessions*100);$("levelProgressBar").style.width=`${pct}%`;
  $("progressText").textContent=`${ps.hist.length} אימונים ברמה הזו. מינימום לפני הצעת התקדמות: ${ps.lvl.minSessions}. `+(ps.avg!==null?`ממוצע קושי באימונים האחרונים: ${ps.avg.toFixed(1)}/10.`:"עדיין אין מספיק דירוגי קושי.");
  $("progressBadge").textContent=ps.eligible?"אפשר לשקול":ps.atLast?"רמה עליונה":"נשארים כאן";
  $("promotionBox").classList.toggle("hidden",!ps.eligible);if(ps.eligible)$("promotionReason").textContent=`השלמת לפחות ${ps.lvl.minSessions} אימונים והממוצע הוא ${ps.avg.toFixed(1)}/10. ההתקדמות אינה אוטומטית.`;
  const preview=$("exercisePreview");preview.innerHTML="";state.program.exercises.forEach(ex=>{const row=document.createElement("div");row.className="mini";row.innerHTML=`<div class="name">${ex.name}</div><div class="mult">×${ex.multiplier} ${ex.unit}</div>`;preview.appendChild(row);});
}

function startWorkout(){
  const lvl=currentLevel();workout={startedAt:new Date().toISOString(),startedPerf:performance.now(),pausedMs:0,pauseStarted:null,elapsedSeconds:0,levelId:lvl.id,levelName:lvl.name,pattern:[...lvl.pattern],planSnapshot:clone({exercises:state.program.exercises,level:lvl}),steps:buildSteps(lvl),stepIndex:0};
  if(workoutInterval)clearInterval(workoutInterval);workoutInterval=setInterval(updateWorkoutClock,500);showScreen("workout");renderWorkoutStep();updateWorkoutClock();
}
function updateWorkoutClock(){if(!workout||workout.pauseStarted)return;const now=performance.now();workout.elapsedSeconds=Math.max(0,Math.floor((now-workout.startedPerf-workout.pausedMs)/1000));$("workoutTimer").textContent=fmtDuration(workout.elapsedSeconds);}
function togglePause(){if(!workout)return;if(!workout.pauseStarted){workout.pauseStarted=performance.now();$("pauseWorkoutBtn").textContent="המשך";}else{workout.pausedMs+=performance.now()-workout.pauseStarted;workout.pauseStarted=null;$("pauseWorkoutBtn").textContent="השהה";updateWorkoutClock();}}
function renderWorkoutStep(){const step=workout.steps[workout.stepIndex];$("currentExerciseName").textContent=step.name;$("currentExerciseReps").textContent=step.reps;$("currentExerciseUnit").textContent=step.unit;$("currentExerciseVisual").textContent=step.visual;const ul=$("currentExerciseInstructions");ul.innerHTML="";step.instructions.forEach(t=>{const li=document.createElement("li");li.textContent=t;ul.appendChild(li);});const next=workout.steps[workout.stepIndex+1];$("nextExerciseText").textContent=next?`${next.name} · ${next.reps} ${next.unit}`:"סיום האימון";$("workoutCounter").textContent=`${workout.stepIndex+1} / ${workout.steps.length}`;$("workoutProgressBar").style.width=`${(workout.stepIndex/workout.steps.length)*100}%`;}
function finishWorkoutFlow(){if(workoutInterval)clearInterval(workoutInterval);updateWorkoutClock();$("finishSummary").textContent=`${workout.levelName} · ${fmtDuration(workout.elapsedSeconds)} · ${workout.steps.length} תחנות`;showScreen("finish");}
function completeStep(){if(!workout)return;if(workout.stepIndex>=workout.steps.length-1){$("workoutProgressBar").style.width="100%";finishWorkoutFlow();return;}workout.stepIndex+=1;renderWorkoutStep();}
function startRest(){if(restInterval)clearInterval(restInterval);let remaining=45;$("restTimer").textContent=fmtDuration(remaining);$("restOverlay").classList.remove("hidden");restInterval=setInterval(()=>{remaining-=1;$("restTimer").textContent=fmtDuration(remaining);if(remaining<=0)stopRest();},1000);}
function stopRest(){if(restInterval)clearInterval(restInterval);restInterval=null;$("restOverlay").classList.add("hidden");}
function abandonWorkout(){if(!confirm("לצאת מהאימון בלי לשמור אותו?"))return;if(workoutInterval)clearInterval(workoutInterval);stopRest();workout=null;showScreen("home");}
function valueOrNull(v){if(v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function saveFinishedWorkout(){if(!workout)return;const rec={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),startedAt:workout.startedAt,endedAt:new Date().toISOString(),durationSeconds:workout.elapsedSeconds,levelId:workout.levelId,levelName:workout.levelName,pattern:workout.pattern,completedSteps:workout.steps.length,difficulty:Number($("difficultyInput").value),notes:$("notesInput").value.trim(),heartRate:{avg:valueOrNull($("avgHrInput").value),max:valueOrNull($("maxHrInput").value),resting:valueOrNull($("restingHrInput").value)},planSnapshot:workout.planSnapshot};state.history.unshift(rec);saveState();$("difficultyInput").value=5;$("difficultyValue").textContent="5/10";$("notesInput").value="";$("avgHrInput").value="";$("maxHrInput").value="";$("restingHrInput").value="";workout=null;showScreen("home");}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function renderHistory(){const box=$("historyList");box.innerHTML="";if(!state.history.length){box.innerHTML='<div class="card muted center">עדיין אין אימונים ביומן.</div>';return;}state.history.forEach(item=>{const d=new Date(item.startedAt),hrBits=[];if(item.heartRate?.avg)hrBits.push(`ממוצע ${item.heartRate.avg}`);if(item.heartRate?.max)hrBits.push(`מקס׳ ${item.heartRate.max}`);const card=document.createElement("div");card.className="history-item";card.innerHTML=`<div class="history-top"><div><strong>${d.toLocaleDateString("he-IL",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</strong><div class="muted small-text">${d.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}</div></div><div class="badge">${item.levelName}</div></div><div class="history-meta"><span class="chip">${fmtDuration(item.durationSeconds)}</span><span class="chip">קושי ${item.difficulty}/10</span>${hrBits.length?`<span class="chip">דופק ${hrBits.join(" · ")}</span>`:""}</div>${item.notes?`<p style="margin:12px 0 0">${escapeHtml(item.notes)}</p>`:""}`;box.appendChild(card);});}
function promoteLevel(){const ps=progressionStatus();if(!ps.eligible)return;state.currentLevelIndex+=1;saveState();renderHome();}
function clearHistory(){if(!state.history.length)return;if(!confirm("למחוק את כל יומן האימונים?"))return;state.history=[];saveState();renderHistory();renderHome();}
function downloadBlob(text,type,filename){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function exportJson(){const payload={exportedAt:new Date().toISOString(),app:"Holland Pyramid",schemaVersion:1,currentLevelIndex:state.currentLevelIndex,currentLevel:currentLevel(),program:state.program,history:state.history};downloadBlob(JSON.stringify(payload,null,2),"application/json",`holland-pyramid-export-${new Date().toISOString().slice(0,10)}.json`);}
function csvEscape(v){return `"${String(v??"").replaceAll('"','""')}"`;}
function exportCsv(){const rows=[["date","time","level","duration_seconds","difficulty","avg_hr","max_hr","resting_hr","notes"]];state.history.slice().reverse().forEach(x=>{const d=new Date(x.startedAt);rows.push([d.toLocaleDateString("en-CA"),d.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"}),x.levelName,x.durationSeconds,x.difficulty,x.heartRate?.avg??"",x.heartRate?.max??"",x.heartRate?.resting??"",x.notes??""]);});downloadBlob(rows.map(r=>r.map(csvEscape).join(",")).join("\n"),"text/csv;charset=utf-8",`holland-pyramid-log-${new Date().toISOString().slice(0,10)}.csv`);}
function validateProgram(p){if(!p||!Array.isArray(p.exercises)||!p.exercises.length)throw new Error("חסרים תרגילים");if(!Array.isArray(p.levels)||!p.levels.length)throw new Error("חסרות רמות");p.exercises.forEach(ex=>{if(!ex.id||!ex.name||!Number.isFinite(Number(ex.multiplier)))throw new Error("מבנה תרגיל לא תקין");});p.levels.forEach(l=>{if(!l.id||!l.name||!Array.isArray(l.pattern)||!l.pattern.length)throw new Error("מבנה רמה לא תקין");});}
async function importProgram(){const f=$("programFileInput").files[0];if(!f){$("importStatus").textContent="בחר קובץ JSON קודם.";return;}try{const data=JSON.parse(await f.text()),incoming=data.program??data;validateProgram(incoming);state.program=incoming;state.currentLevelIndex=Math.min(state.currentLevelIndex,incoming.levels.length-1);saveState();$("importStatus").textContent="התוכנית עודכנה בהצלחה.";renderHome();}catch(e){$("importStatus").textContent=`הייבוא נכשל: ${e.message}`;}}

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;$("installBtn").classList.remove("hidden");});
$("installBtn").addEventListener("click",async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("installBtn").classList.add("hidden");});
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>showScreen(btn.dataset.screen)));
$("startWorkoutBtn").addEventListener("click",startWorkout);$("pauseWorkoutBtn").addEventListener("click",togglePause);$("exitWorkoutBtn").addEventListener("click",abandonWorkout);$("doneStepBtn").addEventListener("click",completeStep);$("restBtn").addEventListener("click",startRest);$("skipRestBtn").addEventListener("click",stopRest);$("saveWorkoutBtn").addEventListener("click",saveFinishedWorkout);$("promoteBtn").addEventListener("click",promoteLevel);$("clearHistoryBtn").addEventListener("click",clearHistory);$("exportJsonBtn").addEventListener("click",exportJson);$("exportCsvBtn").addEventListener("click",exportCsv);$("importProgramBtn").addEventListener("click",importProgram);$("difficultyInput").addEventListener("input",e=>$("difficultyValue").textContent=`${e.target.value}/10`);
if("serviceWorker" in navigator)navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
renderHome();
