import test from 'node:test';
import assert from 'node:assert/strict';
import {appPath,parseAppPath} from '../public/navigation.js';

test('rutas legibles admiten recarga directa y las secciones del historial',()=>{
  for(const page of ['card','history','profiles','account'])for(const tab of ['tournaments','achievements','statistics','games']){
    const path=appPath(page,tab);assert.ok(!path.includes('#'));assert.deepEqual(parseAppPath(path),{page,tab:page==='history'?tab:'tournaments'});
  }
  assert.equal(parseAppPath('/app/desconocido'),null);
  assert.equal(parseAppPath('/app/cuenta/torneos'),null);
  assert.equal(parseAppPath('/app/historial/desconocido'),null);
});
test('enlaces anteriores con hash conservan la sección al migrar',()=>{
  assert.deepEqual(parseAppPath('/app','#history/achievements'),{page:'history',tab:'achievements'});
  assert.deepEqual(parseAppPath('/app'),{page:'card',tab:'tournaments'});
  assert.deepEqual(parseAppPath('/app','#otra'),{page:'card',tab:'tournaments'});
});
