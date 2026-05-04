"use strict";(()=>{var At=Object.create;var je=Object.defineProperty;var Ct=Object.getOwnPropertyDescriptor;var It=Object.getOwnPropertyNames;var St=Object.getPrototypeOf,Et=Object.prototype.hasOwnProperty;var Bt=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);var Tt=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of It(e))!Et.call(r,s)&&s!==t&&je(r,s,{get:()=>e[s],enumerable:!(n=Ct(e,s))||n.enumerable});return r};var Pt=(r,e,t)=>(t=r!=null?At(St(r)):{},Tt(e||!r||!r.__esModule?je(t,"default",{value:r,enumerable:!0}):t,r));var ct=Bt((ot,at)=>{var it=(function(){var r=function(A,E){var v=236,w=17,l=A,b=t[E],a=null,o=0,x=null,h=[],y={},_=function(u,p){o=l*4+17,a=(function(d){for(var f=new Array(d),g=0;g<d;g+=1){f[g]=new Array(d);for(var B=0;B<d;B+=1)f[g][B]=null}return f})(o),N(0,0),N(o-7,0),N(0,o-7),W(),O(),V(u,p),l>=7&&Q(u),x==null&&(x=Ie(l,b,h)),G(x,p)},N=function(u,p){for(var d=-1;d<=7;d+=1)if(!(u+d<=-1||o<=u+d))for(var f=-1;f<=7;f+=1)p+f<=-1||o<=p+f||(0<=d&&d<=6&&(f==0||f==6)||0<=f&&f<=6&&(d==0||d==6)||2<=d&&d<=4&&2<=f&&f<=4?a[u+d][p+f]=!0:a[u+d][p+f]=!1)},H=function(){for(var u=0,p=0,d=0;d<8;d+=1){_(!0,d);var f=s.getLostPoint(y);(d==0||u>f)&&(u=f,p=d)}return p},O=function(){for(var u=8;u<o-8;u+=1)a[u][6]==null&&(a[u][6]=u%2==0);for(var p=8;p<o-8;p+=1)a[6][p]==null&&(a[6][p]=p%2==0)},W=function(){for(var u=s.getPatternPosition(l),p=0;p<u.length;p+=1)for(var d=0;d<u.length;d+=1){var f=u[p],g=u[d];if(a[f][g]==null)for(var B=-2;B<=2;B+=1)for(var R=-2;R<=2;R+=1)B==-2||B==2||R==-2||R==2||B==0&&R==0?a[f+B][g+R]=!0:a[f+B][g+R]=!1}},Q=function(u){for(var p=s.getBCHTypeNumber(l),d=0;d<18;d+=1){var f=!u&&(p>>d&1)==1;a[Math.floor(d/3)][d%3+o-8-3]=f}for(var d=0;d<18;d+=1){var f=!u&&(p>>d&1)==1;a[d%3+o-8-3][Math.floor(d/3)]=f}},V=function(u,p){for(var d=b<<3|p,f=s.getBCHTypeInfo(d),g=0;g<15;g+=1){var B=!u&&(f>>g&1)==1;g<6?a[g][8]=B:g<8?a[g+1][8]=B:a[o-15+g][8]=B}for(var g=0;g<15;g+=1){var B=!u&&(f>>g&1)==1;g<8?a[8][o-g-1]=B:g<9?a[8][15-g-1+1]=B:a[8][15-g-1]=B}a[o-8][8]=!u},G=function(u,p){for(var d=-1,f=o-1,g=7,B=0,R=s.getMaskFunction(p),P=o-1;P>0;P-=2)for(P==6&&(P-=1);;){for(var L=0;L<2;L+=1)if(a[f][P-L]==null){var K=!1;B<u.length&&(K=(u[B]>>>g&1)==1);var U=R(f,P-L);U&&(K=!K),a[f][P-L]=K,g-=1,g==-1&&(B+=1,g=7)}if(f+=d,f<0||o<=f){f-=d,d=-d;break}}},te=function(u,p){for(var d=0,f=0,g=0,B=new Array(p.length),R=new Array(p.length),P=0;P<p.length;P+=1){var L=p[P].dataCount,K=p[P].totalCount-L;f=Math.max(f,L),g=Math.max(g,K),B[P]=new Array(L);for(var U=0;U<B[P].length;U+=1)B[P][U]=255&u.getBuffer()[U+d];d+=L;var z=s.getErrorCorrectPolynomial(K),J=c(B[P],z.getLength()-1),$e=J.mod(z);R[P]=new Array(z.getLength()-1);for(var U=0;U<R[P].length;U+=1){var Ke=U+$e.getLength()-R[P].length;R[P][U]=Ke>=0?$e.getAt(Ke):0}}for(var We=0,U=0;U<p.length;U+=1)We+=p[U].totalCount;for(var Se=new Array(We),ge=0,U=0;U<f;U+=1)for(var P=0;P<p.length;P+=1)U<B[P].length&&(Se[ge]=B[P][U],ge+=1);for(var U=0;U<g;U+=1)for(var P=0;P<p.length;P+=1)U<R[P].length&&(Se[ge]=R[P][U],ge+=1);return Se},Ie=function(u,p,d){for(var f=m.getRSBlocks(u,p),g=C(),B=0;B<d.length;B+=1){var R=d[B];g.put(R.getMode(),4),g.put(R.getLength(),s.getLengthInBits(R.getMode(),u)),R.write(g)}for(var P=0,B=0;B<f.length;B+=1)P+=f[B].dataCount;if(g.getLengthInBits()>P*8)throw"code length overflow. ("+g.getLengthInBits()+">"+P*8+")";for(g.getLengthInBits()+4<=P*8&&g.put(0,4);g.getLengthInBits()%8!=0;)g.putBit(!1);for(;!(g.getLengthInBits()>=P*8||(g.put(v,8),g.getLengthInBits()>=P*8));)g.put(w,8);return te(g,f)};y.addData=function(u,p){p=p||"Byte";var d=null;switch(p){case"Numeric":d=I(u);break;case"Alphanumeric":d=T(u);break;case"Byte":d=S(u);break;case"Kanji":d=M(u);break;default:throw"mode:"+p}h.push(d),x=null},y.isDark=function(u,p){if(u<0||o<=u||p<0||o<=p)throw u+","+p;return a[u][p]},y.getModuleCount=function(){return o},y.make=function(){if(l<1){for(var u=1;u<40;u++){for(var p=m.getRSBlocks(u,b),d=C(),f=0;f<h.length;f++){var g=h[f];d.put(g.getMode(),4),d.put(g.getLength(),s.getLengthInBits(g.getMode(),u)),g.write(d)}for(var B=0,f=0;f<p.length;f++)B+=p[f].dataCount;if(d.getLengthInBits()<=B*8)break}l=u}_(!1,H())},y.createTableTag=function(u,p){u=u||2,p=typeof p>"u"?u*4:p;var d="";d+='<table style="',d+=" border-width: 0px; border-style: none;",d+=" border-collapse: collapse;",d+=" padding: 0px; margin: "+p+"px;",d+='">',d+="<tbody>";for(var f=0;f<y.getModuleCount();f+=1){d+="<tr>";for(var g=0;g<y.getModuleCount();g+=1)d+='<td style="',d+=" border-width: 0px; border-style: none;",d+=" border-collapse: collapse;",d+=" padding: 0px; margin: 0px;",d+=" width: "+u+"px;",d+=" height: "+u+"px;",d+=" background-color: ",d+=y.isDark(f,g)?"#000000":"#ffffff",d+=";",d+='"/>';d+="</tr>"}return d+="</tbody>",d+="</table>",d},y.createSvgTag=function(u,p,d,f){var g={};typeof arguments[0]=="object"&&(g=arguments[0],u=g.cellSize,p=g.margin,d=g.alt,f=g.title),u=u||2,p=typeof p>"u"?u*4:p,d=typeof d=="string"?{text:d}:d||{},d.text=d.text||null,d.id=d.text?d.id||"qrcode-description":null,f=typeof f=="string"?{text:f}:f||{},f.text=f.text||null,f.id=f.text?f.id||"qrcode-title":null;var B=y.getModuleCount()*u+p*2,R,P,L,K,U="",z;for(z="l"+u+",0 0,"+u+" -"+u+",0 0,-"+u+"z ",U+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',U+=g.scalable?"":' width="'+B+'px" height="'+B+'px"',U+=' viewBox="0 0 '+B+" "+B+'" ',U+=' preserveAspectRatio="xMinYMin meet"',U+=f.text||d.text?' role="img" aria-labelledby="'+Y([f.id,d.id].join(" ").trim())+'"':"",U+=">",U+=f.text?'<title id="'+Y(f.id)+'">'+Y(f.text)+"</title>":"",U+=d.text?'<description id="'+Y(d.id)+'">'+Y(d.text)+"</description>":"",U+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',U+='<path d="',L=0;L<y.getModuleCount();L+=1)for(K=L*u+p,R=0;R<y.getModuleCount();R+=1)y.isDark(L,R)&&(P=R*u+p,U+="M"+P+","+K+z);return U+='" stroke="transparent" fill="black"/>',U+="</svg>",U},y.createDataURL=function(u,p){u=u||2,p=typeof p>"u"?u*4:p;var d=y.getModuleCount()*u+p*2,f=p,g=d-p;return j(d,d,function(B,R){if(f<=B&&B<g&&f<=R&&R<g){var P=Math.floor((B-f)/u),L=Math.floor((R-f)/u);return y.isDark(L,P)?0:1}else return 1})},y.createImgTag=function(u,p,d){u=u||2,p=typeof p>"u"?u*4:p;var f=y.getModuleCount()*u+p*2,g="";return g+="<img",g+=' src="',g+=y.createDataURL(u,p),g+='"',g+=' width="',g+=f,g+='"',g+=' height="',g+=f,g+='"',d&&(g+=' alt="',g+=Y(d),g+='"'),g+="/>",g};var Y=function(u){for(var p="",d=0;d<u.length;d+=1){var f=u.charAt(d);switch(f){case"<":p+="&lt;";break;case">":p+="&gt;";break;case"&":p+="&amp;";break;case'"':p+="&quot;";break;default:p+=f;break}}return p},kt=function(u){var p=1;u=typeof u>"u"?p*2:u;var d=y.getModuleCount()*p+u*2,f=u,g=d-u,B,R,P,L,K,U={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},z={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},J="";for(B=0;B<d;B+=2){for(P=Math.floor((B-f)/p),L=Math.floor((B+1-f)/p),R=0;R<d;R+=1)K="\u2588",f<=R&&R<g&&f<=B&&B<g&&y.isDark(P,Math.floor((R-f)/p))&&(K=" "),f<=R&&R<g&&f<=B+1&&B+1<g&&y.isDark(L,Math.floor((R-f)/p))?K+=" ":K+="\u2588",J+=u<1&&B+1>=g?z[K]:U[K];J+=`
`}return d%2&&u>0?J.substring(0,J.length-d-1)+Array(d+1).join("\u2580"):J.substring(0,J.length-1)};return y.createASCII=function(u,p){if(u=u||1,u<2)return kt(p);u-=1,p=typeof p>"u"?u*2:p;var d=y.getModuleCount()*u+p*2,f=p,g=d-p,B,R,P,L,K=Array(u+1).join("\u2588\u2588"),U=Array(u+1).join("  "),z="",J="";for(B=0;B<d;B+=1){for(P=Math.floor((B-f)/u),J="",R=0;R<d;R+=1)L=1,f<=R&&R<g&&f<=B&&B<g&&y.isDark(P,Math.floor((R-f)/u))&&(L=0),J+=L?K:U;for(P=0;P<u;P+=1)z+=J+`
`}return z.substring(0,z.length-1)},y.renderTo2dContext=function(u,p){p=p||2;for(var d=y.getModuleCount(),f=0;f<d;f++)for(var g=0;g<d;g++)u.fillStyle=y.isDark(f,g)?"black":"white",u.fillRect(f*p,g*p,p,p)},y};r.stringToBytesFuncs={default:function(A){for(var E=[],v=0;v<A.length;v+=1){var w=A.charCodeAt(v);E.push(w&255)}return E}},r.stringToBytes=r.stringToBytesFuncs.default,r.createStringToBytes=function(A,E){var v=(function(){for(var l=$(A),b=function(){var O=l.read();if(O==-1)throw"eof";return O},a=0,o={};;){var x=l.read();if(x==-1)break;var h=b(),y=b(),_=b(),N=String.fromCharCode(x<<8|h),H=y<<8|_;o[N]=H,a+=1}if(a!=E)throw a+" != "+E;return o})(),w=63;return function(l){for(var b=[],a=0;a<l.length;a+=1){var o=l.charCodeAt(a);if(o<128)b.push(o);else{var x=v[l.charAt(a)];typeof x=="number"?(x&255)==x?b.push(x):(b.push(x>>>8),b.push(x&255)):b.push(w)}}return b}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},t={L:1,M:0,Q:3,H:2},n={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},s=(function(){var A=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],E=1335,v=7973,w=21522,l={},b=function(a){for(var o=0;a!=0;)o+=1,a>>>=1;return o};return l.getBCHTypeInfo=function(a){for(var o=a<<10;b(o)-b(E)>=0;)o^=E<<b(o)-b(E);return(a<<10|o)^w},l.getBCHTypeNumber=function(a){for(var o=a<<12;b(o)-b(v)>=0;)o^=v<<b(o)-b(v);return a<<12|o},l.getPatternPosition=function(a){return A[a-1]},l.getMaskFunction=function(a){switch(a){case n.PATTERN000:return function(o,x){return(o+x)%2==0};case n.PATTERN001:return function(o,x){return o%2==0};case n.PATTERN010:return function(o,x){return x%3==0};case n.PATTERN011:return function(o,x){return(o+x)%3==0};case n.PATTERN100:return function(o,x){return(Math.floor(o/2)+Math.floor(x/3))%2==0};case n.PATTERN101:return function(o,x){return o*x%2+o*x%3==0};case n.PATTERN110:return function(o,x){return(o*x%2+o*x%3)%2==0};case n.PATTERN111:return function(o,x){return(o*x%3+(o+x)%2)%2==0};default:throw"bad maskPattern:"+a}},l.getErrorCorrectPolynomial=function(a){for(var o=c([1],0),x=0;x<a;x+=1)o=o.multiply(c([1,i.gexp(x)],0));return o},l.getLengthInBits=function(a,o){if(1<=o&&o<10)switch(a){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+a}else if(o<27)switch(a){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+a}else if(o<41)switch(a){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+a}else throw"type:"+o},l.getLostPoint=function(a){for(var o=a.getModuleCount(),x=0,h=0;h<o;h+=1)for(var y=0;y<o;y+=1){for(var _=0,N=a.isDark(h,y),H=-1;H<=1;H+=1)if(!(h+H<0||o<=h+H))for(var O=-1;O<=1;O+=1)y+O<0||o<=y+O||H==0&&O==0||N==a.isDark(h+H,y+O)&&(_+=1);_>5&&(x+=3+_-5)}for(var h=0;h<o-1;h+=1)for(var y=0;y<o-1;y+=1){var W=0;a.isDark(h,y)&&(W+=1),a.isDark(h+1,y)&&(W+=1),a.isDark(h,y+1)&&(W+=1),a.isDark(h+1,y+1)&&(W+=1),(W==0||W==4)&&(x+=3)}for(var h=0;h<o;h+=1)for(var y=0;y<o-6;y+=1)a.isDark(h,y)&&!a.isDark(h,y+1)&&a.isDark(h,y+2)&&a.isDark(h,y+3)&&a.isDark(h,y+4)&&!a.isDark(h,y+5)&&a.isDark(h,y+6)&&(x+=40);for(var y=0;y<o;y+=1)for(var h=0;h<o-6;h+=1)a.isDark(h,y)&&!a.isDark(h+1,y)&&a.isDark(h+2,y)&&a.isDark(h+3,y)&&a.isDark(h+4,y)&&!a.isDark(h+5,y)&&a.isDark(h+6,y)&&(x+=40);for(var Q=0,y=0;y<o;y+=1)for(var h=0;h<o;h+=1)a.isDark(h,y)&&(Q+=1);var V=Math.abs(100*Q/o/o-50)/5;return x+=V*10,x},l})(),i=(function(){for(var A=new Array(256),E=new Array(256),v=0;v<8;v+=1)A[v]=1<<v;for(var v=8;v<256;v+=1)A[v]=A[v-4]^A[v-5]^A[v-6]^A[v-8];for(var v=0;v<255;v+=1)E[A[v]]=v;var w={};return w.glog=function(l){if(l<1)throw"glog("+l+")";return E[l]},w.gexp=function(l){for(;l<0;)l+=255;for(;l>=256;)l-=255;return A[l]},w})();function c(A,E){if(typeof A.length>"u")throw A.length+"/"+E;var v=(function(){for(var l=0;l<A.length&&A[l]==0;)l+=1;for(var b=new Array(A.length-l+E),a=0;a<A.length-l;a+=1)b[a]=A[a+l];return b})(),w={};return w.getAt=function(l){return v[l]},w.getLength=function(){return v.length},w.multiply=function(l){for(var b=new Array(w.getLength()+l.getLength()-1),a=0;a<w.getLength();a+=1)for(var o=0;o<l.getLength();o+=1)b[a+o]^=i.gexp(i.glog(w.getAt(a))+i.glog(l.getAt(o)));return c(b,0)},w.mod=function(l){if(w.getLength()-l.getLength()<0)return w;for(var b=i.glog(w.getAt(0))-i.glog(l.getAt(0)),a=new Array(w.getLength()),o=0;o<w.getLength();o+=1)a[o]=w.getAt(o);for(var o=0;o<l.getLength();o+=1)a[o]^=i.gexp(i.glog(l.getAt(o))+b);return c(a,0).mod(l)},w}var m=(function(){var A=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],E=function(l,b){var a={};return a.totalCount=l,a.dataCount=b,a},v={},w=function(l,b){switch(b){case t.L:return A[(l-1)*4+0];case t.M:return A[(l-1)*4+1];case t.Q:return A[(l-1)*4+2];case t.H:return A[(l-1)*4+3];default:return}};return v.getRSBlocks=function(l,b){var a=w(l,b);if(typeof a>"u")throw"bad rs block @ typeNumber:"+l+"/errorCorrectionLevel:"+b;for(var o=a.length/3,x=[],h=0;h<o;h+=1)for(var y=a[h*3+0],_=a[h*3+1],N=a[h*3+2],H=0;H<y;H+=1)x.push(E(_,N));return x},v})(),C=function(){var A=[],E=0,v={};return v.getBuffer=function(){return A},v.getAt=function(w){var l=Math.floor(w/8);return(A[l]>>>7-w%8&1)==1},v.put=function(w,l){for(var b=0;b<l;b+=1)v.putBit((w>>>l-b-1&1)==1)},v.getLengthInBits=function(){return E},v.putBit=function(w){var l=Math.floor(E/8);A.length<=l&&A.push(0),w&&(A[l]|=128>>>E%8),E+=1},v},I=function(A){var E=e.MODE_NUMBER,v=A,w={};w.getMode=function(){return E},w.getLength=function(a){return v.length},w.write=function(a){for(var o=v,x=0;x+2<o.length;)a.put(l(o.substring(x,x+3)),10),x+=3;x<o.length&&(o.length-x==1?a.put(l(o.substring(x,x+1)),4):o.length-x==2&&a.put(l(o.substring(x,x+2)),7))};var l=function(a){for(var o=0,x=0;x<a.length;x+=1)o=o*10+b(a.charAt(x));return o},b=function(a){if("0"<=a&&a<="9")return a.charCodeAt(0)-48;throw"illegal char :"+a};return w},T=function(A){var E=e.MODE_ALPHA_NUM,v=A,w={};w.getMode=function(){return E},w.getLength=function(b){return v.length},w.write=function(b){for(var a=v,o=0;o+1<a.length;)b.put(l(a.charAt(o))*45+l(a.charAt(o+1)),11),o+=2;o<a.length&&b.put(l(a.charAt(o)),6)};var l=function(b){if("0"<=b&&b<="9")return b.charCodeAt(0)-48;if("A"<=b&&b<="Z")return b.charCodeAt(0)-65+10;switch(b){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+b}};return w},S=function(A){var E=e.MODE_8BIT_BYTE,v=A,w=r.stringToBytes(A),l={};return l.getMode=function(){return E},l.getLength=function(b){return w.length},l.write=function(b){for(var a=0;a<w.length;a+=1)b.put(w[a],8)},l},M=function(A){var E=e.MODE_KANJI,v=A,w=r.stringToBytesFuncs.SJIS;if(!w)throw"sjis not supported.";(function(a,o){var x=w(a);if(x.length!=2||(x[0]<<8|x[1])!=o)throw"sjis not supported."})("\u53CB",38726);var l=w(A),b={};return b.getMode=function(){return E},b.getLength=function(a){return~~(l.length/2)},b.write=function(a){for(var o=l,x=0;x+1<o.length;){var h=(255&o[x])<<8|255&o[x+1];if(33088<=h&&h<=40956)h-=33088;else if(57408<=h&&h<=60351)h-=49472;else throw"illegal char at "+(x+1)+"/"+h;h=(h>>>8&255)*192+(h&255),a.put(h,13),x+=2}if(x<o.length)throw"illegal char at "+(x+1)},b},F=function(){var A=[],E={};return E.writeByte=function(v){A.push(v&255)},E.writeShort=function(v){E.writeByte(v),E.writeByte(v>>>8)},E.writeBytes=function(v,w,l){w=w||0,l=l||v.length;for(var b=0;b<l;b+=1)E.writeByte(v[b+w])},E.writeString=function(v){for(var w=0;w<v.length;w+=1)E.writeByte(v.charCodeAt(w))},E.toByteArray=function(){return A},E.toString=function(){var v="";v+="[";for(var w=0;w<A.length;w+=1)w>0&&(v+=","),v+=A[w];return v+="]",v},E},D=function(){var A=0,E=0,v=0,w="",l={},b=function(o){w+=String.fromCharCode(a(o&63))},a=function(o){if(!(o<0)){if(o<26)return 65+o;if(o<52)return 97+(o-26);if(o<62)return 48+(o-52);if(o==62)return 43;if(o==63)return 47}throw"n:"+o};return l.writeByte=function(o){for(A=A<<8|o&255,E+=8,v+=1;E>=6;)b(A>>>E-6),E-=6},l.flush=function(){if(E>0&&(b(A<<6-E),A=0,E=0),v%3!=0)for(var o=3-v%3,x=0;x<o;x+=1)w+="="},l.toString=function(){return w},l},$=function(A){var E=A,v=0,w=0,l=0,b={};b.read=function(){for(;l<8;){if(v>=E.length){if(l==0)return-1;throw"unexpected end of file./"+l}var o=E.charAt(v);if(v+=1,o=="=")return l=0,-1;if(o.match(/^\s$/))continue;w=w<<6|a(o.charCodeAt(0)),l+=6}var x=w>>>l-8&255;return l-=8,x};var a=function(o){if(65<=o&&o<=90)return o-65;if(97<=o&&o<=122)return o-97+26;if(48<=o&&o<=57)return o-48+52;if(o==43)return 62;if(o==47)return 63;throw"c:"+o};return b},ee=function(A,E){var v=A,w=E,l=new Array(A*E),b={};b.setPixel=function(h,y,_){l[y*v+h]=_},b.write=function(h){h.writeString("GIF87a"),h.writeShort(v),h.writeShort(w),h.writeByte(128),h.writeByte(0),h.writeByte(0),h.writeByte(0),h.writeByte(0),h.writeByte(0),h.writeByte(255),h.writeByte(255),h.writeByte(255),h.writeString(","),h.writeShort(0),h.writeShort(0),h.writeShort(v),h.writeShort(w),h.writeByte(0);var y=2,_=o(y);h.writeByte(y);for(var N=0;_.length-N>255;)h.writeByte(255),h.writeBytes(_,N,255),N+=255;h.writeByte(_.length-N),h.writeBytes(_,N,_.length-N),h.writeByte(0),h.writeString(";")};var a=function(h){var y=h,_=0,N=0,H={};return H.write=function(O,W){if(O>>>W)throw"length over";for(;_+W>=8;)y.writeByte(255&(O<<_|N)),W-=8-_,O>>>=8-_,N=0,_=0;N=O<<_|N,_=_+W},H.flush=function(){_>0&&y.writeByte(N)},H},o=function(h){for(var y=1<<h,_=(1<<h)+1,N=h+1,H=x(),O=0;O<y;O+=1)H.add(String.fromCharCode(O));H.add(String.fromCharCode(y)),H.add(String.fromCharCode(_));var W=F(),Q=a(W);Q.write(y,N);var V=0,G=String.fromCharCode(l[V]);for(V+=1;V<l.length;){var te=String.fromCharCode(l[V]);V+=1,H.contains(G+te)?G=G+te:(Q.write(H.indexOf(G),N),H.size()<4095&&(H.size()==1<<N&&(N+=1),H.add(G+te)),G=te)}return Q.write(H.indexOf(G),N),Q.write(_,N),Q.flush(),W.toByteArray()},x=function(){var h={},y=0,_={};return _.add=function(N){if(_.contains(N))throw"dup key:"+N;h[N]=y,y+=1},_.size=function(){return y},_.indexOf=function(N){return h[N]},_.contains=function(N){return typeof h[N]<"u"},_};return b},j=function(A,E,v){for(var w=ee(A,E),l=0;l<E;l+=1)for(var b=0;b<A;b+=1)w.setPixel(b,l,v(b,l));var a=F();w.write(a);for(var o=D(),x=a.toByteArray(),h=0;h<x.length;h+=1)o.writeByte(x[h]);return o.flush(),"data:image/gif;base64,"+o};return r})();(function(){it.stringToBytesFuncs["UTF-8"]=function(r){function e(t){for(var n=[],s=0;s<t.length;s++){var i=t.charCodeAt(s);i<128?n.push(i):i<2048?n.push(192|i>>6,128|i&63):i<55296||i>=57344?n.push(224|i>>12,128|i>>6&63,128|i&63):(s++,i=65536+((i&1023)<<10|t.charCodeAt(s)&1023),n.push(240|i>>18,128|i>>12&63,128|i>>6&63,128|i&63))}return n}return e(r)}})();(function(r){typeof define=="function"&&define.amd?define([],r):typeof ot=="object"&&(at.exports=r())})(function(){return it})});function Rt(r){return r instanceof Uint8Array||ArrayBuffer.isView(r)&&r.constructor.name==="Uint8Array"}function be(r,...e){if(!Rt(r))throw new Error("Uint8Array expected");if(e.length>0&&!e.includes(r.length))throw new Error("Uint8Array expected of length "+e+", got length="+r.length)}function Ee(r,e=!0){if(r.destroyed)throw new Error("Hash instance has been destroyed");if(e&&r.finished)throw new Error("Hash#digest() has already been called")}function qe(r,e){be(r);let t=e.outputLen;if(r.length<t)throw new Error("digestInto() expects output buffer of length at least "+t)}function de(...r){for(let e=0;e<r.length;e++)r[e].fill(0)}function ve(r){return new DataView(r.buffer,r.byteOffset,r.byteLength)}function X(r,e){return r<<32-e|r>>>e}function Ut(r){if(typeof r!="string")throw new Error("string expected");return new Uint8Array(new TextEncoder().encode(r))}function Be(r){return typeof r=="string"&&(r=Ut(r)),be(r),r}var ye=class{};function Ve(r){let e=n=>r().update(Be(n)).digest(),t=r();return e.outputLen=t.outputLen,e.blockLen=t.blockLen,e.create=()=>r(),e}function _t(r,e,t,n){if(typeof r.setBigUint64=="function")return r.setBigUint64(e,t,n);let s=BigInt(32),i=BigInt(4294967295),c=Number(t>>s&i),m=Number(t&i),C=n?4:0,I=n?0:4;r.setUint32(e+C,c,n),r.setUint32(e+I,m,n)}function Ge(r,e,t){return r&e^~r&t}function Qe(r,e,t){return r&e^r&t^e&t}var xe=class extends ye{constructor(e,t,n,s){super(),this.finished=!1,this.length=0,this.pos=0,this.destroyed=!1,this.blockLen=e,this.outputLen=t,this.padOffset=n,this.isLE=s,this.buffer=new Uint8Array(e),this.view=ve(this.buffer)}update(e){Ee(this),e=Be(e),be(e);let{view:t,buffer:n,blockLen:s}=this,i=e.length;for(let c=0;c<i;){let m=Math.min(s-this.pos,i-c);if(m===s){let C=ve(e);for(;s<=i-c;c+=s)this.process(C,c);continue}n.set(e.subarray(c,c+m),this.pos),this.pos+=m,c+=m,this.pos===s&&(this.process(t,0),this.pos=0)}return this.length+=e.length,this.roundClean(),this}digestInto(e){Ee(this),qe(e,this),this.finished=!0;let{buffer:t,view:n,blockLen:s,isLE:i}=this,{pos:c}=this;t[c++]=128,de(this.buffer.subarray(c)),this.padOffset>s-c&&(this.process(n,0),c=0);for(let S=c;S<s;S++)t[S]=0;_t(n,s-8,BigInt(this.length*8),i),this.process(n,0);let m=ve(e),C=this.outputLen;if(C%4)throw new Error("_sha2: outputLen should be aligned to 32bit");let I=C/4,T=this.get();if(I>T.length)throw new Error("_sha2: outputLen bigger than state");for(let S=0;S<I;S++)m.setUint32(4*S,T[S],i)}digest(){let{buffer:e,outputLen:t}=this;this.digestInto(e);let n=e.slice(0,t);return this.destroy(),n}_cloneInto(e){e||(e=new this.constructor),e.set(...this.get());let{blockLen:t,buffer:n,length:s,finished:i,destroyed:c,pos:m}=this;return e.destroyed=c,e.finished=i,e.length=s,e.pos=m,s%t&&e.buffer.set(n),e}clone(){return this._cloneInto()}},re=Uint32Array.from([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);var Nt=Uint32Array.from([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),ie=new Uint32Array(64),Te=class extends xe{constructor(e=32){super(64,e,8,!1),this.A=re[0]|0,this.B=re[1]|0,this.C=re[2]|0,this.D=re[3]|0,this.E=re[4]|0,this.F=re[5]|0,this.G=re[6]|0,this.H=re[7]|0}get(){let{A:e,B:t,C:n,D:s,E:i,F:c,G:m,H:C}=this;return[e,t,n,s,i,c,m,C]}set(e,t,n,s,i,c,m,C){this.A=e|0,this.B=t|0,this.C=n|0,this.D=s|0,this.E=i|0,this.F=c|0,this.G=m|0,this.H=C|0}process(e,t){for(let S=0;S<16;S++,t+=4)ie[S]=e.getUint32(t,!1);for(let S=16;S<64;S++){let M=ie[S-15],F=ie[S-2],D=X(M,7)^X(M,18)^M>>>3,$=X(F,17)^X(F,19)^F>>>10;ie[S]=$+ie[S-7]+D+ie[S-16]|0}let{A:n,B:s,C:i,D:c,E:m,F:C,G:I,H:T}=this;for(let S=0;S<64;S++){let M=X(m,6)^X(m,11)^X(m,25),F=T+M+Ge(m,C,I)+Nt[S]+ie[S]|0,$=(X(n,2)^X(n,13)^X(n,22))+Qe(n,s,i)|0;T=I,I=C,C=m,m=c+F|0,c=i,i=s,s=n,n=F+$|0}n=n+this.A|0,s=s+this.B|0,i=i+this.C|0,c=c+this.D|0,m=m+this.E|0,C=C+this.F|0,I=I+this.G|0,T=T+this.H|0,this.set(n,s,i,c,m,C,I,T)}roundClean(){de(ie)}destroy(){this.set(0,0,0,0,0,0,0,0),de(this.buffer)}};var ze=Ve(()=>new Te);function Pe(){let r=new Uint8Array(32);return crypto.getRandomValues(r),Array.from(r,e=>e.toString(16).padStart(2,"0")).join("")}var Mt="privasys.id",Re="relay.privasys.org",Ue=1;function Dt(r){let e="";for(let t=0;t<r.length;t++)e+=String.fromCharCode(r[t]);return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function Je(r){return Dt(ze(new TextEncoder().encode(r)).subarray(0,16))}function Ye(r){try{return new URL(r).host}catch{return Re}}function Xe(r){try{let e=new URL(r);return`${e.protocol==="wss:"?"https:":e.protocol==="ws:"?"http:":e.protocol}//${e.host}`}catch{return`https://${Re}`}}function Ze(r,e,t){let n=t===Re?"":`&r=${encodeURIComponent(t)}`;return`https://${Mt}/scp?v=${Ue}&s=${encodeURIComponent(r)}&h=${e}${n}`}async function et(r,e,t){let n=`${r}/connect/${encodeURIComponent(e)}`;try{let s=await fetch(n,{method:"PUT",headers:{"Content-Type":"application/json"},body:t});s.ok||console.warn(`[privasys-auth] descriptor publish returned ${s.status} from ${n}`)}catch(s){console.warn("[privasys-auth] descriptor publish failed",s)}}function tt(r){let e=r.sessionId??Pe(),t={v:Ue,origin:r.rpId,sessionId:e,rpId:r.rpId,brokerUrl:r.brokerUrl};if(r.requestedAttributes?.length&&(t.requestedAttributes=r.requestedAttributes),r.appName&&(t.appName=r.appName),r.privacyPolicyUrl&&(t.privacyPolicyUrl=r.privacyPolicyUrl),r.mode==="session-relay"){if(!r.sdkPub||!r.appHost)throw new Error("generateQRPayload: session-relay mode requires sdkPub and appHost");t.mode="session-relay",t.sdkPub=r.sdkPub,t.appHost=r.appHost,r.nonce&&(t.nonce=r.nonce)}let n=JSON.stringify(t),s=Je(n),i=r.relayBase??Xe(r.brokerUrl),c=r.relayBase?new URL(r.relayBase).host:Ye(r.brokerUrl),m=Ze(e,s,c),C=et(i,e,n);return{sessionId:e,payload:m,descriptorPublished:C,descriptorHash:s}}function rt(r){let e=r.sessionId??Pe(),t=r.apps.map(T=>({rpId:T.rpId,sessionId:T.sessionId??Pe()})),n={v:Ue,origin:r.apps[0]?.rpId??"",sessionId:e,brokerUrl:r.brokerUrl,apps:t},s=JSON.stringify(n),i=Je(s),c=r.relayBase??Xe(r.brokerUrl),m=r.relayBase?new URL(r.relayBase).host:Ye(r.brokerUrl),C=Ze(e,i,m),I=et(c,e,s);return{sessionId:e,appSessions:t,payload:C,descriptorPublished:I,descriptorHash:i}}var _e="privasys_sessions",Ne="privasys_device_hints",nt="privasys_passkey",oe=class{constructor(){this.listeners=new Set}store(e){let t=this.getAll(),n=t.findIndex(s=>s.rpId===e.rpId);n>=0?t[n]=e:t.push(e),this.persist(t),this.notify(t)}get(e){return this.getAll().find(t=>t.rpId===e)}getAll(){try{let e=localStorage.getItem(_e);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}findPushToken(){let e=this.getAll().filter(t=>!!t.pushToken).sort((t,n)=>n.authenticatedAt-t.authenticatedAt);return e[0]?.pushToken?e[0].pushToken:this.getDeviceHint()?.pushToken}remove(e){let t=this.getAll().filter(n=>n.rpId!==e);this.persist(t),this.notify(t)}clear(){localStorage.removeItem(_e),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}saveDeviceHint(e,t){let n={pushToken:e,brokerUrl:t,updatedAt:Date.now()};try{localStorage.setItem(Ne,JSON.stringify(n))}catch{}}getDeviceHint(){try{let e=localStorage.getItem(Ne);return e?JSON.parse(e):void 0}catch{return}}clearDeviceHint(){localStorage.removeItem(Ne)}savePasskeyHint(){try{localStorage.setItem(nt,"1")}catch{}}hasPasskeyHint(){try{return localStorage.getItem(nt)==="1"}catch{return!1}}persist(e){localStorage.setItem(_e,JSON.stringify(e))}notify(e){for(let t of this.listeners)t(e)}};var Me=12e4,me=class{constructor(e,t={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:Me,...e},this.events=t,this.sessions=new oe}createQR(e,t){return tt({rpId:this.config.rpId,brokerUrl:this.config.brokerUrl,sessionId:e,requestedAttributes:this.config.requestedAttributes,appName:this.config.appName,privacyPolicyUrl:this.config.privacyPolicyUrl,...t?{mode:"session-relay",sdkPub:t.sdkPub,appHost:t.appHost,nonce:t.nonce}:{}})}waitForResult(e){return new Promise((t,n)=>{let s=this.config.timeout??Me,i=new URL(this.config.brokerUrl);i.searchParams.set("session",e),i.searchParams.set("role","browser");let c=new WebSocket(i.toString());this.activeConnections.set(e,c),this.setState("waiting-for-scan");let m=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),n(new Error("Authentication timed out"))},s);c.onopen=()=>{this.setState("waiting-for-scan")},c.onmessage=C=>{try{let I=JSON.parse(typeof C.data=="string"?C.data:"{}");this.handleMessage(e,I,t,m)}catch{}},c.onerror=()=>{clearTimeout(m),this.setState("error"),this.cleanup(e),n(new Error("WebSocket connection failed"))},c.onclose=C=>{clearTimeout(m),this.cleanup(e),C.code!==1e3&&(this.setState("error"),n(new Error(`Connection closed (code ${C.code})`)))}})}async notifyAndWait(e,t){let n=t??this.createQR().sessionId,s=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),i=await fetch(`${s}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:n,rpId:this.config.rpId,appName:this.config.appName,origin:this.config.rpId,brokerUrl:this.config.brokerUrl})});if(!i.ok){let c=await i.text();throw new Error(`Push notification failed: ${c}`)}return this.waitForResult(n)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:t,appSessions:n,payload:s}=rt({brokerUrl:this.config.brokerUrl,apps:e.map(c=>({rpId:c.rpId}))}),i=this.waitForBatch(n);return{sessionId:t,appSessions:n,payload:s,result:i}}on(e){this.events={...this.events,...e}}handleMessage(e,t,n,s){switch(t.type){case"peer-joined":case"wallet-waiting":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(s),this.setState("complete");let i={sessionToken:t.sessionToken,sessionId:e,attestation:t.attestation,pushToken:t.pushToken||void 0,attributes:t.attributes||void 0,sessionRelay:t.sessionRelay||void 0};this.sessions.store({token:i.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now(),pushToken:i.pushToken,brokerUrl:this.config.brokerUrl}),this.events.onAuthenticated?.(i),this.cleanup(e),n(i);break}case"auth-error":{clearTimeout(s),this.setState("error"),this.cleanup(e);let i=new Error(t.message??"Authentication failed");this.events.onError?.(i);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let t=this.config.timeout??Me;this.setState("waiting-for-scan");let n=await Promise.allSettled(e.map(c=>Promise.race([this.waitForResult(c.sessionId),new Promise((m,C)=>setTimeout(()=>C(new Error("Batch item timed out")),t))]))),s=[],i=[];for(let c=0;c<n.length;c++){let m=n[c];m.status==="fulfilled"?s.push(m.value):i.push({rpId:e[c].rpId,error:m.reason instanceof Error?m.reason.message:String(m.reason)})}return this.setState(i.length===0?"complete":"error"),{results:s,errors:i}}cleanup(e){let t=this.activeConnections.get(e);t&&((t.readyState===WebSocket.OPEN||t.readyState===WebSocket.CONNECTING)&&t.close(1e3),this.activeConnections.delete(e))}};function Z(r){let e=new Uint8Array(r),t="";for(let n=0;n<e.length;n++)t+=String.fromCharCode(e[n]);return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function he(r){let e=r.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let t=atob(e),n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n.buffer}function st(r){let e=new Uint8Array(r);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}var ae=class{constructor(e,t={}){this.state="idle";this.config={timeout:6e4,...e},this.events=t,this.sessions=new oe}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let t=Z(crypto.getRandomValues(new Uint8Array(32)).buffer),n=this.config.sessionId??st(16),i=(await this.fido2Fetch("register/begin",{userName:e??globalThis.location?.hostname??"user",userHandle:t},{session_id:n})).publicKey;if(!i)throw new Error("Missing publicKey in registration options");let c={publicKey:{challenge:he(i.challenge),rp:{id:i.rp.id,name:i.rp.name},user:{id:he(i.user.id),name:i.user.name,displayName:i.user.displayName??i.user.name},pubKeyCredParams:(i.pubKeyCredParams??[]).map(T=>({type:T.type??"public-key",alg:T.alg})),timeout:this.config.timeout,attestation:i.attestation??"none",authenticatorSelection:{authenticatorAttachment:"platform",residentKey:"required",userVerification:i.authenticatorSelection?.userVerification??"required"},...i.excludeCredentials?{excludeCredentials:i.excludeCredentials.map(T=>({type:"public-key",id:he(T.id)}))}:{}}};this.setState("ceremony");let m=await navigator.credentials.create(c);if(!m)throw new Error("No credential returned");this.setState("verifying");let C=m.response,I=await this.fido2Fetch("register/complete",{id:Z(m.rawId),rawId:Z(m.rawId),type:"public-key",response:{attestationObject:Z(C.attestationObject),clientDataJSON:Z(C.clientDataJSON)}},{challenge:i.challenge});return this.sessions.savePasskeyHint(),this.complete(I.sessionToken??"",n)}catch(t){return this.fail(t)}}async authenticate(){this.setState("requesting-options");try{let e=this.config.sessionId??st(16),n=(await this.fido2Fetch("authenticate/begin",{},{session_id:e})).publicKey;if(!n)throw new Error("Missing publicKey in authentication options");let s={publicKey:{challenge:he(n.challenge),rpId:n.rpId,timeout:this.config.timeout,userVerification:n.userVerification??"preferred",...n.allowCredentials?.length?{allowCredentials:n.allowCredentials.map(I=>({type:"public-key",id:he(I.id),...I.transports?.length?{transports:I.transports}:{}}))}:{}}};this.setState("ceremony");let i=await navigator.credentials.get(s);if(!i)throw new Error("No assertion returned");this.setState("verifying");let c=i.response,m={clientDataJSON:Z(c.clientDataJSON),authenticatorData:Z(c.authenticatorData),signature:Z(c.signature)};c.userHandle&&c.userHandle.byteLength>0&&(m.userHandle=Z(c.userHandle));let C=await this.fido2Fetch("authenticate/complete",{id:Z(i.rawId),rawId:Z(i.rawId),type:"public-key",response:m},{challenge:n.challenge});return this.complete(C.sessionToken??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e,t,n){let s=(this.config.fido2Base??this.config.apiBase).replace(/\/+$/,""),i=this.config.fido2Base?new URL(`${s}/${e}`):new URL(`${s}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2/${e}`);if(n)for(let[m,C]of Object.entries(n))i.searchParams.set(m,C);let c=await fetch(i.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!c.ok){let m=await c.json().catch(()=>({error:c.statusText}));throw new Error(m.error??`HTTP ${c.status}`)}return c.json()}complete(e,t){this.setState("complete");let n={sessionToken:e,sessionId:t};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(n),n}fail(e){this.setState("error");let t=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(t),t}setState(e){this.state=e,this.events.onStateChange?.(e)}};var dt=Pt(ct(),1),Ht=`
:host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0F172A;
    background: #fff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-y: auto;
    opacity: 0;
    animation: fadeIn 0.15s ease forwards;
}
@keyframes fadeIn { to { opacity: 1; } }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Close button \u2014 top right */
.btn-close {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 10;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    color: #94A3B8;
    transition: background 0.15s, color 0.15s;
}
.btn-close:hover { background: #F1F5F9; color: #64748B; }
.btn-close svg { width: 20px; height: 20px; }

/* Back button \u2014 top of auth panel */
.btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    color: #64748B;
    padding: 6px 10px 6px 4px;
    border-radius: 8px;
    margin-bottom: 24px;
    transition: background 0.15s, color 0.15s;
    align-self: flex-start;
}
.btn-back:hover { background: #F1F5F9; color: #0F172A; }
.btn-back svg { width: 16px; height: 16px; }

/* Full-screen two-column layout */
.page {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr auto;
    width: 100%;
    min-height: 100vh;
}

/* Left: brand panel */
.brand-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 64px 48px 64px 64px;
    min-width: 360px;
    max-width: 560px;
    margin-left: auto;
}
.brand-panel-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 32px;
}
.brand-panel-logo {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
}
.brand-panel-logo svg { width: 100%; height: 100%; display: block; }
.brand-panel-name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0F172A;
}
.brand-panel-desc {
    font-size: 17px;
    color: #64748B;
    line-height: 1.6;
    max-width: 400px;
}

