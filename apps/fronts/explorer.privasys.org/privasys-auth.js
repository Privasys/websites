"use strict";var Privasys=(()=>{var Ne=Object.create;var ee=Object.defineProperty;var Se=Object.getOwnPropertyDescriptor;var Te=Object.getOwnPropertyNames;var Ee=Object.getPrototypeOf,Me=Object.prototype.hasOwnProperty;var Re=(A,e)=>()=>(e||A((e={exports:{}}).exports,e),e.exports),Be=(A,e)=>{for(var s in e)ee(A,s,{get:e[s],enumerable:!0})},fe=(A,e,s,f)=>{if(e&&typeof e=="object"||typeof e=="function")for(let h of Te(e))!Me.call(A,h)&&h!==s&&ee(A,h,{get:()=>e[h],enumerable:!(f=Se(e,h))||f.enumerable});return A};var Pe=(A,e,s)=>(s=A!=null?Ne(Ee(A)):{},fe(e||!A||!A.__esModule?ee(s,"default",{value:A,enumerable:!0}):s,A)),Le=A=>fe(ee({},"__esModule",{value:!0}),A);var be=Re((ge,ve)=>{var pe=(function(){var A=function(w,k){var v=236,b=17,i=w,p=s[k],r=null,t=0,g=null,l=[],d={},N=function(a,o){t=i*4+17,r=(function(n){for(var u=new Array(n),c=0;c<n;c+=1){u[c]=new Array(n);for(var y=0;y<n;y+=1)u[c][y]=null}return u})(t),S(0,0),S(t-7,0),S(0,t-7),L(),R(),W(a,o),i>=7&&H(a),g==null&&(g=Ie(i,p,l)),F(g,o)},S=function(a,o){for(var n=-1;n<=7;n+=1)if(!(a+n<=-1||t<=a+n))for(var u=-1;u<=7;u+=1)o+u<=-1||t<=o+u||(0<=n&&n<=6&&(u==0||u==6)||0<=u&&u<=6&&(n==0||n==6)||2<=n&&n<=4&&2<=u&&u<=4?r[a+n][o+u]=!0:r[a+n][o+u]=!1)},E=function(){for(var a=0,o=0,n=0;n<8;n+=1){N(!0,n);var u=h.getLostPoint(d);(n==0||a>u)&&(a=u,o=n)}return o},R=function(){for(var a=8;a<t-8;a+=1)r[a][6]==null&&(r[a][6]=a%2==0);for(var o=8;o<t-8;o+=1)r[6][o]==null&&(r[6][o]=o%2==0)},L=function(){for(var a=h.getPatternPosition(i),o=0;o<a.length;o+=1)for(var n=0;n<a.length;n+=1){var u=a[o],c=a[n];if(r[u][c]==null)for(var y=-2;y<=2;y+=1)for(var I=-2;I<=2;I+=1)y==-2||y==2||I==-2||I==2||y==0&&I==0?r[u+y][c+I]=!0:r[u+y][c+I]=!1}},H=function(a){for(var o=h.getBCHTypeNumber(i),n=0;n<18;n+=1){var u=!a&&(o>>n&1)==1;r[Math.floor(n/3)][n%3+t-8-3]=u}for(var n=0;n<18;n+=1){var u=!a&&(o>>n&1)==1;r[n%3+t-8-3][Math.floor(n/3)]=u}},W=function(a,o){for(var n=p<<3|o,u=h.getBCHTypeInfo(n),c=0;c<15;c+=1){var y=!a&&(u>>c&1)==1;c<6?r[c][8]=y:c<8?r[c+1][8]=y:r[t-15+c][8]=y}for(var c=0;c<15;c+=1){var y=!a&&(u>>c&1)==1;c<8?r[8][t-c-1]=y:c<9?r[8][15-c-1+1]=y:r[8][15-c-1]=y}r[t-8][8]=!a},F=function(a,o){for(var n=-1,u=t-1,c=7,y=0,I=h.getMaskFunction(o),C=t-1;C>0;C-=2)for(C==6&&(C-=1);;){for(var M=0;M<2;M+=1)if(r[u][C-M]==null){var P=!1;y<a.length&&(P=(a[y]>>>c&1)==1);var _=I(u,C-M);_&&(P=!P),r[u][C-M]=P,c-=1,c==-1&&(y+=1,c=7)}if(u+=n,u<0||t<=u){u-=n,n=-n;break}}},V=function(a,o){for(var n=0,u=0,c=0,y=new Array(o.length),I=new Array(o.length),C=0;C<o.length;C+=1){var M=o[C].dataCount,P=o[C].totalCount-M;u=Math.max(u,M),c=Math.max(c,P),y[C]=new Array(M);for(var _=0;_<y[C].length;_+=1)y[C][_]=255&a.getBuffer()[_+n];n+=M;var O=h.getErrorCorrectPolynomial(P),U=T(y[C],O.getLength()-1),le=U.mod(O);I[C]=new Array(O.getLength()-1);for(var _=0;_<I[C].length;_+=1){var ue=_+le.getLength()-I[C].length;I[C][_]=ue>=0?le.getAt(ue):0}}for(var ce=0,_=0;_<o.length;_+=1)ce+=o[_].totalCount;for(var se=new Array(ce),z=0,_=0;_<u;_+=1)for(var C=0;C<o.length;C+=1)_<y[C].length&&(se[z]=y[C][_],z+=1);for(var _=0;_<c;_+=1)for(var C=0;C<o.length;C+=1)_<I[C].length&&(se[z]=I[C][_],z+=1);return se},Ie=function(a,o,n){for(var u=B.getRSBlocks(a,o),c=D(),y=0;y<n.length;y+=1){var I=n[y];c.put(I.getMode(),4),c.put(I.getLength(),h.getLengthInBits(I.getMode(),a)),I.write(c)}for(var C=0,y=0;y<u.length;y+=1)C+=u[y].dataCount;if(c.getLengthInBits()>C*8)throw"code length overflow. ("+c.getLengthInBits()+">"+C*8+")";for(c.getLengthInBits()+4<=C*8&&c.put(0,4);c.getLengthInBits()%8!=0;)c.putBit(!1);for(;!(c.getLengthInBits()>=C*8||(c.put(v,8),c.getLengthInBits()>=C*8));)c.put(b,8);return V(c,u)};d.addData=function(a,o){o=o||"Byte";var n=null;switch(o){case"Numeric":n=q(a);break;case"Alphanumeric":n=$(a);break;case"Byte":n=J(a);break;case"Kanji":n=we(a);break;default:throw"mode:"+o}l.push(n),g=null},d.isDark=function(a,o){if(a<0||t<=a||o<0||t<=o)throw a+","+o;return r[a][o]},d.getModuleCount=function(){return t},d.make=function(){if(i<1){for(var a=1;a<40;a++){for(var o=B.getRSBlocks(a,p),n=D(),u=0;u<l.length;u++){var c=l[u];n.put(c.getMode(),4),n.put(c.getLength(),h.getLengthInBits(c.getMode(),a)),c.write(n)}for(var y=0,u=0;u<o.length;u++)y+=o[u].dataCount;if(n.getLengthInBits()<=y*8)break}i=a}N(!1,E())},d.createTableTag=function(a,o){a=a||2,o=typeof o>"u"?a*4:o;var n="";n+='<table style="',n+=" border-width: 0px; border-style: none;",n+=" border-collapse: collapse;",n+=" padding: 0px; margin: "+o+"px;",n+='">',n+="<tbody>";for(var u=0;u<d.getModuleCount();u+=1){n+="<tr>";for(var c=0;c<d.getModuleCount();c+=1)n+='<td style="',n+=" border-width: 0px; border-style: none;",n+=" border-collapse: collapse;",n+=" padding: 0px; margin: 0px;",n+=" width: "+a+"px;",n+=" height: "+a+"px;",n+=" background-color: ",n+=d.isDark(u,c)?"#000000":"#ffffff",n+=";",n+='"/>';n+="</tr>"}return n+="</tbody>",n+="</table>",n},d.createSvgTag=function(a,o,n,u){var c={};typeof arguments[0]=="object"&&(c=arguments[0],a=c.cellSize,o=c.margin,n=c.alt,u=c.title),a=a||2,o=typeof o>"u"?a*4:o,n=typeof n=="string"?{text:n}:n||{},n.text=n.text||null,n.id=n.text?n.id||"qrcode-description":null,u=typeof u=="string"?{text:u}:u||{},u.text=u.text||null,u.id=u.text?u.id||"qrcode-title":null;var y=d.getModuleCount()*a+o*2,I,C,M,P,_="",O;for(O="l"+a+",0 0,"+a+" -"+a+",0 0,-"+a+"z ",_+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',_+=c.scalable?"":' width="'+y+'px" height="'+y+'px"',_+=' viewBox="0 0 '+y+" "+y+'" ',_+=' preserveAspectRatio="xMinYMin meet"',_+=u.text||n.text?' role="img" aria-labelledby="'+Y([u.id,n.id].join(" ").trim())+'"':"",_+=">",_+=u.text?'<title id="'+Y(u.id)+'">'+Y(u.text)+"</title>":"",_+=n.text?'<description id="'+Y(n.id)+'">'+Y(n.text)+"</description>":"",_+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',_+='<path d="',M=0;M<d.getModuleCount();M+=1)for(P=M*a+o,I=0;I<d.getModuleCount();I+=1)d.isDark(M,I)&&(C=I*a+o,_+="M"+C+","+P+O);return _+='" stroke="transparent" fill="black"/>',_+="</svg>",_},d.createDataURL=function(a,o){a=a||2,o=typeof o>"u"?a*4:o;var n=d.getModuleCount()*a+o*2,u=o,c=n-o;return Ce(n,n,function(y,I){if(u<=y&&y<c&&u<=I&&I<c){var C=Math.floor((y-u)/a),M=Math.floor((I-u)/a);return d.isDark(M,C)?0:1}else return 1})},d.createImgTag=function(a,o,n){a=a||2,o=typeof o>"u"?a*4:o;var u=d.getModuleCount()*a+o*2,c="";return c+="<img",c+=' src="',c+=d.createDataURL(a,o),c+='"',c+=' width="',c+=u,c+='"',c+=' height="',c+=u,c+='"',n&&(c+=' alt="',c+=Y(n),c+='"'),c+="/>",c};var Y=function(a){for(var o="",n=0;n<a.length;n+=1){var u=a.charAt(n);switch(u){case"<":o+="&lt;";break;case">":o+="&gt;";break;case"&":o+="&amp;";break;case'"':o+="&quot;";break;default:o+=u;break}}return o},_e=function(a){var o=1;a=typeof a>"u"?o*2:a;var n=d.getModuleCount()*o+a*2,u=a,c=n-a,y,I,C,M,P,_={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},O={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},U="";for(y=0;y<n;y+=2){for(C=Math.floor((y-u)/o),M=Math.floor((y+1-u)/o),I=0;I<n;I+=1)P="\u2588",u<=I&&I<c&&u<=y&&y<c&&d.isDark(C,Math.floor((I-u)/o))&&(P=" "),u<=I&&I<c&&u<=y+1&&y+1<c&&d.isDark(M,Math.floor((I-u)/o))?P+=" ":P+="\u2588",U+=a<1&&y+1>=c?O[P]:_[P];U+=`
`}return n%2&&a>0?U.substring(0,U.length-n-1)+Array(n+1).join("\u2580"):U.substring(0,U.length-1)};return d.createASCII=function(a,o){if(a=a||1,a<2)return _e(o);a-=1,o=typeof o>"u"?a*2:o;var n=d.getModuleCount()*a+o*2,u=o,c=n-o,y,I,C,M,P=Array(a+1).join("\u2588\u2588"),_=Array(a+1).join("  "),O="",U="";for(y=0;y<n;y+=1){for(C=Math.floor((y-u)/a),U="",I=0;I<n;I+=1)M=1,u<=I&&I<c&&u<=y&&y<c&&d.isDark(C,Math.floor((I-u)/a))&&(M=0),U+=M?P:_;for(C=0;C<a;C+=1)O+=U+`
`}return O.substring(0,O.length-1)},d.renderTo2dContext=function(a,o){o=o||2;for(var n=d.getModuleCount(),u=0;u<n;u++)for(var c=0;c<n;c++)a.fillStyle=d.isDark(u,c)?"black":"white",a.fillRect(u*o,c*o,o,o)},d};A.stringToBytesFuncs={default:function(w){for(var k=[],v=0;v<w.length;v+=1){var b=w.charCodeAt(v);k.push(b&255)}return k}},A.stringToBytes=A.stringToBytesFuncs.default,A.createStringToBytes=function(w,k){var v=(function(){for(var i=ke(w),p=function(){var R=i.read();if(R==-1)throw"eof";return R},r=0,t={};;){var g=i.read();if(g==-1)break;var l=p(),d=p(),N=p(),S=String.fromCharCode(g<<8|l),E=d<<8|N;t[S]=E,r+=1}if(r!=k)throw r+" != "+k;return t})(),b=63;return function(i){for(var p=[],r=0;r<i.length;r+=1){var t=i.charCodeAt(r);if(t<128)p.push(t);else{var g=v[i.charAt(r)];typeof g=="number"?(g&255)==g?p.push(g):(p.push(g>>>8),p.push(g&255)):p.push(b)}}return p}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},s={L:1,M:0,Q:3,H:2},f={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},h=(function(){var w=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],k=1335,v=7973,b=21522,i={},p=function(r){for(var t=0;r!=0;)t+=1,r>>>=1;return t};return i.getBCHTypeInfo=function(r){for(var t=r<<10;p(t)-p(k)>=0;)t^=k<<p(t)-p(k);return(r<<10|t)^b},i.getBCHTypeNumber=function(r){for(var t=r<<12;p(t)-p(v)>=0;)t^=v<<p(t)-p(v);return r<<12|t},i.getPatternPosition=function(r){return w[r-1]},i.getMaskFunction=function(r){switch(r){case f.PATTERN000:return function(t,g){return(t+g)%2==0};case f.PATTERN001:return function(t,g){return t%2==0};case f.PATTERN010:return function(t,g){return g%3==0};case f.PATTERN011:return function(t,g){return(t+g)%3==0};case f.PATTERN100:return function(t,g){return(Math.floor(t/2)+Math.floor(g/3))%2==0};case f.PATTERN101:return function(t,g){return t*g%2+t*g%3==0};case f.PATTERN110:return function(t,g){return(t*g%2+t*g%3)%2==0};case f.PATTERN111:return function(t,g){return(t*g%3+(t+g)%2)%2==0};default:throw"bad maskPattern:"+r}},i.getErrorCorrectPolynomial=function(r){for(var t=T([1],0),g=0;g<r;g+=1)t=t.multiply(T([1,x.gexp(g)],0));return t},i.getLengthInBits=function(r,t){if(1<=t&&t<10)switch(r){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+r}else if(t<27)switch(r){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+r}else if(t<41)switch(r){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+r}else throw"type:"+t},i.getLostPoint=function(r){for(var t=r.getModuleCount(),g=0,l=0;l<t;l+=1)for(var d=0;d<t;d+=1){for(var N=0,S=r.isDark(l,d),E=-1;E<=1;E+=1)if(!(l+E<0||t<=l+E))for(var R=-1;R<=1;R+=1)d+R<0||t<=d+R||E==0&&R==0||S==r.isDark(l+E,d+R)&&(N+=1);N>5&&(g+=3+N-5)}for(var l=0;l<t-1;l+=1)for(var d=0;d<t-1;d+=1){var L=0;r.isDark(l,d)&&(L+=1),r.isDark(l+1,d)&&(L+=1),r.isDark(l,d+1)&&(L+=1),r.isDark(l+1,d+1)&&(L+=1),(L==0||L==4)&&(g+=3)}for(var l=0;l<t;l+=1)for(var d=0;d<t-6;d+=1)r.isDark(l,d)&&!r.isDark(l,d+1)&&r.isDark(l,d+2)&&r.isDark(l,d+3)&&r.isDark(l,d+4)&&!r.isDark(l,d+5)&&r.isDark(l,d+6)&&(g+=40);for(var d=0;d<t;d+=1)for(var l=0;l<t-6;l+=1)r.isDark(l,d)&&!r.isDark(l+1,d)&&r.isDark(l+2,d)&&r.isDark(l+3,d)&&r.isDark(l+4,d)&&!r.isDark(l+5,d)&&r.isDark(l+6,d)&&(g+=40);for(var H=0,d=0;d<t;d+=1)for(var l=0;l<t;l+=1)r.isDark(l,d)&&(H+=1);var W=Math.abs(100*H/t/t-50)/5;return g+=W*10,g},i})(),x=(function(){for(var w=new Array(256),k=new Array(256),v=0;v<8;v+=1)w[v]=1<<v;for(var v=8;v<256;v+=1)w[v]=w[v-4]^w[v-5]^w[v-6]^w[v-8];for(var v=0;v<255;v+=1)k[w[v]]=v;var b={};return b.glog=function(i){if(i<1)throw"glog("+i+")";return k[i]},b.gexp=function(i){for(;i<0;)i+=255;for(;i>=256;)i-=255;return w[i]},b})();function T(w,k){if(typeof w.length>"u")throw w.length+"/"+k;var v=(function(){for(var i=0;i<w.length&&w[i]==0;)i+=1;for(var p=new Array(w.length-i+k),r=0;r<w.length-i;r+=1)p[r]=w[r+i];return p})(),b={};return b.getAt=function(i){return v[i]},b.getLength=function(){return v.length},b.multiply=function(i){for(var p=new Array(b.getLength()+i.getLength()-1),r=0;r<b.getLength();r+=1)for(var t=0;t<i.getLength();t+=1)p[r+t]^=x.gexp(x.glog(b.getAt(r))+x.glog(i.getAt(t)));return T(p,0)},b.mod=function(i){if(b.getLength()-i.getLength()<0)return b;for(var p=x.glog(b.getAt(0))-x.glog(i.getAt(0)),r=new Array(b.getLength()),t=0;t<b.getLength();t+=1)r[t]=b.getAt(t);for(var t=0;t<i.getLength();t+=1)r[t]^=x.gexp(x.glog(i.getAt(t))+p);return T(r,0).mod(i)},b}var B=(function(){var w=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],k=function(i,p){var r={};return r.totalCount=i,r.dataCount=p,r},v={},b=function(i,p){switch(p){case s.L:return w[(i-1)*4+0];case s.M:return w[(i-1)*4+1];case s.Q:return w[(i-1)*4+2];case s.H:return w[(i-1)*4+3];default:return}};return v.getRSBlocks=function(i,p){var r=b(i,p);if(typeof r>"u")throw"bad rs block @ typeNumber:"+i+"/errorCorrectionLevel:"+p;for(var t=r.length/3,g=[],l=0;l<t;l+=1)for(var d=r[l*3+0],N=r[l*3+1],S=r[l*3+2],E=0;E<d;E+=1)g.push(k(N,S));return g},v})(),D=function(){var w=[],k=0,v={};return v.getBuffer=function(){return w},v.getAt=function(b){var i=Math.floor(b/8);return(w[i]>>>7-b%8&1)==1},v.put=function(b,i){for(var p=0;p<i;p+=1)v.putBit((b>>>i-p-1&1)==1)},v.getLengthInBits=function(){return k},v.putBit=function(b){var i=Math.floor(k/8);w.length<=i&&w.push(0),b&&(w[i]|=128>>>k%8),k+=1},v},q=function(w){var k=e.MODE_NUMBER,v=w,b={};b.getMode=function(){return k},b.getLength=function(r){return v.length},b.write=function(r){for(var t=v,g=0;g+2<t.length;)r.put(i(t.substring(g,g+3)),10),g+=3;g<t.length&&(t.length-g==1?r.put(i(t.substring(g,g+1)),4):t.length-g==2&&r.put(i(t.substring(g,g+2)),7))};var i=function(r){for(var t=0,g=0;g<r.length;g+=1)t=t*10+p(r.charAt(g));return t},p=function(r){if("0"<=r&&r<="9")return r.charCodeAt(0)-48;throw"illegal char :"+r};return b},$=function(w){var k=e.MODE_ALPHA_NUM,v=w,b={};b.getMode=function(){return k},b.getLength=function(p){return v.length},b.write=function(p){for(var r=v,t=0;t+1<r.length;)p.put(i(r.charAt(t))*45+i(r.charAt(t+1)),11),t+=2;t<r.length&&p.put(i(r.charAt(t)),6)};var i=function(p){if("0"<=p&&p<="9")return p.charCodeAt(0)-48;if("A"<=p&&p<="Z")return p.charCodeAt(0)-65+10;switch(p){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+p}};return b},J=function(w){var k=e.MODE_8BIT_BYTE,v=w,b=A.stringToBytes(w),i={};return i.getMode=function(){return k},i.getLength=function(p){return b.length},i.write=function(p){for(var r=0;r<b.length;r+=1)p.put(b[r],8)},i},we=function(w){var k=e.MODE_KANJI,v=w,b=A.stringToBytesFuncs.SJIS;if(!b)throw"sjis not supported.";(function(r,t){var g=b(r);if(g.length!=2||(g[0]<<8|g[1])!=t)throw"sjis not supported."})("\u53CB",38726);var i=b(w),p={};return p.getMode=function(){return k},p.getLength=function(r){return~~(i.length/2)},p.write=function(r){for(var t=i,g=0;g+1<t.length;){var l=(255&t[g])<<8|255&t[g+1];if(33088<=l&&l<=40956)l-=33088;else if(57408<=l&&l<=60351)l-=49472;else throw"illegal char at "+(g+1)+"/"+l;l=(l>>>8&255)*192+(l&255),r.put(l,13),g+=2}if(g<t.length)throw"illegal char at "+(g+1)},p},oe=function(){var w=[],k={};return k.writeByte=function(v){w.push(v&255)},k.writeShort=function(v){k.writeByte(v),k.writeByte(v>>>8)},k.writeBytes=function(v,b,i){b=b||0,i=i||v.length;for(var p=0;p<i;p+=1)k.writeByte(v[p+b])},k.writeString=function(v){for(var b=0;b<v.length;b+=1)k.writeByte(v.charCodeAt(b))},k.toByteArray=function(){return w},k.toString=function(){var v="";v+="[";for(var b=0;b<w.length;b+=1)b>0&&(v+=","),v+=w[b];return v+="]",v},k},xe=function(){var w=0,k=0,v=0,b="",i={},p=function(t){b+=String.fromCharCode(r(t&63))},r=function(t){if(!(t<0)){if(t<26)return 65+t;if(t<52)return 97+(t-26);if(t<62)return 48+(t-52);if(t==62)return 43;if(t==63)return 47}throw"n:"+t};return i.writeByte=function(t){for(w=w<<8|t&255,k+=8,v+=1;k>=6;)p(w>>>k-6),k-=6},i.flush=function(){if(k>0&&(p(w<<6-k),w=0,k=0),v%3!=0)for(var t=3-v%3,g=0;g<t;g+=1)b+="="},i.toString=function(){return b},i},ke=function(w){var k=w,v=0,b=0,i=0,p={};p.read=function(){for(;i<8;){if(v>=k.length){if(i==0)return-1;throw"unexpected end of file./"+i}var t=k.charAt(v);if(v+=1,t=="=")return i=0,-1;if(t.match(/^\s$/))continue;b=b<<6|r(t.charCodeAt(0)),i+=6}var g=b>>>i-8&255;return i-=8,g};var r=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(t==43)return 62;if(t==47)return 63;throw"c:"+t};return p},Ae=function(w,k){var v=w,b=k,i=new Array(w*k),p={};p.setPixel=function(l,d,N){i[d*v+l]=N},p.write=function(l){l.writeString("GIF87a"),l.writeShort(v),l.writeShort(b),l.writeByte(128),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(255),l.writeByte(255),l.writeByte(255),l.writeString(","),l.writeShort(0),l.writeShort(0),l.writeShort(v),l.writeShort(b),l.writeByte(0);var d=2,N=t(d);l.writeByte(d);for(var S=0;N.length-S>255;)l.writeByte(255),l.writeBytes(N,S,255),S+=255;l.writeByte(N.length-S),l.writeBytes(N,S,N.length-S),l.writeByte(0),l.writeString(";")};var r=function(l){var d=l,N=0,S=0,E={};return E.write=function(R,L){if(R>>>L)throw"length over";for(;N+L>=8;)d.writeByte(255&(R<<N|S)),L-=8-N,R>>>=8-N,S=0,N=0;S=R<<N|S,N=N+L},E.flush=function(){N>0&&d.writeByte(S)},E},t=function(l){for(var d=1<<l,N=(1<<l)+1,S=l+1,E=g(),R=0;R<d;R+=1)E.add(String.fromCharCode(R));E.add(String.fromCharCode(d)),E.add(String.fromCharCode(N));var L=oe(),H=r(L);H.write(d,S);var W=0,F=String.fromCharCode(i[W]);for(W+=1;W<i.length;){var V=String.fromCharCode(i[W]);W+=1,E.contains(F+V)?F=F+V:(H.write(E.indexOf(F),S),E.size()<4095&&(E.size()==1<<S&&(S+=1),E.add(F+V)),F=V)}return H.write(E.indexOf(F),S),H.write(N,S),H.flush(),L.toByteArray()},g=function(){var l={},d=0,N={};return N.add=function(S){if(N.contains(S))throw"dup key:"+S;l[S]=d,d+=1},N.size=function(){return d},N.indexOf=function(S){return l[S]},N.contains=function(S){return typeof l[S]<"u"},N};return p},Ce=function(w,k,v){for(var b=Ae(w,k),i=0;i<k;i+=1)for(var p=0;p<w;p+=1)b.setPixel(p,i,v(p,i));var r=oe();b.write(r);for(var t=xe(),g=r.toByteArray(),l=0;l<g.length;l+=1)t.writeByte(g[l]);return t.flush(),"data:image/gif;base64,"+t};return A})();(function(){pe.stringToBytesFuncs["UTF-8"]=function(A){function e(s){for(var f=[],h=0;h<s.length;h++){var x=s.charCodeAt(h);x<128?f.push(x):x<2048?f.push(192|x>>6,128|x&63):x<55296||x>=57344?f.push(224|x>>12,128|x>>6&63,128|x&63):(h++,x=65536+((x&1023)<<10|s.charCodeAt(h)&1023),f.push(240|x>>18,128|x>>12&63,128|x>>6&63,128|x&63))}return f}return e(A)}})();(function(A){typeof define=="function"&&define.amd?define([],A):typeof ge=="object"&&(ve.exports=A())})(function(){return pe})});var Qe={};Be(Qe,{AuthUI:()=>ne,PrivasysAuth:()=>G,SessionManager:()=>j,WebAuthnClient:()=>K,generateBatchQRPayload:()=>re,generateQRPayload:()=>te,generateSessionId:()=>X});function X(){let A=new Uint8Array(32);return crypto.getRandomValues(A),Array.from(A,e=>e.toString(16).padStart(2,"0")).join("")}var De="privasys.id";function de(A){let e=btoa(A).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return`https://${De}/scp?p=${e}`}function te(A){let e=A.sessionId??X(),s={origin:A.rpId,sessionId:e,rpId:A.rpId,brokerUrl:A.brokerUrl};return{sessionId:e,payload:de(JSON.stringify(s))}}function re(A){let e=A.sessionId??X(),s=A.apps.map(h=>({rpId:h.rpId,sessionId:h.sessionId??X()})),f={origin:A.apps[0]?.rpId??"",sessionId:e,brokerUrl:A.brokerUrl,apps:s};return{sessionId:e,appSessions:s,payload:de(JSON.stringify(f))}}var ie="privasys_sessions",j=class{constructor(){this.listeners=new Set}store(e){let s=this.getAll(),f=s.findIndex(h=>h.rpId===e.rpId);f>=0?s[f]=e:s.push(e),this.persist(s),this.notify(s)}get(e){return this.getAll().find(s=>s.rpId===e)}getAll(){try{let e=localStorage.getItem(ie);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}remove(e){let s=this.getAll().filter(f=>f.rpId!==e);this.persist(s),this.notify(s)}clear(){localStorage.removeItem(ie),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}persist(e){localStorage.setItem(ie,JSON.stringify(e))}notify(e){for(let s of this.listeners)s(e)}};var ae=12e4,G=class{constructor(e,s={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:ae,...e},this.events=s,this.sessions=new j}createQR(e){return te({rpId:this.config.rpId,brokerUrl:this.config.brokerUrl,sessionId:e})}waitForResult(e){return new Promise((s,f)=>{let h=this.config.timeout??ae,x=new URL(this.config.brokerUrl);x.searchParams.set("session",e),x.searchParams.set("role","browser");let T=new WebSocket(x.toString());this.activeConnections.set(e,T),this.setState("waiting-for-scan");let B=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),f(new Error("Authentication timed out"))},h);T.onopen=()=>{this.setState("waiting-for-scan")},T.onmessage=D=>{try{let q=JSON.parse(typeof D.data=="string"?D.data:"{}");this.handleMessage(e,q,s,B)}catch{}},T.onerror=()=>{clearTimeout(B),this.setState("error"),this.cleanup(e),f(new Error("WebSocket connection failed"))},T.onclose=D=>{clearTimeout(B),this.cleanup(e),D.code!==1e3&&(this.setState("error"),f(new Error(`Connection closed (code ${D.code})`)))}})}async notifyAndWait(e,s){let f=s??this.createQR().sessionId,h=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),x=await fetch(`${h}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:f,rpId:this.config.rpId,origin:globalThis.location?.origin??"",brokerUrl:this.config.brokerUrl})});if(!x.ok){let T=await x.text();throw new Error(`Push notification failed: ${T}`)}return this.waitForResult(f)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:s,appSessions:f,payload:h}=re({brokerUrl:this.config.brokerUrl,apps:e.map(T=>({rpId:T.rpId}))}),x=this.waitForBatch(f);return{sessionId:s,appSessions:f,payload:h,result:x}}on(e){this.events={...this.events,...e}}handleMessage(e,s,f,h){switch(s.type){case"peer-joined":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(h),this.setState("complete");let x={sessionToken:s.sessionToken,sessionId:e,attestation:s.attestation};this.sessions.store({token:x.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(x),this.cleanup(e),f(x);break}case"auth-error":{clearTimeout(h),this.setState("error"),this.cleanup(e);let x=new Error(s.message??"Authentication failed");this.events.onError?.(x);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let s=this.config.timeout??ae;this.setState("waiting-for-scan");let f=await Promise.allSettled(e.map(T=>Promise.race([this.waitForResult(T.sessionId),new Promise((B,D)=>setTimeout(()=>D(new Error("Batch item timed out")),s))]))),h=[],x=[];for(let T=0;T<f.length;T++){let B=f[T];B.status==="fulfilled"?h.push(B.value):x.push({rpId:e[T].rpId,error:B.reason instanceof Error?B.reason.message:String(B.reason)})}return this.setState(x.length===0?"complete":"error"),{results:h,errors:x}}cleanup(e){let s=this.activeConnections.get(e);s&&((s.readyState===WebSocket.OPEN||s.readyState===WebSocket.CONNECTING)&&s.close(1e3),this.activeConnections.delete(e))}};function Q(A){let e=new Uint8Array(A),s="";for(let f=0;f<e.length;f++)s+=String.fromCharCode(e[f]);return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function Z(A){let e=A.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let s=atob(e),f=new Uint8Array(s.length);for(let h=0;h<s.length;h++)f[h]=s.charCodeAt(h);return f.buffer}function he(A){let e=new Uint8Array(A);return crypto.getRandomValues(e),Array.from(e,s=>s.toString(16).padStart(2,"0")).join("")}var K=class{constructor(e,s={}){this.state="idle";this.config={timeout:6e4,...e},this.events=s,this.sessions=new j}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let s=Q(crypto.getRandomValues(new Uint8Array(32)).buffer),f=he(16),h=await this.fido2Fetch({type:"register_begin",user_name:e??globalThis.location?.hostname??"user",user_handle:s,browser_session_id:f});if(h.type==="error")throw new Error(h.error??"Registration begin failed");if(h.type!=="register_options")throw new Error(`Unexpected response: ${h.type}`);let x=h.authenticator_selection??{},T={authenticatorAttachment:"platform",residentKey:x.resident_key??"preferred",userVerification:x.user_verification??"preferred"},B={publicKey:{challenge:Z(h.challenge),rp:{id:h.rp.id,name:h.rp.name},user:{id:Z(h.user.id),name:h.user.name,displayName:h.user.display_name??h.user.name},pubKeyCredParams:(h.pub_key_cred_params??[]).map(J=>({type:J.type??"public-key",alg:J.alg})),timeout:this.config.timeout,attestation:h.attestation??"none",authenticatorSelection:T,...h.exclude_credentials?{excludeCredentials:h.exclude_credentials.map(J=>({type:"public-key",id:Z(J.id)}))}:{}}};this.setState("ceremony");let D=await navigator.credentials.create(B);if(!D)throw new Error("No credential returned");this.setState("verifying");let q=D.response,$=await this.fido2Fetch({type:"register_complete",challenge:h.challenge,attestation_object:Q(q.attestationObject),client_data_json:Q(q.clientDataJSON),credential_id:Q(D.rawId),browser_session_id:f});if($.type==="error")throw new Error($.error??"Registration failed");if($.type!=="register_ok")throw new Error(`Unexpected: ${$.type}`);return this.complete($.session_token??"",f)}catch(s){return this.fail(s)}}async authenticate(){this.setState("requesting-options");try{let e=he(16),s=await this.fido2Fetch({type:"authenticate_begin",browser_session_id:e});if(s.type==="error")throw new Error(s.error??"Authentication begin failed");if(s.type!=="authenticate_options")throw new Error(`Unexpected response: ${s.type}`);let f={publicKey:{challenge:Z(s.challenge),rpId:s.rp_id,timeout:this.config.timeout,userVerification:s.user_verification??"preferred",...s.allow_credentials?.length?{allowCredentials:s.allow_credentials.map(B=>({type:"public-key",id:Z(B.id),...B.transports?.length?{transports:B.transports}:{}}))}:{}}};this.setState("ceremony");let h=await navigator.credentials.get(f);if(!h)throw new Error("No assertion returned");this.setState("verifying");let x=h.response,T=await this.fido2Fetch({type:"authenticate_complete",challenge:s.challenge,credential_id:Q(h.rawId),authenticator_data:Q(x.authenticatorData),signature:Q(x.signature),client_data_json:Q(x.clientDataJSON),browser_session_id:e});if(T.type==="error")throw new Error(T.error??"Authentication failed");if(T.type!=="authenticate_ok")throw new Error(`Unexpected: ${T.type}`);return this.complete(T.session_token??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e){let f=`${this.config.apiBase.replace(/\/+$/,"")}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2`,h=await fetch(f,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!h.ok){let x=await h.json().catch(()=>({error:h.statusText}));throw new Error(x.error??`HTTP ${h.status}`)}return h.json()}complete(e,s){this.setState("complete");let f={sessionToken:e,sessionId:s};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(f),f}fail(e){this.setState("error");let s=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(s),s}setState(e){this.state=e,this.events.onStateChange?.(e)}};var ye=Pe(be(),1),Oe=`
:host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #111;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.modal {
    position: relative;
    width: 100%;
    max-width: 420px;
    margin: 16px;
    background: #fff;
    border-radius: 16px;
    padding: 40px 36px 28px;
    text-align: center;
    box-shadow: 0 24px 64px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
    animation: modal-enter 0.2s ease-out;
}
@keyframes modal-enter {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Brand header */
.brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
}
.brand-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: linear-gradient(135deg, #059669, #047857);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
}
.brand-icon svg { width: 26px; height: 26px; }
.brand-title {
    font-size: 18px;
    font-weight: 600;
    line-height: 1.3;
}
.brand-sub {
    font-size: 13px;
    color: rgba(0,0,0,0.45);
    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', Consolas, monospace;
}

