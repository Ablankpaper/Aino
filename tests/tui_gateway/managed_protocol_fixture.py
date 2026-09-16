"""Minimal external model protocols; the gateway, Agent, SDK and tools stay real."""
import json


def events_for(path, body, sample_path):
    arguments = {"path": str(sample_path)}
    if path == "/v1/messages":
        done = not body.get("tools") or any(block.get("type") == "tool_result" for message in body["messages"]
                   for block in message.get("content", []) if isinstance(block, dict))
        block = {"type": "text", "text": "Local model finished."} if done else {
            "type": "tool_use", "id": "call-fixture", "name": "read_file", "input": arguments}
        yield {"type": "message_start", "message": {"id": "msg_fixture", "type": "message", "role": "assistant",
            "model": body["model"], "content": [], "stop_reason": None, "stop_sequence": None,
            "usage": {"input_tokens": 10, "output_tokens": 0}}}
        yield {"type": "content_block_start", "index": 0, "content_block": (
            {"type": "text", "text": ""} if done else {**block, "input": {}})}
        yield {"type": "content_block_delta", "index": 0, "delta": (
            {"type": "text_delta", "text": block["text"]} if done else {
                "type": "input_json_delta", "partial_json": json.dumps(arguments)})}
        yield {"type": "content_block_stop", "index": 0}
        yield {"type": "message_delta", "delta": {"stop_reason": "end_turn" if done else "tool_use",
            "stop_sequence": None}, "usage": {"output_tokens": 3}}
        yield {"type": "message_stop"}
    elif path == "/v1/responses":
        done = not body.get("tools") or any(item.get("type") == "function_call_output" for item in body["input"])
        item = {"id": "msg_fixture", "type": "message", "role": "assistant", "status": "completed",
                "content": [{"type": "output_text", "text": "Local model finished.", "annotations": []}]} if done else {
            "id": "fc_fixture", "type": "function_call", "call_id": "call-fixture", "name": "read_file",
            "arguments": json.dumps(arguments), "status": "completed"}
        yield {"type": "response.output_item.added", "output_index": 0, "item": item}
        if done:
            yield {"type": "response.output_text.delta", "item_id": item["id"], "output_index": 0,
                   "content_index": 0, "delta": "Local model finished."}
        yield {"type": "response.output_item.done", "output_index": 0, "item": item}
        yield {"type": "response.completed", "response": {"id": "resp_fixture", "object": "response",
            "model": body["model"], "status": "completed", "output": [item],
            "usage": {"input_tokens": 10, "output_tokens": 3, "total_tokens": 13}}}
    else:
        raise AssertionError(path)
