#!/usr/bin/env python3
"""Re-sync data.json from an updated Full_Lifestyle.xlsx.

Usage:  python3 resync.py /path/to/Full_Lifestyle.xlsx [--write]

Re-extracts every workbook-driven figure and prints a diff against the
current data.json. Your LOCAL LIFE (ticks, logs, contacts, edits, keys) is
never in data.json — it lives in the browser / save file — so re-syncing
cannot touch it. A few structures are PROTECTED because they encode your
decisions rather than the sheet's:
  · workouts.days      (your gym's re-racked split)
  · todos              (trimmed entries that became sections)
  · wardrobe.categories (Formal Dress register, white-tie split, additions)
Without --write the script only reports; with it, data.json is updated and
a resync-report.md is written beside it. Rebuild the site afterwards:
  python3 build.py   (then desktop/build.sh for the exe)
"""
import sys, json, os, datetime
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data.json')
PROTECTED = {'workouts', 'todos', 'wardrobe'}

FIX = [("Russin Twists", "Russian Twists"), ("Hamsting Curl", "Hamstring Curl"),
       ("tootpase", "toothpaste"), ("Illiad", "Iliad"), ("Shakspeare", "Shakespeare"),
       ("Paralell", "Parallel"), ("Desmothenes", "Demosthenes"), ("Popel Vuh", "Popol Vuh"),
       ("Tractus Logico", "Tractatus Logico"), ("Fredrich", "Friedrich"), ("Godel", "Gödel"),
       ("Vyasha", "Vyasa"), ("Michael Foucault", "Michel Foucault"),
       ("The Constellation of Philosophy", "The Consolation of Philosophy"),
       ("Highgove Bouquet", "Highgrove Bouquet"),
       ("Philosiphae Naturalis Principa Mathematica", "Philosophiæ Naturalis Principia Mathematica"),
       ("Maintainance", "Maintenance"), ("Taget", "Target"), ("innacurate", "inaccurate"),
       ("Pigementation", "Pigmentation"), ("Hight Normalised", "Height-normalised"), ("Toal FY1", "Total FY1")]

def fix(v):
    v = str(v).strip()
    for a, b in FIX:
        v = v.replace(a, b)
    return v

def extract(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    out = {}
    ws = wb['Finances']
    out['finances'] = {'gross': ws['C4'].value, 'taxFree': ws['C6'].value, 'taxable': ws['C7'].value,
                       'tax': ws['C8'].value, 'ni': ws['C9'].value, 'pension': ws['F8'].value, 'loan': ws['H8'].value,
                       'annualNet': ws['C11'].value, 'monthlyNet': ws['C12'].value,
                       'rates': {'tax': ws['K4'].value, 'higherTax': ws['K5'].value, 'higherThreshold': 50270,
                                 'ni': ws['K8'].value, 'pension': ws['K6'].value, 'loan': ws['K7'].value,
                                 'loanThreshold': ws['H6'].value}}
    ws = wb['Medical']
    out['body_measures'] = {ws.cell(row=r, column=2).value: ws.cell(row=r, column=3).value for r in range(3, 18) if ws.cell(row=r, column=2).value}
    ws = wb['Nutrition']
    out['nutrition_inputs'] = {'deficit': ws['I11'].value, 'proteinRatio': ws['H4'].value, 'fatRatio': ws['H6'].value,
                               'waterRate': ws['F8'].value, 'goalBF': ws['C12'].value, 'ffmiGoal': ws['C14'].value}
    ws = wb['Investments']
    out['investments'] = {ws.cell(row=r, column=2).value: {'value': ws.cell(row=r, column=3).value,
                          'invested': ws.cell(row=r, column=6).value, 'monthly': ws.cell(row=r, column=12).value}
                          for r in range(4, 10) if ws.cell(row=r, column=2).value}
    ws = wb['Intellectuals']
    ci = openpyxl.utils.column_index_from_string
    stem, hum = [], []
    for parts, spec in ((stem, [('B', 4, 33), ('D', 4, 33), ('F', 4, 33), ('B', 36, 77), ('D', 36, 77), ('F', 36, 77)]),
                        (hum, [('B', 88, 103), ('D', 88, 103), ('F', 88, 103), ('B', 106, 117), ('D', 106, 117), ('F', 106, 117)])):
        for col, r1, r2 in spec:
            c0 = ci(col)
            items = [fix(ws.cell(row=r, column=c0).value) for r in range(r1, r2 + 1)
                     if ws.cell(row=r, column=c0).value and not isinstance(ws.cell(row=r, column=c0).value, (int, float))]
            parts.append(items)
    out['curriculum_counts'] = {'stem': [len(p) for p in stem], 'hum': [len(p) for p in hum]}
    return out

def diff(old, new, prefix=''):
    rows = []
    if isinstance(old, dict) and isinstance(new, dict):
        for k in sorted(set(old) | set(new)):
            rows += diff(old.get(k), new.get(k), prefix + k + '.')
    elif isinstance(old, list) and isinstance(new, list):
        if old != new:
            rows.append((prefix[:-1], old, new))
    elif old != new:
        rows.append((prefix[:-1], old, new))
    return rows

def main():
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    cur = json.load(open(DATA))
    fresh = extract(sys.argv[1])
    report = ['# Workbook re-sync report — ' + datetime.date.today().isoformat(), '']
    changed = 0
    # finances rates & totals
    f = cur['finances']
    for k, v in fresh['finances'].items():
        if k == 'rates':
            for rk, rv in v.items():
                if f['rates'].get(rk) != rv:
                    report.append(f'- finances.rates.{rk}: {f["rates"].get(rk)} → {rv}'); f['rates'][rk] = rv; changed += 1
        elif f.get(k) != v:
            report.append(f'- finances.{k}: {f.get(k)} → {v}'); f[k] = v; changed += 1
    # body measures -> PDEF defaults are in code; report only
    for k, v in fresh['body_measures'].items():
        report.append(f'· medical.{k} now {v} (edit in-app with ✎ if you want it permanent)')
    for k, v in fresh['nutrition_inputs'].items():
        report.append(f'· nutrition.{k} now {v} (edit in-app with ✎)')
    for k, v in fresh['investments'].items():
        report.append(f'· investments.{k}: value {v["value"]}, invested {v["invested"]}, monthly {v["monthly"]} (edit in-app with ✎)')
    cc = fresh['curriculum_counts']
    curc = {'stem': [len(p['items']) for p in cur['curriculum']['stem']['parts']],
            'hum': [len(p['items']) for p in cur['curriculum']['humanities']['parts']]}
    if cc != curc:
        report.append(f'- curriculum part counts changed: {curc} → {cc} (full re-import of lists required)')
        changed += 1
    report.append('')
    report.append('Protected (your decisions, never overwritten): workouts split, task list, wardrobe registers.')
    report.append('')
    report.append('Local life (ticks, logs, contacts, edits, keys, save file) is untouched by design — it never lived in data.json.')
    txt = '\n'.join(report)
    print(txt)
    if '--write' in sys.argv:
        json.dump(cur, open(DATA, 'w'), ensure_ascii=False)
        open(os.path.join(HERE, 'resync-report.md'), 'w').write(txt + '\n')
        print('\nWROTE data.json + resync-report.md — now run: python3 build.py')
    else:
        print('\n(dry run — pass --write to apply)')

if __name__ == '__main__':
    main()
