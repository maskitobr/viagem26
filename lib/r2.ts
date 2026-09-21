import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
const required=["R2_ACCOUNT_ID","R2_BUCKET","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY"] as const;
function client(){for(const key of required)if(!process.env[key])throw new Error("R2 não configurado.");return new S3Client({region:"auto",endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID!,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY!}})}
export async function putImage(Key:string,Body:Uint8Array,ContentType:string){await client().send(new PutObjectCommand({Bucket:process.env.R2_BUCKET!,Key,Body,ContentType}));}
export async function getImage(Key:string){return client().send(new GetObjectCommand({Bucket:process.env.R2_BUCKET!,Key}));}
export function validKey(key:string){return /^(profiles|ideas)\/[0-9a-f-]+\.(jpg|png|webp)$/.test(key)}

