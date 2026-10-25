/**
 * Decode the compact, first-class editable PixelWeave layered asset.
 * Stored as 1 baseline cel per layer + sparse per-frame pixel differences.
 * Inflation happens once. The editor receives ordinary layered-v1 rows.
 */
export function expandPackedAsset(p) {
  if (!p || p.v !== 1 || p.width !== 64 || p.height !== 64 || p.count !== 12 || !Array.isArray(p.layers)) throw Error('素材数据格式不符合预期');
  return {
    format:'pixelweave/layered-v1', name:p.name, width:p.width, height:p.height, fps:p.fps, palette:p.palette,
    layers:p.layers.map(l=>{
      const baseline=l.base.map(s=>s.split(''));
      const frames=Array.from({length:p.count},(_,f)=>{
        const matrix=baseline.map(row=>[...row]);
        const edits=l.d?.[String(f)]||[];
        for(const [y,x,symbol] of edits){
          if(!Number.isInteger(y)||!Number.isInteger(x)||x<0||y<0||x>=p.width||y>=p.height||!Object.hasOwn(p.palette,symbol))throw Error('补丁坐标或色板非法');
          matrix[y][x]=symbol;
        }
        return matrix.map(row=>row.join(''));
      });
      return {id:l.id,name:l.name,visible:true,opacity:1,x:0,y:0,frames};
    })
  };
}
export async function loadPotionAsset(url='./assets/vermilion-v3.pack') {
  const response=await fetch(url,{cache:'no-cache'});
  if(!response.ok)throw Error('无法读取药瓶动画素材：HTTP '+response.status);
  const encoded=(await response.text()).trim();
  const compressed=Uint8Array.from(atob(encoded),ch=>ch.charCodeAt(0));
  if(typeof DecompressionStream!=='function')throw Error('浏览器不支持内置 GZIP 解码，需要新版 Chromium/Firefox/Safari');
  const source=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text=await new Response(source).text();
  return expandPackedAsset(JSON.parse(text));
}
