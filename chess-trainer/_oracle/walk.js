const fs=require('fs');
const path=require('path');
const {Chess}=require(path.join(__dirname,'node_modules','chess.js'));
const h=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const eng=h.split('<script>')[1].split('/* ================= 界面层')[0];
const helpers=`
function fenToState(fen){
  const p=fen.split(' '), rows=p[0].split('/');
  const b=new Array(64).fill(0), mp={'P':P,'N':N,'B':B,'R':R,'Q':Q,'K':K};
  for(let ri=0;ri<8;ri++){
    let f=0;
    for(const ch of rows[ri]){
      if(ch>='1'&&ch<='8'){f+=+ch;continue;}
      const up=ch===ch.toUpperCase();
      b[(7-ri)*8+f]=(up?WHITE:BLACK)|mp[ch.toUpperCase()]; f++;
    }
  }
  const castle=(p[2].includes('K')?1:0)|(p[2].includes('Q')?2:0)|(p[2].includes('k')?4:0)|(p[2].includes('q')?8:0);
  let ep=-1;
  if(p[3]!=='-')ep=(+p[3][1]-1)*8+(p[3].charCodeAt(0)-97);
  return{b,turn:p[1]==='w'?WHITE:BLACK,castle,ep,half:+p[4]||0,full:+p[5]||1};
}
function stToFen(st){
  const chars=['','p','n','b','r','q','k'];
  let rows=[];
  for(let r=7;r>=0;r--){
    let row='',run=0;
    for(let f=0;f<8;f++){
      const pc=st.b[r*8+f];
      if(!pc){run++;continue;}
      if(run){row+=run;run=0;}
      const ch=chars[pieceOf(pc)];
      row+=(colorOf(pc)===WHITE?ch.toUpperCase():ch);
    }
    if(run)row+=run;
    rows.push(row);
  }
  let castle='';
  if(st.castle&1)castle+='K'; if(st.castle&2)castle+='Q'; if(st.castle&4)castle+='k'; if(st.castle&8)castle+='q';
  if(!castle)castle='-';
  const ep=st.ep>=0?FILES[st.ep&7]+((st.ep>>3)+1):'-';
  return rows.join('/')+' '+(st.turn===WHITE?'w':'b')+' '+castle+' '+ep;
}
const A={name(i){return FILES[i&7]+((i>>3)+1);},moves(st){return legalMoves(st);},apply(st,m,promo){return applyMove(st,m,promo||Q,false);}};
`;
const walker=`
const KIWI='r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
function core(fen){return fen.split(' ').slice(0,4).join(' ');}
let diffN=0;
const root=fenToState(KIWI);
const c0=new Chess(KIWI);
for(const m of A.moves(root)){
  const ck=new Chess(c0.fen());
  const okMove=ck.moves({verbose:true}).some(x=>x.from===A.name(m.f)&&x.to===A.name(m.t));
  if(!okMove)continue;
  ck.move({from:A.name(m.f),to:A.name(m.t)});
  const n1=A.apply(root,m);
  const f1e=stToFen(n1), f1c=core(ck.fen());
  if(f1e!==f1c){diffN++;console.log('PLY1 DIFF '+A.name(m.f)+A.name(m.t)+'\\n  E:'+f1e+'\\n  C:'+f1c);continue;}
  for(const b of A.moves(n1)){
    const ck2=new Chess(ck.fen());
    const ok2=ck2.moves({verbose:true}).some(x=>x.from===A.name(b.f)&&x.to===A.name(b.t));
    if(!ok2)continue;
    ck2.move({from:A.name(b.f),to:A.name(b.t)});
    const n2=A.apply(n1,b);
    const f2e=stToFen(n2), f2c=core(ck2.fen());
    if(f2e!==f2c){diffN++;console.log('PLY2 DIFF '+A.name(m.f)+A.name(m.t)+' '+A.name(b.f)+A.name(b.t)+'\\n  E:'+f2e+'\\n  C:'+f2c);}
  }
}
console.log('total state diffs: '+diffN);
`;
new Function('Chess',eng+helpers+walker)(Chess);
