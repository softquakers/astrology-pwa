import "./globals.css";
export const metadata={title:"Astro Reports",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"Astro"},icons:{apple:"/icons/icon-192.png"}};
export const viewport={themeColor:"#0E0B1F",width:"device-width",initialScale:1,viewportFit:"cover"};
export default function L({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
