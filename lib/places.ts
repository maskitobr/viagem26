export type Place={sourceId:string;title:string;address:string;type:string;mapQuery:string};
export function normalizePlace(x:any):Place{const p=String(x.display_name||"").split(",").map((s:string)=>s.trim());return{sourceId:String(x.place_id),title:p.shift()||"Lugar",address:p.join(", "),type:String(x.type||"lugar"),mapQuery:String(x.display_name||"")}}
const cities=new Set(["Chicago","Dallas","Orlando"]);
export async function searchPlaces(query:string,city:string){if(!cities.has(city)||!query.trim())throw new Error("Busca inválida.");const u=new URL("https://nominatim.openstreetmap.org/search");u.searchParams.set("q",query.slice(0,80)+", "+city+", USA");u.searchParams.set("format","jsonv2");u.searchParams.set("limit","8");const r=await fetch(u,{headers:{"User-Agent":"Central-da-Viagem/1.0"}});if(!r.ok)throw new Error("Busca indisponível.");return (await r.json()).map(normalizePlace)}