/* Right: auth panel */
.auth-panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 64px 64px 64px 48px;
    max-width: 460px;
}
.auth-panel-heading {
    font-size: 20px;
    font-weight: 600;
    color: #0F172A;
    letter-spacing: -0.01em;
    margin-bottom: 28px;
}
/* Center content in auth panel for non-idle states */
.auth-panel--centered {
    align-items: center;
    text-align: center;
}

/* Mobile: single column, compact brand header */
@media (max-width: 768px) {
    .page {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
        min-height: 100vh;
    }
    .brand-panel {
        padding: 20px 24px;
        padding-right: 56px;
        flex-direction: row;
        align-items: center;
        max-width: none;
        margin: 0;
    }
    .brand-panel-header { margin-bottom: 0; }
    .brand-panel-logo { width: 28px; height: 28px; }
    .brand-panel-name { font-size: 16px; }
    .brand-panel-desc { display: none; }
    .auth-panel {
        padding: 0 24px 32px;
        max-width: 420px;
        margin: 0 auto;
        justify-content: center;
    }
    .auth-panel--centered { margin: 0 auto; }
    .btn-close { top: 14px; right: 16px; width: 36px; height: 36px; }
    .btn-hint { display: none; }
    .footer { padding: 16px 24px; }
}

/* Provider buttons */
.btn-provider + .btn-provider { margin-top: 10px; }
.btn-provider {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 12px;
    padding: 14px 16px;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.1s;
    text-align: left;
    font-family: inherit;
    font-size: 14px;
    color: #0F172A;
}
.btn-provider:hover {
    background: #F8FAFC;
    border-color: #CBD5E1;
    box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}
