import "./globals.css";
export const metadata={title:"Astrology App — Astro Reports",description:"Calculate your high-precision birth chart, rising sign, planetary positions, and celestial readings.",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Astrology App"},icons:{apple:"/icons/icon-192.png"}};
export const viewport={themeColor:"#0E0B1F",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function L({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
