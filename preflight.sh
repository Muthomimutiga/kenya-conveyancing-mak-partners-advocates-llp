#!/usr/bin/env bash
# preflight.sh: everything that must be true before this plugin tree is pushed.
# Exit 0 = safe to push. Any FAIL = do not push.
#   ./preflight.sh
set -uo pipefail
cd "$(dirname "$0")"

for cand in . ./kenya-conveyancing ./plugins/kenya-conveyancing; do
  [[ -f "$cand/scripts/generate-conveyancing-document.js" ]] && { PLUGIN_DIR="$cand"; break; }
done
: "${PLUGIN_DIR:?no plugin directory found beside this script}"
S="$PLUGIN_DIR/scripts"
BUNDLE="$S/generate-conveyancing-document.bundle.js"

FAIL=0
pass(){ printf "  PASS  %s\n" "$1"; }
fail(){ printf "  FAIL  %s\n" "$1"; FAIL=1; }
warn(){ printf "  warn  %s\n" "$1"; }
skipped(){ printf "  skipped  %s\n" "$1"; }

# The firm config actually in force: the plugin's own scripts/firm-config.json at a client build,
# or the template's own fixture when there is none (the template itself).
if [[ -f "$S/firm-config.json" ]]; then
  FIRM_CONFIG="$S/firm-config.json"; ASSETS_DIR="$S/assets"
else
  FIRM_CONFIG="$S/test-fixtures/firm-config.json"; ASSETS_DIR="$S/test-fixtures/assets"
fi

echo "=== 1. JSON validity ==="
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  if python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$f" 2>/dev/null; then
    pass "$f"
  else
    fail "$f is not valid JSON"
  fi
done < <(git ls-files -- "$PLUGIN_DIR" | grep '\.json$' | grep -v 'package-lock\.json$')

echo
echo "=== 2. Version consistency ==="
MKT="$PLUGIN_DIR/../.claude-plugin/marketplace.json"
if [[ -f "$MKT" ]]; then
  out=$(python3 - "$PLUGIN_DIR/.claude-plugin/plugin.json" "$MKT" <<'PY'
import json, sys
plugin_path, mkt_path = sys.argv[1], sys.argv[2]
plugin = json.load(open(plugin_path))
mkt = json.load(open(mkt_path))
entry = next((p for p in mkt.get('plugins', []) if p.get('name') == plugin.get('name')), None)
if entry is None:
    print(f"no marketplace entry for {plugin.get('name')}"); sys.exit(1)
ok = entry.get('version') == plugin.get('version')
print(f"plugin={plugin.get('version')} marketplace={entry.get('version')}")
sys.exit(0 if ok else 1)
PY
)
  rc=$?
  if [[ $rc -eq 0 ]]; then pass "$out"; else fail "$out"; fi
else
  skipped "no .claude-plugin/marketplace.json beside the plugin"
fi

echo
echo "=== 3. JS syntax (sources and bundle) ==="
for f in "$S/generate-conveyancing-document.js" "$S/firm-letter.js" "$S/config.js" "$BUNDLE"; do
  if [[ -f "$f" ]]; then
    node --check "$f" 2>/dev/null && pass "$(basename "$f")" || fail "$(basename "$f") has a syntax error"
  else
    fail "$f is missing"
  fi
done

echo
echo "=== 4. Bundle current (not stale vs source) ==="
if ./build-bundle.sh --check > /tmp/_pf_bundle_check 2>&1; then
  pass "bundle up to date"
else
  cat /tmp/_pf_bundle_check
  fail "bundle is stale or missing, run ./build-bundle.sh"
fi

echo
echo "=== 5. No npm install left in any command or skill ==="
hits=$(grep -rn "npm install" --include="*.md" "$PLUGIN_DIR/commands" "$PLUGIN_DIR/skills" 2>/dev/null | grep -v "Do not run" | grep -v "would fail" || true)
[[ -z "$hits" ]] && pass "no npm install instructions" || { echo "$hits"; fail "npm install still instructed somewhere"; }

