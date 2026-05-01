import json
import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# 保存先ディレクトリ
DECKS_DIR = "./decks"
if not os.path.exists(DECKS_DIR):
    os.makedirs(DECKS_DIR)

# メモリ上の状態
server_state = {"deck-a": None, "deck-b": None}

def save_to_disk():
    """メモリ上の状態をファイルに保存"""
    for deck_id, data in server_state.items():
        if data:
            with open(os.path.join(DECKS_DIR, f"{deck_id}.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
    print("💾 Decks saved to disk.")

def load_from_disk():
    """ファイルから状態を読み込み"""
    for deck_id in server_state.keys():
        path = os.path.join(DECKS_DIR, f"{deck_id}.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8-sig") as f:
                server_state[deck_id] = json.load(f)
    print("📁 Decks loaded from disk.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_from_disk()
    yield
    save_to_disk() # 終了時に保存

app = FastAPI(lifespan=lifespan)

PRESETS_DIR = "./presets"
if not os.path.exists(PRESETS_DIR):
    os.makedirs(PRESETS_DIR)

EFFECTS_DIR = "./effects"
EFFECT_LIST_PATH = os.path.join(EFFECTS_DIR, "effect-list.json")

@app.post("/save_preset/{name}")
async def save_preset(name: str, request: Request):
    data = await request.json()
    path = os.path.join(PRESETS_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return {"status": "saved"}

@app.get("/load_preset/{name}")
async def load_preset(name: str):
    path = os.path.join(PRESETS_DIR, f"{name}.json")
    if not os.path.exists(path):
        return {"error": "not found"}
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)

@app.get("/list_presets")
async def list_presets():
    if not os.path.exists(PRESETS_DIR):
        return []
    return sorted([f.replace(".json", "") for f in os.listdir(PRESETS_DIR) if f.endswith(".json")])

@app.get("/list_effects")
async def list_effects():
    if os.path.exists(EFFECT_LIST_PATH):
        with open(EFFECT_LIST_PATH, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    return []

@app.post("/refresh_effect_list")
async def refresh_effect_list():
    """effects/ ディレクトリをスキャンして effect-list.json を再生成"""
    effects = []
    if os.path.exists(EFFECTS_DIR):
        for fname in sorted(os.listdir(EFFECTS_DIR)):
            if fname.endswith(".html") and fname != "effect-template.html":
                name = fname.replace("effect-", "").replace(".html", "").replace("-", " ").title()
                effects.append({"name": name, "url": f"effects/{fname}"})
    with open(EFFECT_LIST_PATH, "w", encoding="utf-8") as f:
        json.dump(effects, f, indent=2, ensure_ascii=False)
    print(f"🔄 Effect list refreshed: {len(effects)} effects found.")
    return effects

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # 接続時に現在の状態を即座に同期
        for deck_id, layers in server_state.items():
            if layers:
                await websocket.send_text(json.dumps({"type": "rebuild_layers", "deckId": deck_id, "layers": layers}))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections[:]:
            try:
                await connection.send_text(message)
            except:
                self.disconnect(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            # 状態の更新ロジック
            if msg.get("type") == "rebuild_layers":
                server_state[msg["deckId"]] = msg["layers"]
                save_to_disk() # 構造変更時は即座に保存
            elif msg.get("type") == "param_update":
                deck_id = msg.get("deckId")
                group_id = msg.get("groupId")
                layer_id = msg.get("layerId")
                param_id = msg.get("paramId")
                val = msg.get("value")
                
                deck = server_state.get(deck_id)
                if deck: # deck はグループのリスト
                    for group in deck:
                        if group["id"] == group_id:
                            # グループ自体のパラメータ更新
                            if layer_id is None:
                                group["params"][param_id] = val
                            # グループ内レイヤーのパラメータ更新
                            else:
                                for layer in group["layers"]:
                                    if layer["id"] == layer_id:
                                        layer["params"][param_id] = val
                
                # 変更をディスクに保存
                save_to_disk()
            
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("start:app", host="0.0.0.0", port=80)