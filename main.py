"""
AI 小红书文案生成器 - FastAPI 后端
"""
import os
import json
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from zhipuai import ZhipuAI
from typing import Generator

# 初始化 FastAPI 应用
app = FastAPI(title="AI 小红书文案生成器")

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")

# 初始化模板
templates = Jinja2Templates(directory="templates")

# 初始化智谱 AI 客户端
# API Key 直接写在代码里（开发环境使用）
API_KEY = "0f3ad2789ca944baa38ae9f856d455a9.LDSpVrltt0ZZ2hnB"
client = ZhipuAI(api_key=API_KEY)


def generate_copy(topic: str) -> Generator[str, None, None]:
    """
    流式生成小红书文案
    """
    try:
        response = client.chat.completions.create(
            model="glm-4",
            messages=[
                {
                    "role": "system",
                    "content": """你是一个专业的小红书文案生成器。请生成吸引人的小红书风格文案，要求：
1. 使用小红书特有的表达方式
2. 标题吸引人，带有emoji表情
3. 正文口语化，有亲和力
4. 适当使用话题标签
5. 文案长度适中，200-300字左右"""
                },
                {
                    "role": "user",
                    "content": f"请为以下主题生成小红书文案：{topic}"
                }
            ],
            stream=True,
            temperature=0.7,
            max_tokens=500
        )

        # 流式返回生成的内容
        for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                # 使用 data: 格式便于前端解析
                yield f"data: {json.dumps({'content': content})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """
    返回首页
    """
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/generate")
async def generate(request: Request):
    """
    流式生成文案 API
    """
    data = await request.json()
    topic = data.get("topic", "").strip()

    if not topic:
        return StreamingResponse(
            generate_copy("请生成一个通用的小红书文案主题"),
            media_type="text/event-stream"
        )

    return StreamingResponse(
        generate_copy(topic),
        media_type="text/event-stream"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
