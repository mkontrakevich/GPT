export const AVATAR_CONTEXTS=Object.freeze({
 health:{title:'Здоровье',outfit:'swim',top:0x2c7886,bottom:0x2c7886},
 work:{title:'Работа',outfit:'work',top:0x33475d,bottom:0x28384a},
 personal:{title:'Личное',outfit:'home',top:0xb9c4af,bottom:0x7e8d8d},
 relationships:{title:'Отношения',outfit:'casual',top:0x416f72,bottom:0x33475d},
 projects:{title:'Проекты',outfit:'studio',top:0x637d8b,bottom:0x33475d},
 memory:{title:'Память',outfit:'casual',top:0x9a8570,bottom:0x33475d}
});
export function resolveAvatarContext(input={}){
 const island=Object.hasOwn(AVATAR_CONTEXTS,input.islandId)?input.islandId:'health';
 const role=['neutral','creative','office','hospitality','construction'].includes(input.role)?input.role:'neutral';
 const result={...AVATAR_CONTEXTS[island],islandId:island,role,roleSource:role==='neutral'?'unspecified':'explicit'};
 if(island==='work'&&role==='creative')result.top=0x243340;
 if(island==='work'&&role==='hospitality')result.top=0xe0d6bf;
 if(island==='work'&&role==='construction')result.top=0xc89850;
 return result;
}
