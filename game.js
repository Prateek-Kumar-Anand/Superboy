'use strict';

// ══════════════════════════════════════════════════════
//  MOBILE DETECTION & TOUCH CONTROLS
// ══════════════════════════════════════════════════════
const IS_MOBILE = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 0 && window.innerWidth < 900);

// Virtual keys set by touch buttons — merged into keys{}
const touchKeys = {};

function initMobileControls() {
  if (!IS_MOBILE) return;

  document.getElementById('mobile-controls').style.display = 'flex';
  document.getElementById('controls-hint-desktop').style.display = 'none';
  document.getElementById('controls-hint-mobile').style.display = 'flex';

  const btns = document.querySelectorAll('.dpad-btn, .action-btn');
  btns.forEach(btn => {
    const key = btn.dataset.key;

    const press = (e) => {
      e.preventDefault();
      touchKeys[key] = true;
      btn.classList.add('pressed');
    };
    const release = (e) => {
      e.preventDefault();
      touchKeys[key] = false;
      btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart',  press,   {passive: false});
    btn.addEventListener('touchend',    release, {passive: false});
    btn.addEventListener('touchcancel', release, {passive: false});
    // Also handle mouse for desktop testing
    btn.addEventListener('mousedown',   press);
    btn.addEventListener('mouseup',     release);
    btn.addEventListener('mouseleave',  release);
  });
}

// Merge touchKeys into keys each frame
function mergeTouchKeys() {
  Object.keys(touchKeys).forEach(k => {
    if (touchKeys[k]) keys[k] = true;
    else if (!touchKeys[k] && keys[k]) delete keys[k];
  });
}

// Responsive canvas scaling
function initResponsiveCanvas() {
  function resize() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    if (IS_MOBILE) {
      // On mobile: canvas takes up to 58vh, rest for controls
      const maxH = window.innerHeight * 0.58;
      const maxW = window.innerWidth;
      const ratio = 960 / 540;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      canvas.style.maxHeight = '';
    } else {
      // Desktop: fill window maintaining aspect ratio
      const ratio = 960 / 540;
      let w = window.innerWidth;
      let h = w / ratio;
      if (h > window.innerHeight) { h = window.innerHeight; w = h * ratio; }
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      canvas.style.maxHeight = '';
    }
  }
  window.addEventListener('resize', resize);
  resize();
}

// ═══════════════════════════════════════════════════════════════
//  OPERATION IRON PIXEL — LEVEL 1: FAULTMINE DAY (Complete)
// ═══════════════════════════════════════════════════════════════

const CFG = {
  GRAVITY:0.58, JUMP:-13, WALK:3, RUN:6,
  SLIDE:9, SLIDE_DUR:22, BULLET_SPD:16,
  SHOOT_CD:10, GROUND_Y:400,
  LEVEL_W:6000, CANVAS_W:960, CANVAS_H:540, FPS:60,
};

// ── SPRITE CONFIGS ─────────────────────────────────────────────
const NAV = {
  frameW:120,frameH:80,scale:2.2,feetDY:-176,
  anims:{
    idle:      {src:'sprites/naveen_new/_Idle.png',      frames:10,fps:8},
    run:       {src:'sprites/naveen_new/_Run.png',       frames:10,fps:14},
    jump:      {src:'sprites/naveen_new/_Jump.png',      frames:3, fps:8},
    fall:      {src:'sprites/naveen_new/_Fall.png',      frames:3, fps:8},
    crouch:    {src:'sprites/naveen_new/_CrouchFull.png',frames:3, fps:6},
    crouchwalk:{src:'sprites/naveen_new/_CrouchWalk.png',frames:8, fps:10},
    slide:     {src:'sprites/naveen_new/_SlideFull.png', frames:4, fps:10},
    attack:    {src:'sprites/naveen_new/_Attack.png',    frames:4, fps:14,loop:false},
    death:     {src:'sprites/naveen_new/_Death.png',     frames:10,fps:8, loop:false},
    hit:       {src:'sprites/naveen_new/_Hit.png',       frames:1, fps:6},
    roll:      {src:'sprites/naveen_new/_Roll.png',      frames:12,fps:16,loop:false},
  }
};
const RAD = {
  frameW:64,frameH:64,scale:2.5,feetDY:-110,
  anims:{
    idle:  {src:'sprites/radhika/idle.png', frames:6,fps:6},
    run:   {src:'sprites/radhika/walk.png', frames:6,fps:10},
    jump:  {src:'sprites/radhika/jump.png', frames:6,fps:8},
    fall:  {src:'sprites/radhika/jump.png', frames:6,fps:8},
    slide: {src:'sprites/radhika/dash.png', frames:6,fps:14},
    death: {src:'sprites/radhika/death.png',frames:6,fps:6,loop:false},
    attack:{src:'sprites/radhika/dash.png', frames:6,fps:12,loop:false},
    hit:   {src:'sprites/radhika/idle.png', frames:1,fps:6},
    crouch:{src:'sprites/radhika/idle.png', frames:1,fps:6},
    roll:  {src:'sprites/radhika/dash.png', frames:6,fps:14,loop:false},
  }
};
const SOLDIER_CFG = {
  frameW:100,frameH:100,scale:1.6,feetDY:-91,
  anims:{
    idle:  {src:'sprites/soldier/Soldier-Idle.png',     frames:6,fps:6},
    walk:  {src:'sprites/soldier/Soldier-Walk.png',     frames:8,fps:10},
    attack:{src:'sprites/soldier/Soldier-Attack01.png', frames:6,fps:10},
    hurt:  {src:'sprites/soldier/Soldier-Hurt.png',     frames:4,fps:10,loop:false},
    death: {src:'sprites/soldier/Soldier-Death.png',    frames:4,fps:8, loop:false},
  }
};

// ── GLOBALS ────────────────────────────────────────────────────
let canvas,ctx,images={},keys={},prevKeys={},frameCount=0;
let screen='select',player=null,camera={x:0},camShake={x:0,y:0,dur:0,mag:0};
let bullets=[],enemyBullets=[],enemies=[],particles=[],chests=[];
let floatTexts=[],shootTimer=0;
let sublevel=1,levelComplete=false,sublevelTransition=false,sublevelTimer=0;
let noteVisible=false,noteTimer=0,noteText='',noteSubtext='';
let bossActive=false,boss=null,bossIntro=false,bossIntroTimer=0;
let bgImages={},victoryScreen=false,victoryTimer=0;
let shockwaves=[];

// ── IMAGE LOADING ──────────────────────────────────────────────
function loadCharImages(cfg,key,cb){
  images[key]={};
  const ks=Object.keys(cfg.anims);let n=0;
  ks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{if(++n===ks.length)cb();};
    img.src=cfg.anims[k].src; images[key][k]=img;
  });
}
function loadSoldierImages(cb){
  images.soldier={};
  const ks=Object.keys(SOLDIER_CFG.anims);let n=0;
  ks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{if(++n===ks.length)cb();};
    img.src=SOLDIER_CFG.anims[k].src; images.soldier[k]=img;
  });
}
function loadTriantusImages(cb){
  images.triantus={idle:[],attack:[],cast:[],hurt:[],death:[]};
  const COUNTS={idle:8,attack:10,cast:9,hurt:3,death:10};
  let total=0,loaded=0;
  Object.values(COUNTS).forEach(c=>total+=c);
  Object.entries(COUNTS).forEach(([an,count])=>{
    for(let i=1;i<=count;i++){
      const img=new Image(),idx=i-1;
      img.onload=img.onerror=()=>{if(++loaded===total)cb();};
      const cap=an.charAt(0).toUpperCase()+an.slice(1);
      img.src=`sprites/triantus/${cap}/Bringer-of-Death_${cap}_${i}.png`;
      images.triantus[an][idx]=img;
    }
  });
}
function loadBackgrounds(cb){
  const paths={bg0:'backgrounds/faultmine/bg0.png',bg1:'backgrounds/faultmine/bg1.png',
    grass1:'backgrounds/faultmine/grass1.png',tiles:'backgrounds/faultmine/tiles.png'};
  let n=0,total=Object.keys(paths).length;
  Object.entries(paths).forEach(([k,src])=>{
    const img=new Image();
    img.onload=img.onerror=()=>{bgImages[k]=img;if(++n===total)cb();};
    img.src=src;
  });
}

// ── ANIM HELPERS ───────────────────────────────────────────────
function setAnim(a,name){if(a.name!==name){a.name=name;a.frame=0;a.timer=0;}}
function tickAnim(a,cfg_anims){
  const def=cfg_anims[a.name];if(!def)return;
  a.timer++;
  const rate=Math.max(1,Math.round(CFG.FPS/def.fps));
  if(a.timer>=rate){a.timer=0;const loop=def.loop!==false;
    a.frame=loop?(a.frame+1)%def.frames:Math.min(a.frame+1,def.frames-1);}
}

// ── SCREEN SHAKE ───────────────────────────────────────────────
function shake(mag,dur){camShake.mag=mag;camShake.dur=dur;}
function updateShake(){
  if(camShake.dur>0){
    camShake.x=(Math.random()-0.5)*camShake.mag;
    camShake.y=(Math.random()-0.5)*camShake.mag;
    camShake.dur--;
  } else {camShake.x=0;camShake.y=0;}
}

// ── PARTICLES ──────────────────────────────────────────────────
function spawnParticles(x,y,color,count,speedMult=1){
  for(let i=0;i<count;i++)
    particles.push({x,y,vx:(Math.random()-0.5)*7*speedMult,vy:(Math.random()*-5-0.5)*speedMult,
      life:22+(Math.random()*18|0),maxLife:40,color,r:2+Math.random()*3.5});
}
function updateParticles(){
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.22;p.vx*=0.92;p.life--;});
  particles=particles.filter(p=>p.life>0);
}

// ── FLOAT TEXT ─────────────────────────────────────────────────
function floatText(x,y,text,color='#ffd166',size=14){
  floatTexts.push({x,y,text,color,size,life:80,maxLife:80,vy:-1.2});
}
function updateFloatTexts(){
  floatTexts.forEach(t=>{t.y+=t.vy;t.life--;});
  floatTexts=floatTexts.filter(t=>t.life>0);
}

// ── NOTE SYSTEM ────────────────────────────────────────────────
function showNote(text,subtext='',duration=200){
  noteText=text;noteSubtext=subtext;noteVisible=true;noteTimer=duration;
}

// ── SHOCKWAVE ──────────────────────────────────────────────────
function spawnShockwave(x,y){
  shockwaves.push({x,y,r:10,maxR:180,life:30,maxLife:30});
  shake(10,18);
}
function updateShockwaves(){
  shockwaves.forEach(s=>{s.r+=(s.maxR-s.r)*0.18;s.life--;});
  shockwaves=shockwaves.filter(s=>s.life>0);
}

// ── PLAYER INIT ────────────────────────────────────────────────
function initPlayer(charKey){
  player={
    charKey,cfg:charKey==='naveen'?NAV:RAD,
    x:180,y:CFG.GROUND_Y,vx:0,vy:0,
    facing:1,onGround:true,
    crouching:false,sliding:false,slideTimer:0,
    health:100,maxHealth:100,lives:3,
    score:0,ammo:0,hasGun:false,
    dead:false,deathTimer:0,invincible:0,
    rollTimer:0,
    anim:{name:'idle',frame:0,timer:0},
  };
  camera.x=0;
  bullets=[];enemyBullets=[];particles=[];
  chests=[];enemies=[];floatTexts=[];shockwaves=[];
  shootTimer=0;sublevel=1;levelComplete=false;
  sublevelTransition=false;sublevelTimer=0;
  noteVisible=false;bossActive=false;
  bossIntro=false;boss=null;victoryScreen=false;victoryTimer=0;
  spawnSublevel(1);
}

// ── SPAWN SUBLEVEL ─────────────────────────────────────────────
function spawnSublevel(lvl){
  enemies=[];chests=[];enemyBullets=[];bullets=[];
  sublevel=lvl;levelComplete=false;sublevelTransition=false;

  if(lvl===1){
    // 7 soldiers — simple positions
    [700,1050,1500,1950,2400,2900,3400].forEach((x,i)=>spawnSoldier(x,i%2===0?-1:1));
    spawnChest(900);
    spawnChest(2100);
    // Show opening note
    setTimeout(()=>showNote(
      '"You are our hope. Free us."',
      '— crumpled letter in your pocket',180),600);
  } else if(lvl===2){
    // 10 soldiers — more spread, some grouped
    [600,850,1200,1500,1800,2100,2600,3000,3500,4000].forEach((x,i)=>spawnSoldier(x,i%2===0?-1:1));
    spawnChest(750);
    spawnChest(1700);
    spawnChest(3200);
    showNote('STAGE 1-2','Fight through and reach the end!',100);
  } else if(lvl===3){
    // 8 soldiers — tighter, faster approach to boss territory
    [550,800,1100,1500,1900,2300,2700,3100].forEach((x,i)=>spawnSoldier(x,i%2===0?-1:1));
    // Make last 3 soldiers slightly tougher
    enemies[5].hp=45;enemies[5].maxHp=45;
    enemies[6].hp=45;enemies[6].maxHp=45;
    enemies[7].hp=45;enemies[7].maxHp=45;
    spawnChest(1000);
    spawnChest(2500);
    showNote('STAGE 1-3','Almost there... something waits ahead.',100);
  }
}

function spawnSoldier(x,facing){
  enemies.push({
    x,y:CFG.GROUND_Y,vx:0,vy:0,facing:facing||1,
    hp:30,maxHp:30,
    state:'patrol',
    anim:{name:'walk',frame:0,timer:0},
    attackCd:0,hurtTimer:0,shootCd:120,
    dead:false,deathDone:false,
    alertRange:300,attackRange:160,
    deathParticlesDone:false,
  });
}

function spawnChest(x){
  chests.push({
    x,y:CFG.GROUND_Y,
    open:false,locked:false,
    sequence:['ArrowUp','ArrowUp','ArrowUp'],
    progress:0,active:false,
    inputTimer:0,inputWindow:200,
    showPrompt:false,shakeTimer:0,failFlash:0,
    bobTimer:Math.random()*Math.PI*2,
  });
}

// ── CHEST MINI-GAME ────────────────────────────────────────────
window.addEventListener('keydown',e=>{
  keys[e.code]=true;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  // L3 chest input
  handleL3ChestInput(e.code);
  // Chest input
  for(const ch of chests){
    if(!ch.active||ch.open||ch.locked)continue;
    const exp=ch.sequence[ch.progress];
    if(e.code===exp){
      ch.progress++;ch.inputTimer=ch.inputWindow;
      shake(2,4);
      if(ch.progress>=ch.sequence.length){
        ch.open=true;ch.active=false;
        player.hasGun=true;
        player.ammo=Math.min(player.ammo+35,99);
        floatText(ch.x,ch.y-50,'GUN + 35 AMMO!','#ffd166',16);
        spawnParticles(ch.x,ch.y-20,'#ffd166',14);
        shake(4,8);
      }
    } else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){
      ch.progress=0;ch.locked=true;ch.active=false;
      ch.failFlash=60;ch.shakeTimer=20;
      floatText(ch.x,ch.y-50,'LOCKED!','#ff4444');
      spawnParticles(ch.x,ch.y-20,'#ff4444',8);
      shake(3,6);
    }
  }
});
window.addEventListener('keyup',e=>keys[e.code]=false);
const pressed=c=>keys[c]&&!prevKeys[c];

function updateChests(){
  for(const ch of chests){
    ch.bobTimer+=0.06;
    if(ch.open||ch.locked)continue;
    const dist=Math.abs(player.x-ch.x);
    ch.showPrompt=dist<110&&!ch.open&&!ch.locked;
    if(ch.showPrompt&&!ch.active){ch.active=true;ch.progress=0;ch.inputTimer=ch.inputWindow;}
    if(ch.active){
      ch.inputTimer--;
      if(ch.inputTimer<=0){ch.locked=true;ch.active=false;ch.failFlash=60;ch.shakeTimer=20;
        floatText(ch.x,ch.y-50,'TOO SLOW!','#ff8800');shake(3,6);}
    }
    if(ch.shakeTimer>0)ch.shakeTimer--;
    if(ch.failFlash>0)ch.failFlash--;
  }
}

// ── BOSS INIT ──────────────────────────────────────────────────
function initBoss(){
  bossActive=true;bossIntro=true;bossIntroTimer=200;
  boss={
    x:780,y:CFG.GROUND_Y,vx:0,vy:0,facing:-1,
    hp:120,maxHp:120,phase:1,
    state:'idle',
    anim:{name:'idle',frame:0,timer:0},
    attackCd:80,shootCd:0,
    onGround:true,jumpCount:0,maxJumps:2,
    // Shield mechanic
    shielded:false,shieldTimer:0,shieldCd:280,shieldDur:90,
    stunned:false,stunTimer:0,
    // Super speed
    superSpeedTimer:0,superSpeedCd:320,
    // Ground slam
    slamming:false,slamTimer:0,slamCd:400,slamWarning:false,slamWarnTimer:0,
    // Teleport (phase 2)
    teleporting:false,teleportTimer:0,teleportCd:350,teleportWarn:false,teleportWarnTimer:0,
    dead:false,deathTimer:0,deathDone:false,
  };
}

// ── PLAYER UPDATE ──────────────────────────────────────────────
function updatePlayer(){
  if(sublevelTransition)return;
  const p=player;
  if(p.dead){
    p.deathTimer++;
    setAnim(p.anim,'death');tickAnim(p.anim,p.cfg.anims);
    if(p.deathTimer>100)respawn();
    return;
  }
  if(p.invincible>0)p.invincible--;
  if(p.rollTimer>0)p.rollTimer--;

  const goL=keys['ArrowLeft']||keys['KeyA'];
  const goR=keys['ArrowRight']||keys['KeyD'];
  const goD=keys['ArrowDown']||keys['KeyS'];
  const run=keys['ShiftLeft']||keys['ShiftRight'];
  const doJump=pressed('ArrowUp')||pressed('KeyW')||pressed('KeyZ');
  const doShoot=(keys['KeyX']||keys['Space'])&&p.hasGun&&p.ammo>0;
  const doRoll=pressed('KeyC');

  // Roll
  if(doRoll&&p.onGround&&p.rollTimer===0){
    p.rollTimer=28;p.vx=p.facing*11;setAnim(p.anim,'roll');
    p.invincible=28;spawnParticles(p.x,p.y,'#aaddff',5);
  }

  // Slide
  if(p.onGround&&goD&&run&&!p.sliding&&(goL||goR)&&p.rollTimer===0){
    p.sliding=true;p.slideTimer=CFG.SLIDE_DUR;p.vx=p.facing*CFG.SLIDE;
  }
  if(p.sliding){
    p.slideTimer--;p.vx*=0.93;
    if(p.slideTimer<=0){p.sliding=false;p.vx=0;}
  } else if(p.rollTimer>0){
    // keep roll momentum
  } else {
    if(!p.crouching){
      if(goL){p.vx=run?-CFG.RUN:-CFG.WALK;p.facing=-1;}
      else if(goR){p.vx=run?CFG.RUN:CFG.WALK;p.facing=1;}
      else{p.vx*=0.75;if(Math.abs(p.vx)<0.3)p.vx=0;}
    } else {
      if(goL){p.vx=-1.5;p.facing=-1;}
      else if(goR){p.vx=1.5;p.facing=1;}
      else p.vx=0;
    }
    p.crouching=p.onGround&&goD;
    if(doJump&&p.onGround){
      p.vy=CFG.JUMP;p.onGround=false;
      spawnParticles(p.x,p.y,'#c8a060',4);
    }
  }

  // Shoot
  if(shootTimer>0)shootTimer--;
  if(doShoot&&shootTimer===0){
    shootTimer=CFG.SHOOT_CD;
    const by=p.y-(p.crouching||p.sliding?28:62);
    bullets.push({x:p.x+p.facing*28,y:by,vx:p.facing*CFG.BULLET_SPD,vy:0,alive:true});
    p.ammo--;
    spawnParticles(p.x+p.facing*32,by,'#ffe060',2);
  }

  p.vy+=CFG.GRAVITY;p.x+=p.vx;p.y+=p.vy;
  if(p.y>=CFG.GROUND_Y){p.y=CFG.GROUND_Y;p.vy=0;p.onGround=true;}
  p.x=Math.max(60,Math.min(CFG.LEVEL_W-100,p.x));

  // Camera smooth follow
  const tCam=p.x-CFG.CANVAS_W*0.35;
  camera.x+=(tCam-camera.x)*0.1;
  camera.x=Math.max(0,Math.min(CFG.LEVEL_W-CFG.CANVAS_W,camera.x));

  // Anim state
  let an='idle';
  if(p.rollTimer>0)an='roll';
  else if(!p.onGround)an=p.vy<0?'jump':'fall';
  else if(p.sliding)an='slide';
  else if(p.crouching)an=Math.abs(p.vx)>0?'crouchwalk':'crouch';
  else if(Math.abs(p.vx)>0.5)an='run';
  else an='idle';
  setAnim(p.anim,an);tickAnim(p.anim,p.cfg.anims);

  checkSublevelProgress();
}

// ── SUBLEVEL PROGRESS ──────────────────────────────────────────
function checkSublevelProgress(){
  if(levelComplete||bossActive||sublevelTransition)return;
  const allDead=enemies.length>0&&enemies.every(e=>e.dead);
  if(!allDead)return;
  levelComplete=true;

  if(sublevel===1||sublevel===2){
    // Transition to next sublevel
    sublevelTransition=true;sublevelTimer=120;
    setTimeout(()=>{
      spawnSublevel(sublevel+1);
      sublevelTransition=false;
    },2000);
  } else if(sublevel===3){
    // Boss warning
    sublevelTransition=true;
    setTimeout(()=>{
      showNote('"Your time has come...  Superboy."','— Triantus',240);
      setTimeout(()=>{noteVisible=false;initBoss();sublevelTransition=false;},3500);
    },1000);
  }
}

