const fs=require('fs');
const h=fs.readFileSync('f:/test/chess-trainer/index.html','utf8');
const eng=h.split('<script>')[1].split('/* ================= 界面层')[0];
const body=`
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
function perft(st,d){
  if(d===0)return 1;
  let n=0;
  for(const m of legalMoves(st)){
    const promoP=((st.b[m.f]&7)===P)&&(m.t>>3)===((colorOf(st.b[m.f])===WHITE)?7:0);
    if(promoP){for(const pn of[Q,R,B,N])n+=perft(applyMove(st,m,pn,false),d-1);}
    else n+=perft(applyMove(st,m,Q,false),d-1);
  }
  return n;
}
const T=[
 ['Start', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',[20,400,8902,197281]],
 ['Kiwipete','r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',[48,2039,97862]],
 ['Pos3','8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',[14,191,2812,43238]],
 ['Pos4','r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',[6,264,9467]],
 ['Pos5','rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',[44,1486]],
 ['Pos6','r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',[46,2079,89890]],
];
let fails=0;
for(const[name,fen,exp]of T){
  const st=fenToState(fen);
  for(let d=1;d<=exp.length;d++){
    const t0=Date.now(), got=perft(st,d);
    const ok=got===exp[d-1];
    if(!ok)fails++;
    console.log((ok?'PASS':'FAIL')+' ['+name+'] d'+d+' perft='+got+' expect='+exp[d-1]+' ('+(Date.now()-t0)+'ms)');
  }
}
if(!fails)console.log('ALL PERFT PASS');
`;
try{new Function(eng+body)();}catch(e){console.error('ERR '+(e.stack||e.message));process.exit(1);}
process.exit(0);
