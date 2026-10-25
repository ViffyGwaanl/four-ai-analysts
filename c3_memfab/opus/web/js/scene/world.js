import { createStage } from './stage.js';
import { createSite } from './site.js';
import { createFab } from './fab.js';
import { createHbm } from './hbm.js';
import { createWarehouse } from './warehouse.js';
import { createVault } from './vault.js';
import { createDebt } from './debt.js';
import { createBoardroom } from './boardroom.js';
import { createMarket } from './market.js';
import { createLabels } from './labels.js';
import { createCameraRig, VIEWS } from './camera.js';
import { COLORS } from './layout.js';
import { bakeStatic } from './util.js';
import { kw, money, index as fmtIdx } from '../format.js';
import { QUARTERS, UNIT_FLOW, UNIT_STOCK, UNIT_MONEY, underConstruction, hbmStage } from '../data.js';

export { VIEWS };

export function createWorld({ canvas, gl, quality, labelHost, onView, reducedMotion }) {
  const stage = createStage({ canvas, gl, quality, labelHost });
  const { scene } = stage;

  const site = createSite();
  const fab = createFab();
  const hbm = createHbm();
  const warehouse = createWarehouse();
  const vault = createVault();
  const debt = createDebt();
  const boardroom = createBoardroom();
  const market = createMarket();
  const zones = [site, fab, hbm, warehouse, vault, debt, boardroom, market];
  ['site', 'fab', 'hbm', 'warehouse', 'vault', 'debt', 'boardroom', 'market'].forEach((n, i) => { zones[i].group.name = n; });
  for (const z of zones) {
    bakeStatic(z.group);
    scene.add(z.group);
  }

  const rig = createCameraRig(stage, { reducedMotion });
  const labels = createLabels(stage.labelScene, [
    { id: 'fab', view: 'fab', name: '洁净室', color: COLORS.cyan, anchor: fab.anchors.label },
    { id: 'build', view: 'fab', name: '扩产在建', color: '#ff9f1c', anchor: fab.anchors.build, minor: true },
    { id: 'hbm', view: 'hbm', name: 'HBM 产线', short: 'HBM', color: COLORS.violet, anchor: hbm.anchors.label },
    { id: 'warehouse', view: 'warehouse', name: '仓库', color: COLORS.amber, anchor: warehouse.anchors.label },
    { id: 'vault', view: 'vault', name: '金库', color: COLORS.gold, anchor: vault.anchors.label },
    { id: 'debt', view: 'debt', name: '负债', color: COLORS.coral, anchor: debt.anchors.label },
    { id: 'boardroom', view: 'boardroom', name: '董事会会议室', short: '董事会', color: COLORS.wood, anchor: boardroom.anchors.label },
    { id: 'market', view: 'market', name: '市场行情', short: '市场', color: COLORS.market, anchor: market.anchors.label },
  ], (v) => rig.flyTo(v));
  rig.setLabelBoxes(labels.boxes());
  rig.onViewChange((v) => {
    labels.focus(v);
    if (onView) onView(v);
  });

  let lastQi = -1;
  function applyState(disp, qi, settled) {
    for (const z of zones) if (z.update) z.update(disp, qi, settled);

    labels.set('fab', '产能', kw(disp.capacity), UNIT_FLOW);
    if (qi !== lastQi) {
      const uc = underConstruction(qi);
      if (uc.length) {
        const sum = uc.reduce((a, e) => a + e.delta, 0);
        const first = QUARTERS[uc[0].onlineQ - 1].label, last = QUARTERS[uc[uc.length - 1].onlineQ - 1].label;
        labels.set('build', '', `+${kw(sum)}`, `${UNIT_FLOW} · ${first === last ? first : first + '–' + last} 投产`);
      }
      labels.show('build', uc.length > 0);
      lastQi = qi;
    }
    const stg = hbmStage(qi);
    if (disp.hbmLit > 0.5 || stg.key === 'live') labels.set('hbm', '产量', kw(disp.hbmOutput), UNIT_FLOW);
    else labels.set('hbm', '', stg.text, '');
    labels.setState('hbm', 'is-locked', stg.key !== 'live');
    labels.set('warehouse', '库存', kw(disp.inventoryKw), UNIT_STOCK);
    labels.set('vault', '现金', money(disp.cash), UNIT_MONEY);
    if (settled && Math.abs(disp.debt) < 1e-9) labels.set('debt', '借款', '已清零', '');
    else labels.set('debt', '借款', money(disp.debt), UNIT_MONEY);
    labels.set('boardroom', '股东权益', money(disp.equity), UNIT_MONEY);
    labels.set('market', '价格指数', fmtIdx(disp.priceIndex), `· HBM ${fmtIdx(disp.hbmPriceIndex)}`);

    stage.renderer.shadowMap.needsUpdate = true;
  }

  // 阴影按需更新：启动后的前若干帧持续刷新（首帧阴影图可能尚不完整），之后仅在季度补间时刷新
  let shadowWarm = 0;
  function animate(t, dt) {
    if (shadowWarm < 24) { stage.renderer.shadowMap.needsUpdate = true; shadowWarm++; }
    for (const z of zones) if (z.animate) z.animate(t, dt);
    rig.update(dt, performance.now());
  }

  return {
    stage, rig,
    applyState,
    animate,
    render: stage.render,
    resize(w, h, rect, rects) {
      stage.resize(w, h, rect);
      if (rects) rig.setLayout(rects);
      rig.onResize();
    },
    flyTo: (v) => rig.flyTo(v),
    jumpTo: (v) => rig.jumpTo(v),
    intro: (v) => rig.intro(v),
    onContextRestored() { stage.onContextRestored(); shadowWarm = 0; },
  };
}
