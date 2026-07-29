// SplitEase/mobile/src/utils/routineModifiers.js
//
// Client-side mirror of backend/services/routine_modifier_engine.py —
// used only to preview the computed amount before submit. The backend
// recalculates authoritatively on execute; this never writes data.

export function dayOfWeekFromDateStr(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay(); // 0=Sun..6=Sat
  return day === 0 ? 7 : day; // 1=Mon..7=Sun, matches active_days convention
}

export function activeModifiers(modifierSchema, dayOfWeek) {
  return (modifierSchema || []).filter((mod) => {
    const cond = mod.condition;
    if (!cond) return true;
    return (cond.day_of_week || []).includes(dayOfWeek);
  });
}

export function computeModifiedAmount(baseAmount, modifierSchema, answers, dayOfWeek) {
  let amount = parseFloat(baseAmount) || 0;
  const mods = activeModifiers(modifierSchema, dayOfWeek);

  for (const mod of mods) {
    const answer = answers?.[mod.id] ?? mod.default;
    const effect = mod.effect || {};

    if (mod.type === 'toggle') {
      const branch = answer ? effect.if_true : effect.if_false;
      if (!branch) continue;
      if (branch.set_amount != null) amount = parseFloat(branch.set_amount);
      if (branch.add_amount != null) amount += parseFloat(branch.add_amount);
    } else if (mod.type === 'counter') {
      if (answer == null || answer === '') continue;
      if (effect.multiply_base_by != null) {
        amount = (parseFloat(baseAmount) || 0) * parseFloat(answer);
      } else if (effect.add_per_unit != null) {
        amount += parseFloat(answer) * parseFloat(effect.add_per_unit);
      }
    }
  }

  return Math.round(amount * 100) / 100;
}