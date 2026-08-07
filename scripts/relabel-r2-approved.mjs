/**
 * 菜系扩展轮 2 重标审批表（scan 后人工复核）：
 * - xinjiang：大盘鸡 / 椒麻鸡 desc 均显式「新疆风味」，无疑
 * - dian：5 道均为米线类（任务明确「米线类→dian」；砂锅米线为云南做法）
 * - shan：scan 无候选（凉皮/肉夹馍在 snack 已标 bei 且 desc 无显式陕西，按指示不重标）
 */
export const APPROVED = {
  'dapan-chicken': 'xinjiang',
  'pepper-numb-chicken': 'xinjiang',
  'lxj-home-26': 'dian',
  'lxj-home-27': 'dian',
  'lxj-home-29': 'dian',
  'lxj-home-30': 'dian',
  'lxj-home-32': 'dian',
}
