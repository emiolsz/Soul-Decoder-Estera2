// Samodzielny PDF z osadzonym fontem Unicode. Bez zewnętrznych usług i danych w URL.
import {formatDate} from './report.mjs';
const encode=new TextEncoder();
const concat=chunks=>{const size=chunks.reduce((n,c)=>n+c.length,0),out=new Uint8Array(size);let off=0;for(const c of chunks){out.set(c,off);off+=c.length;}return out;};
const bytes=s=>typeof s==='string'?encode.encode(s):s;
const hex=s=>Array.from(s).map(c=>{const n=c.codePointAt(0);return (n<=65535?n:63).toString(16).padStart(4,'0');}).join('').toUpperCase();
export function buildPDF(report,fontBytes,metrics,boldFont=null) {
  const objects=[]; const add=s=>{objects.push(bytes(s));return objects.length;};
  const stream=(dict,data)=>{data=bytes(data);return add(concat([bytes(`<< ${dict} /Length ${data.length} >>\nstream\n`),data,bytes('\nendstream')]));};
  const reserve=()=>add('');const catalog=reserve(),pagesObj=reserve();
  const fontStream=stream(`/Length1 ${fontBytes.length}`,fontBytes);
  const cidmap=new Uint8Array(131072);
  for(const [code,[glyph]] of Object.entries(metrics)){cidmap[Number(code)*2]=glyph>>8;cidmap[Number(code)*2+1]=glyph&255;}
  const mapObj=stream('',cidmap);
  const descriptor=add(`<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [-1021 -463 1793 1233] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 729 /StemV 80 /FontFile2 ${fontStream} 0 R >>`);
  const used=new Set(); let current=[],allPages=[],y=0;
  const width=(s,size)=>Array.from(s).reduce((n,c)=>n+((size>=14&&boldFont?boldFont.metrics:metrics)[c.codePointAt(0)]?.[1]??600),0)*size/1000;
  const text=(s,x,yy,size=10,color='0.22 0.23 0.29',bold=false)=>{for(const c of s)used.add(c.codePointAt(0)<=65535?c.codePointAt(0):63);current.push(`BT /${boldFont&&(size>=14||bold)?'F2':'F1'} ${size} Tf ${color} rg 1 0 0 1 ${x} ${yy} Tm <${hex(s)}> Tj ET`);};
  const line=(x1,y1,x2,y2,color='0.76 0.68 0.48')=>current.push(`${color} RG 0.65 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const rect=(x,yy,w,h,color)=>current.push(`${color} rg ${x} ${yy} ${w} ${h} re f`);
  function newPage() {
    if(current.length)allPages.push(current.join('\n'));
    current=[]; rect(0,0,595.28,841.89,'0.992 0.984 0.969');
    text('KOD ARCHITEKTURY DUSZY',45,802,10,'0.14 0.23 0.23');
    text('Soul Decoder Estera',45,784,8,'0.46 0.42 0.39');
    let header=`${report.name} / ${formatDate(report.date)}`;
    while(width(header,8)>237) header=header.slice(0,-2)+'…';
    text(header,550-width(header,8),802,8);line(45,769,550,769);
    text(`Data wygenerowania: ${report.generated}`,45,39,7);
    text(String(allPages.length+1).padStart(2,'0'),530,39,8);
    text(`${report.footer||'Geometria kodu. Perspektywa prawdy. • Wszelkie prawa zastrzeżone dla Soul Decoder Estera ©'} ${new Date().getFullYear()}`,45,23,6.5);
    y=734;
  }
  const ensure=h=>{if(y-h<65)newPage();};
  const wrap=(s,size,max=505)=>{
    const lines=[]; let row='';
    for(const word of s.split(/\s+/)) {
      if(width(word,size)>max) {
        if(row){lines.push(row);row='';}
        let piece='';for(const c of word){if(width(piece+c,size)>max){lines.push(piece);piece='';}piece+=c;}row=piece;
      }else if(row&&width(row+' '+word,size)>max){lines.push(row);row=word;}else row+=(row?' ':'')+word;
    }
    if(row)lines.push(row);return lines;
  };
  const paragraph=(s,{size=10.2,gap=10,color='0.22 0.23 0.29',bold=false}={})=>{const rows=wrap(s,size);const leading=size*1.48;ensure(Math.min(rows.length*leading+gap,50));for(const row of rows){ensure(leading);text(row,45,y,size,color,bold);y-=leading;}y-=gap;};
  const heading=s=>{ensure(58);paragraph(s,{size:19,gap:13,color:'0.14 0.23 0.23'});};
  const blocks=arr=>{for(let i=0;i<arr.length;i++){const p=arr[i];if(i===arr.length-2&&arr[i+1].length<100)ensure(wrap(p,10.2).length*15.1+wrap(arr[i+1],10.2).length*15.1+33);const isHeading=p.length<95&&!/[.!?]$/.test(p);if(isHeading)ensure(55);paragraph(p,{size:isHeading?11.5:10.2,gap:isHeading?8:11,color:isHeading?'0.42 0.32 0.18':'0.22 0.23 0.29',bold:isHeading});}};
  newPage();
  const gold='0.65 0.54 0.32';
  const circle=(cx,cy,r)=>{const k=r*.55228475;current.push(`${gold} RG 0.55 w ${cx+r} ${cy} m ${cx+r} ${cy+k} ${cx+k} ${cy+r} ${cx} ${cy+r} c ${cx-k} ${cy+r} ${cx-r} ${cy+k} ${cx-r} ${cy} c ${cx-r} ${cy-k} ${cx-k} ${cy-r} ${cx} ${cy-r} c ${cx+k} ${cy-r} ${cx+r} ${cy-k} ${cx+r} ${cy} c S`);};
  y=690;paragraph(report.quote,{size:12,gap:25,color:'0.14 0.23 0.23'});
  const coverName=wrap(`Analiza dla ${report.name}`,16,280);
  text(report.title||'KOD ARCHITEKTURY DUSZY',45,447,10,'0.14 0.23 0.23',true);
  coverName.forEach((row,i)=>text(row,45,417-i*23,16,'0.14 0.23 0.23'));
  const dateLong=new Intl.DateTimeFormat('pl-PL',{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${report.date}T12:00:00Z`));
  text(dateLong,45,390-(coverName.length-1)*23,10,'0.14 0.23 0.23');
  if(report.orderNumber)text(`Zamówienie: ${report.orderNumber}`,45,365-(coverName.length-1)*23,9,'0.14 0.23 0.23');
  const cx=442,cy=413,r=90;circle(cx,cy,r);circle(cx,cy,r-15);
  const order=['Prawa','Lewa','Gleboka','Talent','Wezel','Tikkun'];
  order.forEach((key,i)=>{const angle=(90-i*60)*Math.PI/180,x=cx+Math.cos(angle)*(r+12),yy=cy+Math.sin(angle)*(r+12),value=String(report.sections.find(s=>s.key===key).value);rect(x-13,yy-8,26,20,'0.992 0.984 0.969');text(value,x-width(value,11)/2,yy-3,11,gold);});
  const center=report.sections.find(s=>s.key==='Prawa').letter;text(center,cx-width(center,36)/2,cy-12,36,gold);
  if(report.chapters) {
    for(const chapter of report.chapters){newPage();heading(chapter.title);blocks(chapter.paragraphs);}
  } else {
    newPage();heading('Architektura Duszy');blocks(report.introduction);
    for(const section of report.sections){newPage();heading(section.title);blocks(section.introduction);ensure(115);rect(45,y-68,505,74,'0.97 0.94 0.87');text(String(section.value),60,y-42,30,'0.42 0.32 0.18');text(section.letter,119,y-42,28,'0.14 0.23 0.23');text(section.letterName,173,y-15,11);const rows=wrap(section.formula,9,365);rows.forEach((s,i)=>text(s,173,y-34-i*13,9));y-=94;ensure(60);paragraph(report.numericOnly?'LITERA I POWIĄZANIE ŹRÓDŁOWE':'INTERPRETACJA WARTOŚCI',{size:9,gap:12,color:'0.42 0.32 0.18'});blocks(section.interpretation);}
    if(report.synthesis.length){newPage();heading('Synteza Architektury Duszy');blocks(report.synthesis);}
  }
  allPages.push(current.join('\n'));
  const unicode=stream('',`/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n1 beginbfrange\n<0000> <FFFF> <0000>\nendbfrange\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`);
  const widths=[...used].sort((a,b)=>a-b).map(c=>`${c} [${metrics[c]?.[1]??600}]`).join(' ');
  const cid=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /DW 600 /W [${widths}] /CIDToGIDMap ${mapObj} 0 R >>`);
  const type0=add(`<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${unicode} 0 R >>`);
  let boldType0=type0;
  if(boldFont){
    const boldBytes=boldFont.bytes,boldRules=boldFont.metrics,boldMap=new Uint8Array(131072);
    for(const [code,[glyph]]of Object.entries(boldRules)){boldMap[Number(code)*2]=glyph>>8;boldMap[Number(code)*2+1]=glyph&255;}
    const bf=stream(`/Length1 ${boldBytes.length}`,boldBytes),bm=stream('',boldMap);
    const bd=add(`<< /Type /FontDescriptor /FontName /DejaVuSans-Bold /Flags 32 /FontBBox [-1069 -415 1975 1175] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 729 /StemV 120 /FontFile2 ${bf} 0 R >>`);
    const bw=[...used].sort((a,b)=>a-b).map(c=>`${c} [${boldRules[c]?.[1]??600}]`).join(' ');
    const bc=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans-Bold /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${bd} 0 R /DW 600 /W [${bw}] /CIDToGIDMap ${bm} 0 R >>`);
    boldType0=add(`<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans-Bold /Encoding /Identity-H /DescendantFonts [${bc} 0 R] /ToUnicode ${unicode} 0 R >>`);
  }
  const pageIDs=allPages.map(commands=>{const content=stream('',commands);return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${type0} 0 R /F2 ${boldType0} 0 R >> >> /Contents ${content} 0 R >>`);});
  objects[catalog-1]=bytes(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
  objects[pagesObj-1]=bytes(`<< /Type /Pages /Kids [${pageIDs.map(n=>`${n} 0 R`).join(' ')}] /Count ${pageIDs.length} >>`);
  const info=add(`<< /Title <FEFF${hex('Raport Architektury Kodu Duszy')}> /Author (Soul Decoder Estera) >>`);
  const chunks=[bytes('%PDF-1.7\n%Unicode PDF\n')], offsets=[0];let length=chunks[0].length;
  objects.forEach((body,i)=>{offsets.push(length);const object=concat([bytes(`${i+1} 0 obj\n`),body,bytes('\nendobj\n')]);chunks.push(object);length+=object.length;});
  const xref=length;chunks.push(bytes(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return {bytes:concat(chunks),pageCount:allPages.length};
}