// ── ENEMY UPDATE ───────────────────────────────────────────────
function updateEnemies(){
  if(sublevelTransition)return;
  for(const e of enemies){
    if(e.dead){
      tickAnim(e.anim,SOLDIER_CFG.anims);
      if(e.anim.name==='death'&&e.anim.frame>=SOLDIER_CFG.anims.death.frames-1){
        e.deathDone=true;
        if(!e.deathParticlesDone){
          e.deathParticlesDone=true;
          spawnParticles(e.x,e.y-50,'#ffaa00',8);
        }
      }
      continue;
    }
    const dx=player.x-e.x;
    const dist=Math.abs(dx);
    e.facing=dx>0?1:-1;

    if(e.hurtTimer>0){e.hurtTimer--;setAnim(e.anim,'hurt');}
    else if(dist<e.attackRange){
      e.vx=0;setAnim(e.anim,'attack');
      if(e.shootCd>0)e.shootCd--;
      else{
        e.shootCd=90;
        enemyBullets.push({x:e.x+e.facing*20,y:e.y-55,vx:e.facing*6,vy:0,alive:true,boss:false});
      }
    } else if(dist<e.alertRange){
      e.vx=e.facing*1.8;setAnim(e.anim,'walk');
    } else {
      e.vx=e.facing*0.8;setAnim(e.anim,'walk');
    }

    e.x+=e.vx;e.x=Math.max(100,Math.min(CFG.LEVEL_W-100,e.x));
    if(e.attackCd>0)e.attackCd--;
    tickAnim(e.anim,SOLDIER_CFG.anims);

    // Contact damage
    if(player.invincible===0&&!player.dead){
      if(Math.abs(e.x-player.x)<32&&Math.abs(e.y-player.y)<80)hurtPlayer(8);
    }
  }
}

// ── BOSS UPDATE ────────────────────────────────────────────────
function updateBoss(){
  if(!boss||boss.deathDone)return;
  if(bossIntro){bossIntroTimer--;if(bossIntroTimer<=0){bossIntro=false;}return;}
  if(boss.dead){
    boss.deathTimer++;
    tickAnim(boss.anim,{idle:{frames:8,fps:6},attack:{frames:10,fps:10},
      cast:{frames:9,fps:8},hurt:{frames:3,fps:10},death:{frames:10,fps:6,loop:false}});
    if(boss.anim.frame>=9){
      boss.deathDone=true;
      victoryScreen=true;victoryTimer=0;
      showNote('TRIANTUS DEFEATED!','Level 1 Complete!  Well done, Superboy.',999);
      spawnParticles(boss.x,boss.y-80,'#ffd166',30,2);
      shake(15,30);
    }
    return;
  }

  // Phase transition
  if(boss.hp<=boss.maxHp*0.5&&boss.phase===1){
    boss.phase=2;
    showNote('⚠ TRIANTUS ENRAGED!','Super speed & teleport unlocked!',130);
    spawnParticles(boss.x,boss.y-80,'#ff2200',20,1.5);
    shake(12,25);
  }

  const spd=boss.phase===2?3.2:2.0;
  const dx=player.x-boss.x;
  boss.facing=dx>0?-1:1;

  // ── SHIELD (tricky mechanic 1)
  // Player must stop shooting while shielded, double damage after
  if(!boss.shielded&&!boss.stunned){
    boss.shieldCd--;
    if(boss.shieldCd<=0){
      boss.shielded=true;boss.shieldTimer=boss.shieldDur;boss.shieldCd=300;
      setAnim(boss.anim,'cast');
      floatText(boss.x,boss.y-200,'SHIELD!','#88ccff',18);
      shake(4,8);
    }
  }
  if(boss.shielded){
    boss.shieldTimer--;
    boss.vx*=0.7;
    if(boss.shieldTimer<=0){
      boss.shielded=false;boss.stunned=true;boss.stunTimer=80;
      setAnim(boss.anim,'hurt');
      floatText(boss.x,boss.y-200,'STUNNED! ATTACK NOW!','#ffff00',16);
      shake(6,10);
    }
  }
  if(boss.stunned){
    boss.stunTimer--;boss.vx=0;
    if(boss.stunTimer<=0)boss.stunned=false;
  }

  // ── GROUND SLAM (tricky mechanic 2)
  // Boss jumps up then slams — player must jump over shockwave
  if(!boss.slamming&&!boss.shielded&&!boss.stunned&&boss.onGround){
    boss.slamCd--;
    if(boss.slamCd<=0){
      // Warning phase
      boss.slamWarning=true;boss.slamWarnTimer=60;
      floatText(boss.x,boss.y-200,'GROUND SLAM!','#ff8800',16);
      boss.slamCd=350;
    }
  }
  if(boss.slamWarning){
    boss.slamWarnTimer--;
    if(boss.slamWarnTimer<=0){
      boss.slamWarning=false;boss.slamming=true;
      boss.vy=CFG.JUMP*1.3;boss.onGround=false;
      setAnim(boss.anim,'attack');
    }
  }
  if(boss.slamming&&boss.onGround){
    // SLAM landing
    boss.slamming=false;
    spawnShockwave(boss.x,boss.y);
    floatText(boss.x,boss.y-150,'JUMP!','#ff4400',20);
    // Check shockwave hit
    if(player.onGround&&Math.abs(player.x-boss.x)<260&&player.invincible===0){
      hurtPlayer(12);
      floatText(player.x,player.y-80,'SHOCKWAVE HIT!','#ff4444');
    }
  }

  // ── TELEPORT (phase 2, tricky mechanic 3)
  if(boss.phase===2&&!boss.teleporting&&!boss.shielded&&!boss.stunned){
    boss.teleportCd--;
    if(boss.teleportCd<=0){
      boss.teleportWarn=true;boss.teleportWarnTimer=50;
      boss.teleportCd=320;
      floatText(boss.x,boss.y-200,'TELEPORT!','#cc44ff',16);
    }
  }
  if(boss.teleportWarn){
    boss.teleportWarnTimer--;
    if(boss.teleportWarnTimer<=0){
      boss.teleportWarn=false;
      // Teleport to other side of player
      boss.x=player.x+(dx>0?-200:200);
      boss.x=Math.max(250,Math.min(CFG.LEVEL_W-250,boss.x));
      spawnParticles(boss.x,boss.y-60,'#cc44ff',16);
      shake(5,8);
    }
  }

  // ── SUPER SPEED (phase 2)
  if(boss.phase===2&&!boss.shielded&&!boss.stunned){
    boss.superSpeedCd--;
    if(boss.superSpeedCd<=0){
      boss.superSpeedTimer=22;boss.superSpeedCd=280;
      floatText(boss.x,boss.y-200,'SUPER SPEED!','#ff6600',14);
      spawnParticles(boss.x,boss.y-60,'#ff8800',8);
    }
  }
  if(boss.superSpeedTimer>0){
    boss.x+=dx>0?16:-16;boss.superSpeedTimer--;
  }

  // ── MOVEMENT (when not doing specials)
  if(!boss.stunned&&!boss.shielded&&boss.superSpeedTimer===0&&!boss.slamming){
    boss.x+=dx>0?spd:-spd;
  }

  // ── DOUBLE JUMP
  if(boss.onGround&&!boss.slamming){
    if(Math.random()<(boss.phase===2?0.012:0.005)){
      boss.vy=CFG.JUMP*(boss.phase===2?1.1:0.95);
      boss.onGround=false;boss.jumpCount++;
    }
  }
  if(!boss.onGround&&boss.jumpCount===1&&boss.phase===2&&Math.random()<0.04){
    boss.vy=CFG.JUMP*0.85;boss.jumpCount=2;
  }

  boss.vy+=CFG.GRAVITY;boss.y+=boss.vy;
  if(boss.y>=CFG.GROUND_Y){boss.y=CFG.GROUND_Y;boss.vy=0;boss.onGround=true;boss.jumpCount=0;}
  boss.x=Math.max(200,Math.min(CFG.LEVEL_W-200,boss.x));

  // ── SHOOT (2 guns spread, stops during shield/stun)
  if(!boss.shielded&&!boss.stunned){
    if(boss.shootCd>0)boss.shootCd--;
    else{
      boss.shootCd=boss.phase===2?45:75;
      const dir=dx>0?1:-1;
      enemyBullets.push({x:boss.x+dir*40,y:boss.y-110,vx:dir*8.5,vy:-0.8,alive:true,boss:true});
      enemyBullets.push({x:boss.x+dir*40,y:boss.y-110,vx:dir*8.5,vy:0.8,alive:true,boss:true});
      if(boss.phase===2)
        enemyBullets.push({x:boss.x+dir*40,y:boss.y-110,vx:dir*9,vy:0,alive:true,boss:true});
      if(!boss.shielded&&boss.anim.name!=='hurt')setAnim(boss.anim,'attack');
    }
  }

  // Anim fallback
  if(!['attack','cast','hurt','death'].includes(boss.anim.name))
    setAnim(boss.anim,Math.abs(boss.vx)>0.5?'attack':'idle');

  const BOSS_ANIMS={idle:{frames:8,fps:6},attack:{frames:10,fps:12},
    cast:{frames:9,fps:8,loop:true},hurt:{frames:3,fps:12,loop:false},death:{frames:10,fps:7,loop:false}};
  tickAnim(boss.anim,BOSS_ANIMS);

  // Contact damage (reduced during stun)
  if(player.invincible===0&&!player.dead){
    if(Math.abs(boss.x-player.x)<55&&Math.abs(boss.y-player.y)<120)
      hurtPlayer(boss.stunned?5:12);
  }
}

// ── BULLET UPDATE ──────────────────────────────────────────────
function updateBullets(){
  for(const b of bullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}

    // Hit boss
    if(bossActive&&boss&&!boss.dead&&!boss.deathDone){
      if(Math.abs(b.x-boss.x)<60&&Math.abs(b.y-(boss.y-175))<140){
        if(boss.shielded){
          // Bullets bounce off shield
          b.alive=false;
          spawnParticles(boss.x,boss.y-90,'#88ccff',4);
          floatText(boss.x,boss.y-160,'BLOCKED!','#88ccff',12);
        } else {
          const dmg=boss.stunned?20:10;
          boss.hp-=dmg;b.alive=false;
          spawnParticles(boss.x,boss.y-90,'#ff5500',5);
          floatText(boss.x,boss.y-160,boss.stunned?`-${dmg} BONUS!`:`-${dmg}`,'#ff4444',12);
          player.score+=boss.stunned?20:10;
          shake(3,5);
          if(!boss.stunned)setAnim(boss.anim,'hurt');
          if(boss.hp<=0){boss.hp=0;boss.dead=true;setAnim(boss.anim,'death');}
        }
        continue;
      }
    }
    // Hit enemies
    for(const e of enemies){
      if(e.dead)continue;
      if(Math.abs(b.x-e.x)<28&&Math.abs(b.y-(e.y-55))<45){
        e.hp-=10;b.alive=false;
        spawnParticles(e.x,e.y-55,'#ff5522',4);
        player.score+=10;
        if(e.hp<=0){
          e.dead=true;setAnim(e.anim,'death');
          player.score+=100;shake(2,4);
          floatText(e.x,e.y-90,'+100','#ffd166');
        } else {
          setAnim(e.anim,'hurt');e.hurtTimer=18;
        }
        break;
      }
    }
  }
  bullets=bullets.filter(b=>b.alive);

  // Enemy bullets
  for(const b of enemyBullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(player.invincible===0&&!player.dead){
      if(Math.abs(b.x-player.x)<20&&Math.abs(b.y-(player.y-50))<40){
        b.alive=false;hurtPlayer(b.boss?10:6);
      }
    }
  }
  enemyBullets=enemyBullets.filter(b=>b.alive);
}

function hurtPlayer(dmg){
  player.health-=dmg;player.invincible=50;
  spawnParticles(player.x,player.y-50,'#ff2222',5);
  shake(4,8);
  if(player.health<=0){
    player.health=0;player.dead=true;player.deathTimer=0;
    setAnim(player.anim,'death');
  }
}
function respawn(){
  if(player.lives<=0){
    screen='gameover';
    document.getElementById('gameover-overlay').classList.remove('hidden');
    document.getElementById('final-score').textContent=player.score;
    return;
  }
  player.lives--;player.health=100;player.dead=false;
  player.deathTimer=0;player.invincible=90;
  player.y=CFG.GROUND_Y;player.vy=0;player.vx=0;
  player.anim={name:'idle',frame:0,timer:0};
}

// ══════════════════════════════════════════════════════════════
//  DRAW
// ══════════════════════════════════════════════════════════════
function drawBackground(){
  const W=CFG.CANVAS_W,GY=CFG.GROUND_Y;
  // Sky
  const sky=ctx.createLinearGradient(0,0,0,GY);
  sky.addColorStop(0,'#f7c96e');sky.addColorStop(0.5,'#f5a945');sky.addColorStop(1,'#e8803a');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,GY);

  // Far BG
  if(bgImages.bg0?.naturalWidth>0){
    const pw=bgImages.bg0.width;
    const px=(camera.x*0.06)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)
      ctx.drawImage(bgImages.bg0,ox,GY-bgImages.bg0.height,pw,bgImages.bg0.height);
  }
  // Mid BG
  if(bgImages.bg1?.naturalWidth>0){
    const pw=bgImages.bg1.width;
    const px=(camera.x*0.18)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)
      ctx.drawImage(bgImages.bg1,ox,GY-bgImages.bg1.height,pw,bgImages.bg1.height);
  } else {
    ctx.fillStyle='#7a3a10';
    for(let i=0;i<20;i++){
      const px=((i*120-camera.x*0.2)%(W+120)+W+120)%(W+120)-60;
      ctx.fillRect(px,GY-60-(i*37%80),40+i%3*15,60+i*37%80);
    }
  }
  // Grass
  if(bgImages.grass1?.naturalWidth>0){
    const pw=bgImages.grass1.width;
    const px=(camera.x*0.5)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)
      ctx.drawImage(bgImages.grass1,ox,GY-bgImages.grass1.height+15,pw,bgImages.grass1.height);
  }
  // Ground
  if(bgImages.tiles?.naturalWidth>0){
    const tw=bgImages.tiles.width,px=(camera.x)%tw;
    for(let ox=-px;ox<W+tw;ox+=tw)
      ctx.drawImage(bgImages.tiles,0,0,tw,bgImages.tiles.height,ox,GY,tw,40);
  }
  ctx.fillStyle='#3a1c04';ctx.fillRect(0,GY+40,W,CFG.CANVAS_H-GY-40);
  ctx.fillStyle='#5a2e08';ctx.fillRect(0,GY,W,6);
}

