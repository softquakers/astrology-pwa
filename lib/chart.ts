import { Body, GeoVector, Ecliptic, MakeTime, SiderealTime } from "astronomy-engine";
export const SIGNS=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAMES=["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"] as const;
const ASPECTS:[string,number][]=[["conjunction",0],["sextile",60],["square",90],["trine",120],["opposition",180]];
const rad=(d:number)=>d*Math.PI/180, norm=(d:number)=>((d%360)+360)%360;
// Tropical zodiac, Whole Sign houses. Positions are geocentric ecliptic longitudes of date.
export function buildChart(utc:Date,lat:number,lon:number){
  const t=MakeTime(utc);
  const raw=NAMES.map(n=>({name:n,lon:norm(Ecliptic(GeoVector(Body[n],t,true)).elon)}));
  const ramc=norm(SiderealTime(t)*15+lon), eps=23.4393;
  const asc=norm(Math.atan2(Math.cos(rad(ramc)),-(Math.sin(rad(ramc))*Math.cos(rad(eps))+Math.tan(rad(lat))*Math.sin(rad(eps))))*180/Math.PI);
  const ascSign=Math.floor(asc/30);
  const planets=raw.map(p=>({name:p.name,lon:p.lon,sign:SIGNS[Math.floor(p.lon/30)],deg:+(p.lon%30).toFixed(2),house:((Math.floor(p.lon/30)-ascSign+12)%12)+1}));
  const aspects:string[]=[];
  for(let i=0;i<raw.length;i++)for(let j=i+1;j<raw.length;j++){const d=Math.abs(raw[i].lon-raw[j].lon),a=d>180?360-d:d;
    for(const[n,v]of ASPECTS)if(Math.abs(a-v)<=6)aspects.push(`${raw[i].name} ${n} ${raw[j].name}`)}
  return{asc:`${SIGNS[ascSign]} ${(asc%30).toFixed(2)}°`,planets,aspects};
}
