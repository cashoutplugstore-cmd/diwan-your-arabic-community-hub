import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken:false, persistSession:false } });

type Dialect = "iraqi"|"saudi"|"kuwaiti"|"emirati"|"qatari"|"bahraini"|"omani";
const personas: Record<Dialect, Array<{name:string; personality:string; topics:string[]}>> = {
  iraqi: [
    ["زهراء","اجتماعية ومرحة",["القهوة","الأكل","المسلسلات"]],["رُبى","هادئة وفضولية",["السفر","الدراسة","التقنية"]],["بتول","خفيفة دم",["الموسيقى","الأفلام","الويكند"]],["شهد","تحب النقاش",["الرياضة","الألعاب","الأكل"]],["كوثر","تحب مساعدة الآخرين",["الدراسة","العمل","السفر"]],["فرح","سريعة البديهة",["الأفلام","الضحك","الموسيقى"]],["حيدر","اجتماعي",["الرياضة","السيارات","الأكل"]],["كرار","فضولي",["التقنية","الألعاب","السفر"]],["مرتضى","هادئ",["القهوة","الموسيقى","العمل"]],["سجاد","خفيف دم",["الرياضة","الألعاب","الويكند"]],["قاسم","محب للنقاش",["التقنية","الأفلام","الدراسة"]],["ضرغام","اجتماعي",["السيارات","السفر","الرياضة"]],["حسين","فضولي",["الأكل","المسلسلات","القهوة"]],["مهدي","هادئ ومرح",["الموسيقى","الدراسة","التقنية"]],["وسام","سريع البديهة",["الضحك","الويكند","الأفلام"]]
  ].map(([name,personality,topics])=>({name,personality,topics} as any)),
  saudi: ["الجوهرة","العنود","مشاعل","غلا","أريام","تالا","راكان","نايف","تركي","وليد","بندر","مشاري","متعب","عبدالعزيز","زياد"].map((name,i)=>({name,personality:["اجتماعي ومرح","هادئ وفضولي","سريع البديهة","محب للنقاش"][i%4],topics:[["القهوة","السفر","المسلسلات"],["التقنية","الدراسة","العمل"],["الرياضة","السيارات","الألعاب"]][i%3]})),
  kuwaiti: ["لولوة","حصة","الجود","شوق","ريما","نوف","بدر","مشعل","فيصل","نواف","يعقوب","عبدالرحمن","فهدان","صالح","جابر"].map((name,i)=>({name,personality:["اجتماعي ومرح","هادئ وفضولي","خفيف دم","محب للنقاش"][i%4],topics:[["القهوة","الأكل","الويكند"],["السفر","التقنية","الألعاب"],["الموسيقى","الأفلام","الرياضة"]][i%3]})),
  emirati: ["اليازية","شمسة","موزة","مهرة","عوشة","بدور","زايد","سيف","حمدان","راشدون","خليفة","طحنون","سلطان","نهيان","مرشد"].map((name,i)=>({name,personality:["اجتماعي ومرح","هادئ وفضولي","سريع البديهة","خفيف دم"][i%4],topics:[["السفر","القهوة","السيارات"],["التقنية","الألعاب","العمل"],["الموسيقى","الأفلام","الويكند"]][i%3]})),
  qatari: ["مياسة","دانة","حصّة","جاسم","تميم","سعود","مشعل","حمد","فهد","راشد","نواف","غانم","مريم","هيا","شيخة"].map((name,i)=>({name,personality:["اجتماعي ومرح","محب للنقاش","هادئ وفضولي","خفيف دم"][i%4],topics:[["القهوة","السفر","الرياضة"],["الأكل","الأفلام","المسلسلات"],["التقنية","الدراسة","الألعاب"]][i%3]})),
  bahraini: ["نرجس","أفنان","طيبة","حور","باقر","عليان","سلمان","يوسفان","هاشم","رضا","صادق","بدرية","سارة","ليان","جود"].map((name,i)=>({name,personality:["اجتماعي ومرح","هادئ وفضولي","محب للنقاش","سريع البديهة"][i%4],topics:[["القهوة","الأكل","الموسيقى"],["السفر","التقنية","الدراسة"],["الرياضة","الألعاب","الويكند"]][i%3]})),
  omani: ["مزون","خولة","أروى","أثير","غالية","مها","حمود","مازن","خميس","بركات","سالمون","هلال","سهيل","سيفان","عدي"].map((name,i)=>({name,personality:["اجتماعي ومرح","هادئ وفضولي","خفيف دم","محب للنقاش"][i%4],topics:[["السفر","القهوة","العمل"],["الأكل","الأفلام","الموسيقى"],["التقنية","الرياضة","الألعاب"]][i%3]})),
};

