#!/usr/bin/env python3
"""doc"""
import asyncio
import time

from grpclib.client import Channel
from pyee import AsyncIOEventEmitter
from chatie_grpc.wechaty.puppet import (
    EventType,
    PuppetStub,
)


async def init_event_stream (
        event_stream : AsyncIOEventEmitter,
        puppet       : PuppetStub,
) -> None:
    """doc"""
    async for response in puppet.event():
        # print(response)
        if response is not None:
            event_type = EventType(response.type).name
            payload = response.payload
            # print(event_type, payload)
            event_stream.emit(event_type, payload)


async def loop(callback):
    """doc"""
    while True:
        await callback()
        time.sleep(1)


async def main():
    """doc"""
    channel = Channel(host="127.0.0.1", port=8788)
    puppet = PuppetStub(channel)

    event_stream = AsyncIOEventEmitter()
    event_stream.on('EVENT_TYPE_DONG', \
        lambda payload: print('on(dong) %s' % payload))

    await asyncio.gather(
        loop(lambda: puppet.ding(data='haha')),
        init_event_stream(event_stream, puppet),
    )

    channel.close()


if __name__ == "__main__":
  asyncio.run(main())