echo
echo "=== 6. No command writes user-config.json under CLAUDE_PLUGIN_ROOT ==="
hits=$(grep -rn 'CLAUDE_PLUGIN_ROOT}/scripts/user-config.json' --include="*.md" "$PLUGIN_DIR/commands" "$PLUGIN_DIR/skills" 2>/dev/null | grep -viE "older location|never write|read only|detect" || true)
[[ -z "$hits" ]] && pass "no writes to the read-only plugin dir" || { echo "$hits"; fail "a command still targets the read-only plugin dir"; }

echo
echo "=== 7. Commands invoke the bundle, not the raw script ==="
raw=$(grep -rn "node generate-conveyancing-document\.js" --include="*.md" "$PLUGIN_DIR/commands" "$PLUGIN_DIR/skills" 2>/dev/null || true)
[[ -z "$raw" ]] && pass "all invocations use .bundle.js" || { echo "$raw"; fail "a command still calls the unbundled script"; }

echo
echo "=== 8. Nothing sensitive tracked ==="
bad=$(git ls-files -- "$PLUGIN_DIR" | grep -E "(^|/)user-config\.json$|node_modules/|\.env$" || true)
if [[ -f "$S/firm-config.json" ]] && git ls-files --error-unmatch "$S/firm-config.json" >/dev/null 2>&1; then
  ck=$(python3 -c "import json;print(json.load(open('$S/firm-config.json')).get('client_key',''))")
  [[ -z "$ck" ]] && bad="$bad
$S/firm-config.json (client_key is empty)"
fi
bad=$(echo "$bad" | sed '/^$/d')
[[ -z "$bad" ]] && pass "no user-config.json, node_modules, .env, or empty-client_key firm-config.json tracked" || { echo "$bad"; fail "sensitive file is tracked"; }

echo
echo "=== 9. Letterhead assets are valid images ==="
LH_MODE=$(python3 -c "import json;print(json.load(open('$FIRM_CONFIG')).get('letterhead_mode',''))")
if [[ "$LH_MODE" == "image" ]]; then
  out=$(python3 - "$ASSETS_DIR" <<'PY'
from PIL import Image
import sys, glob, os
d = sys.argv[1]
bad = 0
for base in ('letterhead-header', 'letterhead-footer'):
    matches = sorted(glob.glob(os.path.join(d, base + '.*')))
    if not matches:
        print(f"{base}: no file found in {d}"); bad = 1; continue
    for f in matches:
        try:
            im = Image.open(f); im.verify()
            w, h = Image.open(f).size
            print(f"{f} ({w}x{h})")
        except Exception as e:
            print(f"{f}: {e}"); bad = 1
sys.exit(bad)
PY
)
  rc=$?
  if [[ $rc -eq 0 ]]; then
    while IFS= read -r line; do [[ -n "$line" ]] && pass "$line"; done <<< "$out"
  else
    echo "$out"; fail "letterhead assets invalid or missing"
  fi
else
  skipped "letterhead_mode is not image ($LH_MODE)"
fi

echo
echo "=== 10. Bundle produces documents (read-only sandbox simulated) ==="
TMPHOME=$(mktemp -d)
WORKDIR=$(mktemp -d)
NM_HIDDEN=0
if [[ -d "$S/node_modules" ]]; then mv "$S/node_modules" "$WORKDIR/_node_modules_hidden"; NM_HIDDEN=1; fi

ADV='{"record_id":"recPREFLIGHT00001","signin_id":"recPREFLIGHT00002","name":"Preflight Tester","p105_no":"P.105/9999/99","practice_no":"LSK/26/99999","practice_year":2026,"email":"preflight@example.com"}'

