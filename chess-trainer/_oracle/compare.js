const fs=require('fs');
const path=require('path');
const {Chess}=require(path.join(__dirname,'node_modules','chess.js'));
const h=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
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
  return rows.join('/')+' '+(st.turn===WHITE?'w':'b')+' '+castle+' '+ep+' '+st.half+' '+st.full;
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
globalThis.__api={
  root(fen){const st=fenToState(fen);return{st,m:legalMoves(st)};},
  perft(fen,d){return perft(fenToState(fen),d);},
  toName(i){return FILES[i&7]+((i>>3)+1);},
  stToFen
};
`;
new Function(eng+body)();
const A=globalThis.__api;
function cjsPerft(fen,d){
  const c=new Chess(fen);
  function r(dd){
    if(dd===0)return 1;
    let n=0;
    for(const mv of c.moves({verbose:true})){
      c.move({from:mv.from,to:mv.to,promotion:mv.promotion||'q'});
      n+=r(dd-1);
      c.undo();
    }
    return n;
  }
  return r(d);
}
const RUNS=[
 ['Start',4],
 ['Kiwipete',3],
 ['Pos6',2],
 ['Pos6',3],
 ['Pos4',3],
 ['Pos3',3],
];
const FEN={
 Start:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 Kiwipete:'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
 Pos3:'8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
 Pos4:'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
 Pos6:'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
};
for(const[name,d]of RUNS){
  const t0=Date.now();
  const ce=cjsPerft(FEN[name],d);
  const ee=A.perft(FEN[name],d);
  console.log('['+name+'] d'+d+' engine='+ee+' chess.js='+ce+' '+(ce===ee?'SAME':'DIFF')+' ('+(Date.now()-t0)+'ms)');
}
