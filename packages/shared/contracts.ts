import { z } from 'zod';
export const profileInput = z.object({name:z.string().trim().min(1).max(80),role:z.string().max(160),facts:z.string().max(8000),goal:z.string().max(1000),glossary:z.string().max(2000),tone:z.enum(['clear','professional','simple'])});
export type ProfileInput = z.infer<typeof profileInput>;
export type Profile = ProfileInput & {id:string;version:number};
export const segmentInput = z.object({id:z.string().min(1).max(120),text:z.string().min(1).max(4000),final:z.boolean(),revision:z.number().int().min(1),at:z.number().nonnegative()});
export type Segment = z.infer<typeof segmentInput> & {translation?:string;translationState?:'pending'|'ready'|'error'};
/** Why a session ended; shown to the user so a stop is never silent. */
export const endReasons = ['user','tab-closed','capture-ended','agent-left','transcriber-error','connection-lost','credentials-expired','backend-unreachable','ended-by-backend','start-failed','inactive','time-limit'] as const;
export type EndReason = (typeof endReasons)[number];
export type SessionState = 'created'|'connecting'|'listening'|'paused'|'reconnecting'|'stopping'|'stopped'|'error';
export const assistKinds = ['reply', 'catch-up', 'compose'] as const;
export type AssistKind = (typeof assistKinds)[number];
export const replyStyles = ['clear', 'shorter', 'simple', 'professional', 'clarify'] as const;
export type ReplyStyle = (typeof replyStyles)[number];
export const assistInput = z.object({
  kind: z.enum(assistKinds),
  text: z.string().max(2000).default(''),
  style: z.enum(replyStyles).default('clear'),
});
export type AssistInput = z.input<typeof assistInput>;
/** `evidence` holds transcript segment IDs or "profile"; valid IDs do not prove the text is correct. */
export type Suggestion = {kind:AssistKind;text:string;evidence:string[];uncertain:boolean;question?:string};
export type Artifact = {summary:string;decisions:string[];actions:string[];improvedReplies:string[];vocabulary:{phrase:string;meaning:string;example:string}[]};
export type Session = {id:string;context:Profile;retain:boolean;state:SessionState;startedAt:number;segments:Segment[];artifact?:Artifact;processing:'idle'|'processing'|'ready'|'error';processingError?:string;endedReason?:EndReason;error?:string};
export type Credentials = {appId:string;channel:string;uid:number;agentUid:number;rtcToken:string;rtmToken:string;expiresAt:number};
