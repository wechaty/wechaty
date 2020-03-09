#!/usr/bin/env python3
"""doc"""
import asyncio

from gen_py.puppet_grpc import PuppetStub
from grpclib.client import Channel


async def main():
  """doc"""
  channel = Channel(host="127.0.0.1", port=8788)
  puppet = PuppetStub(channel)
  await puppet.ding()

# async for response in service.echo_stream(value="hello", extra_times=1)
#         print(response)

if __name__ == "__main__":
  asyncio.run(main())
