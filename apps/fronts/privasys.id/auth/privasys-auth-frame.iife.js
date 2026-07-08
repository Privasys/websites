"use strict";(()=>{var jt=Object.create;var rt=Object.defineProperty;var Kt=Object.getOwnPropertyDescriptor;var Wt=Object.getOwnPropertyNames;var Vt=Object.getPrototypeOf,Gt=Object.prototype.hasOwnProperty;var zt=(r,e)=>()=>(e||r((e={exports:{}}).exports,e),e.exports);var Qt=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Wt(e))!Gt.call(r,s)&&s!==t&&rt(r,s,{get:()=>e[s],enumerable:!(n=Kt(e,s))||n.enumerable});return r};var Jt=(r,e,t)=>(t=r!=null?jt(Vt(r)):{},Qt(e||!r||!r.__esModule?rt(t,"default",{value:r,enumerable:!0}):t,r));var wt=zt((mt,xt)=>{var vt=(function(){var r=function(S,C){var w=236,k=17,u=S,m=t[C],c=null,o=0,A=null,f=[],b={},B=function(h,g){o=u*4+17,c=(function(d){for(var y=new Array(d),v=0;v<d;v+=1){y[v]=new Array(d);for(var T=0;T<d;T+=1)y[v][T]=null}return y})(o),R(0,0),R(o-7,0),R(0,o-7),K(),F(),Y(h,g),u>=7&&G(h),A==null&&(A=pe(u,m,f)),X(A,g)},R=function(h,g){for(var d=-1;d<=7;d+=1)if(!(h+d<=-1||o<=h+d))for(var y=-1;y<=7;y+=1)g+y<=-1||o<=g+y||(0<=d&&d<=6&&(y==0||y==6)||0<=y&&y<=6&&(d==0||d==6)||2<=d&&d<=4&&2<=y&&y<=4?c[h+d][g+y]=!0:c[h+d][g+y]=!1)},D=function(){for(var h=0,g=0,d=0;d<8;d+=1){B(!0,d);var y=s.getLostPoint(b);(d==0||h>y)&&(h=y,g=d)}return g},F=function(){for(var h=8;h<o-8;h+=1)c[h][6]==null&&(c[h][6]=h%2==0);for(var g=8;g<o-8;g+=1)c[6][g]==null&&(c[6][g]=g%2==0)},K=function(){for(var h=s.getPatternPosition(u),g=0;g<h.length;g+=1)for(var d=0;d<h.length;d+=1){var y=h[g],v=h[d];if(c[y][v]==null)for(var T=-2;T<=2;T+=1)for(var U=-2;U<=2;U+=1)T==-2||T==2||U==-2||U==2||T==0&&U==0?c[y+T][v+U]=!0:c[y+T][v+U]=!1}},G=function(h){for(var g=s.getBCHTypeNumber(u),d=0;d<18;d+=1){var y=!h&&(g>>d&1)==1;c[Math.floor(d/3)][d%3+o-8-3]=y}for(var d=0;d<18;d+=1){var y=!h&&(g>>d&1)==1;c[d%3+o-8-3][Math.floor(d/3)]=y}},Y=function(h,g){for(var d=m<<3|g,y=s.getBCHTypeInfo(d),v=0;v<15;v+=1){var T=!h&&(y>>v&1)==1;v<6?c[v][8]=T:v<8?c[v+1][8]=T:c[o-15+v][8]=T}for(var v=0;v<15;v+=1){var T=!h&&(y>>v&1)==1;v<8?c[8][o-v-1]=T:v<9?c[8][15-v-1+1]=T:c[8][15-v-1]=T}c[o-8][8]=!h},X=function(h,g){for(var d=-1,y=o-1,v=7,T=0,U=s.getMaskFunction(g),_=o-1;_>0;_-=2)for(_==6&&(_-=1);;){for(var O=0;O<2;O+=1)if(c[y][_-O]==null){var j=!1;T<h.length&&(j=(h[T]>>>v&1)==1);var N=U(y,_-O);N&&(j=!j),c[y][_-O]=j,v-=1,v==-1&&(T+=1,v=7)}if(y+=d,y<0||o<=y){y-=d,d=-d;break}}},z=function(h,g){for(var d=0,y=0,v=0,T=new Array(g.length),U=new Array(g.length),_=0;_<g.length;_+=1){var O=g[_].dataCount,j=g[_].totalCount-O;y=Math.max(y,O),v=Math.max(v,j),T[_]=new Array(O);for(var N=0;N<T[_].length;N+=1)T[_][N]=255&h.getBuffer()[N+d];d+=O;var Q=s.getErrorCorrectPolynomial(j),J=a(T[_],Q.getLength()-1),Ze=J.mod(Q);U[_]=new Array(Q.getLength()-1);for(var N=0;N<U[_].length;N+=1){var et=N+Ze.getLength()-U[_].length;U[_][N]=et>=0?Ze.getAt(et):0}}for(var tt=0,N=0;N<g.length;N+=1)tt+=g[N].totalCount;for(var Ne=new Array(tt),me=0,N=0;N<y;N+=1)for(var _=0;_<g.length;_+=1)N<T[_].length&&(Ne[me]=T[_][N],me+=1);for(var N=0;N<v;N+=1)for(var _=0;_<g.length;_+=1)N<U[_].length&&(Ne[me]=U[_][N],me+=1);return Ne},pe=function(h,g,d){for(var y=l.getRSBlocks(h,g),v=p(),T=0;T<d.length;T+=1){var U=d[T];v.put(U.getMode(),4),v.put(U.getLength(),s.getLengthInBits(U.getMode(),h)),U.write(v)}for(var _=0,T=0;T<y.length;T+=1)_+=y[T].dataCount;if(v.getLengthInBits()>_*8)throw"code length overflow. ("+v.getLengthInBits()+">"+_*8+")";for(v.getLengthInBits()+4<=_*8&&v.put(0,4);v.getLengthInBits()%8!=0;)v.putBit(!1);for(;!(v.getLengthInBits()>=_*8||(v.put(w,8),v.getLengthInBits()>=_*8));)v.put(k,8);return z(v,y)};b.addData=function(h,g){g=g||"Byte";var d=null;switch(g){case"Numeric":d=x(h);break;case"Alphanumeric":d=P(h);break;case"Byte":d=I(h);break;case"Kanji":d=H(h);break;default:throw"mode:"+g}f.push(d),A=null},b.isDark=function(h,g){if(h<0||o<=h||g<0||o<=g)throw h+","+g;return c[h][g]},b.getModuleCount=function(){return o},b.make=function(){if(u<1){for(var h=1;h<40;h++){for(var g=l.getRSBlocks(h,m),d=p(),y=0;y<f.length;y++){var v=f[y];d.put(v.getMode(),4),d.put(v.getLength(),s.getLengthInBits(v.getMode(),h)),v.write(d)}for(var T=0,y=0;y<g.length;y++)T+=g[y].dataCount;if(d.getLengthInBits()<=T*8)break}u=h}B(!1,D())},b.createTableTag=function(h,g){h=h||2,g=typeof g>"u"?h*4:g;var d="";d+='<table style="',d+=" border-width: 0px; border-style: none;",d+=" border-collapse: collapse;",d+=" padding: 0px; margin: "+g+"px;",d+='">',d+="<tbody>";for(var y=0;y<b.getModuleCount();y+=1){d+="<tr>";for(var v=0;v<b.getModuleCount();v+=1)d+='<td style="',d+=" border-width: 0px; border-style: none;",d+=" border-collapse: collapse;",d+=" padding: 0px; margin: 0px;",d+=" width: "+h+"px;",d+=" height: "+h+"px;",d+=" background-color: ",d+=b.isDark(y,v)?"#000000":"#ffffff",d+=";",d+='"/>';d+="</tr>"}return d+="</tbody>",d+="</table>",d},b.createSvgTag=function(h,g,d,y){var v={};typeof arguments[0]=="object"&&(v=arguments[0],h=v.cellSize,g=v.margin,d=v.alt,y=v.title),h=h||2,g=typeof g>"u"?h*4:g,d=typeof d=="string"?{text:d}:d||{},d.text=d.text||null,d.id=d.text?d.id||"qrcode-description":null,y=typeof y=="string"?{text:y}:y||{},y.text=y.text||null,y.id=y.text?y.id||"qrcode-title":null;var T=b.getModuleCount()*h+g*2,U,_,O,j,N="",Q;for(Q="l"+h+",0 0,"+h+" -"+h+",0 0,-"+h+"z ",N+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',N+=v.scalable?"":' width="'+T+'px" height="'+T+'px"',N+=' viewBox="0 0 '+T+" "+T+'" ',N+=' preserveAspectRatio="xMinYMin meet"',N+=y.text||d.text?' role="img" aria-labelledby="'+re([y.id,d.id].join(" ").trim())+'"':"",N+=">",N+=y.text?'<title id="'+re(y.id)+'">'+re(y.text)+"</title>":"",N+=d.text?'<description id="'+re(d.id)+'">'+re(d.text)+"</description>":"",N+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',N+='<path d="',O=0;O<b.getModuleCount();O+=1)for(j=O*h+g,U=0;U<b.getModuleCount();U+=1)b.isDark(O,U)&&(_=U*h+g,N+="M"+_+","+j+Q);return N+='" stroke="transparent" fill="black"/>',N+="</svg>",N},b.createDataURL=function(h,g){h=h||2,g=typeof g>"u"?h*4:g;var d=b.getModuleCount()*h+g*2,y=g,v=d-g;return W(d,d,function(T,U){if(y<=T&&T<v&&y<=U&&U<v){var _=Math.floor((T-y)/h),O=Math.floor((U-y)/h);return b.isDark(O,_)?0:1}else return 1})},b.createImgTag=function(h,g,d){h=h||2,g=typeof g>"u"?h*4:g;var y=b.getModuleCount()*h+g*2,v="";return v+="<img",v+=' src="',v+=b.createDataURL(h,g),v+='"',v+=' width="',v+=y,v+='"',v+=' height="',v+=y,v+='"',d&&(v+=' alt="',v+=re(d),v+='"'),v+="/>",v};var re=function(h){for(var g="",d=0;d<h.length;d+=1){var y=h.charAt(d);switch(y){case"<":g+="&lt;";break;case">":g+="&gt;";break;case"&":g+="&amp;";break;case'"':g+="&quot;";break;default:g+=y;break}}return g},Ue=function(h){var g=1;h=typeof h>"u"?g*2:h;var d=b.getModuleCount()*g+h*2,y=h,v=d-h,T,U,_,O,j,N={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},Q={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},J="";for(T=0;T<d;T+=2){for(_=Math.floor((T-y)/g),O=Math.floor((T+1-y)/g),U=0;U<d;U+=1)j="\u2588",y<=U&&U<v&&y<=T&&T<v&&b.isDark(_,Math.floor((U-y)/g))&&(j=" "),y<=U&&U<v&&y<=T+1&&T+1<v&&b.isDark(O,Math.floor((U-y)/g))?j+=" ":j+="\u2588",J+=h<1&&T+1>=v?Q[j]:N[j];J+=`
`}return d%2&&h>0?J.substring(0,J.length-d-1)+Array(d+1).join("\u2580"):J.substring(0,J.length-1)};return b.createASCII=function(h,g){if(h=h||1,h<2)return Ue(g);h-=1,g=typeof g>"u"?h*2:g;var d=b.getModuleCount()*h+g*2,y=g,v=d-g,T,U,_,O,j=Array(h+1).join("\u2588\u2588"),N=Array(h+1).join("  "),Q="",J="";for(T=0;T<d;T+=1){for(_=Math.floor((T-y)/h),J="",U=0;U<d;U+=1)O=1,y<=U&&U<v&&y<=T&&T<v&&b.isDark(_,Math.floor((U-y)/h))&&(O=0),J+=O?j:N;for(_=0;_<h;_+=1)Q+=J+`
`}return Q.substring(0,Q.length-1)},b.renderTo2dContext=function(h,g){g=g||2;for(var d=b.getModuleCount(),y=0;y<d;y++)for(var v=0;v<d;v++)h.fillStyle=b.isDark(y,v)?"black":"white",h.fillRect(y*g,v*g,g,g)},b};r.stringToBytesFuncs={default:function(S){for(var C=[],w=0;w<S.length;w+=1){var k=S.charCodeAt(w);C.push(k&255)}return C}},r.stringToBytes=r.stringToBytesFuncs.default,r.createStringToBytes=function(S,C){var w=(function(){for(var u=M(S),m=function(){var F=u.read();if(F==-1)throw"eof";return F},c=0,o={};;){var A=u.read();if(A==-1)break;var f=m(),b=m(),B=m(),R=String.fromCharCode(A<<8|f),D=b<<8|B;o[R]=D,c+=1}if(c!=C)throw c+" != "+C;return o})(),k=63;return function(u){for(var m=[],c=0;c<u.length;c+=1){var o=u.charCodeAt(c);if(o<128)m.push(o);else{var A=w[u.charAt(c)];typeof A=="number"?(A&255)==A?m.push(A):(m.push(A>>>8),m.push(A&255)):m.push(k)}}return m}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},t={L:1,M:0,Q:3,H:2},n={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},s=(function(){var S=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],C=1335,w=7973,k=21522,u={},m=function(c){for(var o=0;c!=0;)o+=1,c>>>=1;return o};return u.getBCHTypeInfo=function(c){for(var o=c<<10;m(o)-m(C)>=0;)o^=C<<m(o)-m(C);return(c<<10|o)^k},u.getBCHTypeNumber=function(c){for(var o=c<<12;m(o)-m(w)>=0;)o^=w<<m(o)-m(w);return c<<12|o},u.getPatternPosition=function(c){return S[c-1]},u.getMaskFunction=function(c){switch(c){case n.PATTERN000:return function(o,A){return(o+A)%2==0};case n.PATTERN001:return function(o,A){return o%2==0};case n.PATTERN010:return function(o,A){return A%3==0};case n.PATTERN011:return function(o,A){return(o+A)%3==0};case n.PATTERN100:return function(o,A){return(Math.floor(o/2)+Math.floor(A/3))%2==0};case n.PATTERN101:return function(o,A){return o*A%2+o*A%3==0};case n.PATTERN110:return function(o,A){return(o*A%2+o*A%3)%2==0};case n.PATTERN111:return function(o,A){return(o*A%3+(o+A)%2)%2==0};default:throw"bad maskPattern:"+c}},u.getErrorCorrectPolynomial=function(c){for(var o=a([1],0),A=0;A<c;A+=1)o=o.multiply(a([1,i.gexp(A)],0));return o},u.getLengthInBits=function(c,o){if(1<=o&&o<10)switch(c){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+c}else if(o<27)switch(c){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+c}else if(o<41)switch(c){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+c}else throw"type:"+o},u.getLostPoint=function(c){for(var o=c.getModuleCount(),A=0,f=0;f<o;f+=1)for(var b=0;b<o;b+=1){for(var B=0,R=c.isDark(f,b),D=-1;D<=1;D+=1)if(!(f+D<0||o<=f+D))for(var F=-1;F<=1;F+=1)b+F<0||o<=b+F||D==0&&F==0||R==c.isDark(f+D,b+F)&&(B+=1);B>5&&(A+=3+B-5)}for(var f=0;f<o-1;f+=1)for(var b=0;b<o-1;b+=1){var K=0;c.isDark(f,b)&&(K+=1),c.isDark(f+1,b)&&(K+=1),c.isDark(f,b+1)&&(K+=1),c.isDark(f+1,b+1)&&(K+=1),(K==0||K==4)&&(A+=3)}for(var f=0;f<o;f+=1)for(var b=0;b<o-6;b+=1)c.isDark(f,b)&&!c.isDark(f,b+1)&&c.isDark(f,b+2)&&c.isDark(f,b+3)&&c.isDark(f,b+4)&&!c.isDark(f,b+5)&&c.isDark(f,b+6)&&(A+=40);for(var b=0;b<o;b+=1)for(var f=0;f<o-6;f+=1)c.isDark(f,b)&&!c.isDark(f+1,b)&&c.isDark(f+2,b)&&c.isDark(f+3,b)&&c.isDark(f+4,b)&&!c.isDark(f+5,b)&&c.isDark(f+6,b)&&(A+=40);for(var G=0,b=0;b<o;b+=1)for(var f=0;f<o;f+=1)c.isDark(f,b)&&(G+=1);var Y=Math.abs(100*G/o/o-50)/5;return A+=Y*10,A},u})(),i=(function(){for(var S=new Array(256),C=new Array(256),w=0;w<8;w+=1)S[w]=1<<w;for(var w=8;w<256;w+=1)S[w]=S[w-4]^S[w-5]^S[w-6]^S[w-8];for(var w=0;w<255;w+=1)C[S[w]]=w;var k={};return k.glog=function(u){if(u<1)throw"glog("+u+")";return C[u]},k.gexp=function(u){for(;u<0;)u+=255;for(;u>=256;)u-=255;return S[u]},k})();function a(S,C){if(typeof S.length>"u")throw S.length+"/"+C;var w=(function(){for(var u=0;u<S.length&&S[u]==0;)u+=1;for(var m=new Array(S.length-u+C),c=0;c<S.length-u;c+=1)m[c]=S[c+u];return m})(),k={};return k.getAt=function(u){return w[u]},k.getLength=function(){return w.length},k.multiply=function(u){for(var m=new Array(k.getLength()+u.getLength()-1),c=0;c<k.getLength();c+=1)for(var o=0;o<u.getLength();o+=1)m[c+o]^=i.gexp(i.glog(k.getAt(c))+i.glog(u.getAt(o)));return a(m,0)},k.mod=function(u){if(k.getLength()-u.getLength()<0)return k;for(var m=i.glog(k.getAt(0))-i.glog(u.getAt(0)),c=new Array(k.getLength()),o=0;o<k.getLength();o+=1)c[o]=k.getAt(o);for(var o=0;o<u.getLength();o+=1)c[o]^=i.gexp(i.glog(u.getAt(o))+m);return a(c,0).mod(u)},k}var l=(function(){var S=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],C=function(u,m){var c={};return c.totalCount=u,c.dataCount=m,c},w={},k=function(u,m){switch(m){case t.L:return S[(u-1)*4+0];case t.M:return S[(u-1)*4+1];case t.Q:return S[(u-1)*4+2];case t.H:return S[(u-1)*4+3];default:return}};return w.getRSBlocks=function(u,m){var c=k(u,m);if(typeof c>"u")throw"bad rs block @ typeNumber:"+u+"/errorCorrectionLevel:"+m;for(var o=c.length/3,A=[],f=0;f<o;f+=1)for(var b=c[f*3+0],B=c[f*3+1],R=c[f*3+2],D=0;D<b;D+=1)A.push(C(B,R));return A},w})(),p=function(){var S=[],C=0,w={};return w.getBuffer=function(){return S},w.getAt=function(k){var u=Math.floor(k/8);return(S[u]>>>7-k%8&1)==1},w.put=function(k,u){for(var m=0;m<u;m+=1)w.putBit((k>>>u-m-1&1)==1)},w.getLengthInBits=function(){return C},w.putBit=function(k){var u=Math.floor(C/8);S.length<=u&&S.push(0),k&&(S[u]|=128>>>C%8),C+=1},w},x=function(S){var C=e.MODE_NUMBER,w=S,k={};k.getMode=function(){return C},k.getLength=function(c){return w.length},k.write=function(c){for(var o=w,A=0;A+2<o.length;)c.put(u(o.substring(A,A+3)),10),A+=3;A<o.length&&(o.length-A==1?c.put(u(o.substring(A,A+1)),4):o.length-A==2&&c.put(u(o.substring(A,A+2)),7))};var u=function(c){for(var o=0,A=0;A<c.length;A+=1)o=o*10+m(c.charAt(A));return o},m=function(c){if("0"<=c&&c<="9")return c.charCodeAt(0)-48;throw"illegal char :"+c};return k},P=function(S){var C=e.MODE_ALPHA_NUM,w=S,k={};k.getMode=function(){return C},k.getLength=function(m){return w.length},k.write=function(m){for(var c=w,o=0;o+1<c.length;)m.put(u(c.charAt(o))*45+u(c.charAt(o+1)),11),o+=2;o<c.length&&m.put(u(c.charAt(o)),6)};var u=function(m){if("0"<=m&&m<="9")return m.charCodeAt(0)-48;if("A"<=m&&m<="Z")return m.charCodeAt(0)-65+10;switch(m){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+m}};return k},I=function(S){var C=e.MODE_8BIT_BYTE,w=S,k=r.stringToBytes(S),u={};return u.getMode=function(){return C},u.getLength=function(m){return k.length},u.write=function(m){for(var c=0;c<k.length;c+=1)m.put(k[c],8)},u},H=function(S){var C=e.MODE_KANJI,w=S,k=r.stringToBytesFuncs.SJIS;if(!k)throw"sjis not supported.";(function(c,o){var A=k(c);if(A.length!=2||(A[0]<<8|A[1])!=o)throw"sjis not supported."})("\u53CB",38726);var u=k(S),m={};return m.getMode=function(){return C},m.getLength=function(c){return~~(u.length/2)},m.write=function(c){for(var o=u,A=0;A+1<o.length;){var f=(255&o[A])<<8|255&o[A+1];if(33088<=f&&f<=40956)f-=33088;else if(57408<=f&&f<=60351)f-=49472;else throw"illegal char at "+(A+1)+"/"+f;f=(f>>>8&255)*192+(f&255),c.put(f,13),A+=2}if(A<o.length)throw"illegal char at "+(A+1)},m},L=function(){var S=[],C={};return C.writeByte=function(w){S.push(w&255)},C.writeShort=function(w){C.writeByte(w),C.writeByte(w>>>8)},C.writeBytes=function(w,k,u){k=k||0,u=u||w.length;for(var m=0;m<u;m+=1)C.writeByte(w[m+k])},C.writeString=function(w){for(var k=0;k<w.length;k+=1)C.writeByte(w.charCodeAt(k))},C.toByteArray=function(){return S},C.toString=function(){var w="";w+="[";for(var k=0;k<S.length;k+=1)k>0&&(w+=","),w+=S[k];return w+="]",w},C},q=function(){var S=0,C=0,w=0,k="",u={},m=function(o){k+=String.fromCharCode(c(o&63))},c=function(o){if(!(o<0)){if(o<26)return 65+o;if(o<52)return 97+(o-26);if(o<62)return 48+(o-52);if(o==62)return 43;if(o==63)return 47}throw"n:"+o};return u.writeByte=function(o){for(S=S<<8|o&255,C+=8,w+=1;C>=6;)m(S>>>C-6),C-=6},u.flush=function(){if(C>0&&(m(S<<6-C),S=0,C=0),w%3!=0)for(var o=3-w%3,A=0;A<o;A+=1)k+="="},u.toString=function(){return k},u},M=function(S){var C=S,w=0,k=0,u=0,m={};m.read=function(){for(;u<8;){if(w>=C.length){if(u==0)return-1;throw"unexpected end of file./"+u}var o=C.charAt(w);if(w+=1,o=="=")return u=0,-1;if(o.match(/^\s$/))continue;k=k<<6|c(o.charCodeAt(0)),u+=6}var A=k>>>u-8&255;return u-=8,A};var c=function(o){if(65<=o&&o<=90)return o-65;if(97<=o&&o<=122)return o-97+26;if(48<=o&&o<=57)return o-48+52;if(o==43)return 62;if(o==47)return 63;throw"c:"+o};return m},V=function(S,C){var w=S,k=C,u=new Array(S*C),m={};m.setPixel=function(f,b,B){u[b*w+f]=B},m.write=function(f){f.writeString("GIF87a"),f.writeShort(w),f.writeShort(k),f.writeByte(128),f.writeByte(0),f.writeByte(0),f.writeByte(0),f.writeByte(0),f.writeByte(0),f.writeByte(255),f.writeByte(255),f.writeByte(255),f.writeString(","),f.writeShort(0),f.writeShort(0),f.writeShort(w),f.writeShort(k),f.writeByte(0);var b=2,B=o(b);f.writeByte(b);for(var R=0;B.length-R>255;)f.writeByte(255),f.writeBytes(B,R,255),R+=255;f.writeByte(B.length-R),f.writeBytes(B,R,B.length-R),f.writeByte(0),f.writeString(";")};var c=function(f){var b=f,B=0,R=0,D={};return D.write=function(F,K){if(F>>>K)throw"length over";for(;B+K>=8;)b.writeByte(255&(F<<B|R)),K-=8-B,F>>>=8-B,R=0,B=0;R=F<<B|R,B=B+K},D.flush=function(){B>0&&b.writeByte(R)},D},o=function(f){for(var b=1<<f,B=(1<<f)+1,R=f+1,D=A(),F=0;F<b;F+=1)D.add(String.fromCharCode(F));D.add(String.fromCharCode(b)),D.add(String.fromCharCode(B));var K=L(),G=c(K);G.write(b,R);var Y=0,X=String.fromCharCode(u[Y]);for(Y+=1;Y<u.length;){var z=String.fromCharCode(u[Y]);Y+=1,D.contains(X+z)?X=X+z:(G.write(D.indexOf(X),R),D.size()<4095&&(D.size()==1<<R&&(R+=1),D.add(X+z)),X=z)}return G.write(D.indexOf(X),R),G.write(B,R),G.flush(),K.toByteArray()},A=function(){var f={},b=0,B={};return B.add=function(R){if(B.contains(R))throw"dup key:"+R;f[R]=b,b+=1},B.size=function(){return b},B.indexOf=function(R){return f[R]},B.contains=function(R){return typeof f[R]<"u"},B};return m},W=function(S,C,w){for(var k=V(S,C),u=0;u<C;u+=1)for(var m=0;m<S;m+=1)k.setPixel(m,u,w(m,u));var c=L();k.write(c);for(var o=q(),A=c.toByteArray(),f=0;f<A.length;f+=1)o.writeByte(A[f]);return o.flush(),"data:image/gif;base64,"+o};return r})();(function(){vt.stringToBytesFuncs["UTF-8"]=function(r){function e(t){for(var n=[],s=0;s<t.length;s++){var i=t.charCodeAt(s);i<128?n.push(i):i<2048?n.push(192|i>>6,128|i&63):i<55296||i>=57344?n.push(224|i>>12,128|i>>6&63,128|i&63):(s++,i=65536+((i&1023)<<10|t.charCodeAt(s)&1023),n.push(240|i>>18,128|i>>12&63,128|i>>6&63,128|i&63))}return n}return e(r)}})();(function(r){typeof define=="function"&&define.amd?define([],r):typeof mt=="object"&&(xt.exports=r())})(function(){return vt})});function Yt(r){return r instanceof Uint8Array||ArrayBuffer.isView(r)&&r.constructor.name==="Uint8Array"}function we(r,...e){if(!Yt(r))throw new Error("Uint8Array expected");if(e.length>0&&!e.includes(r.length))throw new Error("Uint8Array expected of length "+e+", got length="+r.length)}function He(r,e=!0){if(r.destroyed)throw new Error("Hash instance has been destroyed");if(e&&r.finished)throw new Error("Hash#digest() has already been called")}function nt(r,e){we(r);let t=e.outputLen;if(r.length<t)throw new Error("digestInto() expects output buffer of length at least "+t)}function fe(...r){for(let e=0;e<r.length;e++)r[e].fill(0)}function ke(r){return new DataView(r.buffer,r.byteOffset,r.byteLength)}function Z(r,e){return r<<32-e|r>>>e}function Xt(r){if(typeof r!="string")throw new Error("string expected");return new Uint8Array(new TextEncoder().encode(r))}function Me(r){return typeof r=="string"&&(r=Xt(r)),we(r),r}var xe=class{};function st(r){let e=n=>r().update(Me(n)).digest(),t=r();return e.outputLen=t.outputLen,e.blockLen=t.blockLen,e.create=()=>r(),e}function Zt(r,e,t,n){if(typeof r.setBigUint64=="function")return r.setBigUint64(e,t,n);let s=BigInt(32),i=BigInt(4294967295),a=Number(t>>s&i),l=Number(t&i),p=n?4:0,x=n?0:4;r.setUint32(e+p,a,n),r.setUint32(e+x,l,n)}function it(r,e,t){return r&e^~r&t}function ot(r,e,t){return r&e^r&t^e&t}var Ae=class extends xe{constructor(e,t,n,s){super(),this.finished=!1,this.length=0,this.pos=0,this.destroyed=!1,this.blockLen=e,this.outputLen=t,this.padOffset=n,this.isLE=s,this.buffer=new Uint8Array(e),this.view=ke(this.buffer)}update(e){He(this),e=Me(e),we(e);let{view:t,buffer:n,blockLen:s}=this,i=e.length;for(let a=0;a<i;){let l=Math.min(s-this.pos,i-a);if(l===s){let p=ke(e);for(;s<=i-a;a+=s)this.process(p,a);continue}n.set(e.subarray(a,a+l),this.pos),this.pos+=l,a+=l,this.pos===s&&(this.process(t,0),this.pos=0)}return this.length+=e.length,this.roundClean(),this}digestInto(e){He(this),nt(e,this),this.finished=!0;let{buffer:t,view:n,blockLen:s,isLE:i}=this,{pos:a}=this;t[a++]=128,fe(this.buffer.subarray(a)),this.padOffset>s-a&&(this.process(n,0),a=0);for(let I=a;I<s;I++)t[I]=0;Zt(n,s-8,BigInt(this.length*8),i),this.process(n,0);let l=ke(e),p=this.outputLen;if(p%4)throw new Error("_sha2: outputLen should be aligned to 32bit");let x=p/4,P=this.get();if(x>P.length)throw new Error("_sha2: outputLen bigger than state");for(let I=0;I<x;I++)l.setUint32(4*I,P[I],i)}digest(){let{buffer:e,outputLen:t}=this;this.digestInto(e);let n=e.slice(0,t);return this.destroy(),n}_cloneInto(e){e||(e=new this.constructor),e.set(...this.get());let{blockLen:t,buffer:n,length:s,finished:i,destroyed:a,pos:l}=this;return e.destroyed=a,e.finished=i,e.length=s,e.pos=l,s%t&&e.buffer.set(n),e}clone(){return this._cloneInto()}},ne=Uint32Array.from([1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225]);var er=Uint32Array.from([1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298]),oe=new Uint32Array(64),De=class extends Ae{constructor(e=32){super(64,e,8,!1),this.A=ne[0]|0,this.B=ne[1]|0,this.C=ne[2]|0,this.D=ne[3]|0,this.E=ne[4]|0,this.F=ne[5]|0,this.G=ne[6]|0,this.H=ne[7]|0}get(){let{A:e,B:t,C:n,D:s,E:i,F:a,G:l,H:p}=this;return[e,t,n,s,i,a,l,p]}set(e,t,n,s,i,a,l,p){this.A=e|0,this.B=t|0,this.C=n|0,this.D=s|0,this.E=i|0,this.F=a|0,this.G=l|0,this.H=p|0}process(e,t){for(let I=0;I<16;I++,t+=4)oe[I]=e.getUint32(t,!1);for(let I=16;I<64;I++){let H=oe[I-15],L=oe[I-2],q=Z(H,7)^Z(H,18)^H>>>3,M=Z(L,17)^Z(L,19)^L>>>10;oe[I]=M+oe[I-7]+q+oe[I-16]|0}let{A:n,B:s,C:i,D:a,E:l,F:p,G:x,H:P}=this;for(let I=0;I<64;I++){let H=Z(l,6)^Z(l,11)^Z(l,25),L=P+H+it(l,p,x)+er[I]+oe[I]|0,M=(Z(n,2)^Z(n,13)^Z(n,22))+ot(n,s,i)|0;P=x,x=p,p=l,l=a+L|0,a=i,i=s,s=n,n=L+M|0}n=n+this.A|0,s=s+this.B|0,i=i+this.C|0,a=a+this.D|0,l=l+this.E|0,p=p+this.F|0,x=x+this.G|0,P=P+this.H|0,this.set(n,s,i,a,l,p,x,P)}roundClean(){fe(oe)}destroy(){this.set(0,0,0,0,0,0,0,0),fe(this.buffer)}};var at=st(()=>new De);function Le(){let r=new Uint8Array(32);return crypto.getRandomValues(r),Array.from(r,e=>e.toString(16).padStart(2,"0")).join("")}var ct="privasys.id",Oe="relay.privasys.org",Fe=1;function tr(r){let e="";for(let t=0;t<r.length;t++)e+=String.fromCharCode(r[t]);return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function lt(r){return tr(at(new TextEncoder().encode(r)).subarray(0,16))}function dt(r){try{return new URL(r).host}catch{return Oe}}function ut(r){try{let e=new URL(r);return`${e.protocol==="wss:"?"https:":e.protocol==="ws:"?"http:":e.protocol}//${e.host}`}catch{return`https://${Oe}`}}function ht(r,e,t){let n=t===Oe?"":`&r=${encodeURIComponent(t)}`;return`https://${ct}/scp?v=${Fe}&s=${encodeURIComponent(r)}&h=${e}${n}`}async function pt(r,e,t){let n=`${r}/connect/${encodeURIComponent(e)}`;try{let s=await fetch(n,{method:"PUT",headers:{"Content-Type":"application/json"},body:t});s.ok||console.warn(`[privasys-auth] descriptor publish returned ${s.status} from ${n}`)}catch(s){console.warn("[privasys-auth] descriptor publish failed",s)}}function ft(r){let e=r.sessionId??Le(),t=r.idpOrigin??ct,n={v:Fe,origin:t,sessionId:e,rpId:r.rpId,brokerUrl:r.brokerUrl};if(r.requestedAttributes?.length&&(n.requestedAttributes=r.requestedAttributes),r.attributeRequirements&&Object.keys(r.attributeRequirements).length&&(n.attributeRequirements=r.attributeRequirements),r.disclosureVouchers?.length&&(n.disclosureVouchers=r.disclosureVouchers),r.appName&&(n.appName=r.appName),r.privacyPolicyUrl&&(n.privacyPolicyUrl=r.privacyPolicyUrl),r.clientId&&(n.clientId=r.clientId),r.mode==="session-relay"){if(!r.sdkPub||!r.appHost)throw new Error("generateQRPayload: session-relay mode requires sdkPub and appHost");n.mode="session-relay",n.sdkPub=r.sdkPub,n.appHost=r.appHost,r.extraAppHosts?.length&&(n.extraAppHosts=r.extraAppHosts),r.nonce&&(n.nonce=r.nonce)}let s=JSON.stringify(n),i=lt(s),a=r.relayBase??ut(r.brokerUrl),l=r.relayBase?new URL(r.relayBase).host:dt(r.brokerUrl),p=ht(e,i,l),x=pt(a,e,s);return{sessionId:e,payload:p,descriptorPublished:x,descriptorHash:i}}function gt(r){let e=r.sessionId??Le(),t=r.apps.map(P=>({rpId:P.rpId,sessionId:P.sessionId??Le()})),n={v:Fe,origin:r.apps[0]?.rpId??"",sessionId:e,brokerUrl:r.brokerUrl,apps:t},s=JSON.stringify(n),i=lt(s),a=r.relayBase??ut(r.brokerUrl),l=r.relayBase?new URL(r.relayBase).host:dt(r.brokerUrl),p=ht(e,i,l),x=pt(a,e,s);return{sessionId:e,appSessions:t,payload:p,descriptorPublished:x,descriptorHash:i}}var je="privasys_sessions",$e=je,qe="privasys_device_hints",yt="privasys_passkey",ae=class{constructor(){this.listeners=new Set}store(e){let t=this.getAll(),n=t.findIndex(s=>s.rpId===e.rpId);n>=0?t[n]=e:t.push(e),this.persist(t),this.notify(t)}get(e){return this.getAll().find(t=>t.rpId===e)}getAll(){try{let e=localStorage.getItem($e);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}findPushToken(){let e=this.getAll().filter(t=>!!t.pushToken).sort((t,n)=>n.authenticatedAt-t.authenticatedAt);return e[0]?.pushToken?e[0].pushToken:this.getDeviceHint()?.pushToken}remove(e){let t=this.getAll().filter(n=>n.rpId!==e);this.persist(t),this.notify(t)}clear(){localStorage.removeItem($e),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}saveDeviceHint(e,t){let n={pushToken:e,brokerUrl:t,updatedAt:Date.now()};try{localStorage.setItem(qe,JSON.stringify(n))}catch{}}getDeviceHint(){try{let e=localStorage.getItem(qe);return e?JSON.parse(e):void 0}catch{return}}clearDeviceHint(){localStorage.removeItem(qe)}savePasskeyHint(){try{localStorage.setItem(yt,"1")}catch{}}hasPasskeyHint(){try{return localStorage.getItem(yt)==="1"}catch{return!1}}persist(e){localStorage.setItem($e,JSON.stringify(e))}notify(e){for(let t of this.listeners)t(e)}};var Ke=12e4,Ee=class{constructor(e,t={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:Ke,...e},this.events=t,this.sessions=new ae}createQR(e,t){return ft({rpId:this.config.rpId,idpOrigin:this.config.idpOrigin,brokerUrl:this.config.brokerUrl,sessionId:e,requestedAttributes:this.config.requestedAttributes,attributeRequirements:this.config.attributeRequirements,disclosureVouchers:this.config.disclosureVouchers,appName:this.config.appName,privacyPolicyUrl:this.config.privacyPolicyUrl,clientId:this.config.clientId,...t?{mode:"session-relay",sdkPub:t.sdkPub,appHost:t.appHost,extraAppHosts:t.extraAppHosts,nonce:t.nonce}:{}})}waitForResult(e){return new Promise((t,n)=>{let s=this.config.timeout??Ke,i=new URL(this.config.brokerUrl);i.searchParams.set("session",e),i.searchParams.set("role","browser");let a=new WebSocket(i.toString());this.activeConnections.set(e,a),this.setState("waiting-for-scan");let l=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),n(new Error("Authentication timed out"))},s);a.onopen=()=>{this.setState("waiting-for-scan")},a.onmessage=p=>{try{let x=JSON.parse(typeof p.data=="string"?p.data:"{}");this.handleMessage(e,x,t,l)}catch{}},a.onerror=()=>{clearTimeout(l),this.setState("error"),this.cleanup(e),n(new Error("WebSocket connection failed"))},a.onclose=p=>{clearTimeout(l),this.cleanup(e),p.code!==1e3&&(this.setState("error"),n(new Error(`Connection closed (code ${p.code})`)))}})}async notifyAndWait(e,t,n){let s=this.createQR(t,n),i=s.sessionId;await s.descriptorPublished;let a=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),l=await fetch(`${a}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:i,rpId:this.config.rpId,appName:this.config.appName,origin:this.config.idpOrigin??"privasys.id",brokerUrl:this.config.brokerUrl,...this.config.clientId?{clientId:this.config.clientId}:{},descriptorHash:s.descriptorHash,...n?{mode:"session-relay",sdkPub:n.sdkPub,appHost:n.appHost,...n.extraAppHosts?.length?{extraAppHosts:n.extraAppHosts}:{},nonce:n.nonce}:{}})});if(!l.ok){let p=await l.text();throw new Error(`Push notification failed: ${p}`)}return this.waitForResult(i)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:t,appSessions:n,payload:s}=gt({brokerUrl:this.config.brokerUrl,apps:e.map(a=>({rpId:a.rpId}))}),i=this.waitForBatch(n);return{sessionId:t,appSessions:n,payload:s,result:i}}on(e){this.events={...this.events,...e}}handleMessage(e,t,n,s){switch(t.type){case"peer-joined":case"wallet-waiting":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(s),this.setState("complete");let i={sessionToken:t.sessionToken,sessionId:e,attestation:t.attestation,pushToken:t.pushToken||void 0,attributes:t.attributes||void 0,sessionRelay:t.sessionRelay||void 0};this.sessions.store({token:i.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now(),pushToken:i.pushToken,brokerUrl:this.config.brokerUrl}),this.events.onAuthenticated?.(i),this.cleanup(e),n(i);break}case"auth-error":{clearTimeout(s),this.setState("error"),this.cleanup(e);let i=new Error(t.message??"Authentication failed");this.events.onError?.(i);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let t=this.config.timeout??Ke;this.setState("waiting-for-scan");let n=await Promise.allSettled(e.map(a=>Promise.race([this.waitForResult(a.sessionId),new Promise((l,p)=>setTimeout(()=>p(new Error("Batch item timed out")),t))]))),s=[],i=[];for(let a=0;a<n.length;a++){let l=n[a];l.status==="fulfilled"?s.push(l.value):i.push({rpId:e[a].rpId,error:l.reason instanceof Error?l.reason.message:String(l.reason)})}return this.setState(i.length===0?"complete":"error"),{results:s,errors:i}}cleanup(e){let t=this.activeConnections.get(e);t&&((t.readyState===WebSocket.OPEN||t.readyState===WebSocket.CONNECTING)&&t.close(1e3),this.activeConnections.delete(e))}};function ee(r){let e=new Uint8Array(r),t="";for(let n=0;n<e.length;n++)t+=String.fromCharCode(e[n]);return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function ge(r){let e=r.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let t=atob(e),n=new Uint8Array(t.length);for(let s=0;s<t.length;s++)n[s]=t.charCodeAt(s);return n.buffer}function bt(r){let e=new Uint8Array(r);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}var le=class{constructor(e,t={}){this.state="idle";this.config={timeout:6e4,...e},this.events=t,this.sessions=new ae}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let t=ee(crypto.getRandomValues(new Uint8Array(32)).buffer),n=this.config.sessionId??bt(16),i=(await this.fido2Fetch("register/begin",{userName:e??globalThis.location?.hostname??"user",userHandle:t},{session_id:n})).publicKey;if(!i)throw new Error("Missing publicKey in registration options");let a={publicKey:{challenge:ge(i.challenge),rp:{id:i.rp.id,name:i.rp.name},user:{id:ge(i.user.id),name:i.user.name,displayName:i.user.displayName??i.user.name},pubKeyCredParams:(i.pubKeyCredParams??[]).map(P=>({type:P.type??"public-key",alg:P.alg})),timeout:this.config.timeout,attestation:i.attestation??"none",authenticatorSelection:{authenticatorAttachment:"platform",residentKey:"required",userVerification:i.authenticatorSelection?.userVerification??"required"},...i.excludeCredentials?{excludeCredentials:i.excludeCredentials.map(P=>({type:"public-key",id:ge(P.id)}))}:{}}};this.setState("ceremony");let l=await navigator.credentials.create(a);if(!l)throw new Error("No credential returned");this.setState("verifying");let p=l.response,x=await this.fido2Fetch("register/complete",{id:ee(l.rawId),rawId:ee(l.rawId),type:"public-key",response:{attestationObject:ee(p.attestationObject),clientDataJSON:ee(p.clientDataJSON)}},{challenge:i.challenge});return this.sessions.savePasskeyHint(),this.complete(x.sessionToken??"",n)}catch(t){return this.fail(t)}}async authenticate(){this.setState("requesting-options");try{let e=this.config.sessionId??bt(16),n=(await this.fido2Fetch("authenticate/begin",{},{session_id:e})).publicKey;if(!n)throw new Error("Missing publicKey in authentication options");let s={publicKey:{challenge:ge(n.challenge),rpId:n.rpId,timeout:this.config.timeout,userVerification:n.userVerification??"preferred",...n.allowCredentials?.length?{allowCredentials:n.allowCredentials.map(x=>({type:"public-key",id:ge(x.id),...x.transports?.length?{transports:x.transports}:{}}))}:{}}};this.setState("ceremony");let i=await navigator.credentials.get(s);if(!i)throw new Error("No assertion returned");this.setState("verifying");let a=i.response,l={clientDataJSON:ee(a.clientDataJSON),authenticatorData:ee(a.authenticatorData),signature:ee(a.signature)};a.userHandle&&a.userHandle.byteLength>0&&(l.userHandle=ee(a.userHandle));let p=await this.fido2Fetch("authenticate/complete",{id:ee(i.rawId),rawId:ee(i.rawId),type:"public-key",response:l},{challenge:n.challenge});return this.complete(p.sessionToken??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e,t,n){let s=(this.config.fido2Base??this.config.apiBase).replace(/\/+$/,""),i=this.config.fido2Base?new URL(`${s}/${e}`):new URL(`${s}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2/${e}`);if(n)for(let[l,p]of Object.entries(n))i.searchParams.set(l,p);let a=await fetch(i.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!a.ok){let l=await a.json().catch(()=>({error:a.statusText}));throw new Error(l.error??`HTTP ${a.status}`)}return a.json()}complete(e,t){this.setState("complete");let n={sessionToken:e,sessionId:t};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(n),n}fail(e){this.setState("error");let t=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(t),t}setState(e){this.state=e,this.events.onStateChange?.(e)}};var At=Jt(wt(),1),rr=`
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
`,We='<svg viewBox="0 0 500 500"><style>.ld{fill:#fff}@media(prefers-color-scheme:dark){.ld{fill:#2a2a2a}}</style><defs><linearGradient id="pg" y2="1"><stop offset="21%" stop-color="#34E89E"/><stop offset="42%" stop-color="#12B06E"/></linearGradient><linearGradient id="pb" x1="1" y1="1" x2="0" y2="0"><stop offset="21%" stop-color="#00BCF2"/><stop offset="42%" stop-color="#00A0EB"/></linearGradient></defs><path d="M100 0H450L0 450V100A100 100 0 0 1 100 0Z" fill="url(#pg)"/><path d="M500 50V400A100 100 0 0 1 400 500H50L500 50Z" fill="url(#pb)"/><polygon class="ld" points="0,500 50,500 500,50 500,0"/></svg>',kt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="7.5" r="3"/><path d="M10.5 13c-3.3 0-6 2-6 4.5V19h12v-1.5c0-1-.4-2-1-2.7"/><line x1="18" y1="12" x2="18" y2="18"/><line x1="15" y1="15" x2="21" y2="15"/></svg>';var nr='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',sr='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',ir='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>',or='<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',ar='<svg viewBox="0 0 24 24"><rect fill="#F25022" x="2" y="2" width="9.5" height="9.5"/><rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5"/><rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5"/><rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5"/></svg>',cr='<svg viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',lr='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',dr='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';var ur='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';function E(r,e,...t){let n=document.createElement(r);if(e!=null)for(let[s,i]of Object.entries(e))s==="className"?n.className=i:s.startsWith("on")&&typeof i=="function"?n.addEventListener(s.slice(2).toLowerCase(),i):s==="html"?n.innerHTML=i:i===!1||i==null||(i===!0?n.setAttribute(s,""):n.setAttribute(s,String(i)));for(let s of t.flat(1/0))s==null||s===!1||n.appendChild(typeof s=="string"?document.createTextNode(s):s);return n}function hr(r){try{let e=(0,At.default)(0,"M");e.addData(r),e.make();let t=e.getModuleCount(),n=Math.max(3,Math.floor(200/t));return e.createSvgTag({cellSize:n,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${r}</div>`}}var ye=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.qrPayload="";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,t)=>{this.resolve=e,this.reject=t,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.attributes=void 0,this.sessionRelay=void 0,this.qrPayload="",this.mount(),this.cfg.pushToken?this.startPush():this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=rr,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let t=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,l=>l.toUpperCase()),n=this.state==="idle",s;switch(this.state){case"qr-scanning":s="Open Privasys Wallet on your phone and scan the QR code displayed on the right to authenticate.";break;case"push-waiting":s="Check your phone \u2014 tap the notification from Privasys ID to approve this sign-in.";break;case"wallet-connected":case"authenticating":s="Verifying your identity\u2026 This will only take a moment.";break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":s="Complete the biometric prompt on your device to verify your identity.";break;case"success":s="";break;case"error":s="Something went wrong. You can try again or choose a different method.";break;default:s=`<strong>${t}</strong> needs to verify your identity. Please choose one of the authentication options.`}let i;switch(this.state){case"push-waiting":i=this.renderPushWaiting();break;case"qr-scanning":i=this.renderQR();break;case"wallet-connected":case"authenticating":i=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":i=this.renderPasskeyProgress();break;case"success":i=this.renderSuccess();break;case"error":i=this.renderError();break;default:i=this.renderIdle()}let a=E("div",{className:"page"},E("button",{className:"btn-close",html:lr,onClick:()=>this.handleCancel()}),E("div",{className:"brand-panel"},E("div",{className:"brand-panel-header"},E("div",{className:"brand-panel-logo",html:We}),E("div",{className:"brand-panel-name"},"Privasys")),s?E("p",{className:"brand-panel-desc",html:s}):null,this.isFlowState()?this.renderBrandProgress():null),E("div",{className:`auth-panel${n?"":" auth-panel--centered"}`},!n&&this.state!=="success"?E("button",{className:"btn-back",onClick:()=>this.goBack()},E("span",{html:ur}),"Back"):null,this.isFlowState()?E("div",{className:"mobile-progress-header"},this.renderBrandProgress()):null,i),E("div",{className:"footer"},"By continuing, you agree to the ",E("a",{href:"https://privasys.org/legal/terms",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Terms of Service")," and ",E("a",{href:"https://privasys.org/legal/privacy",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Privacy Policy"),"."));this.shadow.appendChild(a)}goBack(){this.cleanup(),this.state="idle",this.errorMsg="",this.render()}renderIdle(){let e=le.isSupported(),t=!!this.cfg.pushToken,n=this.cfg.socialProviders??[],s=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,x=>x.toUpperCase()),i=[];if(t&&i.push(E("button",{className:"btn-provider primary",onClick:()=>this.startPush()},E("span",{html:sr}),E("span",{className:"btn-label"},"Sign in with Privasys ID"),E("span",{className:"btn-hint"},"Notification"))),i.push(E("button",{className:`btn-provider ${t?"":"primary"}`,onClick:()=>this.startWallet()},E("span",{html:We}),E("span",{className:"btn-label"},t?"Scan QR code instead":"Continue with Privasys ID"))),(e||n.length>0)&&i.push(E("div",{className:"divider"},E("span",null,"or"))),e){let x=this.getWebAuthnClient().sessions.hasPasskeyHint()?"authenticate":"register";i.push(E("button",{className:"btn-provider",onClick:()=>this.startPasskey(x)},E("span",{html:kt}),E("span",{className:"btn-label"},"Passkey"),E("span",{className:"btn-hint"},"Face ID, Touch ID, Windows Hello")))}let l={github:ir,google:or,microsoft:ar,linkedin:cr},p={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"};for(let x of n){let P=l[x]??"",I=p[x]??x;i.push(E("button",{className:"btn-provider",onClick:()=>this.startSocial(x)},P?E("span",{html:P}):null,E("span",{className:"btn-label"},I)))}return E("div",null,E("h2",{className:"auth-panel-heading"},`Sign in to ${s}`),...i)}renderQR(){let e=this.qrPayload;return E("div",null,E("div",{className:"qr-section"},E("div",{className:"qr-frame",html:hr(e)}),E("div",{className:"scan-label"},E("span",{className:"pulse"}),"Scan with Privasys Wallet")))}renderPushWaiting(){let e=le.isSupported();return E("div",null,E("p",{className:"btn-provider",style:"margin-bottom: 20px; max-width: none; text-align: center;"},"Check your phone \u2014 tap the notification to approve this connection."),E("div",{className:"divider"},E("span",null,"or")),E("div",{className:"alt-actions"},E("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startWallet()}},E("span",{html:We}),E("span",{className:"btn-label"},"Scan QR code instead")),e?E("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startPasskey(this.getWebAuthnClient().sessions.hasPasskeyHint()?"authenticate":"register")}},E("span",{html:kt}),E("span",{className:"btn-label"},"Passkey")):null))}renderWalletProgress(){return E("div",null,E("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},"Verifying your identity\u2026 This will only take a moment."))}renderPasskeyProgress(){let t=this.state==="passkey-requesting"?"Preparing\u2026":"Complete the biometric prompt on your device.";return E("div",null,E("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},t))}isFlowState(){return["push-waiting","qr-scanning","wallet-connected","authenticating","passkey-requesting","passkey-ceremony","passkey-verifying","success"].includes(this.state)}renderBrandProgress(){let e=this.state==="success",t=this.method==="wallet"?"Privasys ID":"Passkey",n=this.method==="wallet"&&this.attestation?.valid,s=this.method==="passkey"?"This device":n?"Attestation verified":null,i;if(this.method==="passkey"){let a=this.state;i=E("div",{className:"steps"},E("div",{className:`step ${a!=="passkey-requesting"?"done":"active"}`},E("span",{className:"step-icon"},a!=="passkey-requesting"?"\u2713":"\u2022"),"Options received from enclave"),E("div",{className:`step ${a==="passkey-ceremony"?"active":a==="passkey-verifying"||e?"done":""}`},E("span",{className:"step-icon"},a==="passkey-verifying"||e?"\u2713":"\u2022"),"Biometric prompt completed"),E("div",{className:`step ${a==="passkey-verifying"?"active":e?"done":""}`},E("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Enclave verification"),E("div",{className:`step ${e?"done":""}`},E("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}else{let a=!!this.cfg.pushToken,l=["wallet-connected","authenticating","success"].includes(this.state),p=this.state==="authenticating"||e,x=a?["push-waiting","wallet-connected","authenticating","success"].includes(this.state):l||p,P=!x&&this.state==="qr-scanning",I=a?"Notification sent":"QR code scanned",H=a?"Approved on Privasys ID":"Server attestation verified",L=a&&this.state==="push-waiting"||l&&!p;i=E("div",{className:"steps"},E("div",{className:`step ${x?"done":P?"active":""}`},E("span",{className:"step-icon"},x?"\u2713":"\u2022"),I),E("div",{className:`step ${L?"active":p?"done":""}`},E("span",{className:"step-icon"},p?"\u2713":"\u2022"),H),E("div",{className:`step ${this.state==="authenticating"?"active":e?"done":""}`},E("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Biometric authentication"),E("div",{className:`step ${e?"done":""}`},E("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}return e&&i.appendChild(E("div",{className:"step done"},E("span",{className:"step-icon"},"\u2713"),`Authenticated via ${t}`)),E("div",{className:"brand-progress"},i)}renderSuccess(){let e=!!this.pushToken&&!this.cfg.deviceTrusted,t=this.method==="wallet"?"Privasys ID":"Passkey",n=this.method==="wallet"&&this.attestation?.valid,s=this.method==="passkey"?"This device":n?"Attestation verified":null;return E("div",null,e?E("div",{style:"width: 100%;"},E("p",{style:"font-size: 14px; font-weight: 500; margin-bottom: 6px;"},"Trust this device?"),E("p",{className:"scan-hint",style:"margin-bottom: 16px; max-width: none;"},"Next time, we\u2019ll send a notification to your phone instead of showing a QR code."),E("button",{className:"btn-provider primary",onClick:()=>this.finishWithTrust(!0)},E("span",{html:dr}),E("span",{className:"btn-label"},"Trust this device")),E("button",{className:"link-btn",style:"margin-top: 12px; font-size: 13px; display: block; text-align: center; width: 100%;",onClick:()=>this.finishWithTrust(!1)},"Not now")):E("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return E("div",null,E("div",{className:"error-icon",html:nr}),E("div",{className:"error-title"},"Authentication failed"),E("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),E("button",{className:"btn-retry",onClick:()=>{this.errorMsg="",this.state="idle",this.render()}},"Try again"))}startPush(){this.method="wallet";let e=this.getRelayClient();this.state="push-waiting",this.render(),e.notifyAndWait(this.cfg.pushToken,this.cfg.sessionId,this.cfg.sessionRelay).then(t=>{this.sessionToken=t.sessionToken,this.attestation=t.attestation,this.sessionId=t.sessionId,this.pushToken=t.pushToken,this.attributes=t.attributes,this.sessionRelay=t.sessionRelay,this.complete()},t=>{this.state="error",this.errorMsg=t?.message??"Push authentication failed",this.render()})}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:t,payload:n}=e.createQR(this.cfg.sessionId,this.cfg.sessionRelay);this.sessionId=t,this.qrPayload=n,this.state="qr-scanning",this.render(),e.waitForResult(t).then(s=>{this.sessionToken=s.sessionToken,this.attestation=s.attestation,this.sessionId=s.sessionId,this.pushToken=s.pushToken,this.attributes=s.attributes,this.sessionRelay=s.sessionRelay,this.complete()},s=>{this.state="error",this.errorMsg=s?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let t=this.getWebAuthnClient();try{let n;if(e==="register")n=await t.register(globalThis.location?.hostname??"user");else try{n=await t.authenticate()}catch(s){let i=s?.message??"";if(i.includes("no credentials")||i.includes("not found")||i.includes("cancelled"))this.state="passkey-requesting",this.render(),n=await t.register(globalThis.location?.hostname??"user");else throw s}this.sessionToken=n.sessionToken,this.sessionId=n.sessionId,this.complete()}catch(n){this.state="error",this.errorMsg=n?.message??"Passkey authentication failed",this.render()}}async startSocial(e){if(this.cfg.onSocialAuth){this.state="authenticating",this.render();try{await this.cfg.onSocialAuth(e),this.method="wallet",this.sessionToken="",this.sessionId=this.cfg.sessionId??"",this.complete()}catch(t){this.state="error",this.errorMsg=t?.message??`${e} authentication failed`,this.render()}}}complete(){this.state="success",this.render(),(!this.pushToken||this.cfg.deviceTrusted)&&setTimeout(()=>this.finishWithTrust(!1),1200)}finishWithTrust(e){let t={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId,pushToken:this.pushToken,attributes:this.attributes,trustDevice:e,sessionRelay:this.sessionRelay};this.close(),this.resolve?.(t),this.resolve=null,this.reject=null}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new Ee({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout,requestedAttributes:this.cfg.requestedAttributes,attributeRequirements:this.cfg.attributeRequirements,disclosureVouchers:this.cfg.disclosureVouchers,appName:this.cfg.appName,privacyPolicyUrl:this.cfg.privacyPolicyUrl,clientId:this.cfg.clientId},{onStateChange:e=>{let t={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};if(t[e]){if(this.state==="push-waiting"&&e==="waiting-for-scan")return;this.state=t[e],this.render()}}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new le({apiBase:this.cfg.apiBase,appName:this.cfg.appName,sessionId:this.cfg.sessionId,fido2Base:this.cfg.fido2Base},{onStateChange:e=>{let t={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};t[e]&&(this.state=t[e],this.render())}})),this.webauthnClient}};var Ie="application/privasys-sealed+cbor",Et="X-Privasys-Sealed",It="application/privasys-sealed-stream+cbor",St="PrivasysSession",pr=new TextEncoder().encode("privasys-session/v1"),fr=new TextEncoder().encode("privasys-dir/c2s"),gr=new TextEncoder().encode("privasys-dir/s2c"),ze="/__privasys/session-bootstrap",yr=["enc-changed","workload-changed","voucher-expired","voucher-invalid"];function br(r){return yr.includes(r)?r:void 0}var be=class r{constructor(e,t,n,s){this.c2sCtr=0n;this.s2cCtr=0n;this.host=e,this.sessionId=t,this.keys=n,this.fetchImpl=s}static async create(e){let t=e.fetchImpl??fetch.bind(globalThis),n=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},!1,["deriveBits"]),s=new Uint8Array(await crypto.subtle.exportKey("raw",n.publicKey));if(s.byteLength!==65||s[0]!==4)throw new Error("PrivasysSession: unexpected SEC1 encoding");let i=Se(s),a=await e.attestWithWallet({sdkPub:i,host:e.host}),l=await r.fromHandshake({host:e.host,sessionId:a.sessionId,sdkPrivateKey:n.privateKey,encPub:a.encPub,fetchImpl:t});return e.getEncAuth&&(l.getEncAuth=e.getEncAuth),l}static async resume(e){let t=e.fetchImpl??fetch.bind(globalThis),n;try{n=await e.getEncAuth()}catch{return{error:"unavailable"}}if(!n)return{error:"no-voucher"};let s=await Ct(e.host,n,t);return s.ok?{session:await r.fromHandshake({host:e.host,sessionId:s.sessionId,sdkPrivateKey:s.sdkPrivateKey,encPub:s.encPub,fetchImpl:t,getEncAuth:e.getEncAuth})}:{error:s.error,reason:s.reason}}static async fromHandshake(e){let t=e.fetchImpl??fetch.bind(globalThis),n=Pe(e.encPub);if(n.byteLength!==65||n[0]!==4)throw new Error("PrivasysSession: enclave public key not SEC1 uncompressed");let s=await crypto.subtle.importKey("raw",n,{name:"ECDH",namedCurve:"P-256"},!1,[]),i=await crypto.subtle.deriveBits({name:"ECDH",public:s},e.sdkPrivateKey,256),a=Pe(e.sessionId),l=await crypto.subtle.importKey("raw",i,"HKDF",!1,["deriveBits","deriveKey"]),p=await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:a,info:pr},l,256),x=await crypto.subtle.importKey("raw",p,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"]),P=new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:a,info:fr},l,32)),I=new Uint8Array(await crypto.subtle.deriveBits({name:"HKDF",hash:"SHA-256",salt:a,info:gr},l,32)),H=new r(e.host,e.sessionId,{aead:x,c2sPrefix:P,s2cPrefix:I},t);return e.getEncAuth&&(H.getEncAuth=e.getEncAuth),H}async request(e,t,n,s){let i=await this.requestOnce(e,t,n,s);return i.status===401&&!i.sealed&&this.getEncAuth&&t!==ze&&await this.tryRebind()?this.requestOnce(e,t,n,s):i}async requestOnce(e,t,n,s){let i=e.toUpperCase(),a=Pt(i,t,this.sessionId),l=Tt(n),p=this.c2sCtr++,x=de(this.keys.c2sPrefix,p),P=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:x,additionalData:a},this.keys.aead,l)),I=Bt({v:1,ctr:p,ct:P}),H=new Headers(s?.headers);H.set("Content-Type",Ie),H.set("Authorization",`${St} ${this.sessionId}`);let L=i==="GET"||i==="HEAD";L&&H.set(Et,Se(I));let q=`https://${this.host}${t}`,M=await this.fetchImpl(q,{...s,method:i,headers:H,...L?{}:{body:I}}),V=new Uint8Array(await M.arrayBuffer()),W=M.headers.get("content-type")??"";if(W.startsWith(It)){let k=[];for await(let m of wr(V,this.keys.aead,this.keys.s2cPrefix,a))k.push(m);return{status:Ge(M.headers,M.status),sealed:!0,body:ue(k),headers:M.headers}}if(!W.startsWith(Ie))return{status:M.status,sealed:!1,body:V,headers:M.headers};let S=Ce(V),C=de(this.keys.s2cPrefix,S.ctr),w=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:C,additionalData:a},this.keys.aead,S.ct));return S.ctr>=this.s2cCtr&&(this.s2cCtr=S.ctr+1n),{status:M.status,sealed:!0,body:w,headers:M.headers}}async tryRebind(){if(!this.getEncAuth)return!1;let e;try{e=await this.getEncAuth()}catch{return!1}if(!e)return!1;let t=await Ct(this.host,e,this.fetchImpl);if(!t.ok)return!1;try{let n=await r.fromHandshake({host:this.host,sessionId:t.sessionId,sdkPrivateKey:t.sdkPrivateKey,encPub:t.encPub,fetchImpl:this.fetchImpl});return this.sessionId=n.sessionId,this.keys=n.keys,this.c2sCtr=0n,this.s2cCtr=0n,!0}catch{return!1}}async json(e,t,n,s){let i=await this.request(e,t,n,s);if(i.status>=400)throw new Error(`PrivasysSession ${e} ${t}: ${i.status}`);return JSON.parse(new TextDecoder().decode(i.body))}async stream(e,t,n,s){let i=await this.streamOnce(e,t,n,s);if(i.status===401&&!i.sealed&&this.getEncAuth&&t!==ze&&await this.tryRebind()){try{await i.body.cancel()}catch{}return this.streamOnce(e,t,n,s)}return i}async streamOnce(e,t,n,s){let i=e.toUpperCase(),a=Pt(i,t,this.sessionId),l=Tt(n),p=this.c2sCtr++,x=de(this.keys.c2sPrefix,p),P=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv:x,additionalData:a},this.keys.aead,l)),I=Bt({v:1,ctr:p,ct:P}),H=new Headers(s?.headers);H.set("Content-Type",Ie),H.set("Authorization",`${St} ${this.sessionId}`);let L=i==="GET"||i==="HEAD";L&&H.set(Et,Se(I));let q=`https://${this.host}${t}`,M=await this.fetchImpl(q,{...s,method:i,headers:H,...L?{}:{body:I}}),V=M.headers.get("content-type")??"";if(!V.startsWith(It)){let m=new Uint8Array(await M.arrayBuffer()),c=[m],o=!1,A=M.status;if(V.startsWith(Ie)){let b=Ce(m),B=de(this.keys.s2cPrefix,b.ctr);c=[new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:B,additionalData:a},this.keys.aead,b.ct))],o=!0,A=Ge(M.headers,M.status)}let f=new ReadableStream({start(b){for(let B of c)b.enqueue(B);b.close()}});return{status:A,sealed:o,headers:M.headers,body:f}}let W=this.keys.aead,S=this.keys.s2cPrefix,C=M.body.getReader(),w=Ge(M.headers,M.status),k=kr(C,W,S,a),u=new ReadableStream({async pull(m){try{let{value:c,done:o}=await k.next();if(o){m.close();return}m.enqueue(c)}catch(c){m.error(c)}},cancel(m){k.return?.(void 0).catch(()=>{}),C.cancel(m).catch(()=>{})}});return{status:w,sealed:!0,headers:M.headers,body:u}}};async function Ct(r,e,t){try{let n=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},!1,["deriveBits"]),s=new Uint8Array(await crypto.subtle.exportKey("raw",n.publicKey)),i=Se(s),a=`https://${r}${ze}`,l=await t(a,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sdk_pub:i,encauth:e})});if(!l.ok)return{ok:!1,error:"rejected"};let p=await l.json(),x=br(p.encauth_reject??l.headers.get("X-Privasys-Reason")??void 0);if(x||l.headers.get("X-Privasys-EncAuth-Reject"))return{ok:!1,error:"rejected",reason:x};if(!p.sub)return{ok:!1,error:"rejected"};if(!p.session_id||!p.enc_pub)return{ok:!1,error:"rejected"};let P;try{P=vr(e.payload)}catch{return{ok:!1,error:"rejected"}}let I;try{I=Pe(p.enc_pub)}catch{return{ok:!1,error:"rejected"}}return mr(I,P)?{ok:!0,sessionId:p.session_id,encPub:p.enc_pub,sdkPrivateKey:n.privateKey}:{ok:!1,error:"rejected"}}catch{return{ok:!1,error:"unavailable"}}}function vr(r){let e=Pe(r),t=0;if(e[t]!==170)throw new Error("encauth payload: expected map(10)");t+=1;let n=null;for(let s=0;s<10;s++){let[i,a]=Te(e,t);t=a;let l=e[t]>>5;if(l===0){let[,p]=Te(e,t);t=p}else if(l===2){let[p,x]=Ut(e,t);t=x,i===6n&&(n=p)}else if(l===3){let[,p]=_t(e,t);t=p}else throw new Error("encauth payload: unexpected major type")}if(!n||n.byteLength!==65||n[0]!==4)throw new Error("encauth payload: missing or malformed enc_pub");return n}function mr(r,e){if(r.byteLength!==e.byteLength)return!1;let t=0;for(let n=0;n<r.byteLength;n++)t|=r[n]^e[n];return t===0}function Tt(r){return r==null?new Uint8Array(0):r instanceof Uint8Array?r:r instanceof ArrayBuffer?new Uint8Array(r):typeof r=="string"?new TextEncoder().encode(r):new TextEncoder().encode(JSON.stringify(r))}function Pt(r,e,t){return new TextEncoder().encode(`${r}:${e}:${t}`)}function de(r,e){let t=new Uint8Array(12);return t.set(r.subarray(0,4),0),new DataView(t.buffer).setBigUint64(4,e,!1),t}function Bt(r){let e=[];return e.push(new Uint8Array([163])),e.push(Ve("v")),e.push(Qe(BigInt(r.v))),e.push(Ve("ctr")),e.push(Qe(r.ctr)),e.push(Ve("ct")),e.push(xr(r.ct)),ue(e)}function Ce(r){let e=0;if(r[e]!==163)throw new Error("CBOR: expected map(3)");e+=1;let t={};for(let n=0;n<3;n++){let[s,i]=_t(r,e);if(e=i,s==="v"){let[a,l]=Te(r,e);t.v=Number(a),e=l}else if(s==="ctr"){let[a,l]=Te(r,e);t.ctr=a,e=l}else if(s==="ct"){let[a,l]=Ut(r,e);t.ct=a,e=l}else throw new Error(`CBOR: unexpected key ${s}`)}if(t.v==null||t.ctr==null||t.ct==null)throw new Error("CBOR: incomplete envelope");return t}function Qe(r){if(r<0n)throw new Error("cborUint: negative");if(r<24n)return new Uint8Array([Number(r)]);if(r<256n)return new Uint8Array([24,Number(r)]);if(r<65536n){let t=new Uint8Array(3);return t[0]=25,new DataView(t.buffer).setUint16(1,Number(r),!1),t}if(r<4294967296n){let t=new Uint8Array(5);return t[0]=26,new DataView(t.buffer).setUint32(1,Number(r),!1),t}let e=new Uint8Array(9);return e[0]=27,new DataView(e.buffer).setBigUint64(1,r,!1),e}function Rt(r,e){let t=Qe(e);return t[0]=r<<5|t[0]&31,t}function Ve(r){let e=new TextEncoder().encode(r);return ue([Rt(3,BigInt(e.byteLength)),e])}function xr(r){return ue([Rt(2,BigInt(r.byteLength)),r])}function Te(r,e){let t=r[e]>>5;if(t!==0)throw new Error(`CBOR: expected uint, got major=${t}`);return Je(r,e)}function _t(r,e){let t=r[e]>>5;if(t!==3)throw new Error(`CBOR: expected text, got major=${t}`);let[n,s]=Je(r,e),i=Number(n);return[new TextDecoder().decode(r.subarray(s,s+i)),s+i]}function Ut(r,e){let t=r[e]>>5;if(t!==2)throw new Error(`CBOR: expected bytes, got major=${t}`);let[n,s]=Je(r,e),i=Number(n);return[r.subarray(s,s+i),s+i]}function Je(r,e){let t=r[e]&31;if(t<24)return[BigInt(t),e+1];if(t===24)return[BigInt(r[e+1]),e+2];if(t===25)return[BigInt(new DataView(r.buffer,r.byteOffset+e+1,2).getUint16(0,!1)),e+3];if(t===26)return[BigInt(new DataView(r.buffer,r.byteOffset+e+1,4).getUint32(0,!1)),e+5];if(t===27)return[new DataView(r.buffer,r.byteOffset+e+1,8).getBigUint64(0,!1),e+9];throw new Error(`CBOR: indefinite-length not supported (ai=${t})`)}function ue(r){let e=0;for(let s of r)e+=s.byteLength;let t=new Uint8Array(e),n=0;for(let s of r)t.set(s,n),n+=s.byteLength;return t}function Ge(r,e){let t=r.get("x-privasys-inner-status");if(!t)return e;let n=parseInt(t,10);return Number.isFinite(n)&&n>0?n:e}async function*wr(r,e,t,n){let s=0;for(;s+4<=r.byteLength;){let i=new DataView(r.buffer,r.byteOffset+s,4).getUint32(0,!1);if(s+=4,i===0)return;if(s+i>r.byteLength)throw new Error("sealed-stream: truncated frame");let a=Ce(r.subarray(s,s+i));s+=i;let l=de(t,a.ctr);yield new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:l,additionalData:n},e,a.ct))}}async function*kr(r,e,t,n){let s=new Uint8Array(0);for(;;){for(;s.byteLength<4;){let{value:x,done:P}=await r.read();if(P){if(s.byteLength===0)return;throw new Error("sealed-stream: truncated length header")}s=ue([s,x])}let i=new DataView(s.buffer,s.byteOffset,4).getUint32(0,!1);if(i===0)return;for(;s.byteLength<4+i;){let{value:x,done:P}=await r.read();if(P)throw new Error("sealed-stream: truncated frame");s=ue([s,x])}let a=Ce(s.subarray(4,4+i));s=s.slice(4+i);let l=de(t,a.ctr);yield new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:l,additionalData:n},e,a.ct))}}function Se(r){let e="";for(let t=0;t<r.byteLength;t++)e+=String.fromCharCode(r[t]);return btoa(e).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function Pe(r){let e=r.replace(/-/g,"+").replace(/_/g,"/"),t=e.length%4===0?"":"=".repeat(4-e.length%4),n=atob(e+t),s=new Uint8Array(n.length);for(let i=0;i<n.length;i++)s[i]=n.charCodeAt(i);return s}var $=new ae,se=null,ve=null,te=null;function Lt(r,e){try{let n=JSON.parse(atob(r.split(".")[1]))[e];return typeof n=="string"&&n?n:null}catch{return null}}function Ot(r,e){return async()=>{let t=$.get(r);if(!t?.token)return null;let n=Lt(t.token,"sid");if(!n)return null;let s=`${globalThis.location.origin}/sessions/${encodeURIComponent(n)}/encauth`+(e?`?host=${encodeURIComponent(e)}`:""),i=await fetch(s,{headers:{Authorization:`Bearer ${t.token}`},cache:"no-store"});return i.ok?await i.json():null}}async function Nt(){let r=await crypto.subtle.generateKey({name:"ECDH",namedCurve:"P-256"},!1,["deriveBits"]),e=new Uint8Array(await crypto.subtle.exportKey("raw",r.publicKey));if(e.byteLength!==65||e[0]!==4)throw new Error("frame-host: unexpected SEC1 encoding for SDK pubkey");let t="";for(let s=0;s<e.byteLength;s++)t+=String.fromCharCode(e[s]);let n=btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return{keyPair:r,sdkPubB64:n}}var Ft=9e4,Ar=15e3,Ht=[5e3,3e4,12e4],Er=6e4,ie=new Map,he=new Map,Re=new Map,Ye=new Map;function Xe(r){let e=ie.get(r);e&&(clearTimeout(e),ie.delete(r)),he.delete(r),Re.delete(r)}async function $t(r,e,t){let n=navigator.locks;return n?.request?n.request(`privasys-refresh:${e}:${r}`,t):t()}function qt(r){try{let e=JSON.parse(atob(r.split(".")[1]));return typeof e.exp=="number"?e.exp*1e3:null}catch{return null}}function Ir(r,e=3e4){let t=qt(r);return t===null?!1:t-e<Date.now()}function Be(r){return Ir(r,Ft)}function ce(r,e){if(Xe(r.rpId),!r.refreshToken||!r.clientId)return;Re.set(r.rpId,e),Ye.set(r.rpId,r.token);let t=qt(r.token),n=t===null?780*1e3:t-Date.now()-Ft,s=Math.floor(Math.random()*Ar),i=Math.max(1e3,n+s),a=setTimeout(()=>{ie.delete(r.rpId),_e(r.rpId,e)},i);ie.set(r.rpId,a)}function Mt(r,e){let t=he.get(r)??0;he.set(r,t+1);let n=Ht[Math.min(t,Ht.length-1)],s=ie.get(r);s&&clearTimeout(s);let i=setTimeout(()=>{ie.delete(r),_e(r,e)},n);ie.set(r,i)}async function _e(r,e,t=!0){let n=$.get(r);return!n?.refreshToken||!n?.clientId?n:Be(n.token)?$t(r,n.clientId,async()=>{let s=$.get(r);return!s?.refreshToken||!s?.clientId?s:Be(s.token)?Sr(s,e,t):(he.delete(r),ce(s,e),s)}):(ie.has(r)||ce(n,e),n)}async function Sr(r,e,t){let n=globalThis.location.origin,s=r.refreshToken,i;try{i=await fetch(`${n}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:s,client_id:r.clientId})})}catch(p){return console.warn("[frame-host] renewal fetch failed, will retry:",p),Mt(r.rpId,e),r}if(i.ok){let p=await i.json(),x={...r,token:p.access_token,refreshToken:p.refresh_token,authenticatedAt:Date.now()};return $.store(x),he.delete(r.rpId),ce(x,e),t&&window.parent.postMessage({type:"privasys:session-renewed",rpId:r.rpId,accessToken:p.access_token},e),x}let a=await i.json().catch(()=>({error:i.statusText})),l=typeof a.error=="string"?a.error:"";if(i.status===400&&l==="invalid_grant"){let p=$.get(r.rpId);if(p?.refreshToken&&p.refreshToken!==s)return he.delete(r.rpId),ce(p,e),p;console.warn("[frame-host] refresh-token chain dead, expiring session:",a),Xe(r.rpId),$.remove(r.rpId),t&&window.parent.postMessage({type:"privasys:session-expired",rpId:r.rpId},e);return}return console.warn(`[frame-host] renewal failed (${i.status}), will retry:`,a),Mt(r.rpId,e),r}window.addEventListener("storage",r=>{if(r.key===je)for(let[e,t]of Re){let n=$.get(e);!n?.refreshToken||!n?.clientId||Ye.get(e)!==n.token&&(Ye.set(e,n.token),ce(n,t),window.parent.postMessage({type:"privasys:session-renewed",rpId:e,accessToken:n.token},t))}});setInterval(()=>{for(let[r,e]of Re){let t=$.get(r);!t?.refreshToken||!t?.clientId||Be(t.token)&&_e(r,e)}},Er);async function Cr(){let r=new Uint8Array(32);crypto.getRandomValues(r);let e=Array.from(r,s=>s.toString(16).padStart(2,"0")).join(""),t=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(e)),n=btoa(String.fromCharCode(...new Uint8Array(t))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return{codeVerifier:e,codeChallenge:n}}function Tr(r,e,t){return new Promise((n,s)=>{let i=document.createElement("div");i.style.cssText="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:10000;font-family:system-ui,sans-serif;";let a=document.createElement("div");a.style.cssText="background:#fff;border-radius:12px;padding:32px 28px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.18);text-align:center;";let l=document.createElement("h2");l.textContent="Verify your identity",l.style.cssText="margin:0 0 8px;font-size:18px;color:#1a1a2e;";let p=document.createElement("p");p.textContent="To complete your account, sign in with one of these providers to verify your email.",p.style.cssText="margin:0 0 20px;font-size:14px;color:#666;line-height:1.4;",a.appendChild(l),a.appendChild(p);let x={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"},P=I=>{let q=window.screenX+(window.innerWidth-500)/2,M=window.screenY+(window.innerHeight-650)/2,V=`${r}/auth/social?provider=${encodeURIComponent(I)}&session_id=${encodeURIComponent(e)}`,W=window.open(V,"privasys-social",`width=500,height=650,left=${q},top=${M}`);if(!W){s(new Error("Popup blocked \u2014 please allow popups for this site"));return}let S=()=>{window.removeEventListener("message",C),clearInterval(w),i.remove()},C=k=>{k.source===W&&(k.data?.type==="privasys:social-complete"?(S(),W.close(),n()):k.data?.type==="privasys:social-error"&&(S(),W.close(),s(new Error(k.data.error||"Social verification failed"))))};window.addEventListener("message",C);let w=setInterval(()=>{W.closed&&(S(),s(new Error("Verification cancelled")))},500)};for(let I of t){let H=document.createElement("button");H.textContent=x[I]??I,H.style.cssText="display:block;width:100%;padding:12px 16px;margin:8px 0;border:1px solid #ddd;border-radius:8px;background:#fff;font-size:14px;cursor:pointer;transition:background .15s;",H.onmouseenter=()=>{H.style.background="#f5f5f5"},H.onmouseleave=()=>{H.style.background="#fff"},H.onclick=()=>P(I),a.appendChild(H)}i.appendChild(a),document.body.appendChild(i)})}async function Pr(r,e=12e4){let t=Date.now()+e;for(;Date.now()<t;){let n=await fetch(r);if(!n.ok)throw new Error(`poll failed: ${n.status}`);let s=await n.json();if(s.authenticated&&s.redirect_uri){let a=new URL(s.redirect_uri,globalThis.location.origin).searchParams.get("code");if(a)return a}await new Promise(i=>setTimeout(i,1500))}throw new Error("OIDC session timed out")}async function Br(r,e,t){let n=await fetch(`${r}/session/complete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,user_id:t?.sub||"",attributes:t||{}})});if(!n.ok){let i=await n.json().catch(()=>({error:n.statusText}));throw new Error(i.error_description||i.error||`Session complete failed: ${n.status}`)}let s=await n.json();if(!s.code)throw new Error("No authorization code returned");return s.code}async function Rr(r,e,t,n){let s=await fetch(`${r}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code:e,client_id:t,code_verifier:n})});if(!s.ok){let i=await s.json().catch(()=>({error:s.statusText}));throw new Error(i.error_description||i.error||`Token exchange failed: ${s.status}`)}return s.json()}window.addEventListener("message",async r=>{let e=r.data;if(!(!e||typeof e.type!="string")){if(e.type==="privasys:init"){let t=e.config,n=r.origin;se&&(se.destroy(),se=null),ve=null;let s;if(t.sessionRelay?.appHost){let{keyPair:x,sdkPubB64:P}=await Nt();ve={appHost:t.sessionRelay.appHost,rpId:t.rpId||t.appName,sdkKeyPair:x,sdkPubB64:P},s={sdkPub:P,appHost:t.sessionRelay.appHost,...t.sessionRelay.extraAppHosts?.length?{extraAppHosts:t.sessionRelay.extraAppHosts}:{}}}let i=globalThis.location.origin,a=t.clientId;if(a){try{let{codeVerifier:x,codeChallenge:P}=await Cr(),I=new URL("/authorize",i);I.searchParams.set("client_id",a),I.searchParams.set("response_type","code"),I.searchParams.set("code_challenge",P),I.searchParams.set("code_challenge_method","S256");let H=Array.isArray(t.scope)?t.scope.join(" "):t.scope||"openid offline_access";I.searchParams.set("scope",H),I.searchParams.set("response_mode","json");let L=await fetch(I.toString(),{headers:{Accept:"application/json"}});if(!L.ok){let B=await L.json().catch(()=>({error:L.statusText})),R=new Error(B.error_description||B.error||`Authorize failed: ${L.status}`);throw R.code=B.error,R}let q=await L.json(),M=q.session_id,V=q.poll_url,W=q.requested_attributes,S,C;try{let B=new URL(q.qr_payload).searchParams.get("p");if(B){let R=B.replace(/-/g,"+").replace(/_/g,"/"),D=R.length%4?R+"=".repeat(4-R.length%4):R,F=JSON.parse(atob(D));S=F.attributeRequirements,C=F.disclosureVouchers}}catch{}let w=[];try{let B=await fetch(`${i}/auth/social/providers`);B.ok&&(w=(await B.json()).providers??[])}catch{}let k=$.findPushToken(),u=!!$.getDeviceHint(),m=B=>new Promise((R,D)=>{let G=window.screenX+(window.innerWidth-500)/2,Y=window.screenY+(window.innerHeight-650)/2,X=`${i}/auth/social?provider=${encodeURIComponent(B)}&session_id=${encodeURIComponent(M)}`,z=window.open(X,"privasys-social",`width=500,height=650,left=${G},top=${Y}`);if(!z){D(new Error("Popup blocked \u2014 please allow popups for this site"));return}let pe=()=>{window.removeEventListener("message",re),clearInterval(Ue)},re=h=>{h.source===z&&(h.data?.type==="privasys:social-complete"?(pe(),z.close(),R()):h.data?.type==="privasys:social-error"&&(pe(),z.close(),D(new Error(h.data.error||"Social authentication failed"))))};window.addEventListener("message",re);let Ue=setInterval(()=>{z.closed&&(pe(),D(new Error("Authentication cancelled")))},500)});se=new ye({...t,apiBase:i,sessionId:M,fido2Base:`${i}/fido2`,pushToken:k,deviceTrusted:u,socialProviders:w,onSocialAuth:m,requestedAttributes:W,attributeRequirements:S,disclosureVouchers:C,sessionRelay:s});let c=await se.signIn(),o;if(c.method==="passkey"){if(W?.some(R=>R==="email"||R==="name")){if(w.length===0)throw new Error("Profile verification required (email/name) but the IdP has no external identity providers configured. Contact support.");await Tr(i,M,w)}o=await Pr(V)}else o=await Br(i,M,c.attributes);let A=await Rr(i,o,a,x),f=t.rpId||t.appName,b={token:A.access_token,rpId:f,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:c.pushToken,brokerUrl:t.brokerUrl||"",refreshToken:A.refresh_token,clientId:a};$.store(b),b.pushToken&&b.brokerUrl&&(c.trustDevice||u)&&$.saveDeviceHint(b.pushToken,b.brokerUrl),ce(b,n),c.sessionRelay&&await Dt(c.sessionRelay,n),window.parent.postMessage({type:"privasys:result",result:{...c,accessToken:A.access_token}},n)}catch(x){let P=x instanceof Error?x.message:"Authentication failed";if(P==="Authentication cancelled"||P==="AuthUI destroyed")window.parent.postMessage({type:"privasys:cancel"},n);else{let I=x instanceof Error?x.code:void 0;window.parent.postMessage({type:"privasys:error",error:P,...I?{errorCode:I}:{}},n)}}finally{se=null}return}let l=$.findPushToken(),p=!!$.getDeviceHint();se=new ye({...t,pushToken:l,deviceTrusted:p,sessionRelay:s});try{let x=await se.signIn(),P=t.brokerUrl||"",I={token:x.sessionToken,rpId:t.rpId||t.appName,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:x.pushToken,brokerUrl:P};$.store(I),I.pushToken&&I.brokerUrl&&(x.trustDevice||p)&&$.saveDeviceHint(I.pushToken,I.brokerUrl),x.sessionRelay&&await Dt(x.sessionRelay,n),window.parent.postMessage({type:"privasys:result",result:x},n)}catch(x){let P=x instanceof Error?x.message:"Authentication failed";P==="Authentication cancelled"||P==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},n):window.parent.postMessage({type:"privasys:error",error:P},n)}finally{se=null}}if(e.type==="privasys:check-session"){let t=$.get(e.rpId);t?.token&&t?.refreshToken&&t?.clientId&&Be(t.token)&&(t=await _e(e.rpId,r.origin,!1)),t?.refreshToken&&t?.clientId&&!ie.has(t.rpId)&&ce(t,r.origin),window.parent.postMessage({type:"privasys:session",session:t||null},r.origin)}if(e.type==="privasys:clear-session"&&(Xe(e.rpId),$.remove(e.rpId),$.clearDeviceHint(),window.parent.postMessage({type:"privasys:session-cleared"},r.origin)),e.type==="privasys:get-token-for-audience"){let t=e.id,n=a=>window.parent.postMessage({type:"privasys:token-for-audience:response",id:t,...a},r.origin),s=$.get(e.rpId);if(!s?.refreshToken||!s?.clientId){n({error:"no refresh token in session"});return}let i=String(e.audience||"").trim();if(!i){n({error:"audience required"});return}try{let a=await $t(e.rpId,s.clientId,async()=>{let l=$.get(e.rpId);if(!l?.refreshToken||!l?.clientId)throw new Error("no refresh token in session");let p=globalThis.location.origin,x=await fetch(`${p}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:l.refreshToken,client_id:l.clientId,scope:`audience:${i} openid email profile offline_access`})});if(!x.ok){let I=await x.json().catch(()=>({error:x.statusText}));throw new Error(I.error_description||I.error||`mint failed: ${x.status}`)}let P=await x.json();return $.store({...l,refreshToken:P.refresh_token}),P});n({accessToken:a.access_token,expiresIn:a.expires_in})}catch(a){n({error:a.message})}}if(e.type==="privasys:voucher-request"){let t=e.id,n=l=>window.parent.postMessage({type:"privasys:voucher-request:response",id:t,...l},r.origin),s=$.get(e.rpId);if(!s?.token){n({error:"no-session"});return}if(!s.pushToken||!s.brokerUrl){n({error:"no-push"});return}let i=Lt(s.token,"sid");if(!i){n({error:"no-session"});return}let a=String(e.appHost||"").trim();if(!a){n({error:"appHost required"});return}try{let l=`${globalThis.location.origin}/sessions/${encodeURIComponent(i)}/encauth?host=${encodeURIComponent(a)}`,p=async()=>{let q=await fetch(l,{headers:{Authorization:`Bearer ${s.token}`},cache:"no-store"});if(!q.ok)return null;let M=await q.json().catch(()=>null);return M?JSON.stringify(M):null},x=await p(),{sdkPubB64:P}=await Nt(),I=String(s.brokerUrl).replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),H=await fetch(`${I}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:s.pushToken,sessionId:`voucher-${Date.now()}-${Math.random().toString(36).slice(2)}`,rpId:e.rpId,appName:String(e.appName||e.rpId),origin:globalThis.location.hostname,brokerUrl:s.brokerUrl,mode:"voucher-only",appHost:a,sdkPub:P,sid:i,...e.clientId?{clientId:String(e.clientId)}:{}})});if(!H.ok){n({error:`push failed: ${H.status}`});return}let L=Date.now()+12e4;for(;Date.now()<L;){await new Promise(M=>setTimeout(M,2500));let q=await p();if(q&&q!==x){n({ok:!0});return}}n({error:"timeout"})}catch(l){n({error:l.message})}return}if(e.type==="privasys:session:request"){let t=e.id,n=s=>window.parent.postMessage({type:"privasys:session:response",id:t,...s},r.origin);if(!te){n({error:"no active session"});return}try{let s=String(e.method||"GET").toUpperCase(),i=String(e.path||"/"),a=e.body,l=e.init??void 0,p=await te.session.request(s,i,a,l),x={};p.headers.forEach((P,I)=>{x[I]=P}),n({status:p.status,headers:x,body:p.body,sealed:p.sealed})}catch(s){n({error:s instanceof Error?s.message:String(s)})}}if(e.type==="privasys:session:resume"){let t=e.id,n=p=>window.parent.postMessage({type:"privasys:session:resume:response",id:t,...p},r.origin),s=String(e.appHost||""),i=String(e.rpId||"");if(!s||!i){n({error:"appHost and rpId required"});return}if(te&&te.appHost===s){n({sessionId:te.sessionId,appHost:s,expiresAt:te.expiresAt});return}let a=Ot(i,s),l=await be.resume({host:s,getEncAuth:a});if("error"in l){n({error:l.error,reason:l.reason});return}te={appHost:s,sessionId:l.session.sessionId,expiresAt:0,session:l.session},n({sessionId:l.session.sessionId,appHost:s,expiresAt:0});return}if(e.type==="privasys:session:stream-request"){let t=e.id,n=(s,i={})=>window.parent.postMessage({type:s,id:t,...i},r.origin);if(!te){n("privasys:session:stream-error",{error:"no active session"});return}try{let s=String(e.method||"POST").toUpperCase(),i=String(e.path||"/"),a=e.body,l=e.init??void 0,p=await te.session.stream(s,i,a,l),x={};p.headers.forEach((I,H)=>{x[H]=I}),n("privasys:session:stream-start",{status:p.status,headers:x,sealed:p.sealed});let P=p.body.getReader();try{for(;;){let{value:I,done:H}=await P.read();if(H)break;I&&I.byteLength>0&&n("privasys:session:stream-chunk",{chunk:I})}n("privasys:session:stream-end")}catch(I){n("privasys:session:stream-error",{error:I instanceof Error?I.message:String(I)})}}catch(s){n("privasys:session:stream-error",{error:s instanceof Error?s.message:String(s)})}}}});function _r(r){return typeof r!="number"||!Number.isFinite(r)||r<=0?0:r<1e12?r*1e3:r}async function Dt(r,e){if(!ve){console.warn("[frame-host] sessionRelay returned without pending handshake \u2014 ignoring");return}let{sdkKeyPair:t,appHost:n,rpId:s}=ve;ve=null;let i=_r(r.expiresAt);try{let a=await be.fromHandshake({host:n,sessionId:r.sessionId,sdkPrivateKey:t.privateKey,encPub:r.encPub,getEncAuth:Ot(s,n)});te={appHost:n,sessionId:r.sessionId,expiresAt:i,session:a},window.parent.postMessage({type:"privasys:session:ready",sessionId:r.sessionId,appHost:n,expiresAt:i},e)}catch(a){console.error("[frame-host] failed to derive sealed session:",a),window.parent.postMessage({type:"privasys:session:error",error:a instanceof Error?a.message:String(a)},e)}}window.parent.postMessage({type:"privasys:ready"},"*");})();
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=privasys-auth-frame.iife.js.map
