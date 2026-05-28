'use strict';
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
  frameW:120,frameH:80,scale:2.2,
  anims:{
    idle:      {src:'sprites/naveen_new/_Idle.png',      frames:10,fps:8},
    run:       {src:'sprites/naveen_new/_Run.png',       frames:10,fps:14},
    jump:      {src:'sprites/naveen_new/_Jump.png',      frames:3, fps:8},
    fall:      {src:'sprites/naveen_new/_Fall.png',      frames:3, fps:8},
    crouch:    {src:'sprites/naveen_new/_Crouch.png',    frames:1, fps:6},
    crouchwalk:{src:'sprites/naveen_new/_CrouchWalk.png',frames:8, fps:10},
    slide:     {src:'sprites/naveen_new/_SlideFull.png', frames:4, fps:10},
    attack:    {src:'sprites/naveen_new/_Attack.png',    frames:4, fps:14,loop:false},
    death:     {src:'sprites/naveen_new/_Death.png',     frames:10,fps:8, loop:false},
    hit:       {src:'sprites/naveen_new/_Hit.png',       frames:1, fps:6},
    roll:      {src:'sprites/naveen_new/_Roll.png',      frames:12,fps:16,loop:false},
  }
};
const RAD = {
  frameW:64,frameH:64,scale:2.5,
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
  frameW:100,frameH:100,scale:1.6,
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
    x,y:CFG.GROUND_Y-30,
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
      if(Math.abs(b.x-boss.x)<60&&Math.abs(b.y-(boss.y-90))<90){
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
      ctx.drawImage(img,e.anim.frame*SOLDIER_CFG.frameW,0,SOLDIER_CFG.frameW,SOLDIER_CFG.frameH,-dw/2,-dh,dw,dh);
    else{ctx.fillStyle='#4a4a5a';ctx.fillRect(-20,-dh,40,dh);}
    ctx.restore();
    if(e.hp<e.maxHp&&!e.dead){
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(sx-22,e.y-172,44,6);
      ctx.fillStyle='#f00';ctx.fillRect(sx-22,e.y-172,(e.hp/e.maxHp)*44,6);
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
    ctx.drawImage(img,0,0,140,93,-dw/2,-dh,dw,dh);
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
  const dw=cfg.frameW*cfg.scale,dh=cfg.frameH*cfg.scale;
  const crouch=p.crouching||p.sliding;
  ctx.save();
  ctx.translate(p.x-camera.x+camShake.x,p.y+camShake.y);
  if(p.facing<0)ctx.scale(-1,1);
  if(crouch)ctx.scale(1,0.6);
  if(img?.complete&&img.naturalWidth>0)
    ctx.drawImage(img,p.anim.frame*cfg.frameW,0,cfg.frameW,cfg.frameH,-dw/2,crouch?-dh*0.9:-dh,dw,dh);
  else{
    ctx.fillStyle=p.charKey==='naveen'?'#3fe2ff':'#ff74c6';
    ctx.fillRect(-22,crouch?-45:-88,44,crouch?45:88);
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
  const stageLabel=bossActive?'⚔ BOSS: TRIANTUS':`STAGE 1-${sublevel}`;
  ctx.fillText(stageLabel,14,92);

  // Controls bar
  ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,CFG.CANVAS_H-22,CFG.CANVAS_W,22);
  ctx.fillStyle='#88aacc';ctx.font='9px monospace';
  ctx.fillText('← → MOVE  SHIFT RUN  ↑/Z JUMP  ↓ CROUCH  ↓+SHIFT SLIDE  X/SPACE SHOOT  C ROLL',8,CFG.CANVAS_H-7);

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
    ctx.fillText('[ Press R to restart  |  Press N for Level 2 ]',CFG.CANVAS_W/2,CFG.CANVAS_H/2+100);
  }
  ctx.textAlign='left';
  if(keys['KeyR']&&victoryTimer>120)restartGame();
  if(currentLevel===1&&keys['KeyN']&&victoryTimer>120)goToLevel2();
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
  frameCount++;prevKeys={...keys};
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
      } else {
        updateLevel2();
        updateBulletsL2();
      }
      if(noteVisible){noteTimer--;if(noteTimer<=0&&!victoryScreen)noteVisible=false;}
    }
    // Draw
    ctx.save();ctx.translate(camShake.x,camShake.y);
    if(currentLevel===1){
      drawBackground();
      drawShockwaves();
      drawChests();
      drawEnemies();
    } else {
      drawWrapzoneBackground();
      if(sublevel===2||sublevel==='boss')drawJenny();
      if(sublevel===2)drawTerminals();
      drawEnemies();
    }
    drawBullets();
    drawParticles();
    drawPlayer();
    if(currentLevel===1&&bossActive)drawBoss();
    if(currentLevel===2&&bossActive)drawMamulaus();
    ctx.restore();
    drawFloatTexts();
    if(currentLevel===2)drawKillCounter();
    drawHUD();
    drawNote();
    drawSublevelTransition();
    if(bossIntro&&currentLevel===1)drawBossIntro();
    if(bossIntro&&currentLevel===2)drawMamulausIntro();
    if(victoryScreen)drawVictory();
  } else if(screen==='loading'){
    drawLoadingScreen();
  }
}

// ── START / RESTART ────────────────────────────────────────────
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
      if(Math.abs(b.x-mamulaus.x)<80&&Math.abs(b.y-(mamulaus.y+mamulaus.floatY-130))<110){
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
    ctx.drawImage(img,jennyAnim.frame*JENNY_CFG.frameW,0,JENNY_CFG.frameW,JENNY_CFG.frameH,-dw/2,-dh,dw,dh);
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
    ctx.drawImage(img,mamulaus.anim.frame*250,0,250,250,-dw/2,-dh,dw,dh);
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