.btn-provider:active { transform: scale(0.98); }
.btn-provider > span:not(.btn-label):not(.btn-hint) {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}
.btn-provider svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: #64748B;
}
.btn-provider.primary {
    background: #0F172A;
    border-color: #0F172A;
    color: #fff;
    padding: 15px 18px;
}
.btn-provider.primary:hover {
    background: #1E293B;
    border-color: #1E293B;
    box-shadow: 0 2px 8px rgba(15,23,42,0.15);
}
.btn-provider.primary svg { color: #fff; }
.btn-provider.primary .btn-hint { color: rgba(255,255,255,0.6); }
.btn-label { font-weight: 500; flex: 1; }
.btn-hint {
    font-size: 11px;
    color: #94A3B8;
    flex-shrink: 0;
}

/* Divider */
.divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 20px 0 16px;
    color: #94A3B8;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    width: 100%;
}
.divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #E2E8F0;
}

/* Alternative actions (push-waiting fallbacks) */
.alt-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.link-btn {
    background: none;
    border: none;
    color: #2563eb;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    padding: 0;
}
.link-btn:hover { text-decoration: underline; }

/* QR section */
.qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}
.qr-frame {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid rgba(0,0,0,0.1);
    display: inline-flex;
}
.qr-frame svg { width: 200px; height: 200px; }
.scan-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
}
.pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #059669;
    animation: pulse-anim 2s ease-in-out infinite;
}
@keyframes pulse-anim {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(5,150,105,0.4); }
    50%      { opacity: 0.7; box-shadow: 0 0 0 6px rgba(5,150,105,0); }
}
.scan-hint {
    font-size: 13px;
    color: #64748B;
    max-width: 280px;
    line-height: 1.5;
}

