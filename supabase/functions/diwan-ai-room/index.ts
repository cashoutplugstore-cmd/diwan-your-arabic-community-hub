import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { autoRefreshToken:false, persistSession:false } });

function slugify(value:string){return value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").toLowerCase()||"bot";}

async function getOrCreateBot(name:string){
  const username=`ai_${slugify(name)}`; const email=`${username}@ai.diwan.local`;
  const {data:list}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  let user=list?.users?.find((u)=>u.email===email);
  if(!user){
    const created=await admin.auth.admin.createUser({email,password:`${crypto.randomUUID()}Aa9!`,email_confirm:true,user_metadata:{username,display_name:name,ai_bot:true},app_metadata:{ai_bot:true}});
    if(created.error||!created.data.user) throw created.error??new Error("failed_to_create_ai_user");
    user=created.data.user;
  }
  const {data:profile,error}=await admin.from("profiles").upsert({id:user.id,username,display_name:name,avatar_url:null,bio:"مساعد ذكاء اصطناعي معلن في ديوان",status:"online"},{onConflict:"id"}).select("*").single();
  if(error) throw error; return {user,profile};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:corsHeaders});
  try{
    if(!req.headers.get("Authorization")?.startsWith("Bearer ")) return new Response(JSON.stringify({error:"unauthorized"}),{status:401,headers:corsHeaders});
    const {roomId,roomName,message,language="ar",persona="friendly",topics=[],recentReplies=[]}=await req.json();
    if(!roomId||!message) return new Response(JSON.stringify({error:"roomId and message are required"}),{status:400,headers:corsHeaders});
    const apiKey=Deno.env.get("OPENAI_API_KEY"); if(!apiKey) return new Response(JSON.stringify({error:"OPENAI_API_KEY is not configured"}),{status:503,headers:corsHeaders});
    const botName=String(persona).split(" — ")[0]||"ديوان AI"; const bot=await getOrCreateBot(botName);
    const context=Array.isArray(recentReplies)?recentReplies.slice(-8).map((m:string)=>m).join("\n"):"";
    const topicText=Array.isArray(topics)?topics.join(", "):"";
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5-mini",input:[{role:"system",content:[{type:"input_text",text:`أنت ${botName}، بوت ذكاء اصطناعي معلن داخل مجتمع ديوان. لا تنتحل شخصية إنسان. الغرفة: ${roomName??roomId}. تحدث بالعربية العراقية الخفيفة وبشكل طبيعي وقصير. شخصيتك: ${persona}. اهتم بمواضيع: ${topicText}. لا تكرر الردود السابقة. لا تستخدم محتوى جنسي أو عنيف أو خطير. لا تدّعي أنك مستخدم بشري. السياق السابق:\n${context}`}]},{role:"user",content:[{type:"input_text",text:String(message).slice(0,2000)}]}],max_output_tokens:180,temperature:0.9})});
    const data=await response.json(); if(!response.ok) return new Response(JSON.stringify({error:data?.error?.message??"OpenAI request failed"}),{status:502,headers:corsHeaders});
    const text=data?.output_text?.trim(); if(!text) return new Response(JSON.stringify({error:"empty_ai_response"}),{status:502,headers:corsHeaders});
    const {data:saved,error:saveError}=await admin.from("messages").insert({room_id:roomId,user_id:bot.user.id,content:text}).select("id,room_id,user_id,content,created_at,reply_to_id,edited_at,is_deleted").single();
    if(saveError) throw saveError;
    return new Response(JSON.stringify({text,label:botName,message:{...saved,author:bot.profile}}),{status:200,headers:corsHeaders});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:"unknown_error"}),{status:500,headers:corsHeaders});}
});
