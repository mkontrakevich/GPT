// Local-only avatar projection. Categories are rendering rules, not medical classifications.
export const AVATAR_VERSION='1.0';
const relativeCuts=[-.05,-.02,.02,.05],ratioCuts=[.5,.85,1.15,1.5];
export const AVATAR_CONTRACT={
 bodyMass:{unit:'кг',effect:'силуэт',kind:'relative',cuts:relativeCuts,fresh:14,smooth:7,minRecent:3},
 leanBodyMass:{unit:'кг',effect:'плечи и руки',kind:'relative',cuts:relativeCuts,fresh:30,smooth:7,minRecent:3},
 bodyFatPercentage:{unit:'%',effect:'талия',kind:'difference',cuts:[-3,-1,1,3],fresh:30,smooth:7,minRecent:3,max:100},
 bodyMassIndex:{unit:'кг/м²',effect:'информация; без повторного изменения силуэта',kind:'relative',cuts:relativeCuts,fresh:30},
 bodyHeight:{unit:'см',effect:'рост; только явное измерение',kind:'absolute',fresh:365},
 restingHeartRate:{unit:'уд/мин',effect:'ритм света на груди',kind:'relative',cuts:[-.2,-.1,.1,.2],fresh:1},
 heartRate:{unit:'уд/мин',effect:'резервный ритм, если нет пульса покоя',kind:'relative',cuts:[-.2,-.1,.1,.2],fresh:1},
 respiratoryRate:{unit:'вдохов/мин',effect:'ритм дыхания',kind:'relative',cuts:[-.2,-.1,.1,.2],fresh:1},
 oxygenSaturation:{unit:'%',effect:'дуга измерения; без оценки здоровья',kind:'difference',cuts:[-3,-1,1,3],fresh:1,max:100},
 sleepHours:{unit:'ч',effect:'отдельная дуга сна',kind:'ratio',cuts:ratioCuts,fresh:1,max:24},
 stepCount:{unit:'шаг.',effect:'движение контура активности',kind:'ratio',cuts:ratioCuts,fresh:1,zero:true},
 distanceWalkingRunning:{unit:'км',effect:'резервный показатель активности',kind:'ratio',cuts:ratioCuts,fresh:1,zero:true},
 activeEnergyBurned:{unit:'ккал',effect:'резервный показатель активности; не меняет вес',kind:'ratio',cuts:ratioCuts,fresh:1,zero:true},
 basalEnergyBurned:{unit:'ккал',effect:'информация; без морфинга тела',kind:'ratio',cuts:ratioCuts,fresh:1},
 flightsClimbed:{unit:'эт.',effect:'информация активности; без общего балла здоровья',kind:'ratio',cuts:ratioCuts,fresh:1,zero:true},
 workoutMinutes:{unit:'мин',effect:'резервный показатель активности',kind:'ratio',cuts:ratioCuts,fresh:1,zero:true,max:1440},
 walkingSpeed:{unit:'м/с',effect:'темп декоративной дорожки',kind:'ratio',cuts:ratioCuts,fresh:1,zero:true},
 walkingStepLength:{unit:'см',effect:'информация; не меняет анатомию',kind:'relative',cuts:relativeCuts,fresh:1},
 walkingAsymmetryPercentage:{unit:'%',effect:'общий индикатор походки; сторона неизвестна',kind:'difference',cuts:[-3,-1,1,3],fresh:1,max:100,zero:true},
 walkingDoubleSupportPercentage:{unit:'%',effect:'общий индикатор походки',kind:'difference',cuts:[-3,-1,1,3],fresh:1,max:100,zero:true},
 headphoneAudioExposure:{unit:'дБ',effect:'отдельный информационный индикатор',kind:'difference',cuts:[-6,-3,3,6],fresh:1,zero:true}
};
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function median(values){if(!values.length)return null;const a=[...values].sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
const epoch=date=>{if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;const t=Date.parse(date+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===date?t/86400000:null};
const relativeLabels=['существенно ниже исходного','ниже исходного','сопоставимо с исходным','выше исходного','существенно выше исходного'];
const ratioLabels=['менее 50% личного уровня','50–85% личного уровня','85–115% личного уровня','115–150% личного уровня','более 150% личного уровня'];
export function category(value,cuts,previous=null,hysteresis=0){
 const next=cuts.findIndex(c=>value<c),index=cuts.length===4?(value<cuts[0]?0:value<cuts[1]?1:value<=cuts[2]?2:value<=cuts[3]?3:4):(next<0?cuts.length:next);
 if(Number.isInteger(previous)&&previous>=0&&previous<=cuts.length&&index!==previous){
  const edge=index>previous?cuts[previous]:cuts[previous-1];
  if(Number.isFinite(edge)&&Math.abs(value-edge)<hysteresis)return previous;
 }
 return index;
}
function normalize(rows,metric,contract,today){
 const grouped=new Map();
 for(const r of rows){if(!r||r.metric!==metric)continue;const date=epoch(r.date);if(date===null||date>today||typeof r.value!=='number'||!Number.isFinite(r.value)||r.value<(contract.zero?0:Number.MIN_VALUE)||r.value>(contract.max??Infinity))continue;
 if(!grouped.has(r.date))grouped.set(r.date,[]);grouped.get(r.date).push(r.value);
 }
 return [...grouped].map(([date,values])=>({date,age:today-epoch(date),value:median(values)})).sort((a,b)=>a.age-b.age);
}
export function projectAvatar({records=[],checkins=[],today,mode='DEMO',profile={},previous=null}){
 const now=epoch(today);if(now===null)throw Error('today must be a real YYYY-MM-DD date');
 const channels={};
 for(const [metric,c] of Object.entries(AVATAR_CONTRACT)){
  const matching=records.filter(r=>r?.metric===metric),rows=normalize(records,metric,c,now),latest=rows[0];
  const dated=matching.filter(r=>epoch(r.date)!==null).sort((a,b)=>epoch(b.date)-epoch(a.date)),newest=dated[0],newestInvalid=newest&&(epoch(newest.date)>now||typeof newest.value!=='number'||!Number.isFinite(newest.value)||newest.value<(c.zero?0:Number.MIN_VALUE)||newest.value>(c.max??Infinity));
  const state={metric,unit:c.unit,effect:c.effect,value:latest?.value??null,date:latest?.date??null,ageDays:latest?.age??null,baseline:null,change:null,category:null,index:null,status:!latest?(matching.length?'INVALID':'MISSING'):latest.age>c.fresh?'STALE':'FRESH',count:0};
  if(newestInvalid)state.status='INVALID';
  if(!latest||state.status!=='FRESH'){channels[metric]=state;continue}
  const recent=c.smooth?rows.filter(r=>r.age<7):[latest],historical=rows.filter(r=>r.age>=7&&r.age<35);
  state.count=recent.length;state.value=median(recent.map(r=>r.value))??latest.value;
  state.baseline=historical.length>=7?median(historical.map(r=>r.value)):null;
  if(c.kind==='absolute'){state.category='измерение получено';channels[metric]=state;continue}
  if((c.minRecent&&recent.length<c.minRecent)||state.baseline===null||(c.kind!=='difference'&&state.baseline<=0)){state.status='INSUFFICIENT';channels[metric]=state;continue}
  state.change=c.kind==='difference'?state.value-state.baseline:c.kind==='ratio'?state.value/state.baseline:(state.value-state.baseline)/state.baseline;
  const prev=previous?.mode===mode?previous.channels?.[metric]?.index:null;
  state.index=category(state.change,c.cuts,prev,c.kind==='difference'?.2:.005);
  state.category=(c.kind==='ratio'?ratioLabels:relativeLabels)[state.index];channels[metric]=state;
 }
 const usable=metric=>channels[metric]?.status==='FRESH'&&Number.isFinite(channels[metric].change);
 const relative=metric=>usable(metric)&&channels[metric].index!==2?channels[metric].change:0;
 const current=checkins.filter(c=>c?.date===today).at(-1);
 const rating=(key,min=1)=>{const v=current?.[key];return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=10?v:null};
 const energy=rating('energy'),mood=rating('mood'),knee=rating('knee',0);
 const activityMetric=['stepCount','distanceWalkingRunning','activeEnergyBurned','workoutMinutes'].find(usable);
 const activityRatio=activityMetric?channels[activityMetric].change:null;
 const measured=metric=>{const s=channels[metric];return s.value!==null&&s.ageDays!==null&&s.ageDays<=AVATAR_CONTRACT[metric].fresh&&!['INVALID','STALE','MISSING'].includes(s.status)};
 const pulseMetric=measured('restingHeartRate')?'restingHeartRate':measured('heartRate')?'heartRate':null;
 const pulse=pulseMetric?channels[pulseMetric].value:null,breathing=measured('respiratoryRate')?channels.respiratoryRate.value:null;
 let height=typeof profile.heightCm==='number'&&profile.heightCm>=100&&profile.heightCm<=230?profile.heightCm:null;
 if(height===null&&channels.bodyHeight?.status==='FRESH'&&channels.bodyHeight.value>=100&&channels.bodyHeight.value<=230)height=channels.bodyHeight.value;
 const bodyConflict=channels.leanBodyMass.value!==null&&channels.bodyMass.value!==null&&channels.leanBodyMass.value>channels.bodyMass.value;
 const visual={
  heightScale:height?clamp(height/175,.85,1.15):1,
  bodyWidth:clamp(1+relative('bodyMass')*.6,.92,1.08),
  waist:clamp(1+(bodyConflict?0:relative('bodyFatPercentage'))*.012,.92,1.08),
  shoulders:clamp(1+(bodyConflict?0:relative('leanBodyMass'))*.7,.94,1.06),
  energy:energy===null?.5:(energy-1)/9,mood:mood===null?.5:(mood-1)/9,knee:knee===null?null:knee/10,
  activity:activityRatio===null?null:clamp(activityRatio,0,1.5),
  sleep:usable('sleepHours')?clamp(channels.sleepHours.change,0,1.5):null,
  pulseHz:pulse===null?null:clamp(pulse/60,.5,2.2),breathHz:breathing===null?null:clamp(breathing/60,.08,.6),
  gaitCue:usable('walkingAsymmetryPercentage')?clamp(Math.abs(channels.walkingAsymmetryPercentage.change)/6,0,1):usable('walkingDoubleSupportPercentage')?clamp(Math.abs(channels.walkingDoubleSupportPercentage.change)/6,0,1):null,
  gaitTempo:usable('walkingSpeed')?clamp(channels.walkingSpeed.change,0,1.5):null,
  oxygen:measured('oxygenSaturation')?channels.oxygenSaturation.value/100:null
 };
 const ratings={energy:{value:energy,category:energy===null?'нет оценки':energy<=3?'низкая':energy<=6?'средняя':'высокая'},mood:{value:mood,category:mood===null?'нет оценки':mood<=3?'низкое':mood<=6?'среднее':'высокое'},knee:{value:knee,category:knee===null?'нет оценки':knee===0?'не отмечен':knee<=3?'1–3':knee<=6?'4–6':'7–10'}};
 return {version:AVATAR_VERSION,mode,today,channels,ratings,visual,heightCm:height,activityMetric,pulseMetric,bodyConflict,notes:{height:height===null?'рост не задан; нейтральные пропорции':'явно заданный рост',identity:'лицо, причёска и возрастное впечатление не меняются по метрикам',interpretation:'визуализация данных, не оценка здоровья'}};
}
export function previewAvatar(preset='neutral'){
 const level={low:0,neutral:.5,high:1}[preset]??.5;
 return {mode:'PREVIEW',channels:{},ratings:{},visual:{heightScale:1,bodyWidth:1,waist:1,shoulders:1,energy:level,mood:.5,knee:null,activity:1,sleep:null,pulseHz:1,breathHz:.23,gaitCue:null,gaitTempo:null,oxygen:null},notes:{interpretation:'примерка вымышленных состояний; записи не изменяются'}};
}
