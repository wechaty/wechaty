#!/usr/bin/env python3
"""doc"""
import asyncio

from chatie_grpc.wechaty.puppet import PuppetStub
from grpclib.client import Channel


async def main():
  """doc"""
  channel = Channel(host="127.0.0.1", port=8788)
  puppet = PuppetStub(channel)

  await puppet.ding(data='haha')

  async for response in puppet.event():
    print(response)

  channel.close()


if __name__ == "__main__":
  asyncio.run(main())
