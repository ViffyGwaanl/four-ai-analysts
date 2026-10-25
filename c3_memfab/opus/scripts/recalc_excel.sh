#!/bin/zsh
# 用 LibreOffice 无界面重算 交付/三张表.xlsx，写回带缓存值的版本（公式、样式、图表保留），并检查错误值和核对行。
# 用法：在任务根目录运行  zsh 交付/scripts/recalc_excel.sh
set -e
mkdir -p _work/lo_profile _work/recalc
rm -f _work/recalc/三张表.xlsx
soffice -env:UserInstallation=file://$PWD/_work/lo_profile --headless --calc --convert-to xlsx --outdir _work/recalc 交付/三张表.xlsx >/dev/null 2>&1
python3 交付/scripts/check_excel.py _work/recalc/三张表.xlsx 交付/三张表.xlsx
cp _work/recalc/三张表.xlsx 交付/三张表.xlsx
echo "已写回带缓存值的 交付/三张表.xlsx"