function drawShockwaves(){
  for(const s of shockwaves){
    const a=s.life/s.maxLife;
    ctx.save();ctx.globalAlpha=a*0.6;
    ctx.strokeStyle='#ff8800';ctx.lineWidth=4;
    ctx.beginPath();
    ctx.ellipse(s.x-camera.x,s.y,s.r,s.r*0.25,0,0,Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha=a*0.2;ctx.fillStyle='#ff4400';
    ctx.beginPath();
    ctx.ellipse(s.x-camera.x,s.y,s.r,s.r*0.25,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

function drawChests(){
  for(const ch of chests){
    const bob=Math.sin(ch.bobTimer)*3;
    const sx=ch.x-camera.x+(ch.shakeTimer>0?(Math.random()*6-3):0);
    const sy=ch.y+bob;

    // Glow when active
    if(ch.showPrompt&&!ch.open&&!ch.locked){
      ctx.save();ctx.shadowColor='#ffd166';ctx.shadowBlur=18;
    }
    ctx.fillStyle=ch.locked?'#442200':ch.open?'#886600':'#8B4513';
    ctx.fillRect(sx-24,sy-30,48,30);
    ctx.fillStyle=ch.locked?'#661100':ch.open?'#ccaa00':'#cd853f';
    ctx.fillRect(sx-24,sy-36,48,10);
    // Lock/latch
    ctx.fillStyle=ch.locked?'#ff3300':'#ffd700';
    ctx.fillRect(sx-5,sy-28,10,8);
    if(ch.showPrompt&&!ch.open&&!ch.locked)ctx.restore();

    // Status icon
    ctx.font='bold 16px monospace';ctx.textAlign='center';
    if(ch.locked){ctx.fillStyle='#ff4444';ctx.fillText('✗',sx,sy-38);}
    else if(ch.open){ctx.fillStyle='#ffd166';ctx.fillText('★',sx,sy-40);}
    else{ctx.fillStyle='#fff';ctx.fillText('?',sx,sy-38);}
    ctx.textAlign='left';

    // Mini-game prompt
    if(ch.showPrompt&&!ch.open&&!ch.locked){
      ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(sx-70,sy-105,140,62);
      ctx.strokeStyle='#ffd166';ctx.lineWidth=1.5;ctx.strokeRect(sx-70,sy-105,140,62);
      ctx.fillStyle='#ffd166';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText('PRESS TO OPEN CHEST:',sx,sy-90);
      ctx.font='bold 20px monospace';
      ['↑','↑','↑'].forEach((s,i)=>{
        ctx.fillStyle=i<ch.progress?'#00ff88':i===ch.progress?'#ffff00':'#666';
        ctx.fillText(s,sx-22+i*22,sy-68);
      });
      // Timer bar
      ctx.fillStyle='#333';ctx.fillRect(sx-55,sy-58,110,7);
      const tc=ch.inputTimer/ch.inputWindow;
      ctx.fillStyle=tc>0.4?'#22dd22':'#ff6600';
      ctx.fillRect(sx-55,sy-58,110*tc,7);
      ctx.textAlign='left';
    }
    if(ch.failFlash>0){
      ctx.fillStyle=`rgba(255,0,0,${ch.failFlash/60*0.35})`;
      ctx.fillRect(sx-28,sy-38,56,42);
    }
  }
}

function drawEnemies(){
  for(const e of enemies){
    if(e.deathDone)continue;
    const sx=e.x-camera.x;
    if(sx<-120||sx>CFG.CANVAS_W+120)continue;
    const img=images.soldier?.[e.anim.name];
    const dw=SOLDIER_CFG.frameW*SOLDIER_CFG.scale,dh=SOLDIER_CFG.frameH*SOLDIER_CFG.scale;
    ctx.save();ctx.translate(sx,e.y);
    if(e.facing<0)ctx.scale(-1,1);
    if(img?.complete&&img.naturalWidth>0)
      ctx.drawImage(img,e.anim.frame*SOLDIER_CFG.frameW,0,SOLDIER_CFG.frameW,SOLDIER_CFG.frameH,-dw/2,-91,dw,dh);
    else{ctx.fillStyle='#4a4a5a';ctx.fillRect(-20,-91,40,91);}
    ctx.restore();
    if(e.hp<e.maxHp&&!e.dead){
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(sx-22,e.y-100,44,6);
      ctx.fillStyle='#f00';ctx.fillRect(sx-22,e.y-100,(e.hp/e.maxHp)*44,6);
    }
  }
}

function drawBullets(){
  for(const b of bullets){
    const bx=b.x-camera.x;
    ctx.save();ctx.shadowColor='#ffe060';ctx.shadowBlur=8;
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(bx,b.y,7,3,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#ffe060';ctx.beginPath();ctx.ellipse(bx,b.y,5,2.5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,200,50,0.2)';ctx.beginPath();ctx.ellipse(bx-b.vx*2,b.y,10,2,0,0,Math.PI*2);ctx.fill();
  }
  for(const b of enemyBullets){
    const bx=b.x-camera.x;
    const col=b.boss?'#ff6600':'#ff2200';
    ctx.save();ctx.shadowColor=col;ctx.shadowBlur=6;
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(bx,b.y,b.boss?8:6,3,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

function drawBoss(){
  if(!boss||boss.deathDone)return;
  const sx=boss.x-camera.x,sy=boss.y;
  const SCALE=3.8;
  const dw=140*SCALE,dh=93*SCALE;
  const frames=images.triantus?.[boss.anim.name];
  const img=frames?.[boss.anim.frame];

  ctx.save();
  // Shield glow
  if(boss.shielded){
    ctx.shadowColor='#4499ff';ctx.shadowBlur=35;
  } else if(boss.stunned){
    ctx.shadowColor='#ffff00';ctx.shadowBlur=25;
  } else if(boss.phase===2){
    ctx.shadowColor='#ff2200';ctx.shadowBlur=20;
  }
  ctx.translate(sx,sy);
  if(boss.facing>0)ctx.scale(-1,1);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,0,0,140,93,-dw/2,-350,dw,dh);
  else{
    ctx.fillStyle='#880000';ctx.fillRect(-55,-dh,110,dh);
    ctx.fillStyle='#ff2200';ctx.fillRect(-35,-dh-20,70,22);
  }
  ctx.restore();

  // Shield visual ring
  if(boss.shielded){
    ctx.save();ctx.strokeStyle='rgba(100,180,255,0.7)';ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(sx,sy-dh/2,80,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  // Stun stars
  if(boss.stunned&&frameCount%8<4){
    ctx.fillStyle='#ffff00';ctx.font='20px monospace';ctx.textAlign='center';
    ctx.fillText('★★★',sx,sy-dh-10);ctx.textAlign='left';
  }
  // Slam warning
  if(boss.slamWarning){
    const p=1-boss.slamWarnTimer/60;
    ctx.fillStyle=`rgba(255,100,0,${p*0.4})`;
    ctx.beginPath();ctx.arc(sx,sy,120,0,Math.PI*2);ctx.fill();
  }

  // Boss HP bar
  const bx=160,by=20,bw=640,bh=22;
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(bx-6,by-6,bw+12,bh+12);
  ctx.strokeStyle='#ff4444';ctx.lineWidth=2;ctx.strokeRect(bx-6,by-6,bw+12,bh+12);
  ctx.fillStyle='#300';ctx.fillRect(bx,by,bw,bh);
  const pct=boss.hp/boss.maxHp;
  const bc=pct>0.5?'#ff4444':pct>0.25?'#ff8800':'#ffff44';
  ctx.fillStyle=bc;ctx.fillRect(bx,by,bw*pct,bh);
  // Phase 2 flicker
  if(boss.phase===2&&frameCount%4<2){
    ctx.fillStyle='rgba(255,50,0,0.3)';ctx.fillRect(bx,by,bw*pct,bh);
  }
  if(boss.shielded){ctx.fillStyle='rgba(100,180,255,0.5)';ctx.fillRect(bx,by,bw,bh);}
  ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';
  const status=boss.shielded?'🛡 SHIELDED':boss.stunned?'⚡ STUNNED — DEAL BONUS DAMAGE!':boss.phase===2?'⚠ ENRAGED':'';
  ctx.fillText(`TRIANTUS  ${boss.hp}/${boss.maxHp}  ${status}`,bx+bw/2,by+16);
  ctx.textAlign='left';
}

function drawPlayer(){
  const p=player;
  if(p.dead){
    if(Math.floor(p.deathTimer/6)%2===0)drawPlayerSprite();
    return;
  }
  if(p.invincible>0&&Math.floor(p.invincible/5)%2===1)return;
  drawPlayerSprite();
}
function drawPlayerSprite(){
  const p=player,cfg=p.cfg;
  const img=images[p.charKey]?.[p.anim.name];
  const dw=cfg.frameW*cfg.scale;
  const dh=cfg.frameH*cfg.scale;
  const dy=cfg.feetDY||-dh;
  const crouch=p.crouching||p.sliding;
  ctx.save();
  ctx.translate(p.x-camera.x+camShake.x,p.y+camShake.y);
  if(p.facing<0)ctx.scale(-1,1);
  if(crouch){
    ctx.save();ctx.scale(1,0.6);
    if(img?.complete&&img.naturalWidth>0)
      ctx.drawImage(img,p.anim.frame*cfg.frameW,0,cfg.frameW,cfg.frameH,-dw/2,dy/0.6,dw,dh);
    else{ctx.fillStyle=p.charKey==='naveen'?'#3fe2ff':'#ff74c6';ctx.fillRect(-22,-55,44,55);}
    ctx.restore();
  } else {
    if(img?.complete&&img.naturalWidth>0)
      ctx.drawImage(img,p.anim.frame*cfg.frameW,0,cfg.frameW,cfg.frameH,-dw/2,dy,dw,dh);
    else{ctx.fillStyle=p.charKey==='naveen'?'#3fe2ff':'#ff74c6';ctx.fillRect(-22,-90,44,90);}
  }
  ctx.restore();
}

function drawParticles(){
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
    ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x-camera.x+camShake.x,p.y+camShake.y,p.r,0,Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha=1;
}

function drawFloatTexts(){
  floatTexts.forEach(t=>{
    ctx.save();ctx.globalAlpha=t.life/t.maxLife;
    ctx.fillStyle=t.color;
    ctx.font=`bold ${t.size||14}px monospace`;ctx.textAlign='center';
    ctx.fillText(t.text,t.x-camera.x,t.y);ctx.restore();
  });
  ctx.textAlign='left';
}

function drawHUD(){
  // Health panel
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(6,6,238,98);
  ctx.strokeStyle='#6de0ff';ctx.lineWidth=1.5;ctx.strokeRect(6,6,238,98);
  ctx.fillStyle='#6de0ff';ctx.font='9px monospace';ctx.fillText('HP',14,23);
  ctx.fillStyle='#1a0000';ctx.fillRect(30,13,192,14);
  const hg=ctx.createLinearGradient(30,0,222,0);
  hg.addColorStop(0,'#00ff88');hg.addColorStop(0.5,'#aaff00');hg.addColorStop(1,'#ff4400');
  ctx.fillStyle=hg;ctx.fillRect(30,13,192*(player.health/player.maxHealth),14);
  ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.fillText(`${player.health}%`,34,24);
  ctx.fillStyle='#ffd166';ctx.font='11px monospace';ctx.fillText(`LIVES: ${player.lives}`,14,44);
  ctx.fillStyle='#fff';ctx.fillText(`SCORE: ${String(player.score).padStart(7,'0')}`,14,60);
  ctx.fillStyle='#ff9944';ctx.fillText(`AMMO:  ${player.hasGun?String(player.ammo).padStart(2,'0'):'FIND A GUN!'}`,14,76);
  ctx.fillStyle='#88aacc';ctx.font='9px monospace';
  const lvlNames={1:'FAULTMINE DAY',2:'WRAPZONE NIGHT',3:'FAULTMINE NIGHT',4:'AKUSTUS KISEMO',5:'SECRET LAB'};
  const bossNames={1:'TRIANTUS',2:'MAMULAUS',3:'AVERA',4:'OCTOPA-TOTO-CUMPUS',5:'CLASUS'};
  const stageLabel=bossActive?`⚔ BOSS: ${bossNames[currentLevel]}`:`LVL${currentLevel} STAGE ${sublevel} — ${lvlNames[currentLevel]}`;
  ctx.fillText(stageLabel,14,92);

  // Controls bar — desktop only
  if(!IS_MOBILE){
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,CFG.CANVAS_H-22,CFG.CANVAS_W,22);
    ctx.fillStyle='#88aacc';ctx.font='9px monospace';
    ctx.fillText('← → MOVE  SHIFT RUN  ↑/Z JUMP  ↓ CROUCH  ↓+SHIFT SLIDE  X/SPACE SHOOT  C ROLL',8,CFG.CANVAS_H-7);
  }

  // Ammo warning
  if(player.hasGun&&player.ammo<=10&&player.ammo>0&&frameCount%20<10){
    ctx.fillStyle='#ff4444';ctx.font='bold 11px monospace';
    ctx.fillText('⚠ LOW AMMO',14,92);
  }
}

function drawNote(){
  if(!noteVisible)return;
  const W=500,H=90,cx=CFG.CANVAS_W/2,cy=CFG.CANVAS_H/2-30;
  ctx.fillStyle='rgba(0,0,0,0.82)';ctx.fillRect(cx-W/2,cy-H/2,W,H);
  ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.strokeRect(cx-W/2,cy-H/2,W,H);
  ctx.fillStyle='#ffd166';ctx.font='bold 15px monospace';ctx.textAlign='center';
  ctx.fillText(noteText,cx,cy-6);
  if(noteSubtext){ctx.fillStyle='#aac8ff';ctx.font='11px monospace';ctx.fillText(noteSubtext,cx,cy+18);}
  ctx.textAlign='left';
}

function drawSublevelTransition(){
  if(!sublevelTransition)return;
  ctx.fillStyle='rgba(0,0,0,0.75)';ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  ctx.fillStyle='#ffd166';ctx.font='bold 32px monospace';ctx.textAlign='center';
  if(currentLevel===1){
    ctx.fillText(`STAGE 1-${sublevel+1}`,CFG.CANVAS_W/2,CFG.CANVAS_H/2-10);
    ctx.fillStyle='#aac8ff';ctx.font='14px monospace';
    ctx.fillText(sublevel===1?'The robots grow stronger...':'Something powerful waits ahead...',CFG.CANVAS_W/2,CFG.CANVAS_H/2+25);
  } else {
    const next=sublevel===1?'STAGE 2-2: FREE JENNY':sublevel===2?'BOSS: MAMULAUS':'';
    ctx.fillText(next,CFG.CANVAS_W/2,CFG.CANVAS_H/2-10);
    ctx.fillStyle='#cc88ff';ctx.font='14px monospace';
    ctx.fillText(sublevel===1?'The Warpzone holds a prisoner...':'The guardian emerges...',CFG.CANVAS_W/2,CFG.CANVAS_H/2+25);
  }
  ctx.textAlign='left';
}

function drawBossIntro(){
  if(!bossIntro)return;
  const a=Math.min(1,bossIntroTimer/60)*0.88;
  ctx.fillStyle=`rgba(0,0,0,${a})`;ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  ctx.save();
  ctx.shadowColor='#ff2200';ctx.shadowBlur=40;
  ctx.fillStyle=`rgba(255,50,50,${a})`;ctx.font='bold 52px monospace';ctx.textAlign='center';
  ctx.fillText('TRIANTUS',CFG.CANVAS_W/2,CFG.CANVAS_H/2-30);
  ctx.restore();
  ctx.fillStyle=`rgba(255,200,100,${a})`;ctx.font='15px monospace';ctx.textAlign='center';
  ctx.fillText('The First Enforcer — Sent to recapture the hero',CFG.CANVAS_W/2,CFG.CANVAS_H/2+12);
  ctx.fillStyle=`rgba(180,220,255,${a})`;ctx.font='11px monospace';
  ctx.fillText('HINTS: 🛡 Stop shooting when shielded  •  ⚡ Jump over ground slams  •  🟡 Attack when stunned!',CFG.CANVAS_W/2,CFG.CANVAS_H/2+40);
  ctx.textAlign='left';
}

function drawVictory(){
  if(!victoryScreen)return;
  victoryTimer++;
  ctx.fillStyle=`rgba(0,0,0,${Math.min(0.75,victoryTimer/60)})`;
  ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  if(victoryTimer<30)return;
  const pulse=Math.sin(victoryTimer*0.08)*0.15+0.85;
  ctx.save();
  ctx.translate(CFG.CANVAS_W/2,CFG.CANVAS_H/2-60);ctx.scale(pulse,pulse);
  ctx.fillStyle='#ffd166';ctx.font='bold 44px monospace';ctx.textAlign='center';
  ctx.fillText('LEVEL 1 COMPLETE!',0,0);ctx.restore();
  ctx.fillStyle='#ffffff';ctx.font='18px monospace';ctx.textAlign='center';
  ctx.fillText(`SCORE: ${String(player.score).padStart(7,'0')}`,CFG.CANVAS_W/2,CFG.CANVAS_H/2+10);
  ctx.fillStyle='#aac8ff';ctx.font='13px monospace';
  ctx.fillText('"I have to find my family... this is just the beginning."',CFG.CANVAS_W/2,CFG.CANVAS_H/2+45);
  ctx.fillStyle='#88aacc';ctx.font='11px monospace';
  ctx.fillText('Level 2 — Wrapzone Night — Coming Next',CFG.CANVAS_W/2,CFG.CANVAS_H/2+70);
  if(victoryTimer>120&&Math.floor(victoryTimer/20)%2===0){
    ctx.fillStyle='#ffd166';ctx.font='12px monospace';
    const nxtLvl=currentLevel<5?`Press N for Level ${currentLevel+1}`:'Press R to play again';
    ctx.fillText(`[ Press R to restart  |  ${nxtLvl} ]`,CFG.CANVAS_W/2,CFG.CANVAS_H/2+100);
  }
  ctx.textAlign='left';
  if(keys['KeyR']&&victoryTimer>120)restartGame();
  if(currentLevel===1&&keys['KeyN']&&victoryTimer>120)goToLevel2();
  if(currentLevel===2&&keys['KeyN']&&victoryTimer>120)goToLevel3();
  if(currentLevel===3&&keys['KeyN']&&victoryTimer>120)goToLevel4();
  if(currentLevel===4&&keys['KeyN']&&victoryTimer>120)goToLevel5();
}

function drawLoadingScreen(){
  ctx.fillStyle='#14141c';ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  const dots='.'.repeat((frameCount%45/15|0)+1);
  ctx.fillStyle='#ffd166';ctx.font='bold 28px monospace';ctx.textAlign='center';
  ctx.fillText('OPERATION IRON PIXEL',CFG.CANVAS_W/2,CFG.CANVAS_H/2-50);
  ctx.fillStyle='#6de0ff';ctx.font='16px monospace';
  ctx.fillText(`Loading${dots}`,CFG.CANVAS_W/2,CFG.CANVAS_H/2);
  ctx.fillStyle='#666';ctx.font='11px monospace';
  ctx.fillText('Year 4096 — The robots have taken everything.',CFG.CANVAS_W/2,CFG.CANVAS_H/2+30);
  ctx.textAlign='left';
}

// ── MAIN LOOP ──────────────────────────────────────────────────
function gameLoop(){
  requestAnimationFrame(gameLoop);
  frameCount++;mergeTouchKeys();prevKeys={...keys};
  ctx.clearRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);

  if(screen==='game'){
    updateShake();updateParticles();updateFloatTexts();updateShockwaves();
    if(!victoryScreen){
      updatePlayer();
      if(currentLevel===1){
        updateChests();
        if(bossActive)updateBoss();
        else updateEnemies();
        updateBullets();
      } else if(currentLevel===2){
        updateLevel2();
        updateBulletsL2();
      } else if(currentLevel===3){
        updateLevel3();
        updateBulletsL3();
      } else if(currentLevel===4){
        updateLevel4();
        updateBulletsL4();
      } else if(currentLevel===5){
        updateLevel5();
        updateBulletsL5();
      }
      if(noteVisible){noteTimer--;if(noteTimer<=0&&!victoryScreen)noteVisible=false;}
    }
    // Draw
    ctx.save();ctx.translate(camShake.x,camShake.y);
    if(currentLevel===1){ drawBackground(); drawShockwaves(); drawChests(); drawEnemies(); }
    else if(currentLevel===2){ drawWrapzoneBackground(); if(sublevel===2||sublevel==='boss')drawJenny(); if(sublevel===2)drawTerminals(); drawEnemies(); }
    else if(currentLevel===3){ drawFaultmineNight(); drawL3Chests(); drawEnemies(); }
    else if(currentLevel===4){ drawAkustusBackground(); drawEnemies(); }
    else if(currentLevel===5){ drawLabBackground(); drawEnemies(); }
    drawBullets(); drawParticles(); drawPlayer();
    if(currentLevel===1&&bossActive)drawBoss();
    if(currentLevel===2&&bossActive)drawMamulaus();
    if(currentLevel===3&&bossActive)drawAvera();
    if(currentLevel===4&&bossActive)drawOctopa();
    if(currentLevel===5&&bossActive)drawClasus();
    if(darkMode)drawDarkMask();
    ctx.restore();
    drawFloatTexts();
    if(currentLevel===2)drawKillCounter();
    if(currentLevel===3)drawPhoneCall();
    drawHUD();
    drawNote();
    drawSublevelTransition();
    if(bossIntro&&currentLevel===1)drawBossIntro();
    if(bossIntro&&currentLevel===2)drawMamulausIntro();
    if(bossIntro&&currentLevel===3)drawAveraIntro();
    if(bossIntro&&currentLevel===4)drawOctopaIntro();
    if(bossIntro&&currentLevel===5)drawClasusBossIntro();
    if(victoryScreen)drawVictory();
    if(familyFreed)drawEnding();
  } else if(screen==='loading'){
    drawLoadingScreen();
  }
}

// ── START / RESTART ────────────────────────────────────────────
function goToLevel3(){
  victoryScreen=false;noteVisible=false;darkMode=false;screen='loading';
  loadLevel3Assets(()=>{ startLevel3(); screen='game'; });
}
function goToLevel4(){
  victoryScreen=false;noteVisible=false;darkMode=false;screen='loading';
  loadLevel4Assets(()=>{ startLevel4(); screen='game'; });
}
function goToLevel5(){
  victoryScreen=false;noteVisible=false;darkMode=false;screen='loading';
  loadLevel5Assets(()=>{ startLevel5(); screen='game'; });
}
function goToLevel2(){
  victoryScreen=false;noteVisible=false;
  screen='loading';
  document.getElementById('select-overlay').classList.add('hidden');
  ctx.fillStyle='#14141c';ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  loadLevel2Assets(()=>{
    startLevel2();
    screen='game';
  });
}

function startGame(charKey){
  document.getElementById('select-overlay').classList.add('hidden');
  screen='loading';
  let loaded=0;
  const check=()=>{if(++loaded>=4){initPlayer(charKey);screen='game';}};
  loadCharImages(charKey==='naveen'?NAV:RAD,charKey,check);
  loadSoldierImages(check);
  loadTriantusImages(check);
  loadBackgrounds(check);
}
function restartGame(){
  document.getElementById('gameover-overlay').classList.add('hidden');
  document.getElementById('select-overlay').classList.remove('hidden');
  screen='select';
}

window.addEventListener('DOMContentLoaded',()=>{
  canvas=document.getElementById('game-canvas');
  ctx=canvas.getContext('2d');
  initMobileControls();
  initResponsiveCanvas();
  document.getElementById('btn-naveen').addEventListener('click',()=>startGame('naveen'));
  document.getElementById('btn-radhika').addEventListener('click',()=>startGame('radhika'));
  document.getElementById('btn-restart').addEventListener('click',restartGame);
  requestAnimationFrame(gameLoop);
});

// ═══════════════════════════════════════════════════════════════
//  LEVEL 2 — WRAPZONE NIGHT
// ═══════════════════════════════════════════════════════════════

// ── LEVEL 2 SPRITE CONFIGS ─────────────────────────────────────
const MAMULAUS_CFG = {
  frameW:250, frameH:250, scale:1.5,
  anims:{
    idle:   {src:'sprites/mamulaus/idle.png',    frames:8, fps:7},
    run:    {src:'sprites/mamulaus/run.png',     frames:8, fps:12},
    attack1:{src:'sprites/mamulaus/attack1.png', frames:8, fps:12, loop:false},
    attack2:{src:'sprites/mamulaus/attack2.png', frames:8, fps:12, loop:false},
    hurt:   {src:'sprites/mamulaus/hurt.png',    frames:3, fps:10, loop:false},
    death:  {src:'sprites/mamulaus/death.png',   frames:7, fps:8,  loop:false},
    jump:   {src:'sprites/mamulaus/jump.png',    frames:2, fps:6},
    fall:   {src:'sprites/mamulaus/fall.png',    frames:2, fps:6},
  }
};
const JENNY_CFG = {
  frameW:69, frameH:44, scale:2.8,
  anims:{
    idle:  {src:'sprites/jenny/idle.png',   frames:6,  fps:6},
    dash:  {src:'sprites/jenny/dash.png',   frames:7,  fps:10},
    attack:{src:'sprites/jenny/attack.png', frames:12, fps:12},
    crouch:{src:'sprites/jenny/crouch.png', frames:6,  fps:6},
    fall:  {src:'sprites/jenny/fall.png',   frames:3,  fps:8},
    death: {src:'sprites/jenny/death.png',  frames:11, fps:8, loop:false},
  }
};

// ── LEVEL 2 STATE ──────────────────────────────────────────────
let currentLevel = 1;
let wrapzoneBgs  = {};
let wrapzoneBgLoaded = false;
let killCount    = 0;
const KILL_TARGET = 50;
let waveTimer    = 0;
let waveInterval = 300; // frames between waves
let totalSpawned = 0;
let waveNumber   = 0;

// Jenny puzzle state
let jennyFreed    = false;
let jennyAnim     = {name:'idle', frame:0, timer:0};
let jennyX        = 0;
let jennyDialogue = false;
let jennyDialogueTimer = 0;
let jennyDialogueLine  = 0;
const JENNY_LINES = [
  '"Finally... I thought no one would come."',
  '"The robots... they took everyone. Your family too."',
  '"I know where they are being held. Follow me."',
  '"Robo-trap-izon built a prison in Akustus Kisemo."',
  '"But first we have to get through the Wrapzone..."',
];

// Terminals for puzzle
let terminals = [];
let terminalsSolved = 0;

// Mamulaus boss
let mamulaus = null;

// ── LOAD LEVEL 2 ASSETS ────────────────────────────────────────
function loadLevel2Assets(cb){
  let loaded = 0;
  const check = () => { if(++loaded >= 3) cb(); };

  // Wrapzone backgrounds
  wrapzoneBgs = {};
  const wBgs = {plx1:'backgrounds/wrapzone/plx1.png', plx2:'backgrounds/wrapzone/plx2.png',
    plx3:'backgrounds/wrapzone/plx3.png', plx4:'backgrounds/wrapzone/plx4.png',
    plx5:'backgrounds/wrapzone/plx5.png'};
  let wn = 0, wtotal = Object.keys(wBgs).length;
  Object.entries(wBgs).forEach(([k,src])=>{
    const img = new Image();
    img.onload = img.onerror = () => { wrapzoneBgs[k]=img; if(++wn===wtotal) check(); };
    img.src = src;
  });

  // Mamulaus
  images.mamulaus = {};
  const mks = Object.keys(MAMULAUS_CFG.anims); let mn=0;
  mks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{ if(++mn===mks.length) check(); };
    img.src=MAMULAUS_CFG.anims[k].src; images.mamulaus[k]=img;
  });

  // Jenny
  images.jenny = {};
  const jks = Object.keys(JENNY_CFG.anims); let jn=0;
  jks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{ if(++jn===jks.length) check(); };
    img.src=JENNY_CFG.anims[k].src; images.jenny[k]=img;
  });
}

// ── START LEVEL 2 ──────────────────────────────────────────────
function startLevel2(){
  currentLevel = 2;
  bullets=[]; enemyBullets=[]; enemies=[]; particles=[];
  chests=[]; floatTexts=[]; shockwaves=[];
  shootTimer=0; sublevel=1; levelComplete=false;
  sublevelTransition=false; bossActive=false;
  bossIntro=false; mamulaus=null; victoryScreen=false;
  noteVisible=false; killCount=0; totalSpawned=0;
  waveTimer=0; waveNumber=0;
  jennyFreed=false; jennyDialogue=false;
  terminals=[]; terminalsSolved=0;
  player.x=180; player.y=CFG.GROUND_Y;
  player.vx=0; player.vy=0; player.facing=1;
  camera.x=0;

  showNote('LEVEL 2 — WRAPZONE NIGHT',
    'The warp has corrupted everything. Robots close in from all sides.',120);

  // Spawn first wave after note
  setTimeout(()=>{ spawnWave(); }, 2500);
}

// ── WAVE SPAWNER (front & back) ────────────────────────────────
function spawnWave(){
  if(killCount >= KILL_TARGET) return;
  waveNumber++;
  const waveSize = Math.min(8, 4 + Math.floor(waveNumber/2));
  const half = Math.ceil(waveSize/2);

  // Spawn from RIGHT (front)
  for(let i=0;i<half;i++){
    const x = player.x + 500 + i*180 + Math.random()*100;
    spawnWarpSoldier(Math.min(x, CFG.LEVEL_W-100), -1);
  }
  // Spawn from LEFT (back)
  for(let i=0;i<waveSize-half;i++){
    const x = player.x - 400 - i*180 - Math.random()*100;
    spawnWarpSoldier(Math.max(x, 100), 1);
  }
  totalSpawned += waveSize;
  floatText(player.x, player.y-100,
    `WAVE ${waveNumber}! ${waveSize} ROBOTS!`,'#ff4444',15);
  shake(4,6);
}

function spawnWarpSoldier(x, facing){
  enemies.push({
    x, y:CFG.GROUND_Y, vx:0, vy:0,
    facing, hp:30, maxHp:30,
    state:'chase',
    anim:{name:'walk', frame:0, timer:0},
    attackCd:0, hurtTimer:0, shootCd:80+Math.random()*40|0,
    dead:false, deathDone:false, deathParticlesDone:false,
    alertRange:9999, attackRange:170, // always chase
    isShadow: waveNumber > 4, // later waves are shadow variants (faster)
  });
}

// ── TERMINALS SPAWN (sublevel 2) ───────────────────────────────
function spawnTerminals(){
  terminals = [
    {x:600,  y:CFG.GROUND_Y, solved:false, active:false,
     sequence:['ArrowLeft','ArrowLeft','ArrowRight'],
     progress:0, inputTimer:0, inputWindow:240,
     failFlash:0, shakeTimer:0, label:'TERMINAL A'},
    {x:1500, y:CFG.GROUND_Y, solved:false, active:false,
     sequence:['ArrowUp','ArrowDown','ArrowUp'],
     progress:0, inputTimer:0, inputWindow:240,
     failFlash:0, shakeTimer:0, label:'TERMINAL B'},
    {x:2600, y:CFG.GROUND_Y, solved:false, active:false,
     sequence:['ArrowUp','ArrowUp','ArrowLeft','ArrowRight'],
     progress:0, inputTimer:0, inputWindow:240,
     failFlash:0, shakeTimer:0, label:'TERMINAL C'},
  ];
  terminalsSolved = 0;
  jennyX = 3200;
  jennyFreed = false;
  jennyDialogue = false;
  enemies = []; // clear any lingering enemies
  // A few guard soldiers near Jenny's cage
  spawnWarpSoldier(900,  -1);
  spawnWarpSoldier(1200,  1);
  spawnWarpSoldier(2000, -1);
  spawnWarpSoldier(2300,  1);
  spawnWarpSoldier(3000, -1);
  showNote('FREE JENNY!',
    'Solve 3 terminals to unlock her cage. Approach each terminal to activate.',160);
}

// ── TERMINAL INPUT ─────────────────────────────────────────────
function handleTerminalInput(code){
  if(currentLevel!==2||sublevel!==2) return;
  for(const t of terminals){
    if(!t.active||t.solved) continue;
    const exp = t.sequence[t.progress];
    if(code===exp){
      t.progress++;
      t.inputTimer=t.inputWindow;
      shake(2,3);
      if(t.progress>=t.sequence.length){
        t.solved=true; t.active=false;
        terminalsSolved++;
        floatText(t.x,t.y-80,`${t.label} SOLVED!`,'#00ff88',14);
        spawnParticles(t.x,t.y-40,'#00ff88',12);
        shake(5,8);
        if(terminalsSolved>=3){
          // All solved — free Jenny!
          setTimeout(()=>{
            jennyFreed=true;
            showNote('JENNY IS FREE!','"Thank you... now listen carefully."',180);
            spawnParticles(jennyX,CFG.GROUND_Y-60,'#ffd166',20,1.5);
            shake(8,15);
            setTimeout(()=>{ jennyDialogue=true; jennyDialogueLine=0; jennyDialogueTimer=200; },2500);
          },1000);
        }
      }
    } else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code)){
      t.progress=0; t.failFlash=60; t.shakeTimer=20;
      floatText(t.x,t.y-80,'WRONG!','#ff4444');
      shake(3,5);
    }
    break;
  }
}

// ── MAMULAUS INIT ──────────────────────────────────────────────
function initMamulaus(){
  bossActive=true; bossIntro=true; bossIntroTimer=200;
  mamulaus={
    x:800, y:CFG.GROUND_Y, vx:0, vy:0, facing:-1,
    hp:150, maxHp:150, phase:1,
    anim:{name:'idle',frame:0,timer:0},
    onGround:true, floatY:0, floatDir:1,
    shootCd:70, attackCd:100,
    shielded:false, shieldCd:260, shieldTimer:0, shieldDur:80,
    stunned:false, stunTimer:0,
    teleportCd:300, teleportWarn:false, teleportWarnTimer:0,
    orbPattern:0, // 0=single, 1=spread, 2=spiral
    dead:false, deathTimer:0, deathDone:false,
  };
}

function updateMamulaus(){
  if(!mamulaus||mamulaus.deathDone) return;
  if(bossIntro){ bossIntroTimer--; if(bossIntroTimer<=0) bossIntro=false; return; }
  if(mamulaus.dead){
    mamulaus.deathTimer++;
    tickAnim(mamulaus.anim,MAMULAUS_CFG.anims);
    if(mamulaus.anim.frame>=6&&mamulaus.anim.name==='death'){
      mamulaus.deathDone=true;
      victoryScreen=true;
      showNote('MAMULAUS DEFEATED!','Jenny: "We are close. Stay strong, Superboy."',999);
      spawnParticles(mamulaus.x,mamulaus.y-80,'#cc44ff',30,2);
      shake(15,30);
    }
    return;
  }

  // Phase 2 at 50%
  if(mamulaus.hp<=mamulaus.maxHp*0.5&&mamulaus.phase===1){
    mamulaus.phase=2;
    showNote('MAMULAUS — PHASE 2!','Magic orbs multiply. Watch the patterns!',130);
    mamulaus.orbPattern=1;
    spawnParticles(mamulaus.x,mamulaus.y-100,'#cc44ff',20,1.5);
    shake(12,25);
  }

  const dx = player.x - mamulaus.x;
  mamulaus.facing = dx>0?-1:1;
  const spd = mamulaus.phase===2?2.8:1.8;

  // Levitation — floats up and down
  mamulaus.floatY += mamulaus.floatDir*0.8;
  if(mamulaus.floatY>18||mamulaus.floatY<-18) mamulaus.floatDir*=-1;

  // Shield mechanic
  if(!mamulaus.shielded&&!mamulaus.stunned){
    mamulaus.shieldCd--;
    if(mamulaus.shieldCd<=0){
      mamulaus.shielded=true; mamulaus.shieldTimer=mamulaus.shieldDur;
      mamulaus.shieldCd=280;
      setAnim(mamulaus.anim,'attack2');
      floatText(mamulaus.x,mamulaus.y-220,'MAGIC SHIELD!','#cc44ff',16);
      shake(4,8);
    }
  }
  if(mamulaus.shielded){
    mamulaus.shieldTimer--;
    if(mamulaus.shieldTimer<=0){
      mamulaus.shielded=false; mamulaus.stunned=true; mamulaus.stunTimer=70;
      setAnim(mamulaus.anim,'hurt');
      floatText(mamulaus.x,mamulaus.y-220,'STUNNED! HIT NOW!','#ffff00',16);
      shake(6,10);
    }
  }
  if(mamulaus.stunned){
    mamulaus.stunTimer--;
    if(mamulaus.stunTimer<=0) mamulaus.stunned=false;
  }

  // Teleport (phase 2)
  if(mamulaus.phase===2&&!mamulaus.teleportWarn&&!mamulaus.shielded){
    mamulaus.teleportCd--;
    if(mamulaus.teleportCd<=0){
      mamulaus.teleportWarn=true; mamulaus.teleportWarnTimer=50;
      mamulaus.teleportCd=280;
      floatText(mamulaus.x,mamulaus.y-220,'WARP!','#cc44ff',16);
    }
  }
  if(mamulaus.teleportWarn){
    mamulaus.teleportWarnTimer--;
    if(mamulaus.teleportWarnTimer<=0){
      mamulaus.teleportWarn=false;
      mamulaus.x = player.x+(dx>0?-220:220);
      mamulaus.x = Math.max(200,Math.min(CFG.LEVEL_W-200,mamulaus.x));
      spawnParticles(mamulaus.x,mamulaus.y-80,'#cc44ff',18);
      shake(5,8);
    }
  }

  // Movement (floats toward player)
  if(!mamulaus.stunned&&!mamulaus.shielded)
    mamulaus.x += dx>0?spd:-spd;
  mamulaus.x = Math.max(180,Math.min(CFG.LEVEL_W-180,mamulaus.x));

  // Shoot magic orbs
  if(!mamulaus.shielded&&!mamulaus.stunned){
    mamulaus.shootCd--;
    if(mamulaus.shootCd<=0){
      mamulaus.shootCd = mamulaus.phase===2?40:65;
      const dir = dx>0?1:-1;
      const oy = mamulaus.y-130+mamulaus.floatY;

      if(mamulaus.orbPattern===0){
        // Single orb
        enemyBullets.push({x:mamulaus.x+dir*50,y:oy,vx:dir*7,vy:0,alive:true,boss:true,orb:true,color:'#cc44ff'});
      } else if(mamulaus.orbPattern===1){
        // 3-way spread
        enemyBullets.push({x:mamulaus.x+dir*50,y:oy,vx:dir*7,vy:0,   alive:true,boss:true,orb:true,color:'#cc44ff'});
        enemyBullets.push({x:mamulaus.x+dir*50,y:oy,vx:dir*6,vy:-2.5,alive:true,boss:true,orb:true,color:'#ff44cc'});
        enemyBullets.push({x:mamulaus.x+dir*50,y:oy,vx:dir*6,vy:2.5, alive:true,boss:true,orb:true,color:'#ff44cc'});
      }
      if(mamulaus.anim.name!=='hurt') setAnim(mamulaus.anim,'attack1');
    }
  }

  // Anim fallback
  if(!['attack1','attack2','hurt','death'].includes(mamulaus.anim.name))
    setAnim(mamulaus.anim,Math.abs(dx)>80?'run':'idle');
  tickAnim(mamulaus.anim,MAMULAUS_CFG.anims);

  // Contact damage
  if(player.invincible===0&&!player.dead){
    if(Math.abs(mamulaus.x-player.x)<60&&Math.abs((mamulaus.y+mamulaus.floatY)-player.y)<130)
      hurtPlayer(mamulaus.stunned?4:12);
  }
}

// ── LEVEL 2 UPDATE ─────────────────────────────────────────────
function updateLevel2(){
  if(sublevel===1){
    updateWaveMode();
  } else if(sublevel===2){
    updatePuzzleMode();
    if(jennyDialogue) updateJennyDialogue();
  } else if(sublevel==='boss'){
    updateMamulaus();
  }
}

function updateWaveMode(){
  if(sublevelTransition) return;

  // Wave spawn timer
  waveTimer++;
  if(waveTimer>=waveInterval&&killCount<KILL_TARGET&&enemies.filter(e=>!e.dead).length<10){
    waveTimer=0;
    waveInterval=Math.max(180,280-waveNumber*15);
    spawnWave();
  }

  // Update enemies
  for(const e of enemies){
    if(e.dead){
      tickAnim(e.anim,SOLDIER_CFG.anims);
      if(e.anim.name==='death'&&e.anim.frame>=SOLDIER_CFG.anims.death.frames-1){
        if(!e.deathParticlesDone){
          e.deathParticlesDone=true;
          spawnParticles(e.x,e.y-50,'#ffaa00',6);
        }
        e.deathDone=true;
      }
      continue;
    }
    const dx=player.x-e.x;
    e.facing=dx>0?1:-1;
    const spd=e.isShadow?2.6:1.9;

    if(e.hurtTimer>0){e.hurtTimer--;setAnim(e.anim,'hurt');}
    else if(Math.abs(dx)<e.attackRange){
      e.vx=0;setAnim(e.anim,'attack');
      if(e.shootCd>0)e.shootCd--;
      else{
        e.shootCd=e.isShadow?65:90;
        enemyBullets.push({x:e.x+e.facing*20,y:e.y-55,vx:e.facing*7,vy:0,alive:true,boss:false});
      }
    } else {
      e.vx=e.facing*spd;setAnim(e.anim,'walk');
    }
    e.x+=e.vx;
    e.x=Math.max(50,Math.min(CFG.LEVEL_W-50,e.x));
    tickAnim(e.anim,SOLDIER_CFG.anims);

    if(player.invincible===0&&!player.dead){
      if(Math.abs(e.x-player.x)<32&&Math.abs(e.y-player.y)<80) hurtPlayer(8);
    }
  }

  // Check wave completion
  if(killCount>=KILL_TARGET&&!levelComplete){
    levelComplete=true;
    sublevelTransition=true;
    showNote('50 ROBOTS DOWN!','Pushing forward into the Wrapzone...',150);
    setTimeout(()=>{
      sublevel=2;sublevelTransition=false;levelComplete=false;
      spawnTerminals();
    },3000);
  }
}

function updatePuzzleMode(){
  if(sublevelTransition) return;

  // Update guard enemies
  for(const e of enemies){
    if(e.dead){
      tickAnim(e.anim,SOLDIER_CFG.anims);
      if(e.anim.name==='death'&&e.anim.frame>=SOLDIER_CFG.anims.death.frames-1)e.deathDone=true;
      continue;
    }
    const dx=player.x-e.x;
    e.facing=dx>0?1:-1;
    if(e.hurtTimer>0){e.hurtTimer--;setAnim(e.anim,'hurt');}
    else if(Math.abs(dx)<170){e.vx=0;setAnim(e.anim,'attack');
      if(e.shootCd>0)e.shootCd--;
      else{e.shootCd=90;enemyBullets.push({x:e.x+e.facing*20,y:e.y-55,vx:e.facing*6,vy:0,alive:true,boss:false});}
    } else {e.vx=e.facing*2;setAnim(e.anim,'walk');}
    e.x+=e.vx;
    tickAnim(e.anim,SOLDIER_CFG.anims);
    if(player.invincible===0&&!player.dead){
      if(Math.abs(e.x-player.x)<32&&Math.abs(e.y-player.y)<80) hurtPlayer(8);
    }
  }

  // Update terminals
  for(const t of terminals){
    if(t.solved) continue;
    const dist=Math.abs(player.x-t.x);
    if(dist<120&&!t.active&&!t.solved){t.active=true;t.progress=0;t.inputTimer=t.inputWindow;}
    if(t.active){
      t.inputTimer--;
      if(t.inputTimer<=0){t.active=false;t.progress=0;t.failFlash=60;t.shakeTimer=20;
        floatText(t.x,t.y-80,'TIMEOUT!','#ff8800');}
    }
    if(t.shakeTimer>0)t.shakeTimer--;
    if(t.failFlash>0)t.failFlash--;
  }

  // Trigger boss after jenny dialogue ends
  if(jennyFreed&&!jennyDialogue&&jennyDialogueLine>=JENNY_LINES.length&&!bossActive&&!levelComplete){
    levelComplete=true;
    sublevelTransition=true;
    setTimeout(()=>{
      sublevel='boss';sublevelTransition=false;initMamulaus();
    },1500);
  }
}

function updateJennyDialogue(){
  jennyDialogueTimer--;
  tickAnim(jennyAnim,JENNY_CFG.anims);
  if(jennyDialogueTimer<=0){
    jennyDialogueLine++;
    jennyDialogueTimer=200;
    if(jennyDialogueLine>=JENNY_LINES.length){
      jennyDialogue=false;
      showNote('MAMULAUS APPROACHES!','"The Warpzone guardian. Kill it!"',150);
    }
  }
}

// ── LEVEL 2 BULLET HITS ────────────────────────────────────────
function updateBulletsL2(){
  for(const b of bullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}

    // Hit Mamulaus
    if(bossActive&&mamulaus&&!mamulaus.dead){
      if(Math.abs(b.x-mamulaus.x)<80&&Math.abs(b.y-(mamulaus.y+mamulaus.floatY-125))<100){
        if(mamulaus.shielded){
          b.alive=false;
          spawnParticles(mamulaus.x,mamulaus.y-130,'#cc44ff',4);
          floatText(mamulaus.x,mamulaus.y-200,'BLOCKED!','#cc44ff',12);
        } else {
          const dmg=mamulaus.stunned?22:10;
          mamulaus.hp-=dmg;b.alive=false;
          spawnParticles(mamulaus.x,mamulaus.y-130,'#cc44ff',5);
          floatText(mamulaus.x,mamulaus.y-200,mamulaus.stunned?`-${dmg} BONUS!`:`-${dmg}`,'#ff44ff',12);
          player.score+=dmg;shake(3,5);
          if(!mamulaus.stunned)setAnim(mamulaus.anim,'hurt');
          if(mamulaus.hp<=0){mamulaus.hp=0;mamulaus.dead=true;setAnim(mamulaus.anim,'death');}
        }
        continue;
      }
    }

    // Hit enemies
    for(const e of enemies){
      if(e.dead)continue;
      if(Math.abs(b.x-e.x)<28&&Math.abs(b.y-(e.y-55))<45){
        e.hp-=10;b.alive=false;
        spawnParticles(e.x,e.y-55,'#ff5522',4);
        if(e.hp<=0){
          e.dead=true;setAnim(e.anim,'death');
          if(sublevel===1){
            killCount++;player.score+=150;
            floatText(e.x,e.y-90,'+150','#ffd166');
            shake(2,3);
          } else {
            player.score+=100;floatText(e.x,e.y-90,'+100','#ffd166');
          }
        } else {setAnim(e.anim,'hurt');e.hurtTimer=18;}
        break;
      }
    }
  }
  bullets=bullets.filter(b=>b.alive);

  for(const b of enemyBullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(player.invincible===0&&!player.dead){
      if(Math.abs(b.x-player.x)<22&&Math.abs(b.y-(player.y-50))<42){
        b.alive=false;hurtPlayer(b.boss?10:6);
      }
    }
  }
  enemyBullets=enemyBullets.filter(b=>b.alive);
}

