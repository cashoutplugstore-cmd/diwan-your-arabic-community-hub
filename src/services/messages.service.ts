import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { aiMembers, buildAiConversation } from "@/data/aiMembers";
import type { MessageWithAuthor, Profile } from "@/types";

export const MESSAGE_PAGE_SIZE = 40;
export const MAX_MESSAGE_LENGTH = 2000;
type AIReplyHandler = (reply: MessageWithAuthor) => void;
const recentAIContent = new Map<string, string[]>();
const scheduledAIByMessage = new Set<string>();
const aiCursorByRoom = new Map<string, number>();

export async function fetchMessagePage(roomId: string, before?: string | null): Promise<MessageWithAuthor[]> {
  let query = supabase.from("messages").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(MESSAGE_PAGE_SIZE);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  const realRows = error ? [] : (data ?? []).slice().reverse();
  const authorIds = [...new Set(realRows.map((m) => m.user_id))];
  const { data: profiles } = authorIds.length ? await supabase.from("profiles").select("*").in("id", authorIds) : { data: [] as Profile[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return realRows.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null, is_deleted: Boolean(m.is_deleted) }));
}

function aiMemberFor(roomId: string, salt: number): { member: typeof aiMembers[number]; author: Profile } {
  const index = (aiCursorByRoom.get(roomId) ?? 0) % aiMembers.length;
  aiCursorByRoom.set(roomId, index + 1);
  const member = aiMembers[(index + salt - 1) % aiMembers.length]!;
  const author = { id: `ai-local-${index}`, display_name: member.name, username: `ai_${index}`, avatar_url: null, bio: member.personality, status: "online", created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Profile;
  return { member, author };
}

const fallbackReplies = ["ههههه إي والله 😂", "أتفق وياك 😄", "لااا شنو هالحچي 😂", "والله سؤال حلو 👀", "حلوة السالفة، كملوا 😄", "ذكرتيني بموقف صار وياي 😂", "منو جربها؟ 👀", "خل نسويها ونشوف 😂"];
function uniqueAIContent(roomId: string, candidate: string, salt: number, source: string) {
  const normalized = candidate.trim().replace(/\s+/g, " "); const recent = recentAIContent.get(roomId) ?? [];
  if (normalized && !recent.includes(normalized)) { recentAIContent.set(roomId, [...recent, normalized].slice(-10)); return normalized; }
  const seed = Math.abs([...`${roomId}:${source}:${salt}:${recent.length}`].reduce((n,c)=>n*33+c.charCodeAt(0),7));
  for(let offset=0;offset<fallbackReplies.length;offset++){const fallback=fallbackReplies[(seed+offset)%fallbackReplies.length]!;if(!recent.includes(fallback)){recentAIContent.set(roomId,[...recent,fallback].slice(-10));return fallback;}}
  return normalized || "إي والله 😄";
}
function fallbackReply(author: Profile, roomId: string, source: string, salt: number, createdAt: number, member: typeof aiMembers[number]): MessageWithAuthor {
  const generated=buildAiConversation(member,recentAIContent.get(roomId)??[]).text??""; const content=uniqueAIContent(roomId,generated,salt,source);
  return {id:`ai-fallback-${roomId}-${createdAt}-${salt}`,room_id:roomId,user_id:author.id,content,created_at:new Date(createdAt).toISOString(),reply_to_id:null,edited_at:null,is_deleted:false,author};
}

async function requestAIRoomReply(roomId: string, message: string, salt: number, createdAt: number, onReply?: AIReplyHandler) {
  const { member, author } = aiMemberFor(roomId,salt);
  try {
    const recent=(recentAIContent.get(roomId)??[]).slice(-6);
    const {data,error}=await supabase.functions.invoke("diwan-ai-room",{body:{roomId,roomName:roomId,message,language:"ar",persona:`${member.name} — ${member.personality}`,recentReplies:recent,topics:member.topics,instruction:`أنت ${member.name}، شخصية ${member.personality}. شارك في حوار عربي طبيعي وخفيف. اهتم بمواضيعك: ${member.topics.join(", ")}. لا تكرر كلاماً سابقاً ولا تتحدث كروبوت.`}});
    if(!error&&data?.message&&onReply){
      const content=uniqueAIContent(roomId,String(data.message.content??data.text??""),salt,message);
      onReply({...data.message,content,author:data.message.author??author,is_deleted:Boolean(data.message.is_deleted)} as MessageWithAuthor);
      return;
    }
  }catch{/* local fallback below */}
  onReply?.(fallbackReply(author,roomId,message,salt,createdAt,member));
}

export function triggerAIRoomReplies(input:{roomId:string;messageId:string;message:string;createdAt:string;onReply?:AIReplyHandler}){
  if(!input.onReply||!input.message.trim())return; const key=`${input.roomId}:${input.messageId}`; if(scheduledAIByMessage.has(key))return; scheduledAIByMessage.add(key);
  const firstDelay=1500+Math.floor(Math.random()*1800), secondDelay=4200+Math.floor(Math.random()*2200), onReply=input.onReply;
  window.setTimeout(()=>{void requestAIRoomReply(input.roomId,input.message,1,Date.now(),onReply);},firstDelay);
  window.setTimeout(()=>{void requestAIRoomReply(input.roomId,input.message,2,Date.now(),onReply);scheduledAIByMessage.delete(key);},secondDelay);
}

export async function sendMessage(input:{roomId:string;userId:string;content:string;replyToId?:string|null;onAIReply?:AIReplyHandler}){
  const content=input.content.trim().slice(0,MAX_MESSAGE_LENGTH); if(!content)throw new Error("empty"); const clientCreatedAt=new Date().toISOString();
  const {data,error}=await supabase.from("messages").insert({room_id:input.roomId,user_id:input.userId,content,reply_to_id:input.replyToId??null}).select("id,created_at").single(); if(error)throw error;
  if(typeof window!=="undefined")window.localStorage.setItem(`diwan:last-real-message:${input.roomId}`,String(Date.now()));
  const replyInput={roomId:input.roomId,messageId:data?.id??`${input.userId}:${clientCreatedAt}`,message:content,createdAt:data?.created_at??clientCreatedAt};
  if(input.onAIReply)triggerAIRoomReplies({...replyInput,onReply:input.onAIReply});
}
export async function editMessage(id:string,content:string){const {error}=await supabase.from("messages").update({content:content.trim().slice(0,MAX_MESSAGE_LENGTH),edited_at:new Date().toISOString()}).eq("id",id);if(error)throw error;}
export async function deleteMessage(id:string){const {error}=await supabase.from("messages").update({is_deleted:true}).eq("id",id);if(error)throw error;}
export const messagesQuery=(roomId:string|undefined)=>queryOptions({queryKey:["messages",roomId],queryFn:()=>fetchMessagePage(roomId!),enabled:Boolean(roomId)});
