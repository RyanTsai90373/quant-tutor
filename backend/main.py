import json
from typing import Iterator

from anthropic import Anthropic
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv(dotenv_path="../.env")

client = Anthropic()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


def stream_claude(messages: list[Message]) -> Iterator[str]:
    msg_dicts = [m.model_dump() for m in messages]
    with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=msg_dicts,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'text': text})}\n\n"
    yield "event: done\ndata: {}\n\n"


@app.post("/chat")
def chat(req: ChatRequest):
    return StreamingResponse(
        stream_claude(req.messages),
        media_type="text/event-stream",
    )