// ── DRAW WRAPZONE BACKGROUND ───────────────────────────────────
function drawWrapzoneBackground(){
  const W=CFG.CANVAS_W,H=CFG.CANVAS_H,GY=CFG.GROUND_Y;

  // Night sky
  const sky=ctx.createLinearGradient(0,0,0,GY);
  sky.addColorStop(0,'#05050f');sky.addColorStop(0.5,'#0a0a20');sky.addColorStop(1,'#151530');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

  // Stars
  for(let i=0;i<80;i++){
    const sx=((i*137+frameCount*0.02)%W);
    const sy=((i*79)%(GY-40));
    const br=Math.sin(frameCount*0.05+i)*0.4+0.6;
    ctx.globalAlpha=br*0.8;
    ctx.fillStyle='#ffffff';
    ctx.fillRect(sx,sy,1.5,1.5);
  }
  ctx.globalAlpha=1;

  // Parallax layers
  const layers=[
    {key:'plx1',spd:0.04,tint:'rgba(30,0,60,0.3)'},
    {key:'plx2',spd:0.1, tint:'rgba(20,0,40,0.2)'},
    {key:'plx3',spd:0.2, tint:'rgba(10,0,30,0.1)'},
    {key:'plx4',spd:0.4, tint:null},
    {key:'plx5',spd:0.7, tint:null},
  ];
  for(const {key,spd,tint} of layers){
    const img=wrapzoneBgs[key];
    if(!img||!img.naturalWidth) continue;
    const pw=img.width,ph=img.height;
    const px=(camera.x*spd)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)
      ctx.drawImage(img,ox,GY-ph,pw,ph);
    if(tint){ctx.fillStyle=tint;ctx.fillRect(0,GY-300,W,300);}
  }

  // Ground
  ctx.fillStyle='#0a0a1a';ctx.fillRect(0,GY,W,H-GY);
  ctx.fillStyle='#1a0a3a';ctx.fillRect(0,GY,W,8);
  ctx.fillStyle='#2a1050';ctx.fillRect(0,GY,W,3);

  // Warp effect: purple glow lines
  if(frameCount%3===0){
    ctx.strokeStyle=`rgba(150,50,255,${Math.random()*0.15})`;
    ctx.lineWidth=1;
    for(let i=0;i<3;i++){
      const lx=Math.random()*W;
      ctx.beginPath();ctx.moveTo(lx,0);ctx.lineTo(lx+Math.random()*40-20,H);ctx.stroke();
    }
  }

  // Night overlay
  ctx.fillStyle='rgba(0,0,20,0.25)';ctx.fillRect(0,0,W,H);
}

// ── DRAW TERMINALS ─────────────────────────────────────────────
function drawTerminals(){
  for(const t of terminals){
    if(t.solved){
      // Solved terminal — green glow
      const sx=t.x-camera.x;
      ctx.save();ctx.shadowColor='#00ff88';ctx.shadowBlur=20;
      ctx.fillStyle='#004400';ctx.fillRect(sx-20,t.y-70,40,70);
      ctx.fillStyle='#00ff88';ctx.fillRect(sx-20,t.y-75,40,8);
      ctx.restore();
      ctx.fillStyle='#00ff88';ctx.font='bold 16px monospace';ctx.textAlign='center';
      ctx.fillText('✓',sx,t.y-38);ctx.textAlign='left';
      continue;
    }

    const sx=t.x-camera.x+(t.shakeTimer>0?(Math.random()*6-3):0);
    const pulse=Math.sin(frameCount*0.08)*0.4+0.6;

    ctx.save();
    ctx.shadowColor='#9933ff';ctx.shadowBlur=15*pulse;
    ctx.fillStyle='#1a0033';ctx.fillRect(sx-22,t.y-75,44,75);
    ctx.fillStyle='#330066';ctx.fillRect(sx-22,t.y-80,44,8);
    ctx.restore();

    // Screen
    ctx.fillStyle='rgba(100,0,200,0.5)';ctx.fillRect(sx-16,t.y-68,32,30);
    ctx.fillStyle='#cc44ff';ctx.font='bold 9px monospace';ctx.textAlign='center';
    ctx.fillText(t.label,sx,t.y-52);

    // Prompt when active
    if(t.active&&!t.solved){
      ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(sx-80,t.y-145,160,65);
      ctx.strokeStyle='#9933ff';ctx.lineWidth=1.5;ctx.strokeRect(sx-80,t.y-145,160,65);
      ctx.fillStyle='#cc44ff';ctx.font='bold 9px monospace';
      ctx.fillText('ENTER SEQUENCE:',sx,t.y-130);
      const arrows={'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓'};
      const sym=t.sequence.map(k=>arrows[k]||k);
      ctx.font='bold 18px monospace';
      sym.forEach((s,i)=>{
        ctx.fillStyle=i<t.progress?'#00ff88':i===t.progress?'#ffff00':'#555';
        ctx.fillText(s,sx-((sym.length-1)*14)+i*28,t.y-108);
      });
      // Timer bar
      ctx.fillStyle='#222';ctx.fillRect(sx-60,t.y-97,120,7);
      const tc=t.inputTimer/t.inputWindow;
      ctx.fillStyle=tc>0.4?'#9933ff':'#ff6600';
      ctx.fillRect(sx-60,t.y-97,120*tc,7);
    }

    if(t.failFlash>0){ctx.fillStyle=`rgba(255,0,0,${t.failFlash/60*0.35})`;ctx.fillRect(sx-26,t.y-82,52,82);}

    // Label
    ctx.fillStyle='#cc44ff';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText(t.label,sx,t.y+14);
    ctx.textAlign='left';
  }
}

