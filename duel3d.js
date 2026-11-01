/* Catur Warisan — texture-rich carved-piece reliefs in a WebGL battle theatre. */
(() => {
  "use strict";
  const canvas = document.getElementById("duel3d-canvas");
  if (!canvas) return;
  canvas.dataset.loaded="true";
  const carvings={k:"raja",q:"permaisuri",r:"benteng",b:"bendahara",n:"hulubalang",p:"perajurit"};
  const sourceArt={};
  for(const [type,name] of Object.entries(carvings)){
    const img=new Image();img.decoding="async";
    const item={img,ready:false,failed:false};sourceArt[type]=item;
    img.onload=()=>{item.ready=true};img.onerror=()=>{item.failed=true};
    img.src="./assets/pieces/"+name+".webp";
  }
  const PI = Math.PI;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const smooth = (a,b,x) => {const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
  const mix = (a,b,t) => a+(b-a)*t;
  const I = () => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function mm(a,b){
    const o=new Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return o;
  }
  const tr=(x=0,y=0,z=0)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
  const sc=(x=1,y=1,z=1)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];
  const rx=a=>{const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]};
  const ry=a=>{const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]};
  const rz=a=>{const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]};
  const move=(base,x=0,y=0,z=0)=>mm(base,tr(x,y,z));
  const rotate=(base,x=0,y=0,z=0)=>mm(mm(mm(base,ry(y)),rx(x)),rz(z));
  const vec=(x,y,z)=>[x,y,z];
  const sub=(a,b)=>vec(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>vec(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);
  const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n)};
  function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]}
  function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}

  function makeBox(){
    const v=[];const faces=[
      [[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
      [[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]],
      [[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],
      [[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],
      [[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],
      [[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]
    ];
    for(const [n,a,b,c,d] of faces)for(const p of [a,b,c,a,c,d])v.push(...p,...n);
    return v;
  }
  function makeCylinder(top=1,bottom=1,segments=18){
    const v=[];const put=(p,n)=>v.push(...p,...n);
    for(let i=0;i<segments;i++){
      const a=i*2*PI/segments,b=(i+1)*2*PI/segments;
      const xa=Math.cos(a),za=Math.sin(a),xb=Math.cos(b),zb=Math.sin(b);
      const na=norm([xa,(bottom-top)*.7,za]),nb=norm([xb,(bottom-top)*.7,zb]);
      const A=[xa*bottom,-.5,za*bottom],B=[xb*bottom,-.5,zb*bottom],C=[xb*top,.5,zb*top],D=[xa*top,.5,za*top];
      put(A,na);put(B,nb);put(C,nb);put(A,na);put(C,nb);put(D,na);
      for(const p of [[0,.5,0],[xb*top,.5,zb*top],[xa*top,.5,za*top]])put(p,[0,1,0]);
      for(const p of [[0,-.5,0],A,B])put(p,[0,-1,0]);
    }
    return v;
  }
  function makeSphere(lat=10,lng=16){
    const v=[];const p=(u,w)=>{const a=u*2*PI,b=w*PI;return [Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)]};
    for(let y=0;y<lat;y++)for(let x=0;x<lng;x++){
      const a=p(x/lng,y/lat),b=p((x+1)/lng,y/lat),c=p((x+1)/lng,(y+1)/lat),d=p(x/lng,(y+1)/lat);
      for(const n of [a,b,c,a,c,d])v.push(...n,...n);
    }
    return v;
  }
  function makeTorus(){
    const v=[];const R=1,r=.16,around=24,tube=8;
    const p=(a,b)=>{const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);return [[(R+r*cb)*ca,r*sb,(R+r*cb)*sa],[cb*ca,sb,cb*sa]]};
    for(let i=0;i<around;i++)for(let j=0;j<tube;j++){
      const a=p(i*2*PI/around,j*2*PI/tube),b=p((i+1)*2*PI/around,j*2*PI/tube),c=p((i+1)*2*PI/around,(j+1)*2*PI/tube),d=p(i*2*PI/around,(j+1)*2*PI/tube);
      for(const q of [a,b,c,a,c,d])v.push(...q[0],...q[1]);
    }
    return v;
  }
  function makeKeris(){
    const path=[[0,.0,.14],[.06,.23,.12],[-.04,.46,.105],[.095,.69,.09],[-.03,.9,.07],[.05,1.1,.04],[0,1.35,0]];
    const v=[];const front=[0,0,1],back=[0,0,-1];
    for(let i=0;i<path.length-1;i++){
      const [x0,y0,w0]=path[i],[x1,y1,w1]=path[i+1];
      const quad=[ [x0-w0,y0,.035],[x0+w0,y0,.035],[x1+w1,y1,.035],[x1-w1,y1,.035] ];
      for(const q of [quad[0],quad[1],quad[2],quad[0],quad[2],quad[3]])v.push(...q,...front);
      const q2=quad.map(q=>[q[0],q[1],-.035]);
      for(const q of [q2[2],q2[1],q2[0],q2[3],q2[2],q2[0]])v.push(...q,...back);
      for(const [a,b,n] of [[0,3,[-1,0,0]],[2,1,[1,0,0]]]){
        for(const q of [quad[a],quad[b],q2[b],quad[a],q2[b],q2[a]])v.push(...q,...n);
      }
    }
    return v;
  }

  let gl=null,program=null,geos={},loc={},frame=0,drag=0,active=null,ready=false;
  const reliefs={};
  const colors={
    ivory:[.93,.83,.61],cream:[1,.95,.78],gold:[.95,.67,.29],lightGold:[1,.81,.43],jade:[.10,.50,.39],teal:[.08,.29,.29],
    teak:[.27,.15,.13],bronze:[.70,.42,.21],copper:[.80,.53,.30],obsidian:[.13,.18,.18],maroon:[.40,.15,.17],
    night:[.035,.12,.13],stone:[.10,.22,.22],floor:[.09,.23,.22],darkFloor:[.045,.135,.14],shimmer:[1,.90,.58],
    steel:[.82,.90,.86],skin:[.73,.53,.34],shadow:[.025,.08,.09]
  };
  function compile(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh}
  function init(){
    if(ready)return true;
    try{
      gl=canvas.getContext("webgl",{alpha:true,antialias:true,preserveDrawingBuffer:false,powerPreference:"default"});
      if(!gl){canvas.dataset.status="no-webgl";return false}
      const vs=`attribute vec3 aP; attribute vec3 aN; attribute vec2 aUV; uniform mat4 uM; uniform mat4 uVP; varying vec3 vN; varying vec2 vUV; varying float vDepth;
        void main(){vec4 w=uM*vec4(aP,1.);vN=normalize(mat3(uM)*aN);vUV=aUV;vec4 p=uVP*w;vDepth=p.w;gl_Position=p;}`;
      const fs=`precision mediump float; varying vec3 vN; varying vec2 vUV; varying float vDepth; uniform vec3 uC; uniform vec3 uTint; uniform float uGlow; uniform float uTextured; uniform sampler2D uSampler;
        void main(){vec4 tex=texture2D(uSampler,vUV);if(uTextured>.5&&tex.a<.13)discard;
          vec3 n=normalize(vN);vec3 key=normalize(vec3(-.35,.9,1.));float diff=max(dot(n,key),0.);float fill=max(dot(n,normalize(vec3(.8,.35,-1.))),0.);
          float rim=pow(1.-abs(dot(n,normalize(vec3(.0,.30,.95)))),2.);
          vec3 base=uTextured>.5?tex.rgb*uTint:uC;
          vec3 lit=base*(.59+diff*.35+fill*.19)+vec3(1.,.77,.42)*rim*.08;
          lit+=base*uGlow*.34;float fog=smoothstep(9.,23.,vDepth);lit=mix(lit,vec3(.025,.075,.09),fog*.30);gl_FragColor=vec4(lit,1.);}`;
      program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      for(const n of ["aP","aN","aUV"])loc[n]=gl.getAttribLocation(program,n);
      for(const n of ["uM","uVP","uC","uTint","uGlow","uTextured","uSampler"])loc[n]=gl.getUniformLocation(program,n);
      gl.uniform1i(loc.uSampler,0);
      const build=(name,data)=>{const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);geos[name]={buf,count:data.length/6}};
      build("box",makeBox());build("sphere",makeSphere());build("disk",makeCylinder());build("cone",makeCylinder(0,1));build("flared",makeCylinder(.72,1));build("inverted",makeCylinder(1,.72));build("torus",makeTorus());build("keris",makeKeris());
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
      canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();ready=false;stop();for(const type of Object.keys(reliefs))delete reliefs[type]},{passive:false});
      ready=true;canvas.dataset.status="ready";return true;
    }catch(e){console.warn("Arena 3D unavailable",e);canvas.dataset.status="error:"+String(e).slice(0,180);gl=null;ready=false;return false}
  }
  function mesh(name,color,parent,x=0,y=0,z=0,sx=1,sy=1,sz=1,ax=0,ay=0,az=0,glow=0){
    if(!gl)return;
    const geometry=geos[name];let m=move(parent,x,y,z);
    if(ax||ay||az)m=rotate(m,ax,ay,az);
    m=mm(m,sc(sx,sy,sz));
    gl.bindBuffer(gl.ARRAY_BUFFER,geometry.buf);
    gl.vertexAttribPointer(loc.aP,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(loc.aP);
    gl.vertexAttribPointer(loc.aN,3,gl.FLOAT,false,24,12);gl.enableVertexAttribArray(loc.aN);
    gl.disableVertexAttribArray(loc.aUV);gl.vertexAttrib2f(loc.aUV,0,0);
    gl.uniformMatrix4fv(loc.uM,false,m);
    gl.uniform1f(loc.uTextured,0);
    gl.uniform3fv(loc.uC,color);gl.uniform1f(loc.uGlow,glow);
    gl.drawArrays(gl.TRIANGLES,0,geometry.count);
  }
  // The sculpted figures are rebuilt as textured, volumetric relief meshes.
  // This retains every painted Malay carving detail instead of replacing it
  // with crude geometric mannequins.
  function ensureRelief(type){
    if(reliefs[type])return reliefs[type];
    const source=sourceArt[type];if(!source?.ready||!gl)return null;
    const width=72,height=108,off=document.createElement("canvas");
    off.width=width;off.height=height;
    const ctx=off.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(source.img,0,0,width,height);
    const pixels=ctx.getImageData(0,0,width,height).data;
    const alpha=(x,y)=>pixels[(clamp(y,0,height-1)*width+clamp(x,0,width-1))*4+3];
    const mask=new Uint8Array(width*height),dist=new Float32Array(width*height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;mask[i]=alpha(x,y)>55?1:0;
      dist[i]=mask[i]?99:0;
    }
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=y*width+x;if(!mask[i])continue;
      if(x)dist[i]=Math.min(dist[i],dist[i-1]+1);
      if(y)dist[i]=Math.min(dist[i],dist[i-width]+1);
      if(x&&y)dist[i]=Math.min(dist[i],dist[i-width-1]+1.414);
      if(x<width-1&&y)dist[i]=Math.min(dist[i],dist[i-width+1]+1.414);
    }
    for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
      const i=y*width+x;if(!mask[i])continue;
      if(x<width-1)dist[i]=Math.min(dist[i],dist[i+1]+1);
      if(y<height-1)dist[i]=Math.min(dist[i],dist[i+width]+1);
      if(x<width-1&&y<height-1)dist[i]=Math.min(dist[i],dist[i+width+1]+1.414);
      if(x&&y<height-1)dist[i]=Math.min(dist[i],dist[i+width-1]+1.414);
    }
    const depth=(x,y)=>.045+.015*Math.min(18,dist[clamp(y,0,height-1)*width+clamp(x,0,width-1)]);
    const vertex=(x,y,back=false)=>{
      const px=(x/width-.5)*2.18,py=(1-y/height)*3.54;
      const z=back?-.07:depth(x,y);
      const nx=back?0:-(depth(x+1,y)-depth(x-1,y))/(4.36/width);
      const ny=back?0:(depth(x,y+1)-depth(x,y-1))/(7.08/height);
      const normal=norm([nx,ny,back?-1:1]);
      return [px,py,z,...normal,x/width,1-y/height];
    };
    const data=[];
    for(let y=0;y<height-1;y++)for(let x=0;x<width-1;x++){
      if(!(mask[y*width+x]||mask[y*width+x+1]||mask[(y+1)*width+x]||mask[(y+1)*width+x+1]))continue;
      const a=vertex(x,y),b=vertex(x+1,y),c=vertex(x+1,y+1),d=vertex(x,y+1);
      data.push(...a,...d,...b,...b,...d,...c);
      // A matching rear shell gives the carving thickness under side lighting.
      const A=vertex(x,y,true),B=vertex(x+1,y,true),C=vertex(x+1,y+1,true),D=vertex(x,y+1,true);
      data.push(...A,...B,...D,...B,...C,...D);
    }
    if(data.length<300)return null;
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source.img);
    reliefs[type]={buffer,count:data.length/8,tex};
    return reliefs[type];
  }
  function sculpture(type,color,x,tilt,lean,sink,impact){
    const relief=reliefs[type];if(!relief)return;
    let root=move(I(),x,-sink*.25,0);
    root=rotate(root,lean*.09+(color==="w"?-.025:.025),color==="w"?-.15:.16,tilt);
    const stance=move(root,0,.025+Math.sin(impact*10)*.015,0);
    const baseColor=color==="w"?colors.gold:colors.bronze;
    mesh("torus",baseColor,I(),x,-.08,.07,.60,.036,.52,0,0,0,.14);
    gl.bindBuffer(gl.ARRAY_BUFFER,relief.buffer);
    gl.vertexAttribPointer(loc.aP,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(loc.aP);
    gl.vertexAttribPointer(loc.aN,3,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(loc.aN);
    gl.vertexAttribPointer(loc.aUV,2,gl.FLOAT,false,32,24);gl.enableVertexAttribArray(loc.aUV);
    gl.uniformMatrix4fv(loc.uM,false,stance);
    gl.uniform3fv(loc.uTint,color==="w"?[1.06,1.03,.97]:[.64,.50,.46]);
    gl.uniform1f(loc.uTextured,1);gl.uniform1f(loc.uGlow,impact*.12);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,relief.tex);
    gl.drawArrays(gl.TRIANGLES,0,relief.count);
    gl.disableVertexAttribArray(loc.aUV);
  }
  function arena(t){
    const base=I();
    mesh("disk",colors.shadow,base,0,-.40,0,6.9,.18,6.9);
    mesh("disk",colors.stone,base,0,-.31,0,5.5,.19,5.5);
    mesh("torus",colors.gold,base,0,-.205,0,5.2,.065,5.2,0,0,0,.25);
    mesh("torus",colors.jade,base,0,-.205,0,4.9,.05,4.9,0,0,0,.35);
    for(let x=-5;x<=5;x++)for(let z=-3;z<=3;z++){
      const tone=(x+z)%2===0?colors.floor:colors.darkFloor;
      mesh("box",tone,base,x*.81,-.19,z*.79,.8,.046,.78);
    }
    for(let i=0;i<8;i++){
      const a=i*PI/4+t*.03;
      mesh("box",colors.gold,base,Math.cos(a)*3.35,-.136,Math.sin(a)*2.4,.34,.026,.10,0,-a,0,.16);
    }
    for(const x of [-4.6,4.6])for(const z of [-2.8,2.8]){
      const pillar=move(base,x,.9,z);
      mesh("disk",colors.teak,pillar,0,-.90,0,.65,.22,.65);
      mesh("disk",colors.bronze,pillar,0,-.72,0,.55,.18,.55);
      mesh("disk",colors.stone,pillar,0,.02,0,.34,1.65,.34);
      mesh("disk",colors.gold,pillar,0,.91,0,.48,.16,.48);
      mesh("cone",colors.gold,pillar,0,1.33,0,.49,.75,.49);
    }
    // Golden palace gateway behind the fighters, all geometry has real depth.
    for(const x of [-3.2,3.2]){
      mesh("box",colors.teak,base,x,1.25,-2.8,.52,2.7,.55);
      mesh("box",colors.bronze,base,x,2.55,-2.8,.64,.18,.7);
      mesh("cone",colors.gold,base,x,2.88,-2.8,.55,.57,.55);
    }
    mesh("box",colors.teak,base,0,2.62,-2.8,7,.46,.8);
    mesh("box",colors.gold,base,0,2.84,-2.8,7.25,.15,.89);
    for(let i=-3;i<=3;i++)mesh("cone",colors.bronze,base,i*1.02,3.22,-2.8,.37,.56,.41);
  }
  function fighter(type,color,x,rotation,attack,bob,impact){
    const light=color==="w";
    const body=light?colors.ivory:colors.teak;
    const metal=light?colors.gold:colors.bronze;
    const trim=light?colors.lightGold:colors.copper;
    const cloth=light?colors.jade:colors.maroon;
    const dark=light?colors.teal:colors.obsidian;
    let root=move(I(),x,-impact*.30,0);
    root=rotate(root,0,light?-.22:.25,rotation);
    root=move(root,0,bob,0);
    mesh("disk",dark,root,0,.13,0,.71,.23,.71);
    mesh("disk",metal,root,0,.26,0,.69,.065,.69);
    mesh("disk",body,root,0,.36,0,.55,.13,.55);
    mesh("torus",trim,root,0,.43,0,.46,.065,.46);
    mesh("flared",body,root,0,.76,0,.43,.72,.40);
    mesh("disk",cloth,root,0,.96,0,.47,.12,.43);
    for(let i=0;i<7;i++){
      const a=i*2*PI/7;
      mesh("box",trim,root,Math.cos(a)*.39,.72,Math.sin(a)*.36,.035,.48,.045,0,-a,0);
    }
    mesh("inverted",body,root,0,1.54,0,.48,.91,.34);
    mesh("disk",metal,root,0,1.21,0,.50,.15,.40);
    mesh("box",trim,root,0,1.69,.31,.24,.43,.045,0,0,-.6);
    mesh("box",metal,root,.15,1.75,.325,.15,.36,.06,0,0,.56);
    mesh("sphere",metal,root,0,1.83,.0,.21,.22,.21);
    // Upper-body relief and shoulders are sculpted, not flat portraits.
    for(const side of [-1,1]){
      mesh("sphere",metal,root,side*.48,1.83,0,.27,.21,.29);
      const armAngle=side===1?attack*.95:-attack*.15;
      const arm=rotate(move(root,side*.47,1.76,0),0,0,side*(-.3)+armAngle);
      mesh("flared",body,arm,side*.09,-.34,0,.20,.69,.21);
      mesh("disk",trim,arm,side*.13,-.64,0,.18,.1,.18);
      mesh("sphere",light?colors.cream:colors.copper,arm,side*.13,-.73,0,.15,.16,.15);
    }
    mesh("disk",trim,root,0,2.15,0,.18,.22,.18);
    mesh("sphere",light?colors.cream:colors.copper,root,0,2.43,.05,.30,.39,.27);
    mesh("sphere",dark,root,0,2.52,.302,.18,.10,.024);
    mesh("box",metal,root,0,2.79,.02,.48,.085,.48);
    if(type==="k"){
      mesh("cone",metal,root,0,3.15,0,.51,.74,.42,0,.0,.13);
      for(const s of [-1,1])mesh("cone",trim,root,s*.37,3.06,0,.32,.7,.21,0,0,s*.75);
      mesh("sphere",colors.shimmer,root,0,3.27,.30,.12,.17,.08,0,0,0,.45);
      mesh("torus",trim,root,0,1.29,0,.36,.047,.36);
    }else if(type==="q"){
      mesh("cone",trim,root,0,3.04,0,.33,.58,.33);
      for(let i=0;i<7;i++){
        const a=i*2*PI/7;
        mesh("cone",metal,root,Math.cos(a)*.27,3.04,Math.sin(a)*.27,.145,.55,.145);
      }
      mesh("sphere",colors.shimmer,root,0,3.35,0,.14,.14,.14,0,0,0,.55);
      for(const s of [-1,1])mesh("box",trim,root,s*.34,1.10,.07,.07,1.35,.07,0,0,s*.18);
    }else if(type==="r"){
      mesh("box",metal,root,0,3.02,0,.80,.41,.69);
      for(const a of [-.29,0,.29])mesh("box",trim,root,a,3.33,.0,.20,.30,.73);
      mesh("box",dark,root,0,3.02,.36,.16,.23,.03);
      mesh("box",metal,root,0,2.08,.42,.56,.16,.14);
    }else if(type==="b"){
      mesh("sphere",trim,root,0,2.90,0,.43,.27,.38);
      mesh("cone",metal,root,0,3.16,0,.36,.47,.31);
      mesh("sphere",colors.shimmer,root,0,3.36,0,.09,.11,.09,0,0,0,.32);
      mesh("box",trim,root,0,1.62,.40,.07,.54,.04,0,0,PI/4);
    }else if(type==="n"){
      mesh("cone",metal,root,0,3.10,0,.37,.63,.37,0,0,-.16);
      mesh("box",trim,root,0,3.06,.23,.13,.40,.11,0,0,.46);
      mesh("sphere",body,root,0,2.91,.30,.22,.23,.39);
      for(const s of [-1,1])mesh("cone",trim,root,s*.30,2.94,.04,.14,.38,.20,0,0,s*.20);
    }else{
      mesh("cone",metal,root,0,2.94,0,.37,.43,.38);
      mesh("box",trim,root,0,2.84,.34,.39,.095,.10);
    }
    // Each warrior carries a three-dimensional hilt and wavy keris blade.
    const weapon=rotate(move(root,.62,1.10,.20),0,0,-.30-attack*1.70);
    mesh("disk",dark,weapon,0,-.04,0,.10,.35,.10,0,0,.03);
    mesh("box",metal,weapon,0,.10,0,.50,.09,.17);
    mesh("keris",colors.steel,weapon,0,.28,0,.90,1.18,.90,0,0,0,.10+attack*.30);
    mesh("sphere",trim,weapon,0,-.28,0,.12,.13,.12);
    // Defensive perisai, detailed with a gilded central boss.
    mesh("sphere",dark,root,-.68,1.31,.25,.38,.54,.14,0,0,-.17);
    mesh("torus",metal,root,-.68,1.31,.40,.30,.045,.43,0,0,-.17);
    mesh("sphere",trim,root,-.68,1.31,.42,.12,.14,.08);
  }
  function effects(t,hit){
    if(t<.47||t>.88)return;
    const n=26;const intensity=(1-smooth(.56,.86,t))*smooth(.47,.53,t);
    for(let i=0;i<n;i++){
      const angle=i*2.399963,rad=(.3+i/n*1.65)*smooth(.49,.8,t);
      const x=.58+Math.cos(angle)*rad,y=1.65+Math.sin(angle)*rad*.85,z=Math.sin(i*4.7)*.55;
      const size=(.045+(i%5)*.014)*intensity;
      mesh("box",i%3?colors.shimmer:colors.steel,I(),x,y,z,size,size*3,size,0,0,angle,1.3*intensity);
    }
    const ring=smooth(.48,.72,t);
    if(ring<1)mesh("torus",colors.shimmer,I(),.6,1.64,0,ring*2.2,.055*(1-ring),ring*1.8,PI/2,0,0,1.4*(1-ring));
  }
  function render(now){
    if(!active||!gl)return;
    const t=clamp((now-active.start)/active.duration,0,1);
    const dpr=Math.min(window.devicePixelRatio||1,1.8);
    const width=canvas.clientWidth,height=canvas.clientHeight;
    if(width<1||height<1){frame=requestAnimationFrame(render);return}
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
    const aspect=w/h,mobile=aspect<.82;
    const fov=mobile?PI*.335:PI*.255;
    const eye=[Math.sin(t*2.2+drag)*.65,3.15+Math.sin(t*1.7)*.13,mobile?9.6:8.05];
    const view=lookAt(eye,[0,1.50,0]);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniformMatrix4fv(loc.uVP,false,mm(perspective(fov,aspect,.08,70),view));
    arena(t);
    const arrive=smooth(0,.18,t);
    const leap=smooth(.32,.50,t);
    const recover=smooth(.53,.68,t);
    const tilt=smooth(.54,.84,t)*1.48;
    const sink=smooth(.65,.93,t);
    const attackerX=mix(-2.08,-1.36,arrive)+leap*1.57-recover*.43;
    const defenderX=mix(2.13,1.40,arrive)+smooth(.52,.78,t)*.66;
    const attackerWeapon=smooth(.23,.35,t)*-.82+smooth(.35,.55,t)*1.95-smooth(.55,.76,t)*.60;
    sculpture(active.attacker.type,active.attacker.color,attackerX,
      .05*Math.sin(t*8)-leap*.13,attackerWeapon,0,t);
    sculpture(active.defender.type,active.defender.color,defenderX,-tilt,0,sink,t);
    effects(t);
    if(t<1)frame=requestAnimationFrame(render);else frame=0;
  }
  function start(attacker,defender,duration=4200){
    stop();if(!sourceArt[attacker.type]?.ready||!sourceArt[defender.type]?.ready)return false;
    if(!init()||!ensureRelief(attacker.type)||!ensureRelief(defender.type))return false;
    drag=0;active={attacker,defender,duration,start:performance.now()};
    frame=requestAnimationFrame(render);return true;
  }
  function stop(){
    if(frame)cancelAnimationFrame(frame);frame=0;active=null;
    if(gl){gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)}
  }
  let initialX=null;
  canvas.addEventListener("pointerdown",e=>{initialX=e.clientX;canvas.setPointerCapture?.(e.pointerId)});
  canvas.addEventListener("pointermove",e=>{if(initialX!==null){drag=clamp(drag+(e.clientX-initialX)*.007,-1.2,1.2);initialX=e.clientX}});
  canvas.addEventListener("pointerup",()=>{initialX=null});
  canvas.addEventListener("pointercancel",()=>{initialX=null});
  window.CaturDuel3D={start,stop};
})();
