"use strict";(()=>{var Re=Object.create;var we=Object.defineProperty;var De=Object.getOwnPropertyDescriptor;var Le=Object.getOwnPropertyNames;var Fe=Object.getPrototypeOf,Ue=Object.prototype.hasOwnProperty;var Oe=(f,e)=>()=>(e||f((e={exports:{}}).exports,e),e.exports);var He=(f,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let l of Le(e))!Ue.call(f,l)&&l!==t&&we(f,l,{get:()=>e[l],enumerable:!(s=De(e,l))||s.enumerable});return f};var $e=(f,e,t)=>(t=f!=null?Re(Fe(f)):{},He(e||!f||!f.__esModule?we(t,"default",{value:f,enumerable:!0}):t,f));var Se=Oe((Te,Ee)=>{var Ce=(function(){var f=function(k,A){var w=236,b=17,a=k,m=t[A],n=null,r=0,g=null,d=[],v={},N=function(c,h){r=a*4+17,n=(function(i){for(var p=new Array(i),u=0;u<i;u+=1){p[u]=new Array(i);for(var x=0;x<i;x+=1)p[u][x]=null}return p})(r),B(0,0),B(r-7,0),B(0,r-7),U(),L(),$(c,h),a>=7&&H(c),g==null&&(g=X(a,m,d)),j(g,h)},B=function(c,h){for(var i=-1;i<=7;i+=1)if(!(c+i<=-1||r<=c+i))for(var p=-1;p<=7;p+=1)h+p<=-1||r<=h+p||(0<=i&&i<=6&&(p==0||p==6)||0<=p&&p<=6&&(i==0||i==6)||2<=i&&i<=4&&2<=p&&p<=4?n[c+i][h+p]=!0:n[c+i][h+p]=!1)},M=function(){for(var c=0,h=0,i=0;i<8;i+=1){N(!0,i);var p=l.getLostPoint(v);(i==0||c>p)&&(c=p,h=i)}return h},L=function(){for(var c=8;c<r-8;c+=1)n[c][6]==null&&(n[c][6]=c%2==0);for(var h=8;h<r-8;h+=1)n[6][h]==null&&(n[6][h]=h%2==0)},U=function(){for(var c=l.getPatternPosition(a),h=0;h<c.length;h+=1)for(var i=0;i<c.length;i+=1){var p=c[h],u=c[i];if(n[p][u]==null)for(var x=-2;x<=2;x+=1)for(var T=-2;T<=2;T+=1)x==-2||x==2||T==-2||T==2||x==0&&T==0?n[p+x][u+T]=!0:n[p+x][u+T]=!1}},H=function(c){for(var h=l.getBCHTypeNumber(a),i=0;i<18;i+=1){var p=!c&&(h>>i&1)==1;n[Math.floor(i/3)][i%3+r-8-3]=p}for(var i=0;i<18;i+=1){var p=!c&&(h>>i&1)==1;n[i%3+r-8-3][Math.floor(i/3)]=p}},$=function(c,h){for(var i=m<<3|h,p=l.getBCHTypeInfo(i),u=0;u<15;u+=1){var x=!c&&(p>>u&1)==1;u<6?n[u][8]=x:u<8?n[u+1][8]=x:n[r-15+u][8]=x}for(var u=0;u<15;u+=1){var x=!c&&(p>>u&1)==1;u<8?n[8][r-u-1]=x:u<9?n[8][15-u-1+1]=x:n[8][15-u-1]=x}n[r-8][8]=!c},j=function(c,h){for(var i=-1,p=r-1,u=7,x=0,T=l.getMaskFunction(h),C=r-1;C>0;C-=2)for(C==6&&(C-=1);;){for(var D=0;D<2;D+=1)if(n[p][C-D]==null){var F=!1;x<c.length&&(F=(c[x]>>>u&1)==1);var E=T(p,C-D);E&&(F=!F),n[p][C-D]=F,u-=1,u==-1&&(x+=1,u=7)}if(p+=i,p<0||r<=p){p-=i,i=-i;break}}},J=function(c,h){for(var i=0,p=0,u=0,x=new Array(h.length),T=new Array(h.length),C=0;C<h.length;C+=1){var D=h[C].dataCount,F=h[C].totalCount-D;p=Math.max(p,D),u=Math.max(u,F),x[C]=new Array(D);for(var E=0;E<x[C].length;E+=1)x[C][E]=255&c.getBuffer()[E+i];i+=D;var W=l.getErrorCorrectPolynomial(F),q=I(x[C],W.getLength()-1),me=q.mod(W);T[C]=new Array(W.getLength()-1);for(var E=0;E<T[C].length;E+=1){var ye=E+me.getLength()-T[C].length;T[C][E]=ye>=0?me.getAt(ye):0}}for(var be=0,E=0;E<h.length;E+=1)be+=h[E].totalCount;for(var he=new Array(be),oe=0,E=0;E<p;E+=1)for(var C=0;C<h.length;C+=1)E<x[C].length&&(he[oe]=x[C][E],oe+=1);for(var E=0;E<u;E+=1)for(var C=0;C<h.length;C+=1)E<T[C].length&&(he[oe]=T[C][E],oe+=1);return he},X=function(c,h,i){for(var p=P.getRSBlocks(c,h),u=S(),x=0;x<i.length;x+=1){var T=i[x];u.put(T.getMode(),4),u.put(T.getLength(),l.getLengthInBits(T.getMode(),c)),T.write(u)}for(var C=0,x=0;x<p.length;x+=1)C+=p[x].dataCount;if(u.getLengthInBits()>C*8)throw"code length overflow. ("+u.getLengthInBits()+">"+C*8+")";for(u.getLengthInBits()+4<=C*8&&u.put(0,4);u.getLengthInBits()%8!=0;)u.putBit(!1);for(;!(u.getLengthInBits()>=C*8||(u.put(w,8),u.getLengthInBits()>=C*8));)u.put(b,8);return J(u,p)};v.addData=function(c,h){h=h||"Byte";var i=null;switch(h){case"Numeric":i=_(c);break;case"Alphanumeric":i=R(c);break;case"Byte":i=Y(c);break;case"Kanji":i=Q(c);break;default:throw"mode:"+h}d.push(i),g=null},v.isDark=function(c,h){if(c<0||r<=c||h<0||r<=h)throw c+","+h;return n[c][h]},v.getModuleCount=function(){return r},v.make=function(){if(a<1){for(var c=1;c<40;c++){for(var h=P.getRSBlocks(c,m),i=S(),p=0;p<d.length;p++){var u=d[p];i.put(u.getMode(),4),i.put(u.getLength(),l.getLengthInBits(u.getMode(),c)),u.write(i)}for(var x=0,p=0;p<h.length;p++)x+=h[p].dataCount;if(i.getLengthInBits()<=x*8)break}a=c}N(!1,M())},v.createTableTag=function(c,h){c=c||2,h=typeof h>"u"?c*4:h;var i="";i+='<table style="',i+=" border-width: 0px; border-style: none;",i+=" border-collapse: collapse;",i+=" padding: 0px; margin: "+h+"px;",i+='">',i+="<tbody>";for(var p=0;p<v.getModuleCount();p+=1){i+="<tr>";for(var u=0;u<v.getModuleCount();u+=1)i+='<td style="',i+=" border-width: 0px; border-style: none;",i+=" border-collapse: collapse;",i+=" padding: 0px; margin: 0px;",i+=" width: "+c+"px;",i+=" height: "+c+"px;",i+=" background-color: ",i+=v.isDark(p,u)?"#000000":"#ffffff",i+=";",i+='"/>';i+="</tr>"}return i+="</tbody>",i+="</table>",i},v.createSvgTag=function(c,h,i,p){var u={};typeof arguments[0]=="object"&&(u=arguments[0],c=u.cellSize,h=u.margin,i=u.alt,p=u.title),c=c||2,h=typeof h>"u"?c*4:h,i=typeof i=="string"?{text:i}:i||{},i.text=i.text||null,i.id=i.text?i.id||"qrcode-description":null,p=typeof p=="string"?{text:p}:p||{},p.text=p.text||null,p.id=p.text?p.id||"qrcode-title":null;var x=v.getModuleCount()*c+h*2,T,C,D,F,E="",W;for(W="l"+c+",0 0,"+c+" -"+c+",0 0,-"+c+"z ",E+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',E+=u.scalable?"":' width="'+x+'px" height="'+x+'px"',E+=' viewBox="0 0 '+x+" "+x+'" ',E+=' preserveAspectRatio="xMinYMin meet"',E+=p.text||i.text?' role="img" aria-labelledby="'+Z([p.id,i.id].join(" ").trim())+'"':"",E+=">",E+=p.text?'<title id="'+Z(p.id)+'">'+Z(p.text)+"</title>":"",E+=i.text?'<description id="'+Z(i.id)+'">'+Z(i.text)+"</description>":"",E+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',E+='<path d="',D=0;D<v.getModuleCount();D+=1)for(F=D*c+h,T=0;T<v.getModuleCount();T+=1)v.isDark(D,T)&&(C=T*c+h,E+="M"+C+","+F+W);return E+='" stroke="transparent" fill="black"/>',E+="</svg>",E},v.createDataURL=function(c,h){c=c||2,h=typeof h>"u"?c*4:h;var i=v.getModuleCount()*c+h*2,p=h,u=i-h;return ie(i,i,function(x,T){if(p<=x&&x<u&&p<=T&&T<u){var C=Math.floor((x-p)/c),D=Math.floor((T-p)/c);return v.isDark(D,C)?0:1}else return 1})},v.createImgTag=function(c,h,i){c=c||2,h=typeof h>"u"?c*4:h;var p=v.getModuleCount()*c+h*2,u="";return u+="<img",u+=' src="',u+=v.createDataURL(c,h),u+='"',u+=' width="',u+=p,u+='"',u+=' height="',u+=p,u+='"',i&&(u+=' alt="',u+=Z(i),u+='"'),u+="/>",u};var Z=function(c){for(var h="",i=0;i<c.length;i+=1){var p=c.charAt(i);switch(p){case"<":h+="&lt;";break;case">":h+="&gt;";break;case"&":h+="&amp;";break;case'"':h+="&quot;";break;default:h+=p;break}}return h},Me=function(c){var h=1;c=typeof c>"u"?h*2:c;var i=v.getModuleCount()*h+c*2,p=c,u=i-c,x,T,C,D,F,E={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},W={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},q="";for(x=0;x<i;x+=2){for(C=Math.floor((x-p)/h),D=Math.floor((x+1-p)/h),T=0;T<i;T+=1)F="\u2588",p<=T&&T<u&&p<=x&&x<u&&v.isDark(C,Math.floor((T-p)/h))&&(F=" "),p<=T&&T<u&&p<=x+1&&x+1<u&&v.isDark(D,Math.floor((T-p)/h))?F+=" ":F+="\u2588",q+=c<1&&x+1>=u?W[F]:E[F];q+=`
`}return i%2&&c>0?q.substring(0,q.length-i-1)+Array(i+1).join("\u2580"):q.substring(0,q.length-1)};return v.createASCII=function(c,h){if(c=c||1,c<2)return Me(h);c-=1,h=typeof h>"u"?c*2:h;var i=v.getModuleCount()*c+h*2,p=h,u=i-h,x,T,C,D,F=Array(c+1).join("\u2588\u2588"),E=Array(c+1).join("  "),W="",q="";for(x=0;x<i;x+=1){for(C=Math.floor((x-p)/c),q="",T=0;T<i;T+=1)D=1,p<=T&&T<u&&p<=x&&x<u&&v.isDark(C,Math.floor((T-p)/c))&&(D=0),q+=D?F:E;for(C=0;C<c;C+=1)W+=q+`
`}return W.substring(0,W.length-1)},v.renderTo2dContext=function(c,h){h=h||2;for(var i=v.getModuleCount(),p=0;p<i;p++)for(var u=0;u<i;u++)c.fillStyle=v.isDark(p,u)?"black":"white",c.fillRect(p*h,u*h,h,h)},v};f.stringToBytesFuncs={default:function(k){for(var A=[],w=0;w<k.length;w+=1){var b=k.charCodeAt(w);A.push(b&255)}return A}},f.stringToBytes=f.stringToBytesFuncs.default,f.createStringToBytes=function(k,A){var w=(function(){for(var a=ce(k),m=function(){var L=a.read();if(L==-1)throw"eof";return L},n=0,r={};;){var g=a.read();if(g==-1)break;var d=m(),v=m(),N=m(),B=String.fromCharCode(g<<8|d),M=v<<8|N;r[B]=M,n+=1}if(n!=A)throw n+" != "+A;return r})(),b=63;return function(a){for(var m=[],n=0;n<a.length;n+=1){var r=a.charCodeAt(n);if(r<128)m.push(r);else{var g=w[a.charAt(n)];typeof g=="number"?(g&255)==g?m.push(g):(m.push(g>>>8),m.push(g&255)):m.push(b)}}return m}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},t={L:1,M:0,Q:3,H:2},s={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},l=(function(){var k=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],A=1335,w=7973,b=21522,a={},m=function(n){for(var r=0;n!=0;)r+=1,n>>>=1;return r};return a.getBCHTypeInfo=function(n){for(var r=n<<10;m(r)-m(A)>=0;)r^=A<<m(r)-m(A);return(n<<10|r)^b},a.getBCHTypeNumber=function(n){for(var r=n<<12;m(r)-m(w)>=0;)r^=w<<m(r)-m(w);return n<<12|r},a.getPatternPosition=function(n){return k[n-1]},a.getMaskFunction=function(n){switch(n){case s.PATTERN000:return function(r,g){return(r+g)%2==0};case s.PATTERN001:return function(r,g){return r%2==0};case s.PATTERN010:return function(r,g){return g%3==0};case s.PATTERN011:return function(r,g){return(r+g)%3==0};case s.PATTERN100:return function(r,g){return(Math.floor(r/2)+Math.floor(g/3))%2==0};case s.PATTERN101:return function(r,g){return r*g%2+r*g%3==0};case s.PATTERN110:return function(r,g){return(r*g%2+r*g%3)%2==0};case s.PATTERN111:return function(r,g){return(r*g%3+(r+g)%2)%2==0};default:throw"bad maskPattern:"+n}},a.getErrorCorrectPolynomial=function(n){for(var r=I([1],0),g=0;g<n;g+=1)r=r.multiply(I([1,o.gexp(g)],0));return r},a.getLengthInBits=function(n,r){if(1<=r&&r<10)switch(n){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+n}else if(r<27)switch(n){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+n}else if(r<41)switch(n){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+n}else throw"type:"+r},a.getLostPoint=function(n){for(var r=n.getModuleCount(),g=0,d=0;d<r;d+=1)for(var v=0;v<r;v+=1){for(var N=0,B=n.isDark(d,v),M=-1;M<=1;M+=1)if(!(d+M<0||r<=d+M))for(var L=-1;L<=1;L+=1)v+L<0||r<=v+L||M==0&&L==0||B==n.isDark(d+M,v+L)&&(N+=1);N>5&&(g+=3+N-5)}for(var d=0;d<r-1;d+=1)for(var v=0;v<r-1;v+=1){var U=0;n.isDark(d,v)&&(U+=1),n.isDark(d+1,v)&&(U+=1),n.isDark(d,v+1)&&(U+=1),n.isDark(d+1,v+1)&&(U+=1),(U==0||U==4)&&(g+=3)}for(var d=0;d<r;d+=1)for(var v=0;v<r-6;v+=1)n.isDark(d,v)&&!n.isDark(d,v+1)&&n.isDark(d,v+2)&&n.isDark(d,v+3)&&n.isDark(d,v+4)&&!n.isDark(d,v+5)&&n.isDark(d,v+6)&&(g+=40);for(var v=0;v<r;v+=1)for(var d=0;d<r-6;d+=1)n.isDark(d,v)&&!n.isDark(d+1,v)&&n.isDark(d+2,v)&&n.isDark(d+3,v)&&n.isDark(d+4,v)&&!n.isDark(d+5,v)&&n.isDark(d+6,v)&&(g+=40);for(var H=0,v=0;v<r;v+=1)for(var d=0;d<r;d+=1)n.isDark(d,v)&&(H+=1);var $=Math.abs(100*H/r/r-50)/5;return g+=$*10,g},a})(),o=(function(){for(var k=new Array(256),A=new Array(256),w=0;w<8;w+=1)k[w]=1<<w;for(var w=8;w<256;w+=1)k[w]=k[w-4]^k[w-5]^k[w-6]^k[w-8];for(var w=0;w<255;w+=1)A[k[w]]=w;var b={};return b.glog=function(a){if(a<1)throw"glog("+a+")";return A[a]},b.gexp=function(a){for(;a<0;)a+=255;for(;a>=256;)a-=255;return k[a]},b})();function I(k,A){if(typeof k.length>"u")throw k.length+"/"+A;var w=(function(){for(var a=0;a<k.length&&k[a]==0;)a+=1;for(var m=new Array(k.length-a+A),n=0;n<k.length-a;n+=1)m[n]=k[n+a];return m})(),b={};return b.getAt=function(a){return w[a]},b.getLength=function(){return w.length},b.multiply=function(a){for(var m=new Array(b.getLength()+a.getLength()-1),n=0;n<b.getLength();n+=1)for(var r=0;r<a.getLength();r+=1)m[n+r]^=o.gexp(o.glog(b.getAt(n))+o.glog(a.getAt(r)));return I(m,0)},b.mod=function(a){if(b.getLength()-a.getLength()<0)return b;for(var m=o.glog(b.getAt(0))-o.glog(a.getAt(0)),n=new Array(b.getLength()),r=0;r<b.getLength();r+=1)n[r]=b.getAt(r);for(var r=0;r<a.getLength();r+=1)n[r]^=o.gexp(o.glog(a.getAt(r))+m);return I(n,0).mod(a)},b}var P=(function(){var k=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],A=function(a,m){var n={};return n.totalCount=a,n.dataCount=m,n},w={},b=function(a,m){switch(m){case t.L:return k[(a-1)*4+0];case t.M:return k[(a-1)*4+1];case t.Q:return k[(a-1)*4+2];case t.H:return k[(a-1)*4+3];default:return}};return w.getRSBlocks=function(a,m){var n=b(a,m);if(typeof n>"u")throw"bad rs block @ typeNumber:"+a+"/errorCorrectionLevel:"+m;for(var r=n.length/3,g=[],d=0;d<r;d+=1)for(var v=n[d*3+0],N=n[d*3+1],B=n[d*3+2],M=0;M<v;M+=1)g.push(A(N,B));return g},w})(),S=function(){var k=[],A=0,w={};return w.getBuffer=function(){return k},w.getAt=function(b){var a=Math.floor(b/8);return(k[a]>>>7-b%8&1)==1},w.put=function(b,a){for(var m=0;m<a;m+=1)w.putBit((b>>>a-m-1&1)==1)},w.getLengthInBits=function(){return A},w.putBit=function(b){var a=Math.floor(A/8);k.length<=a&&k.push(0),b&&(k[a]|=128>>>A%8),A+=1},w},_=function(k){var A=e.MODE_NUMBER,w=k,b={};b.getMode=function(){return A},b.getLength=function(n){return w.length},b.write=function(n){for(var r=w,g=0;g+2<r.length;)n.put(a(r.substring(g,g+3)),10),g+=3;g<r.length&&(r.length-g==1?n.put(a(r.substring(g,g+1)),4):r.length-g==2&&n.put(a(r.substring(g,g+2)),7))};var a=function(n){for(var r=0,g=0;g<n.length;g+=1)r=r*10+m(n.charAt(g));return r},m=function(n){if("0"<=n&&n<="9")return n.charCodeAt(0)-48;throw"illegal char :"+n};return b},R=function(k){var A=e.MODE_ALPHA_NUM,w=k,b={};b.getMode=function(){return A},b.getLength=function(m){return w.length},b.write=function(m){for(var n=w,r=0;r+1<n.length;)m.put(a(n.charAt(r))*45+a(n.charAt(r+1)),11),r+=2;r<n.length&&m.put(a(n.charAt(r)),6)};var a=function(m){if("0"<=m&&m<="9")return m.charCodeAt(0)-48;if("A"<=m&&m<="Z")return m.charCodeAt(0)-65+10;switch(m){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+m}};return b},Y=function(k){var A=e.MODE_8BIT_BYTE,w=k,b=f.stringToBytes(k),a={};return a.getMode=function(){return A},a.getLength=function(m){return b.length},a.write=function(m){for(var n=0;n<b.length;n+=1)m.put(b[n],8)},a},Q=function(k){var A=e.MODE_KANJI,w=k,b=f.stringToBytesFuncs.SJIS;if(!b)throw"sjis not supported.";(function(n,r){var g=b(n);if(g.length!=2||(g[0]<<8|g[1])!=r)throw"sjis not supported."})("\u53CB",38726);var a=b(k),m={};return m.getMode=function(){return A},m.getLength=function(n){return~~(a.length/2)},m.write=function(n){for(var r=a,g=0;g+1<r.length;){var d=(255&r[g])<<8|255&r[g+1];if(33088<=d&&d<=40956)d-=33088;else if(57408<=d&&d<=60351)d-=49472;else throw"illegal char at "+(g+1)+"/"+d;d=(d>>>8&255)*192+(d&255),n.put(d,13),g+=2}if(g<r.length)throw"illegal char at "+(g+1)},m},V=function(){var k=[],A={};return A.writeByte=function(w){k.push(w&255)},A.writeShort=function(w){A.writeByte(w),A.writeByte(w>>>8)},A.writeBytes=function(w,b,a){b=b||0,a=a||w.length;for(var m=0;m<a;m+=1)A.writeByte(w[m+b])},A.writeString=function(w){for(var b=0;b<w.length;b+=1)A.writeByte(w.charCodeAt(b))},A.toByteArray=function(){return k},A.toString=function(){var w="";w+="[";for(var b=0;b<k.length;b+=1)b>0&&(w+=","),w+=k[b];return w+="]",w},A},te=function(){var k=0,A=0,w=0,b="",a={},m=function(r){b+=String.fromCharCode(n(r&63))},n=function(r){if(!(r<0)){if(r<26)return 65+r;if(r<52)return 97+(r-26);if(r<62)return 48+(r-52);if(r==62)return 43;if(r==63)return 47}throw"n:"+r};return a.writeByte=function(r){for(k=k<<8|r&255,A+=8,w+=1;A>=6;)m(k>>>A-6),A-=6},a.flush=function(){if(A>0&&(m(k<<6-A),k=0,A=0),w%3!=0)for(var r=3-w%3,g=0;g<r;g+=1)b+="="},a.toString=function(){return b},a},ce=function(k){var A=k,w=0,b=0,a=0,m={};m.read=function(){for(;a<8;){if(w>=A.length){if(a==0)return-1;throw"unexpected end of file./"+a}var r=A.charAt(w);if(w+=1,r=="=")return a=0,-1;if(r.match(/^\s$/))continue;b=b<<6|n(r.charCodeAt(0)),a+=6}var g=b>>>a-8&255;return a-=8,g};var n=function(r){if(65<=r&&r<=90)return r-65;if(97<=r&&r<=122)return r-97+26;if(48<=r&&r<=57)return r-48+52;if(r==43)return 62;if(r==47)return 63;throw"c:"+r};return m},de=function(k,A){var w=k,b=A,a=new Array(k*A),m={};m.setPixel=function(d,v,N){a[v*w+d]=N},m.write=function(d){d.writeString("GIF87a"),d.writeShort(w),d.writeShort(b),d.writeByte(128),d.writeByte(0),d.writeByte(0),d.writeByte(0),d.writeByte(0),d.writeByte(0),d.writeByte(255),d.writeByte(255),d.writeByte(255),d.writeString(","),d.writeShort(0),d.writeShort(0),d.writeShort(w),d.writeShort(b),d.writeByte(0);var v=2,N=r(v);d.writeByte(v);for(var B=0;N.length-B>255;)d.writeByte(255),d.writeBytes(N,B,255),B+=255;d.writeByte(N.length-B),d.writeBytes(N,B,N.length-B),d.writeByte(0),d.writeString(";")};var n=function(d){var v=d,N=0,B=0,M={};return M.write=function(L,U){if(L>>>U)throw"length over";for(;N+U>=8;)v.writeByte(255&(L<<N|B)),U-=8-N,L>>>=8-N,B=0,N=0;B=L<<N|B,N=N+U},M.flush=function(){N>0&&v.writeByte(B)},M},r=function(d){for(var v=1<<d,N=(1<<d)+1,B=d+1,M=g(),L=0;L<v;L+=1)M.add(String.fromCharCode(L));M.add(String.fromCharCode(v)),M.add(String.fromCharCode(N));var U=V(),H=n(U);H.write(v,B);var $=0,j=String.fromCharCode(a[$]);for($+=1;$<a.length;){var J=String.fromCharCode(a[$]);$+=1,M.contains(j+J)?j=j+J:(H.write(M.indexOf(j),B),M.size()<4095&&(M.size()==1<<B&&(B+=1),M.add(j+J)),j=J)}return H.write(M.indexOf(j),B),H.write(N,B),H.flush(),U.toByteArray()},g=function(){var d={},v=0,N={};return N.add=function(B){if(N.contains(B))throw"dup key:"+B;d[B]=v,v+=1},N.size=function(){return v},N.indexOf=function(B){return d[B]},N.contains=function(B){return typeof d[B]<"u"},N};return m},ie=function(k,A,w){for(var b=de(k,A),a=0;a<A;a+=1)for(var m=0;m<k;m+=1)b.setPixel(m,a,w(m,a));var n=V();b.write(n);for(var r=te(),g=n.toByteArray(),d=0;d<g.length;d+=1)r.writeByte(g[d]);return r.flush(),"data:image/gif;base64,"+r};return f})();(function(){Ce.stringToBytesFuncs["UTF-8"]=function(f){function e(t){for(var s=[],l=0;l<t.length;l++){var o=t.charCodeAt(l);o<128?s.push(o):o<2048?s.push(192|o>>6,128|o&63):o<55296||o>=57344?s.push(224|o>>12,128|o>>6&63,128|o&63):(l++,o=65536+((o&1023)<<10|t.charCodeAt(l)&1023),s.push(240|o>>18,128|o>>12&63,128|o>>6&63,128|o&63))}return s}return e(f)}})();(function(f){typeof define=="function"&&define.amd?define([],f):typeof Te=="object"&&(Ee.exports=f())})(function(){return Ce})});function pe(){let f=new Uint8Array(32);return crypto.getRandomValues(f),Array.from(f,e=>e.toString(16).padStart(2,"0")).join("")}var je="privasys.id";function xe(f){let e=btoa(f).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return`https://${je}/scp?p=${e}`}function ke(f){let e=f.sessionId??pe(),t={origin:f.rpId,sessionId:e,rpId:f.rpId,brokerUrl:f.brokerUrl};return f.requestedAttributes?.length&&(t.requestedAttributes=f.requestedAttributes),f.appName&&(t.appName=f.appName),f.privacyPolicyUrl&&(t.privacyPolicyUrl=f.privacyPolicyUrl),{sessionId:e,payload:xe(JSON.stringify(t))}}function Ae(f){let e=f.sessionId??pe(),t=f.apps.map(l=>({rpId:l.rpId,sessionId:l.sessionId??pe()})),s={origin:f.apps[0]?.rpId??"",sessionId:e,brokerUrl:f.brokerUrl,apps:t};return{sessionId:e,appSessions:t,payload:xe(JSON.stringify(s))}}var ue="privasys_sessions",fe="privasys_device_hints",G=class{constructor(){this.listeners=new Set}store(e){let t=this.getAll(),s=t.findIndex(l=>l.rpId===e.rpId);s>=0?t[s]=e:t.push(e),this.persist(t),this.notify(t)}get(e){return this.getAll().find(t=>t.rpId===e)}getAll(){try{let e=localStorage.getItem(ue);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}findPushToken(){let e=this.getAll().filter(t=>!!t.pushToken).sort((t,s)=>s.authenticatedAt-t.authenticatedAt);return e[0]?.pushToken?e[0].pushToken:this.getDeviceHint()?.pushToken}remove(e){let t=this.getAll().filter(s=>s.rpId!==e);this.persist(t),this.notify(t)}clear(){localStorage.removeItem(ue),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}saveDeviceHint(e,t){let s={pushToken:e,brokerUrl:t,updatedAt:Date.now()};try{localStorage.setItem(fe,JSON.stringify(s))}catch{}}getDeviceHint(){try{let e=localStorage.getItem(fe);return e?JSON.parse(e):void 0}catch{return}}clearDeviceHint(){localStorage.removeItem(fe)}persist(e){localStorage.setItem(ue,JSON.stringify(e))}notify(e){for(let t of this.listeners)t(e)}};var ge=12e4,ae=class{constructor(e,t={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:ge,...e},this.events=t,this.sessions=new G}createQR(e){return ke({rpId:this.config.rpId,brokerUrl:this.config.brokerUrl,sessionId:e,requestedAttributes:this.config.requestedAttributes,appName:this.config.appName,privacyPolicyUrl:this.config.privacyPolicyUrl})}waitForResult(e){return new Promise((t,s)=>{let l=this.config.timeout??ge,o=new URL(this.config.brokerUrl);o.searchParams.set("session",e),o.searchParams.set("role","browser");let I=new WebSocket(o.toString());this.activeConnections.set(e,I),this.setState("waiting-for-scan");let P=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),s(new Error("Authentication timed out"))},l);I.onopen=()=>{this.setState("waiting-for-scan")},I.onmessage=S=>{try{let _=JSON.parse(typeof S.data=="string"?S.data:"{}");this.handleMessage(e,_,t,P)}catch{}},I.onerror=()=>{clearTimeout(P),this.setState("error"),this.cleanup(e),s(new Error("WebSocket connection failed"))},I.onclose=S=>{clearTimeout(P),this.cleanup(e),S.code!==1e3&&(this.setState("error"),s(new Error(`Connection closed (code ${S.code})`)))}})}async notifyAndWait(e,t){let s=t??this.createQR().sessionId,l=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),o=await fetch(`${l}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:s,rpId:this.config.rpId,appName:this.config.appName,origin:this.config.rpId,brokerUrl:this.config.brokerUrl})});if(!o.ok){let I=await o.text();throw new Error(`Push notification failed: ${I}`)}return this.waitForResult(s)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:t,appSessions:s,payload:l}=Ae({brokerUrl:this.config.brokerUrl,apps:e.map(I=>({rpId:I.rpId}))}),o=this.waitForBatch(s);return{sessionId:t,appSessions:s,payload:l,result:o}}on(e){this.events={...this.events,...e}}handleMessage(e,t,s,l){switch(t.type){case"peer-joined":case"wallet-waiting":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(l),this.setState("complete");let o={sessionToken:t.sessionToken,sessionId:e,attestation:t.attestation,pushToken:t.pushToken||void 0,attributes:t.attributes||void 0};this.sessions.store({token:o.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now(),pushToken:o.pushToken,brokerUrl:this.config.brokerUrl}),this.events.onAuthenticated?.(o),this.cleanup(e),s(o);break}case"auth-error":{clearTimeout(l),this.setState("error"),this.cleanup(e);let o=new Error(t.message??"Authentication failed");this.events.onError?.(o);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let t=this.config.timeout??ge;this.setState("waiting-for-scan");let s=await Promise.allSettled(e.map(I=>Promise.race([this.waitForResult(I.sessionId),new Promise((P,S)=>setTimeout(()=>S(new Error("Batch item timed out")),t))]))),l=[],o=[];for(let I=0;I<s.length;I++){let P=s[I];P.status==="fulfilled"?l.push(P.value):o.push({rpId:e[I].rpId,error:P.reason instanceof Error?P.reason.message:String(P.reason)})}return this.setState(o.length===0?"complete":"error"),{results:l,errors:o}}cleanup(e){let t=this.activeConnections.get(e);t&&((t.readyState===WebSocket.OPEN||t.readyState===WebSocket.CONNECTING)&&t.close(1e3),this.activeConnections.delete(e))}};function K(f){let e=new Uint8Array(f),t="";for(let s=0;s<e.length;s++)t+=String.fromCharCode(e[s]);return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function re(f){let e=f.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let t=atob(e),s=new Uint8Array(t.length);for(let l=0;l<t.length;l++)s[l]=t.charCodeAt(l);return s.buffer}function Ie(f){let e=new Uint8Array(f);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}var ee=class{constructor(e,t={}){this.state="idle";this.config={timeout:6e4,...e},this.events=t,this.sessions=new G}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let t=K(crypto.getRandomValues(new Uint8Array(32)).buffer),s=this.config.sessionId??Ie(16),o=(await this.fido2Fetch("register/begin",{userName:e??globalThis.location?.hostname??"user",userHandle:t},{session_id:s})).publicKey;if(!o)throw new Error("Missing publicKey in registration options");let I={publicKey:{challenge:re(o.challenge),rp:{id:o.rp.id,name:o.rp.name},user:{id:re(o.user.id),name:o.user.name,displayName:o.user.displayName??o.user.name},pubKeyCredParams:(o.pubKeyCredParams??[]).map(R=>({type:R.type??"public-key",alg:R.alg})),timeout:this.config.timeout,attestation:o.attestation??"none",authenticatorSelection:{authenticatorAttachment:"platform",residentKey:o.authenticatorSelection?.residentKey??"preferred",userVerification:o.authenticatorSelection?.userVerification??"preferred"},...o.excludeCredentials?{excludeCredentials:o.excludeCredentials.map(R=>({type:"public-key",id:re(R.id)}))}:{}}};this.setState("ceremony");let P=await navigator.credentials.create(I);if(!P)throw new Error("No credential returned");this.setState("verifying");let S=P.response,_=await this.fido2Fetch("register/complete",{id:K(P.rawId),rawId:K(P.rawId),type:"public-key",response:{attestationObject:K(S.attestationObject),clientDataJSON:K(S.clientDataJSON)}},{challenge:o.challenge});return this.complete(_.sessionToken??"",s)}catch(t){return this.fail(t)}}async authenticate(){this.setState("requesting-options");try{let e=this.config.sessionId??Ie(16),s=(await this.fido2Fetch("authenticate/begin",{},{session_id:e})).publicKey;if(!s)throw new Error("Missing publicKey in authentication options");let l={publicKey:{challenge:re(s.challenge),rpId:s.rpId,timeout:this.config.timeout,userVerification:s.userVerification??"preferred",...s.allowCredentials?.length?{allowCredentials:s.allowCredentials.map(S=>({type:"public-key",id:re(S.id),...S.transports?.length?{transports:S.transports}:{}}))}:{}}};this.setState("ceremony");let o=await navigator.credentials.get(l);if(!o)throw new Error("No assertion returned");this.setState("verifying");let I=o.response,P=await this.fido2Fetch("authenticate/complete",{id:K(o.rawId),rawId:K(o.rawId),type:"public-key",response:{clientDataJSON:K(I.clientDataJSON),authenticatorData:K(I.authenticatorData),signature:K(I.signature)}},{challenge:s.challenge});return this.complete(P.sessionToken??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e,t,s){let l=(this.config.fido2Base??this.config.apiBase).replace(/\/+$/,""),o=this.config.fido2Base?new URL(`${l}/${e}`):new URL(`${l}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2/${e}`);if(s)for(let[P,S]of Object.entries(s))o.searchParams.set(P,S);let I=await fetch(o.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!I.ok){let P=await I.json().catch(()=>({error:I.statusText}));throw new Error(P.error??`HTTP ${I.status}`)}return I.json()}complete(e,t){this.setState("complete");let s={sessionToken:e,sessionId:t};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(s),s}fail(e){this.setState("error");let t=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(t),t}setState(e){this.state=e,this.events.onStateChange?.(e)}};var Be=$e(Se(),1),We=`
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
`,ve='<svg viewBox="0 0 500 500"><style>.ld{fill:#fff}@media(prefers-color-scheme:dark){.ld{fill:#2a2a2a}}</style><defs><linearGradient id="pg" y2="1"><stop offset="21%" stop-color="#34E89E"/><stop offset="42%" stop-color="#12B06E"/></linearGradient><linearGradient id="pb" x1="1" y1="1" x2="0" y2="0"><stop offset="21%" stop-color="#00BCF2"/><stop offset="42%" stop-color="#00A0EB"/></linearGradient></defs><path d="M100 0H450L0 450V100A100 100 0 0 1 100 0Z" fill="url(#pg)"/><path d="M500 50V400A100 100 0 0 1 400 500H50L500 50Z" fill="url(#pb)"/><polygon class="ld" points="0,500 50,500 500,50 500,0"/></svg>',Ne='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="7.5" r="3"/><path d="M10.5 13c-3.3 0-6 2-6 4.5V19h12v-1.5c0-1-.4-2-1-2.7"/><line x1="18" y1="12" x2="18" y2="18"/><line x1="15" y1="15" x2="21" y2="15"/></svg>';var qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',Ke='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',Qe='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>',ze='<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',Ve='<svg viewBox="0 0 24 24"><rect fill="#F25022" x="2" y="2" width="9.5" height="9.5"/><rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5"/><rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5"/><rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5"/></svg>',Je='<svg viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',Ge='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',Ye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';var Xe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';function y(f,e,...t){let s=document.createElement(f);if(e!=null)for(let[l,o]of Object.entries(e))l==="className"?s.className=o:l.startsWith("on")&&typeof o=="function"?s.addEventListener(l.slice(2).toLowerCase(),o):l==="html"?s.innerHTML=o:o===!1||o==null||(o===!0?s.setAttribute(l,""):s.setAttribute(l,String(o)));for(let l of t.flat(1/0))l==null||l===!1||s.appendChild(typeof l=="string"?document.createTextNode(l):l);return s}function Ze(f){try{let e=(0,Be.default)(0,"M");e.addData(f),e.make();let t=e.getModuleCount(),s=Math.max(3,Math.floor(200/t));return e.createSvgTag({cellSize:s,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${f}</div>`}}var ne=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,t)=>{this.resolve=e,this.reject=t,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.attributes=void 0,this.mount(),this.cfg.pushToken?this.startPush():this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=We,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let t=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,P=>P.toUpperCase()),s=this.state==="idle",l;switch(this.state){case"qr-scanning":l="Open Privasys Wallet on your phone and scan the QR code displayed on the right to authenticate.";break;case"push-waiting":l="Check your phone \u2014 tap the notification from Privasys ID to approve this sign-in.";break;case"wallet-connected":case"authenticating":l="Verifying your identity\u2026 This will only take a moment.";break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":l="Complete the biometric prompt on your device to verify your identity.";break;case"success":l="";break;case"error":l="Something went wrong. You can try again or choose a different method.";break;default:l=`<strong>${t}</strong> needs to verify your identity. Please choose one of the authentication options.`}let o;switch(this.state){case"push-waiting":o=this.renderPushWaiting();break;case"qr-scanning":o=this.renderQR();break;case"wallet-connected":case"authenticating":o=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":o=this.renderPasskeyProgress();break;case"success":o=this.renderSuccess();break;case"error":o=this.renderError();break;default:o=this.renderIdle()}let I=y("div",{className:"page"},y("button",{className:"btn-close",html:Ge,onClick:()=>this.handleCancel()}),y("div",{className:"brand-panel"},y("div",{className:"brand-panel-header"},y("div",{className:"brand-panel-logo",html:ve}),y("div",{className:"brand-panel-name"},"Privasys")),l?y("p",{className:"brand-panel-desc",html:l}):null,this.isFlowState()?this.renderBrandProgress():null),y("div",{className:`auth-panel${s?"":" auth-panel--centered"}`},!s&&this.state!=="success"?y("button",{className:"btn-back",onClick:()=>this.goBack()},y("span",{html:Xe}),"Back"):null,this.isFlowState()?y("div",{className:"mobile-progress-header"},this.renderBrandProgress()):null,o),y("div",{className:"footer"},"By continuing, you agree to the ",y("a",{href:"https://privasys.org/legal/terms",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Terms of Service")," and ",y("a",{href:"https://privasys.org/legal/privacy",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Privacy Policy"),"."));this.shadow.appendChild(I)}goBack(){this.cleanup(),this.state="idle",this.errorMsg="",this.render()}renderIdle(){let e=ee.isSupported(),t=!!this.cfg.pushToken,s=this.cfg.socialProviders??[],l=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,_=>_.toUpperCase()),o=[];t&&o.push(y("button",{className:"btn-provider primary",onClick:()=>this.startPush()},y("span",{html:Ke}),y("span",{className:"btn-label"},"Sign in with Privasys ID"),y("span",{className:"btn-hint"},"Notification"))),o.push(y("button",{className:`btn-provider ${t?"":"primary"}`,onClick:()=>this.startWallet()},y("span",{html:ve}),y("span",{className:"btn-label"},t?"Scan QR code instead":"Continue with Privasys ID"))),(e||s.length>0)&&o.push(y("div",{className:"divider"},y("span",null,"or"))),e&&o.push(y("button",{className:"btn-provider",onClick:()=>this.startPasskey("authenticate")},y("span",{html:Ne}),y("span",{className:"btn-label"},"Passkey"),y("span",{className:"btn-hint"},"Face ID, Touch ID, Windows Hello")));let P={github:Qe,google:ze,microsoft:Ve,linkedin:Je},S={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"};for(let _ of s){let R=P[_]??"",Y=S[_]??_;o.push(y("button",{className:"btn-provider",onClick:()=>this.startSocial(_)},R?y("span",{html:R}):null,y("span",{className:"btn-label"},Y)))}return y("div",null,y("h2",{className:"auth-panel-heading"},`Sign in to ${l}`),...o)}renderQR(){let e=this.getRelayClient(),{payload:t}=e.createQR(this.sessionId);return y("div",null,y("div",{className:"qr-section"},y("div",{className:"qr-frame",html:Ze(t)}),y("div",{className:"scan-label"},y("span",{className:"pulse"}),"Scan with Privasys Wallet")))}renderPushWaiting(){let e=ee.isSupported();return y("div",null,y("p",{className:"btn-provider",style:"margin-bottom: 20px; max-width: none; text-align: center;"},"Check your phone \u2014 tap the notification to approve this connection."),y("div",{className:"divider"},y("span",null,"or")),y("div",{className:"alt-actions"},y("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startWallet()}},y("span",{html:ve}),y("span",{className:"btn-label"},"Scan QR code instead")),e?y("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startPasskey("authenticate")}},y("span",{html:Ne}),y("span",{className:"btn-label"},"Passkey")):null))}renderWalletProgress(){return y("div",null,y("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},"Verifying your identity\u2026 This will only take a moment."))}renderPasskeyProgress(){let t=this.state==="passkey-requesting"?"Preparing\u2026":"Complete the biometric prompt on your device.";return y("div",null,y("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},t))}isFlowState(){return["push-waiting","qr-scanning","wallet-connected","authenticating","passkey-requesting","passkey-ceremony","passkey-verifying","success"].includes(this.state)}renderBrandProgress(){let e=this.state==="success",t=this.method==="wallet"?"Privasys ID":"Passkey",s=this.method==="wallet"&&this.attestation?.valid,l=this.method==="passkey"?"This device":s?"Attestation verified":null,o;if(this.method==="passkey"){let I=this.state;o=y("div",{className:"steps"},y("div",{className:`step ${I!=="passkey-requesting"?"done":"active"}`},y("span",{className:"step-icon"},I!=="passkey-requesting"?"\u2713":"\u2022"),"Options received from enclave"),y("div",{className:`step ${I==="passkey-ceremony"?"active":I==="passkey-verifying"||e?"done":""}`},y("span",{className:"step-icon"},I==="passkey-verifying"||e?"\u2713":"\u2022"),"Biometric prompt completed"),y("div",{className:`step ${I==="passkey-verifying"?"active":e?"done":""}`},y("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Enclave verification"),y("div",{className:`step ${e?"done":""}`},y("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}else{let I=!!this.cfg.pushToken,P=["wallet-connected","authenticating","success"].includes(this.state),S=this.state==="authenticating"||e,_=I?["push-waiting","wallet-connected","authenticating","success"].includes(this.state):P||S,R=!_&&this.state==="qr-scanning",Y=I?"Notification sent":"QR code scanned",Q=I?"Approved on Privasys ID":"Server attestation verified",V=I&&this.state==="push-waiting"||P&&!S;o=y("div",{className:"steps"},y("div",{className:`step ${_?"done":R?"active":""}`},y("span",{className:"step-icon"},_?"\u2713":"\u2022"),Y),y("div",{className:`step ${V?"active":S?"done":""}`},y("span",{className:"step-icon"},S?"\u2713":"\u2022"),Q),y("div",{className:`step ${this.state==="authenticating"?"active":e?"done":""}`},y("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Biometric authentication"),y("div",{className:`step ${e?"done":""}`},y("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}return e&&o.appendChild(y("div",{className:"step done"},y("span",{className:"step-icon"},"\u2713"),`Authenticated via ${t}`)),y("div",{className:"brand-progress"},o)}renderSuccess(){let e=!!this.pushToken&&!this.cfg.deviceTrusted,t=this.method==="wallet"?"Privasys ID":"Passkey",s=this.method==="wallet"&&this.attestation?.valid,l=this.method==="passkey"?"This device":s?"Attestation verified":null;return y("div",null,e?y("div",{style:"width: 100%;"},y("p",{style:"font-size: 14px; font-weight: 500; margin-bottom: 6px;"},"Trust this device?"),y("p",{className:"scan-hint",style:"margin-bottom: 16px; max-width: none;"},"Next time, we\u2019ll send a notification to your phone instead of showing a QR code."),y("button",{className:"btn-provider primary",onClick:()=>this.finishWithTrust(!0)},y("span",{html:Ye}),y("span",{className:"btn-label"},"Trust this device")),y("button",{className:"link-btn",style:"margin-top: 12px; font-size: 13px; display: block; text-align: center; width: 100%;",onClick:()=>this.finishWithTrust(!1)},"Not now")):y("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return y("div",null,y("div",{className:"error-icon",html:qe}),y("div",{className:"error-title"},"Authentication failed"),y("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),y("button",{className:"btn-retry",onClick:()=>{this.errorMsg="",this.state="idle",this.render()}},"Try again"))}startPush(){this.method="wallet";let e=this.getRelayClient();this.state="push-waiting",this.render(),e.notifyAndWait(this.cfg.pushToken).then(t=>{this.sessionToken=t.sessionToken,this.attestation=t.attestation,this.sessionId=t.sessionId,this.pushToken=t.pushToken,this.attributes=t.attributes,this.complete()},t=>{this.state="error",this.errorMsg=t?.message??"Push authentication failed",this.render()})}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:t}=e.createQR(this.cfg.sessionId);this.sessionId=t,this.state="qr-scanning",this.render(),e.waitForResult(t).then(s=>{this.sessionToken=s.sessionToken,this.attestation=s.attestation,this.sessionId=s.sessionId,this.pushToken=s.pushToken,this.attributes=s.attributes,this.complete()},s=>{this.state="error",this.errorMsg=s?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let t=this.getWebAuthnClient();try{let s;if(e==="register")s=await t.register(globalThis.location?.hostname??"user");else try{s=await t.authenticate()}catch(l){if(l?.message?.includes("no credentials")||l?.message?.includes("not found"))this.state="passkey-requesting",this.render(),s=await t.register(globalThis.location?.hostname??"user");else throw l}this.sessionToken=s.sessionToken,this.sessionId=s.sessionId,this.complete()}catch(s){this.state="error",this.errorMsg=s?.message??"Passkey authentication failed",this.render()}}async startSocial(e){if(this.cfg.onSocialAuth){this.state="authenticating",this.render();try{await this.cfg.onSocialAuth(e),this.method="wallet",this.sessionToken="",this.sessionId=this.cfg.sessionId??"",this.complete()}catch(t){this.state="error",this.errorMsg=t?.message??`${e} authentication failed`,this.render()}}}complete(){this.state="success",this.render(),(!this.pushToken||this.cfg.deviceTrusted)&&setTimeout(()=>this.finishWithTrust(!1),1200)}finishWithTrust(e){let t={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId,pushToken:this.pushToken,attributes:this.attributes,trustDevice:e};this.close(),this.resolve?.(t),this.resolve=null,this.reject=null}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new ae({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout,requestedAttributes:this.cfg.requestedAttributes,appName:this.cfg.appName,privacyPolicyUrl:this.cfg.privacyPolicyUrl},{onStateChange:e=>{let t={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};if(t[e]){if(this.state==="push-waiting"&&e==="waiting-for-scan")return;this.state=t[e],this.render()}}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new ee({apiBase:this.cfg.apiBase,appName:this.cfg.appName,sessionId:this.cfg.sessionId,fido2Base:this.cfg.fido2Base},{onStateChange:e=>{let t={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};t[e]&&(this.state=t[e],this.render())}})),this.webauthnClient}};var O=new G,z=null,et=780*1e3,se=new Map;function Pe(f){let e=se.get(f);e&&(clearTimeout(e),se.delete(f))}function le(f,e){if(Pe(f.rpId),!f.refreshToken||!f.clientId)return;let t=setTimeout(async()=>{se.delete(f.rpId);let s=O.get(f.rpId);if(!(!s?.refreshToken||!s?.clientId))try{await _e(s,e);let l=O.get(f.rpId);l&&le(l,e)}catch(l){console.warn("[frame-host] renewal failed, expiring session:",l),O.remove(f.rpId),window.parent.postMessage({type:"privasys:session-expired",rpId:f.rpId},e)}},et);se.set(f.rpId,t)}async function _e(f,e,t=!0){let s=globalThis.location.origin,l=await fetch(`${s}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:f.refreshToken,client_id:f.clientId})});if(!l.ok){let I=await l.json().catch(()=>({error:l.statusText}));throw new Error(I.error_description||I.error||`Refresh failed: ${l.status}`)}let o=await l.json();O.store({...f,token:o.access_token,refreshToken:o.refresh_token,authenticatedAt:Date.now()}),t&&window.parent.postMessage({type:"privasys:session-renewed",rpId:f.rpId,accessToken:o.access_token},e)}function tt(f,e=3e4){try{let t=JSON.parse(atob(f.split(".")[1]));return typeof t.exp!="number"?!1:t.exp*1e3-e<Date.now()}catch{return!1}}async function rt(){let f=new Uint8Array(32);crypto.getRandomValues(f);let e=Array.from(f,l=>l.toString(16).padStart(2,"0")).join(""),t=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(e)),s=btoa(String.fromCharCode(...new Uint8Array(t))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return{codeVerifier:e,codeChallenge:s}}async function nt(f,e=12e4){let t=Date.now()+e;for(;Date.now()<t;){let s=await fetch(f);if(!s.ok)throw new Error(`poll failed: ${s.status}`);let l=await s.json();if(l.authenticated&&l.redirect_uri){let I=new URL(l.redirect_uri,globalThis.location.origin).searchParams.get("code");if(I)return I}await new Promise(o=>setTimeout(o,1500))}throw new Error("OIDC session timed out")}async function st(f,e,t){let s=await fetch(`${f}/session/complete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,user_id:t?.sub||"",attributes:t||{}})});if(!s.ok){let o=await s.json().catch(()=>({error:s.statusText}));throw new Error(o.error_description||o.error||`Session complete failed: ${s.status}`)}let l=await s.json();if(!l.code)throw new Error("No authorization code returned");return l.code}async function it(f,e,t,s){let l=await fetch(`${f}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code:e,client_id:t,code_verifier:s})});if(!l.ok){let o=await l.json().catch(()=>({error:l.statusText}));throw new Error(o.error_description||o.error||`Token exchange failed: ${l.status}`)}return l.json()}window.addEventListener("message",async f=>{let e=f.data;if(!(!e||typeof e.type!="string")){if(e.type==="privasys:init"){let t=e.config,s=f.origin;z&&(z.destroy(),z=null);let l=globalThis.location.origin,o=t.clientId;if(o){try{let{codeVerifier:S,codeChallenge:_}=await rt(),R=new URL("/authorize",l);R.searchParams.set("client_id",o),R.searchParams.set("response_type","code"),R.searchParams.set("code_challenge",_),R.searchParams.set("code_challenge_method","S256");let Y=Array.isArray(t.scope)?t.scope.join(" "):t.scope||"openid offline_access";R.searchParams.set("scope",Y),R.searchParams.set("response_mode","json");let Q=await fetch(R.toString(),{headers:{Accept:"application/json"}});if(!Q.ok){let g=await Q.json().catch(()=>({error:Q.statusText}));throw new Error(g.error_description||g.error||`Authorize failed: ${Q.status}`)}let V=await Q.json(),te=V.session_id,ce=V.poll_url,de=V.requested_attributes,ie=[];try{let g=await fetch(`${l}/auth/social/providers`);g.ok&&(ie=(await g.json()).providers??[])}catch{}let k=O.findPushToken(),A=!!O.getDeviceHint(),w=g=>new Promise((d,v)=>{let M=window.screenX+(window.innerWidth-500)/2,L=window.screenY+(window.innerHeight-650)/2,U=`${l}/auth/social?provider=${encodeURIComponent(g)}&session_id=${encodeURIComponent(te)}`,H=window.open(U,"privasys-social",`width=500,height=650,left=${M},top=${L}`);if(!H){v(new Error("Popup blocked \u2014 please allow popups for this site"));return}let $=()=>{window.removeEventListener("message",j),clearInterval(J)},j=X=>{X.source===H&&(X.data?.type==="privasys:social-complete"?($(),H.close(),d()):X.data?.type==="privasys:social-error"&&($(),H.close(),v(new Error(X.data.error||"Social authentication failed"))))};window.addEventListener("message",j);let J=setInterval(()=>{H.closed&&($(),v(new Error("Authentication cancelled")))},500)});z=new ne({...t,apiBase:l,sessionId:te,fido2Base:`${l}/fido2`,pushToken:k,deviceTrusted:A,socialProviders:ie,onSocialAuth:w,requestedAttributes:de});let b=await z.signIn(),a;b.method==="passkey"?a=await nt(ce):a=await st(l,te,b.attributes);let m=await it(l,a,o,S),n=t.rpId||t.appName,r={token:m.access_token,rpId:n,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:b.pushToken,brokerUrl:t.brokerUrl||"",refreshToken:m.refresh_token,clientId:o};O.store(r),r.pushToken&&r.brokerUrl&&(b.trustDevice||A)&&O.saveDeviceHint(r.pushToken,r.brokerUrl),le(r,s),window.parent.postMessage({type:"privasys:result",result:{...b,accessToken:m.access_token}},s)}catch(S){let _=S instanceof Error?S.message:"Authentication failed";_==="Authentication cancelled"||_==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},s):window.parent.postMessage({type:"privasys:error",error:_},s)}finally{z=null}return}let I=O.findPushToken(),P=!!O.getDeviceHint();z=new ne({...t,pushToken:I,deviceTrusted:P});try{let S=await z.signIn(),_=t.brokerUrl||"",R={token:S.sessionToken,rpId:t.rpId||t.appName,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:S.pushToken,brokerUrl:_};O.store(R),R.pushToken&&R.brokerUrl&&((S.trustDevice||P)&&O.saveDeviceHint(R.pushToken,R.brokerUrl),le(R,s)),window.parent.postMessage({type:"privasys:result",result:S},s)}catch(S){let _=S instanceof Error?S.message:"Authentication failed";_==="Authentication cancelled"||_==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},s):window.parent.postMessage({type:"privasys:error",error:_},s)}finally{z=null}}if(e.type==="privasys:check-session"){let t=O.get(e.rpId);if(t?.token&&t?.refreshToken&&t?.clientId&&tt(t.token))try{await _e(t,f.origin,!1),t=O.get(e.rpId)}catch{O.remove(e.rpId),t=void 0}t?.refreshToken&&t?.clientId&&!se.has(t.rpId)&&le(t,f.origin),window.parent.postMessage({type:"privasys:session",session:t||null},f.origin)}e.type==="privasys:clear-session"&&(Pe(e.rpId),O.remove(e.rpId),O.clearDeviceHint(),window.parent.postMessage({type:"privasys:session-cleared"},f.origin))}});window.parent.postMessage({type:"privasys:ready"},"*");})();
//# sourceMappingURL=privasys-auth-frame.iife.js.map
