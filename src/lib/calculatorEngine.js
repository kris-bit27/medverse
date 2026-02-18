/**
 * Calculator Engine — generic data-driven computation
 * Supports: sum_points, composite (sum select values), formula, lookup
 */

/**
 * Calculate result from tool definition and user inputs
 * @param {Object} tool - clinical_tools row with input_fields, output_fields, calculation_type
 * @param {Object} inputs - { field_name: value }
 * @returns {Object} { fieldName: computedValue, fieldName_color: color }
 */
export function calculate(tool, inputs) {
  const inputFields = tool.input_fields || [];
  const outputFields = tool.output_fields || [];
  const calcType = tool.calculation_type || 'sum_points';

  // Step 1: compute raw score
  let rawScore;

  if (calcType === 'sum_points') {
    // Checkbox-based: sum points for checked items
    rawScore = inputFields.reduce((sum, f) => {
      if (f.type === 'checkbox' && inputs[f.name]) {
        return sum + (f.points || 0);
      }
      return sum;
    }, 0);
  } else if (calcType === 'composite') {
    // Select-based: sum numeric values from selects
    rawScore = inputFields.reduce((sum, f) => {
      const val = inputs[f.name];
      if (val !== undefined && val !== null && val !== '') {
        return sum + (typeof val === 'number' ? val : parseFloat(val) || 0);
      }
      return sum;
    }, 0);
  } else if (calcType === 'formula') {
    // Formula-based: use output_fields[0].formula or tool.formula
    rawScore = null; // handled per-output below
  } else if (calcType === 'lookup') {
    rawScore = inputs[inputFields[0]?.name];
  }

  // Step 2: resolve each output field
  const results = {};

  for (const out of outputFields) {
    if (out.type === 'number') {
      if (out.formula) {
        results[out.name] = evaluateFormula(out.formula, inputs, out.decimals);
      } else if (rawScore !== null && rawScore !== undefined) {
        results[out.name] = typeof out.decimals === 'number'
          ? parseFloat(Number(rawScore).toFixed(out.decimals))
          : rawScore;
      }
    } else if (out.type === 'text' && out.ranges) {
      // Use formula result if available, otherwise rawScore
      const scoreForRanges = out.formula
        ? evaluateFormula(out.formula, inputs)
        : (results[outputFields[0]?.name] ?? rawScore);

      const match = findRange(scoreForRanges, out.ranges);
      results[out.name] = match?.value || 'N/A';
      results[`${out.name}_color`] = match?.color || 'gray';
    }
  }

  return results;
}

/**
 * Evaluate a simple formula string with variable substitution
 * Supports: +, -, *, /, Math.sqrt, Math.pow, Math.cbrt, parentheses
 */