/* Progress / spinner */
.progress-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    padding: 8px 0 16px;
}
.spinner {
    width: 44px;
    height: 44px;
    border: 3px solid rgba(0,0,0,0.08);
    border-top-color: #0F172A;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.steps {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    width: 100%;
    max-width: 280px;
}
.step {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #94A3B8;
    transition: color 0.2s;
}
.step.active { color: #0F172A; font-weight: 500; }
.step.done   { color: #0F172A; }
.step.done .step-icon { color: #059669; }
.step-icon {
    width: 18px;
    text-align: center;
    font-weight: 600;
    flex-shrink: 0;
}

/* Success */
.success-icon { color: #059669; margin-bottom: 12px; }
.success-icon svg { width: 48px; height: 48px; }
.success-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
.success-method {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
}
.method-badge {
    font-size: 12px;
    font-weight: 600;
    background: rgba(5,150,105,0.06);
    color: #059669;
    border: 1px solid rgba(5,150,105,0.2);
    padding: 2px 10px;
    border-radius: 999px;
}
.method-detail { font-size: 12px; color: #64748B; }

/* Brand progress steps (left column during flow states) */
.brand-progress {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-top: 28px;
}
.brand-progress .steps {
    max-width: none;
    gap: 6px;
}
.brand-progress .step {
    font-size: 14px;
    gap: 10px;
    padding: 4px 0;
}
.brand-progress .step-icon {
    width: 20px;
    font-size: 14px;
}
.brand-progress .spinner {
    width: 28px;
    height: 28px;
    border-width: 2.5px;
    margin-bottom: 8px;
}
.brand-progress .brand-progress-label {
    font-size: 14px;
    font-weight: 600;
    color: #059669;
    margin-top: 16px;
}
.brand-progress .success-method {
    margin-top: 8px;
    margin-bottom: 0;
}
@media (max-width: 768px) {
    .brand-progress { display: none; }
    .auth-panel .mobile-progress-header { display: flex; }
}
.mobile-progress-header {
    display: none;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    width: 100%;
}
.mobile-progress-header .brand-progress { display: flex; align-items: center; }
.mobile-progress-header .steps { align-items: flex-start; width: 100%; max-width: 280px; }
.mobile-progress-header .step { font-size: 13px; }
.mobile-progress-header .spinner { width: 24px; height: 24px; border-width: 2px; margin-bottom: 6px; }
.mobile-progress-header .brand-progress-label {
    font-size: 13px;
    font-weight: 600;
    color: #059669;
    margin-top: 10px;
}
.mobile-progress-header .success-method {
    margin-top: 6px;
    margin-bottom: 0;
    justify-content: center;
}
.session-info {
    text-align: left;
    border: 1px solid #E2E8F0;
    border-radius: 8px;
    overflow: hidden;
    width: 100%;
}
.session-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 13px;
}
.session-row + .session-row { border-top: 1px solid #E2E8F0; }
.session-label {
    font-weight: 500;
    min-width: 56px;
    color: #64748B;
    font-size: 12px;
}
.session-value {
    flex: 1;
    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Error */
.error-icon { color: #dc2626; margin-bottom: 12px; }
.error-icon svg { width: 48px; height: 48px; }
.error-title { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.error-msg {
    font-size: 13px;
    color: #64748B;
    margin-bottom: 20px;
    max-width: 320px;
    line-height: 1.5;
}
.btn-retry {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 13px 16px;
    border: 1px solid #E2E8F0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #0F172A;
    transition: background 0.15s;
}
.btn-retry:hover { background: #F8FAFC; }

/* Footer */
.footer {
    grid-column: 1 / -1;
    padding: 16px 64px;
    border-top: 1px solid #E2E8F0;
    font-size: 11px;
    color: #94A3B8;
    text-align: center;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    :host { color: #E2E8F0; background: #0F172A; }
    .btn-close { color: #64748B; }
    .btn-close:hover { background: rgba(255,255,255,0.06); color: #94A3B8; }
    .btn-back { color: #64748B; }
    .btn-back:hover { background: rgba(255,255,255,0.06); color: #E2E8F0; }
    .brand-panel-name { color: #F1F5F9; }
    .brand-panel-desc { color: #64748B; }
    .auth-panel-heading { color: #F1F5F9; }
    .btn-provider {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.1);
        color: #E2E8F0;
    }
    .btn-provider:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.18);
    }
    .btn-provider svg { color: #94A3B8; }
    .btn-provider.primary {
        background: #F1F5F9;
        border-color: #F1F5F9;
        color: #0F172A;
    }
    .btn-provider.primary:hover {
        background: #E2E8F0;
        border-color: #E2E8F0;
    }
    .btn-provider.primary svg { color: #0F172A; }
    .btn-provider.primary .btn-hint { color: rgba(15,23,42,0.5); }
    .btn-hint { color: #64748B; }
    .btn-label { color: #E2E8F0; }
    .divider { color: #475569; }
    .divider::before, .divider::after { background: rgba(255,255,255,0.08); }
    .scan-hint { color: #64748B; }
    .qr-frame { border-color: rgba(255,255,255,0.1); background: #1E293B; }
    .step { color: #64748B; }
    .step.active { color: #E2E8F0; }
    .step.done { color: #E2E8F0; }
    .step.done .step-icon { color: #34D399; }
    .spinner { border-color: rgba(255,255,255,0.08); border-top-color: #F1F5F9; }
    .session-info { border-color: rgba(255,255,255,0.08); }
    .session-row + .session-row { border-color: rgba(255,255,255,0.08); }
    .session-label { color: #64748B; }
    .method-detail { color: #64748B; }
    .error-msg { color: #64748B; }
    .btn-retry { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); color: #E2E8F0; }
    .btn-retry:hover { background: rgba(255,255,255,0.07); }
    .footer { border-color: rgba(255,255,255,0.06); color: #475569; }
    .footer .link-btn { color: #64748B; }
    .scan-label { color: #E2E8F0; }

    .error-title { color: #E2E8F0; }
}
`,De='<svg viewBox="0 0 500 500"><style>.ld{fill:#fff}@media(prefers-color-scheme:dark){.ld{fill:#2a2a2a}}</style><defs><linearGradient id="pg" y2="1"><stop offset="21%" stop-color="#34E89E"/><stop offset="42%" stop-color="#12B06E"/></linearGradient><linearGradient id="pb" x1="1" y1="1" x2="0" y2="0"><stop offset="21%" stop-color="#00BCF2"/><stop offset="42%" stop-color="#00A0EB"/></linearGradient></defs><path d="M100 0H450L0 450V100A100 100 0 0 1 100 0Z" fill="url(#pg)"/><path d="M500 50V400A100 100 0 0 1 400 500H50L500 50Z" fill="url(#pb)"/><polygon class="ld" points="0,500 50,500 500,50 500,0"/></svg>',lt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="7.5" r="3"/><path d="M10.5 13c-3.3 0-6 2-6 4.5V19h12v-1.5c0-1-.4-2-1-2.7"/><line x1="18" y1="12" x2="18" y2="18"/><line x1="15" y1="15" x2="21" y2="15"/></svg>';var Lt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',Ft='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',Ot='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>',$t='<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',Kt='<svg viewBox="0 0 24 24"><rect fill="#F25022" x="2" y="2" width="9.5" height="9.5"/><rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5"/><rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5"/><rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5"/></svg>',Wt='<svg viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',jt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',qt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';var Vt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';function k(r,e,...t){let n=document.createElement(r);if(e!=null)for(let[s,i]of Object.entries(e))s==="className"?n.className=i:s.startsWith("on")&&typeof i=="function"?n.addEventListener(s.slice(2).toLowerCase(),i):s==="html"?n.innerHTML=i:i===!1||i==null||(i===!0?n.setAttribute(s,""):n.setAttribute(s,String(i)));for(let s of t.flat(1/0))s==null||s===!1||n.appendChild(typeof s=="string"?document.createTextNode(s):s);return n}function Gt(r){try{let e=(0,dt.default)(0,"M");e.addData(r),e.make();let t=e.getModuleCount(),n=Math.max(3,Math.floor(200/t));return e.createSvgTag({cellSize:n,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${r}</div>`}}var ue=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,t)=>{this.resolve=e,this.reject=t,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.attributes=void 0,this.sessionRelay=void 0,this.mount(),this.cfg.pushToken?this.startPush():this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=Ht,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let t=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,m=>m.toUpperCase()),n=this.state==="idle",s;switch(this.state){case"qr-scanning":s="Open Privasys Wallet on your phone and scan the QR code displayed on the right to authenticate.";break;case"push-waiting":s="Check your phone \u2014 tap the notification from Privasys ID to approve this sign-in.";break;case"wallet-connected":case"authenticating":s="Verifying your identity\u2026 This will only take a moment.";break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":s="Complete the biometric prompt on your device to verify your identity.";break;case"success":s="";break;case"error":s="Something went wrong. You can try again or choose a different method.";break;default:s=`<strong>${t}</strong> needs to verify your identity. Please choose one of the authentication options.`}let i;switch(this.state){case"push-waiting":i=this.renderPushWaiting();break;case"qr-scanning":i=this.renderQR();break;case"wallet-connected":case"authenticating":i=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":i=this.renderPasskeyProgress();break;case"success":i=this.renderSuccess();break;case"error":i=this.renderError();break;default:i=this.renderIdle()}let c=k("div",{className:"page"},k("button",{className:"btn-close",html:jt,onClick:()=>this.handleCancel()}),k("div",{className:"brand-panel"},k("div",{className:"brand-panel-header"},k("div",{className:"brand-panel-logo",html:De}),k("div",{className:"brand-panel-name"},"Privasys")),s?k("p",{className:"brand-panel-desc",html:s}):null,this.isFlowState()?this.renderBrandProgress():null),k("div",{className:`auth-panel${n?"":" auth-panel--centered"}`},!n&&this.state!=="success"?k("button",{className:"btn-back",onClick:()=>this.goBack()},k("span",{html:Vt}),"Back"):null,this.isFlowState()?k("div",{className:"mobile-progress-header"},this.renderBrandProgress()):null,i),k("div",{className:"footer"},"By continuing, you agree to the ",k("a",{href:"https://privasys.org/legal/terms",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Terms of Service")," and ",k("a",{href:"https://privasys.org/legal/privacy",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Privacy Policy"),"."));this.shadow.appendChild(c)}goBack(){this.cleanup(),this.state="idle",this.errorMsg="",this.render()}renderIdle(){let e=ae.isSupported(),t=!!this.cfg.pushToken,n=this.cfg.socialProviders??[],s=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,I=>I.toUpperCase()),i=[];if(t&&i.push(k("button",{className:"btn-provider primary",onClick:()=>this.startPush()},k("span",{html:Ft}),k("span",{className:"btn-label"},"Sign in with Privasys ID"),k("span",{className:"btn-hint"},"Notification"))),i.push(k("button",{className:`btn-provider ${t?"":"primary"}`,onClick:()=>this.startWallet()},k("span",{html:De}),k("span",{className:"btn-label"},t?"Scan QR code instead":"Continue with Privasys ID"))),(e||n.length>0)&&i.push(k("div",{className:"divider"},k("span",null,"or"))),e){let I=this.getWebAuthnClient().sessions.hasPasskeyHint()?"authenticate":"register";i.push(k("button",{className:"btn-provider",onClick:()=>this.startPasskey(I)},k("span",{html:lt}),k("span",{className:"btn-label"},"Passkey"),k("span",{className:"btn-hint"},"Face ID, Touch ID, Windows Hello")))}let m={github:Ot,google:$t,microsoft:Kt,linkedin:Wt},C={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"};for(let I of n){let T=m[I]??"",S=C[I]??I;i.push(k("button",{className:"btn-provider",onClick:()=>this.startSocial(I)},T?k("span",{html:T}):null,k("span",{className:"btn-label"},S)))}return k("div",null,k("h2",{className:"auth-panel-heading"},`Sign in to ${s}`),...i)}renderQR(){let e=this.getRelayClient(),{payload:t}=e.createQR(this.sessionId,this.cfg.sessionRelay);return k("div",null,k("div",{className:"qr-section"},k("div",{className:"qr-frame",html:Gt(t)}),k("div",{className:"scan-label"},k("span",{className:"pulse"}),"Scan with Privasys Wallet")))}renderPushWaiting(){let e=ae.isSupported();return k("div",null,k("p",{className:"btn-provider",style:"margin-bottom: 20px; max-width: none; text-align: center;"},"Check your phone \u2014 tap the notification to approve this connection."),k("div",{className:"divider"},k("span",null,"or")),k("div",{className:"alt-actions"},k("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startWallet()}},k("span",{html:De}),k("span",{className:"btn-label"},"Scan QR code instead")),e?k("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startPasskey(this.getWebAuthnClient().sessions.hasPasskeyHint()?"authenticate":"register")}},k("span",{html:lt}),k("span",{className:"btn-label"},"Passkey")):null))}renderWalletProgress(){return k("div",null,k("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},"Verifying your identity\u2026 This will only take a moment."))}renderPasskeyProgress(){let t=this.state==="passkey-requesting"?"Preparing\u2026":"Complete the biometric prompt on your device.";return k("div",null,k("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},t))}isFlowState(){return["push-waiting","qr-scanning","wallet-connected","authenticating","passkey-requesting","passkey-ceremony","passkey-verifying","success"].includes(this.state)}renderBrandProgress(){let e=this.state==="success",t=this.method==="wallet"?"Privasys ID":"Passkey",n=this.method==="wallet"&&this.attestation?.valid,s=this.method==="passkey"?"This device":n?"Attestation verified":null,i;if(this.method==="passkey"){let c=this.state;i=k("div",{className:"steps"},k("div",{className:`step ${c!=="passkey-requesting"?"done":"active"}`},k("span",{className:"step-icon"},c!=="passkey-requesting"?"\u2713":"\u2022"),"Options received from enclave"),k("div",{className:`step ${c==="passkey-ceremony"?"active":c==="passkey-verifying"||e?"done":""}`},k("span",{className:"step-icon"},c==="passkey-verifying"||e?"\u2713":"\u2022"),"Biometric prompt completed"),k("div",{className:`step ${c==="passkey-verifying"?"active":e?"done":""}`},k("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Enclave verification"),k("div",{className:`step ${e?"done":""}`},k("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}else{let c=!!this.cfg.pushToken,m=["wallet-connected","authenticating","success"].includes(this.state),C=this.state==="authenticating"||e,I=c?["push-waiting","wallet-connected","authenticating","success"].includes(this.state):m||C,T=!I&&this.state==="qr-scanning",S=c?"Notification sent":"QR code scanned",M=c?"Approved on Privasys ID":"Server attestation verified",F=c&&this.state==="push-waiting"||m&&!C;i=k("div",{className:"steps"},k("div",{className:`step ${I?"done":T?"active":""}`},k("span",{className:"step-icon"},I?"\u2713":"\u2022"),S),k("div",{className:`step ${F?"active":C?"done":""}`},k("span",{className:"step-icon"},C?"\u2713":"\u2022"),M),k("div",{className:`step ${this.state==="authenticating"?"active":e?"done":""}`},k("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Biometric authentication"),k("div",{className:`step ${e?"done":""}`},k("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}return e&&i.appendChild(k("div",{className:"step done"},k("span",{className:"step-icon"},"\u2713"),`Authenticated via ${t}`)),k("div",{className:"brand-progress"},i)}renderSuccess(){let e=!!this.pushToken&&!this.cfg.deviceTrusted,t=this.method==="wallet"?"Privasys ID":"Passkey",n=this.method==="wallet"&&this.attestation?.valid,s=this.method==="passkey"?"This device":n?"Attestation verified":null;return k("div",null,e?k("div",{style:"width: 100%;"},k("p",{style:"font-size: 14px; font-weight: 500; margin-bottom: 6px;"},"Trust this device?"),k("p",{className:"scan-hint",style:"margin-bottom: 16px; max-width: none;"},"Next time, we\u2019ll send a notification to your phone instead of showing a QR code."),k("button",{className:"btn-provider primary",onClick:()=>this.finishWithTrust(!0)},k("span",{html:qt}),k("span",{className:"btn-label"},"Trust this device")),k("button",{className:"link-btn",style:"margin-top: 12px; font-size: 13px; display: block; text-align: center; width: 100%;",onClick:()=>this.finishWithTrust(!1)},"Not now")):k("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return k("div",null,k("div",{className:"error-icon",html:Lt}),k("div",{className:"error-title"},"Authentication failed"),k("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),k("button",{className:"btn-retry",onClick:()=>{this.errorMsg="",this.state="idle",this.render()}},"Try again"))}startPush(){this.method="wallet";let e=this.getRelayClient();this.state="push-waiting",this.render(),e.notifyAndWait(this.cfg.pushToken,this.cfg.sessionId).then(t=>{this.sessionToken=t.sessionToken,this.attestation=t.attestation,this.sessionId=t.sessionId,this.pushToken=t.pushToken,this.attributes=t.attributes,this.sessionRelay=t.sessionRelay,this.complete()},t=>{this.state="error",this.errorMsg=t?.message??"Push authentication failed",this.render()})}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:t}=e.createQR(this.cfg.sessionId,this.cfg.sessionRelay);this.sessionId=t,this.state="qr-scanning",this.render(),e.waitForResult(t).then(n=>{this.sessionToken=n.sessionToken,this.attestation=n.attestation,this.sessionId=n.sessionId,this.pushToken=n.pushToken,this.attributes=n.attributes,this.sessionRelay=n.sessionRelay,this.complete()},n=>{this.state="error",this.errorMsg=n?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let t=this.getWebAuthnClient();try{let n;if(e==="register")n=await t.register(globalThis.location?.hostname??"user");else try{n=await t.authenticate()}catch(s){let i=s?.message??"";if(i.includes("no credentials")||i.includes("not found")||i.includes("cancelled"))this.state="passkey-requesting",this.render(),n=await t.register(globalThis.location?.hostname??"user");else throw s}this.sessionToken=n.sessionToken,this.sessionId=n.sessionId,this.complete()}catch(n){this.state="error",this.errorMsg=n?.message??"Passkey authentication failed",this.render()}}async startSocial(e){if(this.cfg.onSocialAuth){this.state="authenticating",this.render();try{await this.cfg.onSocialAuth(e),this.method="wallet",this.sessionToken="",this.sessionId=this.cfg.sessionId??"",this.complete()}catch(t){this.state="error",this.errorMsg=t?.message??`${e} authentication failed`,this.render()}}}complete(){this.state="success",this.render(),(!this.pushToken||this.cfg.deviceTrusted)&&setTimeout(()=>this.finishWithTrust(!1),1200)}finishWithTrust(e){let t={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId,pushToken:this.pushToken,attributes:this.attributes,trustDevice:e,sessionRelay:this.sessionRelay};this.close(),this.resolve?.(t),this.resolve=null,this.reject=null}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new me({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout,requestedAttributes:this.cfg.requestedAttributes,appName:this.cfg.appName,privacyPolicyUrl:this.cfg.privacyPolicyUrl},{onStateChange:e=>{let t={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};if(t[e]){if(this.state==="push-waiting"&&e==="waiting-for-scan")return;this.state=t[e],this.render()}}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new ae({apiBase:this.cfg.apiBase,appName:this.cfg.appName,sessionId:this.cfg.sessionId,fido2Base:this.cfg.fido2Base},{onStateChange:e=>{let t={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};t[e]&&(this.state=t[e],this.render())}})),this.webauthnClient}};var we="application/privasys-sealed+cbor",ht="application/privasys-sealed-stream+cbor",ut="PrivasysSession",Qt=new TextEncoder().encode("privasys-session/v1"),zt=new TextEncoder().encode("privasys-dir/c2s"),Jt=new TextEncoder().encode("privasys-dir/s2c"),ke=class r{constructor(e,t,n,s){this.c2sCtr=0n;this.s2cCtr=0n;this.host=e,this.sessionId=t,this.keys=n,this.fetchImpl=s}static async create(e){let t=e.fetchImpl??fetch.bind(globalThis),n=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},!1,["deriveBits"]),s=new Uint8Array(await crypto.subtle.exportKey("raw",n.publicKey));if(s.byteLength!==65||s[0]!==4)throw new Error("PrivasysSession: unexpected SEC1 encoding");let i=rr(s),c=await e.attestWithWallet({sdkPub:i,host:e.host});return r.fromHandshake({host:e.host,sessionId:c.sessionId,sdkPrivateKey:n.privateKey,encPub:c.encPub,fetchImpl:t})}static async fromHandshake(e){let t=e.fetchImpl??fetch.bind(globalThis),n=bt(e.encPub);if(n.byteLength!==65||n[0]!==4)throw new Error("PrivasysSession: enclave public key not SEC1 uncompressed");let s=await crypto.subtle.importKey("raw",n,{name:"ECDH",namedCurve:"P-256"},!1,[]),i=await crypto.subtle.deriveBits({name:"ECDH",public:s},e.sdkPrivateKey,256),c=bt(e.sessionId),m=await crypto.subtle.importKey("raw",i,"HKDF",!1,["deriveBits","deriveKey"]),C=await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:c,info:Qt},m,256),I=await crypto.subtle.importKey("raw",C,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"]),T=new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:c,info:zt},m,32)),S=new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:c,info:Jt},m,32));return new r(e.host,e.sessionId,{aead:I,c2sPrefix:T,s2cPrefix:S},t)}async request(e,t,n,s){let i=e.toUpperCase(),c=ft(i,t,this.sessionId),m=pt(n),C=this.c2sCtr++,I=ce(this.keys.c2sPrefix,C),T=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:I,additionalData:c},this.keys.aead,m)),S=gt({v:1,ctr:C,ct:T}),M=new Headers(s?.headers);M.set("Content-Type",we),M.set("Authorization",`${ut} ${this.sessionId}`);let F=`https://${this.host}${t}`,D=await this.fetchImpl(F,{...s,method:i,headers:M,body:S}),$=new Uint8Array(await D.arrayBuffer()),ee=D.headers.get("content-type")??"";if(ee.startsWith(ht)){let v=[];for await(let l of er($,this.keys.aead,this.keys.s2cPrefix,c))v.push(l);return{status:Le(D.headers,D.status),sealed:!0,body:le(v),headers:D.headers}}if(!ee.startsWith(we))return{status:D.status,sealed:!1,body:$,headers:D.headers};let j=Ae($),A=ce(this.keys.s2cPrefix,j.ctr),E=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:A,additionalData:c},this.keys.aead,j.ct));return j.ctr>=this.s2cCtr&&(this.s2cCtr=j.ctr+1n),{status:D.status,sealed:!0,body:E,headers:D.headers}}async json(e,t,n,s){let i=await this.request(e,t,n,s);if(i.status>=400)throw new Error(`PrivasysSession ${e} ${t}: ${i.status}`);return JSON.parse(new TextDecoder().decode(i.body))}async stream(e,t,n,s){let i=e.toUpperCase(),c=ft(i,t,this.sessionId),m=pt(n),C=this.c2sCtr++,I=ce(this.keys.c2sPrefix,C),T=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:I,additionalData:c},this.keys.aead,m)),S=gt({v:1,ctr:C,ct:T}),M=new Headers(s?.headers);M.set("Content-Type",we),M.set("Authorization",`${ut} ${this.sessionId}`);let F=`https://${this.host}${t}`,D=await this.fetchImpl(F,{...s,method:i,headers:M,body:S}),$=D.headers.get("content-type")??"";if(!$.startsWith(ht)){let l=new Uint8Array(await D.arrayBuffer()),b=[l],a=!1,o=D.status;if($.startsWith(we)){let h=Ae(l),y=ce(this.keys.s2cPrefix,h.ctr);b=[new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:y,additionalData:c},this.keys.aead,h.ct))],a=!0,o=Le(D.headers,D.status)}let x=new ReadableStream({start(h){for(let y of b)h.enqueue(y);h.close()}});return{status:o,sealed:a,headers:D.headers,body:x}}let ee=this.keys.aead,j=this.keys.s2cPrefix,A=D.body.getReader(),E=Le(D.headers,D.status),v=tr(A,ee,j,c),w=new ReadableStream({async pull(l){try{let{value:b,done:a}=await v.next();if(a){l.close();return}l.enqueue(b)}catch(b){l.error(b)}},cancel(l){v.return?.(void 0).catch(()=>{}),A.cancel(l).catch(()=>{})}});return{status:E,sealed:!0,headers:D.headers,body:w}}};function pt(r){return r==null?new Uint8Array(0):r instanceof Uint8Array?r:r instanceof ArrayBuffer?new Uint8Array(r):typeof r=="string"?new TextEncoder().encode(r):new TextEncoder().encode(JSON.stringify(r))}function ft(r,e,t){return new TextEncoder().encode(`${r}:${e}:${t}`)}function ce(r,e){let t=new Uint8Array(12);return t.set(r.subarray(0,4),0),new DataView(t.buffer).setBigUint64(4,e,!1),t}function gt(r){let e=[];return e.push(new Uint8Array([163])),e.push(He("v")),e.push(Fe(BigInt(r.v))),e.push(He("ctr")),e.push(Fe(r.ctr)),e.push(He("ct")),e.push(Yt(r.ct)),le(e)}function Ae(r){let e=0;if(r[e]!==163)throw new Error("CBOR: expected map(3)");e+=1;let t={};for(let n=0;n<3;n++){let[s,i]=Xt(r,e);if(e=i,s==="v"){let[c,m]=yt(r,e);t.v=Number(c),e=m}else if(s==="ctr"){let[c,m]=yt(r,e);t.ctr=c,e=m}else if(s==="ct"){let[c,m]=Zt(r,e);t.ct=c,e=m}else throw new Error(`CBOR: unexpected key ${s}`)}if(t.v==null||t.ctr==null||t.ct==null)throw new Error("CBOR: incomplete envelope");return t}function Fe(r){if(r<0n)throw new Error("cborUint: negative");if(r<24n)return new Uint8Array([Number(r)]);if(r<256n)return new Uint8Array([24,Number(r)]);if(r<65536n){let t=new Uint8Array(3);return t[0]=25,new DataView(t.buffer).setUint16(1,Number(r),!1),t}if(r<4294967296n){let t=new Uint8Array(5);return t[0]=26,new DataView(t.buffer).setUint32(1,Number(r),!1),t}let e=new Uint8Array(9);return e[0]=27,new DataView(e.buffer).setBigUint64(1,r,!1),e}function vt(r,e){let t=Fe(e);return t[0]=r<<5|t[0]&31,t}function He(r){let e=new TextEncoder().encode(r);return le([vt(3,BigInt(e.byteLength)),e])}function Yt(r){return le([vt(2,BigInt(r.byteLength)),r])}function yt(r,e){let t=r[e]>>5;if(t!==0)throw new Error(`CBOR: expected uint, got major=${t}`);return Oe(r,e)}function Xt(r,e){let t=r[e]>>5;if(t!==3)throw new Error(`CBOR: expected text, got major=${t}`);let[n,s]=Oe(r,e),i=Number(n);return[new TextDecoder().decode(r.subarray(s,s+i)),s+i]}function Zt(r,e){let t=r[e]>>5;if(t!==2)throw new Error(`CBOR: expected bytes, got major=${t}`);let[n,s]=Oe(r,e),i=Number(n);return[r.subarray(s,s+i),s+i]}function Oe(r,e){let t=r[e]&31;if(t<24)return[BigInt(t),e+1];if(t===24)return[BigInt(r[e+1]),e+2];if(t===25)return[BigInt(new DataView(r.buffer,r.byteOffset+e+1,2).getUint16(0,!1)),e+3];if(t===26)return[BigInt(new DataView(r.buffer,r.byteOffset+e+1,4).getUint32(0,!1)),e+5];if(t===27)return[new DataView(r.buffer,r.byteOffset+e+1,8).getBigUint64(0,!1),e+9];throw new Error(`CBOR: indefinite-length not supported (ai=${t})`)}function le(r){let e=0;for(let s of r)e+=s.byteLength;let t=new Uint8Array(e),n=0;for(let s of r)t.set(s,n),n+=s.byteLength;return t}function Le(r,e){let t=r.get("x-privasys-inner-status");if(!t)return e;let n=parseInt(t,10);return Number.isFinite(n)&&n>0?n:e}async function*er(r,e,t,n){let s=0;for(;s+4<=r.byteLength;){let i=new DataView(r.buffer,r.byteOffset+s,4).getUint32(0,!1);if(s+=4,i===0)return;if(s+i>r.byteLength)throw new Error("sealed-stream: truncated frame");let c=Ae(r.subarray(s,s+i));s+=i;let m=ce(t,c.ctr);yield new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:m,additionalData:n},e,c.ct))}}async function*tr(r,e,t,n){let s=new Uint8Array(0);for(;;){for(;s.byteLength<4;){let{value:I,done:T}=await r.read();if(T){if(s.byteLength===0)return;throw new Error("sealed-stream: truncated length header")}s=le([s,I])}let i=new DataView(s.buffer,s.byteOffset,4).getUint32(0,!1);if(i===0)return;for(;s.byteLength<4+i;){let{value:I,done:T}=await r.read();if(T)throw new Error("sealed-stream: truncated frame");s=le([s,I])}let c=Ae(s.subarray(4,4+i));s=s.slice(4+i);let m=ce(t,c.ctr);yield new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:m,additionalData:n},e,c.ct))}}function rr(r){let e="";for(let t=0;t<r.byteLength;t++)e+=String.fromCharCode(r[t]);return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function bt(r){let e=r.replace(/-/g,"+").replace(/_/g,"/"),t=e.length%4===0?"":"=".repeat(4-e.length%4),n=atob(e+t),s=new Uint8Array(n.length);for(let i=0;i<n.length;i++)s[i]=n.charCodeAt(i);return s}var q=new oe,ne=null,pe=null,se=null;async function nr(){let r=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},!1,["deriveBits"]),e=new Uint8Array(await crypto.subtle.exportKey("raw",r.publicKey));if(e.byteLength!==65||e[0]!==4)throw new Error("frame-host: unexpected SEC1 encoding for SDK pubkey");let t="";for(let s=0;s<e.byteLength;s++)t+=String.fromCharCode(e[s]);let n=btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return{keyPair:r,sdkPubB64:n}}var sr=780*1e3,fe=new Map;function mt(r){let e=fe.get(r);e&&(clearTimeout(e),fe.delete(r))}function Ce(r,e){if(mt(r.rpId),!r.refreshToken||!r.clientId)return;let t=setTimeout(async()=>{fe.delete(r.rpId);let n=q.get(r.rpId);if(!(!n?.refreshToken||!n?.clientId))try{await wt(n,e);let s=q.get(r.rpId);s&&Ce(s,e)}catch(s){console.warn("[frame-host] renewal failed, expiring session:",s),q.remove(r.rpId),window.parent.postMessage({type:"privasys:session-expired",rpId:r.rpId},e)}},sr);fe.set(r.rpId,t)}async function wt(r,e,t=!0){let n=globalThis.location.origin,s=await fetch(`${n}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:r.refreshToken,client_id:r.clientId})});if(!s.ok){let c=await s.json().catch(()=>({error:s.statusText}));throw new Error(c.error_description||c.error||`Refresh failed: ${s.status}`)}let i=await s.json();q.store({...r,token:i.access_token,refreshToken:i.refresh_token,authenticatedAt:Date.now()}),t&&window.parent.postMessage({type:"privasys:session-renewed",rpId:r.rpId,accessToken:i.access_token},e)}function ir(r,e=3e4){try{let t=JSON.parse(atob(r.split(".")[1]));return typeof t.exp!="number"?!1:t.exp*1e3-e<Date.now()}catch{return!1}}async function or(){let r=new Uint8Array(32);crypto.getRandomValues(r);let e=Array.from(r,s=>s.toString(16).padStart(2,"0")).join(""),t=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(e)),n=btoa(String.fromCharCode(...new Uint8Array(t))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return{codeVerifier:e,codeChallenge:n}}function ar(r,e,t){return new Promise((n,s)=>{let i=document.createElement("div");i.style.cssText="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:10000;font-family:system-ui,sans-serif;";let c=document.createElement("div");c.style.cssText="background:#fff;border-radius:12px;padding:32px 28px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.18);text-align:center;";let m=document.createElement("h2");m.textContent="Verify your identity",m.style.cssText="margin:0 0 8px;font-size:18px;color:#1a1a2e;";let C=document.createElement("p");C.textContent="To complete your account, sign in with one of these providers to verify your email.",C.style.cssText="margin:0 0 20px;font-size:14px;color:#666;line-height:1.4;",c.appendChild(m),c.appendChild(C);let I={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"},T=S=>{let D=window.screenX+(window.innerWidth-500)/2,$=window.screenY+(window.innerHeight-650)/2,ee=`${r}/auth/social?provider=${encodeURIComponent(S)}&session_id=${encodeURIComponent(e)}`,j=window.open(ee,"privasys-social",`width=500,height=650,left=${D},top=${$}`);if(!j){s(new Error("Popup blocked \u2014 please allow popups for this site"));return}let A=()=>{window.removeEventListener("message",E),clearInterval(v),i.remove()},E=w=>{w.source===j&&(w.data?.type==="privasys:social-complete"?(A(),j.close(),n()):w.data?.type==="privasys:social-error"&&(A(),j.close(),s(new Error(w.data.error||"Social verification failed"))))};window.addEventListener("message",E);let v=setInterval(()=>{j.closed&&(A(),s(new Error("Verification cancelled")))},500)};for(let S of t){let M=document.createElement("button");M.textContent=I[S]??S,M.style.cssText="display:block;width:100%;padding:12px 16px;margin:8px 0;border:1px solid #ddd;border-radius:8px;background:#fff;font-size:14px;cursor:pointer;transition:background .15s;",M.onmouseenter=()=>{M.style.background="#f5f5f5"},M.onmouseleave=()=>{M.style.background="#fff"},M.onclick=()=>T(S),c.appendChild(M)}i.appendChild(c),document.body.appendChild(i)})}async function cr(r,e=12e4){let t=Date.now()+e;for(;Date.now()<t;){let n=await fetch(r);if(!n.ok)throw new Error(`poll failed: ${n.status}`);let s=await n.json();if(s.authenticated&&s.redirect_uri){let c=new URL(s.redirect_uri,globalThis.location.origin).searchParams.get("code");if(c)return c}await new Promise(i=>setTimeout(i,1500))}throw new Error("OIDC session timed out")}async function lr(r,e,t){let n=await fetch(`${r}/session/complete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,user_id:t?.sub||"",attributes:t||{}})});if(!n.ok){let i=await n.json().catch(()=>({error:n.statusText}));throw new Error(i.error_description||i.error||`Session complete failed: ${n.status}`)}let s=await n.json();if(!s.code)throw new Error("No authorization code returned");return s.code}async function dr(r,e,t,n){let s=await fetch(`${r}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code:e,client_id:t,code_verifier:n})});if(!s.ok){let i=await s.json().catch(()=>({error:s.statusText}));throw new Error(i.error_description||i.error||`Token exchange failed: ${s.status}`)}return s.json()}window.addEventListener("message",async r=>{let e=r.data;if(!(!e||typeof e.type!="string")){if(e.type==="privasys:init"){let t=e.config,n=r.origin;ne&&(ne.destroy(),ne=null),pe=null;let s;if(t.sessionRelay?.appHost){let{keyPair:I,sdkPubB64:T}=await nr();pe={appHost:t.sessionRelay.appHost,sdkKeyPair:I,sdkPubB64:T},s={sdkPub:T,appHost:t.sessionRelay.appHost}}let i=globalThis.location.origin,c=t.clientId;if(c){try{let{codeVerifier:I,codeChallenge:T}=await or(),S=new URL("/authorize",i);S.searchParams.set("client_id",c),S.searchParams.set("response_type","code"),S.searchParams.set("code_challenge",T),S.searchParams.set("code_challenge_method","S256");let M=Array.isArray(t.scope)?t.scope.join(" "):t.scope||"openid offline_access";S.searchParams.set("scope",M),S.searchParams.set("response_mode","json");let F=await fetch(S.toString(),{headers:{Accept:"application/json"}});if(!F.ok){let h=await F.json().catch(()=>({error:F.statusText}));throw new Error(h.error_description||h.error||`Authorize failed: ${F.status}`)}let D=await F.json(),$=D.session_id,ee=D.poll_url,j=D.requested_attributes,A=[];try{let h=await fetch(`${i}/auth/social/providers`);h.ok&&(A=(await h.json()).providers??[])}catch{}let E=q.findPushToken(),v=!!q.getDeviceHint(),w=h=>new Promise((y,_)=>{let O=window.screenX+(window.innerWidth-500)/2,W=window.screenY+(window.innerHeight-650)/2,Q=`${i}/auth/social?provider=${encodeURIComponent(h)}&session_id=${encodeURIComponent($)}`,V=window.open(Q,"privasys-social",`width=500,height=650,left=${O},top=${W}`);if(!V){_(new Error("Popup blocked \u2014 please allow popups for this site"));return}let G=()=>{window.removeEventListener("message",te),clearInterval(Ie)},te=Y=>{Y.source===V&&(Y.data?.type==="privasys:social-complete"?(G(),V.close(),y()):Y.data?.type==="privasys:social-error"&&(G(),V.close(),_(new Error(Y.data.error||"Social authentication failed"))))};window.addEventListener("message",te);let Ie=setInterval(()=>{V.closed&&(G(),_(new Error("Authentication cancelled")))},500)});ne=new ue({...t,apiBase:i,sessionId:$,fido2Base:`${i}/fido2`,pushToken:E,deviceTrusted:v,socialProviders:A,onSocialAuth:w,requestedAttributes:j,sessionRelay:s});let l=await ne.signIn(),b;if(l.method==="passkey"){if(j?.some(y=>y==="email"||y==="name")){if(A.length===0)throw new Error("Profile verification required (email/name) but the IdP has no external identity providers configured. Contact support.");await ar(i,$,A)}b=await cr(ee)}else b=await lr(i,$,l.attributes);let a=await dr(i,b,c,I),o=t.rpId||t.appName,x={token:a.access_token,rpId:o,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:l.pushToken,brokerUrl:t.brokerUrl||"",refreshToken:a.refresh_token,clientId:c};q.store(x),x.pushToken&&x.brokerUrl&&(l.trustDevice||v)&&q.saveDeviceHint(x.pushToken,x.brokerUrl),Ce(x,n),l.sessionRelay&&await xt(l.sessionRelay,n),window.parent.postMessage({type:"privasys:result",result:{...l,accessToken:a.access_token}},n)}catch(I){let T=I instanceof Error?I.message:"Authentication failed";T==="Authentication cancelled"||T==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},n):window.parent.postMessage({type:"privasys:error",error:T},n)}finally{ne=null}return}let m=q.findPushToken(),C=!!q.getDeviceHint();ne=new ue({...t,pushToken:m,deviceTrusted:C,sessionRelay:s});try{let I=await ne.signIn(),T=t.brokerUrl||"",S={token:I.sessionToken,rpId:t.rpId||t.appName,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:I.pushToken,brokerUrl:T};q.store(S),S.pushToken&&S.brokerUrl&&((I.trustDevice||C)&&q.saveDeviceHint(S.pushToken,S.brokerUrl),Ce(S,n)),I.sessionRelay&&await xt(I.sessionRelay,n),window.parent.postMessage({type:"privasys:result",result:I},n)}catch(I){let T=I instanceof Error?I.message:"Authentication failed";T==="Authentication cancelled"||T==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},n):window.parent.postMessage({type:"privasys:error",error:T},n)}finally{ne=null}}if(e.type==="privasys:check-session"){let t=q.get(e.rpId);if(t?.token&&t?.refreshToken&&t?.clientId&&ir(t.token))try{await wt(t,r.origin,!1),t=q.get(e.rpId)}catch{q.remove(e.rpId),t=void 0}t?.refreshToken&&t?.clientId&&!fe.has(t.rpId)&&Ce(t,r.origin),window.parent.postMessage({type:"privasys:session",session:t||null},r.origin)}if(e.type==="privasys:clear-session"&&(mt(e.rpId),q.remove(e.rpId),q.clearDeviceHint(),window.parent.postMessage({type:"privasys:session-cleared"},r.origin)),e.type==="privasys:session:request"){let t=e.id,n=s=>window.parent.postMessage({type:"privasys:session:response",id:t,...s},r.origin);if(!se){n({error:"no active session"});return}if(se.expiresAt&&se.expiresAt<=Date.now()){n({error:"session expired"});return}try{let s=String(e.method||"GET").toUpperCase(),i=String(e.path||"/"),c=e.body,m=e.init??void 0,C=await se.session.request(s,i,c,m),I={};C.headers.forEach((T,S)=>{I[S]=T}),n({status:C.status,headers:I,body:C.body,sealed:C.sealed})}catch(s){n({error:s instanceof Error?s.message:String(s)})}}if(e.type==="privasys:session:stream-request"){let t=e.id,n=(s,i={})=>window.parent.postMessage({type:s,id:t,...i},r.origin);if(!se){n("privasys:session:stream-error",{error:"no active session"});return}if(se.expiresAt&&se.expiresAt<=Date.now()){n("privasys:session:stream-error",{error:"session expired"});return}try{let s=String(e.method||"POST").toUpperCase(),i=String(e.path||"/"),c=e.body,m=e.init??void 0,C=await se.session.stream(s,i,c,m),I={};C.headers.forEach((S,M)=>{I[M]=S}),n("privasys:session:stream-start",{status:C.status,headers:I,sealed:C.sealed});let T=C.body.getReader();try{for(;;){let{value:S,done:M}=await T.read();if(M)break;S&&S.byteLength>0&&n("privasys:session:stream-chunk",{chunk:S})}n("privasys:session:stream-end")}catch(S){n("privasys:session:stream-error",{error:S instanceof Error?S.message:String(S)})}}catch(s){n("privasys:session:stream-error",{error:s instanceof Error?s.message:String(s)})}}}});async function xt(r,e){if(!pe){console.warn("[frame-host] sessionRelay returned without pending handshake \u2014 ignoring");return}let{sdkKeyPair:t,appHost:n}=pe;pe=null;try{let s=await ke.fromHandshake({host:n,sessionId:r.sessionId,sdkPrivateKey:t.privateKey,encPub:r.encPub});se={appHost:n,sessionId:r.sessionId,expiresAt:r.expiresAt??0,session:s},window.parent.postMessage({type:"privasys:session:ready",sessionId:r.sessionId,appHost:n,expiresAt:r.expiresAt??0},e)}catch(s){console.error("[frame-host] failed to derive sealed session:",s),window.parent.postMessage({type:"privasys:session:error",error:s instanceof Error?s.message:String(s)},e)}}window.parent.postMessage({type:"privasys:ready"},"*");})();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=privasys-auth-frame.iife.js.map
