import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('../js/lang.js',import.meta.url),'utf8');
test('EVIDEX section is discoverable and does not collect Telegram credentials',()=>{
 assert(html.includes('href="#evidex"'));
 const section=html.match(/<section id="evidex"[\s\S]*?<\/section>/)[0];
 assert(!/<(?:input|form|textarea)\b/.test(section));
 assert(section.includes('README_NEXT.md'));
 assert(section.includes('/archive/refs/heads/main.zip'));
 assert(!section.includes('127.0.0.1'));
});
test('every EVIDEX field is translated in Malay and English',()=>{
 const keys=[...html.matchAll(/data-i18n="(evidex-[^"]+)"/g)].map(m=>m[1]);
 for(const lang of ['my','en']){
  const nodes=keys.map(key=>({key,textContent:'',getAttribute:()=>key,hasAttribute:()=>false}));
  vm.runInNewContext(script,{localStorage:{getItem:()=>lang,setItem(){}},document:{documentElement:{},querySelectorAll(selector){return selector==='[data-i18n]'?nodes:[]}}});
  for(const node of nodes)assert(node.textContent,node.key+' missing '+lang);
 }
});
