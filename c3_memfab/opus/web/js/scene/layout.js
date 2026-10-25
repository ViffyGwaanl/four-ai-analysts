/* 场地布局（世界坐标，单位≈米，仅为示意模型尺度） */
export const PLATFORM = { x0: -35, x1: 35, z0: -21, z1: 19 };
export const STREET = { z0: 0.7, z1: 3.7 };

export const ZONES = {
  fab: { x: 0, z: -8, w: 31, d: 14 },
  hbm: { x: 24.5, z: -8, w: 12, d: 14 },
  warehouse: { x: -24.5, z: -8, w: 12, d: 14 },
  vault: { x: -26, z: 10.2 },
  debt: { x: -13.2, z: 10.2 },
  boardroom: { x: 3, z: 9.8 },
  market: { x: 22.5, z: 10.6 },
};

export const COLORS = {
  cyan: '#19c6ff',
  violet: '#8b5cf6',
  magenta: '#d946ef',
  amber: '#ffa62b',
  gold: '#ffc23d',
  coral: '#ff6a5c',
  wood: '#b98252',
  market: '#2fa8ff',
};
