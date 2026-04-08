"use strict";(()=>{var Ne=Object.create;var ue=Object.defineProperty;var Ee=Object.getOwnPropertyDescriptor;var Se=Object.getOwnPropertyNames;var Me=Object.getPrototypeOf,Be=Object.prototype.hasOwnProperty;var Re=(A,e)=>()=>(e||A((e={exports:{}}).exports,e),e.exports);var Pe=(A,e,n,d)=>{if(e&&typeof e=="object"||typeof e=="function")for(let f of Se(e))!Be.call(A,f)&&f!==n&&ue(A,f,{get:()=>e[f],enumerable:!(d=Ee(e,f))||d.enumerable});return A};var Le=(A,e,n)=>(n=A!=null?Ne(Me(A)):{},Pe(e||!A||!A.__esModule?ue(n,"default",{value:A,enumerable:!0}):n,A));var be=Re((ge,ve)=>{var pe=(function(){var A=function(x,k){var v=236,b=17,i=x,p=n[k],r=null,t=0,g=null,l=[],h={},T=function(a,o){t=i*4+17,r=(function(s){for(var u=new Array(s),c=0;c<s;c+=1){u[c]=new Array(s);for(var y=0;y<s;y+=1)u[c][y]=null}return u})(t),N(0,0),N(t-7,0),N(0,t-7),L(),B(),W(a,o),i>=7&&H(a),g==null&&(g=_e(i,p,l)),F(g,o)},N=function(a,o){for(var s=-1;s<=7;s+=1)if(!(a+s<=-1||t<=a+s))for(var u=-1;u<=7;u+=1)o+u<=-1||t<=o+u||(0<=s&&s<=6&&(u==0||u==6)||0<=u&&u<=6&&(s==0||s==6)||2<=s&&s<=4&&2<=u&&u<=4?r[a+s][o+u]=!0:r[a+s][o+u]=!1)},S=function(){for(var a=0,o=0,s=0;s<8;s+=1){T(!0,s);var u=f.getLostPoint(h);(s==0||a>u)&&(a=u,o=s)}return o},B=function(){for(var a=8;a<t-8;a+=1)r[a][6]==null&&(r[a][6]=a%2==0);for(var o=8;o<t-8;o+=1)r[6][o]==null&&(r[6][o]=o%2==0)},L=function(){for(var a=f.getPatternPosition(i),o=0;o<a.length;o+=1)for(var s=0;s<a.length;s+=1){var u=a[o],c=a[s];if(r[u][c]==null)for(var y=-2;y<=2;y+=1)for(var I=-2;I<=2;I+=1)y==-2||y==2||I==-2||I==2||y==0&&I==0?r[u+y][c+I]=!0:r[u+y][c+I]=!1}},H=function(a){for(var o=f.getBCHTypeNumber(i),s=0;s<18;s+=1){var u=!a&&(o>>s&1)==1;r[Math.floor(s/3)][s%3+t-8-3]=u}for(var s=0;s<18;s+=1){var u=!a&&(o>>s&1)==1;r[s%3+t-8-3][Math.floor(s/3)]=u}},W=function(a,o){for(var s=p<<3|o,u=f.getBCHTypeInfo(s),c=0;c<15;c+=1){var y=!a&&(u>>c&1)==1;c<6?r[c][8]=y:c<8?r[c+1][8]=y:r[t-15+c][8]=y}for(var c=0;c<15;c+=1){var y=!a&&(u>>c&1)==1;c<8?r[8][t-c-1]=y:c<9?r[8][15-c-1+1]=y:r[8][15-c-1]=y}r[t-8][8]=!a},F=function(a,o){for(var s=-1,u=t-1,c=7,y=0,I=f.getMaskFunction(o),C=t-1;C>0;C-=2)for(C==6&&(C-=1);;){for(var M=0;M<2;M+=1)if(r[u][C-M]==null){var P=!1;y<a.length&&(P=(a[y]>>>c&1)==1);var _=I(u,C-M);_&&(P=!P),r[u][C-M]=P,c-=1,c==-1&&(y+=1,c=7)}if(u+=s,u<0||t<=u){u-=s,s=-s;break}}},J=function(a,o){for(var s=0,u=0,c=0,y=new Array(o.length),I=new Array(o.length),C=0;C<o.length;C+=1){var M=o[C].dataCount,P=o[C].totalCount-M;u=Math.max(u,M),c=Math.max(c,P),y[C]=new Array(M);for(var _=0;_<y[C].length;_+=1)y[C][_]=255&a.getBuffer()[_+s];s+=M;var U=f.getErrorCorrectPolynomial(P),O=E(y[C],U.getLength()-1),ae=O.mod(U);I[C]=new Array(U.getLength()-1);for(var _=0;_<I[C].length;_+=1){var oe=_+ae.getLength()-I[C].length;I[C][_]=oe>=0?ae.getAt(oe):0}}for(var le=0,_=0;_<o.length;_+=1)le+=o[_].totalCount;for(var te=new Array(le),X=0,_=0;_<u;_+=1)for(var C=0;C<o.length;C+=1)_<y[C].length&&(te[X]=y[C][_],X+=1);for(var _=0;_<c;_+=1)for(var C=0;C<o.length;C+=1)_<I[C].length&&(te[X]=I[C][_],X+=1);return te},_e=function(a,o,s){for(var u=R.getRSBlocks(a,o),c=D(),y=0;y<s.length;y+=1){var I=s[y];c.put(I.getMode(),4),c.put(I.getLength(),f.getLengthInBits(I.getMode(),a)),I.write(c)}for(var C=0,y=0;y<u.length;y+=1)C+=u[y].dataCount;if(c.getLengthInBits()>C*8)throw"code length overflow. ("+c.getLengthInBits()+">"+C*8+")";for(c.getLengthInBits()+4<=C*8&&c.put(0,4);c.getLengthInBits()%8!=0;)c.putBit(!1);for(;!(c.getLengthInBits()>=C*8||(c.put(v,8),c.getLengthInBits()>=C*8));)c.put(b,8);return J(c,u)};h.addData=function(a,o){o=o||"Byte";var s=null;switch(o){case"Numeric":s=Q(a);break;case"Alphanumeric":s=$(a);break;case"Byte":s=K(a);break;case"Kanji":s=xe(a);break;default:throw"mode:"+o}l.push(s),g=null},h.isDark=function(a,o){if(a<0||t<=a||o<0||t<=o)throw a+","+o;return r[a][o]},h.getModuleCount=function(){return t},h.make=function(){if(i<1){for(var a=1;a<40;a++){for(var o=R.getRSBlocks(a,p),s=D(),u=0;u<l.length;u++){var c=l[u];s.put(c.getMode(),4),s.put(c.getLength(),f.getLengthInBits(c.getMode(),a)),c.write(s)}for(var y=0,u=0;u<o.length;u++)y+=o[u].dataCount;if(s.getLengthInBits()<=y*8)break}i=a}T(!1,S())},h.createTableTag=function(a,o){a=a||2,o=typeof o>"u"?a*4:o;var s="";s+='<table style="',s+=" border-width: 0px; border-style: none;",s+=" border-collapse: collapse;",s+=" padding: 0px; margin: "+o+"px;",s+='">',s+="<tbody>";for(var u=0;u<h.getModuleCount();u+=1){s+="<tr>";for(var c=0;c<h.getModuleCount();c+=1)s+='<td style="',s+=" border-width: 0px; border-style: none;",s+=" border-collapse: collapse;",s+=" padding: 0px; margin: 0px;",s+=" width: "+a+"px;",s+=" height: "+a+"px;",s+=" background-color: ",s+=h.isDark(u,c)?"#000000":"#ffffff",s+=";",s+='"/>';s+="</tr>"}return s+="</tbody>",s+="</table>",s},h.createSvgTag=function(a,o,s,u){var c={};typeof arguments[0]=="object"&&(c=arguments[0],a=c.cellSize,o=c.margin,s=c.alt,u=c.title),a=a||2,o=typeof o>"u"?a*4:o,s=typeof s=="string"?{text:s}:s||{},s.text=s.text||null,s.id=s.text?s.id||"qrcode-description":null,u=typeof u=="string"?{text:u}:u||{},u.text=u.text||null,u.id=u.text?u.id||"qrcode-title":null;var y=h.getModuleCount()*a+o*2,I,C,M,P,_="",U;for(U="l"+a+",0 0,"+a+" -"+a+",0 0,-"+a+"z ",_+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',_+=c.scalable?"":' width="'+y+'px" height="'+y+'px"',_+=' viewBox="0 0 '+y+" "+y+'" ',_+=' preserveAspectRatio="xMinYMin meet"',_+=u.text||s.text?' role="img" aria-labelledby="'+V([u.id,s.id].join(" ").trim())+'"':"",_+=">",_+=u.text?'<title id="'+V(u.id)+'">'+V(u.text)+"</title>":"",_+=s.text?'<description id="'+V(s.id)+'">'+V(s.text)+"</description>":"",_+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',_+='<path d="',M=0;M<h.getModuleCount();M+=1)for(P=M*a+o,I=0;I<h.getModuleCount();I+=1)h.isDark(M,I)&&(C=I*a+o,_+="M"+C+","+P+U);return _+='" stroke="transparent" fill="black"/>',_+="</svg>",_},h.createDataURL=function(a,o){a=a||2,o=typeof o>"u"?a*4:o;var s=h.getModuleCount()*a+o*2,u=o,c=s-o;return Ie(s,s,function(y,I){if(u<=y&&y<c&&u<=I&&I<c){var C=Math.floor((y-u)/a),M=Math.floor((I-u)/a);return h.isDark(M,C)?0:1}else return 1})},h.createImgTag=function(a,o,s){a=a||2,o=typeof o>"u"?a*4:o;var u=h.getModuleCount()*a+o*2,c="";return c+="<img",c+=' src="',c+=h.createDataURL(a,o),c+='"',c+=' width="',c+=u,c+='"',c+=' height="',c+=u,c+='"',s&&(c+=' alt="',c+=V(s),c+='"'),c+="/>",c};var V=function(a){for(var o="",s=0;s<a.length;s+=1){var u=a.charAt(s);switch(u){case"<":o+="&lt;";break;case">":o+="&gt;";break;case"&":o+="&amp;";break;case'"':o+="&quot;";break;default:o+=u;break}}return o},Te=function(a){var o=1;a=typeof a>"u"?o*2:a;var s=h.getModuleCount()*o+a*2,u=a,c=s-a,y,I,C,M,P,_={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},U={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},O="";for(y=0;y<s;y+=2){for(C=Math.floor((y-u)/o),M=Math.floor((y+1-u)/o),I=0;I<s;I+=1)P="\u2588",u<=I&&I<c&&u<=y&&y<c&&h.isDark(C,Math.floor((I-u)/o))&&(P=" "),u<=I&&I<c&&u<=y+1&&y+1<c&&h.isDark(M,Math.floor((I-u)/o))?P+=" ":P+="\u2588",O+=a<1&&y+1>=c?U[P]:_[P];O+=`
`}return s%2&&a>0?O.substring(0,O.length-s-1)+Array(s+1).join("\u2580"):O.substring(0,O.length-1)};return h.createASCII=function(a,o){if(a=a||1,a<2)return Te(o);a-=1,o=typeof o>"u"?a*2:o;var s=h.getModuleCount()*a+o*2,u=o,c=s-o,y,I,C,M,P=Array(a+1).join("\u2588\u2588"),_=Array(a+1).join("  "),U="",O="";for(y=0;y<s;y+=1){for(C=Math.floor((y-u)/a),O="",I=0;I<s;I+=1)M=1,u<=I&&I<c&&u<=y&&y<c&&h.isDark(C,Math.floor((I-u)/a))&&(M=0),O+=M?P:_;for(C=0;C<a;C+=1)U+=O+`
`}return U.substring(0,U.length-1)},h.renderTo2dContext=function(a,o){o=o||2;for(var s=h.getModuleCount(),u=0;u<s;u++)for(var c=0;c<s;c++)a.fillStyle=h.isDark(u,c)?"black":"white",a.fillRect(u*o,c*o,o,o)},h};A.stringToBytesFuncs={default:function(x){for(var k=[],v=0;v<x.length;v+=1){var b=x.charCodeAt(v);k.push(b&255)}return k}},A.stringToBytes=A.stringToBytesFuncs.default,A.createStringToBytes=function(x,k){var v=(function(){for(var i=Ae(x),p=function(){var B=i.read();if(B==-1)throw"eof";return B},r=0,t={};;){var g=i.read();if(g==-1)break;var l=p(),h=p(),T=p(),N=String.fromCharCode(g<<8|l),S=h<<8|T;t[N]=S,r+=1}if(r!=k)throw r+" != "+k;return t})(),b=63;return function(i){for(var p=[],r=0;r<i.length;r+=1){var t=i.charCodeAt(r);if(t<128)p.push(t);else{var g=v[i.charAt(r)];typeof g=="number"?(g&255)==g?p.push(g):(p.push(g>>>8),p.push(g&255)):p.push(b)}}return p}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},n={L:1,M:0,Q:3,H:2},d={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},f=(function(){var x=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],k=1335,v=7973,b=21522,i={},p=function(r){for(var t=0;r!=0;)t+=1,r>>>=1;return t};return i.getBCHTypeInfo=function(r){for(var t=r<<10;p(t)-p(k)>=0;)t^=k<<p(t)-p(k);return(r<<10|t)^b},i.getBCHTypeNumber=function(r){for(var t=r<<12;p(t)-p(v)>=0;)t^=v<<p(t)-p(v);return r<<12|t},i.getPatternPosition=function(r){return x[r-1]},i.getMaskFunction=function(r){switch(r){case d.PATTERN000:return function(t,g){return(t+g)%2==0};case d.PATTERN001:return function(t,g){return t%2==0};case d.PATTERN010:return function(t,g){return g%3==0};case d.PATTERN011:return function(t,g){return(t+g)%3==0};case d.PATTERN100:return function(t,g){return(Math.floor(t/2)+Math.floor(g/3))%2==0};case d.PATTERN101:return function(t,g){return t*g%2+t*g%3==0};case d.PATTERN110:return function(t,g){return(t*g%2+t*g%3)%2==0};case d.PATTERN111:return function(t,g){return(t*g%3+(t+g)%2)%2==0};default:throw"bad maskPattern:"+r}},i.getErrorCorrectPolynomial=function(r){for(var t=E([1],0),g=0;g<r;g+=1)t=t.multiply(E([1,w.gexp(g)],0));return t},i.getLengthInBits=function(r,t){if(1<=t&&t<10)switch(r){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+r}else if(t<27)switch(r){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+r}else if(t<41)switch(r){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+r}else throw"type:"+t},i.getLostPoint=function(r){for(var t=r.getModuleCount(),g=0,l=0;l<t;l+=1)for(var h=0;h<t;h+=1){for(var T=0,N=r.isDark(l,h),S=-1;S<=1;S+=1)if(!(l+S<0||t<=l+S))for(var B=-1;B<=1;B+=1)h+B<0||t<=h+B||S==0&&B==0||N==r.isDark(l+S,h+B)&&(T+=1);T>5&&(g+=3+T-5)}for(var l=0;l<t-1;l+=1)for(var h=0;h<t-1;h+=1){var L=0;r.isDark(l,h)&&(L+=1),r.isDark(l+1,h)&&(L+=1),r.isDark(l,h+1)&&(L+=1),r.isDark(l+1,h+1)&&(L+=1),(L==0||L==4)&&(g+=3)}for(var l=0;l<t;l+=1)for(var h=0;h<t-6;h+=1)r.isDark(l,h)&&!r.isDark(l,h+1)&&r.isDark(l,h+2)&&r.isDark(l,h+3)&&r.isDark(l,h+4)&&!r.isDark(l,h+5)&&r.isDark(l,h+6)&&(g+=40);for(var h=0;h<t;h+=1)for(var l=0;l<t-6;l+=1)r.isDark(l,h)&&!r.isDark(l+1,h)&&r.isDark(l+2,h)&&r.isDark(l+3,h)&&r.isDark(l+4,h)&&!r.isDark(l+5,h)&&r.isDark(l+6,h)&&(g+=40);for(var H=0,h=0;h<t;h+=1)for(var l=0;l<t;l+=1)r.isDark(l,h)&&(H+=1);var W=Math.abs(100*H/t/t-50)/5;return g+=W*10,g},i})(),w=(function(){for(var x=new Array(256),k=new Array(256),v=0;v<8;v+=1)x[v]=1<<v;for(var v=8;v<256;v+=1)x[v]=x[v-4]^x[v-5]^x[v-6]^x[v-8];for(var v=0;v<255;v+=1)k[x[v]]=v;var b={};return b.glog=function(i){if(i<1)throw"glog("+i+")";return k[i]},b.gexp=function(i){for(;i<0;)i+=255;for(;i>=256;)i-=255;return x[i]},b})();function E(x,k){if(typeof x.length>"u")throw x.length+"/"+k;var v=(function(){for(var i=0;i<x.length&&x[i]==0;)i+=1;for(var p=new Array(x.length-i+k),r=0;r<x.length-i;r+=1)p[r]=x[r+i];return p})(),b={};return b.getAt=function(i){return v[i]},b.getLength=function(){return v.length},b.multiply=function(i){for(var p=new Array(b.getLength()+i.getLength()-1),r=0;r<b.getLength();r+=1)for(var t=0;t<i.getLength();t+=1)p[r+t]^=w.gexp(w.glog(b.getAt(r))+w.glog(i.getAt(t)));return E(p,0)},b.mod=function(i){if(b.getLength()-i.getLength()<0)return b;for(var p=w.glog(b.getAt(0))-w.glog(i.getAt(0)),r=new Array(b.getLength()),t=0;t<b.getLength();t+=1)r[t]=b.getAt(t);for(var t=0;t<i.getLength();t+=1)r[t]^=w.gexp(w.glog(i.getAt(t))+p);return E(r,0).mod(i)},b}var R=(function(){var x=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],k=function(i,p){var r={};return r.totalCount=i,r.dataCount=p,r},v={},b=function(i,p){switch(p){case n.L:return x[(i-1)*4+0];case n.M:return x[(i-1)*4+1];case n.Q:return x[(i-1)*4+2];case n.H:return x[(i-1)*4+3];default:return}};return v.getRSBlocks=function(i,p){var r=b(i,p);if(typeof r>"u")throw"bad rs block @ typeNumber:"+i+"/errorCorrectionLevel:"+p;for(var t=r.length/3,g=[],l=0;l<t;l+=1)for(var h=r[l*3+0],T=r[l*3+1],N=r[l*3+2],S=0;S<h;S+=1)g.push(k(T,N));return g},v})(),D=function(){var x=[],k=0,v={};return v.getBuffer=function(){return x},v.getAt=function(b){var i=Math.floor(b/8);return(x[i]>>>7-b%8&1)==1},v.put=function(b,i){for(var p=0;p<i;p+=1)v.putBit((b>>>i-p-1&1)==1)},v.getLengthInBits=function(){return k},v.putBit=function(b){var i=Math.floor(k/8);x.length<=i&&x.push(0),b&&(x[i]|=128>>>k%8),k+=1},v},Q=function(x){var k=e.MODE_NUMBER,v=x,b={};b.getMode=function(){return k},b.getLength=function(r){return v.length},b.write=function(r){for(var t=v,g=0;g+2<t.length;)r.put(i(t.substring(g,g+3)),10),g+=3;g<t.length&&(t.length-g==1?r.put(i(t.substring(g,g+1)),4):t.length-g==2&&r.put(i(t.substring(g,g+2)),7))};var i=function(r){for(var t=0,g=0;g<r.length;g+=1)t=t*10+p(r.charAt(g));return t},p=function(r){if("0"<=r&&r<="9")return r.charCodeAt(0)-48;throw"illegal char :"+r};return b},$=function(x){var k=e.MODE_ALPHA_NUM,v=x,b={};b.getMode=function(){return k},b.getLength=function(p){return v.length},b.write=function(p){for(var r=v,t=0;t+1<r.length;)p.put(i(r.charAt(t))*45+i(r.charAt(t+1)),11),t+=2;t<r.length&&p.put(i(r.charAt(t)),6)};var i=function(p){if("0"<=p&&p<="9")return p.charCodeAt(0)-48;if("A"<=p&&p<="Z")return p.charCodeAt(0)-65+10;switch(p){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+p}};return b},K=function(x){var k=e.MODE_8BIT_BYTE,v=x,b=A.stringToBytes(x),i={};return i.getMode=function(){return k},i.getLength=function(p){return b.length},i.write=function(p){for(var r=0;r<b.length;r+=1)p.put(b[r],8)},i},xe=function(x){var k=e.MODE_KANJI,v=x,b=A.stringToBytesFuncs.SJIS;if(!b)throw"sjis not supported.";(function(r,t){var g=b(r);if(g.length!=2||(g[0]<<8|g[1])!=t)throw"sjis not supported."})("\u53CB",38726);var i=b(x),p={};return p.getMode=function(){return k},p.getLength=function(r){return~~(i.length/2)},p.write=function(r){for(var t=i,g=0;g+1<t.length;){var l=(255&t[g])<<8|255&t[g+1];if(33088<=l&&l<=40956)l-=33088;else if(57408<=l&&l<=60351)l-=49472;else throw"illegal char at "+(g+1)+"/"+l;l=(l>>>8&255)*192+(l&255),r.put(l,13),g+=2}if(g<t.length)throw"illegal char at "+(g+1)},p},ie=function(){var x=[],k={};return k.writeByte=function(v){x.push(v&255)},k.writeShort=function(v){k.writeByte(v),k.writeByte(v>>>8)},k.writeBytes=function(v,b,i){b=b||0,i=i||v.length;for(var p=0;p<i;p+=1)k.writeByte(v[p+b])},k.writeString=function(v){for(var b=0;b<v.length;b+=1)k.writeByte(v.charCodeAt(b))},k.toByteArray=function(){return x},k.toString=function(){var v="";v+="[";for(var b=0;b<x.length;b+=1)b>0&&(v+=","),v+=x[b];return v+="]",v},k},ke=function(){var x=0,k=0,v=0,b="",i={},p=function(t){b+=String.fromCharCode(r(t&63))},r=function(t){if(!(t<0)){if(t<26)return 65+t;if(t<52)return 97+(t-26);if(t<62)return 48+(t-52);if(t==62)return 43;if(t==63)return 47}throw"n:"+t};return i.writeByte=function(t){for(x=x<<8|t&255,k+=8,v+=1;k>=6;)p(x>>>k-6),k-=6},i.flush=function(){if(k>0&&(p(x<<6-k),x=0,k=0),v%3!=0)for(var t=3-v%3,g=0;g<t;g+=1)b+="="},i.toString=function(){return b},i},Ae=function(x){var k=x,v=0,b=0,i=0,p={};p.read=function(){for(;i<8;){if(v>=k.length){if(i==0)return-1;throw"unexpected end of file./"+i}var t=k.charAt(v);if(v+=1,t=="=")return i=0,-1;if(t.match(/^\s$/))continue;b=b<<6|r(t.charCodeAt(0)),i+=6}var g=b>>>i-8&255;return i-=8,g};var r=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(t==43)return 62;if(t==47)return 63;throw"c:"+t};return p},Ce=function(x,k){var v=x,b=k,i=new Array(x*k),p={};p.setPixel=function(l,h,T){i[h*v+l]=T},p.write=function(l){l.writeString("GIF87a"),l.writeShort(v),l.writeShort(b),l.writeByte(128),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(255),l.writeByte(255),l.writeByte(255),l.writeString(","),l.writeShort(0),l.writeShort(0),l.writeShort(v),l.writeShort(b),l.writeByte(0);var h=2,T=t(h);l.writeByte(h);for(var N=0;T.length-N>255;)l.writeByte(255),l.writeBytes(T,N,255),N+=255;l.writeByte(T.length-N),l.writeBytes(T,N,T.length-N),l.writeByte(0),l.writeString(";")};var r=function(l){var h=l,T=0,N=0,S={};return S.write=function(B,L){if(B>>>L)throw"length over";for(;T+L>=8;)h.writeByte(255&(B<<T|N)),L-=8-T,B>>>=8-T,N=0,T=0;N=B<<T|N,T=T+L},S.flush=function(){T>0&&h.writeByte(N)},S},t=function(l){for(var h=1<<l,T=(1<<l)+1,N=l+1,S=g(),B=0;B<h;B+=1)S.add(String.fromCharCode(B));S.add(String.fromCharCode(h)),S.add(String.fromCharCode(T));var L=ie(),H=r(L);H.write(h,N);var W=0,F=String.fromCharCode(i[W]);for(W+=1;W<i.length;){var J=String.fromCharCode(i[W]);W+=1,S.contains(F+J)?F=F+J:(H.write(S.indexOf(F),N),S.size()<4095&&(S.size()==1<<N&&(N+=1),S.add(F+J)),F=J)}return H.write(S.indexOf(F),N),H.write(T,N),H.flush(),L.toByteArray()},g=function(){var l={},h=0,T={};return T.add=function(N){if(T.contains(N))throw"dup key:"+N;l[N]=h,h+=1},T.size=function(){return h},T.indexOf=function(N){return l[N]},T.contains=function(N){return typeof l[N]<"u"},T};return p},Ie=function(x,k,v){for(var b=Ce(x,k),i=0;i<k;i+=1)for(var p=0;p<x;p+=1)b.setPixel(p,i,v(p,i));var r=ie();b.write(r);for(var t=ke(),g=r.toByteArray(),l=0;l<g.length;l+=1)t.writeByte(g[l]);return t.flush(),"data:image/gif;base64,"+t};return A})();(function(){pe.stringToBytesFuncs["UTF-8"]=function(A){function e(n){for(var d=[],f=0;f<n.length;f++){var w=n.charCodeAt(f);w<128?d.push(w):w<2048?d.push(192|w>>6,128|w&63):w<55296||w>=57344?d.push(224|w>>12,128|w>>6&63,128|w&63):(f++,w=65536+((w&1023)<<10|n.charCodeAt(f)&1023),d.push(240|w>>18,128|w>>12&63,128|w>>6&63,128|w&63))}return d}return e(A)}})();(function(A){typeof define=="function"&&define.amd?define([],A):typeof ge=="object"&&(ve.exports=A())})(function(){return pe})});function re(){let A=new Uint8Array(32);return crypto.getRandomValues(A),Array.from(A,e=>e.toString(16).padStart(2,"0")).join("")}var De="privasys.id";function ce(A){let e=btoa(A).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return`https://${De}/scp?p=${e}`}function de(A){let e=A.sessionId??re(),n={origin:A.rpId,sessionId:e,rpId:A.rpId,brokerUrl:A.brokerUrl};return{sessionId:e,payload:ce(JSON.stringify(n))}}function fe(A){let e=A.sessionId??re(),n=A.apps.map(f=>({rpId:f.rpId,sessionId:f.sessionId??re()})),d={origin:A.apps[0]?.rpId??"",sessionId:e,brokerUrl:A.brokerUrl,apps:n};return{sessionId:e,appSessions:n,payload:ce(JSON.stringify(d))}}var ne="privasys_sessions",j=class{constructor(){this.listeners=new Set}store(e){let n=this.getAll(),d=n.findIndex(f=>f.rpId===e.rpId);d>=0?n[d]=e:n.push(e),this.persist(n),this.notify(n)}get(e){return this.getAll().find(n=>n.rpId===e)}getAll(){try{let e=localStorage.getItem(ne);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}remove(e){let n=this.getAll().filter(d=>d.rpId!==e);this.persist(n),this.notify(n)}clear(){localStorage.removeItem(ne),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}persist(e){localStorage.setItem(ne,JSON.stringify(e))}notify(e){for(let n of this.listeners)n(e)}};var se=12e4,z=class{constructor(e,n={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:se,...e},this.events=n,this.sessions=new j}createQR(e){return de({rpId:this.config.rpId,brokerUrl:this.config.brokerUrl,sessionId:e})}waitForResult(e){return new Promise((n,d)=>{let f=this.config.timeout??se,w=new URL(this.config.brokerUrl);w.searchParams.set("session",e),w.searchParams.set("role","browser");let E=new WebSocket(w.toString());this.activeConnections.set(e,E),this.setState("waiting-for-scan");let R=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),d(new Error("Authentication timed out"))},f);E.onopen=()=>{this.setState("waiting-for-scan")},E.onmessage=D=>{try{let Q=JSON.parse(typeof D.data=="string"?D.data:"{}");this.handleMessage(e,Q,n,R)}catch{}},E.onerror=()=>{clearTimeout(R),this.setState("error"),this.cleanup(e),d(new Error("WebSocket connection failed"))},E.onclose=D=>{clearTimeout(R),this.cleanup(e),D.code!==1e3&&(this.setState("error"),d(new Error(`Connection closed (code ${D.code})`)))}})}async notifyAndWait(e,n){let d=n??this.createQR().sessionId,f=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),w=await fetch(`${f}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:d,rpId:this.config.rpId,origin:globalThis.location?.origin??"",brokerUrl:this.config.brokerUrl})});if(!w.ok){let E=await w.text();throw new Error(`Push notification failed: ${E}`)}return this.waitForResult(d)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:n,appSessions:d,payload:f}=fe({brokerUrl:this.config.brokerUrl,apps:e.map(E=>({rpId:E.rpId}))}),w=this.waitForBatch(d);return{sessionId:n,appSessions:d,payload:f,result:w}}on(e){this.events={...this.events,...e}}handleMessage(e,n,d,f){switch(n.type){case"peer-joined":case"wallet-waiting":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(f),this.setState("complete");let w={sessionToken:n.sessionToken,sessionId:e,attestation:n.attestation,pushToken:n.pushToken||void 0};this.sessions.store({token:w.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now(),pushToken:w.pushToken}),this.events.onAuthenticated?.(w),this.cleanup(e),d(w);break}case"auth-error":{clearTimeout(f),this.setState("error"),this.cleanup(e);let w=new Error(n.message??"Authentication failed");this.events.onError?.(w);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let n=this.config.timeout??se;this.setState("waiting-for-scan");let d=await Promise.allSettled(e.map(E=>Promise.race([this.waitForResult(E.sessionId),new Promise((R,D)=>setTimeout(()=>D(new Error("Batch item timed out")),n))]))),f=[],w=[];for(let E=0;E<d.length;E++){let R=d[E];R.status==="fulfilled"?f.push(R.value):w.push({rpId:e[E].rpId,error:R.reason instanceof Error?R.reason.message:String(R.reason)})}return this.setState(w.length===0?"complete":"error"),{results:f,errors:w}}cleanup(e){let n=this.activeConnections.get(e);n&&((n.readyState===WebSocket.OPEN||n.readyState===WebSocket.CONNECTING)&&n.close(1e3),this.activeConnections.delete(e))}};function q(A){let e=new Uint8Array(A),n="";for(let d=0;d<e.length;d++)n+=String.fromCharCode(e[d]);return btoa(n).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function Y(A){let e=A.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let n=atob(e),d=new Uint8Array(n.length);for(let f=0;f<n.length;f++)d[f]=n.charCodeAt(f);return d.buffer}function he(A){let e=new Uint8Array(A);return crypto.getRandomValues(e),Array.from(e,n=>n.toString(16).padStart(2,"0")).join("")}var Z=class{constructor(e,n={}){this.state="idle";this.config={timeout:6e4,...e},this.events=n,this.sessions=new j}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let n=q(crypto.getRandomValues(new Uint8Array(32)).buffer),d=he(16),f=await this.fido2Fetch({type:"register_begin",user_name:e??globalThis.location?.hostname??"user",user_handle:n,browser_session_id:d});if(f.type==="error")throw new Error(f.error??"Registration begin failed");if(f.type!=="register_options")throw new Error(`Unexpected response: ${f.type}`);let w=f.authenticator_selection??{},E={authenticatorAttachment:"platform",residentKey:w.resident_key??"preferred",userVerification:w.user_verification??"preferred"},R={publicKey:{challenge:Y(f.challenge),rp:{id:f.rp.id,name:f.rp.name},user:{id:Y(f.user.id),name:f.user.name,displayName:f.user.display_name??f.user.name},pubKeyCredParams:(f.pub_key_cred_params??[]).map(K=>({type:K.type??"public-key",alg:K.alg})),timeout:this.config.timeout,attestation:f.attestation??"none",authenticatorSelection:E,...f.exclude_credentials?{excludeCredentials:f.exclude_credentials.map(K=>({type:"public-key",id:Y(K.id)}))}:{}}};this.setState("ceremony");let D=await navigator.credentials.create(R);if(!D)throw new Error("No credential returned");this.setState("verifying");let Q=D.response,$=await this.fido2Fetch({type:"register_complete",challenge:f.challenge,attestation_object:q(Q.attestationObject),client_data_json:q(Q.clientDataJSON),credential_id:q(D.rawId),browser_session_id:d});if($.type==="error")throw new Error($.error??"Registration failed");if($.type!=="register_ok")throw new Error(`Unexpected: ${$.type}`);return this.complete($.session_token??"",d)}catch(n){return this.fail(n)}}async authenticate(){this.setState("requesting-options");try{let e=he(16),n=await this.fido2Fetch({type:"authenticate_begin",browser_session_id:e});if(n.type==="error")throw new Error(n.error??"Authentication begin failed");if(n.type!=="authenticate_options")throw new Error(`Unexpected response: ${n.type}`);let d={publicKey:{challenge:Y(n.challenge),rpId:n.rp_id,timeout:this.config.timeout,userVerification:n.user_verification??"preferred",...n.allow_credentials?.length?{allowCredentials:n.allow_credentials.map(R=>({type:"public-key",id:Y(R.id),...R.transports?.length?{transports:R.transports}:{}}))}:{}}};this.setState("ceremony");let f=await navigator.credentials.get(d);if(!f)throw new Error("No assertion returned");this.setState("verifying");let w=f.response,E=await this.fido2Fetch({type:"authenticate_complete",challenge:n.challenge,credential_id:q(f.rawId),authenticator_data:q(w.authenticatorData),signature:q(w.signature),client_data_json:q(w.clientDataJSON),browser_session_id:e});if(E.type==="error")throw new Error(E.error??"Authentication failed");if(E.type!=="authenticate_ok")throw new Error(`Unexpected: ${E.type}`);return this.complete(E.session_token??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e){let d=`${this.config.apiBase.replace(/\/+$/,"")}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2`,f=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!f.ok){let w=await f.json().catch(()=>({error:f.statusText}));throw new Error(w.error??`HTTP ${f.status}`)}return f.json()}complete(e,n){this.setState("complete");let d={sessionToken:e,sessionId:n};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(d),d}fail(e){this.setState("error");let n=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(n),n}setState(e){this.state=e,this.events.onStateChange?.(e)}};var ye=Le(be(),1),Ue=`
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
    overflow: hidden;
    flex-shrink: 0;
}
.brand-icon svg { width: 100%; height: 100%; display: block; }
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
`,Oe='<svg viewBox="0 0 500 500"><style>.ld{fill:#fff}@media(prefers-color-scheme:dark){.ld{fill:#2a2a2a}}</style><defs><linearGradient id="pg" y2="1"><stop offset="21%" stop-color="#34E89E"/><stop offset="42%" stop-color="#12B06E"/></linearGradient><linearGradient id="pb" x1="1" y1="1" x2="0" y2="0"><stop offset="21%" stop-color="#00BCF2"/><stop offset="42%" stop-color="#00A0EB"/></linearGradient></defs><path d="M100 0H450L0 450V100A100 100 0 0 1 100 0Z" fill="url(#pg)"/><path d="M500 50V400A100 100 0 0 1 400 500H50L500 50Z" fill="url(#pb)"/><polygon class="ld" points="0,500 50,500 500,50 500,0"/></svg>';var He='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z"/></svg>',me='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"/><path d="M17.5 15.5c0-1.93-1.57-3.5-3.5-3.5s-3.5 1.57-3.5 3.5"/><rect x="3" y="4" width="18" height="16" rx="3"/></svg>',We='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>',Fe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';function m(A,e,...n){let d=document.createElement(A);if(e!=null)for(let[f,w]of Object.entries(e))f==="className"?d.className=w:f.startsWith("on")&&typeof w=="function"?d.addEventListener(f.slice(2).toLowerCase(),w):f==="html"?d.innerHTML=w:w===!1||w==null||(w===!0?d.setAttribute(f,""):d.setAttribute(f,String(w)));for(let f of n.flat(1/0))f==null||f===!1||d.appendChild(typeof f=="string"?document.createTextNode(f):f);return d}function je(A){try{let e=(0,ye.default)(0,"M");e.addData(A),e.make();let n=e.getModuleCount(),d=Math.max(3,Math.floor(200/n));return e.createSvgTag({cellSize:d,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${A}</div>`}}var ee=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,n)=>{this.resolve=e,this.reject=n,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.mount(),this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=Ue,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let n=m("div",{className:"overlay",onClick:()=>this.handleCancel()});this.shadow.appendChild(n);let d;switch(this.state){case"idle":d=this.renderIdle();break;case"qr-scanning":d=this.renderQR();break;case"wallet-connected":case"authenticating":d=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":d=this.renderPasskeyProgress();break;case"success":d=this.renderSuccess();break;case"error":d=this.renderError();break;default:d=this.renderIdle()}d.addEventListener("click",f=>f.stopPropagation()),this.shadow.appendChild(d)}renderIdle(){let e=Z.isSupported();return m("div",{className:"modal"},this.brandHeader(),m("button",{className:"btn-provider wallet",onClick:()=>this.startWallet()},m("span",{html:He}),m("span",{className:"btn-label"},"Continue with Privasys Wallet"),m("span",{className:"btn-hint"},"Attestation verified")),e?m("div",{className:"divider"},m("span",null,"or")):null,e?m("button",{className:"btn-provider",onClick:()=>this.startPasskey("authenticate")},m("span",{html:me}),m("span",{className:"btn-label"},"Sign in with passkey"),m("span",{className:"btn-hint"},"Windows Hello, Touch ID, Face ID")):null,e?m("div",{className:"register-link"},"No passkey yet? ",m("button",{className:"link-btn",onClick:()=>this.startPasskey("register")},"Register one")):null,m("div",{className:"footer"},"Secured by end-to-end encryption inside a hardware enclave"))}renderQR(){let e=this.getRelayClient(),{payload:n}=e.createQR(this.sessionId);return m("div",{className:"modal"},this.brandHeader(),m("div",{className:"qr-section"},m("div",{className:"qr-frame",html:je(n)}),m("div",{className:"scan-label"},m("span",{className:"pulse"}),"Scan with Privasys Wallet"),m("p",{className:"scan-hint"},"Open the wallet app on your phone and scan this QR code to authenticate.")),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}renderWalletProgress(){let e=this.state==="authenticating";return m("div",{className:"modal"},this.brandHeader(),m("div",{className:"progress-section"},m("div",{className:"spinner"}),m("div",{className:"steps"},m("div",{className:"step done"},m("span",{className:"step-icon"},"\u2713"),"QR code scanned"),m("div",{className:`step ${e?"done":"active"}`},m("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Verifying enclave attestation"),m("div",{className:`step ${e?"active":""}`},m("span",{className:"step-icon"},"\u2022"),"FIDO2 biometric ceremony"))),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}renderPasskeyProgress(){let e=this.method==="passkey",n=this.state;return m("div",{className:"modal"},m("div",{className:"brand"},m("div",{className:"brand-icon",html:me}),m("div",null,m("div",{className:"brand-title"},n==="passkey-requesting"?"Preparing\u2026":"Verify your identity"),m("div",{className:"brand-sub"},this.rpId))),m("div",{className:"progress-section"},m("div",{className:"spinner"}),m("div",{className:"steps"},m("div",{className:`step ${n!=="passkey-requesting"?"done":"active"}`},m("span",{className:"step-icon"},n!=="passkey-requesting"?"\u2713":"\u2022"),"Requesting options from enclave"),m("div",{className:`step ${n==="passkey-ceremony"?"active":n==="passkey-verifying"?"done":""}`},m("span",{className:"step-icon"},n==="passkey-verifying"?"\u2713":"\u2022"),"Complete biometric prompt"),m("div",{className:`step ${n==="passkey-verifying"?"active":""}`},m("span",{className:"step-icon"},"\u2022"),"Enclave verification"))),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}renderSuccess(){let e=this.sessionToken?"\u25CF".repeat(8)+this.sessionToken.slice(-6):"\u2014",n=this.method==="wallet"?"Privasys Wallet":"Passkey",d=this.method==="wallet"?"Attestation verified":"This device";return m("div",{className:"modal"},m("div",{className:"success-icon",html:We}),m("div",{className:"success-title"},"Authenticated"),m("div",{className:"success-method"},m("span",{className:"method-badge"},n),m("span",{className:"method-detail"},d)),m("div",{className:"session-info"},m("div",{className:"session-row"},m("span",{className:"session-label"},"Session"),m("span",{className:"session-value"},e)),m("div",{className:"session-row"},m("span",{className:"session-label"},"App"),m("span",{className:"session-value"},this.rpId))),m("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return m("div",{className:"modal"},m("div",{className:"error-icon",html:Fe}),m("div",{className:"error-title"},"Authentication failed"),m("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),m("button",{className:"btn-retry",onClick:()=>{this.state="idle",this.errorMsg="",this.render()}},"Try again"),m("div",{className:"footer"},m("button",{className:"link-btn",onClick:()=>this.handleCancel()},"Cancel")))}brandHeader(){return m("div",{className:"brand"},m("div",{className:"brand-icon",html:Oe}),m("div",null,m("div",{className:"brand-title"},`Sign in to ${this.cfg.appName}`),m("div",{className:"brand-sub"},this.rpId)))}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:n}=e.createQR();this.sessionId=n,this.state="qr-scanning",this.render(),e.waitForResult(n).then(d=>{this.sessionToken=d.sessionToken,this.attestation=d.attestation,this.sessionId=d.sessionId,this.pushToken=d.pushToken,this.complete()},d=>{this.state="error",this.errorMsg=d?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let n=this.getWebAuthnClient();try{let d=e==="register"?await n.register(globalThis.location?.hostname??"user"):await n.authenticate();this.sessionToken=d.sessionToken,this.sessionId=d.sessionId,this.complete()}catch(d){this.state="error",this.errorMsg=d?.message??"Passkey authentication failed",this.render()}}complete(){this.state="success",this.render(),setTimeout(()=>{let e={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId,pushToken:this.pushToken};this.close(),this.resolve?.(e),this.resolve=null,this.reject=null},1200)}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new z({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout},{onStateChange:e=>{let n={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};n[e]&&(this.state=n[e],this.render())}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new Z({apiBase:this.cfg.apiBase,appName:this.cfg.appName},{onStateChange:e=>{let n={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};n[e]&&(this.state=n[e],this.render())}})),this.webauthnClient}};var we=new j,G=null;window.addEventListener("message",async A=>{let e=A.data;if(!(!e||typeof e.type!="string")){if(e.type==="privasys:init"){let n=e.config,d=A.origin;G&&(G.destroy(),G=null),G=new ee(n);try{let f=await G.signIn();we.store({token:f.sessionToken,rpId:n.rpId||n.appName,origin:n.apiBase,authenticatedAt:Date.now(),pushToken:f.pushToken}),window.parent.postMessage({type:"privasys:result",result:f},d)}catch(f){let w=f instanceof Error?f.message:"Authentication failed";w==="Authentication cancelled"||w==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},d):window.parent.postMessage({type:"privasys:error",error:w},d)}finally{G=null}}if(e.type==="privasys:check-session"){let n=we.get(e.rpId);window.parent.postMessage({type:"privasys:session",session:n||null},A.origin)}}});window.parent.postMessage({type:"privasys:ready"},"*");})();
//# sourceMappingURL=privasys-auth-frame.iife.js.map
