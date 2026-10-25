#!/bin/zsh
# 调用本机经营模拟引擎的小工具：api.sh state|rules|export|decide <json文件>
# 每次调用的原始返回都会存一份到 交付/data/raw/ 便于追溯
BASE=http://127.0.0.1:8765
GAME=memfab-opus
TOKEN=$(python3 -c "import json;print(json.load(open('材料/游戏通行证.json'))['token'])")
RAW=交付/data/raw
TS=$(date +%Y%m%d-%H%M%S)
case "$1" in
  rules)  curl -s -H "X-Game-Token: $TOKEN" $BASE/rules ;;
  state)  curl -s -H "X-Game-Token: $TOKEN" $BASE/games/$GAME/state | tee $RAW/state_$TS.json ;;
  export) curl -s -H "X-Game-Token: $TOKEN" $BASE/games/$GAME/export | tee $RAW/export_$TS.json ;;
  decide) curl -s -X POST -H "Content-Type: application/json" -H "X-Game-Token: $TOKEN" --data @"$2" $BASE/games/$GAME/decide | tee $RAW/decide_$TS.json ;;
  *) echo "usage: api.sh state|rules|export|decide file.json" ;;
esac