// ── DRAW JENNY ─────────────────────────────────────────────────
function drawJenny(){
  const sx=jennyX-camera.x;
  if(sx<-120||sx>CFG.CANVAS_W+120) return;

  if(!jennyFreed){
    // Draw cage
    ctx.save();
    ctx.strokeStyle='rgba(150,50,255,0.9)';ctx.lineWidth=3;
    // Vertical bars
    for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(sx+i*12,CFG.GROUND_Y-120);ctx.lineTo(sx+i*12,CFG.GROUND_Y);ctx.stroke();}
    // Horizontal bars
    ctx.strokeStyle='rgba(100,30,200,0.7)';ctx.lineWidth=2;
    for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(sx-36,CFG.GROUND_Y-30*i-30);ctx.lineTo(sx+36,CFG.GROUND_Y-30*i-30);ctx.stroke();}
    // Glow
    ctx.shadowColor='#cc44ff';ctx.shadowBlur=25;
    ctx.strokeStyle='rgba(200,100,255,0.5)';ctx.lineWidth=6;
    ctx.strokeRect(sx-36,CFG.GROUND_Y-120,72,120);
    ctx.restore();

    // Jenny sprite in cage
    tickAnim(jennyAnim,JENNY_CFG.anims);
  } else {
    setAnim(jennyAnim,'idle');
    tickAnim(jennyAnim,JENNY_CFG.anims);
  }

  // Draw Jenny
  const img=images.jenny?.[jennyAnim.name];
  const dw=JENNY_CFG.frameW*JENNY_CFG.scale,dh=JENNY_CFG.frameH*JENNY_CFG.scale;
  ctx.save();ctx.translate(sx,CFG.GROUND_Y);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,jennyAnim.frame*JENNY_CFG.frameW,0,JENNY_CFG.frameW,JENNY_CFG.frameH,-dw/2,-118,dw,dh);
  else{
    ctx.fillStyle='#ff74c6';ctx.fillRect(-16,-70,32,70);
    ctx.fillStyle='#ffddee';ctx.fillRect(-10,-82,20,14);
  }
  ctx.restore();

  // Dialogue bubble
  if(jennyDialogue&&jennyDialogueLine<JENNY_LINES.length){
    const line=JENNY_LINES[jennyDialogueLine];
    const bw=Math.max(260,line.length*8+40);
    ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(sx-bw/2,CFG.GROUND_Y-160,bw,52);
    ctx.strokeStyle='#ff74c6';ctx.lineWidth=2;ctx.strokeRect(sx-bw/2,CFG.GROUND_Y-160,bw,52);
    ctx.fillStyle='#ff74c6';ctx.font='bold 9px monospace';ctx.textAlign='center';
    ctx.fillText('JENNY',sx,CFG.GROUND_Y-144);
    ctx.fillStyle='#ffffff';ctx.font='10px monospace';
    ctx.fillText(line,sx,CFG.GROUND_Y-122);
    // Progress dots
    for(let i=0;i<JENNY_LINES.length;i++){
      ctx.fillStyle=i<=jennyDialogueLine?'#ff74c6':'#333';
      ctx.beginPath();ctx.arc(sx-20+i*10,CFG.GROUND_Y-114,3,0,Math.PI*2);ctx.fill();
    }
    ctx.textAlign='left';
  }
}

// ── DRAW MAMULAUS ──────────────────────────────────────────────
function drawMamulaus(){
  if(!mamulaus||mamulaus.deathDone) return;
  const sx=mamulaus.x-camera.x;
  const sy=mamulaus.y+mamulaus.floatY;
  const SCALE=1.5;
  const dw=250*SCALE,dh=250*SCALE;
  const img=images.mamulaus?.[mamulaus.anim.name];

  ctx.save();
  if(mamulaus.shielded){ctx.shadowColor='#cc44ff';ctx.shadowBlur=40;}
  else if(mamulaus.stunned){ctx.shadowColor='#ffff00';ctx.shadowBlur=25;}
  else if(mamulaus.phase===2){ctx.shadowColor='#ff00cc';ctx.shadowBlur=20;}
  ctx.translate(sx,sy);
  if(mamulaus.facing>0)ctx.scale(-1,1);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,mamulaus.anim.frame*250,0,250,250,-dw/2,-250,dw,dh);
  else{
    ctx.fillStyle='#440088';ctx.fillRect(-50,-dh,100,dh);
    ctx.fillStyle='#cc44ff';ctx.fillRect(-30,-dh-20,60,22);
  }
  ctx.restore();

  // Shield ring
  if(mamulaus.shielded){
    const pulse=Math.sin(frameCount*0.15)*15;
    ctx.save();ctx.strokeStyle='rgba(200,100,255,0.7)';ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(sx,sy-dh*0.5,90+pulse,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  if(mamulaus.stunned&&frameCount%8<4){
    ctx.fillStyle='#ffff00';ctx.font='18px monospace';ctx.textAlign='center';
    ctx.fillText('★★★',sx,sy-dh-8);ctx.textAlign='left';
  }

  // Boss HP bar
  const bx=160,by=20,bw=640,bh=22;
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(bx-6,by-6,bw+12,bh+12);
  ctx.strokeStyle='#cc44ff';ctx.lineWidth=2;ctx.strokeRect(bx-6,by-6,bw+12,bh+12);
  ctx.fillStyle='#1a0033';ctx.fillRect(bx,by,bw,bh);
  const pct=mamulaus.hp/mamulaus.maxHp;
  ctx.fillStyle=pct>0.5?'#cc44ff':pct>0.25?'#ff44ff':'#ff88ff';
  ctx.fillRect(bx,by,bw*pct,bh);
  if(mamulaus.shielded){ctx.fillStyle='rgba(200,150,255,0.4)';ctx.fillRect(bx,by,bw,bh);}
  ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';
  const ms=mamulaus.shielded?'🛡 SHIELDED':mamulaus.stunned?'⚡ STUNNED!':mamulaus.phase===2?'⚠ PHASE 2':'';
  ctx.fillText(`MAMULAUS  ${mamulaus.hp}/${mamulaus.maxHp}  ${ms}`,bx+bw/2,by+16);
  ctx.textAlign='left';
}

// ── DRAW KILL COUNTER (sublevel 1 only) ────────────────────────
function drawKillCounter(){
  if(currentLevel!==2||sublevel!==1) return;
  const pct=killCount/KILL_TARGET;
  const bx=CFG.CANVAS_W-260,by=8,bw=248,bh=18;
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(bx-4,by-4,bw+8,bh+26);
  ctx.strokeStyle='#ff4444';ctx.lineWidth=1.5;ctx.strokeRect(bx-4,by-4,bw+8,bh+26);
  ctx.fillStyle='#222';ctx.fillRect(bx,by,bw,bh);
  ctx.fillStyle=pct<0.5?'#ff4444':pct<0.8?'#ff8800':'#00ff88';
  ctx.fillRect(bx,by,bw*pct,bh);
  ctx.fillStyle='#fff';ctx.font='bold 10px monospace';ctx.textAlign='center';
  ctx.fillText(`ROBOTS KILLED: ${killCount} / ${KILL_TARGET}`,bx+bw/2,by+13);
  if(enemies.filter(e=>!e.dead).length===0&&killCount<KILL_TARGET){
    if(frameCount%30<15){ctx.fillStyle='#ffff00';ctx.font='bold 10px monospace';
    ctx.fillText('MORE INCOMING...',bx+bw/2,by+27);}
  }
  ctx.textAlign='left';
}

// ── DRAW BOSS INTRO (mamulaus) ─────────────────────────────────
function drawMamulausIntro(){
  if(!bossIntro||!mamulaus) return;
  const a=Math.min(1,bossIntroTimer/60)*0.88;
  ctx.fillStyle=`rgba(0,0,20,${a})`;ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  ctx.save();ctx.shadowColor='#cc44ff';ctx.shadowBlur=40;
  ctx.fillStyle=`rgba(200,80,255,${a})`;ctx.font='bold 50px monospace';ctx.textAlign='center';
  ctx.fillText('MAMULAUS',CFG.CANVAS_W/2,CFG.CANVAS_H/2-25);
  ctx.restore();
  ctx.fillStyle=`rgba(220,180,255,${a})`;ctx.font='14px monospace';ctx.textAlign='center';
  ctx.fillText('Guardian of the Wrapzone — Master of Dark Magic',CFG.CANVAS_W/2,CFG.CANVAS_H/2+15);
  ctx.fillStyle=`rgba(160,200,255,${a})`;ctx.font='11px monospace';
  ctx.fillText('🛡 Stop shooting when shielded  •  ⚡ Hit when stunned  •  🌀 Watch orb patterns!',CFG.CANVAS_W/2,CFG.CANVAS_H/2+42);
  ctx.textAlign='left';
}

// ── PATCH KEYBOARD FOR TERMINAL INPUT ─────────────────────────
const _origKeyHandler = window.onkeydown;
document.addEventListener('keydown', e => handleTerminalInput(e.code));

// ═══════════════════════════════════════════════════════════════
//  LEVEL 3 — FAULTMINE NIGHT
//  Jenny guides by phone call. Chests need her secret codes.
//  Boss: Avera — Dark Mode fight.
// ═══════════════════════════════════════════════════════════════

const AVERA_CFG = {
  frameW:96, frameH:84, scale:2.6,
  anims:{
    idle:    {src:'sprites/avera/idle.png',     frames:7,  fps:7},
    walk:    {src:'sprites/avera/walk.png',     frames:8,  fps:10},
    run:     {src:'sprites/avera/run.png',      frames:8,  fps:13},
    attack1: {src:'sprites/avera/attack_1.png', frames:6,  fps:14, loop:false},
    attack2: {src:'sprites/avera/attack_2.png', frames:5,  fps:14, loop:false},
    attack3: {src:'sprites/avera/attack_3.png', frames:6,  fps:14, loop:false},
    defend:  {src:'sprites/avera/defend.png',   frames:6,  fps:8},
    jump:    {src:'sprites/avera/jump.png',     frames:5,  fps:8},
    hurt:    {src:'sprites/avera/hurt.png',     frames:4,  fps:10, loop:false},
    death:   {src:'sprites/avera/death.png',    frames:12, fps:8,  loop:false},
  }
};

// ── LEVEL 3 STATE ──────────────────────────────────────────────
let avera         = null;
let phoneCall     = {active:false, timer:0, duration:280, answered:false, ringing:false, ringTimer:0};
let activeCode    = null;   // current chest code jenny is giving
let codeMemory    = {};     // chestId -> code jenny gave
let darkMode      = false;  // boss fight darkness
let lightRadius   = 200;    // player light circle radius
let flashTimer    = 0;      // brief flash on boss attack

const JENNY_CODES = [
  // sublevel 1 codes
  { id:'3a', label:'CHEST 1', sequence:['ArrowUp','ArrowLeft','ArrowUp'],     hint:'UP  LEFT  UP'  },
  { id:'3b', label:'CHEST 2', sequence:['ArrowDown','ArrowRight','ArrowDown'],hint:'DOWN  RIGHT  DOWN'},
  // sublevel 2 codes
  { id:'3c', label:'CHEST 3', sequence:['ArrowLeft','ArrowUp','ArrowRight'],  hint:'LEFT  UP  RIGHT'},
  { id:'3d', label:'CHEST 4', sequence:['ArrowUp','ArrowUp','ArrowDown'],     hint:'UP  UP  DOWN'   },
];

let l3ChestCode   = {};  // chestId -> {solved,locked,active,progress,...}
let l3JennyCalls  = [];  // queue of calls to make

// ── LOAD LEVEL 3 ASSETS ────────────────────────────────────────
function loadLevel3Assets(cb){
  images.avera = {};
  const ks = Object.keys(AVERA_CFG.anims); let n=0;
  ks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{ if(++n===ks.length) cb(); };
    img.src=AVERA_CFG.anims[k].src; images.avera[k]=img;
  });
}

// ── START LEVEL 3 ──────────────────────────────────────────────
function startLevel3(){
  currentLevel=3;
  bullets=[];enemyBullets=[];enemies=[];particles=[];
  chests=[];floatTexts=[];shockwaves=[];
  shootTimer=0;sublevel=1;levelComplete=false;
  sublevelTransition=false;bossActive=false;
  avera=null;victoryScreen=false;noteVisible=false;
  darkMode=false;flashTimer=0;
  phoneCall={active:false,timer:0,duration:280,answered:false,ringing:false,ringTimer:0};
  activeCode=null;codeMemory={};l3ChestCode={};l3JennyCalls=[];
  player.x=180;player.y=CFG.GROUND_Y;
  player.vx=0;player.vy=0;player.facing=1;
  camera.x=0;
  spawnLevel3Sub(1);
}

// ── SPAWN L3 SUBLEVEL ──────────────────────────────────────────
function spawnLevel3Sub(lvl){
  sublevel=lvl; enemies=[]; bullets=[]; enemyBullets=[];
  levelComplete=false; sublevelTransition=false;

  if(lvl===1){
    // Mixed enemies — soldiers + orc-style heavies
    [600,900,1300,1600,2000,2400,2800].forEach((x,i)=> spawnL3Enemy(x, i%2===0?-1:1, i>4));
    // 2 locked chests — Jenny will call to give codes
    spawnL3Chest('3a', 1000);
    spawnL3Chest('3b', 2500);
    // Schedule Jenny calls
    l3JennyCalls = [
      {delay:180, codeId:'3a'},
      {delay:1200, codeId:'3b'},
    ];
    showNote('LEVEL 3 — FAULTMINE NIGHT','"I will call you with the codes. Answer me."  — Jenny',140);

  } else if(lvl===2){
    [500,800,1100,1500,1900,2200,2600,3000].forEach((x,i)=> spawnL3Enemy(x, i%2===0?-1:1, i>5));
    spawnL3Chest('3c', 900);
    spawnL3Chest('3d', 2200);
    l3JennyCalls = [
      {delay:160, codeId:'3c'},
      {delay:1100, codeId:'3d'},
    ];
    showNote('STAGE 3-2','"Stay sharp. More guards ahead. I will call again."',120);
  }
}

function spawnL3Enemy(x, facing, heavy=false){
  enemies.push({
    x,y:CFG.GROUND_Y,vx:0,vy:0,facing,
    hp: heavy?60:35, maxHp: heavy?60:35,
    heavy,
    state:'patrol',
    anim:{name:'walk',frame:0,timer:0},
    attackCd:0,hurtTimer:0,
    shootCd:heavy?60:90,
    dead:false,deathDone:false,deathParticlesDone:false,
    alertRange:320,attackRange:180,
  });
}

function spawnL3Chest(id, x){
  const codeInfo = JENNY_CODES.find(c=>c.id===id);
  l3ChestCode[id]={
    id,x,y:CFG.GROUND_Y,
    open:false,locked:false,
    codeRevealed:false,        // jenny told us the code
    sequence: codeInfo.sequence,
    hint: codeInfo.hint,
    label: codeInfo.label,
    progress:0,active:false,
    inputTimer:0,inputWindow:280,
    failFlash:0,shakeTimer:0,
    bobTimer:Math.random()*Math.PI*2,
  };
}

// ── PHONE CALL SYSTEM ──────────────────────────────────────────
function triggerJennyCall(codeId){
  activeCode = JENNY_CODES.find(c=>c.id===codeId);
  phoneCall.ringing=true; phoneCall.ringTimer=80;
  phoneCall.answered=false; phoneCall.active=false;
  floatText(player.x,player.y-120,'📞 JENNY IS CALLING...','#ff74c6',14);
  shake(2,4);
}

function answerCall(){
  if(!phoneCall.ringing||phoneCall.answered) return;
  phoneCall.ringing=false;phoneCall.active=true;
  phoneCall.answered=true;phoneCall.timer=phoneCall.duration;
  if(activeCode && l3ChestCode[activeCode.id]){
    l3ChestCode[activeCode.id].codeRevealed=true;
    codeMemory[activeCode.id]=true;
  }
  shake(2,3);
}

function updatePhoneCall(){
  // Schedule queued calls
  if(l3JennyCalls.length>0&&!phoneCall.ringing&&!phoneCall.active){
    l3JennyCalls[0].delay--;
    if(l3JennyCalls[0].delay<=0){
      const call=l3JennyCalls.shift();
      triggerJennyCall(call.codeId);
    }
  }

  // Ring
  if(phoneCall.ringing){
    phoneCall.ringTimer--;
    if(frameCount%30<15) floatText(player.x,player.y-100,'📞','#ff74c6',22);
    if(pressed('KeyE')||pressed('Enter')) answerCall();
    if(phoneCall.ringTimer<=0){
      // Missed call
      phoneCall.ringing=false;
      floatText(player.x,player.y-100,'CALL MISSED! Jenny will retry...','#ff8800',12);
      // Re-queue after delay
      if(activeCode) l3JennyCalls.unshift({delay:300,codeId:activeCode.id});
    }
  }

  // Active call
  if(phoneCall.active){
    phoneCall.timer--;
    if(phoneCall.timer<=0){
      phoneCall.active=false; activeCode=null;
    }
  }
}

// ── L3 CHEST INPUT ─────────────────────────────────────────────
function handleL3ChestInput(code){
  if(currentLevel!==3) return;
  for(const id in l3ChestCode){
    const ch=l3ChestCode[id];
    if(!ch.active||ch.open||ch.locked||!ch.codeRevealed) continue;
    const exp=ch.sequence[ch.progress];
    if(code===exp){
      ch.progress++;ch.inputTimer=ch.inputWindow;shake(2,3);
      if(ch.progress>=ch.sequence.length){
        ch.open=true;ch.active=false;
        player.hasGun=true;player.ammo=Math.min(player.ammo+40,99);
        floatText(ch.x,ch.y-60,'CHEST OPEN! +40 AMMO','#ffd166',15);
        spawnParticles(ch.x,ch.y-20,'#ffd166',14);shake(5,8);
      }
    } else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code)){
      ch.progress=0;ch.locked=true;ch.active=false;
      ch.failFlash=70;ch.shakeTimer=22;
      floatText(ch.x,ch.y-60,'WRONG CODE!','#ff4444',14);
      spawnParticles(ch.x,ch.y-20,'#ff4444',8);shake(4,7);
    }
    break;
  }
}

// ── L3 CHEST UPDATE ────────────────────────────────────────────
function updateL3Chests(){
  for(const id in l3ChestCode){
    const ch=l3ChestCode[id];
    ch.bobTimer+=0.06;
    if(ch.open) continue;
    const dist=Math.abs(player.x-ch.x);

    // Only allow interaction if Jenny revealed the code
    if(dist<110&&ch.codeRevealed&&!ch.active&&!ch.locked&&!ch.open){
      ch.active=true;ch.progress=0;ch.inputTimer=ch.inputWindow;
    } else if(dist<110&&!ch.codeRevealed){
      floatText(ch.x,ch.y-50,'Wait for Jenny\'s call!','#ff74c6',10);
    }
    if(ch.active){
      ch.inputTimer--;
      if(ch.inputTimer<=0){
        ch.locked=true;ch.active=false;ch.failFlash=70;ch.shakeTimer=22;
        floatText(ch.x,ch.y-60,'TOO SLOW!','#ff8800');shake(3,5);
      }
    }
    if(ch.shakeTimer>0)ch.shakeTimer--;
    if(ch.failFlash>0)ch.failFlash--;
  }
}

// ── AVERA BOSS INIT ────────────────────────────────────────────
function initAvera(){
  bossActive=true;bossIntro=true;bossIntroTimer=220;
  darkMode=true;lightRadius=220;
  avera={
    x:750,y:CFG.GROUND_Y,vx:0,vy:0,facing:-1,
    hp:180,maxHp:180,phase:1,
    anim:{name:'idle',frame:0,timer:0},
    onGround:true,
    // Attack pattern
    attackCd:90,attackPhase:0,
    shootCd:60,
    // Defend mechanic
    defending:false,defendTimer:0,defendCd:240,
    // Dash attack
    dashing:false,dashTimer:0,dashCd:300,dashWarn:false,dashWarnTimer:0,
    // Shadow jump (phase 2)
    shadowJumping:false,shadowJumpCd:250,
    dead:false,deathTimer:0,deathDone:false,
  };
}

