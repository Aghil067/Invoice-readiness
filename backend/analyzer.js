// in analyzer.js
const getsSchema = require('./gets_v0_1_schema.json');

/**
 * Normalizes a string by converting to lowercase and removing spaces and underscores.
 */
function normalize(str) {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[\s_]/g, '');
}

/**
 * Analyzes the user's data headers against the GETS schema.
 */
function analyzeCoverage(userHeaders) {
  const schemaFields = getsSchema.fields.map(f => f.path);
  const normalizedUserHeaders = userHeaders.map(normalize);

  const matched = [];
  const close = [];
  const missing = [];
  const headerMap = {};

  schemaFields.forEach(schemaPath => {
    const normalizedSchemaPath = normalize(schemaPath);
    let found = false;

    for (let i = 0; i < normalizedUserHeaders.length; i++) {
      const userHeader = normalizedUserHeaders[i];
      if (normalizedSchemaPath === userHeader) {
        matched.push(schemaPath);
        headerMap[schemaPath] = userHeaders[i];
        found = true;
        break;
      }
    }

    if (!found) {
      for (let i = 0; i < normalizedUserHeaders.length; i++) {
        const userHeader = normalizedUserHeaders[i];
        if (normalizedSchemaPath.includes(userHeader) || userHeader.includes(normalizedSchemaPath)) {
          close.push({ target: schemaPath, candidate: userHeaders[i], confidence: 0.8 });
          headerMap[schemaPath] = userHeaders[i];
          found = true;
          break;
        }
      }
    }

    if (!found) {
      missing.push(schemaPath);
    }
  });

  return { coverage: { matched, close, missing }, headerMap };
}

/**
 * Runs the 5 validation rules against the dataset.
 */
function runRuleChecks(data) {
  const findings = [];

  // Rule 1: TOTALS_BALANCE
  let totalsBalanceErrors = data.filter(row => Math.abs((row['invoice.total_excl_vat'] + row['invoice.vat_amount']) - row['invoice.total_incl_vat']) > 0.01);
  findings.push({ rule: 'TOTALS_BALANCE', ok: totalsBalanceErrors.length === 0 });

  // Rule 2: LINE_MATH
  let lineMathErrors = [];
  data.forEach((row, index) => {
    if (row.lines && Array.isArray(row.lines)) {
      row.lines.forEach(line => {
        if (Math.abs((line.qty * line.unit_price) - line.line_total) > 0.01) {
          lineMathErrors.push({ exampleLine: index + 1, expected: line.qty * line.unit_price, got: line.line_total });
        }
      });
    }
  });
  findings.push({ rule: 'LINE_MATH', ok: lineMathErrors.length === 0, ...lineMathErrors[0] });

  // Rule 3: DATE_ISO
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  let dateIsoErrors = data.filter(row => !dateRegex.test(row['invoice.issue_date']));
  findings.push({ rule: 'DATE_ISO', ok: dateIsoErrors.length === 0 });

  // Rule 4: CURRENCY_ALLOWED
  const allowedCurrencies = getsSchema.fields.find(f => f.path === 'invoice.currency').enum;
  let currencyErrors = data.filter(row => !allowedCurrencies.includes(row['invoice.currency']));
  findings.push({ rule: 'CURRENCY_ALLOWED', ok: currencyErrors.length === 0, ... (currencyErrors.length > 0 && { value: currencyErrors[0]['invoice.currency'] }) });

  // Rule 5: TRN_PRESENT
  let trnErrors = data.filter(row => !row['buyer.trn'] || !row['seller.trn']);
  findings.push({ rule: 'TRN_PRESENT', ok: trnErrors.length === 0 });

  return findings;
}

/**
 * Calculates the final scores based on the analysis results.
 */
function calculateScores(coverage, ruleFindings, questionnaire) {
  const totalFields = getsSchema.fields.length;
  const coverageScore = Math.round(((coverage.matched.length + (coverage.close.length * 0.5)) / totalFields) * 100);
  const passingRules = ruleFindings.filter(r => r.ok).length;
  const rulesScore = Math.round((passingRules / 5) * 100);
  const postureAnswers = Object.values(questionnaire).filter(Boolean).length;
  const postureScore = Math.round((postureAnswers / 3) * 100);

  const scores = {
    data: 100,
    coverage: coverageScore,
    rules: rulesScore,
    posture: postureScore,
  };

  scores.overall = Math.round(
    (scores.data * 0.25) +
    (scores.coverage * 0.35) +
    (scores.rules * 0.30) +
    (scores.posture * 0.10)
  );

  return scores;
}


/**
 * The main analysis orchestrator function.
 */
function analyzeData(data, questionnaire) {
  const userHeaders = Object.keys(data[0] || {});
  const { coverage, headerMap } = analyzeCoverage(userHeaders);

  const normalizedData = data.map(row => {
    const newRow = {};
    for (const schemaPath in headerMap) {
      const userKey = headerMap[schemaPath];
      if (row[userKey] !== undefined) {
        if (schemaPath.startsWith('lines[')) {
          newRow['lines'] = row['lines'];
        } else {
          newRow[schemaPath] = row[userKey];
        }
      }
    }
    if (row.lines && !newRow.lines) {
      newRow.lines = row.lines;
    }
    return newRow;
  });

  const ruleFindings = runRuleChecks(normalizedData);
  const scores = calculateScores(coverage, ruleFindings, questionnaire);

  // ### NEW LOGIC TO POPULATE GAPS ###
  const gaps = [];
  coverage.missing.forEach(field => {
    gaps.push(`Missing required field: ${field}`);
  });
  ruleFindings.forEach(finding => {
    if (!finding.ok) {
      gaps.push(`Rule validation failed: ${finding.rule}`);
    }
  });
  // ### END OF NEW LOGIC ###

  const report = {
    scores,
    coverage,
    ruleFindings,
    gaps, // Use the populated gaps array
    meta: {
      rowsParsed: data.length,
      db: 'sqlite'
    }
  };

  return report;
}

module.exports = { analyzeData };