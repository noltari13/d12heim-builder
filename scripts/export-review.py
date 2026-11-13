"""Exports the draft warband equipment to an .xlsx for the group to review.
Usage: python export-review.py <out.xlsx>   (needs openpyxl)"""
import glob, json, os, sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

here = os.path.dirname(os.path.abspath(__file__))
items = []
for f in sorted(glob.glob(os.path.join(here, '..', 'src', 'data', 'warband-equipment', '*.json'))):
    items += json.load(open(f))
items.sort(key=lambda x: (x['category'], x['name'].lower()))

wb = openpyxl.Workbook()
ws = wb.active
ws.title = 'Warband items'
cols = ['Name', 'Category', 'Warbands', 'Cost', 'Availability', 'Strength', 'Hands', 'Range', 'AV', 'Rules', 'Basis (why these numbers)', 'Reviewed', 'Group notes']
ws.append(cols)
for x in items:
    ws.append([x['name'] + (f" (also: {', '.join(x['aliases'])})" if x.get('aliases') else ''), x['category'], ', '.join(x.get('warbands', [])),
               x.get('costText'), x.get('availability'), x.get('strength'), x.get('hands'), x.get('range'), x.get('av'),
               x.get('rules'), x.get('basis'), 'yes' if x.get('reviewed') else 'no', ''])
for c in ws[1]:
    c.font = Font(bold=True, color='FFFFFF')
    c.fill = PatternFill('solid', fgColor='5A4A1E')
widths = [26, 9, 28, 9, 12, 10, 6, 7, 5, 60, 60, 9, 30]
for i, w in enumerate(widths):
    ws.column_dimensions[chr(65 + i)].width = w
for row in ws.iter_rows(min_row=2):
    for c in row:
        c.alignment = Alignment(wrap_text=True, vertical='top')
ws.freeze_panes = 'B2'
ws.auto_filter.ref = ws.dimensions
wb.save(sys.argv[1])
print(f'{len(items)} items -> {sys.argv[1]}')