function updateAvera(){
  if(!avera||avera.deathDone) return;
  if(bossIntro){bossIntroTimer--;if(bossIntroTimer<=0)bossIntro=false;return;}
  if(avera.dead){
    avera.deathTimer++;
    tickAnim(avera.anim,AVERA_CFG.anims);
    if(avera.anim.frame>=11&&avera.anim.name==='death'){
      avera.deathDone=true;
      darkMode=false;
      victoryScreen=true;
      showNote('AVERA DEFEATED!','"The shadows can\'t hide the truth. We press on." — Jenny',999);
      spawnParticles(avera.x,avera.y-80,'#6688ff',30,2);shake(15,30);
    }
    return;
  }

  // Phase 2 at 50%
  if(avera.hp<=avera.maxHp*0.5&&avera.phase===1){
    avera.phase=2;
    lightRadius=130; // smaller light! harder to see
    showNote('⚠ AVERA — PHASE 2!','The darkness thickens. She moves faster!',130);
    spawnParticles(avera.x,avera.y-80,'#334488',20,1.5);shake(12,25);
  }

  // Light flicker in dark mode
  lightRadius+=(Math.random()-0.5)*4;
  lightRadius=Math.max(avera.phase===2?100:180,Math.min(avera.phase===2?160:240,lightRadius));

  const dx=player.x-avera.x;
  avera.facing=dx>0?-1:1;
  const spd=avera.phase===2?3.5:2.2;

  // ── DEFEND (tricky: player must stop and wait)
  if(!avera.defending&&!avera.dashing){
    avera.defendCd--;
    if(avera.defendCd<=0){
      avera.defending=true;avera.defendTimer=avera.phase===2?60:80;
      avera.defendCd=avera.phase===2?180:260;
      setAnim(avera.anim,'defend');
      floatText(avera.x,avera.y-200,'DEFENDING! WAIT...','#6688ff',16);
      flashTimer=15;
    }
  }
  if(avera.defending){
    avera.defendTimer--;avera.vx=0;
    if(avera.defendTimer<=0){
      avera.defending=false;
      // After defend ends — Avera does a quick attack burst
      floatText(avera.x,avera.y-200,'ATTACK NOW!','#ffff00',14);
    }
  }

  // ── DASH ATTACK (telegraphed)
  if(!avera.dashing&&!avera.defending&&!avera.dashWarn){
    avera.dashCd--;
    if(avera.dashCd<=0){
      avera.dashWarn=true;avera.dashWarnTimer=50;avera.dashCd=avera.phase===2?220:320;
      floatText(avera.x,avera.y-200,'DASH ATTACK!','#ff8800',15);
      flashTimer=20;
    }
  }
  if(avera.dashWarn){
    avera.dashWarnTimer--;avera.vx=0;
    if(avera.dashWarnTimer<=0){
      avera.dashWarn=false;avera.dashing=true;avera.dashTimer=20;
      setAnim(avera.anim,'run');
      spawnParticles(avera.x,avera.y-50,'#334488',10);
    }
  }
  if(avera.dashing){
    avera.dashTimer--;
    avera.x+=dx>0?22:-22;
    if(avera.dashTimer<=0){avera.dashing=false;setAnim(avera.anim,'idle');}
    // Dash hit
    if(player.invincible===0&&!player.dead&&Math.abs(avera.x-player.x)<45&&Math.abs(avera.y-player.y)<100){
      hurtPlayer(18);flashTimer=25;
    }
  }

  // ── SHADOW JUMP (phase 2): vanishes and reappears near player)
  if(avera.phase===2&&!avera.shadowJumping&&!avera.dashing&&!avera.defending){
    avera.shadowJumpCd--;
    if(avera.shadowJumpCd<=0){
      avera.shadowJumping=true;avera.shadowJumpCd=260;
      // Vanish then reappear
      spawnParticles(avera.x,avera.y-60,'#001133',16);
      floatText(avera.x,avera.y-200,'SHADOW STEP!','#334488',15);
      setTimeout(()=>{
        if(avera&&!avera.dead){
          avera.x=player.x+(dx>0?-160:160);
          avera.x=Math.max(200,Math.min(CFG.LEVEL_W-200,avera.x));
          avera.shadowJumping=false;
          spawnParticles(avera.x,avera.y-60,'#334488',16);
          flashTimer=20;
        }
      },500);
    }
  }

  // Normal movement
  if(!avera.defending&&!avera.dashing&&!avera.shadowJumping){
    avera.x+=dx>0?spd:-spd;
  }
  avera.x=Math.max(150,Math.min(CFG.LEVEL_W-150,avera.x));

  // Shoot dark projectiles
  if(!avera.defending){
    avera.shootCd--;
    if(avera.shootCd<=0){
      avera.shootCd=avera.phase===2?40:65;
      const dir=dx>0?1:-1;
      const oy=avera.y-80;
      enemyBullets.push({x:avera.x+dir*40,y:oy,vx:dir*8,vy:0,alive:true,boss:true,dark:true});
      if(avera.phase===2){
        enemyBullets.push({x:avera.x+dir*40,y:oy,vx:dir*7,vy:-2.5,alive:true,boss:true,dark:true});
        enemyBullets.push({x:avera.x+dir*40,y:oy,vx:dir*7,vy:2.5,alive:true,boss:true,dark:true});
      }
      if(!avera.defending){
        const atk=['attack1','attack2','attack3'][avera.attackPhase%3];
        setAnim(avera.anim,atk); avera.attackPhase++;
      }
    }
  }

  // Anim fallback
  if(!['attack1','attack2','attack3','defend','hurt','death','run'].includes(avera.anim.name))
    setAnim(avera.anim,Math.abs(avera.x-player.x)>80?'walk':'idle');

  tickAnim(avera.anim,AVERA_CFG.anims);

  // Contact damage
  if(player.invincible===0&&!player.dead&&!avera.defending){
    if(Math.abs(avera.x-player.x)<50&&Math.abs((avera.y-80)-player.y)<100){
      hurtPlayer(avera.dashing?18:10);flashTimer=20;
    }
  }
  if(flashTimer>0)flashTimer--;
}

// ── L3 ENEMY UPDATE ────────────────────────────────────────────
function updateL3Enemies(){
  if(sublevelTransition) return;
  for(const e of enemies){
    if(e.dead){
      tickAnim(e.anim,SOLDIER_CFG.anims);
      if(e.anim.name==='death'&&e.anim.frame>=SOLDIER_CFG.anims.death.frames-1){
        if(!e.deathParticlesDone){e.deathParticlesDone=true;spawnParticles(e.x,e.y-50,'#ffaa00',6);}
        e.deathDone=true;
      }
      continue;
    }
    const dx=player.x-e.x;
    e.facing=dx>0?1:-1;
    const spd=e.heavy?1.3:2.0;
    if(e.hurtTimer>0){e.hurtTimer--;setAnim(e.anim,'hurt');}
    else if(Math.abs(dx)<e.attackRange){
      e.vx=0;setAnim(e.anim,'attack');
      if(e.shootCd>0)e.shootCd--;
      else{
        e.shootCd=e.heavy?70:90;
        enemyBullets.push({x:e.x+e.facing*22,y:e.y-(e.heavy?70:55),vx:e.facing*(e.heavy?5:7),vy:0,alive:true,boss:false});
        if(e.heavy) enemyBullets.push({x:e.x+e.facing*22,y:e.y-50,vx:e.facing*5,vy:2,alive:true,boss:false});
      }
    } else if(Math.abs(dx)<e.alertRange){
      e.vx=e.facing*spd;setAnim(e.anim,'walk');
    } else {
      e.vx=e.facing*(spd*0.5);setAnim(e.anim,'walk');
    }
    e.x+=e.vx;e.x=Math.max(50,Math.min(CFG.LEVEL_W-50,e.x));
    tickAnim(e.anim,SOLDIER_CFG.anims);
    if(player.invincible===0&&!player.dead){
      const dmg=e.heavy?14:8;
      if(Math.abs(e.x-player.x)<34&&Math.abs(e.y-player.y)<88)hurtPlayer(dmg);
    }
  }
}

// ── L3 BULLETS ────────────────────────────────────────────────
function updateBulletsL3(){
  for(const b of bullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(bossActive&&avera&&!avera.dead){
      // Avera blocks bullets when defending
      if(Math.abs(b.x-avera.x)<55&&Math.abs(b.y-(avera.y-80))<80){
        if(avera.defending){
          b.alive=false;
          spawnParticles(avera.x,avera.y-60,'#334488',4);
          floatText(avera.x,avera.y-180,'BLOCKED!','#6688ff',12);
        } else {
          const dmg=10;
          avera.hp-=dmg;b.alive=false;
          spawnParticles(avera.x,avera.y-60,'#334488',4);
          floatText(avera.x,avera.y-180,`-${dmg}`,'#aabbff',12);
          player.score+=10;shake(3,5);flashTimer=12;
          setAnim(avera.anim,'hurt');
          if(avera.hp<=0){avera.hp=0;avera.dead=true;setAnim(avera.anim,'death');}
        }
        continue;
      }
    }
    for(const e of enemies){
      if(e.dead)continue;
      if(Math.abs(b.x-e.x)<30&&Math.abs(b.y-(e.y-55))<48){
        e.hp-=10;b.alive=false;
        spawnParticles(e.x,e.y-55,'#ff5522',4);
        if(e.hp<=0){
          e.dead=true;setAnim(e.anim,'death');
          player.score+=e.heavy?200:120;
          floatText(e.x,e.y-90,e.heavy?'+200':'+120','#ffd166');shake(2,3);
        } else {setAnim(e.anim,'hurt');e.hurtTimer=20;}
        break;
      }
    }
  }
  bullets=bullets.filter(b=>b.alive);
  for(const b of enemyBullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(player.invincible===0&&!player.dead){
      if(Math.abs(b.x-player.x)<22&&Math.abs(b.y-(player.y-50))<42){
        b.alive=false;hurtPlayer(b.boss?12:7);
      }
    }
  }
  enemyBullets=enemyBullets.filter(b=>b.alive);
}

// ── L3 SUBLEVEL CHECK ──────────────────────────────────────────
function checkL3Progress(){
  if(levelComplete||bossActive||sublevelTransition) return;
  const allDead=enemies.length>0&&enemies.every(e=>e.dead);
  if(!allDead) return;
  levelComplete=true;
  if(sublevel===1){
    sublevelTransition=true;
    showNote('STAGE 3-2','Jenny: "Good. Keep moving. I will call again."',130);
    setTimeout(()=>{spawnLevel3Sub(2);sublevelTransition=false;levelComplete=false;},2500);
  } else if(sublevel===2){
    sublevelTransition=true;
    showNote('"She is here... Avera."','"Jenny: Do not let her stop you. Find the light!"',200);
    setTimeout(()=>{sublevel='boss';sublevelTransition=false;initAvera();},3000);
  }
}

// ── UPDATE LEVEL 3 ─────────────────────────────────────────────
function updateLevel3(){
  updatePhoneCall();
  updateL3Chests();
  if(sublevel==='boss'){
    updateAvera();
  } else {
    updateL3Enemies();
    checkL3Progress();
  }
}

// ══════════════════════════════════════════════════════════════
//  DRAW LEVEL 3
// ══════════════════════════════════════════════════════════════

// ── NIGHT FAULTMINE BACKGROUND ─────────────────────────────────
function drawFaultmineNight(){
  const W=CFG.CANVAS_W,GY=CFG.GROUND_Y;
  // Dark sky
  const sky=ctx.createLinearGradient(0,0,0,GY);
  sky.addColorStop(0,'#030308');sky.addColorStop(0.6,'#08080f');sky.addColorStop(1,'#0f0f1e');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,GY);

  // Stars
  for(let i=0;i<60;i++){
    const sx=(i*137)%W,sy=(i*79)%(GY-40);
    const twinkle=Math.sin(frameCount*0.04+i)*0.5+0.5;
    ctx.globalAlpha=twinkle*0.7;
    ctx.fillStyle='#ffffff';ctx.fillRect(sx,sy,1.5,1.5);
  }
  ctx.globalAlpha=1;

  // Dark versions of faultmine bg layers
  if(bgImages.bg0?.naturalWidth>0){
    ctx.globalAlpha=0.25;
    const pw=bgImages.bg0.width,px=(camera.x*0.06)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)ctx.drawImage(bgImages.bg0,ox,GY-bgImages.bg0.height,pw,bgImages.bg0.height);
    ctx.globalAlpha=1;
  }
  if(bgImages.bg1?.naturalWidth>0){
    ctx.globalAlpha=0.18;
    const pw=bgImages.bg1.width,px=(camera.x*0.18)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)ctx.drawImage(bgImages.bg1,ox,GY-bgImages.bg1.height,pw,bgImages.bg1.height);
    ctx.globalAlpha=1;
  }

  // Eerie red window glow from ruins
  ctx.fillStyle='rgba(60,10,10,0.3)';
  for(let i=0;i<12;i++){
    const px=((i*180-camera.x*0.25)%(W+180)+W+180)%(W+180)-90;
    ctx.fillRect(px,GY-80,8,12);ctx.fillRect(px+28,GY-70,8,10);
  }

  // Ground
  ctx.fillStyle='#07070e';ctx.fillRect(0,GY,W,CFG.CANVAS_H-GY);
  ctx.fillStyle='#15152a';ctx.fillRect(0,GY,W,7);
  ctx.fillStyle='#1a1a30';ctx.fillRect(0,GY,W,3);

  // Dark overlay on top
  ctx.fillStyle='rgba(0,0,8,0.55)';ctx.fillRect(0,0,W,CFG.CANVAS_H);
}

// ── DARK MODE LIGHT MASK ────────────────────────────────────────
function drawDarkMask(){
  if(!darkMode) return;
  const px=player.x-camera.x,py=player.y;
  const rad=lightRadius+(flashTimer>0?80:0); // flash on boss attack

  // Full dark canvas
  const mask=ctx.createRadialGradient(px,py-40,0,px,py-40,rad);
  mask.addColorStop(0,'rgba(0,0,0,0)');
  mask.addColorStop(0.6,'rgba(0,0,0,0.15)');
  mask.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle=mask;ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);

  // Extra dark edges
  ctx.fillStyle='rgba(0,0,0,0.6)';
  ctx.fillRect(0,0,Math.max(0,px-rad),CFG.CANVAS_H);
  ctx.fillRect(Math.min(CFG.CANVAS_W,px+rad),0,CFG.CANVAS_W,CFG.CANVAS_H);
}

// ── DRAW L3 CHESTS ─────────────────────────────────────────────
function drawL3Chests(){
  for(const id in l3ChestCode){
    const ch=l3ChestCode[id];
    const bob=Math.sin(ch.bobTimer)*3;
    const sx=ch.x-camera.x+(ch.shakeTimer>0?(Math.random()*6-3):0);
    const sy=ch.y+bob;
    const revealed=ch.codeRevealed;

    // Chest glow: dim=not revealed, bright=revealed
    ctx.save();
    if(revealed&&!ch.open&&!ch.locked){ctx.shadowColor='#ffd166';ctx.shadowBlur=20;}
    else if(!revealed){ctx.shadowColor='#334455';ctx.shadowBlur=8;}
    ctx.fillStyle=ch.locked?'#442200':ch.open?'#664400':revealed?'#8B4513':'#1a1a2a';
    ctx.fillRect(sx-24,sy-40,48,40);
    ctx.fillStyle=ch.locked?'#661100':ch.open?'#cc8800':revealed?'#cd853f':'#2a2a4a';
    ctx.fillRect(sx-24,sy-44,48,10);
    ctx.restore();

    // Icon
    ctx.font='bold 15px monospace';ctx.textAlign='center';
    if(ch.locked){ctx.fillStyle='#ff4444';ctx.fillText('✗',sx,sy-40);}
    else if(ch.open){ctx.fillStyle='#ffd166';ctx.fillText('★',sx,sy-40);}
    else if(!revealed){ctx.fillStyle='#334455';ctx.fillText('🔒',sx,sy-38);}
    else{ctx.fillStyle='#fff';ctx.fillText('?',sx,sy-38);}
    ctx.textAlign='left';

    // Label
    ctx.fillStyle=revealed?'#ffd166':'#334455';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText(ch.label,sx,sy+14);ctx.textAlign='left';

    // Code entry prompt (only if revealed)
    if(ch.active&&!ch.open&&!ch.locked&&ch.codeRevealed){
      ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(sx-85,sy-120,170,78);
      ctx.strokeStyle='#ffd166';ctx.lineWidth=1.5;ctx.strokeRect(sx-85,sy-120,170,78);
      ctx.fillStyle='#ff74c6';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText('📞 JENNY\'S CODE:',sx,sy-105);
      ctx.fillStyle='#ffd166';ctx.font='bold 13px monospace';
      ctx.fillText(ch.hint,sx,sy-87);
      // Progress arrows
      const arrows={'ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓'};
      const sym=ch.sequence.map(k=>arrows[k]);
      ctx.font='bold 20px monospace';
      sym.forEach((s,i)=>{
        ctx.fillStyle=i<ch.progress?'#00ff88':i===ch.progress?'#ffff00':'#555';
        ctx.fillText(s,sx-((sym.length-1)*15)+i*30,sy-65);
      });
      // Timer bar
      ctx.fillStyle='#222';ctx.fillRect(sx-60,sy-55,120,7);
      const tc=ch.inputTimer/ch.inputWindow;
      ctx.fillStyle=tc>0.4?'#ffd166':'#ff6600';
      ctx.fillRect(sx-60,sy-55,120*tc,7);
      ctx.textAlign='left';
    }

    if(ch.failFlash>0){
      ctx.fillStyle=`rgba(255,0,0,${ch.failFlash/70*0.35})`;
      ctx.fillRect(sx-28,sy-40,56,46);
    }
  }
}

// ── DRAW PHONE CALL UI ─────────────────────────────────────────
function drawPhoneCall(){
  // Ringing indicator
  if(phoneCall.ringing){
    const pulse=Math.sin(frameCount*0.2)*0.3+0.7;
    ctx.save();
    ctx.globalAlpha=pulse;
    ctx.fillStyle='rgba(255,116,198,0.9)';
    ctx.fillRect(CFG.CANVAS_W-260,CFG.CANVAS_H-80,250,60);
    ctx.strokeStyle='#ff74c6';ctx.lineWidth=2;
    ctx.strokeRect(CFG.CANVAS_W-260,CFG.CANVAS_H-80,250,60);
    ctx.restore();
    ctx.fillStyle='#fff';ctx.font='bold 13px monospace';ctx.textAlign='center';
    ctx.fillText('📞  JENNY CALLING',CFG.CANVAS_W-135,CFG.CANVAS_H-52);
    ctx.fillStyle='#ffd166';ctx.font='10px monospace';
    ctx.fillText('Press E to answer',CFG.CANVAS_W-135,CFG.CANVAS_H-32);
    ctx.textAlign='left';
  }

  // Active call UI
  if(phoneCall.active&&activeCode){
    const callPct=phoneCall.timer/phoneCall.duration;
    const W2=320,H2=130,cx2=CFG.CANVAS_W-W2-10,cy2=CFG.CANVAS_H-H2-30;
    ctx.fillStyle='rgba(0,0,0,0.9)';ctx.fillRect(cx2,cy2,W2,H2);
    ctx.strokeStyle='#ff74c6';ctx.lineWidth=2;ctx.strokeRect(cx2,cy2,W2,H2);

    // Jenny avatar circle
    ctx.fillStyle='#ff74c6';ctx.beginPath();ctx.arc(cx2+36,cy2+40,26,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 22px monospace';ctx.textAlign='center';
    ctx.fillText('J',cx2+36,cy2+48);

    // Call status
    ctx.fillStyle='#ff74c6';ctx.font='bold 11px monospace';ctx.textAlign='left';
    ctx.fillText('JENNY — On Call',cx2+72,cy2+22);
    ctx.fillStyle='#aaffaa';ctx.font='9px monospace';
    ctx.fillText('● CONNECTED',cx2+72,cy2+38);

    // Code message
    ctx.fillStyle='#ffffff';ctx.font='bold 12px monospace';
    ctx.fillText(`"${activeCode.label} code is:"`,cx2+14,cy2+65);
    ctx.fillStyle='#ffd166';ctx.font='bold 18px monospace';
    ctx.fillText(activeCode.hint,cx2+14,cy2+90);

    // Call timer bar
    ctx.fillStyle='#222';ctx.fillRect(cx2+10,cy2+H2-18,W2-20,8);
    ctx.fillStyle=callPct>0.3?'#ff74c6':'#ff4444';
    ctx.fillRect(cx2+10,cy2+H2-18,(W2-20)*callPct,8);
    ctx.fillStyle='#888';ctx.font='9px monospace';
    ctx.fillText('Call ends in...',cx2+10,cy2+H2-4);
    ctx.textAlign='left';
  }
}

// ── DRAW AVERA ─────────────────────────────────────────────────
function drawAvera(){
  if(!avera||avera.deathDone) return;
  const sx=avera.x-camera.x,sy=avera.y;
  const SCALE=2.6;
  const dw=96*SCALE,dh=84*SCALE;
  const img=images.avera?.[avera.anim.name];
  ctx.save();
  if(avera.defending){ctx.shadowColor='#334488';ctx.shadowBlur=30;}
  else if(avera.phase===2){ctx.shadowColor='#001133';ctx.shadowBlur=20;}
  else if(avera.dashing){ctx.shadowColor='#6688ff';ctx.shadowBlur=25;}
  ctx.translate(sx,sy);
  if(avera.facing>0)ctx.scale(-1,1);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,avera.anim.frame*96,0,96,84,-dw/2,-161,dw,dh);
  else{
    ctx.fillStyle='#223366';ctx.fillRect(-40,-dh,80,dh);
  }
  ctx.restore();

  // Defend shield visual
  if(avera.defending){
    ctx.save();
    ctx.strokeStyle=`rgba(100,130,255,${0.5+Math.sin(frameCount*0.2)*0.3})`;
    ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(sx,sy-dh*0.5,65,0,Math.PI*2);ctx.stroke();
    ctx.restore();
    if(frameCount%10<5){
      ctx.fillStyle='#6688ff';ctx.font='11px monospace';ctx.textAlign='center';
      ctx.fillText('SHIELD',sx,sy-dh-8);ctx.textAlign='left';
    }
  }

  // Boss HP bar
  const bx=160,by=20,bw=640,bh=22;
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(bx-6,by-6,bw+12,bh+12);
  ctx.strokeStyle='#334488';ctx.lineWidth=2;ctx.strokeRect(bx-6,by-6,bw+12,bh+12);
  ctx.fillStyle='#0a0a1a';ctx.fillRect(bx,by,bw,bh);
  const pct=avera.hp/avera.maxHp;
  ctx.fillStyle=pct>0.5?'#4466ff':pct>0.25?'#8844ff':'#ff44ff';
  ctx.fillRect(bx,by,bw*pct,bh);
  if(avera.defending){ctx.fillStyle='rgba(100,130,255,0.4)';ctx.fillRect(bx,by,bw,bh);}
  const as=avera.defending?'🛡 DEFENDING':avera.dashing?'⚡ DASHING!':avera.phase===2?'⚠ PHASE 2':'';
  ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillText(`AVERA  ${avera.hp}/${avera.maxHp}  ${as}`,bx+bw/2,by+16);ctx.textAlign='left';
}

