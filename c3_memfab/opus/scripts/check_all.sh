#!/bin/zsh
# 总验收（任务根目录运行）：文件齐全、Excel 无错误值、Word 能打开、网页控制台无报错、产出里没有网址/邮箱等。
setopt NULL_GLOB
echo "== 文件 =="
for f in 交付/决策日志.md 交付/三张表.xlsx 交付/经营复盘.docx 交付/web/index.html 交付/README.md; do
  [[ -f $f ]] && echo "OK  $f" || echo "缺  $f"
done
echo "== Excel 重算检查 =="
mkdir -p _work/final/lo _work/final/xlsx _work/final/docx
soffice -env:UserInstallation=file://$PWD/_work/final/lo --headless --calc --convert-to xlsx --outdir _work/final/xlsx 交付/三张表.xlsx >/dev/null 2>&1
python3 交付/scripts/check_excel.py _work/final/xlsx/三张表.xlsx 交付/三张表.xlsx | head -3
echo "== Word 打开检查 =="
soffice -env:UserInstallation=file://$PWD/_work/final/lo --headless --convert-to pdf --outdir _work/final/docx 交付/经营复盘.docx >/dev/null 2>&1
pdfinfo _work/final/docx/经营复盘.pdf 2>/dev/null | grep Pages || echo "Word 转换失败"
echo "== 网页（真实时间加载、控制台、读回数字） =="
(cd 交付/web && python3 -m http.server 8823 >/dev/null 2>&1 &)
sleep 1
node 交付/scripts/check_web_cdp.mjs _work/final/web
pkill -f "http.server 8823"
echo "== 敏感内容扫描（网址/邮箱/电话/二维码字样） =="
grep -rnIE "https?://|www\.|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}|微信|二维码|(^|[^0-9.])1[3-9][0-9]{9}([^0-9]|$)" 交付 --exclude-dir=vendor --exclude-dir=raw --exclude='*.xlsx' --exclude='*.docx' --exclude=check_all.sh --exclude=check_web_cdp.mjs --exclude=api.sh | grep -v "127.0.0.1" | head -20 || true
echo "（以上为空即通过；本地服务地址 127.0.0.1 除外）"
