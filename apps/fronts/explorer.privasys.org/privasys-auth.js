"use strict";var Privasys=(()=>{var Ne=Object.create;var te=Object.defineProperty;var Se=Object.getOwnPropertyDescriptor;var Me=Object.getOwnPropertyNames;var Pe=Object.getPrototypeOf,Re=Object.prototype.hasOwnProperty;var _e=(w,e)=>()=>(e||w((e={exports:{}}).exports,e),e.exports),De=(w,e)=>{for(var n in e)te(w,n,{get:e[n],enumerable:!0})},fe=(w,e,n,h)=>{if(e&&typeof e=="object"||typeof e=="function")for(let y of Me(e))!Re.call(w,y)&&y!==n&&te(w,y,{get:()=>e[y],enumerable:!(h=Se(e,y))||h.enumerable});return w};var Fe=(w,e,n)=>(n=w!=null?Ne(Pe(w)):{},fe(e||!w||!w.__esModule?te(n,"default",{value:w,enumerable:!0}):n,w)),Le=w=>fe(te({},"__esModule",{value:!0}),w);var xe=_e((be,ye)=>{var me=(function(){var w=function(k,A){var m=236,b=17,s=k,g=n[A],r=null,t=0,v=null,l=[],p={},B=function(a,o){t=s*4+17,r=(function(i){for(var c=new Array(i),u=0;u<i;u+=1){c[u]=new Array(i);for(var x=0;x<i;x+=1)c[u][x]=null}return c})(t),N(0,0),N(t-7,0),N(0,t-7),L(),_(),j(a,o),s>=7&&W(a),v==null&&(v=Ee(s,g,l)),K(v,o)},N=function(a,o){for(var i=-1;i<=7;i+=1)if(!(a+i<=-1||t<=a+i))for(var c=-1;c<=7;c+=1)o+c<=-1||t<=o+c||(0<=i&&i<=6&&(c==0||c==6)||0<=c&&c<=6&&(i==0||i==6)||2<=i&&i<=4&&2<=c&&c<=4?r[a+i][o+c]=!0:r[a+i][o+c]=!1)},P=function(){for(var a=0,o=0,i=0;i<8;i+=1){B(!0,i);var c=y.getLostPoint(p);(i==0||a>c)&&(a=c,o=i)}return o},_=function(){for(var a=8;a<t-8;a+=1)r[a][6]==null&&(r[a][6]=a%2==0);for(var o=8;o<t-8;o+=1)r[6][o]==null&&(r[6][o]=o%2==0)},L=function(){for(var a=y.getPatternPosition(s),o=0;o<a.length;o+=1)for(var i=0;i<a.length;i+=1){var c=a[o],u=a[i];if(r[c][u]==null)for(var x=-2;x<=2;x+=1)for(var T=-2;T<=2;T+=1)x==-2||x==2||T==-2||T==2||x==0&&T==0?r[c+x][u+T]=!0:r[c+x][u+T]=!1}},W=function(a){for(var o=y.getBCHTypeNumber(s),i=0;i<18;i+=1){var c=!a&&(o>>i&1)==1;r[Math.floor(i/3)][i%3+t-8-3]=c}for(var i=0;i<18;i+=1){var c=!a&&(o>>i&1)==1;r[i%3+t-8-3][Math.floor(i/3)]=c}},j=function(a,o){for(var i=g<<3|o,c=y.getBCHTypeInfo(i),u=0;u<15;u+=1){var x=!a&&(c>>u&1)==1;u<6?r[u][8]=x:u<8?r[u+1][8]=x:r[t-15+u][8]=x}for(var u=0;u<15;u+=1){var x=!a&&(c>>u&1)==1;u<8?r[8][t-u-1]=x:u<9?r[8][15-u-1+1]=x:r[8][15-u-1]=x}r[t-8][8]=!a},K=function(a,o){for(var i=-1,c=t-1,u=7,x=0,T=y.getMaskFunction(o),C=t-1;C>0;C-=2)for(C==6&&(C-=1);;){for(var R=0;R<2;R+=1)if(r[c][C-R]==null){var D=!1;x<a.length&&(D=(a[x]>>>u&1)==1);var E=T(c,C-R);E&&(D=!D),r[c][C-R]=D,u-=1,u==-1&&(x+=1,u=7)}if(c+=i,c<0||t<=c){c-=i,i=-i;break}}},z=function(a,o){for(var i=0,c=0,u=0,x=new Array(o.length),T=new Array(o.length),C=0;C<o.length;C+=1){var R=o[C].dataCount,D=o[C].totalCount-R;c=Math.max(c,R),u=Math.max(u,D),x[C]=new Array(R);for(var E=0;E<x[C].length;E+=1)x[C][E]=255&a.getBuffer()[E+i];i+=R;var O=y.getErrorCorrectPolynomial(D),U=I(x[C],O.getLength()-1),ue=U.mod(O);T[C]=new Array(O.getLength()-1);for(var E=0;E<T[C].length;E+=1){var de=E+ue.getLength()-T[C].length;T[C][E]=de>=0?ue.getAt(de):0}}for(var pe=0,E=0;E<o.length;E+=1)pe+=o[E].totalCount;for(var ae=new Array(pe),ee=0,E=0;E<c;E+=1)for(var C=0;C<o.length;C+=1)E<x[C].length&&(ae[ee]=x[C][E],ee+=1);for(var E=0;E<u;E+=1)for(var C=0;C<o.length;C+=1)E<T[C].length&&(ae[ee]=T[C][E],ee+=1);return ae},Ee=function(a,o,i){for(var c=S.getRSBlocks(a,o),u=M(),x=0;x<i.length;x+=1){var T=i[x];u.put(T.getMode(),4),u.put(T.getLength(),y.getLengthInBits(T.getMode(),a)),T.write(u)}for(var C=0,x=0;x<c.length;x+=1)C+=c[x].dataCount;if(u.getLengthInBits()>C*8)throw"code length overflow. ("+u.getLengthInBits()+">"+C*8+")";for(u.getLengthInBits()+4<=C*8&&u.put(0,4);u.getLengthInBits()%8!=0;)u.putBit(!1);for(;!(u.getLengthInBits()>=C*8||(u.put(m,8),u.getLengthInBits()>=C*8));)u.put(b,8);return z(u,c)};p.addData=function(a,o){o=o||"Byte";var i=null;switch(o){case"Numeric":i=F(a);break;case"Alphanumeric":i=H(a);break;case"Byte":i=G(a);break;case"Kanji":i=se(a);break;default:throw"mode:"+o}l.push(i),v=null},p.isDark=function(a,o){if(a<0||t<=a||o<0||t<=o)throw a+","+o;return r[a][o]},p.getModuleCount=function(){return t},p.make=function(){if(s<1){for(var a=1;a<40;a++){for(var o=S.getRSBlocks(a,g),i=M(),c=0;c<l.length;c++){var u=l[c];i.put(u.getMode(),4),i.put(u.getLength(),y.getLengthInBits(u.getMode(),a)),u.write(i)}for(var x=0,c=0;c<o.length;c++)x+=o[c].dataCount;if(i.getLengthInBits()<=x*8)break}s=a}B(!1,P())},p.createTableTag=function(a,o){a=a||2,o=typeof o>"u"?a*4:o;var i="";i+='<table style="',i+=" border-width: 0px; border-style: none;",i+=" border-collapse: collapse;",i+=" padding: 0px; margin: "+o+"px;",i+='">',i+="<tbody>";for(var c=0;c<p.getModuleCount();c+=1){i+="<tr>";for(var u=0;u<p.getModuleCount();u+=1)i+='<td style="',i+=" border-width: 0px; border-style: none;",i+=" border-collapse: collapse;",i+=" padding: 0px; margin: 0px;",i+=" width: "+a+"px;",i+=" height: "+a+"px;",i+=" background-color: ",i+=p.isDark(c,u)?"#000000":"#ffffff",i+=";",i+='"/>';i+="</tr>"}return i+="</tbody>",i+="</table>",i},p.createSvgTag=function(a,o,i,c){var u={};typeof arguments[0]=="object"&&(u=arguments[0],a=u.cellSize,o=u.margin,i=u.alt,c=u.title),a=a||2,o=typeof o>"u"?a*4:o,i=typeof i=="string"?{text:i}:i||{},i.text=i.text||null,i.id=i.text?i.id||"qrcode-description":null,c=typeof c=="string"?{text:c}:c||{},c.text=c.text||null,c.id=c.text?c.id||"qrcode-title":null;var x=p.getModuleCount()*a+o*2,T,C,R,D,E="",O;for(O="l"+a+",0 0,"+a+" -"+a+",0 0,-"+a+"z ",E+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',E+=u.scalable?"":' width="'+x+'px" height="'+x+'px"',E+=' viewBox="0 0 '+x+" "+x+'" ',E+=' preserveAspectRatio="xMinYMin meet"',E+=c.text||i.text?' role="img" aria-labelledby="'+V([c.id,i.id].join(" ").trim())+'"':"",E+=">",E+=c.text?'<title id="'+V(c.id)+'">'+V(c.text)+"</title>":"",E+=i.text?'<description id="'+V(i.id)+'">'+V(i.text)+"</description>":"",E+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',E+='<path d="',R=0;R<p.getModuleCount();R+=1)for(D=R*a+o,T=0;T<p.getModuleCount();T+=1)p.isDark(R,T)&&(C=T*a+o,E+="M"+C+","+D+O);return E+='" stroke="transparent" fill="black"/>',E+="</svg>",E},p.createDataURL=function(a,o){a=a||2,o=typeof o>"u"?a*4:o;var i=p.getModuleCount()*a+o*2,c=o,u=i-o;return Te(i,i,function(x,T){if(c<=x&&x<u&&c<=T&&T<u){var C=Math.floor((x-c)/a),R=Math.floor((T-c)/a);return p.isDark(R,C)?0:1}else return 1})},p.createImgTag=function(a,o,i){a=a||2,o=typeof o>"u"?a*4:o;var c=p.getModuleCount()*a+o*2,u="";return u+="<img",u+=' src="',u+=p.createDataURL(a,o),u+='"',u+=' width="',u+=c,u+='"',u+=' height="',u+=c,u+='"',i&&(u+=' alt="',u+=V(i),u+='"'),u+="/>",u};var V=function(a){for(var o="",i=0;i<a.length;i+=1){var c=a.charAt(i);switch(c){case"<":o+="&lt;";break;case">":o+="&gt;";break;case"&":o+="&amp;";break;case'"':o+="&quot;";break;default:o+=c;break}}return o},Be=function(a){var o=1;a=typeof a>"u"?o*2:a;var i=p.getModuleCount()*o+a*2,c=a,u=i-a,x,T,C,R,D,E={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},O={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},U="";for(x=0;x<i;x+=2){for(C=Math.floor((x-c)/o),R=Math.floor((x+1-c)/o),T=0;T<i;T+=1)D="\u2588",c<=T&&T<u&&c<=x&&x<u&&p.isDark(C,Math.floor((T-c)/o))&&(D=" "),c<=T&&T<u&&c<=x+1&&x+1<u&&p.isDark(R,Math.floor((T-c)/o))?D+=" ":D+="\u2588",U+=a<1&&x+1>=u?O[D]:E[D];U+=`
`}return i%2&&a>0?U.substring(0,U.length-i-1)+Array(i+1).join("\u2580"):U.substring(0,U.length-1)};return p.createASCII=function(a,o){if(a=a||1,a<2)return Be(o);a-=1,o=typeof o>"u"?a*2:o;var i=p.getModuleCount()*a+o*2,c=o,u=i-o,x,T,C,R,D=Array(a+1).join("\u2588\u2588"),E=Array(a+1).join("  "),O="",U="";for(x=0;x<i;x+=1){for(C=Math.floor((x-c)/a),U="",T=0;T<i;T+=1)R=1,c<=T&&T<u&&c<=x&&x<u&&p.isDark(C,Math.floor((T-c)/a))&&(R=0),U+=R?D:E;for(C=0;C<a;C+=1)O+=U+`
`}return O.substring(0,O.length-1)},p.renderTo2dContext=function(a,o){o=o||2;for(var i=p.getModuleCount(),c=0;c<i;c++)for(var u=0;u<i;u++)a.fillStyle=p.isDark(c,u)?"black":"white",a.fillRect(c*o,u*o,o,o)},p};w.stringToBytesFuncs={default:function(k){for(var A=[],m=0;m<k.length;m+=1){var b=k.charCodeAt(m);A.push(b&255)}return A}},w.stringToBytes=w.stringToBytesFuncs.default,w.createStringToBytes=function(k,A){var m=(function(){for(var s=Ce(k),g=function(){var _=s.read();if(_==-1)throw"eof";return _},r=0,t={};;){var v=s.read();if(v==-1)break;var l=g(),p=g(),B=g(),N=String.fromCharCode(v<<8|l),P=p<<8|B;t[N]=P,r+=1}if(r!=A)throw r+" != "+A;return t})(),b=63;return function(s){for(var g=[],r=0;r<s.length;r+=1){var t=s.charCodeAt(r);if(t<128)g.push(t);else{var v=m[s.charAt(r)];typeof v=="number"?(v&255)==v?g.push(v):(g.push(v>>>8),g.push(v&255)):g.push(b)}}return g}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},n={L:1,M:0,Q:3,H:2},h={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},y=(function(){var k=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],A=1335,m=7973,b=21522,s={},g=function(r){for(var t=0;r!=0;)t+=1,r>>>=1;return t};return s.getBCHTypeInfo=function(r){for(var t=r<<10;g(t)-g(A)>=0;)t^=A<<g(t)-g(A);return(r<<10|t)^b},s.getBCHTypeNumber=function(r){for(var t=r<<12;g(t)-g(m)>=0;)t^=m<<g(t)-g(m);return r<<12|t},s.getPatternPosition=function(r){return k[r-1]},s.getMaskFunction=function(r){switch(r){case h.PATTERN000:return function(t,v){return(t+v)%2==0};case h.PATTERN001:return function(t,v){return t%2==0};case h.PATTERN010:return function(t,v){return v%3==0};case h.PATTERN011:return function(t,v){return(t+v)%3==0};case h.PATTERN100:return function(t,v){return(Math.floor(t/2)+Math.floor(v/3))%2==0};case h.PATTERN101:return function(t,v){return t*v%2+t*v%3==0};case h.PATTERN110:return function(t,v){return(t*v%2+t*v%3)%2==0};case h.PATTERN111:return function(t,v){return(t*v%3+(t+v)%2)%2==0};default:throw"bad maskPattern:"+r}},s.getErrorCorrectPolynomial=function(r){for(var t=I([1],0),v=0;v<r;v+=1)t=t.multiply(I([1,d.gexp(v)],0));return t},s.getLengthInBits=function(r,t){if(1<=t&&t<10)switch(r){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+r}else if(t<27)switch(r){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+r}else if(t<41)switch(r){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+r}else throw"type:"+t},s.getLostPoint=function(r){for(var t=r.getModuleCount(),v=0,l=0;l<t;l+=1)for(var p=0;p<t;p+=1){for(var B=0,N=r.isDark(l,p),P=-1;P<=1;P+=1)if(!(l+P<0||t<=l+P))for(var _=-1;_<=1;_+=1)p+_<0||t<=p+_||P==0&&_==0||N==r.isDark(l+P,p+_)&&(B+=1);B>5&&(v+=3+B-5)}for(var l=0;l<t-1;l+=1)for(var p=0;p<t-1;p+=1){var L=0;r.isDark(l,p)&&(L+=1),r.isDark(l+1,p)&&(L+=1),r.isDark(l,p+1)&&(L+=1),r.isDark(l+1,p+1)&&(L+=1),(L==0||L==4)&&(v+=3)}for(var l=0;l<t;l+=1)for(var p=0;p<t-6;p+=1)r.isDark(l,p)&&!r.isDark(l,p+1)&&r.isDark(l,p+2)&&r.isDark(l,p+3)&&r.isDark(l,p+4)&&!r.isDark(l,p+5)&&r.isDark(l,p+6)&&(v+=40);for(var p=0;p<t;p+=1)for(var l=0;l<t-6;l+=1)r.isDark(l,p)&&!r.isDark(l+1,p)&&r.isDark(l+2,p)&&r.isDark(l+3,p)&&r.isDark(l+4,p)&&!r.isDark(l+5,p)&&r.isDark(l+6,p)&&(v+=40);for(var W=0,p=0;p<t;p+=1)for(var l=0;l<t;l+=1)r.isDark(l,p)&&(W+=1);var j=Math.abs(100*W/t/t-50)/5;return v+=j*10,v},s})(),d=(function(){for(var k=new Array(256),A=new Array(256),m=0;m<8;m+=1)k[m]=1<<m;for(var m=8;m<256;m+=1)k[m]=k[m-4]^k[m-5]^k[m-6]^k[m-8];for(var m=0;m<255;m+=1)A[k[m]]=m;var b={};return b.glog=function(s){if(s<1)throw"glog("+s+")";return A[s]},b.gexp=function(s){for(;s<0;)s+=255;for(;s>=256;)s-=255;return k[s]},b})();function I(k,A){if(typeof k.length>"u")throw k.length+"/"+A;var m=(function(){for(var s=0;s<k.length&&k[s]==0;)s+=1;for(var g=new Array(k.length-s+A),r=0;r<k.length-s;r+=1)g[r]=k[r+s];return g})(),b={};return b.getAt=function(s){return m[s]},b.getLength=function(){return m.length},b.multiply=function(s){for(var g=new Array(b.getLength()+s.getLength()-1),r=0;r<b.getLength();r+=1)for(var t=0;t<s.getLength();t+=1)g[r+t]^=d.gexp(d.glog(b.getAt(r))+d.glog(s.getAt(t)));return I(g,0)},b.mod=function(s){if(b.getLength()-s.getLength()<0)return b;for(var g=d.glog(b.getAt(0))-d.glog(s.getAt(0)),r=new Array(b.getLength()),t=0;t<b.getLength();t+=1)r[t]=b.getAt(t);for(var t=0;t<s.getLength();t+=1)r[t]^=d.gexp(d.glog(s.getAt(t))+g);return I(r,0).mod(s)},b}var S=(function(){var k=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],A=function(s,g){var r={};return r.totalCount=s,r.dataCount=g,r},m={},b=function(s,g){switch(g){case n.L:return k[(s-1)*4+0];case n.M:return k[(s-1)*4+1];case n.Q:return k[(s-1)*4+2];case n.H:return k[(s-1)*4+3];default:return}};return m.getRSBlocks=function(s,g){var r=b(s,g);if(typeof r>"u")throw"bad rs block @ typeNumber:"+s+"/errorCorrectionLevel:"+g;for(var t=r.length/3,v=[],l=0;l<t;l+=1)for(var p=r[l*3+0],B=r[l*3+1],N=r[l*3+2],P=0;P<p;P+=1)v.push(A(B,N));return v},m})(),M=function(){var k=[],A=0,m={};return m.getBuffer=function(){return k},m.getAt=function(b){var s=Math.floor(b/8);return(k[s]>>>7-b%8&1)==1},m.put=function(b,s){for(var g=0;g<s;g+=1)m.putBit((b>>>s-g-1&1)==1)},m.getLengthInBits=function(){return A},m.putBit=function(b){var s=Math.floor(A/8);k.length<=s&&k.push(0),b&&(k[s]|=128>>>A%8),A+=1},m},F=function(k){var A=e.MODE_NUMBER,m=k,b={};b.getMode=function(){return A},b.getLength=function(r){return m.length},b.write=function(r){for(var t=m,v=0;v+2<t.length;)r.put(s(t.substring(v,v+3)),10),v+=3;v<t.length&&(t.length-v==1?r.put(s(t.substring(v,v+1)),4):t.length-v==2&&r.put(s(t.substring(v,v+2)),7))};var s=function(r){for(var t=0,v=0;v<r.length;v+=1)t=t*10+g(r.charAt(v));return t},g=function(r){if("0"<=r&&r<="9")return r.charCodeAt(0)-48;throw"illegal char :"+r};return b},H=function(k){var A=e.MODE_ALPHA_NUM,m=k,b={};b.getMode=function(){return A},b.getLength=function(g){return m.length},b.write=function(g){for(var r=m,t=0;t+1<r.length;)g.put(s(r.charAt(t))*45+s(r.charAt(t+1)),11),t+=2;t<r.length&&g.put(s(r.charAt(t)),6)};var s=function(g){if("0"<=g&&g<="9")return g.charCodeAt(0)-48;if("A"<=g&&g<="Z")return g.charCodeAt(0)-65+10;switch(g){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+g}};return b},G=function(k){var A=e.MODE_8BIT_BYTE,m=k,b=w.stringToBytes(k),s={};return s.getMode=function(){return A},s.getLength=function(g){return b.length},s.write=function(g){for(var r=0;r<b.length;r+=1)g.put(b[r],8)},s},se=function(k){var A=e.MODE_KANJI,m=k,b=w.stringToBytesFuncs.SJIS;if(!b)throw"sjis not supported.";(function(r,t){var v=b(r);if(v.length!=2||(v[0]<<8|v[1])!=t)throw"sjis not supported."})("\u53CB",38726);var s=b(k),g={};return g.getMode=function(){return A},g.getLength=function(r){return~~(s.length/2)},g.write=function(r){for(var t=s,v=0;v+1<t.length;){var l=(255&t[v])<<8|255&t[v+1];if(33088<=l&&l<=40956)l-=33088;else if(57408<=l&&l<=60351)l-=49472;else throw"illegal char at "+(v+1)+"/"+l;l=(l>>>8&255)*192+(l&255),r.put(l,13),v+=2}if(v<t.length)throw"illegal char at "+(v+1)},g},X=function(){var k=[],A={};return A.writeByte=function(m){k.push(m&255)},A.writeShort=function(m){A.writeByte(m),A.writeByte(m>>>8)},A.writeBytes=function(m,b,s){b=b||0,s=s||m.length;for(var g=0;g<s;g+=1)A.writeByte(m[g+b])},A.writeString=function(m){for(var b=0;b<m.length;b+=1)A.writeByte(m.charCodeAt(b))},A.toByteArray=function(){return k},A.toString=function(){var m="";m+="[";for(var b=0;b<k.length;b+=1)b>0&&(m+=","),m+=k[b];return m+="]",m},A},Ae=function(){var k=0,A=0,m=0,b="",s={},g=function(t){b+=String.fromCharCode(r(t&63))},r=function(t){if(!(t<0)){if(t<26)return 65+t;if(t<52)return 97+(t-26);if(t<62)return 48+(t-52);if(t==62)return 43;if(t==63)return 47}throw"n:"+t};return s.writeByte=function(t){for(k=k<<8|t&255,A+=8,m+=1;A>=6;)g(k>>>A-6),A-=6},s.flush=function(){if(A>0&&(g(k<<6-A),k=0,A=0),m%3!=0)for(var t=3-m%3,v=0;v<t;v+=1)b+="="},s.toString=function(){return b},s},Ce=function(k){var A=k,m=0,b=0,s=0,g={};g.read=function(){for(;s<8;){if(m>=A.length){if(s==0)return-1;throw"unexpected end of file./"+s}var t=A.charAt(m);if(m+=1,t=="=")return s=0,-1;if(t.match(/^\s$/))continue;b=b<<6|r(t.charCodeAt(0)),s+=6}var v=b>>>s-8&255;return s-=8,v};var r=function(t){if(65<=t&&t<=90)return t-65;if(97<=t&&t<=122)return t-97+26;if(48<=t&&t<=57)return t-48+52;if(t==43)return 62;if(t==47)return 63;throw"c:"+t};return g},Ie=function(k,A){var m=k,b=A,s=new Array(k*A),g={};g.setPixel=function(l,p,B){s[p*m+l]=B},g.write=function(l){l.writeString("GIF87a"),l.writeShort(m),l.writeShort(b),l.writeByte(128),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(0),l.writeByte(255),l.writeByte(255),l.writeByte(255),l.writeString(","),l.writeShort(0),l.writeShort(0),l.writeShort(m),l.writeShort(b),l.writeByte(0);var p=2,B=t(p);l.writeByte(p);for(var N=0;B.length-N>255;)l.writeByte(255),l.writeBytes(B,N,255),N+=255;l.writeByte(B.length-N),l.writeBytes(B,N,B.length-N),l.writeByte(0),l.writeString(";")};var r=function(l){var p=l,B=0,N=0,P={};return P.write=function(_,L){if(_>>>L)throw"length over";for(;B+L>=8;)p.writeByte(255&(_<<B|N)),L-=8-B,_>>>=8-B,N=0,B=0;N=_<<B|N,B=B+L},P.flush=function(){B>0&&p.writeByte(N)},P},t=function(l){for(var p=1<<l,B=(1<<l)+1,N=l+1,P=v(),_=0;_<p;_+=1)P.add(String.fromCharCode(_));P.add(String.fromCharCode(p)),P.add(String.fromCharCode(B));var L=X(),W=r(L);W.write(p,N);var j=0,K=String.fromCharCode(s[j]);for(j+=1;j<s.length;){var z=String.fromCharCode(s[j]);j+=1,P.contains(K+z)?K=K+z:(W.write(P.indexOf(K),N),P.size()<4095&&(P.size()==1<<N&&(N+=1),P.add(K+z)),K=z)}return W.write(P.indexOf(K),N),W.write(B,N),W.flush(),L.toByteArray()},v=function(){var l={},p=0,B={};return B.add=function(N){if(B.contains(N))throw"dup key:"+N;l[N]=p,p+=1},B.size=function(){return p},B.indexOf=function(N){return l[N]},B.contains=function(N){return typeof l[N]<"u"},B};return g},Te=function(k,A,m){for(var b=Ie(k,A),s=0;s<A;s+=1)for(var g=0;g<k;g+=1)b.setPixel(g,s,m(g,s));var r=X();b.write(r);for(var t=Ae(),v=r.toByteArray(),l=0;l<v.length;l+=1)t.writeByte(v[l]);return t.flush(),"data:image/gif;base64,"+t};return w})();(function(){me.stringToBytesFuncs["UTF-8"]=function(w){function e(n){for(var h=[],y=0;y<n.length;y++){var d=n.charCodeAt(y);d<128?h.push(d):d<2048?h.push(192|d>>6,128|d&63):d<55296||d>=57344?h.push(224|d>>12,128|d>>6&63,128|d&63):(y++,d=65536+((d&1023)<<10|n.charCodeAt(y)&1023),h.push(240|d>>18,128|d>>12&63,128|d>>6&63,128|d&63))}return h}return e(w)}})();(function(w){typeof define=="function"&&define.amd?define([],w):typeof be=="object"&&(ye.exports=w())})(function(){return me})});var Ge={};De(Ge,{AuthUI:()=>ie,PrivasysAuth:()=>J,SessionManager:()=>$,WebAuthnClient:()=>Q,generateBatchQRPayload:()=>ne,generateQRPayload:()=>re,generateSessionId:()=>Y});function Y(){let w=new Uint8Array(32);return crypto.getRandomValues(w),Array.from(w,e=>e.toString(16).padStart(2,"0")).join("")}var Oe="privasys.id";function ge(w){let e=btoa(w).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return`https://${Oe}/scp?p=${e}`}function re(w){let e=w.sessionId??Y(),n={origin:w.rpId,sessionId:e,rpId:w.rpId,brokerUrl:w.brokerUrl};return w.requestedAttributes?.length&&(n.requestedAttributes=w.requestedAttributes),w.appName&&(n.appName=w.appName),w.privacyPolicyUrl&&(n.privacyPolicyUrl=w.privacyPolicyUrl),{sessionId:e,payload:ge(JSON.stringify(n))}}function ne(w){let e=w.sessionId??Y(),n=w.apps.map(y=>({rpId:y.rpId,sessionId:y.sessionId??Y()})),h={origin:w.apps[0]?.rpId??"",sessionId:e,brokerUrl:w.brokerUrl,apps:n};return{sessionId:e,appSessions:n,payload:ge(JSON.stringify(h))}}var oe="privasys_sessions",le="privasys_device_hints",$=class{constructor(){this.listeners=new Set}store(e){let n=this.getAll(),h=n.findIndex(y=>y.rpId===e.rpId);h>=0?n[h]=e:n.push(e),this.persist(n),this.notify(n)}get(e){return this.getAll().find(n=>n.rpId===e)}getAll(){try{let e=localStorage.getItem(oe);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}findPushToken(){let e=this.getAll().filter(n=>!!n.pushToken).sort((n,h)=>h.authenticatedAt-n.authenticatedAt);return e[0]?.pushToken?e[0].pushToken:this.getDeviceHint()?.pushToken}remove(e){let n=this.getAll().filter(h=>h.rpId!==e);this.persist(n),this.notify(n)}clear(){localStorage.removeItem(oe),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}saveDeviceHint(e,n){let h={pushToken:e,brokerUrl:n,updatedAt:Date.now()};try{localStorage.setItem(le,JSON.stringify(h))}catch{}}getDeviceHint(){try{let e=localStorage.getItem(le);return e?JSON.parse(e):void 0}catch{return}}clearDeviceHint(){localStorage.removeItem(le)}persist(e){localStorage.setItem(oe,JSON.stringify(e))}notify(e){for(let n of this.listeners)n(e)}};var ce=12e4,J=class{constructor(e,n={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:ce,...e},this.events=n,this.sessions=new $}createQR(e){return re({rpId:this.config.rpId,brokerUrl:this.config.brokerUrl,sessionId:e,requestedAttributes:this.config.requestedAttributes,appName:this.config.appName,privacyPolicyUrl:this.config.privacyPolicyUrl})}waitForResult(e){return new Promise((n,h)=>{let y=this.config.timeout??ce,d=new URL(this.config.brokerUrl);d.searchParams.set("session",e),d.searchParams.set("role","browser");let I=new WebSocket(d.toString());this.activeConnections.set(e,I),this.setState("waiting-for-scan");let S=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),h(new Error("Authentication timed out"))},y);I.onopen=()=>{this.setState("waiting-for-scan")},I.onmessage=M=>{try{let F=JSON.parse(typeof M.data=="string"?M.data:"{}");this.handleMessage(e,F,n,S)}catch{}},I.onerror=()=>{clearTimeout(S),this.setState("error"),this.cleanup(e),h(new Error("WebSocket connection failed"))},I.onclose=M=>{clearTimeout(S),this.cleanup(e),M.code!==1e3&&(this.setState("error"),h(new Error(`Connection closed (code ${M.code})`)))}})}async notifyAndWait(e,n){let h=n??this.createQR().sessionId,y=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),d=await fetch(`${y}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:h,rpId:this.config.rpId,appName:this.config.appName,origin:this.config.rpId,brokerUrl:this.config.brokerUrl})});if(!d.ok){let I=await d.text();throw new Error(`Push notification failed: ${I}`)}return this.waitForResult(h)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:n,appSessions:h,payload:y}=ne({brokerUrl:this.config.brokerUrl,apps:e.map(I=>({rpId:I.rpId}))}),d=this.waitForBatch(h);return{sessionId:n,appSessions:h,payload:y,result:d}}on(e){this.events={...this.events,...e}}handleMessage(e,n,h,y){switch(n.type){case"peer-joined":case"wallet-waiting":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(y),this.setState("complete");let d={sessionToken:n.sessionToken,sessionId:e,attestation:n.attestation,pushToken:n.pushToken||void 0,attributes:n.attributes||void 0};this.sessions.store({token:d.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now(),pushToken:d.pushToken,brokerUrl:this.config.brokerUrl}),this.events.onAuthenticated?.(d),this.cleanup(e),h(d);break}case"auth-error":{clearTimeout(y),this.setState("error"),this.cleanup(e);let d=new Error(n.message??"Authentication failed");this.events.onError?.(d);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let n=this.config.timeout??ce;this.setState("waiting-for-scan");let h=await Promise.allSettled(e.map(I=>Promise.race([this.waitForResult(I.sessionId),new Promise((S,M)=>setTimeout(()=>M(new Error("Batch item timed out")),n))]))),y=[],d=[];for(let I=0;I<h.length;I++){let S=h[I];S.status==="fulfilled"?y.push(S.value):d.push({rpId:e[I].rpId,error:S.reason instanceof Error?S.reason.message:String(S.reason)})}return this.setState(d.length===0?"complete":"error"),{results:y,errors:d}}cleanup(e){let n=this.activeConnections.get(e);n&&((n.readyState===WebSocket.OPEN||n.readyState===WebSocket.CONNECTING)&&n.close(1e3),this.activeConnections.delete(e))}};function q(w){let e=new Uint8Array(w),n="";for(let h=0;h<e.length;h++)n+=String.fromCharCode(e[h]);return btoa(n).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function Z(w){let e=w.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let n=atob(e),h=new Uint8Array(n.length);for(let y=0;y<n.length;y++)h[y]=n.charCodeAt(y);return h.buffer}function ve(w){let e=new Uint8Array(w);return crypto.getRandomValues(e),Array.from(e,n=>n.toString(16).padStart(2,"0")).join("")}var Q=class{constructor(e,n={}){this.state="idle";this.config={timeout:6e4,...e},this.events=n,this.sessions=new $}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let n=q(crypto.getRandomValues(new Uint8Array(32)).buffer),h=this.config.sessionId??ve(16),d=(await this.fido2Fetch("register/begin",{userName:e??globalThis.location?.hostname??"user",userHandle:n},{session_id:h})).publicKey;if(!d)throw new Error("Missing publicKey in registration options");let I={publicKey:{challenge:Z(d.challenge),rp:{id:d.rp.id,name:d.rp.name},user:{id:Z(d.user.id),name:d.user.name,displayName:d.user.displayName??d.user.name},pubKeyCredParams:(d.pubKeyCredParams??[]).map(H=>({type:H.type??"public-key",alg:H.alg})),timeout:this.config.timeout,attestation:d.attestation??"none",authenticatorSelection:{authenticatorAttachment:"platform",residentKey:d.authenticatorSelection?.residentKey??"preferred",userVerification:d.authenticatorSelection?.userVerification??"preferred"},...d.excludeCredentials?{excludeCredentials:d.excludeCredentials.map(H=>({type:"public-key",id:Z(H.id)}))}:{}}};this.setState("ceremony");let S=await navigator.credentials.create(I);if(!S)throw new Error("No credential returned");this.setState("verifying");let M=S.response,F=await this.fido2Fetch("register/complete",{id:q(S.rawId),rawId:q(S.rawId),type:"public-key",response:{attestationObject:q(M.attestationObject),clientDataJSON:q(M.clientDataJSON)}},{challenge:d.challenge});return this.complete(F.sessionToken??"",h)}catch(n){return this.fail(n)}}async authenticate(){this.setState("requesting-options");try{let e=this.config.sessionId??ve(16),h=(await this.fido2Fetch("authenticate/begin",{},{session_id:e})).publicKey;if(!h)throw new Error("Missing publicKey in authentication options");let y={publicKey:{challenge:Z(h.challenge),rpId:h.rpId,timeout:this.config.timeout,userVerification:h.userVerification??"preferred",...h.allowCredentials?.length?{allowCredentials:h.allowCredentials.map(M=>({type:"public-key",id:Z(M.id),...M.transports?.length?{transports:M.transports}:{}}))}:{}}};this.setState("ceremony");let d=await navigator.credentials.get(y);if(!d)throw new Error("No assertion returned");this.setState("verifying");let I=d.response,S=await this.fido2Fetch("authenticate/complete",{id:q(d.rawId),rawId:q(d.rawId),type:"public-key",response:{clientDataJSON:q(I.clientDataJSON),authenticatorData:q(I.authenticatorData),signature:q(I.signature)}},{challenge:h.challenge});return this.complete(S.sessionToken??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e,n,h){let y=(this.config.fido2Base??this.config.apiBase).replace(/\/+$/,""),d=this.config.fido2Base?new URL(`${y}/${e}`):new URL(`${y}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2/${e}`);if(h)for(let[S,M]of Object.entries(h))d.searchParams.set(S,M);let I=await fetch(d.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(!I.ok){let S=await I.json().catch(()=>({error:I.statusText}));throw new Error(S.error??`HTTP ${I.status}`)}return I.json()}complete(e,n){this.setState("complete");let h={sessionToken:e,sessionId:n};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(h),h}fail(e){this.setState("error");let n=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(n),n}setState(e){this.state=e,this.events.onStateChange?.(e)}};var ke=Fe(xe(),1),Ue=`
@import url('https://rsms.me/inter/inter.css');
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
}
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
    animation: page-enter 0.25s ease-out;
}
@keyframes page-enter {
    from { opacity: 0; }
    to   { opacity: 1; }
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
`,he='<svg viewBox="0 0 500 500"><style>.ld{fill:#fff}@media(prefers-color-scheme:dark){.ld{fill:#2a2a2a}}</style><defs><linearGradient id="pg" y2="1"><stop offset="21%" stop-color="#34E89E"/><stop offset="42%" stop-color="#12B06E"/></linearGradient><linearGradient id="pb" x1="1" y1="1" x2="0" y2="0"><stop offset="21%" stop-color="#00BCF2"/><stop offset="42%" stop-color="#00A0EB"/></linearGradient></defs><path d="M100 0H450L0 450V100A100 100 0 0 1 100 0Z" fill="url(#pg)"/><path d="M500 50V400A100 100 0 0 1 400 500H50L500 50Z" fill="url(#pb)"/><polygon class="ld" points="0,500 50,500 500,50 500,0"/></svg>',we='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="7.5" r="3"/><path d="M10.5 13c-3.3 0-6 2-6 4.5V19h12v-1.5c0-1-.4-2-1-2.7"/><line x1="18" y1="12" x2="18" y2="18"/><line x1="15" y1="15" x2="21" y2="15"/></svg>';var He='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',We='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',qe='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>',je='<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',Ke='<svg viewBox="0 0 24 24"><rect fill="#F25022" x="2" y="2" width="9.5" height="9.5"/><rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5"/><rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5"/><rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5"/></svg>',$e='<svg viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',Qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',ze='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';var Ve='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';function f(w,e,...n){let h=document.createElement(w);if(e!=null)for(let[y,d]of Object.entries(e))y==="className"?h.className=d:y.startsWith("on")&&typeof d=="function"?h.addEventListener(y.slice(2).toLowerCase(),d):y==="html"?h.innerHTML=d:d===!1||d==null||(d===!0?h.setAttribute(y,""):h.setAttribute(y,String(d)));for(let y of n.flat(1/0))y==null||y===!1||h.appendChild(typeof y=="string"?document.createTextNode(y):y);return h}function Je(w){try{let e=(0,ke.default)(0,"M");e.addData(w),e.make();let n=e.getModuleCount(),h=Math.max(3,Math.floor(200/n));return e.createSvgTag({cellSize:h,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${w}</div>`}}var ie=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,n)=>{this.resolve=e,this.reject=n,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.attributes=void 0,this.mount(),this.cfg.pushToken?this.startPush():this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=Ue,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let n=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,S=>S.toUpperCase()),h=this.state==="idle",y;switch(this.state){case"qr-scanning":y="Open Privasys Wallet on your phone and scan the QR code displayed on the right to authenticate.";break;case"push-waiting":y="Check your phone \u2014 tap the notification from Privasys ID to approve this sign-in.";break;case"wallet-connected":case"authenticating":y="Verifying your identity\u2026 This will only take a moment.";break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":y="Complete the biometric prompt on your device to verify your identity.";break;case"success":y="";break;case"error":y="Something went wrong. You can try again or choose a different method.";break;default:y=`<strong>${n}</strong> needs to verify your identity. Please choose one of the authentication options.`}let d;switch(this.state){case"push-waiting":d=this.renderPushWaiting();break;case"qr-scanning":d=this.renderQR();break;case"wallet-connected":case"authenticating":d=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":d=this.renderPasskeyProgress();break;case"success":d=this.renderSuccess();break;case"error":d=this.renderError();break;default:d=this.renderIdle()}let I=f("div",{className:"page"},f("button",{className:"btn-close",html:Qe,onClick:()=>this.handleCancel()}),f("div",{className:"brand-panel"},f("div",{className:"brand-panel-header"},f("div",{className:"brand-panel-logo",html:he}),f("div",{className:"brand-panel-name"},"Privasys")),y?f("p",{className:"brand-panel-desc",html:y}):null,this.isFlowState()?this.renderBrandProgress():null),f("div",{className:`auth-panel${h?"":" auth-panel--centered"}`},!h&&this.state!=="success"?f("button",{className:"btn-back",onClick:()=>this.goBack()},f("span",{html:Ve}),"Back"):null,this.isFlowState()?f("div",{className:"mobile-progress-header"},this.renderBrandProgress()):null,d),f("div",{className:"footer"},"By continuing, you agree to the ",f("a",{href:"https://privasys.org/legal/terms",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Terms of Service")," and ",f("a",{href:"https://privasys.org/legal/privacy",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Privacy Policy"),"."));this.shadow.appendChild(I)}goBack(){this.cleanup(),this.state="idle",this.errorMsg="",this.render()}renderIdle(){let e=Q.isSupported(),n=!!this.cfg.pushToken,h=this.cfg.socialProviders??[],y=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,F=>F.toUpperCase()),d=[];n&&d.push(f("button",{className:"btn-provider primary",onClick:()=>this.startPush()},f("span",{html:We}),f("span",{className:"btn-label"},"Sign in with Privasys ID"),f("span",{className:"btn-hint"},"Notification"))),d.push(f("button",{className:`btn-provider ${n?"":"primary"}`,onClick:()=>this.startWallet()},f("span",{html:he}),f("span",{className:"btn-label"},n?"Scan QR code instead":"Continue with Privasys ID"))),(e||h.length>0)&&d.push(f("div",{className:"divider"},f("span",null,"or"))),e&&d.push(f("button",{className:"btn-provider",onClick:()=>this.startPasskey("authenticate")},f("span",{html:we}),f("span",{className:"btn-label"},"Passkey"),f("span",{className:"btn-hint"},"Face ID, Touch ID, Windows Hello")));let S={github:qe,google:je,microsoft:Ke,linkedin:$e},M={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"};for(let F of h){let H=S[F]??"",G=M[F]??F;d.push(f("button",{className:"btn-provider",onClick:()=>this.startSocial(F)},H?f("span",{html:H}):null,f("span",{className:"btn-label"},G)))}return f("div",null,f("h2",{className:"auth-panel-heading"},`Sign in to ${y}`),...d)}renderQR(){let e=this.getRelayClient(),{payload:n}=e.createQR(this.sessionId);return f("div",null,f("div",{className:"qr-section"},f("div",{className:"qr-frame",html:Je(n)}),f("div",{className:"scan-label"},f("span",{className:"pulse"}),"Scan with Privasys Wallet")))}renderPushWaiting(){let e=Q.isSupported();return f("div",null,f("p",{className:"scan-hint",style:"margin-bottom: 20px; max-width: none; text-align: center;"},"Check your phone \u2014 tap the notification to approve this connection."),f("div",{className:"divider"},f("span",null,"or")),f("div",{className:"alt-actions"},f("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startWallet()}},f("span",{html:he}),f("span",{className:"btn-label"},"Scan QR code instead")),e?f("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startPasskey("authenticate")}},f("span",{html:we}),f("span",{className:"btn-label"},"Passkey")):null))}renderWalletProgress(){return f("div",null,f("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},"Verifying your identity\u2026 This will only take a moment."))}renderPasskeyProgress(){let n=this.state==="passkey-requesting"?"Preparing\u2026":"Complete the biometric prompt on your device.";return f("div",null,f("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},n))}isFlowState(){return["push-waiting","qr-scanning","wallet-connected","authenticating","passkey-requesting","passkey-ceremony","passkey-verifying","success"].includes(this.state)}renderBrandProgress(){let e=this.state==="success",n=this.method==="wallet"?"Privasys ID":"Passkey",h=this.method==="wallet"&&this.attestation?.valid,y=this.method==="passkey"?"This device":h?"Attestation verified":null,d;if(this.method==="passkey"){let I=this.state;d=f("div",{className:"steps"},f("div",{className:`step ${I!=="passkey-requesting"?"done":"active"}`},f("span",{className:"step-icon"},I!=="passkey-requesting"?"\u2713":"\u2022"),"Options received from enclave"),f("div",{className:`step ${I==="passkey-ceremony"?"active":I==="passkey-verifying"||e?"done":""}`},f("span",{className:"step-icon"},I==="passkey-verifying"||e?"\u2713":"\u2022"),"Biometric prompt completed"),f("div",{className:`step ${I==="passkey-verifying"?"active":e?"done":""}`},f("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Enclave verification"),f("div",{className:`step ${e?"done":""}`},f("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}else{let I=!!this.cfg.pushToken,S=["wallet-connected","authenticating","success"].includes(this.state),M=this.state==="authenticating"||e,F=I?["push-waiting","wallet-connected","authenticating","success"].includes(this.state):S||M,H=!F&&this.state==="qr-scanning",G=I?"Notification sent":"QR code scanned",se=I?"Approved on Privasys ID":"Server attestation verified",X=I&&this.state==="push-waiting"||S&&!M;d=f("div",{className:"steps"},f("div",{className:`step ${F?"done":H?"active":""}`},f("span",{className:"step-icon"},F?"\u2713":"\u2022"),G),f("div",{className:`step ${X?"active":M?"done":""}`},f("span",{className:"step-icon"},M?"\u2713":"\u2022"),se),f("div",{className:`step ${this.state==="authenticating"?"active":e?"done":""}`},f("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Biometric authentication"),f("div",{className:`step ${e?"done":""}`},f("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}return f("div",{className:"brand-progress"},d,e?f("div",{className:"step done",style:"margin-top: 2px;"},f("span",{className:"step-icon"},"\u2713"),`Authenticated via ${n}`):null)}renderSuccess(){let e=!!this.pushToken&&!this.cfg.deviceTrusted,n=this.method==="wallet"?"Privasys ID":"Passkey",h=this.method==="wallet"&&this.attestation?.valid,y=this.method==="passkey"?"This device":h?"Attestation verified":null;return f("div",null,e?f("div",{style:"width: 100%;"},f("p",{style:"font-size: 14px; font-weight: 500; margin-bottom: 6px;"},"Trust this device?"),f("p",{className:"scan-hint",style:"margin-bottom: 16px; max-width: none;"},"Next time, we\u2019ll send a notification to your phone instead of showing a QR code."),f("button",{className:"btn-provider primary",onClick:()=>this.finishWithTrust(!0)},f("span",{html:ze}),f("span",{className:"btn-label"},"Trust this device")),f("button",{className:"link-btn",style:"margin-top: 12px; font-size: 13px; display: block; text-align: center; width: 100%;",onClick:()=>this.finishWithTrust(!1)},"Not now")):f("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return f("div",null,f("div",{className:"error-icon",html:He}),f("div",{className:"error-title"},"Authentication failed"),f("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),f("button",{className:"btn-retry",onClick:()=>{this.errorMsg="",this.state="idle",this.render()}},"Try again"))}startPush(){this.method="wallet";let e=this.getRelayClient();this.state="push-waiting",this.render(),e.notifyAndWait(this.cfg.pushToken).then(n=>{this.sessionToken=n.sessionToken,this.attestation=n.attestation,this.sessionId=n.sessionId,this.pushToken=n.pushToken,this.attributes=n.attributes,this.complete()},n=>{this.state="error",this.errorMsg=n?.message??"Push authentication failed",this.render()})}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:n}=e.createQR(this.cfg.sessionId);this.sessionId=n,this.state="qr-scanning",this.render(),e.waitForResult(n).then(h=>{this.sessionToken=h.sessionToken,this.attestation=h.attestation,this.sessionId=h.sessionId,this.pushToken=h.pushToken,this.attributes=h.attributes,this.complete()},h=>{this.state="error",this.errorMsg=h?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let n=this.getWebAuthnClient();try{let h;if(e==="register")h=await n.register(globalThis.location?.hostname??"user");else try{h=await n.authenticate()}catch(y){if(y?.message?.includes("no credentials")||y?.message?.includes("not found"))this.state="passkey-requesting",this.render(),h=await n.register(globalThis.location?.hostname??"user");else throw y}this.sessionToken=h.sessionToken,this.sessionId=h.sessionId,this.complete()}catch(h){this.state="error",this.errorMsg=h?.message??"Passkey authentication failed",this.render()}}async startSocial(e){if(this.cfg.onSocialAuth){this.state="authenticating",this.render();try{await this.cfg.onSocialAuth(e),this.method="wallet",this.sessionToken="",this.sessionId=this.cfg.sessionId??"",this.complete()}catch(n){this.state="error",this.errorMsg=n?.message??`${e} authentication failed`,this.render()}}}complete(){this.state="success",this.render(),(!this.pushToken||this.cfg.deviceTrusted)&&setTimeout(()=>this.finishWithTrust(!1),1200)}finishWithTrust(e){let n={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId,pushToken:this.pushToken,attributes:this.attributes,trustDevice:e};this.close(),this.resolve?.(n),this.resolve=null,this.reject=null}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new J({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout,requestedAttributes:this.cfg.requestedAttributes,appName:this.cfg.appName,privacyPolicyUrl:this.cfg.privacyPolicyUrl},{onStateChange:e=>{let n={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};if(n[e]){if(this.state==="push-waiting"&&e==="waiting-for-scan")return;this.state=n[e],this.render()}}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new Q({apiBase:this.cfg.apiBase,appName:this.cfg.appName,sessionId:this.cfg.sessionId,fido2Base:this.cfg.fido2Base},{onStateChange:e=>{let n={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};n[e]&&(this.state=n[e],this.render())}})),this.webauthnClient}};return Le(Ge);})();
//# sourceMappingURL=privasys-auth.iife.js.map