cat > "$WORKDIR/letter.json" <<JSON
{"doc_type":"conveyance_letter","date":"22nd September 2026","ref":"ACME/CONV/1/2026","recipient_lines":["The Registrar","P.O. Box 1","NAIROBI"],"salutation":"Dear Sir,","subject":"RE: TEST MATTER","paragraphs":["We act for Test Client."],"signing_for":"Purchaser","advocate":$ADV}
JSON
cat > "$WORKDIR/sale.json" <<JSON
{"doc_type":"sale_agreement","date":"22nd September 2026","vendor_name":"JOHN DOE","vendor_id":"12345678","purchaser_name":"JANE ROE","purchaser_id":"87654321","property_lr_no":"TEST/BLOCK 1/1","property_location":"Test Estate, Nairobi","tenure":"freehold","lease_term_years":null,"purchase_price_words":"One Million","purchase_price_figures":"1,000,000","deposit_words":"One Hundred Thousand","deposit_figures":"100,000","balance_words":"Nine Hundred Thousand","balance_figures":"900,000","completion_date":"22nd December 2026","vendor_advocate_firm":"Vendor Advocates","vendor_advocate_address":"P.O. Box 1, Nairobi","purchaser_advocate_firm":"Purchaser Advocates","purchaser_advocate_address":"P.O. Box 2, Nairobi","is_leasehold":false,"is_agricultural":false,"is_charged":false,"vendor_is_company":false,"purchaser_is_company":false,"include_spousal_consent":true}
JSON
cat > "$WORKDIR/fee.json" <<JSON
{"doc_type":"fee_note","date":"22nd September 2026","ref":"ACME/CONV/1/2026","property_lr_no":"TEST/BLOCK 1/1","legal_fees":"50,000","legal_fees_vat":"8,000","disbursements_office":"2,000","disbursements_statutory":"3,000","fee_note_total":"63,000","advocate":$ADV}
JSON
cat > "$WORKDIR/loe.json" <<JSON
{"doc_type":"engagement_letter","date":"22nd September 2026","ref":"ACME/CONV/1/2026","client_name":"Jane Roe","client_address_lines":["P.O. Box 2","NAIROBI"],"re_line":"Purchase of Test/Block 1/1","background":["Jane Roe is buying Test/Block 1/1 from John Doe."],"scope":["Reviewing the sale agreement;","Registering the transfer."],"fee_text":"Kshs. 50,000","deposit_text":"Kshs. 25,000","advocate":$ADV}
JSON
cat > "$WORKDIR/lra33.json" <<JSON
{"doc_type":"lra_33","date":"22nd September 2026","property_lr_no":"TEST/BLOCK 1/1","property_location":"Test Estate, Nairobi","purchase_price_words":"One Million","purchase_price_figures":"1,000,000","nature_of_interest":"ABSOLUTE","vendor_name":"JOHN DOE","vendor_id":"12345678","purchaser_name":"JANE ROE","purchaser_id":"87654321"}
JSON

run_gen(){ HOME="$TMPHOME" KENYA_CONVEYANCING_USER_CONFIG='' KENYA_CONVEYANCING_FIRM_CONFIG="$FIRM_CONFIG" KENYA_CONVEYANCING_ASSETS_DIR="$ASSETS_DIR" node "$BUNDLE" "$1" "$2" > "$WORKDIR/_gen_stderr" 2>&1; }
check_tbl(){ unzip -p "$1" word/document.xml 2>/dev/null | grep -q '<w:tbl>'; }

if run_gen "$WORKDIR/sale.json" "$WORKDIR/sale.docx" && [[ -s "$WORKDIR/sale.docx" ]]; then
  check_tbl "$WORKDIR/sale.docx" && pass "sale agreement produced with a table" || fail "sale agreement missing <w:tbl>"
else
  cat "$WORKDIR/_gen_stderr"; fail "sale agreement generation failed"
fi

if run_gen "$WORKDIR/letter.json" "$WORKDIR/letter.docx" && [[ -s "$WORKDIR/letter.docx" ]]; then
  pass "conveyance letter produced"
else
  cat "$WORKDIR/_gen_stderr"; fail "conveyance letter generation failed"
fi

if run_gen "$WORKDIR/loe.json" "$WORKDIR/loe.docx" && [[ -s "$WORKDIR/loe.docx" ]]; then
  pass "engagement letter produced"
else
  cat "$WORKDIR/_gen_stderr"; fail "engagement letter generation failed"
fi

BANK=$(python3 -c "import json;print(json.load(open('$FIRM_CONFIG')).get('bank_account_no',''))")
if [[ -z "$BANK" ]]; then
  if ! run_gen "$WORKDIR/fee.json" "$WORKDIR/fee.docx" && [[ ! -s "$WORKDIR/fee.docx" ]]; then
    pass "fee note refused (no bank_account_no)"; warn "bank_account_no is empty in $FIRM_CONFIG"
  else
    fail "fee note should have refused with an empty bank_account_no"
  fi
