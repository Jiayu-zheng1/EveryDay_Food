import Reveal from './Reveal'
import { GOAL_LABELS } from '../lib/nutrition'

// 活动水平选项（中文标签 + 算法 key）
const ACTIVITY_OPTIONS = [
  { key: 'sedentary', label: '久坐（几乎不运动）' },
  { key: 'light', label: '轻度（每周运动 1-3 次）' },
  { key: 'moderate', label: '中度（每周运动 3-5 次）' },
  { key: 'high', label: '高强度（每周运动 6-7 次）' },
  { key: 'veryHigh', label: '极高（体力劳动 / 专业训练）' },
]

// 性别与目标分段选项
const GENDER_OPTIONS = [
  { key: 'male', label: '男' },
  { key: 'female', label: '女' },
]
const GOAL_OPTIONS = [
  { key: 'cutting', label: '减脂' },
  { key: 'bulking', label: '增肌' },
  { key: 'maintenance', label: '维持' },
]

// 宏量营养条配置（与弹窗一致的展示风格）
const MACRO_BARS = [
  { key: 'proteinG', label: '蛋白质', bar: 'bg-gradient-to-r from-grape to-berry' },
  { key: 'carbsG', label: '碳水化合物', bar: 'bg-gradient-to-r from-tangerine to-berry' },
  { key: 'fatG', label: '脂肪', bar: 'bg-gradient-to-r from-berry to-tangerine' },
]
const KCAL_PER_GRAM = { proteinG: 4, carbsG: 4, fatG: 9 }

/** 输入框统一样式 */
const inputCls =
  'w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm text-snow outline-none transition-colors focus:border-grape/60 [appearance:textfield]'

/** 表单字段标签 */
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-mist">{label}</span>
      {children}
    </label>
  )
}

/** 分段选择器（性别 / 目标共用） */
function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-white/10 bg-ink p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          aria-pressed={value === opt.key}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
            value === opt.key
              ? 'bg-gradient-brand text-white shadow-md shadow-berry/20'
              : 'text-mist hover:text-snow'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/**
 * 热量计算器：输入身体参数 → 展示 BMI / TDEE / 目标热量 / 宏量克数 / 三餐分配
 * 支持「生成今日搭配」：调用智能搭配算法，结果交给 App 替换 DailyPlan
 */
