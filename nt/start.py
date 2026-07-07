"""
MotoVJ v3 — Backend Server
FastAPI + WebSocket + REST API
Node-based VJ system with uv package management
"""
import json
import os
import glob
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

# ── パス設定 ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
GRAPHS_DIR = os.path.join(ROOT_DIR, "graphs")
PRESETS_DIR = os.path.join(ROOT_DIR, "presets")
MEDIA_DIR = os.path.join(ROOT_DIR, "media")

for d in [GRAPHS_DIR, PRESETS_DIR, MEDIA_DIR]:
    os.makedirs(d, exist_ok=True)

# ── メモリ上の状態 ──
server_state = {
    "graph": None,  # 現在のノードグラフ
}


def save_to_disk():
    if server_state["graph"] is not None:
        path = os.path.join(GRAPHS_DIR, "current.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(server_state["graph"], f, indent=2, ensure_ascii=False)
    print("[SAVE] Graph saved.")


def load_from_disk():
    path = os.path.join(GRAPHS_DIR, "current.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            server_state["graph"] = json.load(f)
    print("[LOAD] Graph loaded.")


# ── FastAPI ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_from_disk()
    yield
    save_to_disk()

app = FastAPI(title="MotoVJ v3", lifespan=lifespan)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# ── REST API ──

@app.get("/api/graph")
async def get_graph():
    """現在のノードグラフを取得"""
    return server_state["graph"] or {"nodes": {}, "connections": {}}


@app.post("/api/graph")
async def save_graph(data: dict):
    """ノードグラフを保存"""
    server_state["graph"] = data
    save_to_disk()
    return {"status": "saved"}


@app.get("/api/presets")
async def list_presets():
    """プリセット一覧"""
    presets = []
    for f in sorted(os.listdir(PRESETS_DIR)):
        if f.endswith(".json"):
            name = f.replace(".json", "")
            try:
                with open(os.path.join(PRESETS_DIR, f), "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                presets.append({"name": name, "data": data})
            except Exception:
                presets.append({"name": name, "data": None})
    return presets


@app.get("/api/presets/{name}")
async def get_preset(name: str):
    """プリセット読込"""
    path = os.path.join(PRESETS_DIR, f"{name}.json")
    if not os.path.exists(path):
        raise HTTPException(404, f"Preset '{name}' not found")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.post("/api/presets/{name}")
async def save_preset(name: str, data: dict):
    """プリセット保存"""
    path = os.path.join(PRESETS_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return {"status": "saved", "name": name}


@app.delete("/api/presets/{name}")
async def delete_preset(name: str):
    """プリセット削除"""
    path = os.path.join(PRESETS_DIR, f"{name}.json")
    if not os.path.exists(path):
        raise HTTPException(404, f"Preset '{name}' not found")
    os.remove(path)
    return {"status": "deleted", "name": name}


@app.get("/api/media")
async def list_media():
    """メディアファイル一覧"""
    video_exts = {".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v"}
    image_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
    media = []
    for f in sorted(os.listdir(MEDIA_DIR)):
        ext = os.path.splitext(f)[1].lower()
        if ext in video_exts:
            media.append({"name": f, "url": f"/media/{f}", "type": "video"})
        elif ext in image_exts:
            media.append({"name": f, "url": f"/media/{f}", "type": "image"})
    return media


# ── WebSocket ──
class ConnectionManager:
    def __init__(self):
        self.connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
        # 接続時に現在のグラフを即座に同期
        if server_state["graph"]:
            await ws.send_text(json.dumps({
                "type": "graph_sync",
                "graph": server_state["graph"]
            }))

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: str):
        for conn in self.connections[:]:
            try:
                await conn.send_text(message)
            except Exception:
                self.disconnect(conn)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "graph_update":
                server_state["graph"] = msg.get("graph")
                save_to_disk()

            elif msg_type == "node_param_update":
                # ノードパラメータの更新
                graph = server_state.get("graph")
                if graph and "nodes" in graph:
                    node_id = msg.get("nodeId")
                    param_id = msg.get("paramId")
                    value = msg.get("value")
                    if node_id in graph["nodes"]:
                        graph["nodes"][node_id].setdefault("params", {})[param_id] = value

            # audio_data はそのままブロードキャスト（保存不要）
            await manager.broadcast(data)

    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── 静的ファイル配信 ──
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")
app.mount("/", StaticFiles(directory=BASE_DIR, html=True), name="nt")

def main():
    uvicorn.run("nt.start:app", host="0.0.0.0", port=80, reload=True)

if __name__ == "__main__":
    uvicorn.run("start:app", host="0.0.0.0", port=80, reload=True)
