export async function GET(r:Request){
  const q=new URL(r.url).searchParams.get("q")||"";
  const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,{headers:{"User-Agent":"astro-pwa/0.1"}});
  const j=await res.json();
  if(!j[0])return Response.json({error:"Place not found"},{status:404});
  return Response.json({lat:+j[0].lat,lon:+j[0].lon,label:j[0].display_name});
}
