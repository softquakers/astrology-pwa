import { find } from "geo-tz";
import { DateTime } from "luxon";
import { buildChart } from "../../../lib/chart";
export async function POST(r:Request){
  const {date,time,lat,lon}=await r.json();
  if(typeof lat!=="number"||typeof lon!=="number")return Response.json({error:"Missing place"},{status:400});
  const tz=find(lat,lon)[0];
  const dt=DateTime.fromISO(`${date}T${time}`,{zone:tz});
  if(!dt.isValid)return Response.json({error:"Invalid date or time"},{status:400});
  return Response.json({tz,...buildChart(dt.toUTC().toJSDate(),lat,lon)});
}