export default function CalorieCalculator({
  meals,
  form,
  update,
  results,
  submitted,
  mealSplit,
  bmi,
  suggestedGoal,
  onSubmit,
  onGenerate,
  hasSmartPlan,
}) {
  // 数值输入存原始字符串（含空串与编辑中间态）：
  // 之前这里直接 Number(e.target.value) 会命中 Number('') === 0 的坑——
  // 用户清空输入框时 onChange 立即把 0 写回 state，受控 input 的 value 变回 "0"，导致数字删不掉。
  // 真正的数字归一（空串按 0）统一在计算函数入口做（见 lib/nutrition.js 的 toNumber）。
  const updateNumber = (key) => (e) => update({ [key]: e.target.value })

  // 宏量条最大宽度基准
  const maxMacro = Math.max(results.proteinG, results.carbsG, results.fatG)

  return (
    <section id="calculator" className="relative scroll-mt-24 px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
            <span aria-hidden="true" className="inline-block h-5 w-1.5 rounded-full bg-gradient-to-b from-tangerine to-grape" />
            热量计算器
          </h2>
          <p className="mt-2 text-sm text-mist">
            输入你的身体数据与目标，算清每日热量和三大营养素，还能一键生成智能三餐搭配
          </p>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl">
            {/* 表单区 */}
            <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="性别">
                <Segmented
                  options={GENDER_OPTIONS}
                  value={form.gender}
                  onChange={(gender) => update({ gender })}
                />
              </Field>

              <Field label="年龄（岁）">
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={form.age ?? ''}
                  onChange={updateNumber('age')}
                  className={inputCls}
                />
              </Field>

              <Field label="身高（cm）">
                <input
                  type="number"
                  min={100}
                  max={250}
                  value={form.heightCm ?? ''}
                  onChange={updateNumber('heightCm')}
                  className={inputCls}
                />
              </Field>

              <Field label="体重（kg）">
                <input
                  type="number"
                  min={30}
                  max={300}
                  value={form.weightKg ?? ''}
                  onChange={updateNumber('weightKg')}
                  className={inputCls}
                />
              </Field>

              <Field label="活动水平">
                <select
                  value={form.activityLevel}
                  onChange={(e) => update({ activityLevel: e.target.value })}
                  className={inputCls}
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key} className="bg-ink-2">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="目标">
                <Segmented
                  options={GOAL_OPTIONS}
                  value={form.goal}
                  onChange={(goal) => update({ goal })}
                />
              </Field>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={onSubmit}
                  className="w-full rounded-xl bg-gradient-brand px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-berry/25 transition-all duration-300 hover:scale-[1.02] hover:shadow-berry/40 active:scale-95"
                >
                  ⚡ 计算我的每日热量
                </button>
              </div>
            </div>

            {/* 结果卡：提交后展示 */}
            {submitted && (
              <div className="border-t border-white/8 bg-ink p-6">
                {/* BMI 卡片 */}
                <div className="mb-5 rounded-2xl border border-white/8 bg-ink-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-snow">
                      BMI{' '}
                      <span className="text-gradient text-xl font-black">{bmi.bmi}</span>
                      <span className="ml-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-snow/85">
                        {bmi.label}
                      </span>
                    </p>
                    {bmi.category !== 'normal' && (
                      <p className="text-xs text-grape">
                        建议目标：{GOAL_LABELS[suggestedGoal]}（已自动选中，可手动更改）
                      </p>
                    )}
                  </div>

                  {/* BMI 区间刻度条：18.5 / 24 / 28 分四段（15-35 标尺） */}
                  <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="absolute inset-y-0 left-0 bg-sky-400/40" style={{ width: '17.5%' }} />
                    <div className="absolute inset-y-0 bg-emerald-400/40" style={{ left: '17.5%', width: '27.5%' }} />
                    <div className="absolute inset-y-0 bg-amber-400/40" style={{ left: '45%', width: '20%' }} />
                    <div className="absolute inset-y-0 right-0 bg-rose-400/40" style={{ width: '35%' }} />
                    {/* 分段刻度 */}
                    <span className="absolute -top-0.5 h-3 w-px bg-white/50" style={{ left: '17.5%' }} />
                    <span className="absolute -top-0.5 h-3 w-px bg-white/50" style={{ left: '45%' }} />
                    <span className="absolute -top-0.5 h-3 w-px bg-white/50" style={{ left: '65%' }} />
                    {/* 当前 BMI 位置 */}
                    <span
                      className="absolute -top-1 size-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-gradient-brand shadow-md shadow-berry/30"
                      style={{ left: `${Math.min(Math.max(((bmi.bmi - 15) / 20) * 100, 2), 98)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-mist/60">
                    <span>15</span>
                    <span>18.5</span>
                    <span>24</span>
                    <span>28</span>
                    <span>35</span>
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  {/* 热量概览 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/8 bg-ink-2 p-4 text-center">
                      <p className="text-xs text-mist">每日总消耗 TDEE</p>
                      <p className="mt-1 text-2xl font-black text-snow">
                        {results.tdee}
                        <span className="ml-1 text-xs font-semibold text-mist">kcal</span>
                      </p>
                      <p className="mt-1 text-[11px] text-mist/70">基础代谢 BMR {results.bmr} kcal</p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-ink-2 p-4 text-center">
                      <p className="text-xs text-mist">目标热量</p>
                      <p className="mt-1 text-2xl font-black">
                        <span className="text-gradient">{results.targetKcal}</span>
                        <span className="ml-1 text-xs font-semibold text-mist">kcal</span>
                      </p>
                    </div>

                    {/* 三餐热量分配 */}
                    <div className="col-span-2 rounded-2xl border border-white/8 bg-ink-2 p-4">
                      <p className="text-xs font-semibold text-mist">三餐热量分配</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mealSplit.map((item) => (
                          <span
                            key={item.slot}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-snow/90"
                          >
                            {item.slot} ≈ <strong className="text-tangerine">{item.kcal}</strong> kcal
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 宏量营养条 */}
                  <div className="flex flex-col justify-center gap-3 rounded-2xl border border-white/8 bg-ink-2 p-4">
                    {MACRO_BARS.map((item) => {
                      const grams = results[item.key]
                      const kcal = grams * KCAL_PER_GRAM[item.key]
                      return (
                        <div key={item.key}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-mist">{item.label}</span>
                            <span className="font-semibold text-snow">
                              {grams} g <span className="text-mist">≈ {kcal} kcal</span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                            <div
                              className={`h-full rounded-full ${item.bar}`}
                              style={{ width: `${(grams / maxMacro) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}

                    {/* 生成今日搭配 */}
                    <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-white/8 pt-3">
                      <button
                        type="button"
                        onClick={onGenerate}
                        disabled={meals.length === 0}
                        className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-bold text-white shadow-lg shadow-berry/25 transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                      >
                        🎯 生成今日搭配
                      </button>
                      {hasSmartPlan && (
                        <span className="text-xs text-grape">已生成，展示在下方搭配区（可点击重新生成）</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
