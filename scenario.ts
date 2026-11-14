// The forge only needs the seeded viewer identity. Keep the derivation isolated from fixture data.
const seed = 0x6a09e667f3bcc909n, mask = 0xffffffffffffffffn;
const firsts = ['ada','bram','cora','dmitri','elena','felix','greta','hugo','iris','jonas','kira','lars','mira','nico','olga','pavel','quinn','rosa','sven','tess','ulla','vito','wren','yara','zane'];
const lasts = ['anders','bauer','costa','dahl','eriksen','fischer','garcia','holm','iversen','jansen','keller','lind','moreau','novak','olsen','peters','quist','rossi','sato','turi','ulrich','vega','weber','xu','yilmaz','zimmer'];
function fnv(s:string){let h=0xcbf29ce484222325n;for(let i=0;i<s.length;i++){h^=BigInt(s.charCodeAt(i));h=h*0x100000001b3n&mask}return h}
function mix(v:bigint){let z=v+0x9e3779b97f4a7c15n&mask;z=(z^z>>30n)*0xbf58476d1ce4e5b9n&mask;z=(z^z>>27n)*0x94d049bb133111ebn&mask;return(z^z>>31n)&mask}
function viewer(){let state=mix(seed^fnv('users'));const pick=(n:number)=>{for(;;){let x=state;x=(x^x>>12n)&mask;x=(x^x<<25n)&mask;x=(x^x>>27n)&mask;state=x;const v=Number((x*0x2545f4914f6cdd1dn&mask)>>32n);const limit=4294967296-(4294967296%n);if(v<limit)return v%n}};const first=firsts[pick(firsts.length)],last=lasts[pick(lasts.length)],login=`${first}${last}`;return {login,name:`${first} ${last}`,email:`${login}@example.invalid`}}
export const scenario={viewer:viewer()};
