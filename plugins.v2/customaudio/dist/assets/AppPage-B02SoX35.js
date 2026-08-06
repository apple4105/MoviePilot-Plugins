import{importShared as G}from"./__federation_fn_import-E6wRZccp.js";const{openBlock:y,createElementBlock:C,createCommentVNode:h,toDisplayString:L,createTextVNode:x,resolveComponent:c,withCtx:d,createBlock:D,createVNode:i,normalizeClass:H,createElementVNode:u,withModifiers:J,Fragment:Z}=await G("vue"),ce={class:"customaudio-app-page pa-4"},me={key:0,class:"text-h5 mb-4"},ve={class:"d-flex justify-space-between align-center mb-3"},fe={class:"ca-form-item ca-form-item--merged"},_e={class:"ca-form-item__half"},ye={class:"ca-form-item__half"},be={class:"ca-form-item"},ge={class:"ca-input-group"},he={class:"ca-form-item"},ke={class:"d-flex justify-space-between align-center mb-3"},xe={class:"ca-form-item ca-form-item--merged"},we={class:"ca-form-item__half"},Ve={class:"ca-form-item__half"},Te={class:"ca-form-item"},Se={class:"ca-input-group"},Ae={class:"ca-form-item"},Ce=["src"],{nextTick:Re,onMounted:Ue,ref:n,watch:q}=await G("vue"),Ie={__name:"AppPage",props:{api:{type:Object,default:()=>({})},pluginId:{type:String,default:"CustomAudio"},hideTitle:{type:Boolean,default:!1},initialConfig:{type:Object,default:null},configMode:{type:Boolean,default:!1}},setup(F,{expose:Q}){const m=F,R=n(!1),U=n(!1),b=n({show:!1,text:"",type:"success"});let B=null;const w=n(!1),V=n(!1),I=n(!1),P=n(!1),v=n("idle"),f=n("idle"),j=n(!1),W=n("你好，欢迎试听，这是当前音色的声音效果。"),T=n(""),E=n(null),g=n({show:!1,text:"",color:"info"}),t=n({enabled:!0,enabled_input:!1,enabled_output:!1,input_api_key:"",input_base_url:"",input_model:"",input_language:"zh",output_api_key:"",output_base_url:"",output_model:"",output_voice:"alloy",audio_reply_with_text:!1,prev_input_provider:"openai",prev_output_provider:"openai"}),X=[{title:"中文",value:"zh"},{title:"English",value:"en"},{title:"日本語",value:"ja"},{title:"한국어",value:"ko"}];let z=null;function s(l,e="success",o=4e3){z&&clearTimeout(z),b.value={show:!0,text:l,type:e},z=setTimeout(()=>{b.value.show=!1},o)}let N=null;function Y(l,e="info",o=3e3){N&&clearTimeout(N),g.value={show:!0,text:l,color:e},N=setTimeout(()=>{g.value.show=!1},o)}function ee(l){if(!l||typeof l!="string")return l;let e=l.trim();for(let o=0;o<3&&!(e.length<4||!/^[A-Za-z0-9+/]*={0,2}$/.test(e)||e.length%4!==0);o++)try{const r=atob(e);if(!/^[\x20-\x7E\t\n\r]*$/.test(r)||r===e)break;e=r}catch{break}return e}function S(l){const e=l==="input"?"input_api_key":"output_api_key",o=t.value[e];if(!o||typeof o!="string")return;const r=ee(o);r!==o&&(t.value[e]=r,Y(`${l==="input"?"ASR":"TTS"} API Key 已自动从 Base64 解码`,"info"))}function O(){B=JSON.stringify(t.value)}function te(){return B?JSON.stringify(t.value)!==B:!1}function le(){m.initialConfig&&(t.value={...t.value,...m.initialConfig},O())}async function K(l=!1){if(m.configMode){le();return}R.value=!0;try{const e=await m.api.get("plugin/CustomAudio/config");if(e?.success){const o=e?.data;o&&typeof o=="object"&&(t.value={...t.value,...o}),O(),l&&s("配置已重新加载")}else s(e?.message||"配置加载失败","error")}catch{s("配置加载失败，使用默认值","error")}finally{R.value=!1}}function ae(){return{...t.value}}function oe(){if(t.value.enabled_input){const l=[{key:"input_api_key",label:"ASR API Key"},{key:"input_base_url",label:"ASR API 地址"},{key:"input_model",label:"ASR 模型"}];for(const e of l)if(!String(t.value[e.key]||"").trim())return s(`开启 ASR 时，${e.label} 不能为空`,"error"),!1}if(t.value.enabled_output){const l=[{key:"output_api_key",label:"TTS API Key"},{key:"output_base_url",label:"TTS API 地址"},{key:"output_model",label:"TTS 模型"},{key:"output_voice",label:"TTS 语音音色"}];for(const e of l)if(!String(t.value[e.key]||"").trim())return s(`开启 TTS 时，${e.label} 不能为空`,"error"),!1}return!0}async function ie(){if(!oe())return!1;U.value=!0;try{const l={...t.value},e=await m.api.post("plugin/CustomAudio/config",l);return e?.success?(e?.data&&(t.value={...t.value,...e.data}),O(),s(e?.message||"保存成功"),!0):(s(e?.message||"保存失败","error"),!1)}catch{return s("保存失败，请检查插件状态","error"),!1}finally{U.value=!1}}async function ue(){I.value=!0;try{const l={output_api_key:t.value.output_api_key,output_base_url:t.value.output_base_url,output_model:t.value.output_model,output_voice:t.value.output_voice},e=await m.api.post("plugin/CustomAudio/test_tts",l);e?.success?(f.value="success",s(e?.message||"TTS 连接成功")):(f.value="error",s(e?.message||"TTS 连接失败","error"))}catch{f.value="error",s("TTS 连接失败，请检查网络和配置","error")}finally{I.value=!1}}async function se(){P.value=!0;try{const l={input_api_key:t.value.input_api_key,input_base_url:t.value.input_base_url,input_model:t.value.input_model,input_language:t.value.input_language},e=await m.api.post("plugin/CustomAudio/test_asr",l);e?.success?(v.value="success",s(e?.message||"ASR 连接成功")):(v.value="error",s(e?.message||"ASR 连接失败","error"))}catch{v.value="error",s("ASR 连接失败，请检查网络和配置","error")}finally{P.value=!1}}q(()=>[t.value.input_api_key,t.value.input_base_url,t.value.input_model,t.value.input_language],()=>{v.value="idle"}),q(()=>[t.value.output_api_key,t.value.output_base_url,t.value.output_model,t.value.output_voice],()=>{f.value="idle"});function ne(l,e){const o=atob(l),r=new Uint8Array(o.length);for(let p=0;p<o.length;p++)r[p]=o.charCodeAt(p);return new Blob([r],{type:e||"audio/mpeg"})}async function re(){const l=W.value.trim();if(!l){s("请输入试听文本","error");return}j.value=!0;try{const e={output_api_key:t.value.output_api_key,output_base_url:t.value.output_base_url,output_model:t.value.output_model,output_voice:t.value.output_voice,text:l},o=await m.api.post("plugin/CustomAudio/preview_voice",e);if(o?.success&&o?.data?.audio_base64){T.value&&URL.revokeObjectURL(T.value);const r=ne(o.data.audio_base64,o.data.content_type);T.value=URL.createObjectURL(r),await Re(),E.value?.play().catch(()=>{}),s("试听音频已生成")}else s(o?.message||"试听失败","error")}catch{s("试听失败，请检查网络和配置","error")}finally{j.value=!1}}function de(){if(document.getElementById("customaudio-injected-styles"))return;const l=document.createElement("style");l.id="customaudio-injected-styles",l.textContent=`
    .ca-form-label {
      width: 85px;
      flex-shrink: 0;
      font-size: 0.875rem;
      line-height: 40px;
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
      padding-right: 12px;
    }
    .ca-form-item {
      width: 100%;
      display: flex;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    }
    .ca-form-item:last-child {
      border-bottom: none;
    }
    .ca-form-item--merged {
      gap: 8px;
      padding: 10px 0;
      align-items: flex-start;
    }
    .ca-form-item__half {
      flex: 1;
      display: flex;
      align-items: flex-start;
      min-width: 0;
    }
    .ca-form-item__half .ca-form-label {
      width: 85px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    @media (min-width: 601px) {
      .ca-form-item__half:first-child {
        flex: 1.2;
      }
      .ca-form-item__half:last-child .ca-form-label {
        width: auto;
      }
    }
    .ca-form-item__half > .v-input {
      flex: 1;
      min-width: 0;
    }
    @media (max-width: 600px) {
      .ca-form-item--merged {
        flex-direction: column;
        align-items: stretch;
        gap: 4px;
      }
      .ca-form-item__half {
        flex: none;
        width: 100%;
      }
    }
    .ca-input-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
    }
    .ca-input-group > .v-input {
      flex: 1;
      min-width: 0;
    }
    .ca-input-action-btn {
      flex-shrink: 0;
      min-width: 36px !important;
      min-height: 36px !important;
      border-radius: 6px;
      background: rgba(var(--v-theme-on-surface), 0.04);
    }
    :deep(.ca-key-field .v-field__input) {
      min-width: 0;
      text-overflow: ellipsis;
    }
  `,document.head.appendChild(l)}return Q({loadStatus:K,saveConfig:ie,getConfig:ae,hasUnsavedChanges:te,loading:R,saving:U}),Ue(()=>{de(),K(!1)}),(l,e)=>{const o=c("VAlert"),r=c("VSnackbar"),p=c("VSwitch"),$=c("VDivider"),A=c("VCol"),M=c("VRow"),k=c("VBtn"),_=c("VTextField"),pe=c("VSelect");return y(),C("div",ce,[F.hideTitle?h("",!0):(y(),C("div",me,"自定义音频 Provider")),b.value.show?(y(),D(o,{key:1,type:b.value.type,variant:"tonal",density:"compact",class:"mb-4",closable:"","onClick:close":e[0]||(e[0]=a=>b.value.show=!1)},{default:d(()=>[x(L(b.value.text),1)]),_:1},8,["type"])):h("",!0),i(r,{modelValue:g.value.show,"onUpdate:modelValue":e[1]||(e[1]=a=>g.value.show=a),color:g.value.color,location:"bottom",timeout:"3000"},{default:d(()=>[x(L(g.value.text),1)]),_:1},8,["modelValue","color"]),i(p,{modelValue:t.value.enabled,"onUpdate:modelValue":e[2]||(e[2]=a=>t.value.enabled=a),label:"启用",color:"primary","hide-details":"",class:"mb-2"},null,8,["modelValue"]),i($,{class:"mb-4"}),i(M,null,{default:d(()=>[i(A,{cols:"12",sm:"6"},{default:d(()=>[i(p,{modelValue:t.value.enabled_input,"onUpdate:modelValue":e[3]||(e[3]=a=>t.value.enabled_input=a),label:"启用语音识别 (ASR)",color:"primary","hide-details":""},null,8,["modelValue"])]),_:1}),i(A,{cols:"12",sm:"6"},{default:d(()=>[i(p,{modelValue:t.value.enabled_output,"onUpdate:modelValue":e[4]||(e[4]=a=>t.value.enabled_output=a),label:"启用语音合成 (TTS)",color:"primary","hide-details":""},null,8,["modelValue"])]),_:1})]),_:1}),i($,{class:"my-4"}),t.value.enabled_input?(y(),C(Z,{key:2},[u("div",ve,[u("div",{class:H(["text-subtitle-1 font-weight-bold",v.value==="success"?"text-success":v.value==="error"?"text-error":""])},"语音识别 (ASR / STT)",2),i(k,{color:v.value==="success"?"success":v.value==="error"?"error":"info",variant:"tonal",size:"small",loading:P.value,disabled:!t.value.input_api_key||!t.value.input_base_url,"prepend-icon":"mdi-microphone",onClick:se},{default:d(()=>[...e[20]||(e[20]=[x(" 测试 ASR 连接 ",-1)])]),_:1},8,["color","loading","disabled"])]),u("div",fe,[u("div",_e,[e[21]||(e[21]=u("span",{class:"ca-form-label"},"API 地址",-1)),i(_,{modelValue:t.value.input_base_url,"onUpdate:modelValue":e[5]||(e[5]=a=>t.value.input_base_url=a),placeholder:"https://api.openai.com/v1",hint:"兼容 OpenAI 格式的 ASR 接口地址","persistent-hint":"",density:"compact",variant:"outlined"},null,8,["modelValue"])]),u("div",ye,[e[22]||(e[22]=u("span",{class:"ca-form-label"},"模型",-1)),i(_,{modelValue:t.value.input_model,"onUpdate:modelValue":e[6]||(e[6]=a=>t.value.input_model=a),placeholder:"whisper-1",density:"compact",variant:"outlined"},null,8,["modelValue"])])]),u("div",be,[e[23]||(e[23]=u("span",{class:"ca-form-label"},"API Key",-1)),u("div",ge,[i(_,{modelValue:t.value.input_api_key,"onUpdate:modelValue":e[7]||(e[7]=a=>t.value.input_api_key=a),type:w.value?"text":"password",placeholder:"sk-...",density:"compact",variant:"outlined","hide-details":"",class:"ca-key-field",onBlur:e[8]||(e[8]=a=>S("input")),onPaste:e[9]||(e[9]=()=>l.setTimeout(()=>S("input"),50))},null,8,["modelValue","type"]),t.value.input_api_key?(y(),D(k,{key:0,icon:w.value?"mdi-eye-off":"mdi-eye",size:"small",variant:"tonal",class:"ca-input-action-btn",onClick:e[10]||(e[10]=J(a=>w.value=!w.value,["stop"]))},null,8,["icon"])):h("",!0)])]),u("div",he,[e[24]||(e[24]=u("span",{class:"ca-form-label"},"识别语言",-1)),i(pe,{modelValue:t.value.input_language,"onUpdate:modelValue":e[11]||(e[11]=a=>t.value.input_language=a),items:X,density:"compact",variant:"outlined"},null,8,["modelValue"])])],64)):h("",!0),i($,{class:"my-4"}),t.value.enabled_output?(y(),C(Z,{key:3},[u("div",ke,[u("div",{class:H(["text-subtitle-1 font-weight-bold",f.value==="success"?"text-success":f.value==="error"?"text-error":""])},"语音合成 (TTS)",2),i(k,{color:f.value==="success"?"success":f.value==="error"?"error":"info",variant:"tonal",size:"small",loading:I.value,disabled:!t.value.output_api_key||!t.value.output_base_url,"prepend-icon":"mdi-speaker",onClick:ue},{default:d(()=>[...e[25]||(e[25]=[x(" 测试 TTS 连接 ",-1)])]),_:1},8,["color","loading","disabled"])]),u("div",xe,[u("div",we,[e[26]||(e[26]=u("span",{class:"ca-form-label"},"API 地址",-1)),i(_,{modelValue:t.value.output_base_url,"onUpdate:modelValue":e[12]||(e[12]=a=>t.value.output_base_url=a),placeholder:"https://api.openai.com/v1",hint:"兼容 OpenAI 格式的 TTS 接口地址","persistent-hint":"",density:"compact",variant:"outlined"},null,8,["modelValue"])]),u("div",Ve,[e[27]||(e[27]=u("span",{class:"ca-form-label"},"模型",-1)),i(_,{modelValue:t.value.output_model,"onUpdate:modelValue":e[13]||(e[13]=a=>t.value.output_model=a),placeholder:"tts-1",density:"compact",variant:"outlined"},null,8,["modelValue"])])]),u("div",Te,[e[28]||(e[28]=u("span",{class:"ca-form-label"},"API Key",-1)),u("div",Se,[i(_,{modelValue:t.value.output_api_key,"onUpdate:modelValue":e[14]||(e[14]=a=>t.value.output_api_key=a),type:V.value?"text":"password",placeholder:"sk-...",density:"compact",variant:"outlined","hide-details":"",class:"ca-key-field",onBlur:e[15]||(e[15]=a=>S("output")),onPaste:e[16]||(e[16]=()=>l.setTimeout(()=>S("output"),50))},null,8,["modelValue","type"]),t.value.output_api_key?(y(),D(k,{key:0,icon:V.value?"mdi-eye-off":"mdi-eye",size:"small",variant:"tonal",class:"ca-input-action-btn",onClick:e[17]||(e[17]=J(a=>V.value=!V.value,["stop"]))},null,8,["icon"])):h("",!0)])]),u("div",Ae,[e[29]||(e[29]=u("span",{class:"ca-form-label"},"语音音色",-1)),i(_,{modelValue:t.value.output_voice,"onUpdate:modelValue":e[18]||(e[18]=a=>t.value.output_voice=a),placeholder:"请输入音色名称",hint:"音色名称，由供应商定义","persistent-hint":"",density:"compact",variant:"outlined"},null,8,["modelValue"])]),i(M,{class:"align-center mb-2"},{default:d(()=>[i(A,{cols:"12",sm:"6"},{default:d(()=>[i(p,{modelValue:t.value.audio_reply_with_text,"onUpdate:modelValue":e[19]||(e[19]=a=>t.value.audio_reply_with_text=a),label:"语音回复附带文字",color:"primary",hint:"开启后，Telegram 等渠道发送语音回复时将同时附带文字消息内容","persistent-hint":"","hide-details":""},null,8,["modelValue"])]),_:1}),i(A,{cols:"12",sm:"6",class:"d-flex align-center ga-3"},{default:d(()=>[u("audio",{ref_key:"previewAudioRef",ref:E,src:T.value,controls:"",style:{height:"40px",width:"260px",flex:"0 0 260px"}},null,8,Ce),i(k,{color:"primary",variant:"tonal",size:"small",loading:j.value,disabled:!t.value.output_api_key||!t.value.output_base_url||!t.value.output_voice,"prepend-icon":"mdi-headphones",onClick:re},{default:d(()=>[...e[30]||(e[30]=[x(" 试听音色 ",-1)])]),_:1},8,["loading","disabled"])]),_:1})]),_:1})],64)):h("",!0)])}}};export{Ie as _};