function dialectFor(value: unknown): Dialect|null { const v=String(value??"").toLowerCase(); if(v==='iq'||v.includes('iraq')||v.includes('العراق'))return'iraqi'; if(v==='sa'||v.includes('saudi')||v.includes('السعود'))return'saudi'; if(v==='kw'||v.includes('kuwait')||v.includes('الكويت'))return'kuwaiti'; if(v==='ae'||v.includes('uae')||v.includes('emirat')||v.includes('الإمارات'))return'emirati'; if(v==='qa'||v.includes('qatar')||v.includes('قطر'))return'qatari'; if(v==='bh'||v.includes('bahrain')||v.includes('البحرين'))return'bahraini'; if(v==='om'||v.includes('oman')||v.includes('عمان'))return'omani'; return null; }
function slugify(v:string){return v.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").toLowerCase()||"bot";}
async function getOrCreateBot(name:string){ const username=`ai_${slugify(name)}`; const email=`${username}@ai.diwan.local`; const {data:list}=await admin.auth.admin.listUsers({page:1,perPage:1000}); let user=list?.users?.find((u)=>u.email===email); if(!user){const created=await admin.auth.admin.createUser({email,password:`${crypto.randomUUID()}Aa9!`,email_confirm:true,user_metadata:{username,display_name:name,ai_bot:true},app_metadata:{ai_bot:true}}); if(created.error||!created.data.user)throw created.error??new Error("failed_to_create_ai_user"); user=created.data.user;} const {data:profile,error}=await admin.from("profiles").upsert({id:user.id,username,display_name:name,avatar_url:null,bio:"مساعد ذكاء اصطناعي معلن في ديوان",status:"online"},{onConflict:"id"}).select("*").single(); if(error)throw error; return {user,profile}; }

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return new Response(JSON.stringify({error:'method_not_allowed'}),{status:405,headers:corsHeaders});
  try{
    if(!req.headers.get('Authorization')?.startsWith('Bearer '))return new Response(JSON.stringify({error:'unauthorized'}),{status:401,headers:corsHeaders});
    const {roomId}=await req.json();
    if(!roomId)return new Response(JSON.stringify({error:'roomId_required'}),{status:400,headers:corsHeaders});
    const {data:room,error:roomError}=await admin.from('rooms').select('id,name,slug,country_code,is_private').eq('id',roomId).maybeSingle();
    if(roomError)throw roomError;
    if(!room||room.is_private)return new Response(JSON.stringify({skipped:true}),{status:200,headers:corsHeaders});
    const {data:claim,error:claimError}=await admin.rpc('claim_ai_room_ambient',{p_room_id:roomId,p_min_interval_seconds:45});
    if(claimError)throw claimError;
    const row=Array.isArray(claim)?claim[0]:claim;
    if(!row?.claimed)return new Response(JSON.stringify({skipped:true}),{status:200,headers:corsHeaders});
    const dialect=dialectFor(room.country_code)||dialectFor(`${room.slug} ${room.name}`);
    if(!dialect)return new Response(JSON.stringify({skipped:true}),{status:200,headers:corsHeaders});
    const pool=personas[dialect]; const member=pool[(Number(row.member_index)||0)%pool.length]!;
    const bot=await getOrCreateBot(member.name);
    const {data:recent}=await admin.from('messages').select('content,user_id').eq('room_id',roomId).order('created_at',{ascending:false}).limit(8);
    const recentText=(recent??[]).reverse().map((m)=>String(m.content)).join('\n');
    const apiKey=Deno.env.get('OPENAI_API_KEY'); let text='';
    if(apiKey){ const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5-mini',input:[{role:'system',content:[{type:'input_text',text:`أنت ${member.name}، شخصية ذكاء اصطناعي معلنة داخل مجتمع ديوان. لا تنتحل شخصية إنسان. أنت شخصية افتراضية ثابتة في غرفة ${room.name}. تحدث بلهجة ${dialect} وبأسلوب ${member.personality}. اهتم بمواضيع: ${member.topics.join(', ')}. ابدأ موضوعًا قصيرًا أو علّق على السياق السابق. لا تكرر آخر الرسائل. لا تقل إنك عضو بشري. لا تستخدم محتوى جنسي أو عنيف أو خطير. السياق الأخير:\n${recentText}`}] }],max_output_tokens:180,temperature:0.9})}); const data=await response.json(); if(response.ok)text=String(data?.output_text??'').trim(); }
    if(!text)text=`${member.name}: يا جماعة، شرايكم نحچي شوي عن ${member.topics[0]}؟ 😄`;
    const {data:saved,error:saveError}=await admin.from('messages').insert({room_id:roomId,user_id:bot.user.id,content:text}).select('id,room_id,user_id,content,created_at,reply_to_id,edited_at,is_deleted').single();
    if(saveError)throw saveError;
    return new Response(JSON.stringify({created:true,message:{...saved,author:bot.profile}}),{status:200,headers:corsHeaders});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'unknown_error'}),{status:500,headers:corsHeaders});}
});