// ── DRAW BOSS INTRO (Avera) ────────────────────────────────────
function drawAveraIntro(){
  if(!bossIntro||!avera) return;
  const a=Math.min(1,bossIntroTimer/60)*0.88;
  ctx.fillStyle=`rgba(0,0,10,${a})`;ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  ctx.save();ctx.shadowColor='#334488';ctx.shadowBlur=40;
  ctx.fillStyle=`rgba(100,140,255,${a})`;ctx.font='bold 52px monospace';ctx.textAlign='center';
  ctx.fillText('AVERA',CFG.CANVAS_W/2,CFG.CANVAS_H/2-25);ctx.restore();
  ctx.fillStyle=`rgba(180,200,255,${a})`;ctx.font='14px monospace';ctx.textAlign='center';
  ctx.fillText('Memory Hunter — She fights to make you forget',CFG.CANVAS_W/2,CFG.CANVAS_H/2+15);
  ctx.fillStyle=`rgba(150,180,255,${a})`;ctx.font='11px monospace';
  ctx.fillText('🛡 Wait when she DEFENDS  •  ⚡ Jump over DASH  •  👁 Watch the darkness!',CFG.CANVAS_W/2,CFG.CANVAS_H/2+42);
  ctx.textAlign='left';
}

// ═══════════════════════════════════════════════════════════════
//  LEVEL 4 — AKUSTUS KISEMO NIGHT
//  Full robot army. Boss: Octopa-Toto-Cumpus
// ═══════════════════════════════════════════════════════════════

const OCTOPA_CFG = {
  frameW:200, frameH:200, scale:1.8,
  anims:{
    idle:    {src:'sprites/octopa/idle.png',     frames:4, fps:6},
    run:     {src:'sprites/octopa/run.png',      frames:8, fps:14},
    attack1: {src:'sprites/octopa/attack1.png',  frames:4, fps:12, loop:false},
    attack2: {src:'sprites/octopa/attack2.png',  frames:4, fps:12, loop:false},
    hurt:    {src:'sprites/octopa/take_hit.png', frames:3, fps:10, loop:false},
    death:   {src:'sprites/octopa/death.png',    frames:7, fps:8,  loop:false},
    jump:    {src:'sprites/octopa/jump.png',     frames:2, fps:8},
  }
};

let octopa = null;
let akustusBgs = {};
let l4Enemies = [];

function loadLevel4Assets(cb){
  images.octopa={};
  const ks=Object.keys(OCTOPA_CFG.anims); let n=0;
  ks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{ if(++n===ks.length) loadAkustusBgs(cb); };
    img.src=OCTOPA_CFG.anims[k].src; images.octopa[k]=img;
  });
}

function loadAkustusBgs(cb){
  akustusBgs={};
  // Load key parallax layers
  const layers=['Layer_0000_9','Layer_0001_8','Layer_0002_7','Layer_0003_6',
                'Layer_0005_5','Layer_0006_4','Layer_0008_3','Layer_0009_2',
                'Layer_0010_1','Layer_0011_0'];
  let n=0;
  layers.forEach(name=>{
    const img=new Image();
    img.onload=img.onerror=()=>{ if(++n===layers.length) cb(); };
    img.src=`backgrounds/akustus/${name}.png`;
    akustusBgs[name]=img;
  });
}

function startLevel4(){
  currentLevel=4; bullets=[];enemyBullets=[];enemies=[];
  particles=[];chests=[];floatTexts=[];shockwaves=[];
  shootTimer=0;sublevel=1;levelComplete=false;
  sublevelTransition=false;bossActive=false;octopa=null;
  victoryScreen=false;noteVisible=false;darkMode=false;
  player.x=180;player.y=CFG.GROUND_Y;player.vx=0;player.vy=0;
  camera.x=0;
  spawnL4Sub(1);
}

function spawnL4Sub(lvl){
  sublevel=lvl;enemies=[];bullets=[];enemyBullets=[];
  levelComplete=false;sublevelTransition=false;

  if(lvl===1){
    // Heavy mixed army — soldiers from both sides
    [500,750,1000,1300,1600,1900,2200,2500,2800,3100,3400,3700].forEach((x,i)=>{
      spawnL4Enemy(x, i%2===0?-1:1, i>7, i>9);
    });
    chests=[];
    spawnChest(1100); spawnChest(2600);
    showNote('LEVEL 4 — AKUSTUS KISEMO',
      '"Jenny: We are close. The prison is beyond this forest."',140);
  } else if(lvl===2){
    [450,700,950,1200,1500,1800,2100,2400,2700,3000,3300,3600,3900,4200].forEach((x,i)=>{
      spawnL4Enemy(x, i%2===0?-1:1, i>8, i>11);
    });
    chests=[];
    spawnChest(900); spawnChest(2000); spawnChest(3500);
    showNote('STAGE 4-2','"Jenny: The commander is near. Octopa-Toto-Cumpus. Kill it!"',140);
  } else if(lvl===3){
    // Final wave before boss — wave-based
    [600,900,1200,1500,1800,2100,2400].forEach((x,i)=>spawnL4Enemy(x,i%2===0?-1:1,true,i>4));
    showNote('STAGE 4-3 — FINAL WAVE!','Clear the path to the commander!',120);
  }
}

function spawnL4Enemy(x,facing,heavy=false,elite=false){
  enemies.push({
    x,y:CFG.GROUND_Y,vx:0,vy:0,facing,
    hp:elite?90:heavy?60:35,
    maxHp:elite?90:heavy?60:35,
    heavy,elite,
    state:'patrol',anim:{name:'walk',frame:0,timer:0},
    attackCd:0,hurtTimer:0,
    shootCd:elite?50:heavy?65:90,
    dead:false,deathDone:false,deathParticlesDone:false,
    alertRange:350,attackRange:200,
  });
}

function initOctopa(){
  bossActive=true;bossIntro=true;bossIntroTimer=220;
  octopa={
    x:800,y:CFG.GROUND_Y,vx:0,vy:0,facing:-1,
    hp:250,maxHp:250,phase:1,
    anim:{name:'idle',frame:0,timer:0},
    onGround:true,jumpCount:0,
    attackCd:80,shootCd:55,
    // Combo attack
    comboTimer:0,comboCd:200,comboPhase:0,
    // Ground pound
    poundCd:280,poundWarn:false,poundWarnTimer:0,pounding:false,
    // Rage (phase 2)
    rageDash:false,rageDashTimer:0,rageDashCd:200,
    dead:false,deathTimer:0,deathDone:false,
  };
}

function updateOctopa(){
  if(!octopa||octopa.deathDone) return;
  if(bossIntro){bossIntroTimer--;if(bossIntroTimer<=0)bossIntro=false;return;}
  if(octopa.dead){
    octopa.deathTimer++;
    tickAnim(octopa.anim,OCTOPA_CFG.anims);
    if(octopa.anim.frame>=6&&octopa.anim.name==='death'){
      octopa.deathDone=true; victoryScreen=true;
      showNote('OCTOPA-TOTO-CUMPUS DEFEATED!',
        '"Jenny: The prison entrance is right there. One more fight."',999);
      spawnParticles(octopa.x,octopa.y-80,'#ff8800',30,2);shake(15,30);
    }
    return;
  }

  if(octopa.hp<=octopa.maxHp*0.5&&octopa.phase===1){
    octopa.phase=2;
    showNote('⚠ OCTOPA ENRAGED!','Combo attacks and rage dash activated!',130);
    spawnParticles(octopa.x,octopa.y-80,'#ff4400',20,1.5);shake(12,25);
  }

  const dx=player.x-octopa.x;
  octopa.facing=dx>0?-1:1;
  const spd=octopa.phase===2?3.8:2.5;

  // Ground pound
  if(!octopa.pounding&&!octopa.poundWarn&&octopa.onGround){
    octopa.poundCd--;
    if(octopa.poundCd<=0){
      octopa.poundWarn=true;octopa.poundWarnTimer=55;octopa.poundCd=octopa.phase===2?200:300;
      floatText(octopa.x,octopa.y-230,'GROUND POUND!','#ff6600',16);
    }
  }
  if(octopa.poundWarn){
    octopa.poundWarnTimer--;octopa.vx=0;
    if(octopa.poundWarnTimer<=0){
      octopa.poundWarn=false;octopa.pounding=true;
      octopa.vy=CFG.JUMP*1.4;octopa.onGround=false;
      setAnim(octopa.anim,'jump');
    }
  }
  if(octopa.pounding&&octopa.onGround){
    octopa.pounding=false;
    spawnShockwave(octopa.x,octopa.y);
    floatText(octopa.x,octopa.y-180,'JUMP!','#ff4400',20);
    if(player.onGround&&Math.abs(player.x-octopa.x)<280&&player.invincible===0)
      hurtPlayer(16);
  }

  // Rage dash (phase 2)
  if(octopa.phase===2&&!octopa.rageDash){
    octopa.rageDashCd--;
    if(octopa.rageDashCd<=0){
      octopa.rageDash=true;octopa.rageDashTimer=18;octopa.rageDashCd=180;
      floatText(octopa.x,octopa.y-230,'RAGE DASH!','#ff2200',15);
      spawnParticles(octopa.x,octopa.y-60,'#ff4400',8);
    }
  }
  if(octopa.rageDash){
    octopa.rageDashTimer--;
    octopa.x+=dx>0?20:-20;
    if(octopa.rageDashTimer<=0) octopa.rageDash=false;
    if(player.invincible===0&&!player.dead&&Math.abs(octopa.x-player.x)<50&&Math.abs(octopa.y-player.y)<120)
      hurtPlayer(20);
  }

  if(!octopa.pounding&&!octopa.rageDash&&!octopa.poundWarn)
    octopa.x+=dx>0?spd:-spd;

  // Jump
  if(octopa.onGround&&Math.random()<(octopa.phase===2?0.012:0.005)){
    octopa.vy=CFG.JUMP*(octopa.phase===2?1.2:1.0);
    octopa.onGround=false;
  }

  octopa.vy+=CFG.GRAVITY; octopa.y+=octopa.vy;
  if(octopa.y>=CFG.GROUND_Y){octopa.y=CFG.GROUND_Y;octopa.vy=0;octopa.onGround=true;}
  octopa.x=Math.max(150,Math.min(CFG.LEVEL_W-150,octopa.x));

  // Shoot combo
  if(octopa.shootCd>0) octopa.shootCd--;
  else{
    octopa.shootCd=octopa.phase===2?35:55;
    const dir=dx>0?1:-1;
    const oy=octopa.y-130;
    enemyBullets.push({x:octopa.x+dir*55,y:oy,vx:dir*9,vy:0,alive:true,boss:true});
    if(octopa.phase===2){
      enemyBullets.push({x:octopa.x+dir*55,y:oy,vx:dir*8,vy:-2,alive:true,boss:true});
      enemyBullets.push({x:octopa.x+dir*55,y:oy,vx:dir*8,vy:2, alive:true,boss:true});
    }
    setAnim(octopa.anim, Math.random()<0.5?'attack1':'attack2');
  }

  if(!['attack1','attack2','hurt','death','jump'].includes(octopa.anim.name))
    setAnim(octopa.anim,Math.abs(dx)>80?'run':'idle');
  tickAnim(octopa.anim,OCTOPA_CFG.anims);

  if(player.invincible===0&&!player.dead&&!octopa.pounding)
    if(Math.abs(octopa.x-player.x)<60&&Math.abs(octopa.y-player.y)<130)hurtPlayer(14);
}

function updateLevel4(){
  if(bossActive){updateOctopa();return;}
  updateL4Enemies();
  updateL4Chests();
  checkL4Progress();
}
function updateL4Chests(){ updateChests(); }
function updateL4Enemies(){
  if(sublevelTransition)return;
  for(const e of enemies){
    if(e.dead){
      tickAnim(e.anim,SOLDIER_CFG.anims);
      if(e.anim.name==='death'&&e.anim.frame>=SOLDIER_CFG.anims.death.frames-1){
        if(!e.deathParticlesDone){e.deathParticlesDone=true;spawnParticles(e.x,e.y-50,'#ffaa00',6);}
        e.deathDone=true;
      }
      continue;
    }
    const dx=player.x-e.x; e.facing=dx>0?1:-1;
    const spd=e.elite?2.8:e.heavy?1.5:2.2;
    if(e.hurtTimer>0){e.hurtTimer--;setAnim(e.anim,'hurt');}
    else if(Math.abs(dx)<e.attackRange){
      e.vx=0;setAnim(e.anim,'attack');
      if(e.shootCd>0)e.shootCd--;
      else{
        e.shootCd=e.elite?50:e.heavy?68:92;
        enemyBullets.push({x:e.x+e.facing*22,y:e.y-60,vx:e.facing*8,vy:0,alive:true,boss:false});
        if(e.elite){
          enemyBullets.push({x:e.x+e.facing*22,y:e.y-60,vx:e.facing*7,vy:-2,alive:true,boss:false});
          enemyBullets.push({x:e.x+e.facing*22,y:e.y-60,vx:e.facing*7,vy:2, alive:true,boss:false});
        }
      }
    } else {e.vx=e.facing*spd;setAnim(e.anim,'walk');}
    e.x+=e.vx;e.x=Math.max(50,Math.min(CFG.LEVEL_W-50,e.x));
    tickAnim(e.anim,SOLDIER_CFG.anims);
    if(player.invincible===0&&!player.dead){
      const dmg=e.elite?16:e.heavy?12:8;
      if(Math.abs(e.x-player.x)<34&&Math.abs(e.y-player.y)<90)hurtPlayer(dmg);
    }
  }
}
function checkL4Progress(){
  if(levelComplete||bossActive||sublevelTransition)return;
  if(!enemies.every(e=>e.dead))return;
  levelComplete=true;
  if(sublevel<3){
    sublevelTransition=true;
    setTimeout(()=>{spawnL4Sub(sublevel+1);sublevelTransition=false;levelComplete=false;},2200);
  } else {
    sublevelTransition=true;
    showNote('"He is here."','"Jenny: Octopa-Toto-Cumpus. The army commander. Kill him!"',200);
    setTimeout(()=>{sublevel='boss';sublevelTransition=false;initOctopa();},3200);
  }
}

function updateBulletsL4(){
  for(const b of bullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(bossActive&&octopa&&!octopa.dead){
      if(Math.abs(b.x-octopa.x)<70&&Math.abs(b.y-(octopa.y-130))<120){
        octopa.hp-=10;b.alive=false;
        spawnParticles(octopa.x,octopa.y-100,'#ff8800',4);
        floatText(octopa.x,octopa.y-190,'-10','#ff8800',12);
        player.score+=10;shake(3,5);
        setAnim(octopa.anim,'hurt');
        if(octopa.hp<=0){octopa.hp=0;octopa.dead=true;setAnim(octopa.anim,'death');}
        continue;
      }
    }
    for(const e of enemies){
      if(e.dead)continue;
      if(Math.abs(b.x-e.x)<32&&Math.abs(b.y-(e.y-55))<50){
        e.hp-=10;b.alive=false;
        spawnParticles(e.x,e.y-55,'#ff5522',4);
        if(e.hp<=0){
          e.dead=true;setAnim(e.anim,'death');
          const pts=e.elite?250:e.heavy?180:120;
          player.score+=pts;floatText(e.x,e.y-90,`+${pts}`,'#ffd166');shake(2,3);
        } else {setAnim(e.anim,'hurt');e.hurtTimer=20;}
        break;
      }
    }
  }
  bullets=bullets.filter(b=>b.alive);
  for(const b of enemyBullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(player.invincible===0&&!player.dead)
      if(Math.abs(b.x-player.x)<22&&Math.abs(b.y-(player.y-50))<44){b.alive=false;hurtPlayer(b.boss?14:7);}
  }
  enemyBullets=enemyBullets.filter(b=>b.alive);
}

function drawAkustusBackground(){
  const W=CFG.CANVAS_W,GY=CFG.GROUND_Y;
  const sky=ctx.createLinearGradient(0,0,0,GY);
  sky.addColorStop(0,'#010108');sky.addColorStop(1,'#060618');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,GY);
  // Stars
  for(let i=0;i<100;i++){
    const sx=(i*137)%W,sy=(i*79)%(GY-40);
    ctx.globalAlpha=Math.sin(frameCount*0.04+i)*0.4+0.5;
    ctx.fillStyle='#ffffff';ctx.fillRect(sx,sy,1.5,1.5);
  }
  ctx.globalAlpha=1;
  // Parallax forest layers
  const layerNames=Object.keys(akustusBgs);
  layerNames.forEach((name,idx)=>{
    const img=akustusBgs[name];
    if(!img?.naturalWidth)return;
    const spd=0.03+idx*0.07;
    ctx.globalAlpha=0.5+idx*0.05;
    const pw=img.width,px=(camera.x*spd)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)
      ctx.drawImage(img,ox,GY-img.height,pw,img.height);
    ctx.globalAlpha=1;
  });
  ctx.fillStyle='#020208';ctx.fillRect(0,GY,W,CFG.CANVAS_H-GY);
  ctx.fillStyle='#0a0a18';ctx.fillRect(0,GY,W,7);
  ctx.fillStyle='rgba(0,0,20,0.4)';ctx.fillRect(0,0,W,CFG.CANVAS_H);
}

function drawOctopa(){
  if(!octopa||octopa.deathDone)return;
  const sx=octopa.x-camera.x,sy=octopa.y;
  const SCALE=1.8;
  const dw=200*SCALE,dh=200*SCALE;
  const img=images.octopa?.[octopa.anim.name];
  ctx.save();
  if(octopa.phase===2){ctx.shadowColor='#ff2200';ctx.shadowBlur=25;}
  if(octopa.rageDash){ctx.shadowColor='#ff4400';ctx.shadowBlur=40;}
  ctx.translate(sx,sy);
  if(octopa.facing>0)ctx.scale(-1,1);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,octopa.anim.frame*200,0,200,200,-dw/2,-230,dw,dh);
  else{ctx.fillStyle='#aa2200';ctx.fillRect(-60,-dh,120,dh);}
  ctx.restore();
  if(octopa.poundWarn){
    const p=1-octopa.poundWarnTimer/55;
    ctx.fillStyle=`rgba(255,100,0,${p*0.35})`;
    ctx.beginPath();ctx.arc(sx,sy,140,0,Math.PI*2);ctx.fill();
  }
  const bx=160,by=20,bw=640,bh=22;
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(bx-6,by-6,bw+12,bh+12);
  ctx.strokeStyle='#ff6600';ctx.lineWidth=2;ctx.strokeRect(bx-6,by-6,bw+12,bh+12);
  ctx.fillStyle='#1a0500';ctx.fillRect(bx,by,bw,bh);
  const pct=octopa.hp/octopa.maxHp;
  ctx.fillStyle=pct>0.5?'#ff6600':pct>0.25?'#ff3300':'#ff0000';
  ctx.fillRect(bx,by,bw*pct,bh);
  const os=octopa.rageDash?'⚡ RAGE DASH!':octopa.phase===2?'⚠ ENRAGED':'';
  ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillText(`OCTOPA-TOTO-CUMPUS  ${octopa.hp}/${octopa.maxHp}  ${os}`,bx+bw/2,by+16);
  ctx.textAlign='left';
}

function drawOctopaIntro(){
  if(!bossIntro||!octopa)return;
  const a=Math.min(1,bossIntroTimer/60)*0.88;
  ctx.fillStyle=`rgba(0,0,0,${a})`;ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  ctx.save();ctx.shadowColor='#ff4400';ctx.shadowBlur=40;
  ctx.fillStyle=`rgba(255,100,0,${a})`;ctx.font='bold 40px monospace';ctx.textAlign='center';
  ctx.fillText('OCTOPA-TOTO-CUMPUS',CFG.CANVAS_W/2,CFG.CANVAS_H/2-25);ctx.restore();
  ctx.fillStyle=`rgba(255,200,100,${a})`;ctx.font='14px monospace';ctx.textAlign='center';
  ctx.fillText('Army Commander of Robo-trap-izon',CFG.CANVAS_W/2,CFG.CANVAS_H/2+15);
  ctx.fillStyle=`rgba(200,220,255,${a})`;ctx.font='11px monospace';
  ctx.fillText('💥 Jump over GROUND POUND  •  ⚡ Dodge RAGE DASH  •  🔫 Shoot when still!',CFG.CANVAS_W/2,CFG.CANVAS_H/2+42);
  ctx.textAlign='left';
}

// ═══════════════════════════════════════════════════════════════
//  LEVEL 5 — THE SECRET LAB
//  Final level. Free the family. Boss: Clasus-Mega-Chonoba
// ═══════════════════════════════════════════════════════════════

const CLASUS_CFG = {
  frameW:240, frameH:240, scale:1.6,
  anims:{
    idle:   {src:'sprites/clasus/nightborne_idle.png',   frames:9,  fps:8},
    run:    {src:'sprites/clasus/nightborne_run.png',    frames:6,  fps:12},
    attack: {src:'sprites/clasus/nightborne_attack.png', frames:12, fps:14, loop:false},
    hurt:   {src:'sprites/clasus/nightborne_hurt.png',   frames:5,  fps:10, loop:false},
    death:  {src:'sprites/clasus/nightborne_death.png',  frames:23, fps:8,  loop:false},
  }
};

let clasus=null;
let labBgs={};
let familyFreed=false;
let endingTimer=0;
let endingPhase=0;