else
  if run_gen "$WORKDIR/fee.json" "$WORKDIR/fee.docx" && [[ -s "$WORKDIR/fee.docx" ]]; then
    pass "fee note produced"
  else
    cat "$WORKDIR/_gen_stderr"; fail "fee note generation failed"
  fi
fi

if run_gen "$WORKDIR/lra33.json" "$WORKDIR/lra33.docx" && [[ -s "$WORKDIR/lra33.docx" ]]; then
  check_tbl "$WORKDIR/lra33.docx" && pass "LRA 33 produced with a table" || fail "LRA 33 missing <w:tbl>"
else
  cat "$WORKDIR/_gen_stderr"; fail "LRA 33 generation failed"
fi

# lra_67 is a library form served from scripts/form-schemas/, added in a later task.
# scripts/form-schemas/lint.js existing is that task's signal to self-activate this item.
if [[ -f "$S/form-schemas/lint.js" ]]; then
  mkdir -p "$WORKDIR/forms"
  HOME="$TMPHOME" KENYA_CONVEYANCING_USER_CONFIG='' KENYA_CONVEYANCING_FIRM_CONFIG="$FIRM_CONFIG" KENYA_CONVEYANCING_ASSETS_DIR="$ASSETS_DIR" \
    node "$S/form-schemas/render-all.js" "$WORKDIR/forms" lra_67 > "$WORKDIR/_gen_stderr" 2>&1
  if [[ -s "$WORKDIR/forms/lra_67.docx" ]]; then
    pass "library form lra_67 produced"
  else
    cat "$WORKDIR/_gen_stderr"; fail "library form lra_67 not produced"
  fi

  # Every form, with every field the schema itself declares optional left out. That is how a
  # drafter with an individual donee or no second proprietor actually fills the form, and the
  # ordinary render fills them all, so it cannot see a form that refuses legitimate input.
  # A placeholder on an optional field once made 25 forms unusable and this pass was blind.
  mkdir -p "$WORKDIR/forms-sparse"
  HOME="$TMPHOME" KENYA_CONVEYANCING_USER_CONFIG='' KENYA_CONVEYANCING_FIRM_CONFIG="$FIRM_CONFIG" KENYA_CONVEYANCING_ASSETS_DIR="$ASSETS_DIR" \
    node "$S/form-schemas/render-all.js" "$WORKDIR/forms-sparse" --sparse > "$WORKDIR/_sparse_stderr" 2>&1
  if grep -q ', 0 failed' "$WORKDIR/_sparse_stderr"; then
    pass "every library form renders with its optional fields left out"
  else
    grep -E 'FAIL|REFUSED' "$WORKDIR/_sparse_stderr" | head -20
    fail "a library form refuses when an optional field is left out"
  fi
else
  skipped "library form lra_67 (form library not present)"
fi

echo
echo "=== 10b. Procedure library quotes primary law that exists ==="
if [[ -f "$S/procedures/lint.js" ]]; then
  if out=$(node "$S/procedures/lint.js" 2>&1); then
    pass "$(echo "$out" | tail -1)"
  else
    echo "$out"
    fail "a procedure quotes law that is not in the cached source"
  fi
else
  skipped "procedure library (not present)"
fi

echo
echo "=== 11. Letter header/footer anchoring (image mode only) ==="
if [[ "$LH_MODE" == "image" ]]; then
  out=$(python3 - "$WORKDIR/letter.docx" <<'PY'
import zipfile, re, sys
f = sys.argv[1]
z = zipfile.ZipFile(f)
names = z.namelist()
heads = [n for n in names if re.match(r'word/header\d*\.xml', n)]
foots = [n for n in names if re.match(r'word/footer\d*\.xml', n)]
anchored_head = any('<wp:anchor' in z.read(n).decode('utf8') for n in heads)
anchored_foot = sum(1 for n in foots if '<wp:anchor' in z.read(n).decode('utf8'))
doc = z.read('word/document.xml').decode('utf8')
titlepg = 'w:titlePg' in doc
ok = anchored_head and anchored_foot >= 2 and titlepg
print(f"header-anchored={anchored_head} footers-anchored={anchored_foot} title-page={titlepg}")
sys.exit(0 if ok else 1)
PY
)
  rc=$?
  if [[ $rc -eq 0 ]]; then pass "$out"; else fail "$out"; fi
