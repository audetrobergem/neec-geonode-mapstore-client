(self.webpackChunkgeonode_mapstore_client=self.webpackChunkgeonode_mapstore_client||[]).push([[10181],{42780:(t,n,e)=>{"use strict";e.d(n,{Xp:()=>r,A1:()=>A,Mf:()=>u,wq:()=>N,CD:()=>O,DX:()=>I,GW:()=>R,c4:()=>i,Ne:()=>o,hv:()=>S,x9:()=>p,Lv:()=>_,mA:()=>f,Ge:()=>c,sL:()=>y,B6:()=>D,vG:()=>G,QY:()=>U,X2:()=>F,dC:()=>L,bO:()=>C,eY:()=>s,bI:()=>a,Rr:()=>d,Np:()=>l,pC:()=>M,cM:()=>H,iO:()=>Y,R_:()=>V,zT:()=>g,$l:()=>v,qO:()=>P,eK:()=>h,HN:()=>m,Bm:()=>W,Kz:()=>b,gT:()=>B,JT:()=>k,CO:()=>z,NV:()=>w,Ns:()=>x,Fz:()=>K,Nj:()=>X,op:()=>$,GI:()=>Q,Cg:()=>Z,WD:()=>J,rb:()=>j,it:()=>q,br:()=>tt,Hf:()=>nt,Ps:()=>et,U7:()=>Et,aH:()=>Tt,qX:()=>rt,cv:()=>At,M_:()=>ut,QT:()=>Nt,z_:()=>Ot,Y5:()=>It,wP:()=>Rt,pv:()=>it,bM:()=>ot,Zw:()=>St,Ay:()=>pt,aS:()=>_t,LR:()=>ft,VR:()=>ct,A9:()=>yt,i9:()=>Dt,$f:()=>Gt,F4:()=>Ut,r1:()=>Ft,Om:()=>Lt,_x:()=>Ct,dT:()=>st,jw:()=>at,iY:()=>dt,QD:()=>lt,xD:()=>Mt,kg:()=>Ht,ob:()=>Yt,nk:()=>Vt,A_:()=>gt,nY:()=>vt,Bp:()=>Pt,CH:()=>ht,Rx:()=>mt,MQ:()=>Wt,l7:()=>bt,VP:()=>Bt,g:()=>kt,L0:()=>zt,if:()=>wt,tp:()=>xt,TA:()=>Kt,yg:()=>Xt,Hl:()=>$t,y$:()=>Qt,ts:()=>Zt,UJ:()=>Jt,yw:()=>jt,nz:()=>qt,RC:()=>tn,om:()=>nn,XW:()=>en,WB:()=>En,pI:()=>Tn,Dd:()=>rn,V_:()=>An,TW:()=>un,$:()=>Nn,Y_:()=>On,Ib:()=>In,_n:()=>Rn});var E=e(91175),T=e.n(E),r="ANNOTATIONS:INIT_PLUGIN",A="ANNOTATIONS:EDIT",u="ANNOTATIONS:OPEN_EDITOR",N="ANNOTATIONS:SHOW",O="ANNOTATIONS:NEW",I="ANNOTATIONS:REMOVE",R="ANNOTATIONS:REMOVE_GEOMETRY",i="ANNOTATIONS:CONFIRM_REMOVE",o="ANNOTATIONS:CANCEL_REMOVE",S="ANNOTATIONS:CANCEL_EDIT",p="ANNOTATIONS:CANCEL_SHOW",_="ANNOTATIONS:SAVE",f="ANNOTATIONS:TOGGLE_ADD",c="ANNOTATIONS:TOGGLE_STYLE",y="ANNOTATIONS:SET_STYLE",D="ANNOTATIONS:RESTORE_STYLE",G="ANNOTATIONS:SET_INVALID_SELECTED",U="ANNOTATIONS:VALIDATION_ERROR",F="ANNOTATIONS:HIGHLIGHT",L="ANNOTATIONS:CLEAN_HIGHLIGHT",C="ANNOTATIONS:FILTER",s="ANNOTATIONS:CLOSE",a="ANNOTATIONS:CONFIRM_CLOSE",d="ANNOTATIONS:CANCEL_CLOSE",l="ANNOTATIONS:START_DRAWING",M="ANNOTATIONS:UNSAVED_CHANGES",H="ANNOTATIONS:VISIBILITY",Y="ANNOTATIONS:TOGGLE_CHANGES_MODAL",V="ANNOTATIONS:TOGGLE_GEOMETRY_MODAL",g="ANNOTATIONS:CHANGED_PROPERTIES",v="ANNOTATIONS:UNSAVED_STYLE",P="ANNOTATIONS:TOGGLE_STYLE_MODAL",h="ANNOTATIONS:ADD_TEXT",m="ANNOTATIONS:DOWNLOAD",W="ANNOTATIONS:LOAD_ANNOTATIONS",b="ANNOTATIONS:CHANGED_SELECTED",B="ANNOTATIONS:RESET_COORD_EDITOR",k="ANNOTATIONS:CHANGE_RADIUS",z="ANNOTATIONS:CHANGE_TEXT",w="ANNOTATIONS:ADD_NEW_FEATURE",x="ANNOTATIONS:SET_EDITING_FEATURE",K="ANNOTATIONS:HIGHLIGHT_POINT",X="ANNOTATIONS:TOGGLE_DELETE_FT_MODAL",$="ANNOTATIONS:CONFIRM_DELETE_FEATURE",Q="ANNOTATIONS:CHANGE_FORMAT",Z="ANNOTATIONS:UPDATE_SYMBOLS",J="ANNOTATIONS:ERROR_SYMBOLS",j="ANNOTATIONS:SET_DEFAULT_STYLE",q="ANNOTATIONS:LOAD_DEFAULT_STYLES",tt="ANNOTATIONS:LOADING",nt="ANNOTATIONS:CHANGE_GEOMETRY_TITLE",et="ANNOTATIONS:FILTER_MARKER",Et="ANNOTATIONS:HIDE_MEASURE_WARNING",Tt="ANNOTATIONS:TOGGLE_SHOW_AGAIN",rt="ANNOTATIONS:GEOMETRY_HIGHLIGHT",At="ANNOTATIONS:UNSELECT_FEATURE",ut="ANNOTATIONS:VALIDATE_FEATURE",Nt=function(){return{type:r}},Ot=function(){return{type:Z,symbols:arguments.length>0&&void 0!==arguments[0]?arguments[0]:[]}},It=function(t){return{type:J,symbolErrors:t}},Rt=function(t){return{type:W,features:t,override:arguments.length>1&&void 0!==arguments[1]&&arguments[1]}},it=function(){return{type:$}},ot=function(t){return{type:u,id:t}},St=function(t){return{type:Q,format:t}},pt=function(){return{type:X}},_t=function(t){return{type:K,point:t}},ft=function(t){return{type:m,annotation:t}},ct=function(t){return function(n,e){var E=T()(T()(e().layers.flat.filter((function(t){return"annotations"===t.id}))).features.filter((function(n){return n.properties.id===t})));"FeatureCollection"===E.type?n({type:A,feature:E,featureType:E.type}):n({type:A,feature:E,featureType:E.geometry.type})}},yt=function(){return{type:O}},Dt=function(t,n,e,E){return{type:b,coordinates:t,radius:n,text:e,crs:E}},Gt=function(t,n){return{type:G,errorFrom:t,coordinates:n}},Ut=function(){return{type:h}},Ft=function(t,n){return{type:H,id:t,visibility:n}},Lt=function(t,n){return{type:g,field:t,value:n}},Ct=function(t){return{type:I,id:t}},st=function(t){return{type:R,id:t}},at=function(t,n){return{type:i,id:t,attribute:n}},dt=function(){return{type:o}},lt=function(t){return{type:S,properties:t}},Mt=function(t,n,e,E,T,r){return{type:_,id:t,fields:n,geometry:e,style:E,newFeature:T,properties:r}},Ht=function(t){return{type:f,featureType:t}},Yt=function(t){return{type:c,styling:t}},Vt=function(){return{type:D}},gt=function(t){return{type:y,style:t}},vt=function(t,n,e){return{type:"ANNOTATIONS:UPDATE_GEOMETRY",geometry:t,textChanged:n,circleChanged:e}},Pt=function(t){return{type:U,errors:t}},ht=function(t){return{type:F,id:t}},mt=function(){return{type:L}},Wt=function(t){return{type:N,id:t}},bt=function(){return{type:p}},Bt=function(t){return{type:C,filter:t}},kt=function(){return{type:s}},zt=function(t){return{type:a,properties:t}},wt=function(t){return{type:M,unsavedChanges:t}},xt=function(t){return{type:v,unsavedStyle:t}},Kt=function(){return{type:w}},Xt=function(t){return{type:x,feature:t}},$t=function(){return{type:d}},Qt=function(){return{type:l,options:arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}}},Zt=function(){return{type:Y}},Jt=function(){return{type:V}},jt=function(){return{type:P}},qt=function(){return{type:B}},tn=function(){return{type:At}},nn=function(t,n,e){return{type:k,radius:t,components:n,crs:e}},en=function(t,n){return{type:z,text:t,components:n}},En=function(t,n){return{type:j,path:t,style:n}},Tn=function(t,n,e,E,T){return{type:q,shape:t,size:n,fillColor:e,strokeColor:E,symbolsPath:T}},rn=function(t){return{type:nt,title:t}},An=function(t){return{type:tt,name:arguments.length>1&&void 0!==arguments[1]?arguments[1]:"loading",value:t}},un=function(t){return{type:et,filter:t}},Nn=function(t,n){return{type:rt,id:t,state:n}},On=function(){return{type:Et}},In=function(){return{type:Tt}},Rn=function(){return{type:ut}}},33528:(t,n,e)=>{"use strict";e.d(n,{gJ:()=>E,Oj:()=>T,jp:()=>r,CM:()=>A,DU:()=>u,aO:()=>N,v6:()=>O,K8:()=>I,IN:()=>R,zh:()=>i,AH:()=>o,Ub:()=>S,_9:()=>p,JB:()=>_,oh:()=>f,AY:()=>c,yi:()=>y,SW:()=>D,Hk:()=>G,iQ:()=>U,dY:()=>F,$:()=>L,_u:()=>C,gG:()=>s,DI:()=>a,dZ:()=>d,qw:()=>l,f$:()=>M,bZ:()=>H,$O:()=>Y,sF:()=>V,Gk:()=>g,vO:()=>v,ut:()=>P,MK:()=>h,VV:()=>m,B8:()=>W,VM:()=>b,a3:()=>B,Xp:()=>k,DA:()=>z,sK:()=>w,yA:()=>x,r:()=>K,iB:()=>X,WB:()=>$,EH:()=>Q,Yd:()=>Z,Hg:()=>J,Lz:()=>j,ye:()=>q,Jb:()=>tt,d:()=>nt,fT:()=>et,Ib:()=>Et,Pl:()=>Tt,UB:()=>rt,Uh:()=>At,QT:()=>ut,oL:()=>Nt,Ap:()=>Ot,KD:()=>It,Z_:()=>Rt,Vw:()=>it,sY:()=>ot,kA:()=>St,gr:()=>pt,pX:()=>_t,F5:()=>ft,MO:()=>ct,dq:()=>yt,DY:()=>Dt,oO:()=>Gt,uF:()=>Ut,a8:()=>Ft,Pv:()=>Lt,an:()=>Ct,lg:()=>st,nY:()=>at,nG:()=>dt,lx:()=>lt,$S:()=>Mt,gc:()=>Ht,Uz:()=>Yt,fO:()=>Vt,$E:()=>gt,cE:()=>vt,JK:()=>Pt,YV:()=>ht,t9:()=>mt,YG:()=>Wt,HT:()=>bt,MY:()=>Bt,ve:()=>kt,hB:()=>zt,Ox:()=>wt,zd:()=>xt,aT:()=>Kt,VH:()=>Xt,Yb:()=>$t,Jr:()=>Qt,pP:()=>Zt,gL:()=>Jt});var E="FEATUREGRID:SET_UP",T="FEATUREGRID:SELECT_FEATURES",r="FEATUREGRID:DESELECT_FEATURES",A="FEATUREGRID:CLEAR_SELECTION",u="FEATUREGRID:SET_SELECTION_OPTIONS",N="FEATUREGRID:TOGGLE_MODE",O="FEATUREGRID:TOGGLE_FEATURES_SELECTION",I="FEATUREGRID:FEATURES_MODIFIED",R="FEATUREGRID:NEW_FEATURE",i="FEATUREGRID:SAVE_CHANGES",o="FEATUREGRID:SAVING",S="FEATUREGRID:START_EDITING_FEATURE",p="FEATUREGRID:START_DRAWING_FEATURE",_="FEATUREGRID:DELETE_GEOMETRY",f="FEATUREGRID:DELETE_GEOMETRY_FEATURE",c="FEATUREGRID:SAVE_SUCCESS",y="FEATUREGRID:CLEAR_CHANGES",D="FEATUREGRID:SAVE_ERROR",G="FEATUREGRID:DELETE_SELECTED_FEATURES",U="SET_FEATURES",F="FEATUREGRID:SORT_BY",L="FEATUREGRID:SET_LAYER",C="QUERY:UPDATE_FILTER",s="FEATUREGRID:CHANGE_PAGE",a="FEATUREGRID:GEOMETRY_CHANGED",d="DOCK_SIZE_FEATURES",l="FEATUREGRID:TOGGLE_TOOL",M="FEATUREGRID:CUSTOMIZE_ATTRIBUTE",H="ASK_CLOSE_FEATURE_GRID_CONFIRM",Y="FEATUREGRID:OPEN_GRID",V="FEATUREGRID:CLOSE_GRID",g="FEATUREGRID:CLEAR_CHANGES_CONFIRMED",v="FEATUREGRID:FEATURE_GRID_CLOSE_CONFIRMED",P="FEATUREGRID:SET_PERMISSION",h="FEATUREGRID:DISABLE_TOOLBAR",m="FEATUREGRID:ACTIVATE_TEMPORARY_CHANGES",W="FEATUREGRID:DEACTIVATE_GEOMETRY_FILTER",b="FEATUREGRID:ADVANCED_SEARCH",B="FEATUREGRID:ZOOM_ALL",k="FEATUREGRID:INIT_PLUGIN",z="FEATUREGRID:SIZE_CHANGE",w="FEATUREGRID:TOGGLE_SHOW_AGAIN_FLAG",x="FEATUREGRID:HIDE_SYNC_POPOVER",K="FEATUREGRID:UPDATE_EDITORS_OPTIONS",X="FEATUREGRID:LAUNCH_UPDATE_FILTER_FUNC",$="FEATUREGRID:SET_SYNC_TOOL",Q={EDIT:"EDIT",VIEW:"VIEW"},Z="FEATUREGRID:START_SYNC_WMS",J="FEATUREGRID:STOP_SYNC_WMS",j="STORE_ADVANCED_SEARCH_FILTER",q="LOAD_MORE_FEATURES",tt="FEATUREGRID:QUERY_RESULT",nt="FEATUREGRID:SET_TIME_SYNC",et="FEATUREGRID:SET_PAGINATION";function Et(){return{type:w}}function Tt(){return{type:x}}function rt(t,n){return{type:tt,features:t,pages:n}}function At(t){return{type:j,filterObj:t}}function ut(){return{type:k,options:arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}}}function Nt(){return{type:g}}function Ot(){return{type:v}}function It(t,n){return{type:T,features:t,append:n}}function Rt(t){return{type:E,options:t}}function it(t){return{type:a,features:t}}function ot(){return{type:S}}function St(){return{type:p}}function pt(t){return{type:r,features:t}}function _t(){return{type:_}}function ft(t){return{type:f,features:t}}function ct(){return{type:A}}function yt(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=t.multiselect,e=t.showCheckbox;return{type:u,multiselect:n,showCheckbox:e}}function Dt(t,n){return{type:F,sortBy:t,sortOrder:n}}function Gt(t,n){return{type:s,page:t,size:n}}function Ut(t){return{type:L,id:t}}function Ft(t){return{type:C,update:t,append:arguments.length>1&&void 0!==arguments[1]&&arguments[1]}}function Lt(t,n){return{type:l,tool:t,value:n}}function Ct(t,n,e){return{type:M,name:t,key:n,value:e}}function st(){return{type:N,mode:Q.EDIT}}function at(){return{type:N,mode:Q.VIEW}}function dt(t,n){return{type:I,features:t,updated:n}}function lt(t){return{type:R,features:t}}function Mt(){return{type:i}}function Ht(){return{type:c}}function Yt(){return{type:G}}function Vt(){return{type:o}}function gt(){return{type:y}}function vt(){return{type:D}}function Pt(){return{type:H}}function ht(){return{type:V}}function mt(){return{type:Y}}function Wt(t){return{type:h,disabled:t}}function bt(t){return{type:P,permission:t}}function Bt(){return{type:b}}function kt(){return{type:B}}function zt(){return{type:Z}}function wt(t,n){return{type:z,size:t,dockProps:n}}var xt=function(t){return{type:q,pages:t}},Kt=function(t){return{type:m,activated:t}},Xt=function(t){return{type:W,deactivated:t}},$t=function(t){return{type:nt,value:t}},Qt=function(t){return{type:et,size:t}},Zt=function(t){return{type:X,updateFilterAction:t}},Jt=function(t){return{type:$,syncWmsFilter:t}}}}]);