"use strict";(()=>{var De=Object.create;var we=Object.defineProperty;var Le=Object.getOwnPropertyDescriptor;var Ue=Object.getOwnPropertyNames;var Fe=Object.getPrototypeOf,Oe=Object.prototype.hasOwnProperty;var He=(u,e)=>()=>(e||u((e={exports:{}}).exports,e),e.exports);var $e=(u,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let a of Ue(e))!Oe.call(u,a)&&a!==t&&we(u,a,{get:()=>e[a],enumerable:!(s=Le(e,a))||s.enumerable});return u};var We=(u,e,t)=>(t=u!=null?De(Fe(u)):{},$e(e||!u||!u.__esModule?we(t,"default",{value:u,enumerable:!0}):t,u));var Ne=He((Ee,Se)=>{var Te=(function(){var u=function(x,A){var w=236,m=17,l=x,y=t[A],n=null,r=0,g=null,c=[],v={},B=function(d,p){r=l*4+17,n=(function(i){for(var h=new Array(i),f=0;f<i;f+=1){h[f]=new Array(i);for(var k=0;k<i;k+=1)h[f][k]=null}return h})(r),P(0,0),P(r-7,0),P(0,r-7),O(),L(),j(d,p),l>=7&&$(d),g==null&&(g=te(l,y,c)),K(g,p)},P=function(d,p){for(var i=-1;i<=7;i+=1)if(!(d+i<=-1||r<=d+i))for(var h=-1;h<=7;h+=1)p+h<=-1||r<=p+h||(0<=i&&i<=6&&(h==0||h==6)||0<=h&&h<=6&&(i==0||i==6)||2<=i&&i<=4&&2<=h&&h<=4?n[d+i][p+h]=!0:n[d+i][p+h]=!1)},M=function(){for(var d=0,p=0,i=0;i<8;i+=1){B(!0,i);var h=a.getLostPoint(v);(i==0||d>h)&&(d=h,p=i)}return p},L=function(){for(var d=8;d<r-8;d+=1)n[d][6]==null&&(n[d][6]=d%2==0);for(var p=8;p<r-8;p+=1)n[6][p]==null&&(n[6][p]=p%2==0)},O=function(){for(var d=a.getPatternPosition(l),p=0;p<d.length;p+=1)for(var i=0;i<d.length;i+=1){var h=d[p],f=d[i];if(n[h][f]==null)for(var k=-2;k<=2;k+=1)for(var T=-2;T<=2;T+=1)k==-2||k==2||T==-2||T==2||k==0&&T==0?n[h+k][f+T]=!0:n[h+k][f+T]=!1}},$=function(d){for(var p=a.getBCHTypeNumber(l),i=0;i<18;i+=1){var h=!d&&(p>>i&1)==1;n[Math.floor(i/3)][i%3+r-8-3]=h}for(var i=0;i<18;i+=1){var h=!d&&(p>>i&1)==1;n[i%3+r-8-3][Math.floor(i/3)]=h}},j=function(d,p){for(var i=y<<3|p,h=a.getBCHTypeInfo(i),f=0;f<15;f+=1){var k=!d&&(h>>f&1)==1;f<6?n[f][8]=k:f<8?n[f+1][8]=k:n[r-15+f][8]=k}for(var f=0;f<15;f+=1){var k=!d&&(h>>f&1)==1;f<8?n[8][r-f-1]=k:f<9?n[8][15-f-1+1]=k:n[8][15-f-1]=k}n[r-8][8]=!d},K=function(d,p){for(var i=-1,h=r-1,f=7,k=0,T=a.getMaskFunction(p),C=r-1;C>0;C-=2)for(C==6&&(C-=1);;){for(var D=0;D<2;D+=1)if(n[h][C-D]==null){var F=!1;k<d.length&&(F=(d[k]>>>f&1)==1);var E=T(h,C-D);E&&(F=!F),n[h][C-D]=F,f-=1,f==-1&&(k+=1,f=7)}if(h+=i,h<0||r<=h){h-=i,i=-i;break}}},X=function(d,p){for(var i=0,h=0,f=0,k=new Array(p.length),T=new Array(p.length),C=0;C<p.length;C+=1){var D=p[C].dataCount,F=p[C].totalCount-D;h=Math.max(h,D),f=Math.max(f,F),k[C]=new Array(D);for(var E=0;E<k[C].length;E+=1)k[C][E]=255&d.getBuffer()[E+i];i+=D;var z=a.getErrorCorrectPolynomial(F),Q=I(k[C],z.getLength()-1),me=Q.mod(z);T[C]=new Array(z.getLength()-1);for(var E=0;E<T[C].length;E+=1){var ye=E+me.getLength()-T[C].length;T[C][E]=ye>=0?me.getAt(ye):0}}for(var be=0,E=0;E<p.length;E+=1)be+=p[E].totalCount;for(var pe=new Array(be),le=0,E=0;E<h;E+=1)for(var C=0;C<p.length;C+=1)E<k[C].length&&(pe[le]=k[C][E],le+=1);for(var E=0;E<f;E+=1)for(var C=0;C<p.length;C+=1)E<T[C].length&&(pe[le]=T[C][E],le+=1);return pe},te=function(d,p,i){for(var h=N.getRSBlocks(d,p),f=S(),k=0;k<i.length;k+=1){var T=i[k];f.put(T.getMode(),4),f.put(T.getLength(),a.getLengthInBits(T.getMode(),d)),T.write(f)}for(var C=0,k=0;k<h.length;k+=1)C+=h[k].dataCount;if(f.getLengthInBits()>C*8)throw"code length overflow. ("+f.getLengthInBits()+">"+C*8+")";for(f.getLengthInBits()+4<=C*8&&f.put(0,4);f.getLengthInBits()%8!=0;)f.putBit(!1);for(;!(f.getLengthInBits()>=C*8||(f.put(w,8),f.getLengthInBits()>=C*8));)f.put(m,8);return X(f,h)};v.addData=function(d,p){p=p||"Byte";var i=null;switch(p){case"Numeric":i=_(d);break;case"Alphanumeric":i=R(d);break;case"Byte":i=W(d);break;case"Kanji":i=U(d);break;default:throw"mode:"+p}c.push(i),g=null},v.isDark=function(d,p){if(d<0||r<=d||p<0||r<=p)throw d+","+p;return n[d][p]},v.getModuleCount=function(){return r},v.make=function(){if(l<1){for(var d=1;d<40;d++){for(var p=N.getRSBlocks(d,y),i=S(),h=0;h<c.length;h++){var f=c[h];i.put(f.getMode(),4),i.put(f.getLength(),a.getLengthInBits(f.getMode(),d)),f.write(i)}for(var k=0,h=0;h<p.length;h++)k+=p[h].dataCount;if(i.getLengthInBits()<=k*8)break}l=d}B(!1,M())},v.createTableTag=function(d,p){d=d||2,p=typeof p>"u"?d*4:p;var i="";i+='<table style="',i+=" border-width: 0px; border-style: none;",i+=" border-collapse: collapse;",i+=" padding: 0px; margin: "+p+"px;",i+='">',i+="<tbody>";for(var h=0;h<v.getModuleCount();h+=1){i+="<tr>";for(var f=0;f<v.getModuleCount();f+=1)i+='<td style="',i+=" border-width: 0px; border-style: none;",i+=" border-collapse: collapse;",i+=" padding: 0px; margin: 0px;",i+=" width: "+d+"px;",i+=" height: "+d+"px;",i+=" background-color: ",i+=v.isDark(h,f)?"#000000":"#ffffff",i+=";",i+='"/>';i+="</tr>"}return i+="</tbody>",i+="</table>",i},v.createSvgTag=function(d,p,i,h){var f={};typeof arguments[0]=="object"&&(f=arguments[0],d=f.cellSize,p=f.margin,i=f.alt,h=f.title),d=d||2,p=typeof p>"u"?d*4:p,i=typeof i=="string"?{text:i}:i||{},i.text=i.text||null,i.id=i.text?i.id||"qrcode-description":null,h=typeof h=="string"?{text:h}:h||{},h.text=h.text||null,h.id=h.text?h.id||"qrcode-title":null;var k=v.getModuleCount()*d+p*2,T,C,D,F,E="",z;for(z="l"+d+",0 0,"+d+" -"+d+",0 0,-"+d+"z ",E+='<svg version="1.1" xmlns="http://www.w3.org/2000/svg"',E+=f.scalable?"":' width="'+k+'px" height="'+k+'px"',E+=' viewBox="0 0 '+k+" "+k+'" ',E+=' preserveAspectRatio="xMinYMin meet"',E+=h.text||i.text?' role="img" aria-labelledby="'+re([h.id,i.id].join(" ").trim())+'"':"",E+=">",E+=h.text?'<title id="'+re(h.id)+'">'+re(h.text)+"</title>":"",E+=i.text?'<description id="'+re(i.id)+'">'+re(i.text)+"</description>":"",E+='<rect width="100%" height="100%" fill="white" cx="0" cy="0"/>',E+='<path d="',D=0;D<v.getModuleCount();D+=1)for(F=D*d+p,T=0;T<v.getModuleCount();T+=1)v.isDark(D,T)&&(C=T*d+p,E+="M"+C+","+F+z);return E+='" stroke="transparent" fill="black"/>',E+="</svg>",E},v.createDataURL=function(d,p){d=d||2,p=typeof p>"u"?d*4:p;var i=v.getModuleCount()*d+p*2,h=p,f=i-p;return q(i,i,function(k,T){if(h<=k&&k<f&&h<=T&&T<f){var C=Math.floor((k-h)/d),D=Math.floor((T-h)/d);return v.isDark(D,C)?0:1}else return 1})},v.createImgTag=function(d,p,i){d=d||2,p=typeof p>"u"?d*4:p;var h=v.getModuleCount()*d+p*2,f="";return f+="<img",f+=' src="',f+=v.createDataURL(d,p),f+='"',f+=' width="',f+=h,f+='"',f+=' height="',f+=h,f+='"',i&&(f+=' alt="',f+=re(i),f+='"'),f+="/>",f};var re=function(d){for(var p="",i=0;i<d.length;i+=1){var h=d.charAt(i);switch(h){case"<":p+="&lt;";break;case">":p+="&gt;";break;case"&":p+="&amp;";break;case'"':p+="&quot;";break;default:p+=h;break}}return p},Re=function(d){var p=1;d=typeof d>"u"?p*2:d;var i=v.getModuleCount()*p+d*2,h=d,f=i-d,k,T,C,D,F,E={"\u2588\u2588":"\u2588","\u2588 ":"\u2580"," \u2588":"\u2584","  ":" "},z={"\u2588\u2588":"\u2580","\u2588 ":"\u2580"," \u2588":" ","  ":" "},Q="";for(k=0;k<i;k+=2){for(C=Math.floor((k-h)/p),D=Math.floor((k+1-h)/p),T=0;T<i;T+=1)F="\u2588",h<=T&&T<f&&h<=k&&k<f&&v.isDark(C,Math.floor((T-h)/p))&&(F=" "),h<=T&&T<f&&h<=k+1&&k+1<f&&v.isDark(D,Math.floor((T-h)/p))?F+=" ":F+="\u2588",Q+=d<1&&k+1>=f?z[F]:E[F];Q+=`
`}return i%2&&d>0?Q.substring(0,Q.length-i-1)+Array(i+1).join("\u2580"):Q.substring(0,Q.length-1)};return v.createASCII=function(d,p){if(d=d||1,d<2)return Re(p);d-=1,p=typeof p>"u"?d*2:p;var i=v.getModuleCount()*d+p*2,h=p,f=i-p,k,T,C,D,F=Array(d+1).join("\u2588\u2588"),E=Array(d+1).join("  "),z="",Q="";for(k=0;k<i;k+=1){for(C=Math.floor((k-h)/d),Q="",T=0;T<i;T+=1)D=1,h<=T&&T<f&&h<=k&&k<f&&v.isDark(C,Math.floor((T-h)/d))&&(D=0),Q+=D?F:E;for(C=0;C<d;C+=1)z+=Q+`
`}return z.substring(0,z.length-1)},v.renderTo2dContext=function(d,p){p=p||2;for(var i=v.getModuleCount(),h=0;h<i;h++)for(var f=0;f<i;f++)d.fillStyle=v.isDark(h,f)?"black":"white",d.fillRect(h*p,f*p,p,p)},v};u.stringToBytesFuncs={default:function(x){for(var A=[],w=0;w<x.length;w+=1){var m=x.charCodeAt(w);A.push(m&255)}return A}},u.stringToBytes=u.stringToBytesFuncs.default,u.createStringToBytes=function(x,A){var w=(function(){for(var l=se(x),y=function(){var L=l.read();if(L==-1)throw"eof";return L},n=0,r={};;){var g=l.read();if(g==-1)break;var c=y(),v=y(),B=y(),P=String.fromCharCode(g<<8|c),M=v<<8|B;r[P]=M,n+=1}if(n!=A)throw n+" != "+A;return r})(),m=63;return function(l){for(var y=[],n=0;n<l.length;n+=1){var r=l.charCodeAt(n);if(r<128)y.push(r);else{var g=w[l.charAt(n)];typeof g=="number"?(g&255)==g?y.push(g):(y.push(g>>>8),y.push(g&255)):y.push(m)}}return y}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},t={L:1,M:0,Q:3,H:2},s={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},a=(function(){var x=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],A=1335,w=7973,m=21522,l={},y=function(n){for(var r=0;n!=0;)r+=1,n>>>=1;return r};return l.getBCHTypeInfo=function(n){for(var r=n<<10;y(r)-y(A)>=0;)r^=A<<y(r)-y(A);return(n<<10|r)^m},l.getBCHTypeNumber=function(n){for(var r=n<<12;y(r)-y(w)>=0;)r^=w<<y(r)-y(w);return n<<12|r},l.getPatternPosition=function(n){return x[n-1]},l.getMaskFunction=function(n){switch(n){case s.PATTERN000:return function(r,g){return(r+g)%2==0};case s.PATTERN001:return function(r,g){return r%2==0};case s.PATTERN010:return function(r,g){return g%3==0};case s.PATTERN011:return function(r,g){return(r+g)%3==0};case s.PATTERN100:return function(r,g){return(Math.floor(r/2)+Math.floor(g/3))%2==0};case s.PATTERN101:return function(r,g){return r*g%2+r*g%3==0};case s.PATTERN110:return function(r,g){return(r*g%2+r*g%3)%2==0};case s.PATTERN111:return function(r,g){return(r*g%3+(r+g)%2)%2==0};default:throw"bad maskPattern:"+n}},l.getErrorCorrectPolynomial=function(n){for(var r=I([1],0),g=0;g<n;g+=1)r=r.multiply(I([1,o.gexp(g)],0));return r},l.getLengthInBits=function(n,r){if(1<=r&&r<10)switch(n){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw"mode:"+n}else if(r<27)switch(n){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw"mode:"+n}else if(r<41)switch(n){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw"mode:"+n}else throw"type:"+r},l.getLostPoint=function(n){for(var r=n.getModuleCount(),g=0,c=0;c<r;c+=1)for(var v=0;v<r;v+=1){for(var B=0,P=n.isDark(c,v),M=-1;M<=1;M+=1)if(!(c+M<0||r<=c+M))for(var L=-1;L<=1;L+=1)v+L<0||r<=v+L||M==0&&L==0||P==n.isDark(c+M,v+L)&&(B+=1);B>5&&(g+=3+B-5)}for(var c=0;c<r-1;c+=1)for(var v=0;v<r-1;v+=1){var O=0;n.isDark(c,v)&&(O+=1),n.isDark(c+1,v)&&(O+=1),n.isDark(c,v+1)&&(O+=1),n.isDark(c+1,v+1)&&(O+=1),(O==0||O==4)&&(g+=3)}for(var c=0;c<r;c+=1)for(var v=0;v<r-6;v+=1)n.isDark(c,v)&&!n.isDark(c,v+1)&&n.isDark(c,v+2)&&n.isDark(c,v+3)&&n.isDark(c,v+4)&&!n.isDark(c,v+5)&&n.isDark(c,v+6)&&(g+=40);for(var v=0;v<r;v+=1)for(var c=0;c<r-6;c+=1)n.isDark(c,v)&&!n.isDark(c+1,v)&&n.isDark(c+2,v)&&n.isDark(c+3,v)&&n.isDark(c+4,v)&&!n.isDark(c+5,v)&&n.isDark(c+6,v)&&(g+=40);for(var $=0,v=0;v<r;v+=1)for(var c=0;c<r;c+=1)n.isDark(c,v)&&($+=1);var j=Math.abs(100*$/r/r-50)/5;return g+=j*10,g},l})(),o=(function(){for(var x=new Array(256),A=new Array(256),w=0;w<8;w+=1)x[w]=1<<w;for(var w=8;w<256;w+=1)x[w]=x[w-4]^x[w-5]^x[w-6]^x[w-8];for(var w=0;w<255;w+=1)A[x[w]]=w;var m={};return m.glog=function(l){if(l<1)throw"glog("+l+")";return A[l]},m.gexp=function(l){for(;l<0;)l+=255;for(;l>=256;)l-=255;return x[l]},m})();function I(x,A){if(typeof x.length>"u")throw x.length+"/"+A;var w=(function(){for(var l=0;l<x.length&&x[l]==0;)l+=1;for(var y=new Array(x.length-l+A),n=0;n<x.length-l;n+=1)y[n]=x[n+l];return y})(),m={};return m.getAt=function(l){return w[l]},m.getLength=function(){return w.length},m.multiply=function(l){for(var y=new Array(m.getLength()+l.getLength()-1),n=0;n<m.getLength();n+=1)for(var r=0;r<l.getLength();r+=1)y[n+r]^=o.gexp(o.glog(m.getAt(n))+o.glog(l.getAt(r)));return I(y,0)},m.mod=function(l){if(m.getLength()-l.getLength()<0)return m;for(var y=o.glog(m.getAt(0))-o.glog(l.getAt(0)),n=new Array(m.getLength()),r=0;r<m.getLength();r+=1)n[r]=m.getAt(r);for(var r=0;r<l.getLength();r+=1)n[r]^=o.gexp(o.glog(l.getAt(r))+y);return I(n,0).mod(l)},m}var N=(function(){var x=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],A=function(l,y){var n={};return n.totalCount=l,n.dataCount=y,n},w={},m=function(l,y){switch(y){case t.L:return x[(l-1)*4+0];case t.M:return x[(l-1)*4+1];case t.Q:return x[(l-1)*4+2];case t.H:return x[(l-1)*4+3];default:return}};return w.getRSBlocks=function(l,y){var n=m(l,y);if(typeof n>"u")throw"bad rs block @ typeNumber:"+l+"/errorCorrectionLevel:"+y;for(var r=n.length/3,g=[],c=0;c<r;c+=1)for(var v=n[c*3+0],B=n[c*3+1],P=n[c*3+2],M=0;M<v;M+=1)g.push(A(B,P));return g},w})(),S=function(){var x=[],A=0,w={};return w.getBuffer=function(){return x},w.getAt=function(m){var l=Math.floor(m/8);return(x[l]>>>7-m%8&1)==1},w.put=function(m,l){for(var y=0;y<l;y+=1)w.putBit((m>>>l-y-1&1)==1)},w.getLengthInBits=function(){return A},w.putBit=function(m){var l=Math.floor(A/8);x.length<=l&&x.push(0),m&&(x[l]|=128>>>A%8),A+=1},w},_=function(x){var A=e.MODE_NUMBER,w=x,m={};m.getMode=function(){return A},m.getLength=function(n){return w.length},m.write=function(n){for(var r=w,g=0;g+2<r.length;)n.put(l(r.substring(g,g+3)),10),g+=3;g<r.length&&(r.length-g==1?n.put(l(r.substring(g,g+1)),4):r.length-g==2&&n.put(l(r.substring(g,g+2)),7))};var l=function(n){for(var r=0,g=0;g<n.length;g+=1)r=r*10+y(n.charAt(g));return r},y=function(n){if("0"<=n&&n<="9")return n.charCodeAt(0)-48;throw"illegal char :"+n};return m},R=function(x){var A=e.MODE_ALPHA_NUM,w=x,m={};m.getMode=function(){return A},m.getLength=function(y){return w.length},m.write=function(y){for(var n=w,r=0;r+1<n.length;)y.put(l(n.charAt(r))*45+l(n.charAt(r+1)),11),r+=2;r<n.length&&y.put(l(n.charAt(r)),6)};var l=function(y){if("0"<=y&&y<="9")return y.charCodeAt(0)-48;if("A"<=y&&y<="Z")return y.charCodeAt(0)-65+10;switch(y){case" ":return 36;case"$":return 37;case"%":return 38;case"*":return 39;case"+":return 40;case"-":return 41;case".":return 42;case"/":return 43;case":":return 44;default:throw"illegal char :"+y}};return m},W=function(x){var A=e.MODE_8BIT_BYTE,w=x,m=u.stringToBytes(x),l={};return l.getMode=function(){return A},l.getLength=function(y){return m.length},l.write=function(y){for(var n=0;n<m.length;n+=1)y.put(m[n],8)},l},U=function(x){var A=e.MODE_KANJI,w=x,m=u.stringToBytesFuncs.SJIS;if(!m)throw"sjis not supported.";(function(n,r){var g=m(n);if(g.length!=2||(g[0]<<8|g[1])!=r)throw"sjis not supported."})("\u53CB",38726);var l=m(x),y={};return y.getMode=function(){return A},y.getLength=function(n){return~~(l.length/2)},y.write=function(n){for(var r=l,g=0;g+1<r.length;){var c=(255&r[g])<<8|255&r[g+1];if(33088<=c&&c<=40956)c-=33088;else if(57408<=c&&c<=60351)c-=49472;else throw"illegal char at "+(g+1)+"/"+c;c=(c>>>8&255)*192+(c&255),n.put(c,13),g+=2}if(g<r.length)throw"illegal char at "+(g+1)},y},J=function(){var x=[],A={};return A.writeByte=function(w){x.push(w&255)},A.writeShort=function(w){A.writeByte(w),A.writeByte(w>>>8)},A.writeBytes=function(w,m,l){m=m||0,l=l||w.length;for(var y=0;y<l;y+=1)A.writeByte(w[y+m])},A.writeString=function(w){for(var m=0;m<w.length;m+=1)A.writeByte(w.charCodeAt(m))},A.toByteArray=function(){return x},A.toString=function(){var w="";w+="[";for(var m=0;m<x.length;m+=1)m>0&&(w+=","),w+=x[m];return w+="]",w},A},Y=function(){var x=0,A=0,w=0,m="",l={},y=function(r){m+=String.fromCharCode(n(r&63))},n=function(r){if(!(r<0)){if(r<26)return 65+r;if(r<52)return 97+(r-26);if(r<62)return 48+(r-52);if(r==62)return 43;if(r==63)return 47}throw"n:"+r};return l.writeByte=function(r){for(x=x<<8|r&255,A+=8,w+=1;A>=6;)y(x>>>A-6),A-=6},l.flush=function(){if(A>0&&(y(x<<6-A),x=0,A=0),w%3!=0)for(var r=3-w%3,g=0;g<r;g+=1)m+="="},l.toString=function(){return m},l},se=function(x){var A=x,w=0,m=0,l=0,y={};y.read=function(){for(;l<8;){if(w>=A.length){if(l==0)return-1;throw"unexpected end of file./"+l}var r=A.charAt(w);if(w+=1,r=="=")return l=0,-1;if(r.match(/^\s$/))continue;m=m<<6|n(r.charCodeAt(0)),l+=6}var g=m>>>l-8&255;return l-=8,g};var n=function(r){if(65<=r&&r<=90)return r-65;if(97<=r&&r<=122)return r-97+26;if(48<=r&&r<=57)return r-48+52;if(r==43)return 62;if(r==47)return 63;throw"c:"+r};return y},ee=function(x,A){var w=x,m=A,l=new Array(x*A),y={};y.setPixel=function(c,v,B){l[v*w+c]=B},y.write=function(c){c.writeString("GIF87a"),c.writeShort(w),c.writeShort(m),c.writeByte(128),c.writeByte(0),c.writeByte(0),c.writeByte(0),c.writeByte(0),c.writeByte(0),c.writeByte(255),c.writeByte(255),c.writeByte(255),c.writeString(","),c.writeShort(0),c.writeShort(0),c.writeShort(w),c.writeShort(m),c.writeByte(0);var v=2,B=r(v);c.writeByte(v);for(var P=0;B.length-P>255;)c.writeByte(255),c.writeBytes(B,P,255),P+=255;c.writeByte(B.length-P),c.writeBytes(B,P,B.length-P),c.writeByte(0),c.writeString(";")};var n=function(c){var v=c,B=0,P=0,M={};return M.write=function(L,O){if(L>>>O)throw"length over";for(;B+O>=8;)v.writeByte(255&(L<<B|P)),O-=8-B,L>>>=8-B,P=0,B=0;P=L<<B|P,B=B+O},M.flush=function(){B>0&&v.writeByte(P)},M},r=function(c){for(var v=1<<c,B=(1<<c)+1,P=c+1,M=g(),L=0;L<v;L+=1)M.add(String.fromCharCode(L));M.add(String.fromCharCode(v)),M.add(String.fromCharCode(B));var O=J(),$=n(O);$.write(v,P);var j=0,K=String.fromCharCode(l[j]);for(j+=1;j<l.length;){var X=String.fromCharCode(l[j]);j+=1,M.contains(K+X)?K=K+X:($.write(M.indexOf(K),P),M.size()<4095&&(M.size()==1<<P&&(P+=1),M.add(K+X)),K=X)}return $.write(M.indexOf(K),P),$.write(B,P),$.flush(),O.toByteArray()},g=function(){var c={},v=0,B={};return B.add=function(P){if(B.contains(P))throw"dup key:"+P;c[P]=v,v+=1},B.size=function(){return v},B.indexOf=function(P){return c[P]},B.contains=function(P){return typeof c[P]<"u"},B};return y},q=function(x,A,w){for(var m=ee(x,A),l=0;l<A;l+=1)for(var y=0;y<x;y+=1)m.setPixel(y,l,w(y,l));var n=J();m.write(n);for(var r=Y(),g=n.toByteArray(),c=0;c<g.length;c+=1)r.writeByte(g[c]);return r.flush(),"data:image/gif;base64,"+r};return u})();(function(){Te.stringToBytesFuncs["UTF-8"]=function(u){function e(t){for(var s=[],a=0;a<t.length;a++){var o=t.charCodeAt(a);o<128?s.push(o):o<2048?s.push(192|o>>6,128|o&63):o<55296||o>=57344?s.push(224|o>>12,128|o>>6&63,128|o&63):(a++,o=65536+((o&1023)<<10|t.charCodeAt(a)&1023),s.push(240|o>>18,128|o>>12&63,128|o>>6&63,128|o&63))}return s}return e(u)}})();(function(u){typeof define=="function"&&define.amd?define([],u):typeof Ee=="object"&&(Se.exports=u())})(function(){return Te})});function he(){let u=new Uint8Array(32);return crypto.getRandomValues(u),Array.from(u,e=>e.toString(16).padStart(2,"0")).join("")}var je="privasys.id";function xe(u){let e=btoa(u).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return`https://${je}/scp?p=${e}`}function ke(u){let e=u.sessionId??he(),t={origin:u.rpId,sessionId:e,rpId:u.rpId,brokerUrl:u.brokerUrl};return u.requestedAttributes?.length&&(t.requestedAttributes=u.requestedAttributes),u.appName&&(t.appName=u.appName),u.privacyPolicyUrl&&(t.privacyPolicyUrl=u.privacyPolicyUrl),{sessionId:e,payload:xe(JSON.stringify(t))}}function Ae(u){let e=u.sessionId??he(),t=u.apps.map(a=>({rpId:a.rpId,sessionId:a.sessionId??he()})),s={origin:u.apps[0]?.rpId??"",sessionId:e,brokerUrl:u.brokerUrl,apps:t};return{sessionId:e,appSessions:t,payload:xe(JSON.stringify(s))}}var ue="privasys_sessions",fe="privasys_device_hints",Ie="privasys_passkey",Z=class{constructor(){this.listeners=new Set}store(e){let t=this.getAll(),s=t.findIndex(a=>a.rpId===e.rpId);s>=0?t[s]=e:t.push(e),this.persist(t),this.notify(t)}get(e){return this.getAll().find(t=>t.rpId===e)}getAll(){try{let e=localStorage.getItem(ue);return e?JSON.parse(e):[]}catch{return[]}}has(e){return this.get(e)!==void 0}findPushToken(){let e=this.getAll().filter(t=>!!t.pushToken).sort((t,s)=>s.authenticatedAt-t.authenticatedAt);return e[0]?.pushToken?e[0].pushToken:this.getDeviceHint()?.pushToken}remove(e){let t=this.getAll().filter(s=>s.rpId!==e);this.persist(t),this.notify(t)}clear(){localStorage.removeItem(ue),this.notify([])}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}saveDeviceHint(e,t){let s={pushToken:e,brokerUrl:t,updatedAt:Date.now()};try{localStorage.setItem(fe,JSON.stringify(s))}catch{}}getDeviceHint(){try{let e=localStorage.getItem(fe);return e?JSON.parse(e):void 0}catch{return}}clearDeviceHint(){localStorage.removeItem(fe)}savePasskeyHint(){try{localStorage.setItem(Ie,"1")}catch{}}hasPasskeyHint(){try{return localStorage.getItem(Ie)==="1"}catch{return!1}}persist(e){localStorage.setItem(ue,JSON.stringify(e))}notify(e){for(let t of this.listeners)t(e)}};var ge=12e4,ce=class{constructor(e,t={}){this.activeConnections=new Map;this.config={attestation:"required",timeout:ge,...e},this.events=t,this.sessions=new Z}createQR(e){return ke({rpId:this.config.rpId,brokerUrl:this.config.brokerUrl,sessionId:e,requestedAttributes:this.config.requestedAttributes,appName:this.config.appName,privacyPolicyUrl:this.config.privacyPolicyUrl})}waitForResult(e){return new Promise((t,s)=>{let a=this.config.timeout??ge,o=new URL(this.config.brokerUrl);o.searchParams.set("session",e),o.searchParams.set("role","browser");let I=new WebSocket(o.toString());this.activeConnections.set(e,I),this.setState("waiting-for-scan");let N=setTimeout(()=>{this.setState("timeout"),this.cleanup(e),s(new Error("Authentication timed out"))},a);I.onopen=()=>{this.setState("waiting-for-scan")},I.onmessage=S=>{try{let _=JSON.parse(typeof S.data=="string"?S.data:"{}");this.handleMessage(e,_,t,N)}catch{}},I.onerror=()=>{clearTimeout(N),this.setState("error"),this.cleanup(e),s(new Error("WebSocket connection failed"))},I.onclose=S=>{clearTimeout(N),this.cleanup(e),S.code!==1e3&&(this.setState("error"),s(new Error(`Connection closed (code ${S.code})`)))}})}async notifyAndWait(e,t){let s=t??this.createQR().sessionId,a=this.config.brokerUrl.replace("wss://","https://").replace("ws://","http://").replace(/\/relay\/?$/,""),o=await fetch(`${a}/notify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pushToken:e,sessionId:s,rpId:this.config.rpId,appName:this.config.appName,origin:this.config.rpId,brokerUrl:this.config.brokerUrl})});if(!o.ok){let I=await o.text();throw new Error(`Push notification failed: ${I}`)}return this.waitForResult(s)}cancel(e){this.cleanup(e),this.setState("idle")}destroy(){for(let e of this.activeConnections.keys())this.cleanup(e);this.setState("idle")}getMultiple(e){let{sessionId:t,appSessions:s,payload:a}=Ae({brokerUrl:this.config.brokerUrl,apps:e.map(I=>({rpId:I.rpId}))}),o=this.waitForBatch(s);return{sessionId:t,appSessions:s,payload:a,result:o}}on(e){this.events={...this.events,...e}}handleMessage(e,t,s,a){switch(t.type){case"peer-joined":case"wallet-waiting":this.setState("wallet-connected");break;case"auth-result":{clearTimeout(a),this.setState("complete");let o={sessionToken:t.sessionToken,sessionId:e,attestation:t.attestation,pushToken:t.pushToken||void 0,attributes:t.attributes||void 0};this.sessions.store({token:o.sessionToken,rpId:this.config.rpId,origin:globalThis.location?.origin??"",authenticatedAt:Date.now(),pushToken:o.pushToken,brokerUrl:this.config.brokerUrl}),this.events.onAuthenticated?.(o),this.cleanup(e),s(o);break}case"auth-error":{clearTimeout(a),this.setState("error"),this.cleanup(e);let o=new Error(t.message??"Authentication failed");this.events.onError?.(o);break}case"authenticating":this.setState("authenticating");break}}setState(e){this.events.onStateChange?.(e)}async waitForBatch(e){let t=this.config.timeout??ge;this.setState("waiting-for-scan");let s=await Promise.allSettled(e.map(I=>Promise.race([this.waitForResult(I.sessionId),new Promise((N,S)=>setTimeout(()=>S(new Error("Batch item timed out")),t))]))),a=[],o=[];for(let I=0;I<s.length;I++){let N=s[I];N.status==="fulfilled"?a.push(N.value):o.push({rpId:e[I].rpId,error:N.reason instanceof Error?N.reason.message:String(N.reason)})}return this.setState(o.length===0?"complete":"error"),{results:a,errors:o}}cleanup(e){let t=this.activeConnections.get(e);t&&((t.readyState===WebSocket.OPEN||t.readyState===WebSocket.CONNECTING)&&t.close(1e3),this.activeConnections.delete(e))}};function V(u){let e=new Uint8Array(u),t="";for(let s=0;s<e.length;s++)t+=String.fromCharCode(e[s]);return btoa(t).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}function ie(u){let e=u.replace(/-/g,"+").replace(/_/g,"/");for(;e.length%4!==0;)e+="=";let t=atob(e),s=new Uint8Array(t.length);for(let a=0;a<t.length;a++)s[a]=t.charCodeAt(a);return s.buffer}function Ce(u){let e=new Uint8Array(u);return crypto.getRandomValues(e),Array.from(e,t=>t.toString(16).padStart(2,"0")).join("")}var ne=class{constructor(e,t={}){this.state="idle";this.config={timeout:6e4,...e},this.events=t,this.sessions=new Z}on(e){this.events={...this.events,...e}}getState(){return this.state}async register(e){this.setState("requesting-options");try{let t=V(crypto.getRandomValues(new Uint8Array(32)).buffer),s=this.config.sessionId??Ce(16),o=(await this.fido2Fetch("register/begin",{userName:e??globalThis.location?.hostname??"user",userHandle:t},{session_id:s})).publicKey;if(!o)throw new Error("Missing publicKey in registration options");let I={publicKey:{challenge:ie(o.challenge),rp:{id:o.rp.id,name:o.rp.name},user:{id:ie(o.user.id),name:o.user.name,displayName:o.user.displayName??o.user.name},pubKeyCredParams:(o.pubKeyCredParams??[]).map(R=>({type:R.type??"public-key",alg:R.alg})),timeout:this.config.timeout,attestation:o.attestation??"none",authenticatorSelection:{authenticatorAttachment:"platform",residentKey:"required",userVerification:o.authenticatorSelection?.userVerification??"required"},...o.excludeCredentials?{excludeCredentials:o.excludeCredentials.map(R=>({type:"public-key",id:ie(R.id)}))}:{}}};this.setState("ceremony");let N=await navigator.credentials.create(I);if(!N)throw new Error("No credential returned");this.setState("verifying");let S=N.response,_=await this.fido2Fetch("register/complete",{id:V(N.rawId),rawId:V(N.rawId),type:"public-key",response:{attestationObject:V(S.attestationObject),clientDataJSON:V(S.clientDataJSON)}},{challenge:o.challenge});return this.sessions.savePasskeyHint(),this.complete(_.sessionToken??"",s)}catch(t){return this.fail(t)}}async authenticate(){this.setState("requesting-options");try{let e=this.config.sessionId??Ce(16),s=(await this.fido2Fetch("authenticate/begin",{},{session_id:e})).publicKey;if(!s)throw new Error("Missing publicKey in authentication options");let a={publicKey:{challenge:ie(s.challenge),rpId:s.rpId,timeout:this.config.timeout,userVerification:s.userVerification??"preferred",...s.allowCredentials?.length?{allowCredentials:s.allowCredentials.map(_=>({type:"public-key",id:ie(_.id),..._.transports?.length?{transports:_.transports}:{}}))}:{}}};this.setState("ceremony");let o=await navigator.credentials.get(a);if(!o)throw new Error("No assertion returned");this.setState("verifying");let I=o.response,N={clientDataJSON:V(I.clientDataJSON),authenticatorData:V(I.authenticatorData),signature:V(I.signature)};I.userHandle&&I.userHandle.byteLength>0&&(N.userHandle=V(I.userHandle));let S=await this.fido2Fetch("authenticate/complete",{id:V(o.rawId),rawId:V(o.rawId),type:"public-key",response:N},{challenge:s.challenge});return this.complete(S.sessionToken??"",e)}catch(e){return this.fail(e)}}static isSupported(){return typeof globalThis.PublicKeyCredential<"u"}async fido2Fetch(e,t,s){let a=(this.config.fido2Base??this.config.apiBase).replace(/\/+$/,""),o=this.config.fido2Base?new URL(`${a}/${e}`):new URL(`${a}/api/v1/apps/${encodeURIComponent(this.config.appName)}/fido2/${e}`);if(s)for(let[N,S]of Object.entries(s))o.searchParams.set(N,S);let I=await fetch(o.toString(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!I.ok){let N=await I.json().catch(()=>({error:I.statusText}));throw new Error(N.error??`HTTP ${I.status}`)}return I.json()}complete(e,t){this.setState("complete");let s={sessionToken:e,sessionId:t};return this.sessions.store({token:e,rpId:this.config.appName,origin:globalThis.location?.origin??"",authenticatedAt:Date.now()}),this.events.onAuthenticated?.(s),s}fail(e){this.setState("error");let t=e instanceof Error?e.name==="NotAllowedError"?new Error("Credential operation was cancelled or timed out"):e:new Error(String(e));throw this.events.onError?.(t),t}setState(e){this.state=e,this.events.onStateChange?.(e)}};var Pe=We(Ne(),1),qe=`
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
`,ve='<svg viewBox="0 0 500 500"><style>.ld{fill:#fff}@media(prefers-color-scheme:dark){.ld{fill:#2a2a2a}}</style><defs><linearGradient id="pg" y2="1"><stop offset="21%" stop-color="#34E89E"/><stop offset="42%" stop-color="#12B06E"/></linearGradient><linearGradient id="pb" x1="1" y1="1" x2="0" y2="0"><stop offset="21%" stop-color="#00BCF2"/><stop offset="42%" stop-color="#00A0EB"/></linearGradient></defs><path d="M100 0H450L0 450V100A100 100 0 0 1 100 0Z" fill="url(#pg)"/><path d="M500 50V400A100 100 0 0 1 400 500H50L500 50Z" fill="url(#pb)"/><polygon class="ld" points="0,500 50,500 500,50 500,0"/></svg>',Be='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="7.5" r="3"/><path d="M10.5 13c-3.3 0-6 2-6 4.5V19h12v-1.5c0-1-.4-2-1-2.7"/><line x1="18" y1="12" x2="18" y2="18"/><line x1="15" y1="15" x2="21" y2="15"/></svg>';var Ke='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',ze='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',Qe='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>',Ve='<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>',Je='<svg viewBox="0 0 24 24"><rect fill="#F25022" x="2" y="2" width="9.5" height="9.5"/><rect fill="#7FBA00" x="12.5" y="2" width="9.5" height="9.5"/><rect fill="#00A4EF" x="2" y="12.5" width="9.5" height="9.5"/><rect fill="#FFB900" x="12.5" y="12.5" width="9.5" height="9.5"/></svg>',Ge='<svg viewBox="0 0 24 24"><path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',Ye='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',Xe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>';var Ze='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>';function b(u,e,...t){let s=document.createElement(u);if(e!=null)for(let[a,o]of Object.entries(e))a==="className"?s.className=o:a.startsWith("on")&&typeof o=="function"?s.addEventListener(a.slice(2).toLowerCase(),o):a==="html"?s.innerHTML=o:o===!1||o==null||(o===!0?s.setAttribute(a,""):s.setAttribute(a,String(o)));for(let a of t.flat(1/0))a==null||a===!1||s.appendChild(typeof a=="string"?document.createTextNode(a):a);return s}function et(u){try{let e=(0,Pe.default)(0,"M");e.addData(u),e.make();let t=e.getModuleCount(),s=Math.max(3,Math.floor(200/t));return e.createSvgTag({cellSize:s,margin:4,scalable:!0})}catch{return`<div style="padding:16px;font-size:11px;word-break:break-all">${u}</div>`}}var oe=class{constructor(e){this.host=null;this.shadow=null;this.resolve=null;this.reject=null;this.relayClient=null;this.webauthnClient=null;this.state="idle";this.errorMsg="";this.sessionToken="";this.sessionId="";this.method="wallet";this.cfg={brokerUrl:"wss://relay.privasys.org/relay",timeout:12e4,...e}}get rpId(){return this.cfg.rpId??this.cfg.appName}signIn(){return this.close(),new Promise((e,t)=>{this.resolve=e,this.reject=t,this.state="idle",this.errorMsg="",this.sessionToken="",this.sessionId="",this.attestation=void 0,this.attributes=void 0,this.mount(),this.cfg.pushToken?this.startPush():this.render()})}close(){this.cleanup(),this.host&&(this.host.remove(),this.host=null,this.shadow=null)}destroy(){this.close(),this.reject&&(this.reject(new Error("AuthUI destroyed")),this.resolve=null,this.reject=null)}mount(){this.host=document.createElement("div"),this.host.setAttribute("data-privasys-auth",""),this.shadow=this.host.attachShadow({mode:"closed"});let e=document.createElement("style");e.textContent=qe,this.shadow.appendChild(e),(this.cfg.container??document.body).appendChild(this.host)}render(){if(!this.shadow)return;let e=this.shadow.querySelector("style");this.shadow.innerHTML="",this.shadow.appendChild(e);let t=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,N=>N.toUpperCase()),s=this.state==="idle",a;switch(this.state){case"qr-scanning":a="Open Privasys Wallet on your phone and scan the QR code displayed on the right to authenticate.";break;case"push-waiting":a="Check your phone \u2014 tap the notification from Privasys ID to approve this sign-in.";break;case"wallet-connected":case"authenticating":a="Verifying your identity\u2026 This will only take a moment.";break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":a="Complete the biometric prompt on your device to verify your identity.";break;case"success":a="";break;case"error":a="Something went wrong. You can try again or choose a different method.";break;default:a=`<strong>${t}</strong> needs to verify your identity. Please choose one of the authentication options.`}let o;switch(this.state){case"push-waiting":o=this.renderPushWaiting();break;case"qr-scanning":o=this.renderQR();break;case"wallet-connected":case"authenticating":o=this.renderWalletProgress();break;case"passkey-requesting":case"passkey-ceremony":case"passkey-verifying":o=this.renderPasskeyProgress();break;case"success":o=this.renderSuccess();break;case"error":o=this.renderError();break;default:o=this.renderIdle()}let I=b("div",{className:"page"},b("button",{className:"btn-close",html:Ye,onClick:()=>this.handleCancel()}),b("div",{className:"brand-panel"},b("div",{className:"brand-panel-header"},b("div",{className:"brand-panel-logo",html:ve}),b("div",{className:"brand-panel-name"},"Privasys")),a?b("p",{className:"brand-panel-desc",html:a}):null,this.isFlowState()?this.renderBrandProgress():null),b("div",{className:`auth-panel${s?"":" auth-panel--centered"}`},!s&&this.state!=="success"?b("button",{className:"btn-back",onClick:()=>this.goBack()},b("span",{html:Ze}),"Back"):null,this.isFlowState()?b("div",{className:"mobile-progress-header"},this.renderBrandProgress()):null,o),b("div",{className:"footer"},"By continuing, you agree to the ",b("a",{href:"https://privasys.org/legal/terms",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Terms of Service")," and ",b("a",{href:"https://privasys.org/legal/privacy",target:"_blank",className:"link-btn",style:"font-size:inherit"},"Privacy Policy"),"."));this.shadow.appendChild(I)}goBack(){this.cleanup(),this.state="idle",this.errorMsg="",this.render()}renderIdle(){let e=ne.isSupported(),t=!!this.cfg.pushToken,s=this.cfg.socialProviders??[],a=this.cfg.appName.replace(/[-_]/g," ").replace(/\b\w/g,_=>_.toUpperCase()),o=[];if(t&&o.push(b("button",{className:"btn-provider primary",onClick:()=>this.startPush()},b("span",{html:ze}),b("span",{className:"btn-label"},"Sign in with Privasys ID"),b("span",{className:"btn-hint"},"Notification"))),o.push(b("button",{className:`btn-provider ${t?"":"primary"}`,onClick:()=>this.startWallet()},b("span",{html:ve}),b("span",{className:"btn-label"},t?"Scan QR code instead":"Continue with Privasys ID"))),(e||s.length>0)&&o.push(b("div",{className:"divider"},b("span",null,"or"))),e){let _=this.getWebAuthnClient().sessions.hasPasskeyHint()?"authenticate":"register";o.push(b("button",{className:"btn-provider",onClick:()=>this.startPasskey(_)},b("span",{html:Be}),b("span",{className:"btn-label"},"Passkey"),b("span",{className:"btn-hint"},"Face ID, Touch ID, Windows Hello")))}let N={github:Qe,google:Ve,microsoft:Je,linkedin:Ge},S={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"};for(let _ of s){let R=N[_]??"",W=S[_]??_;o.push(b("button",{className:"btn-provider",onClick:()=>this.startSocial(_)},R?b("span",{html:R}):null,b("span",{className:"btn-label"},W)))}return b("div",null,b("h2",{className:"auth-panel-heading"},`Sign in to ${a}`),...o)}renderQR(){let e=this.getRelayClient(),{payload:t}=e.createQR(this.sessionId);return b("div",null,b("div",{className:"qr-section"},b("div",{className:"qr-frame",html:et(t)}),b("div",{className:"scan-label"},b("span",{className:"pulse"}),"Scan with Privasys Wallet")))}renderPushWaiting(){let e=ne.isSupported();return b("div",null,b("p",{className:"btn-provider",style:"margin-bottom: 20px; max-width: none; text-align: center;"},"Check your phone \u2014 tap the notification to approve this connection."),b("div",{className:"divider"},b("span",null,"or")),b("div",{className:"alt-actions"},b("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startWallet()}},b("span",{html:ve}),b("span",{className:"btn-label"},"Scan QR code instead")),e?b("button",{className:"btn-provider",onClick:()=>{this.cleanup(),this.startPasskey(this.getWebAuthnClient().sessions.hasPasskeyHint()?"authenticate":"register")}},b("span",{html:Be}),b("span",{className:"btn-label"},"Passkey")):null))}renderWalletProgress(){return b("div",null,b("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},"Verifying your identity\u2026 This will only take a moment."))}renderPasskeyProgress(){let t=this.state==="passkey-requesting"?"Preparing\u2026":"Complete the biometric prompt on your device.";return b("div",null,b("p",{className:"scan-hint",style:"max-width: none; text-align: center;"},t))}isFlowState(){return["push-waiting","qr-scanning","wallet-connected","authenticating","passkey-requesting","passkey-ceremony","passkey-verifying","success"].includes(this.state)}renderBrandProgress(){let e=this.state==="success",t=this.method==="wallet"?"Privasys ID":"Passkey",s=this.method==="wallet"&&this.attestation?.valid,a=this.method==="passkey"?"This device":s?"Attestation verified":null,o;if(this.method==="passkey"){let I=this.state;o=b("div",{className:"steps"},b("div",{className:`step ${I!=="passkey-requesting"?"done":"active"}`},b("span",{className:"step-icon"},I!=="passkey-requesting"?"\u2713":"\u2022"),"Options received from enclave"),b("div",{className:`step ${I==="passkey-ceremony"?"active":I==="passkey-verifying"||e?"done":""}`},b("span",{className:"step-icon"},I==="passkey-verifying"||e?"\u2713":"\u2022"),"Biometric prompt completed"),b("div",{className:`step ${I==="passkey-verifying"?"active":e?"done":""}`},b("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Enclave verification"),b("div",{className:`step ${e?"done":""}`},b("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}else{let I=!!this.cfg.pushToken,N=["wallet-connected","authenticating","success"].includes(this.state),S=this.state==="authenticating"||e,_=I?["push-waiting","wallet-connected","authenticating","success"].includes(this.state):N||S,R=!_&&this.state==="qr-scanning",W=I?"Notification sent":"QR code scanned",U=I?"Approved on Privasys ID":"Server attestation verified",J=I&&this.state==="push-waiting"||N&&!S;o=b("div",{className:"steps"},b("div",{className:`step ${_?"done":R?"active":""}`},b("span",{className:"step-icon"},_?"\u2713":"\u2022"),W),b("div",{className:`step ${J?"active":S?"done":""}`},b("span",{className:"step-icon"},S?"\u2713":"\u2022"),U),b("div",{className:`step ${this.state==="authenticating"?"active":e?"done":""}`},b("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Biometric authentication"),b("div",{className:`step ${e?"done":""}`},b("span",{className:"step-icon"},e?"\u2713":"\u2022"),"Session established"))}return e&&o.appendChild(b("div",{className:"step done"},b("span",{className:"step-icon"},"\u2713"),`Authenticated via ${t}`)),b("div",{className:"brand-progress"},o)}renderSuccess(){let e=!!this.pushToken&&!this.cfg.deviceTrusted,t=this.method==="wallet"?"Privasys ID":"Passkey",s=this.method==="wallet"&&this.attestation?.valid,a=this.method==="passkey"?"This device":s?"Attestation verified":null;return b("div",null,e?b("div",{style:"width: 100%;"},b("p",{style:"font-size: 14px; font-weight: 500; margin-bottom: 6px;"},"Trust this device?"),b("p",{className:"scan-hint",style:"margin-bottom: 16px; max-width: none;"},"Next time, we\u2019ll send a notification to your phone instead of showing a QR code."),b("button",{className:"btn-provider primary",onClick:()=>this.finishWithTrust(!0)},b("span",{html:Xe}),b("span",{className:"btn-label"},"Trust this device")),b("button",{className:"link-btn",style:"margin-top: 12px; font-size: 13px; display: block; text-align: center; width: 100%;",onClick:()=>this.finishWithTrust(!1)},"Not now")):b("div",{className:"footer"},"Your session is ready. This dialog will close automatically."))}renderError(){return b("div",null,b("div",{className:"error-icon",html:Ke}),b("div",{className:"error-title"},"Authentication failed"),b("div",{className:"error-msg"},this.errorMsg||"An unknown error occurred."),b("button",{className:"btn-retry",onClick:()=>{this.errorMsg="",this.state="idle",this.render()}},"Try again"))}startPush(){this.method="wallet";let e=this.getRelayClient();this.state="push-waiting",this.render(),e.notifyAndWait(this.cfg.pushToken,this.cfg.sessionId).then(t=>{this.sessionToken=t.sessionToken,this.attestation=t.attestation,this.sessionId=t.sessionId,this.pushToken=t.pushToken,this.attributes=t.attributes,this.complete()},t=>{this.state="error",this.errorMsg=t?.message??"Push authentication failed",this.render()})}startWallet(){this.method="wallet";let e=this.getRelayClient(),{sessionId:t}=e.createQR(this.cfg.sessionId);this.sessionId=t,this.state="qr-scanning",this.render(),e.waitForResult(t).then(s=>{this.sessionToken=s.sessionToken,this.attestation=s.attestation,this.sessionId=s.sessionId,this.pushToken=s.pushToken,this.attributes=s.attributes,this.complete()},s=>{this.state="error",this.errorMsg=s?.message??"Wallet authentication failed",this.render()})}async startPasskey(e){this.method="passkey",this.state="passkey-requesting",this.render();let t=this.getWebAuthnClient();try{let s;if(e==="register")s=await t.register(globalThis.location?.hostname??"user");else try{s=await t.authenticate()}catch(a){let o=a?.message??"";if(o.includes("no credentials")||o.includes("not found")||o.includes("cancelled"))this.state="passkey-requesting",this.render(),s=await t.register(globalThis.location?.hostname??"user");else throw a}this.sessionToken=s.sessionToken,this.sessionId=s.sessionId,this.complete()}catch(s){this.state="error",this.errorMsg=s?.message??"Passkey authentication failed",this.render()}}async startSocial(e){if(this.cfg.onSocialAuth){this.state="authenticating",this.render();try{await this.cfg.onSocialAuth(e),this.method="wallet",this.sessionToken="",this.sessionId=this.cfg.sessionId??"",this.complete()}catch(t){this.state="error",this.errorMsg=t?.message??`${e} authentication failed`,this.render()}}}complete(){this.state="success",this.render(),(!this.pushToken||this.cfg.deviceTrusted)&&setTimeout(()=>this.finishWithTrust(!1),1200)}finishWithTrust(e){let t={sessionToken:this.sessionToken,method:this.method,attestation:this.attestation,sessionId:this.sessionId,pushToken:this.pushToken,attributes:this.attributes,trustDevice:e};this.close(),this.resolve?.(t),this.resolve=null,this.reject=null}handleCancel(){this.cleanup(),this.close(),this.reject?.(new Error("Authentication cancelled")),this.resolve=null,this.reject=null}cleanup(){this.relayClient&&(this.relayClient.destroy(),this.relayClient=null)}getRelayClient(){return this.relayClient||(this.relayClient=new ce({rpId:this.rpId,brokerUrl:this.cfg.brokerUrl,timeout:this.cfg.timeout,requestedAttributes:this.cfg.requestedAttributes,appName:this.cfg.appName,privacyPolicyUrl:this.cfg.privacyPolicyUrl},{onStateChange:e=>{let t={"waiting-for-scan":"qr-scanning","wallet-connected":"wallet-connected",authenticating:"authenticating"};if(t[e]){if(this.state==="push-waiting"&&e==="waiting-for-scan")return;this.state=t[e],this.render()}}})),this.relayClient}getWebAuthnClient(){return this.webauthnClient||(this.webauthnClient=new ne({apiBase:this.cfg.apiBase,appName:this.cfg.appName,sessionId:this.cfg.sessionId,fido2Base:this.cfg.fido2Base},{onStateChange:e=>{let t={"requesting-options":"passkey-requesting",ceremony:"passkey-ceremony",verifying:"passkey-verifying"};t[e]&&(this.state=t[e],this.render())}})),this.webauthnClient}};var H=new Z,G=null,tt=780*1e3,ae=new Map;function _e(u){let e=ae.get(u);e&&(clearTimeout(e),ae.delete(u))}function de(u,e){if(_e(u.rpId),!u.refreshToken||!u.clientId)return;let t=setTimeout(async()=>{ae.delete(u.rpId);let s=H.get(u.rpId);if(!(!s?.refreshToken||!s?.clientId))try{await Me(s,e);let a=H.get(u.rpId);a&&de(a,e)}catch(a){console.warn("[frame-host] renewal failed, expiring session:",a),H.remove(u.rpId),window.parent.postMessage({type:"privasys:session-expired",rpId:u.rpId},e)}},tt);ae.set(u.rpId,t)}async function Me(u,e,t=!0){let s=globalThis.location.origin,a=await fetch(`${s}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:u.refreshToken,client_id:u.clientId})});if(!a.ok){let I=await a.json().catch(()=>({error:a.statusText}));throw new Error(I.error_description||I.error||`Refresh failed: ${a.status}`)}let o=await a.json();H.store({...u,token:o.access_token,refreshToken:o.refresh_token,authenticatedAt:Date.now()}),t&&window.parent.postMessage({type:"privasys:session-renewed",rpId:u.rpId,accessToken:o.access_token},e)}function rt(u,e=3e4){try{let t=JSON.parse(atob(u.split(".")[1]));return typeof t.exp!="number"?!1:t.exp*1e3-e<Date.now()}catch{return!1}}async function nt(){let u=new Uint8Array(32);crypto.getRandomValues(u);let e=Array.from(u,a=>a.toString(16).padStart(2,"0")).join(""),t=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(e)),s=btoa(String.fromCharCode(...new Uint8Array(t))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");return{codeVerifier:e,codeChallenge:s}}function st(u,e,t){return new Promise((s,a)=>{let o=document.createElement("div");o.style.cssText="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);z-index:10000;font-family:system-ui,sans-serif;";let I=document.createElement("div");I.style.cssText="background:#fff;border-radius:12px;padding:32px 28px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.18);text-align:center;";let N=document.createElement("h2");N.textContent="Verify your identity",N.style.cssText="margin:0 0 8px;font-size:18px;color:#1a1a2e;";let S=document.createElement("p");S.textContent="To complete your account, sign in with one of these providers to verify your email.",S.style.cssText="margin:0 0 20px;font-size:14px;color:#666;line-height:1.4;",I.appendChild(N),I.appendChild(S);let _={github:"GitHub",google:"Google",microsoft:"Microsoft",linkedin:"LinkedIn"},R=W=>{let Y=window.screenX+(window.innerWidth-500)/2,se=window.screenY+(window.innerHeight-650)/2,ee=`${u}/auth/social?provider=${encodeURIComponent(W)}&session_id=${encodeURIComponent(e)}`,q=window.open(ee,"privasys-social",`width=500,height=650,left=${Y},top=${se}`);if(!q){a(new Error("Popup blocked \u2014 please allow popups for this site"));return}let x=()=>{window.removeEventListener("message",A),clearInterval(w),o.remove()},A=m=>{m.source===q&&(m.data?.type==="privasys:social-complete"?(x(),q.close(),s()):m.data?.type==="privasys:social-error"&&(x(),q.close(),a(new Error(m.data.error||"Social verification failed"))))};window.addEventListener("message",A);let w=setInterval(()=>{q.closed&&(x(),a(new Error("Verification cancelled")))},500)};for(let W of t){let U=document.createElement("button");U.textContent=_[W]??W,U.style.cssText="display:block;width:100%;padding:12px 16px;margin:8px 0;border:1px solid #ddd;border-radius:8px;background:#fff;font-size:14px;cursor:pointer;transition:background .15s;",U.onmouseenter=()=>{U.style.background="#f5f5f5"},U.onmouseleave=()=>{U.style.background="#fff"},U.onclick=()=>R(W),I.appendChild(U)}o.appendChild(I),document.body.appendChild(o)})}async function it(u,e=12e4){let t=Date.now()+e;for(;Date.now()<t;){let s=await fetch(u);if(!s.ok)throw new Error(`poll failed: ${s.status}`);let a=await s.json();if(a.authenticated&&a.redirect_uri){let I=new URL(a.redirect_uri,globalThis.location.origin).searchParams.get("code");if(I)return I}await new Promise(o=>setTimeout(o,1500))}throw new Error("OIDC session timed out")}async function ot(u,e,t){let s=await fetch(`${u}/session/complete`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session_id:e,user_id:t?.sub||"",attributes:t||{}})});if(!s.ok){let o=await s.json().catch(()=>({error:s.statusText}));throw new Error(o.error_description||o.error||`Session complete failed: ${s.status}`)}let a=await s.json();if(!a.code)throw new Error("No authorization code returned");return a.code}async function at(u,e,t,s){let a=await fetch(`${u}/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code:e,client_id:t,code_verifier:s})});if(!a.ok){let o=await a.json().catch(()=>({error:a.statusText}));throw new Error(o.error_description||o.error||`Token exchange failed: ${a.status}`)}return a.json()}window.addEventListener("message",async u=>{let e=u.data;if(!(!e||typeof e.type!="string")){if(e.type==="privasys:init"){let t=e.config,s=u.origin;G&&(G.destroy(),G=null);let a=globalThis.location.origin,o=t.clientId;if(o){try{let{codeVerifier:S,codeChallenge:_}=await nt(),R=new URL("/authorize",a);R.searchParams.set("client_id",o),R.searchParams.set("response_type","code"),R.searchParams.set("code_challenge",_),R.searchParams.set("code_challenge_method","S256");let W=Array.isArray(t.scope)?t.scope.join(" "):t.scope||"openid offline_access";R.searchParams.set("scope",W),R.searchParams.set("response_mode","json");let U=await fetch(R.toString(),{headers:{Accept:"application/json"}});if(!U.ok){let g=await U.json().catch(()=>({error:U.statusText}));throw new Error(g.error_description||g.error||`Authorize failed: ${U.status}`)}let J=await U.json(),Y=J.session_id,se=J.poll_url,ee=J.requested_attributes,q=[];try{let g=await fetch(`${a}/auth/social/providers`);g.ok&&(q=(await g.json()).providers??[])}catch{}let x=H.findPushToken(),A=!!H.getDeviceHint(),w=g=>new Promise((c,v)=>{let M=window.screenX+(window.innerWidth-500)/2,L=window.screenY+(window.innerHeight-650)/2,O=`${a}/auth/social?provider=${encodeURIComponent(g)}&session_id=${encodeURIComponent(Y)}`,$=window.open(O,"privasys-social",`width=500,height=650,left=${M},top=${L}`);if(!$){v(new Error("Popup blocked \u2014 please allow popups for this site"));return}let j=()=>{window.removeEventListener("message",K),clearInterval(X)},K=te=>{te.source===$&&(te.data?.type==="privasys:social-complete"?(j(),$.close(),c()):te.data?.type==="privasys:social-error"&&(j(),$.close(),v(new Error(te.data.error||"Social authentication failed"))))};window.addEventListener("message",K);let X=setInterval(()=>{$.closed&&(j(),v(new Error("Authentication cancelled")))},500)});G=new oe({...t,apiBase:a,sessionId:Y,fido2Base:`${a}/fido2`,pushToken:x,deviceTrusted:A,socialProviders:q,onSocialAuth:w,requestedAttributes:ee});let m=await G.signIn(),l;if(m.method==="passkey"){if(ee?.some(c=>c==="email"||c==="name")){if(q.length===0)throw new Error("Profile verification required (email/name) but the IdP has no external identity providers configured. Contact support.");await st(a,Y,q)}l=await it(se)}else l=await ot(a,Y,m.attributes);let y=await at(a,l,o,S),n=t.rpId||t.appName,r={token:y.access_token,rpId:n,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:m.pushToken,brokerUrl:t.brokerUrl||"",refreshToken:y.refresh_token,clientId:o};H.store(r),r.pushToken&&r.brokerUrl&&(m.trustDevice||A)&&H.saveDeviceHint(r.pushToken,r.brokerUrl),de(r,s),window.parent.postMessage({type:"privasys:result",result:{...m,accessToken:y.access_token}},s)}catch(S){let _=S instanceof Error?S.message:"Authentication failed";_==="Authentication cancelled"||_==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},s):window.parent.postMessage({type:"privasys:error",error:_},s)}finally{G=null}return}let I=H.findPushToken(),N=!!H.getDeviceHint();G=new oe({...t,pushToken:I,deviceTrusted:N});try{let S=await G.signIn(),_=t.brokerUrl||"",R={token:S.sessionToken,rpId:t.rpId||t.appName,origin:t.apiBase,authenticatedAt:Date.now(),pushToken:S.pushToken,brokerUrl:_};H.store(R),R.pushToken&&R.brokerUrl&&((S.trustDevice||N)&&H.saveDeviceHint(R.pushToken,R.brokerUrl),de(R,s)),window.parent.postMessage({type:"privasys:result",result:S},s)}catch(S){let _=S instanceof Error?S.message:"Authentication failed";_==="Authentication cancelled"||_==="AuthUI destroyed"?window.parent.postMessage({type:"privasys:cancel"},s):window.parent.postMessage({type:"privasys:error",error:_},s)}finally{G=null}}if(e.type==="privasys:check-session"){let t=H.get(e.rpId);if(t?.token&&t?.refreshToken&&t?.clientId&&rt(t.token))try{await Me(t,u.origin,!1),t=H.get(e.rpId)}catch{H.remove(e.rpId),t=void 0}t?.refreshToken&&t?.clientId&&!ae.has(t.rpId)&&de(t,u.origin),window.parent.postMessage({type:"privasys:session",session:t||null},u.origin)}e.type==="privasys:clear-session"&&(_e(e.rpId),H.remove(e.rpId),H.clearDeviceHint(),window.parent.postMessage({type:"privasys:session-cleared"},u.origin))}});window.parent.postMessage({type:"privasys:ready"},"*");})();
//# sourceMappingURL=privasys-auth-frame.iife.js.map
