/* Catur Warisan — self-contained chess rules and local opponent. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const files = "abcdefgh";
  const names = {k:"Raja",q:"Permaisuri",r:"Benteng",b:"Bendahara",n:"Hulubalang",p:"Perajurit"};
  const glyphs = {w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}};
  const portraits = {k:"raja",q:"permaisuri",r:"benteng",b:"bendahara",n:"hulubalang",p:"perajurit"};
  const techniques = {k:"TITAH MAHKOTA",q:"BAYANG PERMAISURI",r:"TEMBOK BENTENG",b:"HIKMAH BENDAHARA",n:"DERAP HULUBALANG",p:"LANGKAH WIRA"};
  const portraitUrl = type => "./assets/"+portraits[type]+".webp";
  const pieceUrl = type => "./assets/pieces/"+portraits[type]+".webp";
  const pieceScale = {k:1.10,q:1.08,r:1.06,b:1.08,n:1.08,p:.97};
  const points = {p:100,n:320,b:335,r:510,q:930,k:0};
  const knights = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
  const diagonals = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const straights = [[1,0],[-1,0],[0,1],[0,-1]];
  const allDirs = [...diagonals,...straights];
  const squareName = p => files[p.c] + (8-p.r);
  const within = (r,c) => r>=0 && r<8 && c>=0 && c<8;
  const opposite = c => c==="w"?"b":"w";
  const piece = (type,color) => ({type,color});

  function initialState() {
    const board = Array.from({length:8},()=>Array(8).fill(null));
    const order = ["r","n","b","q","k","b","n","r"];
    for(let c=0;c<8;c++){
      board[0][c]=piece(order[c],"b"); board[1][c]=piece("p","b");
      board[6][c]=piece("p","w"); board[7][c]=piece(order[c],"w");
    }
    return {board,turn:"w",castle:{wK:true,wQ:true,bK:true,bQ:true},ep:null,halfmove:0,fullmove:1};
  }
  const clone = s => ({
    board:s.board.map(row=>row.map(p=>p?{...p}:null)),
    turn:s.turn,castle:{...s.castle},ep:s.ep?{...s.ep}:null,
    halfmove:s.halfmove,fullmove:s.fullmove
  });
  function keyOf(s){
    const positions=s.board.map(row=>row.map(p=>p?p.color+p.type:"_").join("")).join("/");
    return positions+" "+s.turn+" "+Object.entries(s.castle).filter(([,v])=>v).map(([k])=>k).join("")+" "+(s.ep?squareName(s.ep):"-");
  }
  function kingAt(s,color){
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(s.board[r][c]?.type==="k"&&s.board[r][c].color===color)return {r,c};
    return null;
  }
  function isAttacked(s,r,c,by){
    const board=s.board;
    const pawnSource=r-(by==="w"?-1:1);
    for(const dc of [-1,1]){
      const pc=c+dc;
      if(within(pawnSource,pc)&&board[pawnSource][pc]?.color===by&&board[pawnSource][pc]?.type==="p")return true;
    }
    for(const [dr,dc] of knights){
      const rr=r+dr,cc=c+dc;
      if(within(rr,cc)&&board[rr][cc]?.color===by&&board[rr][cc]?.type==="n")return true;
    }
    for(const [dr,dc] of allDirs){
      let rr=r+dr,cc=c+dc,dist=1;
      while(within(rr,cc)){
        const p=board[rr][cc];
        if(p){
          if(p.color===by){
            if((dr===0||dc===0)&&(p.type==="r"||p.type==="q"))return true;
            if(dr!==0&&dc!==0&&(p.type==="b"||p.type==="q"))return true;
            if(dist===1&&p.type==="k")return true;
          }
          break;
        }
        rr+=dr;cc+=dc;dist++;
      }
    }
    return false;
  }
  function isInCheck(s,color){
    const king=kingAt(s,color);
    return !king||isAttacked(s,king.r,king.c,opposite(color));
  }
  function pseudoMoves(s,r,c){
    const p=s.board[r][c];if(!p)return [];
    const result=[],color=p.color,enemy=opposite(color);
    const add=(rr,cc,flag)=>{if(within(rr,cc))result.push({from:{r,c},to:{r:rr,c:cc},flag:flag||null})};
    const target=(rr,cc)=>within(rr,cc)?s.board[rr][cc]:undefined;
    const enemyAt=(rr,cc)=>{const t=target(rr,cc);return t&&t.color===enemy&&t.type!=="k"};
    if(p.type==="p"){
      const dir=color==="w"?-1:1, start=color==="w"?6:1;
      if(within(r+dir,c)&&!target(r+dir,c)){
        add(r+dir,c);
        if(r===start&&!target(r+2*dir,c))add(r+2*dir,c,"double");
      }
      for(const dc of [-1,1]){
        if(enemyAt(r+dir,c+dc))add(r+dir,c+dc,"capture");
        else if(s.ep&&s.ep.r===r+dir&&s.ep.c===c+dc&&
          target(r,c+dc)?.type==="p"&&target(r,c+dc)?.color===enemy)add(r+dir,c+dc,"ep");
      }
    }else if(p.type==="n"){
      for(const [dr,dc] of knights){
        const t=target(r+dr,c+dc);
        if(t===null||enemyAt(r+dr,c+dc))add(r+dr,c+dc,t?"capture":null);
      }
    }else if(p.type==="b"||p.type==="r"||p.type==="q"){
      const dirs=p.type==="b"?diagonals:p.type==="r"?straights:allDirs;
      for(const [dr,dc] of dirs){
        let rr=r+dr,cc=c+dc;
        while(within(rr,cc)){
          const t=target(rr,cc);
          if(!t)add(rr,cc);
          else{if(enemyAt(rr,cc))add(rr,cc,"capture");break}
          rr+=dr;cc+=dc;
        }
      }
    }else if(p.type==="k"){
      for(const [dr,dc] of allDirs){
        const t=target(r+dr,c+dc);
        if(t===null||enemyAt(r+dr,c+dc))add(r+dr,c+dc,t?"capture":null);
      }
      const home=color==="w"?7:0;
      if(r===home&&c===4&&!isInCheck(s,color)){
        const rookK=target(home,7),rookQ=target(home,0);
        if(s.castle[color+"K"]&&rookK?.type==="r"&&rookK.color===color&&
          !target(home,5)&&!target(home,6)&&
          !isAttacked(s,home,5,enemy)&&!isAttacked(s,home,6,enemy))add(home,6,"castleK");
        if(s.castle[color+"Q"]&&rookQ?.type==="r"&&rookQ.color===color&&
          !target(home,1)&&!target(home,2)&&!target(home,3)&&
          !isAttacked(s,home,3,enemy)&&!isAttacked(s,home,2,enemy))add(home,2,"castleQ");
      }
    }
    return result;
  }
  function applyMove(s,m,promote="q"){
    const next=clone(s),from=m.from,to=m.to;
    const moving=next.board[from.r][from.c],captured=next.board[to.r][to.c];
    const wasPawn=moving.type==="p";
    next.halfmove=(wasPawn||captured||m.flag==="ep")?0:next.halfmove+1;
    if(moving.type==="k"){next.castle[moving.color+"K"]=false;next.castle[moving.color+"Q"]=false}
    if(moving.type==="r"){
      if(from.r===7&&from.c===0)next.castle.wQ=false;
      if(from.r===7&&from.c===7)next.castle.wK=false;
      if(from.r===0&&from.c===0)next.castle.bQ=false;
      if(from.r===0&&from.c===7)next.castle.bK=false;
    }
    if(captured?.type==="r"){
      if(to.r===7&&to.c===0)next.castle.wQ=false;
      if(to.r===7&&to.c===7)next.castle.wK=false;
      if(to.r===0&&to.c===0)next.castle.bQ=false;
      if(to.r===0&&to.c===7)next.castle.bK=false;
    }
    next.board[to.r][to.c]=moving;
    next.board[from.r][from.c]=null;
    if(m.flag==="ep")next.board[from.r][to.c]=null;
    if(m.flag==="castleK"){
      next.board[from.r][5]=next.board[from.r][7];next.board[from.r][7]=null;
    }
    if(m.flag==="castleQ"){
      next.board[from.r][3]=next.board[from.r][0];next.board[from.r][0]=null;
    }
    if(wasPawn&&(to.r===0||to.r===7))next.board[to.r][to.c]=piece(promote,moving.color);
    next.ep=m.flag==="double"?{r:(from.r+to.r)/2,c:from.c}:null;
    if(s.turn==="b")next.fullmove++;
    next.turn=opposite(s.turn);
    return next;
  }
  function legalMoves(s,color=s.turn){
    const moves=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=s.board[r][c];
      if(!p||p.color!==color)continue;
      for(const m of pseudoMoves(s,r,c)){
        const after=applyMove(s,m);
        if(!isInCheck(after,color))moves.push(m);
      }
    }
    return moves;
  }
  function insufficient(s){
    const remaining=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=s.board[r][c];
      if(p&&p.type!=="k")remaining.push({...p,r,c});
    }
    if(remaining.length===0)return true;
    if(remaining.length===1&&["b","n"].includes(remaining[0].type))return true;
    if(remaining.length===2&&remaining.every(p=>p.type==="b")&&
      ((remaining[0].r+remaining[0].c)%2)===(remaining[1].r+remaining[1].c)%2)return true;
    return false;
  }
  function positionStatus(s,positions){
    const moves=legalMoves(s);
    const check=isInCheck(s,s.turn);
    if(!moves.length)return {done:true,kind:check?"mate":"draw",message:check?
      `Skakmat! ${s.turn==="w"?"Istana Zamrud":"Istana Melur"} menang.`:
      "Pat! Tiada langkah sah. Permainan seri."};
    if(s.halfmove>=100)return {done:true,kind:"draw",message:"Seri — 50 langkah tanpa gerakan Perajurit atau tangkapan."};
    if(insufficient(s))return {done:true,kind:"draw",message:"Seri — bahan tidak mencukupi untuk skakmat."};
    if(positions.filter(k=>k===keyOf(s)).length>=3)return {done:true,kind:"draw",message:"Seri — kedudukan yang sama berulang tiga kali."};
    return {done:false,kind:check?"check":"play",message:check?
      `Skak! Raja ${s.turn==="w"?"Istana Melur":"Istana Zamrud"} sedang terancam.`:
      `Giliran ${s.turn==="w"?"Istana Melur":"Istana Zamrud"} untuk melangkah.`};
  }

  let state=initialState(),history=[],positions=[keyOf(state)];
  let selected=null,options=[],lastMove=null,flipped=false,mode="local",pendingPromotion=null,botTimer=null,generation=0;
  let cinemaEnabled=true,cinematicBusy=false,sceneTimer=null,sceneDelayTimer=null,sceneExitTimer=null,sceneAfter=null,moveGhost=null,defeatGhost=null;
  const boardEl=$("chessboard");
  function moveLabel(s,m,promotion){
    const p=s.board[m.from.r][m.from.c];
    if(m.flag==="castleK")return "O–O";
    if(m.flag==="castleQ")return "O–O–O";
    const capture=s.board[m.to.r][m.to.c]||m.flag==="ep";
    const g=glyphs[p.color][p.type];
    return g+" "+squareName(m.from)+(capture?"×":"–")+squareName(m.to)+
      ((p.type==="p"&&(m.to.r===0||m.to.r===7))?"="+(promotion||"q").toUpperCase():"");
  }
  function cancelScene(){
    clearTimeout(sceneTimer);clearTimeout(sceneDelayTimer);clearTimeout(sceneExitTimer);
    window.CaturDuel3D?.stop();
    sceneTimer=sceneDelayTimer=sceneExitTimer=null;
    if(moveGhost){moveGhost.remove();moveGhost=null}
    if(defeatGhost){defeatGhost.remove();defeatGhost=null}
    boardEl.querySelectorAll(".piece-token").forEach(token=>token.style.visibility="");
    $("cinematic-overlay").hidden=true;
    $("cinematic-overlay").classList.remove("outro");
    sceneAfter=null;cinematicBusy=false;
  }
  function finishScene(){
    if(!cinematicBusy)return;
    clearTimeout(sceneTimer);clearTimeout(sceneDelayTimer);
    sceneTimer=sceneDelayTimer=null;
    if(moveGhost){moveGhost.remove();moveGhost=null}
    if(defeatGhost){defeatGhost.remove();defeatGhost=null}
    window.CaturDuel3D?.stop();
    const overlay=$("cinematic-overlay");
    if(overlay.hidden){
      const done=sceneAfter;sceneAfter=null;cinematicBusy=false;
      if(done)done();
      return;
    }
    overlay.classList.add("outro");
    sceneExitTimer=setTimeout(()=>{
      overlay.hidden=true;overlay.classList.remove("outro");
      cinematicBusy=false;sceneExitTimer=null;
      const done=sceneAfter;sceneAfter=null;
      if(done)done();
    },280);
  }
  function showScene(p,m,victim,status,after){
    const overlay=$("cinematic-overlay");
    const isCapture=!!victim;
    sceneAfter=after;
    overlay.dataset.piece=p.type;
    overlay.dataset.color=p.color;
    overlay.dataset.capture=String(isCapture);
    overlay.dataset.render="2d";
    overlay.dataset.defenderColor=victim?.color||"";
    $("cinema-image").src=portraitUrl(p.type);
    $("cinema-image").alt=names[p.type]+" Alam Melayu";
    if(isCapture){
      $("duel-attacker-img").src=portraitUrl(p.type);
      $("duel-defender-img").src=portraitUrl(victim.type);
      $("css3d-attacker-img").src=pieceUrl(p.type);
      $("css3d-defender-img").src=pieceUrl(victim.type);
      $("duel-attacker-name").textContent=names[p.type].toUpperCase();
      $("duel-defender-name").textContent=names[victim.type].toUpperCase();
      $("duel3d-attacker-name").textContent=names[p.type].toUpperCase();
      $("duel3d-defender-name").textContent=names[victim.type].toUpperCase();
      $("cinema-name").textContent="PERTARUNGAN";
      $("cinema-technique").textContent=names[p.type]+" menewaskan "+names[victim.type];
      $("cinema-kind").textContent=status.kind==="mate"?"SKAKMAT · TAKHTA DITAWAN":"SERANGAN · TANGKAPAN";
    }else{
      $("cinema-name").textContent=names[p.type].toUpperCase();
      $("cinema-technique").textContent=status.kind==="mate"?"SKAKMAT · KEMENANGAN":
        m.flag==="castleK"||m.flag==="castleQ"?"PERISAI ISTANA":techniques[p.type];
      $("cinema-kind").textContent=status.kind==="mate"?"TAKHTA DITAWAN":
        status.kind==="check"?"RAJA TERANCAM":"LANGKAH DIRAJA";
    }
    $("cinema-move").textContent=squareName(m.from)+"　✦　"+squareName(m.to);
    overlay.classList.remove("outro");overlay.hidden=false;
    const in3D=isCapture&&!!window.CaturDuel3D?.start(p,victim,4200);
    if(isCapture){
      overlay.dataset.render=in3D?"3d":"css3d";
      $("cinema-name").textContent="DUEL 3D";
      $("cinema-kind").textContent=status.kind==="mate"?"SKAKMAT · TAKHTA DITAWAN":"PERTARUNGAN 3D · TANGKAPAN";
    }
    const duration=isCapture?4300:status.kind==="mate"?2750:1650;
    sceneTimer=setTimeout(finishScene,duration);
  }
  function animateBoardMove(rects,p,m,victim){
    if(!rects?.from||!rects?.to)return;
    const dest=boardEl.querySelector(`.square[data-r="${m.to.r}"][data-c="${m.to.c}"] .piece-token`);
    if(dest)dest.style.visibility="hidden";
    if(victim&&rects.victim){
      const fallen=document.createElement("div");
      fallen.className="defeat-ghost "+(victim.color==="b"?"black":"white");
      fallen.style.left=(rects.victim.left+rects.victim.width*.025)+"px";
      fallen.style.top=rects.victim.top+"px";
      fallen.style.width=(rects.victim.width*.95)+"px";
      fallen.style.height=(rects.victim.height*.98)+"px";
      const defeatedImage=document.createElement("img");
      defeatedImage.src=pieceUrl(victim.type);defeatedImage.alt="";
      fallen.append(defeatedImage);document.body.append(fallen);defeatGhost=fallen;
      fallen.addEventListener("animationend",()=>{fallen.remove();if(defeatGhost===fallen)defeatGhost=null},{once:true});
    }
    const ghost=document.createElement("div");
    ghost.className="move-ghost "+(p.color==="b"?"black":"white");
    ghost.style.left=(rects.from.left+rects.from.width*.025)+"px";
    ghost.style.top=rects.from.top+"px";
    ghost.style.width=(rects.from.width*.95)+"px";
    ghost.style.height=(rects.from.height*.98)+"px";
    const img=document.createElement("img");img.src=pieceUrl(p.type);img.alt="";
    ghost.append(img);document.body.append(ghost);moveGhost=ghost;
    const dx=rects.to.left-rects.from.left,dy=rects.to.top-rects.from.top;
    const animation=ghost.animate([
      {transform:"translate(0,0) scale(1)",filter:"brightness(1)"},
      {transform:`translate(${dx*.6}px,${dy*.6}px) scale(1.3)`,filter:"brightness(1.8)",offset:.7},
      {transform:`translate(${dx}px,${dy}px) scale(1)`,filter:"brightness(1)"}
    ],{duration:390,easing:"cubic-bezier(.2,.7,.15,1)",fill:"forwards"});
    const cleanup=()=>{if(moveGhost===ghost)moveGhost=null;ghost.remove();if(dest)dest.style.visibility=""};
    animation.onfinish=cleanup;animation.oncancel=cleanup;
  }
  function updateCinemaButton(){
    const btn=$("cinema-toggle");
    btn.classList.toggle("active",cinemaEnabled);
    btn.setAttribute("aria-pressed",String(cinemaEnabled));
    btn.innerHTML='<span aria-hidden="true">✦</span> Sinematik: '+(cinemaEnabled?"ON":"OFF");
  }
  function persist(){
    try{localStorage.setItem("catur-warisan-v1",JSON.stringify({state,history,positions,flipped,mode,cinemaEnabled}));}catch{}
  }
  function restore(){
    try{
      const raw=JSON.parse(localStorage.getItem("catur-warisan-v1")||"null");
      if(!raw||!Array.isArray(raw.state?.board)||raw.state.board.length!==8||
        !["w","b"].includes(raw.state.turn)||!Array.isArray(raw.history))return;
      state=raw.state;history=raw.history;
      positions=Array.isArray(raw.positions)&&raw.positions.length===history.length+1?raw.positions:[keyOf(state)];
      flipped=!!raw.flipped;mode=raw.mode==="bot"?"bot":"local";
      cinemaEnabled=raw.cinemaEnabled!==false;
      lastMove=history.length?history[history.length-1].move:null;
    }catch{}
  }
  function stopBot(){generation++;if(botTimer)clearTimeout(botTimer);botTimer=null}
  function reset(){
    stopBot();cancelScene();state=initialState();history=[];positions=[keyOf(state)];
    selected=null;options=[];lastMove=null;pendingPromotion=null;
    $("promotion-modal").hidden=true;render();persist();
  }
  function undo(){
    stopBot();cancelScene();
    if(!history.length)return;
    const count=mode==="bot"&&state.turn==="w"?Math.min(2,history.length):1;
    for(let i=0;i<count;i++){
      const item=history.pop();state=item.previous;positions.pop();
    }
    selected=null;options=[];lastMove=history.length?history[history.length-1].move:null;
    pendingPromotion=null;$("promotion-modal").hidden=true;
    render();persist();
    if(mode==="bot"&&state.turn==="b"&&!positionStatus(state,positions).done)scheduleBot();
  }
  function commitMove(m,promotion="q"){
    if(cinematicBusy)return;
    const movingPiece={...state.board[m.from.r][m.from.c]};
    const captured=m.flag==="ep"?state.board[m.from.r][m.to.c]:state.board[m.to.r][m.to.c];
    const victim=captured?{...captured}:null;
    const animated=cinemaEnabled&&!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let rects=null;
    if(animated){
      const from=boardEl.querySelector(`.square[data-r="${m.from.r}"][data-c="${m.from.c}"]`);
      const to=boardEl.querySelector(`.square[data-r="${m.to.r}"][data-c="${m.to.c}"]`);
      if(from&&to){
        rects={from:from.getBoundingClientRect(),to:to.getBoundingClientRect()};
        if(victim){
          const capturedSquare=m.flag==="ep"?
            boardEl.querySelector(`.square[data-r="${m.from.r}"][data-c="${m.to.c}"]`):to;
          rects.victim=capturedSquare?.getBoundingClientRect();
        }
      }
    }
    const label=moveLabel(state,m,promotion),previous=clone(state);
    state=applyMove(state,m,promotion);
    history.push({previous,label,move:m});
    positions.push(keyOf(state));
    lastMove=m;selected=null;options=[];pendingPromotion=null;
    $("promotion-modal").hidden=true;
    render();persist();
    const status=positionStatus(state,positions);
    const after=()=>{if(mode==="bot"&&state.turn==="b"&&!positionStatus(state,positions).done)scheduleBot()};
    if(animated){
      cinematicBusy=true;
      animateBoardMove(rects,movingPiece,m,victim);
      sceneDelayTimer=setTimeout(()=>showScene(movingPiece,m,victim,status,after),410);
    }else after();
  }
  function showPromotion(m){
    pendingPromotion=m;
    const choice=$("promotion-options");choice.replaceChildren();
    for(const type of ["q","r","b","n"]){
      const btn=document.createElement("button");
      btn.type="button";btn.className="promotion-option";
      const icon=document.createElement("img");icon.src=pieceUrl(type);icon.alt=names[type];
      const name=document.createElement("small");name.textContent=names[type];
      btn.append(icon,name);btn.addEventListener("click",()=>commitMove(m,type));
      choice.append(btn);
    }
    $("promotion-modal").hidden=false;choice.querySelector("button")?.focus();
  }
  function onSquare(r,c){
    if(cinematicBusy||!$("promotion-modal").hidden||!$("rules-modal").hidden)return;
    if(mode==="bot"&&state.turn==="b")return;
    if(positionStatus(state,positions).done)return;
    const on=options.find(m=>m.to.r===r&&m.to.c===c);
    if(selected&&on){
      const p=state.board[selected.r][selected.c];
      if(p.type==="p"&&(r===0||r===7))showPromotion(on);else commitMove(on);
      return;
    }
    const p=state.board[r][c];
    if(p&&p.color===state.turn){
      if(selected&&selected.r===r&&selected.c===c){selected=null;options=[]}
      else{selected={r,c};options=legalMoves(state).filter(m=>m.from.r===r&&m.from.c===c)}
    }else{selected=null;options=[]}
    renderBoard();
  }
  function renderBoard(){
    const fragment=document.createDocumentFragment();
    const check=isInCheck(state,state.turn)?kingAt(state,state.turn):null;
    const rows=flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
    const cols=flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
    for(let ri=0;ri<8;ri++)for(let ci=0;ci<8;ci++){
      const r=rows[ri],c=cols[ci],p=state.board[r][c];
      const isLight=(r+c)%2===0;
      const b=document.createElement("button");
      b.type="button";b.className="square "+(isLight?"light":"dark");
      b.setAttribute("role","gridcell");
      b.setAttribute("aria-label",squareName({r,c})+" — "+(p?(names[p.type]+", "+(p.color==="w"?"putih":"hitam")):"kosong"));
      b.setAttribute("aria-selected",selected?.r===r&&selected?.c===c?"true":"false");
      b.dataset.r=r;b.dataset.c=c;
      if(lastMove&&((lastMove.from.r===r&&lastMove.from.c===c)||(lastMove.to.r===r&&lastMove.to.c===c)))b.classList.add("last-move");
      if(selected?.r===r&&selected?.c===c)b.classList.add("selected");
      if(check?.r===r&&check?.c===c)b.classList.add("in-check");
      if(ci===0){const rank=document.createElement("span");rank.className="coord rank";rank.textContent=8-r;b.append(rank)}
      if(ri===7){const file=document.createElement("span");file.className="coord file";file.textContent=files[c];b.append(file)}
      const option=options.find(m=>m.to.r===r&&m.to.c===c);
      if(option){
        if(p||option.flag==="ep")b.classList.add("legal-capture");
        else{const dot=document.createElement("span");dot.className="legal-dot";b.append(dot)}
      }
      if(p){
        const token=document.createElement("span");token.className="piece-token "+(p.color==="w"?"white":"black");
        token.style.setProperty("--piece-scale",pieceScale[p.type]);
        const sculpture=document.createElement("img");sculpture.className="piece-sculpture";
        sculpture.src=pieceUrl(p.type);sculpture.alt="";sculpture.draggable=false;
        token.append(sculpture);b.append(token);
      }
      fragment.append(b);
    }
    boardEl.replaceChildren(fragment);
  }
  function renderPlayers(status){
    const top=flipped?"w":"b",bottom=opposite(top);
    for(const [position,color] of [["top",top],["bottom",bottom]]){
      const name=color==="w"?"Istana Melur":"Istana Zamrud";
      $(position+"-player-caption").textContent="PIHAK "+(color==="w"?"PUTIH":"HITAM");
      $(position+"-player-name").textContent=mode==="bot"&&color==="b"?"Komputer · Zamrud":name;
      const emblem=document.querySelector("#"+position+"-player-card .player-emblem");
      emblem.className="player-emblem "+(color==="w"?"light-emblem":"dark-emblem");
      const image=emblem.querySelector("img")||document.createElement("img");
      image.src=portraitUrl("k");image.alt="";
      if(!image.parentElement)emblem.append(image);
      const statusEl=$(position+"-player-status");
      statusEl.className="player-status";
      if(status.done){
        statusEl.textContent=status.kind==="mate"&&color!==state.turn?"Menang ✦":status.kind==="mate"?"Skakmat":"Tamat";
        if(status.kind==="mate"&&color!==state.turn)statusEl.classList.add("victory");
      }else if(state.turn===color){
        statusEl.textContent=mode==="bot"&&color==="b"?"Sedang berfikir…":status.kind==="check"?"Skak!":"Sedang bermain ●";
        statusEl.classList.add(status.kind==="check"?"danger":"active");
      }else statusEl.textContent="Menanti giliran";
    }
  }
  function renderHistory(){
    $("move-count").textContent=history.length+" langkah";
    const container=$("move-history");container.replaceChildren();
    if(!history.length){
      const empty=document.createElement("div");empty.className="empty-history";
      const decorative=document.createElement("span");decorative.textContent="⌁";
      const txt=document.createElement("p");txt.innerHTML="Legenda bermula<br>daripada satu langkah.";
      empty.append(decorative,txt);container.append(empty);return;
    }
    for(let i=0;i<history.length;i+=2){
      const row=document.createElement("div");row.className="history-row";
      const no=document.createElement("span");no.className="turn-number";no.textContent=Math.floor(i/2)+1+".";
      row.append(no);
      for(const index of [i,i+1]){
        const cell=document.createElement("span");cell.className="history-move";
        if(history[index]){
          const value=history[index].label;
          if(index===history.length-1)cell.classList.add("latest");
          if(value.startsWith("♔")||value.startsWith("♕")||value.startsWith("♖")||
            value.startsWith("♗")||value.startsWith("♘")||value.startsWith("♙")||
            value.startsWith("♚")||value.startsWith("♛")||value.startsWith("♜")||
            value.startsWith("♝")||value.startsWith("♞")||value.startsWith("♟")){
            const icon=document.createElement("span");icon.className="history-glyph";icon.textContent=value[0];
            cell.append(icon,document.createTextNode(value.slice(1).trim()));
          }else cell.textContent=value;
        }
        row.append(cell);
      }
      container.append(row);
    }
    container.scrollTop=container.scrollHeight;
  }
  function render(){
    const status=positionStatus(state,positions);
    renderBoard();renderPlayers(status);renderHistory();
    $("game-status").textContent=status.message;
    $("status-strip").classList.toggle("warning",status.kind==="check"||status.kind==="mate");
    $("undo-move").disabled=!history.length;
    $("mode-label").textContent=mode==="bot"?"LAWAN KOMPUTER":"DUA PEMAIN";
    updateCinemaButton();
    document.querySelectorAll(".mode-option").forEach(btn=>{
      const chosen=btn.dataset.mode===mode;
      btn.classList.toggle("selected",chosen);btn.setAttribute("aria-pressed",String(chosen));
    });
  }
  function evaluate(s){
    let score=0;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=s.board[r][c];if(!p)continue;
      const central=(3.5-Math.abs(3.5-r))+(3.5-Math.abs(3.5-c));
      let bonus=central*(p.type==="n"||p.type==="p"?8:4);
      if(p.type==="p")bonus+=(p.color==="b"?r-1:6-r)*9;
      if(p.type==="k")bonus=-central*2;
      score+=(p.color==="b"?1:-1)*(points[p.type]+bonus);
    }
    return score;
  }
  function search(s,depth,alpha,beta){
    const legal=legalMoves(s);
    if(!legal.length)return isInCheck(s,s.turn)?(s.turn==="b"?-100000-depth:100000+depth):0;
    if(insufficient(s)||s.halfmove>=100)return 0;
    if(depth===0)return evaluate(s);
    const maximizing=s.turn==="b";
    let best=maximizing?-Infinity:Infinity;
    legal.sort((a,b)=>{
      const ta=s.board[a.to.r][a.to.c],tb=s.board[b.to.r][b.to.c];
      return (tb?points[tb.type]:0)-(ta?points[ta.type]:0);
    });
    for(const m of legal){
      const val=search(applyMove(s,m),depth-1,alpha,beta);
      if(maximizing){best=Math.max(best,val);alpha=Math.max(alpha,best)}
      else{best=Math.min(best,val);beta=Math.min(beta,best)}
      if(beta<=alpha)break;
    }
    return best;
  }
  function chooseBotMove(){
    const moves=legalMoves(state),ranked=[];
    for(const m of moves){
      const next=applyMove(state,m);
      const score=search(next,1,-Infinity,Infinity)+Math.random()*9;
      ranked.push({m,score});
    }
    ranked.sort((a,b)=>b.score-a.score);
    return ranked[0]?.m||null;
  }
  function scheduleBot(){
    stopBot();
    const current=++generation;
    botTimer=setTimeout(()=>{
      if(current!==generation||mode!=="bot"||state.turn!=="b")return;
      const move=chooseBotMove();
      if(move)commitMove(move);
    },440);
  }
  boardEl.addEventListener("click",event=>{
    const b=event.target.closest(".square");
    if(b)onSquare(Number(b.dataset.r),Number(b.dataset.c));
  });
  $("new-game").addEventListener("click",reset);
  $("undo-move").addEventListener("click",undo);
  $("cinema-toggle").addEventListener("click",()=>{
    cinemaEnabled=!cinemaEnabled;
    if(!cinemaEnabled)cancelScene();
    updateCinemaButton();persist();
  });
  $("cinema-skip").addEventListener("click",finishScene);
  $("duel-demo").addEventListener("click",()=>{
    if(cinematicBusy||!$("promotion-modal").hidden||!$("rules-modal").hidden)return;
    cinematicBusy=true;
    showScene({type:"n",color:"w"},{from:{r:7,c:6},to:{r:5,c:5}},
      {type:"p",color:"b"},{kind:"play"},null);
  });
  $("flip-board").addEventListener("click",()=>{flipped=!flipped;selected=null;options=[];render();persist()});
  document.querySelectorAll(".mode-option").forEach(btn=>btn.addEventListener("click",()=>{
    if(mode===btn.dataset.mode)return;
    mode=btn.dataset.mode;flipped=false;reset();
  }));
  $("rules-open").addEventListener("click",()=>{$("rules-modal").hidden=false;$("rules-close").focus()});
  const closeRules=()=>{$("rules-modal").hidden=true;$("rules-open").focus()};
  $("rules-close").addEventListener("click",closeRules);
  $("rules-done").addEventListener("click",closeRules);
  $("rules-modal").addEventListener("click",e=>{if(e.target===$("rules-modal"))closeRules()});
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!$("rules-modal").hidden)closeRules();
  });
  restore();
  if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)cinemaEnabled=false;
  render();
  if(mode==="bot"&&state.turn==="b"&&!positionStatus(state,positions).done)scheduleBot();
})();