function evaluateFormula(formula, inputs, decimals) {
  if (!formula) return null;

  try {
    // Replace variable names with their numeric values
    let expr = formula;

    // Sort by length descending to avoid partial replacements (e.g. "hr" vs "hr100")
    const varNames = Object.keys(inputs).sort((a, b) => b.length - a.length);

    for (const key of varNames) {
      const val = inputs[key];
      const numVal = typeof val === 'number' ? val : parseFloat(val);
      if (!isNaN(numVal)) {
        // Use word boundary-aware replacement
        expr = expr.replace(new RegExp(`\\b${escapeRegex(key)}\\b`, 'g'), numVal.toString());
      }
    }

    // Evaluate safely (only allow math operations)
    // eslint-disable-next-line no-new-func
    const result = new Function('Math', `"use strict"; return (${expr})`)(Math);

    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return null;

    return typeof decimals === 'number' ? parseFloat(result.toFixed(decimals)) : result;
  } catch {
    return null;
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find matching range for a score value
 */
function findRange(score, ranges) {
  if (score === null || score === undefined || !Array.isArray(ranges)) return null;

  const numScore = typeof score === 'number' ? score : parseFloat(score);
  if (isNaN(numScore)) return null;

  return ranges.find((r) => {
    const minOk = r.min === undefined || numScore >= r.min;
    const maxOk = r.max === undefined || numScore <= r.max;
    return minOk && maxOk;
  });
}

/**
 * Special calculators that need custom logic beyond simple formulas
 * (e.g., GFR CKD-EPI 2021 with piecewise equations)
 */
export const CUSTOM_CALCULATORS = {
  'gfr-ckd-epi': (inputs) => {
    const age = parseFloat(inputs.age);
    const cr = parseFloat(inputs.creatinine);
    const sex = inputs.sex;
    if (!age || !cr || !sex) return null;

    // Convert μmol/L to mg/dL
    const crMgDl = cr / 88.4;
    const isFemale = sex === 'female';

    // CKD-EPI 2021 (race-free)
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;
    const sexMultiplier = isFemale ? 1.012 : 1.0;

    const minRatio = Math.min(crMgDl / kappa, 1);
    const maxRatio = Math.max(crMgDl / kappa, 1);

    const gfr = 142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.200) * Math.pow(0.9938, age) * sexMultiplier;

    return { gfr: parseFloat(gfr.toFixed(1)) };
  },

  'meld-score': (inputs) => {
    const bili = parseFloat(inputs.bilirubin);
    const cr = parseFloat(inputs.creatinine);
    const inr = parseFloat(inputs.inr);
    const na = parseFloat(inputs.sodium);
    if (!bili || !cr || !inr || !na) return null;

    // Convert μmol/L to mg/dL
    const biliMgDl = Math.max(bili / 17.1, 1);
    const crMgDl = Math.min(Math.max(cr / 88.4, 1), 4);
    const inrVal = Math.max(inr, 1);
    const naVal = Math.min(Math.max(na, 125), 137);

    // MELD-Na formula
    const meld = 10 * (
      0.957 * Math.log(crMgDl) +
      0.378 * Math.log(biliMgDl) +
      1.120 * Math.log(inrVal) +
      0.643
    );

    const meldNa = meld + 1.32 * (137 - naVal) - (0.033 * meld * (137 - naVal));
    const finalMeld = Math.min(Math.max(Math.round(meldNa), 6), 40);

    return { meld: finalMeld };
  },

  'qtc-correction': (inputs) => {
    const qt = parseFloat(inputs.qt);
    const hr = parseFloat(inputs.hr);
    if (!qt || !hr) return null;

    const rr = 60 / hr; // RR interval in seconds
    const bazett = Math.round(qt / Math.sqrt(rr));
    const fridericia = Math.round(qt / Math.cbrt(rr));

    return { qtc_bazett: bazett, qtc_fridericia: fridericia };
  },
};

/**
 * Main entry point: calculate with custom override if available
 */
export function calculateTool(tool, inputs) {
  // Check for custom calculator first
  if (CUSTOM_CALCULATORS[tool.slug]) {
    const customResult = CUSTOM_CALCULATORS[tool.slug](inputs);
    if (customResult) {
      // Still resolve text ranges from output_fields
      const outputFields = tool.output_fields || [];
      const results = { ...customResult };

      for (const out of outputFields) {
        if (out.type === 'text' && out.ranges && !results[out.name]) {
          // Find the numeric result to match against ranges
          const scoreField = outputFields.find(o => o.type === 'number');
          const scoreVal = scoreField ? results[scoreField.name] : null;
          const match = findRange(scoreVal, out.ranges);
          results[out.name] = match?.value || 'N/A';
          results[`${out.name}_color`] = match?.color || 'gray';
        }
      }

      return results;
    }
  }

  // Generic calculation
  return calculate(tool, inputs);
}

/**
 * Validate required inputs
 * @returns {string|null} error message or null if valid
 */
export function validateInputs(tool, inputs) {
  const inputFields = tool.input_fields || [];
  for (const f of inputFields) {
    if (f.required && (inputs[f.name] === undefined || inputs[f.name] === null || inputs[f.name] === '')) {
      return `Vyplňte pole: ${f.label}`;
    }
  }
  return null;
}