function loadLevel5Assets(cb){
  images.clasus={};
  const ks=Object.keys(CLASUS_CFG.anims);let n=0;
  ks.forEach(k=>{
    const img=new Image();
    img.onload=img.onerror=()=>{
      images.clasus[k]=img;
      if(++n===ks.length) loadLabBgs(cb);
    };
    img.src=CLASUS_CFG.anims[k].src;
  });
}

function loadLabBgs(cb){
  labBgs={};
  const files=['nature_1_1','nature_1_2','nature_1_3','nature_2_1',
               'nature_3_1','nature_5_1','nature_7_1','nature_8_1'];
  let n=0;
  files.forEach(name=>{
    const img=new Image();
    img.onload=img.onerror=()=>{labBgs[name]=img;if(++n===files.length)cb();};
    img.src=`backgrounds/lab/${name}.png`;
    labBgs[name]=img;
  });
}

function startLevel5(){
  currentLevel=5;bullets=[];enemyBullets=[];enemies=[];
  particles=[];chests=[];floatTexts=[];shockwaves=[];
  shootTimer=0;sublevel=1;levelComplete=false;
  sublevelTransition=false;bossActive=false;clasus=null;
  victoryScreen=false;noteVisible=false;darkMode=false;
  familyFreed=false;endingTimer=0;endingPhase=0;
  player.x=180;player.y=CFG.GROUND_Y;player.vx=0;player.vy=0;
  camera.x=0;
  spawnL5Sub(1);
}

function spawnL5Sub(lvl){
  sublevel=lvl;enemies=[];bullets=[];enemyBullets=[];
  levelComplete=false;sublevelTransition=false;
  if(lvl===1){
    // All enemy types mixed — hardest wave
    [450,700,950,1150,1400,1650,1900,2200,2500,2800,3100,3400,3700,4000,4300]
      .forEach((x,i)=>spawnL5Enemy(x,i%2===0?-1:1,i));
    chests=[];spawnChest(800);spawnChest(2000);spawnChest(3200);
    showNote('LEVEL 5 — THE SECRET LAB','"Jenny: This is it. Your family is inside. Fight through!"',150);
  } else if(lvl===2){
    [500,800,1100,1400,1700,2000,2300,2600,2900,3200,3500,3800]
      .forEach((x,i)=>spawnL5Enemy(x,i%2===0?-1:1,i));
    chests=[];spawnChest(1200);spawnChest(2800);
    showNote('STAGE 5-2 — LAST STAND!','"Jenny: The final guardian stands between you and your family."',150);
  }
}

function spawnL5Enemy(x,facing,tier){
  const elite=tier>9,heavy=tier>6,shadow=tier>3;
  enemies.push({
    x,y:CFG.GROUND_Y,vx:0,vy:0,facing,
    hp:elite?100:heavy?70:shadow?45:35,
    maxHp:elite?100:heavy?70:shadow?45:35,
    heavy,elite,shadow,
    state:'chase',anim:{name:'walk',frame:0,timer:0},
    attackCd:0,hurtTimer:0,shootCd:elite?45:heavy?60:80,
    dead:false,deathDone:false,deathParticlesDone:false,
    alertRange:9999,attackRange:200,
  });
}

function initClasus(){
  bossActive=true;bossIntro=true;bossIntroTimer=240;
  darkMode=true;lightRadius=180;
  clasus={
    x:750,y:CFG.GROUND_Y,vx:0,vy:0,facing:-1,
    hp:350,maxHp:350,phase:1,
    anim:{name:'idle',frame:0,timer:0},
    onGround:true,
    shootCd:50,attackCd:80,
    // Phase mechanics
    berserk:false,berserkTimer:0,berserkCd:200,
    invincible:false,invincibleTimer:0,invincibleCd:300,
    // Dark slam
    slamCd:250,slamWarn:false,slamWarnTimer:0,slamming:false,
    // Multi-shot phase 3
    phase3:false,
    dead:false,deathTimer:0,deathDone:false,
  };
}

function updateClasus(){
  if(!clasus||clasus.deathDone)return;
  if(bossIntro){bossIntroTimer--;if(bossIntroTimer<=0)bossIntro=false;return;}
  if(clasus.dead){
    clasus.deathTimer++;
    tickAnim(clasus.anim,CLASUS_CFG.anims);
    if(clasus.anim.frame>=22&&clasus.anim.name==='death'){
      clasus.deathDone=true;
      darkMode=false;
      familyFreed=true;endingTimer=1;
      victoryScreen=true;
      showNote('CLASUS-MEGA-CHONOBA DEFEATED!','"You did it... your family is free. You are the Superboy."',999);
      spawnParticles(clasus.x,clasus.y-80,'#ffffff',40,2);shake(20,40);
    }
    return;
  }

  // Phase 2 at 66%
  if(clasus.hp<=clasus.maxHp*0.66&&clasus.phase===1){
    clasus.phase=2;lightRadius=150;
    showNote('⚠ PHASE 2!','The darkness deepens. He grows stronger.',130);
    spawnParticles(clasus.x,clasus.y-80,'#220033',20,1.5);shake(12,25);
  }
  // Phase 3 at 33%
  if(clasus.hp<=clasus.maxHp*0.33&&!clasus.phase3){
    clasus.phase3=true;lightRadius=110;
    showNote('⚠ PHASE 3 — FINAL FORM!','Everything he has. Fight for your family!',130);
    spawnParticles(clasus.x,clasus.y-80,'#440022',25,2);shake(15,30);
  }

  const dx=player.x-clasus.x;
  clasus.facing=dx>0?-1:1;
  const spd=clasus.phase3?4.2:clasus.phase===2?3.2:2.2;

  // Light flicker
  lightRadius+=(Math.random()-0.5)*5;
  const minR=clasus.phase3?90:clasus.phase===2?130:160;
  const maxR=clasus.phase3?130:clasus.phase===2?170:200;
  lightRadius=Math.max(minR,Math.min(maxR,lightRadius));

  // Invincibility flash
  if(!clasus.invincible){
    clasus.invincibleCd--;
    if(clasus.invincibleCd<=0){
      clasus.invincible=true;clasus.invincibleTimer=70;
      clasus.invincibleCd=clasus.phase3?200:280;
      floatText(clasus.x,clasus.y-240,'INVINCIBLE!','#ffffff',16);
      shake(4,8);
    }
  }
  if(clasus.invincible){
    clasus.invincibleTimer--;
    if(clasus.invincibleTimer<=0){clasus.invincible=false;floatText(clasus.x,clasus.y-240,'ATTACK!','#ffff00',16);}
  }

  // Dark ground slam
  if(!clasus.slamming&&!clasus.slamWarn&&clasus.onGround){
    clasus.slamCd--;
    if(clasus.slamCd<=0){
      clasus.slamWarn=true;clasus.slamWarnTimer=50;clasus.slamCd=clasus.phase3?180:260;
      floatText(clasus.x,clasus.y-240,'DARK SLAM!','#880088',16);flashTimer=20;
    }
  }
  if(clasus.slamWarn){clasus.slamWarnTimer--;clasus.vx=0;
    if(clasus.slamWarnTimer<=0){clasus.slamWarn=false;clasus.slamming=true;
      clasus.vy=CFG.JUMP*1.5;clasus.onGround=false;setAnim(clasus.anim,'attack');}
  }
  if(clasus.slamming&&clasus.onGround){
    clasus.slamming=false;
    spawnShockwave(clasus.x,clasus.y);flashTimer=30;
    floatText(clasus.x,clasus.y-160,'JUMP OVER IT!','#ff4400',20);
    if(player.onGround&&Math.abs(player.x-clasus.x)<300&&player.invincible===0)hurtPlayer(20);
  }

  // Berserk dash (phase 2+)
  if(clasus.phase>=2&&!clasus.berserk){
    clasus.berserkCd--;
    if(clasus.berserkCd<=0){
      clasus.berserk=true;clasus.berserkTimer=clasus.phase3?30:22;
      clasus.berserkCd=clasus.phase3?150:200;
      floatText(clasus.x,clasus.y-240,'BERSERK!','#ff0066',16);
      spawnParticles(clasus.x,clasus.y-80,'#440033',10);
    }
  }
  if(clasus.berserk){
    clasus.berserkTimer--;clasus.x+=dx>0?22:-22;
    if(clasus.berserkTimer<=0)clasus.berserk=false;
    if(player.invincible===0&&!player.dead&&Math.abs(clasus.x-player.x)<55&&Math.abs(clasus.y-player.y)<130)
      hurtPlayer(22);flashTimer=20;
  }

  if(!clasus.slamming&&!clasus.berserk&&!clasus.slamWarn)
    clasus.x+=dx>0?spd:-spd;

  clasus.vy+=CFG.GRAVITY;clasus.y+=clasus.vy;
  if(clasus.y>=CFG.GROUND_Y){clasus.y=CFG.GROUND_Y;clasus.vy=0;clasus.onGround=true;}
  clasus.x=Math.max(150,Math.min(CFG.LEVEL_W-150,clasus.x));

  // Shoot dark orbs
  if(!clasus.invincible){
    clasus.shootCd--;
    if(clasus.shootCd<=0){
      clasus.shootCd=clasus.phase3?30:clasus.phase===2?40:55;
      const dir=dx>0?1:-1,oy=clasus.y-140;
      enemyBullets.push({x:clasus.x+dir*55,y:oy,vx:dir*9,vy:0,alive:true,boss:true,dark:true});
      if(clasus.phase>=2){
        enemyBullets.push({x:clasus.x+dir*55,y:oy,vx:dir*8,vy:-2.5,alive:true,boss:true,dark:true});
        enemyBullets.push({x:clasus.x+dir*55,y:oy,vx:dir*8,vy:2.5, alive:true,boss:true,dark:true});
      }
      if(clasus.phase3){
        enemyBullets.push({x:clasus.x+dir*55,y:oy,vx:dir*7,vy:-4,alive:true,boss:true,dark:true});
        enemyBullets.push({x:clasus.x+dir*55,y:oy,vx:dir*7,vy:4,alive:true,boss:true,dark:true});
      }
      if(!clasus.invincible)setAnim(clasus.anim,'attack');
    }
  }

  if(!['attack','hurt','death'].includes(clasus.anim.name))
    setAnim(clasus.anim,Math.abs(dx)>80?'run':'idle');
  tickAnim(clasus.anim,CLASUS_CFG.anims);
  if(flashTimer>0)flashTimer--;

  if(player.invincible===0&&!player.dead&&!clasus.invincible)
    if(Math.abs(clasus.x-player.x)<65&&Math.abs(clasus.y-player.y)<140)hurtPlayer(16);
}

function updateLevel5(){
  if(bossActive){updateClasus();return;}
  updateL5Enemies();updateChests();checkL5Progress();
}
function updateL5Enemies(){
  if(sublevelTransition)return;
  for(const e of enemies){
    if(e.dead){
      tickAnim(e.anim,SOLDIER_CFG.anims);
      if(e.anim.name==='death'&&e.anim.frame>=SOLDIER_CFG.anims.death.frames-1){
        if(!e.deathParticlesDone){e.deathParticlesDone=true;spawnParticles(e.x,e.y-50,'#ffaa00',6);}
        e.deathDone=true;
      }
      continue;
    }
    const dx=player.x-e.x;e.facing=dx>0?1:-1;
    const spd=e.elite?3:e.heavy?1.8:e.shadow?2.8:2.2;
    if(e.hurtTimer>0){e.hurtTimer--;setAnim(e.anim,'hurt');}
    else if(Math.abs(dx)<e.attackRange){
      e.vx=0;setAnim(e.anim,'attack');
      if(e.shootCd>0)e.shootCd--;
      else{
        e.shootCd=e.elite?45:e.heavy?62:80;
        enemyBullets.push({x:e.x+e.facing*22,y:e.y-60,vx:e.facing*8,vy:0,alive:true,boss:false});
        if(e.elite||e.shadow){
          enemyBullets.push({x:e.x+e.facing*22,y:e.y-60,vx:e.facing*7,vy:-2,alive:true,boss:false});
          enemyBullets.push({x:e.x+e.facing*22,y:e.y-60,vx:e.facing*7,vy:2, alive:true,boss:false});
        }
      }
    } else {e.vx=e.facing*spd;setAnim(e.anim,'walk');}
    e.x+=e.vx;e.x=Math.max(50,Math.min(CFG.LEVEL_W-50,e.x));
    tickAnim(e.anim,SOLDIER_CFG.anims);
    if(player.invincible===0&&!player.dead){
      const dmg=e.elite?18:e.heavy?12:8;
      if(Math.abs(e.x-player.x)<34&&Math.abs(e.y-player.y)<90)hurtPlayer(dmg);
    }
  }
}
function checkL5Progress(){
  if(levelComplete||bossActive||sublevelTransition)return;
  if(!enemies.every(e=>e.dead))return;
  levelComplete=true;
  if(sublevel===1){
    sublevelTransition=true;
    setTimeout(()=>{spawnL5Sub(2);sublevelTransition=false;levelComplete=false;},2200);
  } else {
    sublevelTransition=true;
    showNote('"CLASUS-MEGA-CHONOBA."','"Jenny: The last guardian. Kill it and your family goes free."',220);
    setTimeout(()=>{sublevel='boss';sublevelTransition=false;initClasus();},3500);
  }
}

function updateBulletsL5(){
  for(const b of bullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(bossActive&&clasus&&!clasus.dead){
      if(Math.abs(b.x-clasus.x)<75&&Math.abs(b.y-(clasus.y-150))<130){
        if(clasus.invincible){
          b.alive=false;spawnParticles(clasus.x,clasus.y-120,'#440044',4);
          floatText(clasus.x,clasus.y-220,'INVINCIBLE!','#888',12);
        } else {
          clasus.hp-=10;b.alive=false;
          spawnParticles(clasus.x,clasus.y-120,'#aa00aa',4);
          floatText(clasus.x,clasus.y-220,`-10`,'#dd88ff',12);
          player.score+=10;shake(3,5);flashTimer=12;
          setAnim(clasus.anim,'hurt');
          if(clasus.hp<=0){clasus.hp=0;clasus.dead=true;setAnim(clasus.anim,'death');}
        }
        continue;
      }
    }
    for(const e of enemies){
      if(e.dead)continue;
      if(Math.abs(b.x-e.x)<32&&Math.abs(b.y-(e.y-55))<50){
        e.hp-=10;b.alive=false;
        spawnParticles(e.x,e.y-55,'#ff5522',4);
        if(e.hp<=0){
          e.dead=true;setAnim(e.anim,'death');
          const pts=e.elite?300:e.heavy?200:e.shadow?180:130;
          player.score+=pts;floatText(e.x,e.y-90,`+${pts}`,'#ffd166');shake(2,3);
        } else {setAnim(e.anim,'hurt');e.hurtTimer=20;}
        break;
      }
    }
  }
  bullets=bullets.filter(b=>b.alive);
  for(const b of enemyBullets){
    if(!b.alive)continue;
    b.x+=b.vx;b.y+=b.vy;
    if(b.x<camera.x-150||b.x>camera.x+CFG.CANVAS_W+150){b.alive=false;continue;}
    if(player.invincible===0&&!player.dead)
      if(Math.abs(b.x-player.x)<22&&Math.abs(b.y-(player.y-50))<44){b.alive=false;hurtPlayer(b.boss?14:8);}
  }
  enemyBullets=enemyBullets.filter(b=>b.alive);
}

function drawLabBackground(){
  const W=CFG.CANVAS_W,GY=CFG.GROUND_Y;
  const sky=ctx.createLinearGradient(0,0,0,GY);
  sky.addColorStop(0,'#020210');sky.addColorStop(1,'#080820');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,CFG.CANVAS_H);
  const layerNames=Object.keys(labBgs);
  layerNames.forEach((name,idx)=>{
    const img=labBgs[name];if(!img?.naturalWidth)return;
    const spd=0.02+idx*0.06;ctx.globalAlpha=0.45+idx*0.07;
    const pw=img.width,px=(camera.x*spd)%pw;
    for(let ox=-px;ox<W+pw;ox+=pw)ctx.drawImage(img,ox,GY-img.height,pw,img.height);
    ctx.globalAlpha=1;
  });
  ctx.fillStyle='#010110';ctx.fillRect(0,GY,W,CFG.CANVAS_H-GY);
  ctx.fillStyle='#0a0a22';ctx.fillRect(0,GY,W,7);
  ctx.fillStyle='rgba(0,0,30,0.5)';ctx.fillRect(0,0,W,CFG.CANVAS_H);
}

function drawClasus(){
  if(!clasus||clasus.deathDone)return;
  const sx=clasus.x-camera.x,sy=clasus.y;
  const SCALE=1.6,dw=240*SCALE,dh=240*SCALE;
  const img=images.clasus?.[clasus.anim.name];
  ctx.save();
  if(clasus.invincible){ctx.shadowColor='#ffffff';ctx.shadowBlur=40;}
  else if(clasus.phase3){ctx.shadowColor='#ff0066';ctx.shadowBlur=30;}
  else if(clasus.phase===2){ctx.shadowColor='#880044';ctx.shadowBlur=20;}
  ctx.translate(sx,sy);
  if(clasus.facing>0)ctx.scale(-1,1);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,clasus.anim.frame*240,0,240,240,-dw/2,-384,dw,dh);
  else{ctx.fillStyle='#220033';ctx.fillRect(-65,-dh,130,dh);}
  ctx.restore();
  if(clasus.invincible&&frameCount%6<3){
    ctx.save();ctx.globalAlpha=0.4;ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(sx,sy-dh*0.5,100,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  if(clasus.slamWarn){
    const p=1-clasus.slamWarnTimer/50;
    ctx.fillStyle=`rgba(100,0,100,${p*0.4})`;
    ctx.beginPath();ctx.arc(sx,sy,160,0,Math.PI*2);ctx.fill();
  }
  const bx=160,by=20,bw=640,bh=22;
  ctx.fillStyle='rgba(0,0,0,0.85)';ctx.fillRect(bx-6,by-6,bw+12,bh+12);
  ctx.strokeStyle='#880044';ctx.lineWidth=2;ctx.strokeRect(bx-6,by-6,bw+12,bh+12);
  ctx.fillStyle='#0a0010';ctx.fillRect(bx,by,bw,bh);
  const pct=clasus.hp/clasus.maxHp;
  ctx.fillStyle=pct>0.66?'#880088':pct>0.33?'#cc0066':'#ff0044';
  ctx.fillRect(bx,by,bw*pct,bh);
  if(clasus.invincible){ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(bx,by,bw,bh);}
  const cs=clasus.invincible?'🛡 INVINCIBLE':clasus.phase3?'⚠ FINAL FORM':clasus.phase===2?'⚠ PHASE 2':'';
  ctx.fillStyle='#fff';ctx.font='bold 12px monospace';ctx.textAlign='center';
  ctx.fillText(`CLASUS-MEGA-CHONOBA  ${clasus.hp}/${clasus.maxHp}  ${cs}`,bx+bw/2,by+16);
  ctx.textAlign='left';
}

function drawClasusBossIntro(){
  if(!bossIntro||!clasus)return;
  const a=Math.min(1,bossIntroTimer/60)*0.92;
  ctx.fillStyle=`rgba(0,0,0,${a})`;ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  ctx.save();ctx.shadowColor='#ff0066';ctx.shadowBlur=50;
  ctx.fillStyle=`rgba(255,50,150,${a})`;ctx.font='bold 36px monospace';ctx.textAlign='center';
  ctx.fillText('CLASUS-MEGA-CHONOBA',CFG.CANVAS_W/2,CFG.CANVAS_H/2-30);ctx.restore();
  ctx.fillStyle=`rgba(255,200,255,${a})`;ctx.font='14px monospace';ctx.textAlign='center';
  ctx.fillText('The Final Soul — Last Shield of Robo-trap-izon',CFG.CANVAS_W/2,CFG.CANVAS_H/2+12);
  ctx.fillStyle=`rgba(255,180,200,${a})`;ctx.font='11px monospace';
  ctx.fillText('🛡 Stop shooting when INVINCIBLE  •  💥 Jump DARK SLAM  •  3 phases!',CFG.CANVAS_W/2,CFG.CANVAS_H/2+40);
  ctx.fillStyle=`rgba(255,255,200,${a})`;ctx.font='bold 12px monospace';
  ctx.fillText('"Your family is waiting. This ends NOW."',CFG.CANVAS_W/2,CFG.CANVAS_H/2+66);
  ctx.textAlign='left';
}

// ── FINAL ENDING OVERLAY ──────────────────────────────────────
function drawEnding(){
  if(!familyFreed||!victoryScreen) return;
  endingTimer++;
  if(endingTimer<60) return;
  if(endingTimer>300&&endingTimer<360){
    ctx.fillStyle=`rgba(255,255,255,${(endingTimer-300)/60})`;
    ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
  }
  if(endingTimer>360){
    ctx.fillStyle='#fff';ctx.fillRect(0,0,CFG.CANVAS_W,CFG.CANVAS_H);
    ctx.fillStyle='#111';ctx.font='bold 28px monospace';ctx.textAlign='center';
    ctx.fillText('YEAR 4096',CFG.CANVAS_W/2,120);
    ctx.font='14px monospace';
    const lines=[
      '"I found them."',
      '"After everything... they were right there."',
      '"The robots are gone. Robo-trap-izon is finished."',
      '"We rebuild. Together."',
      '',
      'THANK YOU FOR PLAYING',
      'OPERATION IRON PIXEL',
    ];
    lines.forEach((l,i)=>{
      const alpha=Math.min(1,(endingTimer-380-i*30)/60);
      if(alpha<=0)return;
      ctx.globalAlpha=alpha;
      ctx.fillStyle=i>=5?'#ffd166':'#333';
      ctx.font=i>=5?'bold 20px monospace':'14px monospace';
      ctx.fillText(l,CFG.CANVAS_W/2,200+i*38);
    });
    ctx.globalAlpha=1;
    if(endingTimer>600){
      ctx.fillStyle='#555';ctx.font='11px monospace';
      ctx.fillText('Press R to play again',CFG.CANVAS_W/2,CFG.CANVAS_H-30);
      if(keys['KeyR'])restartGame();
    }
    ctx.textAlign='left';
  }
}
