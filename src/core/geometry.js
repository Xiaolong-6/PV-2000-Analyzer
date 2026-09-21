(function(root){
  const PV=root.PV2000=root.PV2000||{};
  function roundGrid(radius,pitchX,pitchY,count){
    const pts=[],nx=Math.ceil(radius/pitchX),ny=Math.ceil(radius/pitchY),eps=1e-9;
    for(let iy=-ny;iy<=ny;iy++){
      const y=iy*pitchY;
      for(let ix=-nx;ix<=nx;ix++){
        const x=ix*pitchX;
        // PV-2000 MapPattern excludes lattice points exactly on the circular boundary.
        if(x*x+y*y < radius*radius-eps)pts.push({x,y});
      }
    }
    return count==null||pts.length===count?pts:[];
  }
  function rectGrid(x,y,width,height,nx,ny,count,yDirection=-1){
    if(![x,y,width,height,nx,ny].every(Number.isFinite)||nx<1||ny<1)return[];
    nx=Math.trunc(nx);ny=Math.trunc(ny);if(nx<1||ny<1)return[];
    const dx=nx>1?width/(nx-1):0,dy=ny>1?height/(ny-1):0,pts=[];
    for(let row=0;row<ny;row++)for(let col=0;col<nx;col++)pts.push({x:x+col*dx,y:y+yDirection*row*dy,row,col});
    return count==null||pts.length===count?pts:[];
  }
  function bounds(points){const xs=points.map(p=>p.x).filter(Number.isFinite),ys=points.map(p=>p.y).filter(Number.isFinite);return{xmin:Math.min(...xs),xmax:Math.max(...xs),ymin:Math.min(...ys),ymax:Math.max(...ys)}}
  PV.geometry={roundGrid,rectGrid,bounds};
})(typeof window!=='undefined'?window:globalThis);
