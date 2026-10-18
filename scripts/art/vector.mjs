// Original BALÍK vector drawing primitives. No fonts, stock art or external resources.
export const ink = '#202735', paper = '#FFF9E8';
export const p = (d, fill = paper, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
export const r = (x,y,w,h,fill=paper,rx=5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
export const c = (x,y,rad,fill=paper) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${fill}"/>`;
export const e = (x,y,rx,ry,fill=paper) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
export const l = d => p(d,'none');
export const g = (art, transform='', extra='') => `<g transform="${transform}" ${extra}>${art}</g>`;
export const eyes = (x,y,gap=26) => c(x,y,4,ink)+c(x+gap,y,4,ink);
export const leaf = (x,y,fill,angle=0) => g(p('M0 0Q-34-6-30-36Q2-33 0 0Z',fill)+l('M0 0-19-23'),`translate(${x} ${y}) rotate(${angle})`);
export const star = (x,y,fill=paper,scale=1) => g(p('M0-18 5-5 18 0 5 5 0 18-5 5-18 0-5-5Z',fill),`translate(${x} ${y}) scale(${scale})`);
export const wheel = (x,y,fill) => c(x,y,19,ink)+c(x,y,9,fill);
export const boots = (y=204) => r(83,y-17,33,19,ink)+r(143,y-17,33,19,ink);
export const archetypes = {'7':'Glitch','8':'Obrana','9':'Maskot','10':'Dominanta',J:'Kurýr',Q:'Kapitán',K:'Boss',A:'Esence'};
export function collection(id) {
  const cards=[];
  return { cards, add(suit,rank,name,meaning,art) {
    cards.push({card:{id:`${suit}-${rank}`,suit,rank}, name,meaning,archetype:archetypes[rank],stickerAsset:`/decks/${id}/stickers/${suit}-${rank.toLowerCase()}.svg`,art});
  }};
}
export function sticker(art, cutout=false) {
  // The die cut follows alpha; the canvas stays transparent. Fixed filter bounds avoid clipping in WebKit.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><filter id="cut" x="0" y="0" width="256" height="256" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="5" result="edge"/><feOffset in="edge" dx="3" dy="4" result="offset"/><feFlood flood-color="${cutout?'#9D817B':'#263044'}" flood-opacity=".25"/><feComposite in2="offset" operator="in" result="shadow"/><feFlood flood-color="#FFFCF2"/><feComposite in2="edge" operator="in" result="white"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g stroke="${ink}" stroke-width="${cutout?3.5:5}" stroke-linecap="${cutout?'square':'round'}" stroke-linejoin="${cutout?'miter':'round'}" filter="url(#cut)">${art}</g></svg>\n`;
}
