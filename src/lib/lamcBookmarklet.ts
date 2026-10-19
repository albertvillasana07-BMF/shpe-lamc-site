/**
 * Builds the "Send to SHPE" bookmark. It runs on LAMC's events page in the
 * board member's own browser (which gets past LAMC's bot protection like any
 * visitor), reads the upcoming events already on the screen, and opens our
 * import page with them.
 */
export function buildBookmarklet(siteOrigin: string) {
  const source = `(()=>{
const SITE=${JSON.stringify(siteOrigin)};
const re=/\\/campus-life\\/events\\/(\\d{4})\\/(\\d{1,2})\\/(\\d{1,2})\\/([a-z0-9-]+)\\/?$/i;
const n=new Date();const today=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");
const clean=s=>(s||"").replace(/\\s+/g," ").trim().slice(0,160);
const out=new Map();
const add=(href,title,extra)=>{let p;try{p=new URL(href,location.href)}catch(e){return}
const m=p.pathname.match(re);if(!m)return;
const d=m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");if(d<today)return;
const u="https://www.lamc.edu"+p.pathname.replace(/\\/$/,"");
const prev=out.get(u)||{u:u,d:d,t:""};const t=clean(title);
if(t.length>prev.t.length)prev.t=t;Object.assign(prev,extra||{});
if(!prev.t)prev.t=m[4].replace(/-/g," ");out.set(u,prev)};
document.querySelectorAll("a[href]").forEach(a=>{const h=a.querySelector("h1,h2,h3,h4");add(a.getAttribute("href"),(h&&h.textContent)||a.getAttribute("aria-label")||a.textContent)});
if(re.test(location.pathname)){const lines=(document.querySelector("main")||document.body).innerText.split("\\n").map(clean).filter(Boolean);
const h1=document.querySelector("h1");const extra={};
const desc=lines.find(l=>l.length>60&&!/^request for accommodation/i.test(l));if(desc)extra.desc=desc;
const tm=lines.join(" ").match(/\\d{1,2}(:\\d{2})?\\s*(a\\.?m\\.?|p\\.?m\\.?)?\\s*(–|-|to)\\s*\\d{1,2}(:\\d{2})?\\s*(a\\.?m\\.?|p\\.?m\\.?)/i);if(tm)extra.time=tm[0];
const wi=lines.findIndex(l=>/^(where|location)\\s*:?/i.test(l));if(wi>=0){const v=lines[wi].replace(/^(where|location)\\s*:?\\s*/i,"")||lines[wi+1];if(v)extra.loc=v.slice(0,140)}
add(location.href,h1&&h1.textContent,extra)}
const list=[...out.values()];
if(!list.length){alert("No upcoming LAMC events found on this page. Open lamc.edu/campus-life/events first, then click this bookmark.");return}
window.open(SITE+"/admin/events/import#"+encodeURIComponent(JSON.stringify(list)),"_blank")
})()`;
  return "javascript:" + encodeURIComponent(source.replace(/\n/g, ""));
}