else
  skipped "letterhead_mode is not image ($LH_MODE)"
fi

echo
echo "=== 12. Generator refuses without an advocate block ==="
python3 -c "
import json
d = json.load(open('$WORKDIR/letter.json'))
d.pop('advocate', None)
json.dump(d, open('$WORKDIR/letter-noadv.json', 'w'))
"
rm -f "$WORKDIR/letter-noadv.docx"
if ! run_gen "$WORKDIR/letter-noadv.json" "$WORKDIR/letter-noadv.docx" && [[ ! -s "$WORKDIR/letter-noadv.docx" ]]; then
  pass "generator refused to sign without an advocate block"
else
  fail "generator produced a document with no advocate block"
fi

echo
echo "=== 13. Outputs carry the test advocate, no firm-partner leakage ==="
FIRM_PARTNER=$(python3 -c "import json;print(json.load(open('$FIRM_CONFIG')).get('firm_partner',''))")
out=$(python3 - "$WORKDIR/letter.docx" "$FIRM_PARTNER" <<'PY'
import zipfile, re, sys
f, partner = sys.argv[1], sys.argv[2]
t = re.sub(r'<[^>]+>', '', zipfile.ZipFile(f).read('word/document.xml').decode('utf8'))
has_adv = ('Preflight Tester' in t) or ('PREFLIGHT TESTER' in t)
has_p105 = 'P.105/9999/99' in t
leak = bool(partner) and partner in t
ok = has_adv and has_p105 and not leak
print(f"advocate={has_adv} p105={has_p105} firm-partner-leak={leak}")
sys.exit(0 if ok else 1)
PY
)
rc=$?
if [[ $rc -eq 0 ]]; then pass "$out"; else fail "$out"; fi

if [[ $NM_HIDDEN -eq 1 ]]; then mv "$WORKDIR/_node_modules_hidden" "$S/node_modules"; fi
rm -rf "$TMPHOME" "$WORKDIR"

echo
echo "=== 14. Golden-data scan ==="
SCANNER="${GOLDEN_SCAN:-/Users/astalavista/Desktop/Claude/store/rag-docs/golden-data-scan.js}"
CK=""
if [[ -f "$S/firm-config.json" ]]; then
  CK=$(python3 -c "import json;print(json.load(open('$S/firm-config.json')).get('client_key',''))")
fi
if [[ -n "$CK" ]]; then
  scan_ok=0; node "$SCANNER" "$PLUGIN_DIR" --allow "$CK" || scan_ok=1
else
  scan_ok=0; node "$SCANNER" "$PLUGIN_DIR" || scan_ok=1
fi
if [[ $scan_ok -eq 0 ]]; then
  pass "golden-data scan clean"
else
  fail "golden-data scan found a hit"
fi

echo
echo "=== 15. Form library ==="
if [[ -f "$S/form-schemas/lint.js" ]]; then
  if node "$S/form-schemas/lint.js"; then pass "form-schemas lint"; else fail "form-schemas lint failed"; fi
else
  skipped "scripts/form-schemas/lint.js does not exist yet"
fi
if [[ -f "$S/form-schemas.test.js" ]]; then
  if node --test "$S/form-schemas.test.js"; then pass "form-schemas.test.js"; else fail "form-schemas.test.js failed"; fi
else
  skipped "scripts/form-schemas.test.js not present (client build excludes test files)"
fi

echo
echo "=== 16. node --test scripts/generate.test.js ==="
if [[ -f "$S/generate.test.js" ]]; then
  if node --test "$S/generate.test.js" > /tmp/_pf_generate_test_out 2>&1; then
    pass "generate.test.js"
  else
    cat /tmp/_pf_generate_test_out
    fail "generate.test.js failed"
  fi
else
  skipped "scripts/generate.test.js not present (client build excludes test files)"
fi

rm -f /tmp/_pf_bundle_check /tmp/_pf_generate_test_out

echo
echo "================================================"
if [[ $FAIL -eq 0 ]]; then echo "PREFLIGHT PASSED"; else echo "PREFLIGHT FAILED"; fi
exit $FAIL