/* Provider buttons */
.btn-provider {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 12px;
    padding: 13px 16px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
    text-align: left;
    font-family: inherit;
    font-size: 14px;
    color: #111;
}
.btn-provider:hover {
    background: rgba(0,0,0,0.03);
    border-color: rgba(0,0,0,0.2);
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.btn-provider:active { transform: scale(0.995); }
.btn-provider svg {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    color: rgba(0,0,0,0.45);
}
.btn-provider.wallet svg { color: #059669; }
.btn-label { font-weight: 500; flex: 1; }
.btn-hint {
    font-size: 11px;
    color: rgba(0,0,0,0.45);
    flex-shrink: 0;
}

/* Divider */
.divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 16px 0;
    color: rgba(0,0,0,0.35);
    font-size: 12px;
}
.divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(0,0,0,0.1);
}

/* Register link */
.register-link {
    margin-top: 16px;
    font-size: 13px;
    color: rgba(0,0,0,0.45);
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
    color: rgba(0,0,0,0.45);
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
    border-top-color: #059669;
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
    color: rgba(0,0,0,0.45);
    transition: color 0.2s;
}
.step.active { color: #111; font-weight: 500; }
.step.done   { color: #059669; }
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
    justify-content: center;
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
.method-detail { font-size: 12px; color: rgba(0,0,0,0.45); }
.session-info {
    text-align: left;
    border: 1px solid rgba(0,0,0,0.06);
    border-radius: 8px;
    overflow: hidden;
}
.session-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    font-size: 13px;
}
.session-row + .session-row { border-top: 1px solid rgba(0,0,0,0.06); }
.session-label {
    font-weight: 500;
    min-width: 56px;
    color: rgba(0,0,0,0.45);
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
    color: rgba(0,0,0,0.45);
    margin-bottom: 20px;
    max-width: 320px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
}
.btn-retry {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 13px 16px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #111;
    transition: background 0.15s;
}
.btn-retry:hover { background: rgba(0,0,0,0.03); }

/* Footer */
.footer {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(0,0,0,0.06);
    font-size: 11px;
    color: rgba(0,0,0,0.35);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    :host { color: #f0f0f0; }
    .modal {
        background: #1a1a1a;
        box-shadow: 0 24px 64px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
    }
    .btn-provider {
        background: #1a1a1a;
        border-color: rgba(255,255,255,0.1);
        color: #f0f0f0;
    }
    .btn-provider:hover {
        background: rgba(255,255,255,0.05);
        border-color: rgba(255,255,255,0.2);
    }
    .btn-provider svg { color: rgba(255,255,255,0.45); }
    .btn-provider.wallet svg { color: #059669; }
    .brand-sub { color: rgba(255,255,255,0.45); }
    .btn-hint { color: rgba(255,255,255,0.45); }
    .btn-label { color: #f0f0f0; }
    .divider { color: rgba(255,255,255,0.3); }
    .divider::before, .divider::after { background: rgba(255,255,255,0.1); }
    .register-link { color: rgba(255,255,255,0.45); }
    .scan-hint { color: rgba(255,255,255,0.45); }
    .qr-frame { border-color: rgba(255,255,255,0.1); }
    .step { color: rgba(255,255,255,0.45); }
    .step.active { color: #f0f0f0; }
    .spinner { border-color: rgba(255,255,255,0.1); border-top-color: #059669; }
    .session-info { border-color: rgba(255,255,255,0.08); }
    .session-row + .session-row { border-color: rgba(255,255,255,0.08); }
    .session-label { color: rgba(255,255,255,0.45); }
    .method-detail { color: rgba(255,255,255,0.45); }
    .error-msg { color: rgba(255,255,255,0.45); }
    .btn-retry { background: #1a1a1a; border-color: rgba(255,255,255,0.1); color: #f0f0f0; }
    .btn-retry:hover { background: rgba(255,255,255,0.05); }
    .footer { border-color: rgba(255,255,255,0.06); color: rgba(255,255,255,0.3); }
    .overlay { background: rgba(0,0,0,0.55); }
    .brand-title { color: #f0f0f0; }
    .scan-label { color: #f0f0f0; }
    .success-title { color: #f0f0f0; }
    .error-title { color: #f0f0f0; }
}
`,Ue='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/><path d="M9.5 12l2 2 3.5-4" stroke-width="2"/></svg>',He='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/></svg>',me='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/><path d="M17.5 15.5c0-1.93-1.57-3.5-3.5-3.5s-3.5 1.57-3.5 3.5"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>',We='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>',Fe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';function m(A,e,...s){let f=document.createElement(A);if(e!=null)for(let[h,x]of Object.entries(e))h==="className"?f.className=x:h.startsWith("on")&&typeof x=="function"?f.addEventListener(h.slice(2).toLowerCase(),x):h==="html"?f.innerHTML=x:x===!1||x==null||(x===!0?f.setAttribute(h,""):f.setAttribute(h,String(x)));for(let h of s.flat(1/0))h==null||h===!1||f.appendChild(typeof h=="string"?document.createTextNode(h):h);return f}function je(A){try{let e=(0,ye.default)(0,"M");e.addData(A),e.make();let s=e.getModuleCount(),f=Math.max(3,Math.floor(200/s));return e.createSvgTag({cellSize:f,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${A}</div>`}}var ne=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,s)=>{this.resolve=e,this.reject=s,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.mount(),this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=Oe,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let s=m("div",{className:"overlay",onClick:()=>this.handleCancel()});this.shadow.appendChild(s);let f;switch(this.state){case"idle":f=this.renderIdle();break;case"qr-scanning":f=this.renderQR();break;case"wallet-connected":case"authenticating":f=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":f=this.renderPasskeyProgress();break;case"success":f=this.renderSuccess();break;case"error":f=this.renderError();break;default:f=this.renderIdle()}f.addEventListener("click",h=>h.stopPropagation()),this.shadow.appendChild(f)}renderIdle(){let e=K.isSupported();return m("div",{className:"modal"},this.brandHeader(),m("button",{className:"btn-provider wallet",onClick:()=>this.startWallet()},m("span",{html:He}),m("span",{className:"btn-label"},"Continue with Privasys Wallet"),m("span",{className:"btn-hint"},"Attestation verified")),e?m("div",{className:"divider"},m("span",null,"or")):null,e?m("button",{className:"btn-provider",onClick:()=>this.startPasskey("authenticate")},m("span",{html:me}),m("span",{className:"btn-label"},"Sign in with passkey"),m("span",{className:"btn-hint"},"Windows Hello, Touch ID, Face ID")):null,e?m("div",{className:"register-link"},"No passkey yet? ",m("button",{className:"link-btn",onClick:()=>this.startPasskey("register")},"Register one")):null,m("div",{className:"footer"},"Secured by end-to-end encryption inside a hardware enclave"))}renderQR(){let e=this.getRelayClient(),{payload:s}=e.createQR(this.sessionId);return m("div",{className:"modal"},this.brandHeader(),m("div",{className:"qr-section"},m("div",{className:"qr-frame",html:je(s)}),m("div",{className:"scan-label"},m("span",{className:"pulse"}),"Scan with Privasys Wallet"),m("p",{className:"scan-hint"},"Open the wallet app on your phone and scan this QR code to authenticate.")),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}renderWalletProgress(){let e=this.state==="authenticating";return m("div",{className:"modal"},this.brandHeader(),m("div",{className:"progress-section"},m("div",{className:"spinner"}),m("div",{className:"steps"},m("div",{className:"step done"},m("span",{className:"step-icon"},"\u2713"),"QR code scanned"),m("div",{className:`step ${e?"done":"active"}`},m("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Verifying enclave attestation"),m("div",{className:`step ${e?"active":""}`},m("span",{className:"step-icon"},"\u2022"),"FIDO2 biometric ceremony"))),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}renderPasskeyProgress(){let e=this.method==="passkey",s=this.state;return m("div",{className:"modal"},m("div",{className:"brand"},m("div",{className:"brand-icon",html:me}),m("div",null,m("div",{className:"brand-title"},s==="passkey-requesting"?"Preparing\u2026":"Verify your identity"),m("div",{className:"brand-sub"},this.rpId))),m("div",{className:"progress-section"},m("div",{className:"spinner"}),m("div",{className:"steps"},m("div",{className:`step ${s!=="passkey-requesting"?"done":"active"}`},m("span",{className:"step-icon"},s!=="passkey-requesting"?"\u2713":"\u2022"),"Requesting options from enclave"),m("div",{className:`step ${s==="passkey-ceremony"?"active":s==="passkey-verifying"?"done":""}`},m("span",{className:"step-icon"},s==="passkey-verifying"?"\u2713":"\u2022"),"Complete biometric prompt"),m("div",{className:`step ${s==="passkey-verifying"?"active":""}`},m("span",{className:"step-icon"},"\u2022"),"Enclave verification"))),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}renderSuccess(){let e=this.sessionToken?"\u25CF".repeat(8)+this.sessionToken.slice(-6):"\u2014",s=this.method==="wallet"?"Privasys Wallet":"Passkey",f=this.method==="wallet"?"Attestation verified":"This device";return m("div",{className:"modal"},m("div",{className:"success-icon",html:We}),m("div",{className:"success-title"},"Authenticated"),m("div",{className:"success-method"},m("span",{className:"method-badge"},s),m("span",{className:"method-detail"},f)),m("div",{className:"session-info"},m("div",{className:"session-row"},m("span",{className:"session-label"},"Session"),m("span",{className:"session-value"},e)),m("div",{className:"session-row"},m("span",{className:"session-label"},"App"),m("span",{className:"session-value"},this.rpId))),m("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return m("div",{className:"modal"},m("div",{className:"error-icon",html:Fe}),m("div",{className:"error-title"},"Authentication failed"),m("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),m("button",{className:"btn-retry",onClick:()=>{this.state="idle",this.errorMsg="",this.render()}},"Try again"),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}brandHeader(){return m("div",{className:"brand"},m("div",{className:"brand-icon",html:Ue}),m("div",null,m("div",{className:"brand-title"},`Sign in to ${this.cfg.appName}`),m("div",{className:"brand-sub"},this.rpId)))}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:s}=e.createQR();this.sessionId=s,this.state="qr-scanning",this.render(),e.waitForResult(s).then(f=>{this.sessionToken=f.sessionToken,this.attestation=f.attestation,this.sessionId=f.sessionId,this.complete()},f=>{this.state="error",this.errorMsg=f?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let s=this.getWebAuthnClient();try{let f=e==="register"?await s.register(globalThis.location?.hostname??"user"):await s.authenticate();this.sessionToken=f.sessionToken,this.sessionId=f.sessionId,this.complete()}catch(f){this.state="error",this.errorMsg=f?.message??"Passkey authentication failed",this.render()}}complete(){this.state="success",this.render(),setTimeout(()=>{let e={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId};this.close(),this.resolve?.(e),this.resolve=null,this.reject=null},1200)}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new G({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout},{onStateChange:e=>{let s={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};s[e]&&(this.state=s[e],this.render())}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new K({apiBase:this.cfg.apiBase,appName:this.cfg.appName},{onStateChange:e=>{let s={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};s[e]&&(this.state=s[e],this.render())}})),this.webauthnClient}};return Le(Qe);})();
//# sourceMappingURL=privasys-auth.iife.js.map
